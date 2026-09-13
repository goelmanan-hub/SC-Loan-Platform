"""
RAG (Retrieval-Augmented Generation) & Semantic Geolocation Service for Official NSFDC Channel Partners.
Provides hybrid retrieval combining TF-IDF vector search, Haversine geospatial proximity,
scheme eligibility constraints, and multi-lingual query understanding.
"""

import math
import re
import urllib.parse
from typing import List, Dict, Any, Optional
from data.nsfdc_partners_kb import get_all_channel_partners_kb, get_channel_partner_by_id_kb
from database.db import get_all_stored_partners
from services.geocoding_service import resolve_partner_geocoding


# =====================================================
# HAVERSINE GEODISTANCE CALCULATOR & GEOCODER
# =====================================================

GEOCODED_LOCATIONS: Dict[str, Dict[str, Any]] = {
    # Delhi Localities & Districts
    "begumpur": {"lat": 28.7240, "lng": 77.0645, "name": "Begumpur (North West Delhi)", "state": "Delhi"},
    "begam pur": {"lat": 28.7240, "lng": 77.0645, "name": "Begumpur (North West Delhi)", "state": "Delhi"},
    "rohini": {"lat": 28.7235, "lng": 77.1142, "name": "Rohini (North West Delhi)", "state": "Delhi"},
    "pitampura": {"lat": 28.6990, "lng": 77.1384, "name": "Pitampura (North West Delhi)", "state": "Delhi"},
    "bawana": {"lat": 28.7997, "lng": 77.0326, "name": "Bawana (North West Delhi)", "state": "Delhi"},
    "narela": {"lat": 28.8527, "lng": 77.0931, "name": "Narela (North Delhi)", "state": "Delhi"},
    "nangloi": {"lat": 28.6835, "lng": 77.0654, "name": "Nangloi (West Delhi)", "state": "Delhi"},
    "mangolpuri": {"lat": 28.6925, "lng": 77.0789, "name": "Mangolpuri (North West Delhi)", "state": "Delhi"},
    "sultanpuri": {"lat": 28.6987, "lng": 77.0754, "name": "Sultanpuri (North West Delhi)", "state": "Delhi"},
    "paschim vihar": {"lat": 28.6692, "lng": 77.1002, "name": "Paschim Vihar (West Delhi)", "state": "Delhi"},
    "dwarka": {"lat": 28.5921, "lng": 77.0460, "name": "Dwarka (South West Delhi)", "state": "Delhi"},
    "najafgarh": {"lat": 28.6090, "lng": 76.9798, "name": "Najafgarh (South West Delhi)", "state": "Delhi"},
    "janakpuri": {"lat": 28.6219, "lng": 77.0878, "name": "Janakpuri (West Delhi)", "state": "Delhi"},
    "ito": {"lat": 28.6294, "lng": 77.2435, "name": "ITO / Vikas Bhawan (Central Delhi)", "state": "Delhi"},
    "connaught place": {"lat": 28.6315, "lng": 77.2167, "name": "Connaught Place (New Delhi)", "state": "Delhi"},
    "karol bagh": {"lat": 28.6517, "lng": 77.1906, "name": "Karol Bagh (Central Delhi)", "state": "Delhi"},
    "laxmi nagar": {"lat": 28.6304, "lng": 77.2773, "name": "Laxmi Nagar (East Delhi)", "state": "Delhi"},
    "bhikaji cama place": {"lat": 28.5684, "lng": 77.1895, "name": "Bhikaji Cama Place (South Delhi)", "state": "Delhi"},
    "saket": {"lat": 28.5245, "lng": 77.2066, "name": "Saket (South Delhi)", "state": "Delhi"},
    "delhi": {"lat": 28.6500, "lng": 77.1500, "name": "Delhi NCR", "state": "Delhi"},
    "new delhi": {"lat": 28.6139, "lng": 77.2090, "name": "New Delhi", "state": "Delhi"},
    "delhi ncr": {"lat": 28.6500, "lng": 77.1500, "name": "Delhi NCR", "state": "Delhi"},

    # Haryana Cities
    "kurukshetra": {"lat": 29.9695, "lng": 76.8783, "name": "Kurukshetra (Haryana)", "state": "Haryana"},
    "thanesar": {"lat": 29.9695, "lng": 76.8783, "name": "Thanesar (Kurukshetra)", "state": "Haryana"},
    "pehowa": {"lat": 29.9800, "lng": 76.5800, "name": "Pehowa (Kurukshetra)", "state": "Haryana"},
    "karnal": {"lat": 29.6857, "lng": 76.9905, "name": "Karnal (Haryana)", "state": "Haryana"},
    "ambala": {"lat": 30.3782, "lng": 76.7767, "name": "Ambala (Haryana)", "state": "Haryana"},
    "panipat": {"lat": 29.3909, "lng": 76.9635, "name": "Panipat (Haryana)", "state": "Haryana"},
    "panchkula": {"lat": 30.6942, "lng": 76.8606, "name": "Panchkula (Haryana)", "state": "Haryana"},
    "rohtak": {"lat": 28.8955, "lng": 76.6066, "name": "Rohtak (Haryana)", "state": "Haryana"},
    "hisar": {"lat": 29.1492, "lng": 75.7217, "name": "Hisar (Haryana)", "state": "Haryana"},
    "sonipat": {"lat": 28.9931, "lng": 77.0151, "name": "Sonipat (Haryana)", "state": "Haryana"},
    "gurugram": {"lat": 28.4595, "lng": 77.0266, "name": "Gurugram (Haryana)", "state": "Haryana"},
    "gurgaon": {"lat": 28.4595, "lng": 77.0266, "name": "Gurgaon (Haryana)", "state": "Haryana"},
    "faridabad": {"lat": 28.4089, "lng": 77.3178, "name": "Faridabad (Haryana)", "state": "Haryana"},

    # Uttar Pradesh
    "noida": {"lat": 28.5355, "lng": 77.3910, "name": "Noida / Greater Noida (UP)", "state": "Uttar Pradesh"},
    "greater noida": {"lat": 28.5355, "lng": 77.3910, "name": "Greater Noida (UP)", "state": "Uttar Pradesh"},
    "ghaziabad": {"lat": 28.6692, "lng": 77.4538, "name": "Ghaziabad (UP)", "state": "Uttar Pradesh"},
    "lucknow": {"lat": 26.8833, "lng": 80.9462, "name": "Lucknow (UP)", "state": "Uttar Pradesh"},
    "agra": {"lat": 27.1985, "lng": 78.0064, "name": "Agra (UP)", "state": "Uttar Pradesh"},
    "kanpur": {"lat": 26.4499, "lng": 80.3319, "name": "Kanpur (UP)", "state": "Uttar Pradesh"},
    "varanasi": {"lat": 25.3176, "lng": 82.9739, "name": "Varanasi (UP)", "state": "Uttar Pradesh"},

    # Punjab & Chandigarh
    "chandigarh": {"lat": 30.7410, "lng": 76.7850, "name": "Chandigarh (Punjab)", "state": "Punjab"},
    "ludhiana": {"lat": 30.9010, "lng": 75.8573, "name": "Ludhiana (Punjab)", "state": "Punjab"},
    "amritsar": {"lat": 31.6340, "lng": 74.8723, "name": "Amritsar (Punjab)", "state": "Punjab"},
    "jalandhar": {"lat": 31.3260, "lng": 75.5762, "name": "Jalandhar (Punjab)", "state": "Punjab"},
    "patiala": {"lat": 30.3398, "lng": 76.3869, "name": "Patiala (Punjab)", "state": "Punjab"},

    # Rajasthan
    "jaipur": {"lat": 26.8920, "lng": 75.8055, "name": "Jaipur (Rajasthan)", "state": "Rajasthan"},
    "jodhpur": {"lat": 26.2389, "lng": 73.0243, "name": "Jodhpur (Rajasthan)", "state": "Rajasthan"},
    "kota": {"lat": 25.2138, "lng": 75.8648, "name": "Kota (Rajasthan)", "state": "Rajasthan"},
    "udaipur": {"lat": 24.5854, "lng": 73.7125, "name": "Udaipur (Rajasthan)", "state": "Rajasthan"},

    # Maharashtra & South
    "mumbai": {"lat": 19.1125, "lng": 72.8340, "name": "Mumbai (Maharashtra)", "state": "Maharashtra"},
    "pune": {"lat": 18.5284, "lng": 73.8743, "name": "Pune (Maharashtra)", "state": "Maharashtra"},
    "nagpur": {"lat": 21.1458, "lng": 79.0882, "name": "Nagpur (Maharashtra)", "state": "Maharashtra"},
    "bengaluru": {"lat": 12.9784, "lng": 77.5913, "name": "Bengaluru (Karnataka)", "state": "Karnataka"},
    "bangalore": {"lat": 12.9784, "lng": 77.5913, "name": "Bengaluru (Karnataka)", "state": "Karnataka"},
    "chennai": {"lat": 13.0336, "lng": 80.2447, "name": "Chennai (Tamil Nadu)", "state": "Tamil Nadu"}
}


