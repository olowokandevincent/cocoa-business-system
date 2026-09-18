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
        assert d["total_customers"] == 3
        assert d["total_owed"] == 180000.0
        assert d["cocoa_in_store_kg"] == 4250.0
        assert d["unscaled_count"] == 1
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
        assert int(new["customer_id"]) == max_id + 1
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
        # Since ALPHA_VANTAGE_KEY empty, should be unavailable (or cache)
        assert "available" in data or "source" in data


# ---------- Staff Management ----------
class TestStaffManagement:
    def test_staff_cannot_list_staff(self, staff_session):
        r = staff_session.get(f"{BASE_URL}/api/staff")
        assert r.status_code == 403

    def test_admin_list_staff(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/staff")
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_toggle_staff_active(self, admin_session, staff_credentials):
        sid = staff_credentials["id"]
        r = admin_session.patch(f"{BASE_URL}/api/staff/{sid}", json={"active": False})
        assert r.status_code == 200
        assert r.json()["active"] is False
        # re-enable
        r = admin_session.patch(f"{BASE_URL}/api/staff/{sid}", json={"active": True})
        assert r.json()["active"] is True
