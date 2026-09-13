"""
Geospatial Partner Router for NSFDC Channel Partners.
Calculates Haversine distance and routes users to the nearest State Channelising Agency (SCA), PSB, or RRB.
"""

from math import radians, sin, cos, sqrt, atan2
from typing import List, Dict, Any, Optional

from data.partners import get_all_partners
from services.partner_rag_service import (
    calculate_haversine_distance,
    retrieve_channel_partners
)


def calculate_distance(
    lat1: float,
    lon1: float,
    lat2: float,
    lon2: float
) -> float:
    """Haversine distance helper function."""
    return calculate_haversine_distance(lat1, lon1, lat2, lon2)


def find_suitable_partners(
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    loan_type: Optional[str] = None,
    scheme_id: Optional[str] = None,
    state: Optional[str] = None,
    city: Optional[str] = None,
    partner_type: Optional[str] = None,
    query: Optional[str] = None,
    npa_filter: Optional[str] = None,
    min_recovery_rate: Optional[float] = None,
    sort_by: Optional[str] = "recommended",
    radius_km: Optional[float] = None,
    top_k: int = 10
) -> List[Dict[str, Any]]:
    """
    Finds and ranks official NSFDC channel partners suitable for the applicant,
    combining geospatial proximity, Low NPA status, recovery rates, scheme authorization, and semantic RAG matching.
    """
    return retrieve_channel_partners(
        query=query,
        latitude=latitude,
        longitude=longitude,
        loan_type=loan_type,
        scheme_id=scheme_id,
        state=state,
        city=city,
        partner_type=partner_type,
        npa_filter=npa_filter,
        min_recovery_rate=min_recovery_rate,
        sort_by=sort_by,
        radius_km=radius_km,
        top_k=top_k
    )