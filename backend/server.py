from dotenv import load_dotenv
from pathlib import Path
import os

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime, timezone, timedelta
import logging
import uuid
import bcrypt
import jwt
import httpx

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)


# ---------------- Helpers ----------------
def now_utc():
    return datetime.now(timezone.utc)


def iso_now():
    return now_utc().isoformat()


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def create_access_token(user_id: str, email: str) -> str:
    payload = {"sub": user_id, "email": email, "exp": now_utc() + timedelta(hours=12), "type": "access"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": now_utc() + timedelta(days=7), "type": "refresh"}
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str):
    response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
    response.set_cookie("refresh_token", refresh, httponly=True, secure=True, samesite="none", max_age=604800, path="/")


def clean_user(u: dict) -> dict:
    return {"id": u["id"], "email": u["email"], "name": u.get("name", ""), "role": u.get("role", "staff"),
            "active": u.get("active", True), "created_at": u.get("created_at")}


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if not user.get("active", True):
            raise HTTPException(status_code=403, detail="Account is inactive")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Session expired. Please log in again.")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session")


async def require_admin(user: dict = Depends(get_current_user)) -> dict:
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


async def next_customer_id() -> str:
    doc = await db.counters.find_one_and_update(
        {"_id": "customer_id"}, {"$inc": {"seq": 1}}, upsert=True, return_document=True
    )
    return str(doc["seq"]).zfill(3)


# ---------------- Models ----------------
class LoginInput(BaseModel):
    email: str
    password: str


class StaffCreate(BaseModel):
    name: str
    email: str
    password: str


class StaffUpdate(BaseModel):
    name: Optional[str] = None
    active: Optional[bool] = None
    password: Optional[str] = None


class CaretakerModel(BaseModel):
    name: str
    phone: Optional[str] = ""
    relationship: Optional[str] = ""


class CustomerCreate(BaseModel):
    full_name: str
    phone: Optional[str] = ""
    address: Optional[str] = ""
    notes: Optional[str] = ""
    caretakers: List[CaretakerModel] = []


