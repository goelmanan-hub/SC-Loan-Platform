"""
End-to-end verification script for OTP Authentication & SQLite Database Storage
"""

import os
import sys

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.db import (
    init_db,
    save_or_update_user,
    get_user_by_phone,
    get_user_by_id,
    store_otp,
    verify_stored_otp,
    save_loan_assessment,
    get_user_loan_assessments
)
from services.auth_service import send_otp_to_user, verify_user_otp


def test_auth_and_db():
    print("--- TESTING OTP AUTHENTICATION & SQLITE DATABASE ---")

    # 1. Initialize DB
    init_db()

    # 2. Test Send OTP
    test_phone = "9876543210"
    test_email = "applicant.sc@example.com"
    test_name = "Ramesh Kumar"

    send_res = send_otp_to_user(phone=test_phone, email=test_email, name=test_name)
    assert send_res["success"] is True, "Failed to send OTP"
    otp_code = send_res["otp_preview"]
    print(f"[PASS] OTP Generated & Sent successfully: {otp_code} to {test_phone}")

    # 3. Test Invalid OTP
    bad_res = verify_user_otp(phone=test_phone, otp_code="000000", name=test_name, email=test_email)
    assert bad_res["success"] is False, "Invalid OTP should not pass"
    print("[PASS] Invalid OTP correctly rejected")

    # 4. Test Valid OTP Verification & User Creation
    verify_res = verify_user_otp(phone=test_phone, otp_code=otp_code, name=test_name, email=test_email)
    assert verify_res["success"] is True, "Valid OTP verification failed"
    user = verify_res["user"]
    assert user["name"] == test_name
    assert user["phone"] == test_phone
    assert user["is_verified"] == 1
    print(f"[PASS] User authenticated & saved in SQLite: ID={user['id']}, Name={user['name']}")

    # 5. Test Saving AI Loan Assessment & Readiness Score
    assessment_id = save_loan_assessment(
        user_id=user["id"],
        session_id="test-session-123",
        recommended_scheme_id="mahila_samriddhi_yojana",
        recommended_scheme_name="Mahila Samriddhi Yojana (MSY)",
        readiness_score=88,
        readiness_band="उत्कृष्ट (Excellent)",
        loan_amount=140000.0,
        annual_income=250000.0,
        tenure_months=36,
        purpose="Tailoring & Boutique Shop",
        location="Kurukshetra, Haryana",
        pillars={"character": 90, "capacity": 85, "capital": 80, "collateral": 95, "conditions": 90},
        tips=["Maintain timely repayments", "Keep SC caste certificate updated"]
    )
    assert assessment_id > 0, "Failed to save assessment"
    print(f"[PASS] Loan Assessment & Readiness Score saved to SQLite: Assessment ID={assessment_id}")

    # 6. Test Fetching User Assessments
    assessments = get_user_loan_assessments(user["id"])
    assert len(assessments) >= 1
    first = assessments[0]
    assert first["readiness_score"] == 88
    assert first["recommended_scheme_id"] == "mahila_samriddhi_yojana"
    assert first["pillars"]["collateral"] == 95
    print(f"[PASS] Retrieved {len(assessments)} saved assessment(s) from database: Scheme={first['recommended_scheme_name']}, Score={first['readiness_score']}")

    print("\n--- ALL AUTH & DATABASE TESTS PASSED! ---")


if __name__ == "__main__":
    test_auth_and_db()
