"""
RAG (Retrieval-Augmented Generation) & Semantic Geolocation Service for Official NSFDC Channel Partners.
Provides hybrid retrieval combining TF-IDF vector search, Haversine geospatial proximity,
scheme eligibility constraints, and multi-lingual query understanding.
"""

import math
import re
from typing import List, Dict, Any, Optional
from data.nsfdc_partners_kb import get_all_channel_partners_kb, get_channel_partner_by_id_kb
from database.db import get_all_stored_partners


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

def retrieve_channel_partners(
    query: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    loan_type: Optional[str] = None,
    scheme_id: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    partner_type: Optional[str] = None,
    radius_km: Optional[float] = None,
    top_k: int = 6
) -> List[Dict[str, Any]]:
    """
    Hybrid retriever for official NSFDC Channel Partners.
    1. Evaluates geospatial proximity (Haversine distance) if coordinates are provided.
    2. Applies hard constraint filters (loan_type, scheme_id, state, partner_type).
    3. Computes semantic TF-IDF vector similarity for natural language queries.
    4. Applies domain boosting for primary SCAs and lead district banks.
    """
    # 0. Automatic Geocoding if coordinates not provided
    clean_query = (query or "").strip()
    if not (latitude is not None and longitude is not None):
        # Try geocoding city, query, or state
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

        # 4. City / District filter
        if city and city.lower() not in ["all", "सभी"]:
            p_city = partner.get("city", "").lower()
            p_dist = partner.get("district", "").lower()
            if city.lower() not in p_city and city.lower() not in p_dist:
                pass

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

        # Base hybrid score calculation
        score = 50.0

        # Vector semantic similarity score (scaled 0-40)
        sim_score = sim_scores[idx] if idx < len(sim_scores) else 0.0
        score += min(sim_score * 80.0, 40.0)

        # Distance score bonus (closer partners receive higher score)
        if distance_km is not None:
            # Score bonus for proximity: up to +35 for < 10km, decaying with distance
            dist_bonus = max(0.0, 35.0 - (distance_km * 0.18))
            score += dist_bonus

        # Scheme specific authorization bonus
        if scheme_id:
            if scheme_id in partner.get("schemes", []):
                score += 20.0
            else:
                score -= 15.0

        # SCA Priority bonus (SCAs are the principal nodal agency for NSFDC)
        if partner.get("type") == "SCA":
            score += 10.0

        entry = partner.copy()
        if distance_km is not None:
            entry["distance_km"] = round(distance_km, 2)
        else:
            entry["distance_km"] = None

        entry["rag_score"] = round(score, 2)
        entry["vector_similarity"] = round(sim_score, 4)

        # Generate Google Maps directions URL
        entry["directions_url"] = (
            f"https://www.google.com/maps/dir/?api=1&destination={partner['latitude']},{partner['longitude']}"
        )

        results.append(entry)

    # Sorting priority:
    # If coords available (either explicit or geocoded): sort primarily by distance ascending when searching local offices
    if has_coords:
        # Sort by distance primarily (with slight weight to RAG score for authorized schemes)
        results.sort(key=lambda x: (x.get("distance_km") if x.get("distance_km") is not None else 999999, -x["rag_score"]))
    elif clean_query:
        results.sort(key=lambda x: x["rag_score"], reverse=True)
    else:
        results.sort(key=lambda x: x["rag_score"], reverse=True)

    return results[:top_k]


# =====================================================
# RAG CONTEXT FORMATTER FOR LLM PROMPTS
# =====================================================

def build_rag_partner_context(partners: List[Dict[str, Any]]) -> str:
    """Formats retrieved channel partner data into structured context for LLM prompt."""
    if not partners:
        return "No specific channel partner found in this vicinity."

    blocks = []
    for rank, p in enumerate(partners, 1):
        dist_info = f"{p['distance_km']} km away" if p.get("distance_km") is not None else "Location matched"
        schemes_str = ", ".join(p.get("schemes", []))
        services_str = "; ".join(p.get("special_services", []))

        block = f"""
[OFFICIAL CHANNEL PARTNER #{rank}]
Name: {p.get('name')} ({p.get('name_hi')})
Agency Type: {p.get('type_label')} ({p.get('type')})
Location: {p.get('city')}, {p.get('state')} (PIN: {p.get('pincode')})
Distance from user: {dist_info}
Official Address: {p.get('address')}
Nodal Officer: {p.get('nodal_officer')}
Contact Phone: {p.get('phone')} | Helpline: {p.get('helpline')}
Email: {p.get('email')}
Working Hours: {p.get('working_hours')}
Authorized Schemes: {schemes_str}
Special Services & Facilities: {services_str}
Directions Link: {p.get('directions_url')}
"""
        blocks.append(block.strip())

    return "\n\n".join(blocks)
