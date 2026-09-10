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
    latitude: float,
    longitude: float,
    loan_type: Optional[str] = None,
    scheme_id: Optional[str] = None,
    partner_type: Optional[str] = None,
    query: Optional[str] = None,
    top_k: int = 10
) -> List[Dict[str, Any]]:
    """
    Finds and ranks official NSFDC channel partners suitable for the applicant,
    combining geospatial proximity, scheme authorization, and semantic RAG matching.
    """
    return retrieve_channel_partners(
        query=query,
        latitude=latitude,
        longitude=longitude,
        loan_type=loan_type,
        scheme_id=scheme_id,
        partner_type=partner_type,
        top_k=top_k
    )