"""
Comprehensive End-to-End System Test for NSFDC Channel Partner RAG Model & Locator
"""
import sys
import os

sys.path.insert(0, os.path.dirname(__file__))
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json()["status"] == "healthy"
    print("[PASS] Health check")

def test_partner_all():
    res = client.get("/api/partners/all")
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert data["count"] >= 10
    print(f"[PASS] /api/partners/all returned {data['count']} partners")

def test_partner_states():
    res = client.get("/api/partners/states")
    assert res.status_code == 200
    data = res.json()
    assert "Haryana" in data["states"]
    assert "SCA" in data["types"]
    print(f"[PASS] /api/partners/states returned states: {data['states']}")

def test_find_partners_geospatial():
    # Kurukshetra coords
    res = client.post("/api/find-partners", json={
        "latitude": 29.9695,
        "longitude": 76.8783,
        "loan_type": "business"
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["partners"]) > 0
    nearest = data["partners"][0]
    print(f"[PASS] /api/find-partners from Kurukshetra: Nearest is '{nearest['name']}' at {nearest['distance_km']} km")
    assert nearest["distance_km"] < 5.0

def test_partner_rag_search():
    # Semantic natural language query in Hindi
    res = client.post("/api/partners/rag-search", json={
        "query": "कुरुक्षेत्र में महिला समृद्धि योजना के लिए ऑफिस",
        "latitude": 29.9695,
        "longitude": 76.8783
    })
    assert res.status_code == 200
    data = res.json()
    assert data["success"] is True
    assert len(data["partners"]) > 0
    top_hit = data["partners"][0]
    print(f"[PASS] /api/partners/rag-search top hit: '{top_hit['name']}' (Score: {top_hit.get('rag_score')})")

def test_loan_agent_chat_with_partner_query():
    # Start session
    session_res = client.post("/api/ai/new-session")
    assert session_res.status_code == 200
    session_id = session_res.json()["session_id"]

    # Chat with user asking where to submit
    chat_res = client.post("/api/ai/loan-chat", json={
        "session_id": session_id,
        "message": "मुझे कुरुक्षेत्र में सिलाई की दुकान के लिए 2 लाख का लोन चाहिए। मेरा नजदीकी ऑफिस कहाँ है?"
    })
    assert chat_res.status_code == 200
    chat_data = chat_res.json()
    assert chat_data["success"] is True
    print(f"[PASS] AI Loan Agent response preview: {chat_data['message'][:120]}...")
    assert len(chat_data["message"]) > 20

if __name__ == "__main__":
    print("--- RUNNING FULL SYSTEM E2E VERIFICATION ---")
    test_health()
    test_partner_all()
    test_partner_states()
    test_find_partners_geospatial()
    test_partner_rag_search()
    test_loan_agent_chat_with_partner_query()
    print("--- ALL SYSTEM TESTS PASSED SUCCESSFULLY! ---")
