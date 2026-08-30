import unittest
from unittest.mock import patch
from urllib.parse import parse_qs, urlparse

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.core.base import Base
from app.core.db import get_db
from app.main import app
from app import models as _models  # noqa: F401 - register all tables in metadata


class ApiIntegrationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.engine = create_engine(
            "sqlite://",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        cls.Session = sessionmaker(bind=cls.engine, autoflush=False, autocommit=False)
        Base.metadata.create_all(cls.engine)

        def override_db():
            db = cls.Session()
            try:
                yield db
            finally:
                db.close()

        app.dependency_overrides[get_db] = override_db
        cls.client = TestClient(app)

    @classmethod
    def tearDownClass(cls):
        app.dependency_overrides.clear()
        Base.metadata.drop_all(cls.engine)
        cls.engine.dispose()

    def register_and_login(self, suffix: str):
        email = f"user-{suffix}@example.com"
        response = self.client.post(
            "/api/auth/register",
            json={"name": f"User {suffix}", "email": email, "password": "rahasia123"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        response = self.client.post(
            "/api/auth/login",
            data={"username": email, "password": "rahasia123"},
        )
        self.assertEqual(response.status_code, 200, response.text)
        return {"Authorization": f"Bearer {response.json()['access_token']}"}

    def test_financial_data_persists_and_is_isolated_per_user(self):
        first = self.register_and_login("first")
        second = self.register_and_login("second")

        payloads = [
            ("/api/expenses", {
                "date": "2026-08-29", "amount": 25000, "category": "Makan",
                "payment_method": "QRIS", "merchant": "Warung", "notes": "Makan siang",
            }),
            ("/api/budgets", {"category": "Makan", "amount": 1000000, "period": "monthly"}),
            ("/api/portfolio/transactions", {
                "ticker": "bbri", "type": "BUY", "shares": 100,
                "price": 4500, "date": "2026-08-29",
            }),
            ("/api/portfolio/dividends", {
                "ticker": "BBRI", "amount": 15000,
                "record_date": "2026-08-20", "payment_date": "2026-08-29",
            }),
            ("/api/reports", {
                "date": "2026-08-29", "portfolio_value": 450000,
                "notes": "Daily close", "screenshot_url": None,
            }),
        ]

        created = {}
        for path, payload in payloads:
            response = self.client.post(path, json=payload, headers=first)
            self.assertEqual(response.status_code, 200, response.text)
            created[path] = response.json()

        list_paths = [
            "/api/expenses", "/api/budgets", "/api/portfolio/transactions",
            "/api/portfolio/dividends", "/api/reports",
        ]
        for path in list_paths:
            self.assertEqual(len(self.client.get(path, headers=first).json()), 1)
            self.assertEqual(self.client.get(path, headers=second).json(), [])

        income = self.client.post(
            "/api/expenses",
            json={
                "transaction_type": "income", "date": "2026-08-29",
                "amount": 5000000, "category": "Gaji", "payment_method": "Transfer Bank",
                "merchant": "Perusahaan", "notes": "Gaji bulanan",
            },
            headers=first,
        )
        self.assertEqual(income.status_code, 200, income.text)
        financial_rows = self.client.get("/api/expenses", headers=first).json()
        self.assertEqual({row["transaction_type"] for row in financial_rows}, {"income", "expense"})

        summary = self.client.get("/api/portfolio/summary", headers=first)
        self.assertEqual(summary.status_code, 200, summary.text)
        self.assertEqual(summary.json()["holdings"][0]["ticker"], "BBRI")

        transaction_id = created["/api/portfolio/transactions"]["id"]
        edited_transaction = self.client.patch(
            f"/api/portfolio/transactions/{transaction_id}",
            json={"ticker": "bbca", "shares": 200, "price": 9000},
            headers=first,
        )
        self.assertEqual(edited_transaction.status_code, 200, edited_transaction.text)
        self.assertEqual(edited_transaction.json()["ticker"], "BBCA")
        self.assertEqual(edited_transaction.json()["shares"], 200)
        self.assertEqual(
            self.client.patch(
                f"/api/portfolio/transactions/{transaction_id}",
                json={"price": 1},
                headers=second,
            ).status_code,
            404,
        )
        self.assertEqual(
            self.client.delete(
                f"/api/portfolio/transactions/{transaction_id}",
                headers=second,
            ).status_code,
            404,
        )
        deleted_transaction = self.client.delete(
            f"/api/portfolio/transactions/{transaction_id}",
            headers=first,
        )
        self.assertEqual(deleted_transaction.status_code, 200, deleted_transaction.text)
        self.assertEqual(
            self.client.get("/api/portfolio/transactions", headers=first).json(),
            [],
        )

        expense_id = created["/api/expenses"]["id"]
        receipt = self.client.post(
            f"/api/expenses/{expense_id}/receipt",
            files={"receipt": ("receipt.png", b"\x89PNG\r\n\x1a\nreceipt-test", "image/png")},
            headers=first,
        )
        self.assertEqual(receipt.status_code, 200, receipt.text)
        self.assertEqual(
            self.client.get(f"/api/expenses/{expense_id}/receipt", headers=first).status_code,
            200,
        )
        self.assertEqual(
            self.client.get(f"/api/expenses/{expense_id}/receipt", headers=second).status_code,
            404,
        )

        updated = self.client.patch(
            f"/api/expenses/{expense_id}",
            json={"amount": 30000, "notes": "Updated"},
            headers=first,
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(updated.json()["amount"], 30000)
        deleted = self.client.delete(f"/api/expenses/{expense_id}", headers=first)
        self.assertEqual(deleted.status_code, 200, deleted.text)
        remaining = self.client.get("/api/expenses", headers=first).json()
        self.assertEqual(len(remaining), 1)
        self.assertEqual(remaining[0]["transaction_type"], "income")

        chat = self.client.post("/api/chat", json={"message": "Ringkas data saya"}, headers=first)
        self.assertEqual(chat.status_code, 200, chat.text)
        self.assertTrue(chat.json()["reply"])

    def test_protected_data_requires_login(self):
        response = self.client.get("/api/expenses")
        self.assertEqual(response.status_code, 401)

        feedback = self.client.post(
            "/api/ml/feedback",
            json={"text": "kopi", "amount": 20000, "correct_category": "Makan"},
        )
        self.assertEqual(feedback.status_code, 401)

    def test_receipt_scan_requires_login_and_returns_structured_data(self):
        receipt_file = [
            ("receipts", ("receipt.png", b"\x89PNG\r\n\x1a\nreceipt-test", "image/png"))
        ]
        self.assertEqual(
            self.client.post("/api/expenses/scan-receipt", files=receipt_file).status_code,
            401,
        )

        headers = self.register_and_login("receipt-scan")
        extracted = {
            "merchant": "Toko Contoh",
            "date": "2026-08-29",
            "amount": 42500,
            "payment_method": "E-Wallet",
            "category": "Makan",
            "notes": "Nasi dan minuman",
            "receipt_number": "INV-123",
            "tax": 3500,
            "discount": 0,
            "line_items": [{"name": "Nasi", "quantity": 1, "total": 39000}],
            "raw_text": "TOKO CONTOH TOTAL 42.500 QRIS",
        }
        with patch("app.api.expenses.scan_receipts", return_value=extracted):
            response = self.client.post(
                "/api/expenses/scan-receipt",
                files=receipt_file,
                headers=headers,
            )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["merchant"], "Toko Contoh")
        self.assertEqual(response.json()["amount"], 42500)

    def test_generic_investment_assets_and_health_are_user_isolated(self):
        first = self.register_and_login("assets-first")
        second = self.register_and_login("assets-second")
        payload = {
            "name": "Bitcoin", "symbol": "BTC", "asset_type": "crypto",
            "quantity": 0.1, "average_price": 80000, "current_price": 100000,
            "currency": "IDR (Rupiah)", "exchange_rate_to_idr": 16000,
            "acquired_date": "2026-01-10", "notes": "Cold wallet",
        }
        created = self.client.post("/api/investment-assets", json=payload, headers=first)
        self.assertEqual(created.status_code, 200, created.text)
        asset_id = created.json()["id"]
        self.assertEqual(created.json()["currency"], "IDR")
        self.assertEqual(created.json()["market_value"], 160000000)
        self.assertEqual(self.client.get("/api/investment-assets", headers=second).json(), [])

        rdpu = self.client.post("/api/investment-assets", json={
            "name": "RDPU Likuid", "symbol": "RDPU", "asset_type": "money_market_fund",
            "quantity": 1000, "average_price": 1500, "current_price": 1600,
            "currency": "IDR", "exchange_rate_to_idr": 1,
        }, headers=second)
        self.assertEqual(rdpu.status_code, 200, rdpu.text)
        self.assertEqual(rdpu.json()["market_value"], 1600000)

        health = self.client.get("/api/investment-assets/health/summary", headers=first)
        self.assertEqual(health.status_code, 200, health.text)
        self.assertGreater(health.json()["total_value"], 0)
        self.assertIn(health.json()["status"], {"Sehat", "Cukup sehat", "Perlu perhatian", "Berisiko tinggi"})

        updated = self.client.patch(
            f"/api/investment-assets/{asset_id}", json={"current_price": 110000}, headers=first,
        )
        self.assertEqual(updated.status_code, 200, updated.text)
        self.assertEqual(
            self.client.delete(f"/api/investment-assets/{asset_id}", headers=second).status_code,
            404,
        )
        self.assertEqual(
            self.client.delete(f"/api/investment-assets/{asset_id}", headers=first).status_code,
            200,
        )

    def test_ml_prediction_falls_back_without_artifacts(self):
        response = self.client.post(
            "/api/ml/predict-category",
            json={"text": "kopi susu", "amount": 20000},
        )
        self.assertEqual(response.status_code, 200, response.text)
        self.assertEqual(response.json()["model_used"], "heuristic")

    def test_password_reset_token_is_single_use(self):
        email = "user-reset@example.com"
        registered = self.client.post(
            "/api/auth/register",
            json={"name": "User Reset", "email": email, "password": "password-lama"},
        )
        self.assertEqual(registered.status_code, 200, registered.text)
        login_before_reset = self.client.post(
            "/api/auth/login", data={"username": email, "password": "password-lama"},
        )
        old_session = {
            "Authorization": f"Bearer {login_before_reset.json()['access_token']}"
        }

        with (
            patch("app.api.auth.settings.SMTP_HOST", None),
            patch("app.api.auth.settings.PASSWORD_RESET_DEV_MODE", True),
        ):
            forgot = self.client.post("/api/auth/forgot-password", json={"email": email})
        self.assertEqual(forgot.status_code, 200, forgot.text)
        reset_url = forgot.json()["reset_url"]
        token = parse_qs(urlparse(reset_url).query)["token"][0]

        reset = self.client.post(
            "/api/auth/reset-password",
            json={"token": token, "password": "password-baru"},
        )
        self.assertEqual(reset.status_code, 200, reset.text)
        self.assertEqual(self.client.get("/api/auth/me", headers=old_session).status_code, 401)

        old_login = self.client.post(
            "/api/auth/login", data={"username": email, "password": "password-lama"},
        )
        self.assertEqual(old_login.status_code, 401)
        new_login = self.client.post(
            "/api/auth/login", data={"username": email, "password": "password-baru"},
        )
        self.assertEqual(new_login.status_code, 200, new_login.text)

        reused = self.client.post(
            "/api/auth/reset-password",
            json={"token": token, "password": "password-ketiga"},
        )
        self.assertEqual(reused.status_code, 400)


if __name__ == "__main__":
    unittest.main()
