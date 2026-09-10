"""
Channel Partner Data Access Layer.
Connects with the official NSFDC Channel Partner Knowledge Base (SCAs, PSBs, RRBs).
"""

from typing import List, Dict, Any, Optional
from data.nsfdc_partners_kb import NSFDC_CHANNEL_PARTNERS, get_all_channel_partners_kb, get_channel_partner_by_id_kb

# Maintain PARTNERS list for direct import compatibility
PARTNERS = NSFDC_CHANNEL_PARTNERS


def get_all_partners() -> List[Dict[str, Any]]:
    """Returns all channel partners."""
    return get_all_channel_partners_kb()


def get_partner_by_id(partner_id: str) -> Optional[Dict[str, Any]]:
    """Returns a specific channel partner by ID."""
    return get_channel_partner_by_id_kb(partner_id)