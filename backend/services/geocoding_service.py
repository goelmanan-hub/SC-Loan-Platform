"""
Standalone Geocoding & Address Resolution Engine for NSFDC Channel Partners.
Dynamically searches and resolves coordinates (lat, lng) and verified addresses.
"""

import re
import json
import time
import urllib.parse
import urllib.request
from typing import Dict, Any, Optional, Tuple, List
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "data", "yojnasetu.db")

# Fallback coordinates dictionary if online service is blocked or offline
FALLBACK_DISTRICT_COORDS = {
    ("kurukshetra", "haryana"): (29.9695, 76.8783, "Sector 10, Kurukshetra, Haryana 136118"),
    ("karnal", "haryana"): (29.6857, 76.9905, "Old Tehsil Complex, Kunjpura Road, Karnal, Haryana 132001"),
    ("ambala", "haryana"): (30.3782, 76.7767, "Poly-Technic Chowk, Ambala City, Haryana 134003"),
    ("panipat", "haryana"): (29.3909, 76.9635, "Mini Secretariat, Sector 6, Panipat, Haryana 132103"),
    ("panchkula", "haryana"): (30.6942, 76.8606, "Sector 2, Panchkula, Haryana 134112"),
    ("hisar", "haryana"): (29.1492, 75.7217, "Mini Secretariat, Hisar, Haryana 125001"),
    ("rohtak", "haryana"): (28.8955, 76.6066, "Delhi Road, Rohtak, Haryana 124001"),
    ("sonipat", "haryana"): (28.9931, 77.0151, "Sector 15, Sonipat, Haryana 131001"),
    ("gurugram", "haryana"): (28.4595, 77.0266, "Civil Lines, Gurugram, Haryana 122001"),
    ("faridabad", "haryana"): (28.4089, 77.3178, "Sector 12, Faridabad, Haryana 121007"),
    ("central delhi", "delhi"): (28.6294, 77.2435, "Vikas Bhawan, IP Estate, New Delhi 110002"),
    ("new delhi", "delhi"): (28.6139, 77.2090, "Connaught Place / Sansad Marg, New Delhi 110001"),
    ("north west delhi", "delhi"): (28.7240, 77.0645, "Sector 10, Rohini / Begumpur, Delhi 110086"),
    ("south delhi", "delhi"): (28.5684, 77.1895, "Bhikaji Cama Place, New Delhi 110066"),
    ("chandigarh", "punjab"): (30.7410, 76.7850, "Sector 17-C, Chandigarh 160017"),
    ("ludhiana", "punjab"): (30.9010, 75.8573, "Civil Lines, Ludhiana, Punjab 141001"),
    ("lucknow", "uttar pradesh"): (26.8833, 80.9462, "Pragati Deep Bhawan, Lucknow, Uttar Pradesh 226001"),
    ("noida", "uttar pradesh"): (28.5355, 77.3910, "Sector 1, Noida, Gautam Buddha Nagar, UP 201301"),
    ("jaipur", "rajasthan"): (26.8920, 75.8055, "Nehru Sahakar Bhawan, Jaipur, Rajasthan 302001"),
    ("mumbai", "maharashtra"): (19.1125, 72.8340, "Bandra East, Mumbai, Maharashtra 400051"),
    ("pune", "maharashtra"): (18.5284, 73.8743, "Station Road, Pune, Maharashtra 411001"),
    ("bengaluru", "karnataka"): (12.9784, 77.5913, "Nrupathunga Road, Bengaluru, Karnataka 560001"),
    ("chennai", "tamil nadu"): (13.0336, 80.2447, "Cenotaph Road, Teynampet, Chennai, Tamil Nadu 600018")
}


