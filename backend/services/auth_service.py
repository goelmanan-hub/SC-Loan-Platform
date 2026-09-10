"""
YOJNASETU - AUTHENTICATION & OTP VERIFICATION SERVICE
Handles Phone & Email OTP generation, dispatch simulation, and user verification.
"""

import random
import logging
from typing import Dict, Any, Optional

from database.db import (
    store_otp,
    verify_stored_otp,
    save_or_update_user,
    get_user_by_id,
    get_user_by_phone,
    save_loan_assessment,
    get_user_loan_assessments
)

logger = logging.getLogger("auth_service")


def generate_otp_code() -> str:
    """Generates a secure 6-digit OTP code."""
    return str(random.randint(100000, 999999))


def send_otp_to_user(phone: str, email: Optional[str] = None, name: Optional[str] = None) -> Dict[str, Any]:
    """
    Generates and stores OTP for user, simulates SMS and Email delivery.
    In development/demo mode, returns the generated OTP in response for instant testing.
    """
    phone_clean = phone.strip().replace(" ", "").replace("-", "")
    
    if len(phone_clean) < 10:
        return {
            "success": False,
            "message": "कृपया एक मान्य 10-अंकीय मोबाइल नंबर दर्ज करें (Please enter valid 10-digit mobile number)."
        }

    otp_code = generate_otp_code()
    otp_id = store_otp(phone=phone_clean, email=email, otp_code=otp_code, valid_minutes=10)

    # Log SMS and Email dispatch
    print("\n==========================================")
    print(f"[SMS GATEWAY DISPATCH] -> {phone_clean}")
    print(f"   YojnaSetu OTP Code: {otp_code} (Valid for 10 mins)")
    if email:
        print(f"[EMAIL GATEWAY DISPATCH] -> {email}")
        print(f"   Subject: YojnaSetu Verification Code")
        print(f"   Dear Applicant, your YojnaSetu Login OTP is: {otp_code}")
    print("==========================================\n")

    return {
        "success": True,
        "message": f"सत्यापन कोड (OTP) {phone_clean} पर सफलतापूर्वक भेजा गया है।",
        "phone": phone_clean,
        "email": email,
        "otp_preview": otp_code,  # Provided for easy testing & hackathon demonstration
        "expires_in_seconds": 600
    }


def verify_user_otp(phone: str, otp_code: str, name: Optional[str] = None, email: Optional[str] = None) -> Dict[str, Any]:
    """
    Verifies the provided OTP code and logs in/registers the applicant in SQLite.
    """
    phone_clean = phone.strip().replace(" ", "").replace("-", "")
    code_clean = otp_code.strip()

    is_valid = verify_stored_otp(phone=phone_clean, otp_code=code_clean)

    if not is_valid:
        return {
            "success": False,
            "message": "गलत या समाप्त हो चुका OTP कोड दर्ज किया गया है। कृपया पुनः प्रयास करें।"
        }

    # Save or update user in database
    user = save_or_update_user(phone=phone_clean, name=name, email=email, is_verified=True)

    # Fetch any previous loan assessments for this user
    assessments = get_user_loan_assessments(user["id"])

    return {
        "success": True,
        "message": f"सत्यापन सफल! योजनासेतु में आपका स्वागत है, {user['name']}।",
        "user": user,
        "token": f"bearer_{user['id']}",
        "saved_assessments_count": len(assessments)
    }
