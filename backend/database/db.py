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

    # 5. Live Crawled Schemes Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS schemes (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            name_hi TEXT,
            loan_type TEXT,
            target_group TEXT,
            description TEXT,
            description_hi TEXT,
            max_loan REAL,
            unit_cost_limit REAL,
            interest_rate REAL,
            moratorium_months INTEGER,
            repayment_tenure_months INTEGER,
            subsidy_percentage REAL,
            subsidy_details TEXT,
            eligibility_json TEXT,
            documents_json TEXT,
            keywords_json TEXT,
            tags_json TEXT,
            raw_json TEXT,
            content_hash TEXT,
            last_updated TEXT NOT NULL
        )
    """)

    # 6. Live Crawled Channel Partners Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS channel_partners (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            name_hi TEXT,
            type TEXT NOT NULL,
            type_label TEXT,
            state TEXT NOT NULL,
            district TEXT,
            city TEXT,
            pincode TEXT,
            address TEXT,
            address_hi TEXT,
            latitude REAL,
            longitude REAL,
            phone TEXT,
            helpline TEXT,
            email TEXT,
            nodal_officer TEXT,
            working_hours TEXT,
            schemes_json TEXT,
            loan_types_json TEXT,
            special_services_json TEXT,
            keywords_json TEXT,
            raw_json TEXT,
            content_hash TEXT,
            last_updated TEXT NOT NULL
        )
    """)

    # 7. Crawler Audit Logs Table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS crawler_audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trigger_source TEXT NOT NULL,
            status TEXT NOT NULL,
            schemes_checked INTEGER DEFAULT 0,
            schemes_updated INTEGER DEFAULT 0,
            partners_checked INTEGER DEFAULT 0,
            partners_updated INTEGER DEFAULT 0,
            diff_summary_json TEXT,
            error_message TEXT,
            duration_sec REAL DEFAULT 0.0,
            created_at TEXT NOT NULL
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
    code_clean = str(otp_code).strip()
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()

    conn = get_db_connection()
    cursor = conn.cursor()

    # Allow master testing/demo OTP 123456
    if code_clean == "123456":
        cursor.execute("UPDATE otp_records SET is_used = 1 WHERE phone = ? AND is_used = 0", (phone_clean,))
        conn.commit()
        conn.close()
        return True

    cursor.execute("""
        SELECT * FROM otp_records 
        WHERE phone = ? AND otp_code = ? AND is_used = 0 AND expires_at > ?
        ORDER BY id DESC LIMIT 1
    """, (phone_clean, code_clean, now_iso))

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


# =====================================================
# CRAWLER DATA & AUDIT LOGS REPOSITORY
# =====================================================

def upsert_scheme(scheme_dict: Dict[str, Any], content_hash: str) -> bool:
    """
    Inserts or updates a crawled scheme record.
    Returns True if newly inserted or updated with diff, False if unchanged.
    """
    scheme_id = scheme_dict.get("id")
    if not scheme_id:
        return False

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT content_hash FROM schemes WHERE id = ?", (scheme_id,))
    existing = cursor.fetchone()

    if existing and existing["content_hash"] == content_hash:
        conn.close()
        return False  # Unchanged

    raw_json_str = json.dumps(scheme_dict, ensure_ascii=False)
    eligibility_json = json.dumps(scheme_dict.get("eligibility", {}), ensure_ascii=False)
    documents_json = json.dumps(scheme_dict.get("mandatory_documents", []), ensure_ascii=False)
    keywords_json = json.dumps(scheme_dict.get("keywords", []), ensure_ascii=False)
    tags_json = json.dumps(scheme_dict.get("tags", []), ensure_ascii=False)

    cursor.execute("""
        INSERT INTO schemes (
            id, name, name_hi, loan_type, target_group, description, description_hi,
            max_loan, unit_cost_limit, interest_rate, moratorium_months,
            repayment_tenure_months, subsidy_percentage, subsidy_details,
            eligibility_json, documents_json, keywords_json, tags_json,
            raw_json, content_hash, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            name_hi = excluded.name_hi,
            loan_type = excluded.loan_type,
            target_group = excluded.target_group,
            description = excluded.description,
            description_hi = excluded.description_hi,
            max_loan = excluded.max_loan,
            unit_cost_limit = excluded.unit_cost_limit,
            interest_rate = excluded.interest_rate,
            moratorium_months = excluded.moratorium_months,
            repayment_tenure_months = excluded.repayment_tenure_months,
            subsidy_percentage = excluded.subsidy_percentage,
            subsidy_details = excluded.subsidy_details,
            eligibility_json = excluded.eligibility_json,
            documents_json = excluded.documents_json,
            keywords_json = excluded.keywords_json,
            tags_json = excluded.tags_json,
            raw_json = excluded.raw_json,
            content_hash = excluded.content_hash,
            last_updated = excluded.last_updated
    """, (
        scheme_id,
        scheme_dict.get("name", ""),
        scheme_dict.get("name_hi", ""),
        scheme_dict.get("loan_type", "business"),
        scheme_dict.get("target_group", ""),
        scheme_dict.get("description", ""),
        scheme_dict.get("description_hi", ""),
        float(scheme_dict.get("max_loan", 0)),
        float(scheme_dict.get("unit_cost_limit", 0)),
        float(scheme_dict.get("interest_rate", 0)),
        int(scheme_dict.get("moratorium_months", 0)),
        int(scheme_dict.get("repayment_tenure_months", 0)),
        float(scheme_dict.get("subsidy_percentage", 0)),
        scheme_dict.get("subsidy_details", ""),
        eligibility_json,
        documents_json,
        keywords_json,
        tags_json,
        raw_json_str,
        content_hash,
        now_iso
    ))

    conn.commit()
    conn.close()
    return True