def geocode_location(text: Optional[str]) -> Optional[Dict[str, Any]]:
    """
    Resolves natural language location string or query to exact GPS coordinates & normalized place name.
    Handles specific sub-localities (e.g., Begumpur, Rohini, Pitampura) as well as major districts & states.
    """
    if not text:
        return None

    cleaned = str(text).lower().strip()
    # Normalize Hindi/English terms
    cleaned = re.sub(r"[^\w\s\u0900-\u097F]", " ", cleaned)

    # 1. Exact or substring match in priority order (longer names first)
    sorted_keys = sorted(GEOCODED_LOCATIONS.keys(), key=lambda k: len(k), reverse=True)
    for key in sorted_keys:
        if re.search(rf"\b{re.escape(key)}\b", cleaned):
            info = GEOCODED_LOCATIONS[key].copy()
            info["key"] = key
            return info

    # 2. Hindi equivalents match
    hindi_map = {
        "बेगमपुर": "begumpur",
        "रोहिणी": "rohini",
        "पीतमपुरा": "pitampura",
        "दिल्ली": "delhi",
        "नई दिल्ली": "new delhi",
        "कुरुक्षेत्र": "kurukshetra",
        "करनाल": "karnal",
        "अंबाला": "ambala",
        "पानीपत": "panipat",
        "पंचकूला": "panchkula",
        "रोहतक": "rohtak",
        "हिसार": "hisar",
        "सोनीपत": "sonipat",
        "गुड़गांव": "gurugram",
        "गुरुग्राम": "gurugram",
        "नोएडा": "noida",
        "लखनऊ": "lucknow",
        "आगरा": "agra",
        "चंडीगढ़": "chandigarh",
        "लुधियाना": "ludhiana",
        "जयपुर": "jaipur",
        "मुंबई": "mumbai",
        "पुणे": "pune",
        "बेंगलुरु": "bengaluru",
        "चेन्नई": "chennai"
    }
    for h_word, eng_key in hindi_map.items():
        if h_word in text:
            info = GEOCODED_LOCATIONS[eng_key].copy()
            info["key"] = eng_key
            return info

    return None


