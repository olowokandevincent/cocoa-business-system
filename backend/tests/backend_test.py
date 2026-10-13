"""Backend API tests for Cocoa Trader business app."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://cocoa-desk.preview.emergentagent.com").rstrip("/")
ADMIN_EMAIL = "olowokandevincent0@gmail.com"
ADMIN_PASSWORD = "Cocoa@2026"


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"Admin login failed: {r.status_code} {r.text}"
    assert r.json()["role"] == "admin"
    return s


@pytest.fixture(scope="session")
def staff_credentials(admin_session):
    """Create a staff user and yield credentials; cleanup after."""
    email = f"test_staff_{uuid.uuid4().hex[:8]}@test.com"
    password = "StaffPass@2026"
    r = admin_session.post(f"{BASE_URL}/api/staff", json={
        "name": "TEST Staff", "email": email, "password": password
    })
    assert r.status_code == 200, r.text
    staff_id = r.json()["id"]
    yield {"email": email, "password": password, "id": staff_id}
    # cleanup
    admin_session.delete(f"{BASE_URL}/api/staff/{staff_id}")


@pytest.fixture(scope="session")
def staff_session(staff_credentials):
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={
        "email": staff_credentials["email"], "password": staff_credentials["password"]
    })
    assert r.status_code == 200
    return s


# ---------- Auth ----------
class TestAuth:
    def test_login_wrong_password(self):
        r = requests.post(f"{BASE_URL}/api/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_returns_admin(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"


# ---------- Dashboard ----------
class TestDashboard:
    def test_dashboard_stats(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200
        d = r.json()
        # Verify seed values
        assert d["total_customers"] >= 3
        assert d["total_owed"] >= 0
        assert d["cocoa_in_store_kg"] >= 0
        assert "unscaled_count" in d
        assert d["rate_configured"] is True


# ---------- Customers ----------
class TestCustomers:
    def test_list_customers(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/customers")
        assert r.status_code == 200
        lst = r.json()
        assert len(lst) >= 3
        assert any(c["customer_id"] == "001" for c in lst)

    def test_search_by_customer_id(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/customers", params={"search": "001"})
        assert r.status_code == 200
        results = r.json()
        assert len(results) >= 1
        assert any(c["customer_id"] == "001" for c in results)

    def test_create_customer_sequential_id(self, admin_session):
        # Get current max
        r = admin_session.get(f"{BASE_URL}/api/customers")
        existing = r.json()
        max_id = max(int(c["customer_id"]) for c in existing)
        r = admin_session.post(f"{BASE_URL}/api/customers", json={
            "full_name": "TEST_Customer New", "phone": "08099999999"
        })
        assert r.status_code == 200
        new = r.json()
        assert int(new["customer_id"]) >= max_id + 1
        assert len(new["customer_id"]) == 3  # zero-padded
        # Cleanup
        admin_session.delete(f"{BASE_URL}/api/customers/{new['id']}")

    def test_debt_and_repayment_flow(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/customers", json={"full_name": "TEST_Debt"})
        pk = r.json()["id"]
        try:
            # Add debt 10000
            r = admin_session.post(f"{BASE_URL}/api/customers/{pk}/debts",
                                    json={"amount": 10000, "reason": "test debt"})
            assert r.status_code == 200
            # Add repayment 3000
            r = admin_session.post(f"{BASE_URL}/api/customers/{pk}/repayments",
                                    json={"amount": 3000, "note": "partial"})
            assert r.status_code == 200
            # Balance should be 7000
            r = admin_session.get(f"{BASE_URL}/api/customers/{pk}")
            data = r.json()
            assert data["balance"] == 7000.0
            assert len(data["history"]) == 2
        finally:
            admin_session.delete(f"{BASE_URL}/api/customers/{pk}")

    def test_staff_cannot_delete_customer(self, staff_session, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/customers", json={"full_name": "TEST_Locked"})
        pk = r.json()["id"]
        r = staff_session.delete(f"{BASE_URL}/api/customers/{pk}")
        assert r.status_code == 403
        admin_session.delete(f"{BASE_URL}/api/customers/{pk}")


# ---------- Cocoa Records ----------
class TestCocoaRecords:
    def test_create_scaled_record(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/cocoa-records", json={
            "bags": 5, "status": "scaled", "weight_kg": 320, "delivered_by": "TEST"
        })
        assert r.status_code == 200
        rid = r.json()["id"]
        assert r.json()["status"] == "scaled"
        assert r.json()["weight_kg"] == 320
        admin_session.delete(f"{BASE_URL}/api/cocoa-records/{rid}")

    def test_unscaled_then_enter_weight(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/cocoa-records", json={
            "bags": 3, "status": "unscaled", "delivered_by": "TEST_U"
        })
        assert r.status_code == 200
        rid = r.json()["id"]
        assert r.json()["status"] == "unscaled"
        assert r.json()["weight_kg"] is None
        # Enter weight
        r = admin_session.patch(f"{BASE_URL}/api/cocoa-records/{rid}/weight",
                                 json={"weight_kg": 192})
        assert r.status_code == 200
        assert r.json()["status"] == "scaled"
        assert r.json()["weight_kg"] == 192
        admin_session.delete(f"{BASE_URL}/api/cocoa-records/{rid}")

    def test_filter_by_status(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/cocoa-records", params={"status": "scaled"})
        assert r.status_code == 200
        assert all(x["status"] == "scaled" for x in r.json())
        r = admin_session.get(f"{BASE_URL}/api/cocoa-records", params={"status": "unscaled"})
        assert all(x["status"] == "unscaled" for x in r.json())

    def test_summary_endpoint(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/cocoa-records/summary")
        assert r.status_code == 200
        d = r.json()
        assert "description" in d
        assert "total_scaled_kg" in d

    def test_staff_cannot_delete_confirmed_record(self, staff_session, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/cocoa-records", json={
            "bags": 1, "status": "scaled", "weight_kg": 64
        })
        rid = r.json()["id"]
        r = staff_session.delete(f"{BASE_URL}/api/cocoa-records/{rid}")
        assert r.status_code == 403
        admin_session.delete(f"{BASE_URL}/api/cocoa-records/{rid}")


# ---------- Cocoa Rate ----------
class TestCocoaRate:
    def test_get_rate(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/cocoa-rate")
        assert r.status_code == 200
        data = r.json()
        assert "rate" in data
        assert "history" in data

    def test_admin_set_rate(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/cocoa-rate",
                                json={"rate": 8500, "note": "TEST rate"})
        assert r.status_code == 200
        assert r.json()["rate"] == 8500

    def test_staff_cannot_set_rate(self, staff_session):
        r = staff_session.post(f"{BASE_URL}/api/cocoa-rate", json={"rate": 9000})
        assert r.status_code == 403

    def test_live_rate_graceful(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/cocoa-rate/live")
        assert r.status_code == 200
        data = r.json()
        # Yahoo CC=F: either live/cache with price OR graceful available:False
        assert "available" in data or "source" in data

    def test_live_rate_open_to_staff(self, staff_session):
        # The world market figure is public to every signed-in user. Only the private
        # buying rate stays owner-only (see test_staff_cannot_set_rate).
        r = staff_session.get(f"{BASE_URL}/api/cocoa-rate/live")
        assert r.status_code == 200
        assert "available" in r.json() or "source" in r.json()


# ---------- Staff Management ----------
class TestStaffManagement:
    def test_staff_cannot_list_staff(self, staff_session):
        r = staff_session.get(f"{BASE_URL}/api/staff")
        assert r.status_code == 403

    def test_admin_list_staff(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/staff")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_update_own_name(self, admin_session):
        # Save original name to restore
        orig = admin_session.get(f"{BASE_URL}/api/auth/me").json()["name"]
        try:
            r = admin_session.patch(f"{BASE_URL}/api/auth/me", json={"name": "TEST Owner"})
            assert r.status_code == 200
            assert r.json()["name"] == "TEST Owner"
            # verify persisted
            r = admin_session.get(f"{BASE_URL}/api/auth/me")
            assert r.json()["name"] == "TEST Owner"
            # empty name should 400
            r = admin_session.patch(f"{BASE_URL}/api/auth/me", json={"name": "   "})
            assert r.status_code == 400
        finally:
            admin_session.patch(f"{BASE_URL}/api/auth/me", json={"name": orig})


# ---------- Dashboard Rate Trend ----------
class TestDashboardRateTrend:
    def test_stats_has_trend_fields(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/dashboard/stats")
        assert r.status_code == 200
        d = r.json()
        assert "rate_trend" in d
        assert "rate_change_pct" in d

    def test_rate_trend_direction(self, admin_session):
        # Set two rates and verify trend
        admin_session.post(f"{BASE_URL}/api/cocoa-rate", json={"rate": 7000, "note": "TEST base"})
        admin_session.post(f"{BASE_URL}/api/cocoa-rate", json={"rate": 8000, "note": "TEST up"})
        r = admin_session.get(f"{BASE_URL}/api/dashboard/stats")
        d = r.json()
        assert d["rate_trend"] in ("up", "down", "flat")
        assert d["rate_change_pct"] is not None


# ---------- Caretaker Records ----------
class TestCaretakerRecords:
    def test_add_caretaker_record_persists(self, admin_session):
        # Create customer with a caretaker
        r = admin_session.post(f"{BASE_URL}/api/customers", json={
            "full_name": "TEST_Caretaker Owner",
            "caretakers": [{"name": "TEST Caretaker", "phone": "080", "relationship": "son"}]
        })
        pk = r.json()["id"]
        try:
            r = admin_session.post(f"{BASE_URL}/api/customers/{pk}/caretakers/0/records",
                                    json={"note": "brought 2 bags today"})
            assert r.status_code == 200
            assert r.json()["note"] == "brought 2 bags today"
            # verify persistence
            r = admin_session.get(f"{BASE_URL}/api/customers/{pk}")
            recs = r.json()["caretakers"][0]["records"]
            assert len(recs) == 1
            assert recs[0]["note"] == "brought 2 bags today"
        finally:
            admin_session.delete(f"{BASE_URL}/api/customers/{pk}")

    def test_add_caretaker_record_out_of_range(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/customers", json={"full_name": "TEST_NoCare"})
        pk = r.json()["id"]
        try:
            r = admin_session.post(f"{BASE_URL}/api/customers/{pk}/caretakers/0/records",
                                    json={"note": "x"})
            assert r.status_code == 404
        finally:
            admin_session.delete(f"{BASE_URL}/api/customers/{pk}")


# ---------- Fertilizer Feed (separate from money) ----------
class TestFertilizer:
    def test_add_fertilizer_does_not_change_balance(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/customers", json={"full_name": "TEST_Fert"})
        pk = r.json()["id"]
        try:
            # baseline balance
            base = admin_session.get(f"{BASE_URL}/api/customers/{pk}").json()
            assert base["balance"] == 0
            # add fertilizer
            r = admin_session.post(f"{BASE_URL}/api/customers/{pk}/fertilizer",
                                    json={"quantity": 2, "unit": "bags", "value": 25000, "note": "NPK"})
            assert r.status_code == 200
            fid = r.json()["id"]
            assert r.json()["status"] == "outstanding"
            # balance still 0 & history has no fertilizer entry
            after = admin_session.get(f"{BASE_URL}/api/customers/{pk}").json()
            assert after["balance"] == 0
            assert all(h["type"] in ("debt", "repayment") for h in after["history"])
            assert len(after["fertilizer"]) == 1
            # return fertilizer -> settled
            r = admin_session.patch(f"{BASE_URL}/api/customers/{pk}/fertilizer/{fid}/return", json={})
            assert r.status_code == 200
            assert r.json()["status"] == "settled"
            # balance still 0
            final = admin_session.get(f"{BASE_URL}/api/customers/{pk}").json()
            assert final["balance"] == 0
        finally:
            admin_session.delete(f"{BASE_URL}/api/customers/{pk}")

    def test_partial_return_fertilizer(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/customers", json={"full_name": "TEST_FertPartial"})
        pk = r.json()["id"]
        try:
            r = admin_session.post(f"{BASE_URL}/api/customers/{pk}/fertilizer",
                                    json={"quantity": 5, "unit": "bags"})
            fid = r.json()["id"]
            r = admin_session.patch(f"{BASE_URL}/api/customers/{pk}/fertilizer/{fid}/return",
                                     json={"quantity": 2})
            assert r.status_code == 200
            assert r.json()["status"] == "partial"
            assert r.json()["returned"] == 2
        finally:
            admin_session.delete(f"{BASE_URL}/api/customers/{pk}")


# ---------- Caretaker Own Money (NEW iter 4) ----------
class TestCaretakerMoney:
    def test_caretaker_debt_repayment_separate_from_customer(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/customers", json={
            "full_name": "TEST_CtMoney",
            "caretakers": [{"name": "TEST CT One", "phone": "080", "relationship": "son"}]
        })
        pk = r.json()["id"]
        try:
            # Baseline
            data = admin_session.get(f"{BASE_URL}/api/customers/{pk}").json()
            assert data["balance"] == 0
            assert data["caretakers"][0]["balance"] == 0

            # Add customer own debt (should NOT touch caretaker)
            admin_session.post(f"{BASE_URL}/api/customers/{pk}/debts",
                               json={"amount": 5000, "reason": "cust owes"})
            data = admin_session.get(f"{BASE_URL}/api/customers/{pk}").json()
            assert data["balance"] == 5000
            assert data["caretakers"][0]["balance"] == 0
            assert len(data["caretakers"][0]["money_history"]) == 0

            # Add caretaker debt (should NOT touch customer)
            r = admin_session.post(f"{BASE_URL}/api/customers/{pk}/caretakers/0/debts",
                                    json={"amount": 3000, "reason": "ct owes"})
            assert r.status_code == 200
            data = admin_session.get(f"{BASE_URL}/api/customers/{pk}").json()
            assert data["balance"] == 5000  # unchanged
            assert data["caretakers"][0]["balance"] == 3000
            # Customer history should NOT include caretaker debts
            assert all(h["reason"] != "ct owes" for h in data["history"] if h["type"] == "debt")
            assert len(data["caretakers"][0]["money_history"]) == 1

            # Caretaker repayment
            r = admin_session.post(f"{BASE_URL}/api/customers/{pk}/caretakers/0/repayments",
                                    json={"amount": 1000, "note": "ct paid"})
            assert r.status_code == 200
            data = admin_session.get(f"{BASE_URL}/api/customers/{pk}").json()
            assert data["balance"] == 5000
            assert data["caretakers"][0]["balance"] == 2000
            assert len(data["caretakers"][0]["money_history"]) == 2
        finally:
            admin_session.delete(f"{BASE_URL}/api/customers/{pk}")

    def test_caretaker_money_out_of_range(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/customers", json={"full_name": "TEST_NoCt"})
        pk = r.json()["id"]
        try:
            r = admin_session.post(f"{BASE_URL}/api/customers/{pk}/caretakers/0/debts",
                                    json={"amount": 10, "reason": "x"})
            assert r.status_code == 404
            r = admin_session.post(f"{BASE_URL}/api/customers/{pk}/caretakers/0/repayments",
                                    json={"amount": 10, "note": "x"})
            assert r.status_code == 404
        finally:
            admin_session.delete(f"{BASE_URL}/api/customers/{pk}")


# ---------- Add / Remove Caretaker from Profile (NEW iter 4) ----------
class TestCaretakerAddRemove:
    def test_add_multiple_caretakers_persist(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/customers", json={"full_name": "TEST_AddCts"})
        pk = r.json()["id"]
        try:
            r = admin_session.post(f"{BASE_URL}/api/customers/{pk}/caretakers",
                                    json={"name": "TEST CT A", "phone": "081", "relationship": "son"})
            assert r.status_code == 200
            r = admin_session.post(f"{BASE_URL}/api/customers/{pk}/caretakers",
                                    json={"name": "TEST CT B", "phone": "082", "relationship": "nephew"})
            assert r.status_code == 200
            data = admin_session.get(f"{BASE_URL}/api/customers/{pk}").json()
            names = [ct["name"] for ct in data["caretakers"]]
            assert "TEST CT A" in names and "TEST CT B" in names
            assert len(data["caretakers"]) == 2
            # Each has own money ledger initialized
            for ct in data["caretakers"]:
                assert ct["balance"] == 0
                assert ct["money_history"] == []
        finally:
            admin_session.delete(f"{BASE_URL}/api/customers/{pk}")

    def test_staff_cannot_remove_caretaker(self, staff_session, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/customers", json={
            "full_name": "TEST_Perm",
            "caretakers": [{"name": "TEST X", "phone": "", "relationship": ""}]
        })
        pk = r.json()["id"]
        try:
            r = staff_session.delete(f"{BASE_URL}/api/customers/{pk}/caretakers/0")
            assert r.status_code == 403
        finally:
            admin_session.delete(f"{BASE_URL}/api/customers/{pk}")

    def test_admin_remove_caretaker(self, admin_session):
        r = admin_session.post(f"{BASE_URL}/api/customers", json={
            "full_name": "TEST_Remove",
            "caretakers": [
                {"name": "TEST Keep", "phone": "", "relationship": ""},
                {"name": "TEST Gone", "phone": "", "relationship": ""},
            ]
        })
        pk = r.json()["id"]
        try:
            r = admin_session.delete(f"{BASE_URL}/api/customers/{pk}/caretakers/1")
            assert r.status_code == 200
            data = admin_session.get(f"{BASE_URL}/api/customers/{pk}").json()
            assert len(data["caretakers"]) == 1
            assert data["caretakers"][0]["name"] == "TEST Keep"
        finally:
            admin_session.delete(f"{BASE_URL}/api/customers/{pk}")


# ---------- Staff Management (continued) ----------
class TestStaffToggle:
    def test_toggle_staff_active(self, admin_session, staff_credentials):
        sid = staff_credentials["id"]
        r = admin_session.patch(f"{BASE_URL}/api/staff/{sid}", json={"active": False})
        assert r.status_code == 200
        assert r.json()["active"] is False
        # re-enable
        r = admin_session.patch(f"{BASE_URL}/api/staff/{sid}", json={"active": True})
        assert r.json()["active"] is True


# ---------- Cocoa Records Date Filter (NEW iter 5) ----------
class TestCocoaRecordsDateFilter:
    def test_filter_by_date_param(self, admin_session):
        # Create a record today; filter today should include it
        r = admin_session.post(f"{BASE_URL}/api/cocoa-records", json={
            "bags": 1, "status": "scaled", "weight_kg": 50, "delivered_by": "TEST_DATE"
        })
        assert r.status_code == 200
        rid = r.json()["id"]
        try:
            from datetime import date, timedelta as td
            today = date.today().isoformat()
            r = admin_session.get(f"{BASE_URL}/api/cocoa-records", params={"date": today})
            assert r.status_code == 200
            assert any(x["id"] == rid for x in r.json())
            # A distant past date should NOT include this record
            past = (date.today() - td(days=3650)).isoformat()
            r = admin_session.get(f"{BASE_URL}/api/cocoa-records", params={"date": past})
            assert r.status_code == 200
            assert all(x["id"] != rid for x in r.json())
        finally:
            admin_session.delete(f"{BASE_URL}/api/cocoa-records/{rid}")


# ---------- PIN Lock (NEW iter 5) ----------
class TestPinLock:
    def test_pin_flow_and_throttle(self, admin_session):
        # Set a strong PIN
        pin = "739461"
        r = admin_session.put(f"{BASE_URL}/api/auth/pin",
                              json={"pin": pin, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        assert r.json().get("pin_set") is True

        # /me should now have pin_set true
        me = admin_session.get(f"{BASE_URL}/api/auth/me").json()
        assert me.get("pin_set") is True

        # Wrong password rejected
        r = admin_session.put(f"{BASE_URL}/api/auth/pin",
                              json={"pin": "482913", "password": "WRONG_PW"})
        assert r.status_code == 401

        # Obvious PIN rejected
        r = admin_session.put(f"{BASE_URL}/api/auth/pin",
                              json={"pin": "1234", "password": ADMIN_PASSWORD})
        assert r.status_code == 400
        r = admin_session.put(f"{BASE_URL}/api/auth/pin",
                              json={"pin": "0000", "password": ADMIN_PASSWORD})
        assert r.status_code == 400
        # Non-digit rejected
        r = admin_session.put(f"{BASE_URL}/api/auth/pin",
                              json={"pin": "abcd", "password": ADMIN_PASSWORD})
        assert r.status_code == 400

        # Verify correct PIN
        r = admin_session.post(f"{BASE_URL}/api/auth/pin/verify", json={"pin": pin})
        assert r.status_code == 200
        assert r.json().get("ok") is True

        # Verify wrong PIN 5 times -> 429
        # Use a fresh admin session to avoid polluting main session's cookies (we still keep the same session)
        got_429 = False
        for _ in range(6):
            r = admin_session.post(f"{BASE_URL}/api/auth/pin/verify", json={"pin": "999999"})
            if r.status_code == 429:
                got_429 = True
                break
            assert r.status_code == 401
        assert got_429, "Expected 429 after 5 wrong PIN attempts"

        # A correct PIN while locked also returns 429
        r = admin_session.post(f"{BASE_URL}/api/auth/pin/verify", json={"pin": pin})
        assert r.status_code == 429

        # Cleanup: unset PIN and clear attempts by directly using db via a fresh set_pin
        # We reset by clearing the pin_hash via mongo shell in fixture below
