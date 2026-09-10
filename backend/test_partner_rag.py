"""
Verification test for NSFDC Channel Partner RAG Model and Geolocation Router.
"""
import sys
import os

# Set python path
sys.path.insert(0, os.path.dirname(__file__))

from data.nsfdc_partners_kb import get_all_channel_partners_kb
from services.partner_rag_service import (
    retrieve_channel_partners,
    calculate_haversine_distance,
    build_rag_partner_context
)

def test_partner_kb():
    partners = get_all_channel_partners_kb()
    print(f"[OK] Total Official NSFDC Channel Partners Loaded: {len(partners)}")
    assert len(partners) >= 10, "Expected at least 10 partners in the knowledge base"
    for p in partners:
        assert "name" in p and "latitude" in p and "longitude" in p and "type" in p
        assert len(p["schemes"]) > 0
    print("[OK] Partner KB schema validation passed.")

def test_haversine_distance():
    # Kurukshetra to Karnal (~35 km)
    dist = calculate_haversine_distance(29.9695, 76.8783, 29.6857, 76.9905)
    print(f"[OK] Kurukshetra to Karnal Haversine Distance: {dist:.2f} km")
    assert 30 <= dist <= 45, f"Unexpected distance: {dist}"

def test_partner_rag_retrieval():
    # 1. Proximity from Kurukshetra
    nearest_k = retrieve_channel_partners(latitude=29.9695, longitude=76.8783, top_k=3)
    print(f"[OK] Nearest to Kurukshetra: {nearest_k[0]['name']} ({nearest_k[0]['distance_km']} km)")
    assert nearest_k[0]["city"] == "Kurukshetra"

    # 2. Scheme-specific search
    mahila_partners = retrieve_channel_partners(scheme_id="mahila_samriddhi_yojana", latitude=29.9695, longitude=76.8783, top_k=3)
    print(f"[OK] Mahila Samriddhi Partners found: {len(mahila_partners)}")
    assert len(mahila_partners) > 0

    # 3. Natural language semantic query
    query_results = retrieve_channel_partners(query="हरियाणा में महिला समृद्धि योजना स्टेट ऑफिस", top_k=2)
    print(f"[OK] Semantic Query Top Hit: {query_results[0]['name']} (Score: {query_results[0]['rag_score']})")
    assert "Haryana" in query_results[0]["state"] or "HSCFDC" in query_results[0]["name"]

    # 4. Context formatting
    context = build_rag_partner_context(nearest_k[:2])
    print("[OK] RAG Partner Context Formatted Successfully (Length: ", len(context), ")")
    assert "OFFICIAL CHANNEL PARTNER" in context

if __name__ == "__main__":
    print("--- RUNNING NSFDC CHANNEL PARTNER RAG TESTS ---")
    test_partner_kb()
    test_haversine_distance()
    test_partner_rag_retrieval()
    print("--- ALL TESTS PASSED SUCCESSFULLY! ---")