def calculate_haversine_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """
    Computes Great-Circle distance between two points on Earth in Kilometers using Haversine formula.
    """
    earth_radius_km = 6371.0

    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)

    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1))
        * math.cos(math.radians(lat2))
        * math.sin(dlon / 2) ** 2
    )

    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return earth_radius_km * c


# =====================================================
# IN-MEMORY PARTNER VECTOR STORE & TF-IDF ENGINE
# =====================================================

class PartnerVectorStore:
    """
    Lightweight, deterministic semantic vector store for NSFDC Channel Partner entities.
    Indexes names, descriptions, locations, schemes, and special services in Hindi and English.
    """
    def __init__(self):
        self.partners: List[Dict[str, Any]] = []
        self.vocab: Dict[str, int] = {}
        self.doc_vectors: List[Dict[int, float]] = []
        self.idf: Dict[int, float] = {}
        self._build_index()

    def _tokenize(self, text: str) -> List[str]:
        """Tokenize English, Hindi (Devanagari), and alphanumeric tokens."""
        if not text:
            return []
        cleaned = re.sub(r"[^\w\s\u0900-\u097F]", " ", str(text).lower())
        tokens = [t for t in cleaned.split() if len(t) > 1]
        return tokens

    def _build_index(self, custom_partners: Optional[List[Dict[str, Any]]] = None):
        if custom_partners:
            partners = custom_partners
        else:
            try:
                db_partners = get_all_stored_partners()
                partners = db_partners if db_partners else get_all_channel_partners_kb()
            except Exception:
                partners = get_all_channel_partners_kb()

        # Ensure dynamic coordinates are resolved for all loaded partners
        for p in partners:
            if not p.get("latitude") or not p.get("longitude") or p.get("latitude") == 0.0:
                lat, lng, formatted_addr = resolve_partner_geocoding(p)
                p["latitude"] = float(lat)
                p["longitude"] = float(lng)
                if formatted_addr and not p.get("address"):
                    p["address"] = formatted_addr

        self.partners = partners
        num_docs = len(partners)

        doc_tokens_list = []
        df: Dict[str, int] = {}

        for p in partners:
            schemes_str = " ".join(p.get("schemes", []))
            loan_types_str = " ".join(p.get("loan_types", []))
            services_str = " ".join(p.get("special_services", []))
            keywords_str = " ".join(p.get("keywords", []))

            full_text = f"""
            {p.get('name', '')}
            {p.get('name_hi', '')}
            {p.get('type', '')}
            {p.get('type_label', '')}
            {p.get('state', '')}
            {p.get('district', '')}
            {p.get('city', '')}
            {p.get('address', '')}
            {p.get('address_hi', '')}
            {schemes_str}
            {loan_types_str}
            {services_str}
            {keywords_str}
            """
            tokens = self._tokenize(full_text)
            doc_tokens_list.append(tokens)

            unique_tokens = set(tokens)
            for token in unique_tokens:
                df[token] = df.get(token, 0) + 1

        self.vocab = {token: idx for idx, token in enumerate(df.keys())}
        for token, count in df.items():
            token_idx = self.vocab[token]
            self.idf[token_idx] = math.log((num_docs + 1) / (count + 1)) + 1.0

        self.doc_vectors = []
        for tokens in doc_tokens_list:
            vec: Dict[int, float] = {}
            total = len(tokens)
            if total == 0:
                self.doc_vectors.append(vec)
                continue

            tf: Dict[int, int] = {}
            for t in tokens:
                if t in self.vocab:
                    idx = self.vocab[t]
                    tf[idx] = tf.get(idx, 0) + 1

            norm_sq = 0.0
            for idx, count in tf.items():
                val = (count / total) * self.idf.get(idx, 1.0)
                vec[idx] = val
                norm_sq += val * val

            norm = math.sqrt(norm_sq) or 1.0
            for idx in vec:
                vec[idx] /= norm

            self.doc_vectors.append(vec)

    def query_similarity(self, query_text: str) -> List[float]:
        """Calculates cosine similarity scores for a given query text against all partners."""
        tokens = self._tokenize(query_text)
        if not tokens:
            return [0.0] * len(self.partners)

        tf: Dict[int, int] = {}
        for t in tokens:
            if t in self.vocab:
                idx = self.vocab[t]
                tf[idx] = tf.get(idx, 0) + 1

        if not tf:
            return [0.0] * len(self.partners)

        q_vec: Dict[int, float] = {}
        total = len(tokens)
        norm_sq = 0.0
        for idx, count in tf.items():
            val = (count / total) * self.idf.get(idx, 1.0)
            q_vec[idx] = val
            norm_sq += val * val

        norm = math.sqrt(norm_sq) or 1.0
        for idx in q_vec:
            q_vec[idx] /= norm

        scores = []
        for d_vec in self.doc_vectors:
            score = sum(val * d_vec.get(idx, 0.0) for idx, val in q_vec.items())
            scores.append(score)

        return scores

    def reload_partners_index(self, custom_partners: Optional[List[Dict[str, Any]]] = None):
        """Hot-reloads vector index with newly crawled partners without restarting server."""
        self._build_index(custom_partners)
        print(f"[RAG] Partners Vector Store re-indexed with {len(self.partners)} partners.")