class CustomerUpdate(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    caretakers: Optional[List[CaretakerModel]] = None


class DebtInput(BaseModel):
    amount: float
    reason: str


class RepaymentInput(BaseModel):
    amount: float
    note: Optional[str] = ""


class CocoaRecordCreate(BaseModel):
    bags: Optional[float] = 0
    status: str = "unscaled"  # scaled | unscaled
    weight_kg: Optional[float] = None
    delivered_by: Optional[str] = ""
    location: Optional[str] = ""
    note: Optional[str] = ""


class WeightInput(BaseModel):
    weight_kg: float
    bags: Optional[float] = None


class CocoaRecordUpdate(BaseModel):
    bags: Optional[float] = None
    weight_kg: Optional[float] = None
    delivered_by: Optional[str] = None
    location: Optional[str] = None
    note: Optional[str] = None
    status: Optional[str] = None


class RateInput(BaseModel):
    rate: float
    note: Optional[str] = ""


class MeUpdate(BaseModel):
    name: str


class CaretakerRecordInput(BaseModel):
    note: str


class FertilizerInput(BaseModel):
    quantity: float
    unit: Optional[str] = "bags"
    note: Optional[str] = ""
    value: Optional[float] = 0


class FertilizerRepayInput(BaseModel):
    quantity: Optional[float] = None
    note: Optional[str] = ""


# ---------------- Auth Endpoints ----------------
@api_router.post("/auth/login")
async def login(body: LoginInput, request: Request, response: Response):
    email = body.email.strip().lower()
    ip = request.client.host if request.client else "unknown"
    identifier = f"{ip}:{email}"

    attempt = await db.login_attempts.find_one({"identifier": identifier})
    if attempt and attempt.get("locked_until"):
        locked_until = datetime.fromisoformat(attempt["locked_until"])
        if locked_until > now_utc():
            raise HTTPException(status_code=429, detail="Too many failed attempts. Try again in a few minutes.")

    user = await db.users.find_one({"email": email}, {"_id": 0})
    if not user or not verify_password(body.password, user["password_hash"]):
        count = (attempt.get("count", 0) if attempt else 0) + 1
        update = {"count": count, "identifier": identifier}
        if count >= 5:
            update["locked_until"] = (now_utc() + timedelta(minutes=15)).isoformat()
        await db.login_attempts.update_one({"identifier": identifier}, {"$set": update}, upsert=True)
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    if not user.get("active", True):
        raise HTTPException(status_code=403, detail="Account is inactive. Contact the owner.")

    await db.login_attempts.delete_one({"identifier": identifier})
    access = create_access_token(user["id"], user["email"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return clean_user(user)


@api_router.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")
    return {"message": "Logged out"}


@api_router.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return clean_user(user)


@api_router.patch("/auth/me")
async def update_me(body: MeUpdate, user: dict = Depends(get_current_user)):
    name = body.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    await db.users.update_one({"id": user["id"]}, {"$set": {"name": name}})
    fresh = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return clean_user(fresh)


@api_router.post("/auth/refresh")
async def refresh_token(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        access = create_access_token(user["id"], user["email"])
        response.set_cookie("access_token", access, httponly=True, secure=True, samesite="none", max_age=43200, path="/")
        return clean_user(user)
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid session")


# ---------------- Staff Management (Admin only) ----------------
@api_router.get("/staff")
async def list_staff(user: dict = Depends(require_admin)):
    staff = await db.users.find({}, {"_id": 0, "password_hash": 0}).sort("created_at", 1).to_list(500)
    return staff


@api_router.post("/staff")
async def create_staff(body: StaffCreate, user: dict = Depends(require_admin)):
    email = body.email.strip().lower()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="A user with this email already exists")
    doc = {
        "id": str(uuid.uuid4()), "email": email, "name": body.name.strip(),
        "password_hash": hash_password(body.password), "role": "staff",
        "active": True, "created_at": iso_now(),
    }
    await db.users.insert_one(doc)
    return clean_user(doc)


@api_router.patch("/staff/{staff_id}")
async def update_staff(staff_id: str, body: StaffUpdate, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": staff_id})
    if not target:
        raise HTTPException(status_code=404, detail="Staff not found")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot modify the owner account here")
    update = {}
    if body.name is not None:
        update["name"] = body.name.strip()
    if body.active is not None:
        update["active"] = body.active
    if body.password:
        update["password_hash"] = hash_password(body.password)
    if update:
        await db.users.update_one({"id": staff_id}, {"$set": update})
    fresh = await db.users.find_one({"id": staff_id}, {"_id": 0})
    return clean_user(fresh)


@api_router.delete("/staff/{staff_id}")
async def delete_staff(staff_id: str, user: dict = Depends(require_admin)):
    target = await db.users.find_one({"id": staff_id})
    if not target:
        raise HTTPException(status_code=404, detail="Staff not found")
    if target.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Cannot delete the owner account")
    await db.users.delete_one({"id": staff_id})
    return {"message": "Staff removed"}


# ---------------- Customers ----------------
def customer_balance(c: dict) -> float:
    owed = sum(d["amount"] for d in c.get("debts", []))
    paid = sum(r["amount"] for r in c.get("repayments", []))
    return round(owed - paid, 2)


def customer_summary(c: dict) -> dict:
    return {
        "id": c["id"], "customer_id": c["customer_id"], "full_name": c["full_name"],
        "phone": c.get("phone", ""), "address": c.get("address", ""),
        "caretakers": c.get("caretakers", []), "date_added": c.get("date_added"),
        "balance": customer_balance(c),
    }


@api_router.get("/customers")
async def list_customers(search: str = "", user: dict = Depends(get_current_user)):
    customers = await db.customers.find({}, {"_id": 0}).sort("customer_id", 1).to_list(5000)
    if search:
        s = search.strip().lower()
        def match(c):
            if s in c.get("customer_id", "").lower():
                return True
            if s in c.get("full_name", "").lower():
                return True
            if s in c.get("phone", "").lower():
                return True
            for ct in c.get("caretakers", []):
                if s in ct.get("name", "").lower():
                    return True
            return False
        customers = [c for c in customers if match(c)]
    return [customer_summary(c) for c in customers]


@api_router.post("/customers")
async def create_customer(body: CustomerCreate, user: dict = Depends(get_current_user)):
    cid = await next_customer_id()
    doc = {
        "id": str(uuid.uuid4()), "customer_id": cid, "full_name": body.full_name.strip(),
        "phone": body.phone or "", "address": body.address or "", "notes": body.notes or "",
        "caretakers": [{**c.model_dump(), "id": str(uuid.uuid4()), "records": []} for c in body.caretakers],
        "date_added": iso_now(), "debts": [], "repayments": [], "fertilizer": [],
        "created_by": user["name"],
    }
    await db.customers.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api_router.get("/customers/{customer_pk}")
async def get_customer(customer_pk: str, user: dict = Depends(get_current_user)):
    c = await db.customers.find_one({"id": customer_pk}, {"_id": 0})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    c["balance"] = customer_balance(c)
    history = []
    for d in c.get("debts", []):
        history.append({"type": "debt", "amount": d["amount"], "reason": d.get("reason", ""),
                        "date": d["date"], "by": d.get("created_by", "")})
    for r in c.get("repayments", []):
        history.append({"type": "repayment", "amount": r["amount"], "note": r.get("note", ""),
                        "date": r["date"], "by": r.get("received_by", "")})
    history.sort(key=lambda x: x["date"], reverse=True)
    c["history"] = history
    return c


@api_router.patch("/customers/{customer_pk}")
async def update_customer(customer_pk: str, body: CustomerUpdate, user: dict = Depends(get_current_user)):
    c = await db.customers.find_one({"id": customer_pk})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    update = {}
    for field in ["full_name", "phone", "address", "notes"]:
        val = getattr(body, field)
        if val is not None:
            update[field] = val
    if body.caretakers is not None:
        existing = {ct.get("name"): ct for ct in c.get("caretakers", [])}
        merged = []
        for ct in body.caretakers:
            d = ct.model_dump()
            prev = existing.get(d.get("name"))
            d["id"] = prev.get("id") if prev else str(uuid.uuid4())
            d["records"] = prev.get("records", []) if prev else []
            merged.append(d)
        update["caretakers"] = merged
    if update:
        await db.customers.update_one({"id": customer_pk}, {"$set": update})
    fresh = await db.customers.find_one({"id": customer_pk}, {"_id": 0})
    fresh["balance"] = customer_balance(fresh)
    return fresh


@api_router.delete("/customers/{customer_pk}")
async def delete_customer(customer_pk: str, user: dict = Depends(require_admin)):
    res = await db.customers.delete_one({"id": customer_pk})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Customer not found")
    return {"message": "Customer deleted"}


@api_router.post("/customers/{customer_pk}/debts")
async def add_debt(customer_pk: str, body: DebtInput, user: dict = Depends(get_current_user)):
    c = await db.customers.find_one({"id": customer_pk})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    entry = {"id": str(uuid.uuid4()), "amount": round(body.amount, 2), "reason": body.reason.strip(),
             "date": iso_now(), "created_by": user["name"]}
    await db.customers.update_one({"id": customer_pk}, {"$push": {"debts": entry}})
    return entry


@api_router.post("/customers/{customer_pk}/repayments")
async def add_repayment(customer_pk: str, body: RepaymentInput, user: dict = Depends(get_current_user)):
    c = await db.customers.find_one({"id": customer_pk})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    entry = {"id": str(uuid.uuid4()), "amount": round(body.amount, 2), "note": body.note or "",
             "date": iso_now(), "received_by": user["name"]}
    await db.customers.update_one({"id": customer_pk}, {"$push": {"repayments": entry}})
    return entry


@api_router.post("/customers/{customer_pk}/caretakers/{index}/records")
async def add_caretaker_record(customer_pk: str, index: int, body: CaretakerRecordInput, user: dict = Depends(get_current_user)):
    c = await db.customers.find_one({"id": customer_pk})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    caretakers = c.get("caretakers", [])
    if index < 0 or index >= len(caretakers):
        raise HTTPException(status_code=404, detail="Caretaker not found")
    entry = {"id": str(uuid.uuid4()), "note": body.note.strip(), "date": iso_now(), "by": user["name"]}
    caretakers[index].setdefault("records", []).append(entry)
    await db.customers.update_one({"id": customer_pk}, {"$set": {"caretakers": caretakers}})
    return entry


@api_router.post("/customers/{customer_pk}/fertilizer")
async def add_fertilizer(customer_pk: str, body: FertilizerInput, user: dict = Depends(get_current_user)):
    c = await db.customers.find_one({"id": customer_pk})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    entry = {"id": str(uuid.uuid4()), "quantity": body.quantity, "unit": body.unit or "bags",
             "note": body.note or "", "value": round(body.value or 0, 2), "returned": 0,
             "status": "outstanding", "date": iso_now(), "by": user["name"]}
    await db.customers.update_one({"id": customer_pk}, {"$push": {"fertilizer": entry}})
    return entry


@api_router.patch("/customers/{customer_pk}/fertilizer/{fid}/return")
async def return_fertilizer(customer_pk: str, fid: str, body: FertilizerRepayInput, user: dict = Depends(get_current_user)):
    c = await db.customers.find_one({"id": customer_pk})
    if not c:
        raise HTTPException(status_code=404, detail="Customer not found")
    fert = c.get("fertilizer", [])
    found = next((f for f in fert if f.get("id") == fid), None)
    if not found:
        raise HTTPException(status_code=404, detail="Fertilizer record not found")
    ret = body.quantity if body.quantity is not None else found["quantity"]
    found["returned"] = round(min(found["quantity"], (found.get("returned", 0) + ret)), 2)
    found["status"] = "settled" if found["returned"] >= found["quantity"] else "partial"
    found["last_return_note"] = body.note or ""
    found["settled_at"] = iso_now()
    await db.customers.update_one({"id": customer_pk}, {"$set": {"fertilizer": fert}})
    return found


# ---------------- Cocoa Store Records ----------------
def record_public(r: dict) -> dict:
    r.pop("_id", None)
    return r


@api_router.get("/cocoa-records")
async def list_cocoa_records(status: str = "", date: str = "", user: dict = Depends(get_current_user)):
    query = {}
    if status in ("scaled", "unscaled"):
        query["status"] = status
    records = await db.cocoa_records.find(query, {"_id": 0}).sort("created_at", -1).to_list(5000)
    if date:
        records = [r for r in records if r.get("created_at", "").startswith(date)]
    return records


@api_router.get("/cocoa-records/summary")
async def cocoa_summary(user: dict = Depends(get_current_user)):
    records = await db.cocoa_records.find({}, {"_id": 0}).to_list(5000)
    scaled = [r for r in records if r.get("status") == "scaled"]
    unscaled = [r for r in records if r.get("status") == "unscaled"]
    total_kg = round(sum(r.get("weight_kg") or 0 for r in scaled), 2)
    scaled_bags = round(sum(r.get("bags") or 0 for r in scaled), 1)
    unscaled_bags = round(sum(r.get("bags") or 0 for r in unscaled), 1)
    est_bags = round(total_kg / 64, 1) if total_kg else 0
    return {
        "total_scaled_kg": total_kg,
        "estimated_bags_from_kg": est_bags,
        "scaled_records": len(scaled),
        "unscaled_records": len(unscaled),
        "scaled_bags": scaled_bags,
        "unscaled_bags": unscaled_bags,
        "description": (
            f"Store holds {total_kg:,.0f} kg of scaled cocoa (~{est_bags:,.0f} bags of 64kg), "
            f"plus {len(unscaled)} unscaled delivery{'s' if len(unscaled) != 1 else ''} "
            f"({unscaled_bags:,.0f} bags) awaiting weighing."
        ),
    }


@api_router.post("/cocoa-records")
async def create_cocoa_record(body: CocoaRecordCreate, user: dict = Depends(get_current_user)):
    status = "scaled" if body.status == "scaled" else "unscaled"
    doc = {
        "id": str(uuid.uuid4()),
        "bags": body.bags or 0,
        "status": status,
        "weight_kg": body.weight_kg if status == "scaled" else None,
        "delivered_by": body.delivered_by or "",
        "location": body.location or "",
        "note": body.note or "",
        "confirmed": True,
        "created_at": iso_now(),
        "created_by": user["name"],
        "weighed_at": iso_now() if status == "scaled" else None,
    }
    await db.cocoa_records.insert_one(doc)
    return record_public(doc)


@api_router.patch("/cocoa-records/{record_id}/weight")
async def enter_weight(record_id: str, body: WeightInput, user: dict = Depends(get_current_user)):
    r = await db.cocoa_records.find_one({"id": record_id})
    if not r:
        raise HTTPException(status_code=404, detail="Record not found")
    update = {"weight_kg": round(body.weight_kg, 2), "status": "scaled", "weighed_at": iso_now(),
              "weighed_by": user["name"]}
    if body.bags is not None:
        update["bags"] = body.bags
    await db.cocoa_records.update_one({"id": record_id}, {"$set": update})
    fresh = await db.cocoa_records.find_one({"id": record_id}, {"_id": 0})
    return fresh


@api_router.patch("/cocoa-records/{record_id}")
async def update_cocoa_record(record_id: str, body: CocoaRecordUpdate, user: dict = Depends(get_current_user)):
    r = await db.cocoa_records.find_one({"id": record_id})
    if not r:
        raise HTTPException(status_code=404, detail="Record not found")
    if r.get("confirmed") and user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="This record is confirmed. Only the owner can edit it.")
    update = {k: v for k, v in body.model_dump().items() if v is not None}
    if update:
        await db.cocoa_records.update_one({"id": record_id}, {"$set": update})
    fresh = await db.cocoa_records.find_one({"id": record_id}, {"_id": 0})
    return fresh


@api_router.delete("/cocoa-records/{record_id}")
async def delete_cocoa_record(record_id: str, user: dict = Depends(require_admin)):
    res = await db.cocoa_records.delete_one({"id": record_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Record not found")
    return {"message": "Record deleted"}


# ---------------- Cocoa Rate ----------------
@api_router.get("/cocoa-rate")
async def get_rate(user: dict = Depends(get_current_user)):
    setting = await db.settings.find_one({"_id": "cocoa_rate"})
    history = await db.rate_history.find({}, {"_id": 0}).sort("date", -1).to_list(50)
    current = setting.get("rate") if setting else None
    return {"rate": current, "updated_at": setting.get("updated_at") if setting else None,
            "updated_by": setting.get("updated_by") if setting else None, "history": history}


@api_router.post("/cocoa-rate")
async def set_rate(body: RateInput, user: dict = Depends(require_admin)):
    entry = {"rate": round(body.rate, 2), "note": body.note or "", "date": iso_now(), "by": user["name"]}
    await db.settings.update_one(
        {"_id": "cocoa_rate"},
        {"$set": {"rate": entry["rate"], "updated_at": entry["date"], "updated_by": user["name"]}},
        upsert=True,
    )
    await db.rate_history.insert_one({"id": str(uuid.uuid4()), **entry})
    return entry


@api_router.get("/cocoa-rate/live")
async def get_live_rate(user: dict = Depends(get_current_user)):
    key = os.environ.get("ALPHA_VANTAGE_KEY", "").strip()
    # Serve cache if fresh (< 6 hours)
    cache = await db.settings.find_one({"_id": "cocoa_live"})
    if cache and cache.get("fetched_at"):
        fetched = datetime.fromisoformat(cache["fetched_at"])
        if fetched > now_utc() - timedelta(hours=6):
            return {**cache["data"], "source": "cache"}
    if not key:
        if cache:
            return {**cache["data"], "source": "cache"}
        return {"available": False, "message": "Live global rate source not configured.",
                "usd_per_tonne": None, "usd_per_kg": None, "date": None, "source": "unavailable"}
    try:
        async with httpx.AsyncClient(timeout=15) as hc:
            resp = await hc.get("https://www.alphavantage.co/query",
                                params={"function": "COCOA", "interval": "monthly", "apikey": key})
            j = resp.json()
        data_points = j.get("data", [])
        latest = next((d for d in data_points if d.get("value") not in (".", None)), None)
        if not latest:
            raise ValueError("No data returned")
        usd_tonne = float(latest["value"])
        valid = [d for d in data_points if d.get("value") not in (".", None)]
        recent = valid[:12]
        trend = [{"date": d["date"], "value": round(float(d["value"]) / 1000, 3)} for d in recent][::-1]
        change_pct, direction = None, "flat"
        if len(recent) >= 2:
            cur, prev = float(recent[0]["value"]), float(recent[1]["value"])
            if prev:
                change_pct = round((cur - prev) / prev * 100, 1)
                direction = "up" if cur > prev else "down" if cur < prev else "flat"
        result = {"available": True, "usd_per_tonne": round(usd_tonne, 2),
                  "usd_per_kg": round(usd_tonne / 1000, 4), "date": latest["date"],
                  "name": j.get("name", "Global Cocoa Price"), "unit": j.get("unit", "USD per metric ton"),
                  "trend": trend, "change_pct": change_pct, "direction": direction}
        await db.settings.update_one({"_id": "cocoa_live"},
                                     {"$set": {"data": result, "fetched_at": iso_now()}}, upsert=True)
        return {**result, "source": "live"}
    except Exception as e:
        logger.warning(f"Live cocoa rate fetch failed: {e}")
        if cache:
            return {**cache["data"], "source": "cache"}
        return {"available": False, "message": "Could not reach the live rate source right now.",
                "usd_per_tonne": None, "usd_per_kg": None, "date": None, "source": "error"}


# ---------------- Dashboard ----------------
@api_router.get("/dashboard/stats")
async def dashboard_stats(user: dict = Depends(get_current_user)):
    customers = await db.customers.find({}, {"_id": 0, "debts": 1, "repayments": 1}).to_list(5000)
    total_customers = len(customers)
    total_owed = 0.0
    for c in customers:
        total_owed += sum(d["amount"] for d in c.get("debts", [])) - sum(r["amount"] for r in c.get("repayments", []))
    total_owed = round(total_owed, 2)

    records = await db.cocoa_records.find({}, {"_id": 0}).to_list(5000)
    scaled = [r for r in records if r.get("status") == "scaled"]
    unscaled_count = sum(1 for r in records if r.get("status") == "unscaled")
    total_kg = round(sum(r.get("weight_kg") or 0 for r in scaled), 2)
    est_bags = round(total_kg / 64, 1) if total_kg else 0

    today = now_utc().date().isoformat()
    todays_records = sum(1 for r in records if r.get("created_at", "").startswith(today))

    rate_set = await db.settings.find_one({"_id": "cocoa_rate"})
    rate_hist = await db.rate_history.find({}, {"_id": 0}).sort("date", -1).to_list(2)
    rate_trend, rate_change_pct = None, None
    if len(rate_hist) >= 2 and rate_hist[1].get("rate"):
        latest, prev = rate_hist[0]["rate"], rate_hist[1]["rate"]
        diff = latest - prev
        rate_trend = "up" if diff > 0 else "down" if diff < 0 else "flat"
        rate_change_pct = round(diff / prev * 100, 1) if prev else None
    elif len(rate_hist) == 1:
        rate_trend = "flat"
    return {
        "total_customers": total_customers,
        "total_owed": total_owed,
        "cocoa_in_store_kg": total_kg,
        "cocoa_in_store_bags": est_bags,
        "unscaled_count": unscaled_count,
        "todays_records": todays_records,
        "rate_configured": bool(rate_set and rate_set.get("rate")),
        "rate_trend": rate_trend,
        "rate_change_pct": rate_change_pct,
    }


# ---------------- Startup ----------------
@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.customers.create_index("customer_id")
    await db.customers.create_index("id", unique=True)
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@example.com").strip().lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if existing is None:
        await db.users.insert_one({
            "id": str(uuid.uuid4()), "email": admin_email, "name": "Owner",
            "password_hash": hash_password(admin_password), "role": "admin",
            "active": True, "created_at": iso_now(),
        })
        logger.info("Seeded admin account")
    elif not verify_password(admin_password, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})


@app.on_event("shutdown")
async def shutdown():
    client.close()


app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)
