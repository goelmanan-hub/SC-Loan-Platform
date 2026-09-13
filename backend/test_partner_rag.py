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
        assert "name" in p and "type" in p and "address" in p
        assert len(p["schemes"]) > 0
        assert "recovery_rate_pct" in p, f"Missing recovery_rate_pct in {p['id']}"
        assert "npa_rate_pct" in p, f"Missing npa_rate_pct in {p['id']}"
        assert "npa_status" in p, f"Missing npa_status in {p['id']}"
        assert p["recovery_rate_pct"] > 0
        assert p["npa_rate_pct"] >= 0
    print("[OK] Partner KB schema validation with Recovery Rate & NPA Status passed.")

def test_haversine_distance():
    # Kurukshetra to Karnal (~35 km)
    dist = calculate_haversine_distance(29.9695, 76.8783, 29.6857, 76.9905)
    print(f"[OK] Kurukshetra to Karnal Haversine Distance: {dist:.2f} km")
    assert 30 <= dist <= 45, f"Unexpected distance: {dist}"

def test_partner_rag_retrieval():
    # 1. Proximity from Kurukshetra
    nearest_k = retrieve_channel_partners(latitude=29.9695, longitude=76.8783, top_k=3)
    print(f"[OK] Nearest to Kurukshetra: {nearest_k[0]['name']} ({nearest_k[0]['distance_km']} km, NPA: {nearest_k[0].get('npa_rate_pct')}%, Recovery: {nearest_k[0].get('recovery_rate_pct')}%)")
    assert nearest_k[0]["city"] == "Kurukshetra"
    assert "npa_status" in nearest_k[0]
    assert "recovery_rate_pct" in nearest_k[0]

    # 2. Scheme-specific search
    mahila_partners = retrieve_channel_partners(scheme_id="mahila_samriddhi_yojana", latitude=29.9695, longitude=76.8783, top_k=3)
    print(f"[OK] Mahila Samriddhi Partners found: {len(mahila_partners)}")
    assert len(mahila_partners) > 0

    # 3. Natural language semantic query
    query_results = retrieve_channel_partners(query="हरियाणा में महिला समृद्धि योजना स्टेट ऑफिस", top_k=2)
    print(f"[OK] Semantic Query Top Hit: {query_results[0]['name']} (Score: {query_results[0]['rag_score']})")
    assert "Haryana" in query_results[0]["state"] or "HSCFDC" in query_results[0]["name"]

    # 4. Context formatting with NPA metrics
    context = build_rag_partner_context(nearest_k[:2])
    print("[OK] RAG Partner Context Formatted Successfully (Length: ", len(context), ")")
    assert "OFFICIAL CHANNEL PARTNER" in context
    assert "NPA" in context
    assert "Recovery Rate" in context


def test_npa_filtering_and_ranking():
    # 1. Test Low NPA Filter (< 3.0% NPA)
    low_npa_results = retrieve_channel_partners(npa_filter="LOW_NPA", top_k=20)
    for p in low_npa_results:
        assert p["npa_rate_pct"] <= 3.0, f"Expected NPA <= 3.0, got {p['npa_rate_pct']} in {p['name']}"
    print(f"[OK] Low NPA Filter passed ({len(low_npa_results)} partners with NPA <= 3.0%)")

    # 2. Test Sorting by Lowest NPA
    sorted_by_npa = retrieve_channel_partners(sort_by="low_npa", top_k=5)
    npa_values = [p["npa_rate_pct"] for p in sorted_by_npa]
    assert npa_values == sorted(npa_values), f"Expected sorted NPA ascending: {npa_values}"
    print(f"[OK] Sorting by Lowest NPA passed: {npa_values}")

    # 3. Test Sorting by Highest Recovery Rate
    sorted_by_recovery = retrieve_channel_partners(sort_by="recovery_rate", top_k=5)
    rec_values = [p["recovery_rate_pct"] for p in sorted_by_recovery]
    assert rec_values == sorted(rec_values, reverse=True), f"Expected sorted Recovery descending: {rec_values}"
    print(f"[OK] Sorting by Highest Recovery Rate passed: {rec_values}")

    # 4. Test Multi-Factor Ranking Proximity from Kurukshetra
    recommended = retrieve_channel_partners(latitude=29.9695, longitude=76.8783, sort_by="recommended", top_k=3)
    print(f"[OK] Top Recommended Partner near Kurukshetra: {recommended[0]['name']} (Score: {recommended[0]['rag_score']})")
    assert recommended[0]["npa_rate_pct"] <= 3.0, "Top recommended partner should have Low NPA"


if __name__ == "__main__":
    print("--- RUNNING NSFDC CHANNEL PARTNER RAG & NPA TESTS ---")
    test_partner_kb()
    test_haversine_distance()
    test_partner_rag_retrieval()
    test_npa_filtering_and_ranking()
    print("--- ALL TESTS PASSED SUCCESSFULLY! ---")