# Global vector store instance
PARTNER_VECTOR_STORE = PartnerVectorStore()


# =====================================================
# HYBRID CHANNEL PARTNER RETRIEVER
# =====================================================

# =====================================================
# NPA CLASSIFICATION & UNDERWRITING HEALTH HELPER
# =====================================================

def classify_partner_npa(partner: Dict[str, Any]) -> Dict[str, Any]:
    """
    Classifies a channel partner based on Recovery Rate and NPA (Non-Performing Asset) metrics.
    Categorizes into Tier-1 (Low NPA / Top Performing), Tier-2 (Standard NPA), or Tier-3 (Moderate NPA).
    """
    recovery_pct = float(partner.get("recovery_rate_pct") or 95.0)
    npa_pct = float(partner.get("npa_rate_pct") or 2.0)

    if npa_pct <= 1.5:
        npa_status = "Very Low NPA"
        npa_status_hi = "अति अल्प एनपीए (शीर्ष प्रदर्शन)"
        tier = "Tier-1 (Top Performing)"
        badge_class = "low-npa"
        grade = "A+ (Excellent)"
    elif npa_pct <= 3.0:
        npa_status = "Low NPA"
        npa_status_hi = "अल्प एनपीए (उत्कृष्ट)"
        tier = "Tier-1 (Low NPA)"
        badge_class = "low-npa"
        grade = "A (Low Risk)"
    elif npa_pct <= 6.0:
        npa_status = "Standard NPA"
        npa_status_hi = "मानक एनपीए"
        tier = "Tier-2 (Standard NPA)"
        badge_class = "standard-npa"
        grade = "B (Standard)"
    else:
        npa_status = "Moderate NPA"
        npa_status_hi = "मध्यम एनपीए"
        tier = "Tier-3 (Moderate NPA)"
        badge_class = "moderate-npa"
        grade = "C (Moderate Risk)"

    badge = partner.get("performance_badge") or (
        f"🟢 {npa_status} ({npa_pct}%) • Recovery ({recovery_pct}%)"
        if npa_pct <= 3.0 else f"🔵 {npa_status} ({npa_pct}%) • Recovery ({recovery_pct}%)"
    )

    return {
        "recovery_rate_pct": round(recovery_pct, 1),
        "npa_rate_pct": round(npa_pct, 1),
        "npa_status": partner.get("npa_status") or npa_status,
        "npa_status_hi": partner.get("npa_status_hi") or npa_status_hi,
        "npa_tier": partner.get("npa_tier") or tier,
        "npa_badge_class": badge_class,
        "underwriting_grade": grade,
        "performance_badge": badge,
        "recovery_rating": float(partner.get("recovery_rating") or 4.8)
    }