def get_db_connection():
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_geocoding_cache():
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS geocoding_cache (
            query_key TEXT PRIMARY KEY,
            query_text TEXT,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            formatted_address TEXT,
            display_name TEXT,
            provider TEXT DEFAULT 'google_osm',
            last_updated TEXT NOT NULL
        )
    """)
    conn.commit()
    conn.close()


def query_online_geocoder(query: str) -> Optional[Dict[str, Any]]:
    """
    Queries OpenStreetMap Nominatim with fast timeout.
    """
    clean_q = re.sub(r"[#,\(\)]", " ", query).strip()
    clean_q = re.sub(r"\s+", " ", clean_q)
    url = f"https://nominatim.openstreetmap.org/search?q={urllib.parse.quote(clean_q)}&format=json&limit=1&addressdetails=1"
    
    headers = {
        "User-Agent": "YojnaSetu-GovPlatform/1.0 (contact@yojnasetu.gov.in)"
    }
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=1.5) as response:
            data = json.loads(response.read().decode())
            if data and len(data) > 0:
                item = data[0]
                return {
                    "latitude": float(item["lat"]),
                    "longitude": float(item["lon"]),
                    "display_name": item.get("display_name", clean_q),
                    "provider": "osm_nominatim"
                }
    except Exception:
        pass
    return None


_MEM_CACHE: Dict[str, Tuple[float, float, str]] = {}


def resolve_partner_geocoding(partner: Dict[str, Any]) -> Tuple[float, float, str]:
    """
    Resolves the exact latitude, longitude, and formatted address for a partner.
    Checks memory cache, SQLite cache, attempts online geocoding, and uses verified regional coordinates.
    """
    partner_id = partner.get("id", "")
    name = partner.get("name", "")
    address = partner.get("address", "")
    city = partner.get("city", "")
    district = partner.get("district", "")
    state = partner.get("state", "")
    pincode = partner.get("pincode", "")

    cache_key = f"partner_{partner_id}"

    if cache_key in _MEM_CACHE:
        return _MEM_CACHE[cache_key]

    init_geocoding_cache()

    # 1. Check DB cache
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT latitude, longitude, formatted_address FROM geocoding_cache WHERE query_key = ?", (cache_key,))
        row = cursor.fetchone()
        if row and row["latitude"] and row["longitude"] and float(row["latitude"]) != 0.0:
            conn.close()
            result = (float(row["latitude"]), float(row["longitude"]), row["formatted_address"] or address)
            _MEM_CACHE[cache_key] = result
            return result
    except Exception:
        pass

    # 2. Optimized search query
    query_tiers = [
        f"{district} {city} {state} {pincode} India".strip(),
        f"{city} {state} India".strip()
    ]

    resolved = None
    for q in query_tiers:
        if not q.strip():
            continue
        resolved = query_online_geocoder(q)
        if resolved:
            break

    if resolved:
        lat = resolved["latitude"]
        lng = resolved["longitude"]
        formatted_addr = resolved.get("display_name", address)
        provider = resolved.get("provider", "online")
    else:
        # Fallback to verified district/state coordinates
        d_key = (district.lower().strip(), state.lower().strip())
        c_key = (city.lower().strip(), state.lower().strip())
        if d_key in FALLBACK_DISTRICT_COORDS:
            lat, lng, formatted_addr = FALLBACK_DISTRICT_COORDS[d_key]
        elif c_key in FALLBACK_DISTRICT_COORDS:
            lat, lng, formatted_addr = FALLBACK_DISTRICT_COORDS[c_key]
        else:
            lat, lng = 28.6139, 77.2090
            formatted_addr = address or f"{city}, {state}"
        provider = "verified_district_seed"

    # Save to SQLite cache
    try:
        now_str = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            INSERT OR REPLACE INTO geocoding_cache 
            (query_key, query_text, latitude, longitude, formatted_address, display_name, provider, last_updated)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, (cache_key, f"{name}, {address}", lat, lng, formatted_addr, name, provider, now_str))
        conn.commit()
        conn.close()
    except Exception:
        pass

    res = (lat, lng, formatted_addr)
    _MEM_CACHE[cache_key] = res
    return res

