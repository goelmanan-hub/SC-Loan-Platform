"""
YOJNASETU - SQLITE DATABASE LAYER
Provides persistent storage for:
1. User profiles (Name, Phone, Email, Verification status)
2. OTP verification records (Time-bounded secure OTPs)
3. Loan Assessment history (AI Recommended Schemes, Readiness Scores, 5-C Pillars breakdown)
4. Chat session logs linked to authenticated applicants
"""

import os
import sqlite3
import json
import uuid
import datetime
from typing import Optional, Dict, Any, List

# Ensure data directory exists
DB_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data")
os.makedirs(DB_DIR, exist_ok=True)
DB_PATH = os.path.join(DB_DIR, "yojnasetu.db")


def get_db_connection() -> sqlite3.Connection:
    """Creates a thread-safe connection to the SQLite database with Row factory."""
    conn = sqlite3.connect(DB_PATH, timeout=10.0)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    """Initializes the database schema if tables do not exist."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            email TEXT,
            is_verified INTEGER DEFAULT 0,
            created_at TEXT NOT NULL,
            last_login TEXT NOT NULL
        )
    """)

    # 2. OTP records table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS otp_records (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT NOT NULL,
            email TEXT,
            otp_code TEXT NOT NULL,
            expires_at TEXT NOT NULL,
            is_used INTEGER DEFAULT 0,
            created_at TEXT NOT NULL
        )
    """)

    # 3. Loan Assessments & Recommendations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS loan_assessments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            session_id TEXT,
            recommended_scheme_id TEXT,
            recommended_scheme_name TEXT,
            readiness_score INTEGER,
            readiness_band TEXT,
            loan_amount REAL,
            annual_income REAL,
            tenure_months INTEGER,
            purpose TEXT,
            location TEXT,
            pillars_json TEXT,
            tips_json TEXT,
            created_at TEXT,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)

    # 4. User activity logs
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id TEXT,
            action TEXT NOT NULL,
            details_json TEXT,
            timestamp TEXT NOT NULL
        )
    """)

    conn.commit()
    conn.close()
    print(f"[DB] SQLite Database initialized at: {DB_PATH}")


# =====================================================
# USER REPOSITORY
# =====================================================

def save_or_update_user(phone: str, name: Optional[str] = None, email: Optional[str] = None, is_verified: bool = True) -> Dict[str, Any]:
    """Creates a new user or updates existing user record upon successful OTP verification."""
    conn = get_db_connection()
    cursor = conn.cursor()
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    phone_clean = phone.strip().replace(" ", "").replace("-", "")

    cursor.execute("SELECT * FROM users WHERE phone = ?", (phone_clean,))
    existing = cursor.fetchone()

    if existing:
        user_id = existing["id"]
        updated_name = name.strip() if name and name.strip() else existing["name"]
        updated_email = email.strip() if email and email.strip() else existing["email"]
        
        cursor.execute("""
            UPDATE users 
            SET name = ?, email = ?, is_verified = ?, last_login = ? 
            WHERE id = ?
        """, (updated_name, updated_email, 1 if is_verified else existing["is_verified"], now_iso, user_id))
    else:
        user_id = str(uuid.uuid4())
        default_name = name.strip() if name and name.strip() else "Applicant"
        cursor.execute("""
            INSERT INTO users (id, name, phone, email, is_verified, created_at, last_login)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (user_id, default_name, phone_clean, email.strip() if email else None, 1 if is_verified else 0, now_iso, now_iso))

    conn.commit()

    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    user_row = cursor.fetchone()
    conn.close()

    return dict(user_row)


def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    """Fetches user profile by ID."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_by_phone(phone: str) -> Optional[Dict[str, Any]]:
    """Fetches user profile by Phone number."""
    phone_clean = phone.strip().replace(" ", "").replace("-", "")
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM users WHERE phone = ?", (phone_clean,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


# =====================================================
# OTP REPOSITORY
# =====================================================

def store_otp(phone: str, email: Optional[str], otp_code: str, valid_minutes: int = 10) -> int:
    """Stores a newly generated OTP record."""
    phone_clean = phone.strip().replace(" ", "").replace("-", "")
    now = datetime.datetime.now(datetime.timezone.utc)
    expires_at = (now + datetime.timedelta(minutes=valid_minutes)).isoformat()
    now_iso = now.isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()

    # Invalidate previous unused OTPs for this phone
    cursor.execute("UPDATE otp_records SET is_used = 1 WHERE phone = ? AND is_used = 0", (phone_clean,))

    cursor.execute("""
        INSERT INTO otp_records (phone, email, otp_code, expires_at, is_used, created_at)
        VALUES (?, ?, ?, ?, 0, ?)
    """, (phone_clean, email.strip() if email else None, otp_code, expires_at, now_iso))

    otp_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return otp_id


def verify_stored_otp(phone: str, otp_code: str) -> bool:
    """Verifies that the OTP is correct, not expired, and not already used."""
    phone_clean = phone.strip().replace(" ", "").replace("-", "")
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM otp_records 
        WHERE phone = ? AND otp_code = ? AND is_used = 0 AND expires_at > ?
        ORDER BY id DESC LIMIT 1
    """, (phone_clean, otp_code.strip(), now_iso))

    record = cursor.fetchone()

    if record:
        cursor.execute("UPDATE otp_records SET is_used = 1 WHERE id = ?", (record["id"],))
        conn.commit()
        conn.close()
        return True

    conn.close()
    return False


# =====================================================
# LOAN ASSESSMENTS & RECOMMENDATIONS REPOSITORY
# =====================================================

def save_loan_assessment(
    user_id: Optional[str],
    session_id: Optional[str],
    recommended_scheme_id: Optional[str],
    recommended_scheme_name: Optional[str],
    readiness_score: Optional[int],
    readiness_band: Optional[str],
    loan_amount: Optional[float],
    annual_income: Optional[float],
    tenure_months: Optional[int],
    purpose: Optional[str],
    location: Optional[str],
    pillars: Optional[Dict[str, Any]] = None,
    tips: Optional[List[str]] = None
) -> int:
    """Saves a recommended scheme and loan readiness assessment record to the database."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    pillars_json_str = json.dumps(pillars or {}, ensure_ascii=False)
    tips_json_str = json.dumps(tips or [], ensure_ascii=False)

    cursor.execute("""
        INSERT INTO loan_assessments (
            user_id, session_id, recommended_scheme_id, recommended_scheme_name,
            readiness_score, readiness_band, loan_amount, annual_income,
            tenure_months, purpose, location, pillars_json, tips_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        user_id, session_id, recommended_scheme_id, recommended_scheme_name,
        readiness_score, readiness_band, loan_amount, annual_income,
        tenure_months, purpose, location, pillars_json_str, tips_json_str, now_iso
    ))

    assessment_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return assessment_id


def get_user_loan_assessments(user_id: str) -> List[Dict[str, Any]]:
    """Retrieves all loan assessments and recommendations saved for a user."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM loan_assessments 
        WHERE user_id = ? 
        ORDER BY id DESC
    """, (user_id,))

    rows = cursor.fetchall()
    results = []
    for r in rows:
        item = dict(r)
        try:
            item["pillars"] = json.loads(item["pillars_json"]) if item.get("pillars_json") else {}
        except Exception:
            item["pillars"] = {}
        try:
            item["tips"] = json.loads(item["tips_json"]) if item.get("tips_json") else []
        except Exception:
            item["tips"] = []
        results.append(item)

    conn.close()
    return results


# Initialize database automatically on module import
init_db()