# =====================================================
# HYBRID CHANNEL PARTNER RETRIEVER & MULTI-FACTOR RANKER
# =====================================================

def retrieve_channel_partners(
    query: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    loan_type: Optional[str] = None,
    scheme_id: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    partner_type: Optional[str] = None,
    npa_filter: Optional[str] = None,
    min_recovery_rate: Optional[float] = None,
    sort_by: Optional[str] = "recommended",
    radius_km: Optional[float] = None,
    top_k: int = 6
) -> List[Dict[str, Any]]:
    """
    Multi-Factor Hybrid Retriever & Ranker for Official NSFDC Channel Partners.
    Classifies and ranks nearest channel partners based on:
    1. Distance Proximity from user (Haversine formula).
    2. Low NPA Status & NPA Rate % (Lower NPA prioritized for faster loan processing).
    3. Recovery Rate Percentage (Higher recovery indicates high reliability).
    4. Scheme Authorization and Agency Hierarchy (SCA Nodal Agency boost).
    5. Multi-lingual Semantic RAG query similarity.
    """
    # 0. Automatic Geocoding if coordinates not provided
    clean_query = (query or "").strip()
    if not (latitude is not None and longitude is not None):
        geo_match = geocode_location(city) or geocode_location(clean_query) or geocode_location(state)
        if geo_match:
            latitude = geo_match["lat"]
            longitude = geo_match["lng"]
            if not state or state.lower() in ["all", "सभी"]:
                state = geo_match.get("state")

    partners = PARTNER_VECTOR_STORE.partners or get_all_channel_partners_kb()
    has_coords = (latitude is not None and longitude is not None)

    sim_scores = PARTNER_VECTOR_STORE.query_similarity(clean_query) if clean_query else [0.0] * len(partners)

    results = []

    for idx, partner in enumerate(partners):
        classification = classify_partner_npa(partner)
        recovery_pct = classification["recovery_rate_pct"]
        npa_pct = classification["npa_rate_pct"]

        # 1. Partner Type filter
        if partner_type and partner_type.upper() != "ALL":
            if partner.get("type", "").upper() != partner_type.upper():
                continue

        # 2. Loan Type filter
        if loan_type:
            lt_clean = loan_type.lower()
            if lt_clean in ["business", "व्यवसाय", "दुकान"] and "business" not in partner.get("loan_types", []):
                continue
            if lt_clean in ["education", "शिक्षा", "पढ़ाई"] and "education" not in partner.get("loan_types", []):
                continue

        # 3. State filter
        if state and state.lower() not in ["all", "सभी"]:
            if partner.get("state", "").lower() != state.lower():
                continue

        # 4. NPA Status filter
        if npa_filter and npa_filter.upper() != "ALL":
            npa_filter_clean = npa_filter.upper()
            if npa_filter_clean in ["LOW", "LOW_NPA", "LOW-NPA", "TIER1", "TIER-1"]:
                if npa_pct > 3.0:
                    continue
            elif npa_filter_clean in ["STANDARD", "STANDARD_NPA", "TIER2", "TIER-2"]:
                if npa_pct > 6.0:
                    continue

        # 5. Minimum Recovery Rate filter
        if min_recovery_rate is not None:
            if recovery_pct < min_recovery_rate:
                continue

        # Calculate geospatial distance
        distance_km = None
        if has_coords:
            distance_km = calculate_haversine_distance(
                latitude,
                longitude,
                partner["latitude"],
                partner["longitude"]
            )
            if radius_km and distance_km > radius_km:
                continue

        # Base hybrid composite score calculation (0 - 100 scale)
        score = 25.0

        # A. Distance Proximity Score (up to 35 pts, strongly weighting local proximity)
        if distance_km is not None:
            dist_score = max(0.0, 35.0 - (distance_km * 0.55))
            score += dist_score

        # B. Low NPA Performance Bonus (up to 25 pts)
        if npa_pct <= 1.0:
            npa_score = 25.0
        elif npa_pct <= 2.0:
            npa_score = 22.0
        elif npa_pct <= 3.0:
            npa_score = 18.0
        elif npa_pct <= 5.0:
            npa_score = 12.0
        elif npa_pct <= 8.0:
            npa_score = 5.0
        else:
            npa_score = -5.0
        score += npa_score

        # C. Recovery Rate Performance Bonus (up to 20 pts)
        if recovery_pct >= 98.0:
            rec_score = 20.0
        elif recovery_pct >= 95.0:
            rec_score = 16.0
        elif recovery_pct >= 90.0:
            rec_score = 11.0
        elif recovery_pct >= 85.0:
            rec_score = 5.0
        else:
            rec_score = 0.0
        score += rec_score

        # D. Vector semantic similarity score (up to 15 pts)
        sim_score = sim_scores[idx] if idx < len(sim_scores) else 0.0
        score += min(sim_score * 50.0, 15.0)

        # E. Scheme specific authorization bonus
        if scheme_id:
            if scheme_id in partner.get("schemes", []):
                score += 15.0
            else:
                score -= 10.0

        # F. SCA Nodal Agency Priority bonus
        if partner.get("type") == "SCA":
            score += 5.0

        entry = partner.copy()
        entry.update(classification)

        if distance_km is not None:
            entry["distance_km"] = round(distance_km, 2)
        else:
            entry["distance_km"] = None

        entry["rag_score"] = round(score, 2)
        entry["vector_similarity"] = round(sim_score, 4)

        # Generate Google Maps directions URL & Maps Search URL with exact destination place query
        p_lat = partner.get('latitude')
        p_lng = partner.get('longitude')
        p_name = partner.get('name', '')
        p_addr = partner.get('address', partner.get('city', ''))
        
        # Build canonical search & destination string
        dest_query = urllib.parse.quote_plus(f"{p_name}, {p_addr}")
        
        if has_coords:
            entry["directions_url"] = (
                f"https://www.google.com/maps/dir/?api=1&origin={latitude},{longitude}&destination={dest_query}&travelmode=driving"
            )
        else:
            entry["directions_url"] = (
                f"https://www.google.com/maps/dir/?api=1&destination={dest_query}&travelmode=driving"
            )

        entry["google_maps_url"] = f"https://www.google.com/maps/search/?api=1&query={dest_query}"

        results.append(entry)

    # Sorting options:
    sort_mode = (sort_by or "recommended").lower()

    if sort_mode in ["distance", "nearest"]:
        # Sort primarily by distance ascending, then by lowest NPA
        results.sort(key=lambda x: (
            x.get("distance_km") if x.get("distance_km") is not None else 999999,
            x.get("npa_rate_pct", 99.0),
            -x.get("recovery_rate_pct", 0.0)
        ))
    elif sort_mode in ["low_npa", "lowest_npa", "npa"]:
        # Sort primarily by lowest NPA rate, then highest recovery, then nearest distance
        results.sort(key=lambda x: (
            x.get("npa_rate_pct", 99.0),
            -x.get("recovery_rate_pct", 0.0),
            x.get("distance_km") if x.get("distance_km") is not None else 999999
        ))
    elif sort_mode in ["recovery_rate", "highest_recovery", "recovery"]:
        # Sort primarily by highest recovery rate, then lowest NPA, then nearest distance
        results.sort(key=lambda x: (
            -x.get("recovery_rate_pct", 0.0),
            x.get("npa_rate_pct", 99.0),
            x.get("distance_km") if x.get("distance_km") is not None else 999999
        ))
    else:
        # Default "recommended": Multi-factor composite ranking balancing distance + low NPA + recovery rate
        if has_coords:
            results.sort(key=lambda x: (
                x.get("distance_km") if x.get("distance_km") is not None else 999999,
                -x.get("rag_score", 0.0)
            ))
        else:
            results.sort(key=lambda x: -x["rag_score"])

    return results[:top_k]


