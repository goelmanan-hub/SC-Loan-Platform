"""
Verification Test for Opt-In Loan Readiness Flow & Non-Assumed Criteria Evaluation
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from main import app
from services.readiness import calculate_loan_readiness
from services.partner_rag_service import geocode_location, retrieve_channel_partners

client = TestClient(app)

def test_unassumed_readiness_zero_defaults():
    print("\n--- Test 1: Zero Self-Assumptions for Unprovided Credit & Location ---")
    user_data = {
        "loan_type": "business",
        "loan_required": 200000,
        "income": 300000,
        "caste_status": "sc_certified",
        "docs_status": "all_ready"
        # Notice: credit_history and location are completely absent
    }
    res = calculate_loan_readiness(user_data)
    pillars = res["pillars"]
    
    print(f"Credit Profile Score (No data provided): {pillars['credit_profile']['score']} / {pillars['credit_profile']['max']}")
    assert pillars["credit_profile"]["score"] == 0, f"Expected 0, got {pillars['credit_profile']['score']}"
    assert "असत्यापित" in pillars["credit_profile"]["details"]
    
    print(f"Accessibility Score (No location provided): {pillars['accessibility']['score']} / {pillars['accessibility']['max']}")
    assert pillars["accessibility"]["score"] == 0, f"Expected 0, got {pillars['accessibility']['score']}"
    assert "अनुपलब्ध" in pillars["accessibility"]["details"]
    print("[PASS] Verified zero-assumptions when data is unprovided.")

def test_verified_credit_and_distance_scoring():
    print("\n--- Test 2: Verified Credit History & Real Geocoded Distance Scoring ---")
    # Begumpur Delhi
    geo = geocode_location("Begumpur Delhi")
    assert geo is not None
    partners = retrieve_channel_partners(query="Begumpur Delhi", latitude=geo["lat"], longitude=geo["lng"], top_k=1)
    assert len(partners) > 0
    nearest = partners[0]
    distance = nearest["distance_km"]
    print(f"Nearest partner to Begumpur Delhi: {nearest['name']} ({distance:.2f} km)")
    assert distance < 10.0, f"Expected < 10 km, got {distance}"

    user_data = {
        "loan_type": "business",
        "loan_required": 200000,
        "income": 300000,
        "caste_status": "sc_certified",
        "docs_status": "all_ready",
        "credit_history": "clean",
        "location": "Begumpur Delhi",
        "latitude": geo["lat"],
        "longitude": geo["lng"]
    }
    res = calculate_loan_readiness(user_data, nearest_partner_distance_km=distance)
    pillars = res["pillars"]

    print(f"Verified Credit Score: {pillars['credit_profile']['score']}/10 -> {pillars['credit_profile']['details']}")
    assert pillars["credit_profile"]["score"] == 10

    print(f"Verified Accessibility Score: {pillars['accessibility']['score']}/10 -> {pillars['accessibility']['details']}")
    assert pillars["accessibility"]["score"] == 10
    assert "उत्कृष्ट निकटता" in pillars["accessibility"]["details"]
    print(f"Overall Verified Readiness Score: {res['score']}/100 ({res['badge']})")
    print("[PASS] Verified dynamic distance and credit scoring.")

def test_two_phase_chat_optin_flow():
    print("\n--- Test 3: Two-Phase Chat Flow (Phase 1: Scheme Only -> Phase 2: Readiness Opt-In) ---")
    # 1. Start session
    session_res = client.post("/api/ai/new-session")
    assert session_res.status_code == 200
    session_id = session_res.json()["session_id"]

    # 2. Phase 1: User gives loan requirements
    chat_turn_1 = client.post("/api/ai/loan-chat", json={
        "session_id": session_id,
        "message": "मुझे सिलाई की दुकान के लिए 2 लाख का लोन चाहिए, मेरी सालाना आय 3 लाख है।"
    })
    assert chat_turn_1.status_code == 200
    d1 = chat_turn_1.json()
    print("Turn 1 - Scheme recommended:", d1["recommendation"]["recommended_scheme"]["name"])
    print("Turn 1 - Readiness Score presence (should be None before opt-in):", d1.get("readiness"))
    assert d1.get("readiness") is None, "Readiness score must NOT be generated before user opts in!"
    assert ("ऋण तैयारी स्कोर" in d1["message"] or "Readiness" in d1["message"] or "Score" in d1["message"])
    print("[PASS] Phase 1 correctly presented scheme and asked user about Loan Readiness Score.")

    # 3. Phase 2: User opts in with credit history & location
    chat_turn_2 = client.post("/api/ai/loan-chat", json={
        "session_id": session_id,
        "message": "हाँ मुझे ऋण तैयारी स्कोर जानना है। मेरा क्रेडिट रिकॉर्ड बिल्कुल साफ़ है और मेरी वर्तमान लोकेशन बेगमपुर दिल्ली है।"
    })
    assert chat_turn_2.status_code == 200
    d2 = chat_turn_2.json()
    print("Turn 2 - AI message snippet:", d2["message"][:150])
    print("Turn 2 - Readiness Score generated:", d2.get("readiness") is not None)
    assert d2.get("readiness") is not None, "Readiness score MUST be generated after user provides verified details!"
    r = d2["readiness"]
    print(f"Turn 2 - Readiness Score: {r['score']}/100, Pillar 4: {r['pillars']['credit_profile']['score']}/10, Pillar 5: {r['pillars']['accessibility']['score']}/10")
    assert r['pillars']['credit_profile']['score'] == 10
    assert r['pillars']['accessibility']['score'] == 10
    print("[PASS] Phase 2 successfully evaluated readiness with verified distance and credit data.")

if __name__ == "__main__":
    test_unassumed_readiness_zero_defaults()
    test_verified_credit_and_distance_scoring()
    test_two_phase_chat_optin_flow()
    print("\n==========================================")
    print("ALL READINESS OPT-IN & DISTANCE TESTS PASSED!")
    print("==========================================")