def get_all_stored_schemes() -> List[Dict[str, Any]]:
    """Retrieves all schemes currently stored in SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM schemes ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        item = dict(r)
        if item.get("raw_json"):
            try:
                full_obj = json.loads(item["raw_json"])
                full_obj["last_updated"] = item.get("last_updated")
                results.append(full_obj)
                continue
            except Exception:
                pass
        results.append(item)
    return results


def upsert_channel_partner(partner_dict: Dict[str, Any], content_hash: str) -> bool:
    """
    Inserts or updates a crawled channel partner record.
    Returns True if newly inserted or updated with diff, False if unchanged.
    """
    partner_id = partner_dict.get("id")
    if not partner_id:
        return False

    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("SELECT content_hash FROM channel_partners WHERE id = ?", (partner_id,))
    existing = cursor.fetchone()

    if existing and existing["content_hash"] == content_hash:
        conn.close()
        return False  # Unchanged

    raw_json_str = json.dumps(partner_dict, ensure_ascii=False)
    schemes_json = json.dumps(partner_dict.get("schemes", []), ensure_ascii=False)
    loan_types_json = json.dumps(partner_dict.get("loan_types", []), ensure_ascii=False)
    special_services_json = json.dumps(partner_dict.get("special_services", []), ensure_ascii=False)
    keywords_json = json.dumps(partner_dict.get("keywords", []), ensure_ascii=False)

    cursor.execute("""
        INSERT INTO channel_partners (
            id, name, name_hi, type, type_label, state, district, city, pincode,
            address, address_hi, latitude, longitude, phone, helpline, email,
            nodal_officer, working_hours, schemes_json, loan_types_json,
            special_services_json, keywords_json, raw_json, content_hash, last_updated
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            name = excluded.name,
            name_hi = excluded.name_hi,
            type = excluded.type,
            type_label = excluded.type_label,
            state = excluded.state,
            district = excluded.district,
            city = excluded.city,
            pincode = excluded.pincode,
            address = excluded.address,
            address_hi = excluded.address_hi,
            latitude = excluded.latitude,
            longitude = excluded.longitude,
            phone = excluded.phone,
            helpline = excluded.helpline,
            email = excluded.email,
            nodal_officer = excluded.nodal_officer,
            working_hours = excluded.working_hours,
            schemes_json = excluded.schemes_json,
            loan_types_json = excluded.loan_types_json,
            special_services_json = excluded.special_services_json,
            keywords_json = excluded.keywords_json,
            raw_json = excluded.raw_json,
            content_hash = excluded.content_hash,
            last_updated = excluded.last_updated
    """, (
        partner_id,
        partner_dict.get("name", ""),
        partner_dict.get("name_hi", ""),
        partner_dict.get("type", "SCA"),
        partner_dict.get("type_label", ""),
        partner_dict.get("state", ""),
        partner_dict.get("district", ""),
        partner_dict.get("city", ""),
        partner_dict.get("pincode", ""),
        partner_dict.get("address", ""),
        partner_dict.get("address_hi", ""),
        float(partner_dict.get("latitude", 0.0)),
        float(partner_dict.get("longitude", 0.0)),
        partner_dict.get("phone", ""),
        partner_dict.get("helpline", ""),
        partner_dict.get("email", ""),
        partner_dict.get("nodal_officer", ""),
        partner_dict.get("working_hours", ""),
        schemes_json,
        loan_types_json,
        special_services_json,
        keywords_json,
        raw_json_str,
        content_hash,
        now_iso
    ))

    conn.commit()
    conn.close()
    return True


def get_all_stored_partners() -> List[Dict[str, Any]]:
    """Retrieves all channel partners currently stored in SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM channel_partners ORDER BY state ASC, id ASC")
    rows = cursor.fetchall()
    conn.close()

    results = []
    for r in rows:
        item = dict(r)
        if item.get("raw_json"):
            try:
                full_obj = json.loads(item["raw_json"])
                full_obj["last_updated"] = item.get("last_updated")
                results.append(full_obj)
                continue
            except Exception:
                pass
        results.append(item)
    return results


def log_crawler_run(
    trigger_source: str,
    status: str,
    schemes_checked: int,
    schemes_updated: int,
    partners_checked: int,
    partners_updated: int,
    diff_summary: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
    duration_sec: float = 0.0
) -> int:
    """Records an audit log entry for a crawler execution run."""
    now_iso = datetime.datetime.now(datetime.timezone.utc).isoformat()
    conn = get_db_connection()
    cursor = conn.cursor()

    diff_summary_json = json.dumps(diff_summary or {}, ensure_ascii=False)

    cursor.execute("""
        INSERT INTO crawler_audit_logs (
            trigger_source, status, schemes_checked, schemes_updated,
            partners_checked, partners_updated, diff_summary_json,
            error_message, duration_sec, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        trigger_source, status, schemes_checked, schemes_updated,
        partners_checked, partners_updated, diff_summary_json,
        error_message, duration_sec, now_iso
    ))

    log_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return log_id


def get_crawler_logs(limit: int = 50) -> List[Dict[str, Any]]:
    """Retrieves historical crawler audit run logs."""
    conn = get_db_connection()
    cursor = conn.cursor()

    cursor.execute("""
        SELECT * FROM crawler_audit_logs 
        ORDER BY id DESC 
        LIMIT ?
    """, (limit,))

    rows = cursor.fetchall()
    results = []
    for r in rows:
        item = dict(r)
        if item.get("diff_summary_json"):
            try:
                item["diff_summary"] = json.loads(item["diff_summary_json"])
            except Exception:
                item["diff_summary"] = {}
        results.append(item)

    conn.close()
    return results


# Initialize database automatically on module import
init_db()

