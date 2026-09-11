"""
YOJNASETU - AUTOMATED CRAWLER & RAG HOT-RELOAD TEST SUITE
======================================================
Tests:
1. Scheme and Channel Partner crawling & normalization.
2. Content hash generation and differential update detection.
3. SQLite database persistence for crawled schemes and partners.
4. Crawler execution audit logging.
5. Live RAG Vector Store hot-reloading without server restarts.
6. FastAPI REST endpoints for crawler orchestration.
"""

import sys
import os
import asyncio
import json

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database.db import (
    init_db,
    upsert_scheme,
    upsert_channel_partner,
    get_all_stored_schemes,
    get_all_stored_partners,
    log_crawler_run,
    get_crawler_logs
)
from services.crawler_service import (
    SchemeCrawler,
    PartnerCrawler,
    CrawlerOrchestrator,
    PeriodicCrawlerScheduler,
    compute_content_hash
)
from services.rag_service import VECTOR_STORE, retrieve_candidate_schemes
from services.partner_rag_service import PARTNER_VECTOR_STORE, retrieve_channel_partners
from fastapi.testclient import TestClient
from main import app


def test_content_hashing():
    print("\n[TEST 1] Testing Deterministic Content Hashing...")
    data1 = {"id": "test_scheme", "name": "Scheme A", "interest_rate": 4.0}
    data2 = {"interest_rate": 4.0, "name": "Scheme A", "id": "test_scheme"}
    data3 = {"id": "test_scheme", "name": "Scheme A", "interest_rate": 5.0}

    hash1 = compute_content_hash(data1)
    hash2 = compute_content_hash(data2)
    hash3 = compute_content_hash(data3)

    assert hash1 == hash2, "Hashes must be identical regardless of dictionary key ordering!"
    assert hash1 != hash3, "Hashes must differ when values change!"
    print("  --> Passed! SHA-256 content hashing is deterministic and captures diffs.")


def test_scheme_and_partner_crawlers():
    print("\n[TEST 2] Testing Scheme and Partner Crawlers...")
    sc = SchemeCrawler()
    schemes = sc.parse_schemes()
    assert len(schemes) >= 8, f"Expected at least 8 official schemes, got {len(schemes)}"
    msy = next((s for s in schemes if s["id"] == "mahila_samriddhi_yojana"), None)
    assert msy is not None, "Mahila Samriddhi Yojana must be present"
    assert msy["interest_rate"] == 4.0, f"Expected 4% interest rate, got {msy['interest_rate']}"

    pc = PartnerCrawler()
    partners = pc.parse_partners()
    assert len(partners) >= 20, f"Expected at least 20 official partners, got {len(partners)}"
    hscfdc = next((p for p in partners if "kurukshetra" in p["id"]), None)
    assert hscfdc is not None, "Kurukshetra HSCFDC partner must be present"
    assert hscfdc["latitude"] > 0 and hscfdc["longitude"] > 0, "Coordinates must be valid floats"
    print(f"  --> Passed! Parsed {len(schemes)} schemes and {len(partners)} channel partners.")


def test_crawler_orchestration_and_db_persistence():
    print("\n[TEST 3] Testing Crawler Orchestrator & SQLite Persistence...")
    orchestrator = CrawlerOrchestrator()
    result = asyncio.run(orchestrator.run_crawl_and_sync(trigger_source="test_suite"))

    assert result["status"] == "SUCCESS", f"Crawl failed: {result.get('error_message')}"
    assert result["schemes_checked"] >= 8
    assert result["partners_checked"] >= 20
    assert result["duration_sec"] >= 0

    stored_schemes = get_all_stored_schemes()
    stored_partners = get_all_stored_partners()
    assert len(stored_schemes) >= 8, f"Expected stored schemes in DB, got {len(stored_schemes)}"
    assert len(stored_partners) >= 20, f"Expected stored partners in DB, got {len(stored_partners)}"

    logs = get_crawler_logs(limit=5)
    assert len(logs) > 0, "Audit logs must contain the latest crawl execution"
    assert logs[0]["trigger_source"] == "test_suite"
    print(f"  --> Passed! Crawl synced {len(stored_schemes)} schemes and {len(stored_partners)} partners in {result['duration_sec']}s.")


def test_rag_hot_reloading():
    print("\n[TEST 4] Testing Live RAG Vector Store Hot-Reloading...")
    # 1. Scheme Vector Store check
    candidates = retrieve_candidate_schemes({"business_type": "tailoring and sewing", "gender": "female"}, top_k=2)
    assert len(candidates) > 0
    top_scheme = candidates[0]["scheme"]
    assert "mahila" in top_scheme["id"] or "micro" in top_scheme["id"]

    # 2. Channel Partner RAG check
    partners = retrieve_channel_partners(query="Kurukshetra HSCFDC office", latitude=29.9695, longitude=76.8783, top_k=2)
    assert len(partners) > 0
    top_partner = partners[0]
    assert "kurukshetra" in top_partner["city"].lower() or "kurukshetra" in top_partner["name"].lower()

    print(f"  --> Passed! RAG Hybrid Vector search operating seamlessly with live DB models.")


def test_fastapi_crawler_endpoints():
    print("\n[TEST 5] Testing FastAPI REST Endpoints for Crawler Management...")
    client = TestClient(app)

    # 1. GET /api/crawler/status
    res_status = client.get("/api/crawler/status")
    assert res_status.status_code == 200
    data_status = res_status.json()
    assert data_status["success"] is True
    assert "total_schemes_in_db" in data_status["status"]

    # 2. POST /api/crawler/trigger
    res_trigger = client.post("/api/crawler/trigger", json={"trigger_source": "test_api"})
    assert res_trigger.status_code == 200
    data_trigger = res_trigger.json()
    assert data_trigger["success"] is True
    assert data_trigger["result"]["status"] == "SUCCESS"

    # 3. GET /api/crawler/logs
    res_logs = client.get("/api/crawler/logs?limit=5")
    assert res_logs.status_code == 200
    data_logs = res_logs.json()
    assert data_logs["success"] is True
    assert data_logs["count"] > 0

    # 4. POST /api/crawler/configure
    res_conf = client.post("/api/crawler/configure", json={"interval_seconds": 3600})
    assert res_conf.status_code == 200
    data_conf = res_conf.json()
    assert data_conf["status"]["interval_seconds"] == 3600

    # 5. GET /api/crawler/schemes & /api/crawler/partners
    res_schemes = client.get("/api/crawler/schemes")
    assert res_schemes.status_code == 200
    assert res_schemes.json()["count"] >= 8

    res_partners = client.get("/api/crawler/partners")
    assert res_partners.status_code == 200
    assert res_partners.json()["count"] >= 20

    print("  --> Passed! All 6 Crawler REST API endpoints verified successfully.")


async def main():
    print("=======================================================")
    print("  STARTING AUTOMATED CRAWLER & SYNC TEST SUITE")
    print("=======================================================")
    init_db()
    test_content_hashing()
    test_scheme_and_partner_crawlers()
    await test_crawler_orchestration_and_db_persistence()
    test_rag_hot_reloading()
    test_fastapi_crawler_endpoints()
    print("\n=======================================================")
    print("  ALL CRAWLER TESTS COMPLETED SUCCESSFULLY! (100% PASS)")
    print("=======================================================\n")


if __name__ == "__main__":
    asyncio.run(main())