# =====================================================
# RAG CONTEXT FORMATTER FOR LLM PROMPTS
# =====================================================

def build_rag_partner_context(partners: List[Dict[str, Any]]) -> str:
    """Formats retrieved channel partner data with NPA & Recovery metrics into structured context for LLM prompt."""
    if not partners:
        return "No specific channel partner found in this vicinity."

    blocks = []
    for rank, p in enumerate(partners, 1):
        dist_info = f"{p['distance_km']} km away" if p.get("distance_km") is not None else "Location matched"
        schemes_str = ", ".join(p.get("schemes", []))
        services_str = "; ".join(p.get("special_services", []))
        recovery_pct = p.get("recovery_rate_pct", 95.0)
        npa_pct = p.get("npa_rate_pct", 2.0)
        npa_status = p.get("npa_status", "Low NPA")
        perf_badge = p.get("performance_badge", "Low NPA Verified")

        block = f"""
[OFFICIAL CHANNEL PARTNER #{rank} — {p.get('npa_tier', 'Tier-1')}]
Name: {p.get('name')} ({p.get('name_hi')})
Agency Type: {p.get('type_label')} ({p.get('type')})
Location: {p.get('city')}, {p.get('state')} (PIN: {p.get('pincode')})
Distance from user: {dist_info}
Official Address: {p.get('address')}
Nodal Officer: {p.get('nodal_officer')}
Contact Phone: {p.get('phone')} | Helpline: {p.get('helpline')}
Email: {p.get('email')}
Working Hours: {p.get('working_hours')}
Credit Health & NPA Status: {npa_status} (NPA: {npa_pct}%, Recovery Rate: {recovery_pct}%)
Performance Rating: {perf_badge} (Grade: {p.get('underwriting_grade', 'A+')})
Authorized Schemes: {schemes_str}
Special Services & Facilities: {services_str}
Directions Link: {p.get('directions_url')}
"""
        blocks.append(block.strip())

    return "\n\n".join(blocks)

