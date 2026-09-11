"""
YOJNASETU - STANDALONE CRAWLER RUNNER CLI
=======================================
Usage:
    python crawler_runner.py --now
    python crawler_runner.py --status
    python crawler_runner.py --logs 10
    python crawler_runner.py --interval 3600
"""

import sys
import os
import argparse
import asyncio
import json

# Add parent backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from services.crawler_service import CRAWLER_SCHEDULER, CrawlerOrchestrator
from database.db import get_crawler_logs, get_all_stored_schemes, get_all_stored_partners


async def run_cli():
    parser = argparse.ArgumentParser(description="YojnaSetu Schemes & Channel Partners Crawler CLI")
    parser.add_argument("--now", action="store_true", help="Execute an immediate crawl and database/RAG sync cycle")
    parser.add_argument("--status", action="store_true", help="Display current crawler status and database counts")
    parser.add_argument("--logs", type=int, default=0, help="Display the last N crawler audit logs")
    parser.add_argument("--interval", type=int, default=0, help="Start periodic background crawler with specified interval in seconds")

    args = parser.parse_args()

    if args.status:
        status = CRAWLER_SCHEDULER.get_status()
        print("\n=======================================================")
        print("  YOJNASETU CRAWLER ENGINE STATUS")
        print("=======================================================")
        print(f"• Active Scheduler:      {'RUNNING' if status['is_running'] else 'IDLE'}")
        print(f"• Interval:              {status['interval_seconds']}s ({status['interval_hours']} hours)")
        print(f"• Total Runs Completed:  {status['total_runs']}")
        print(f"• Last Crawl Timestamp:  {status['last_run_time'] or 'Never'}")
        print(f"• Next Scheduled Run:    {status['next_run_time'] or 'Not scheduled'}")
        print(f"• Schemes in SQLite DB:  {status['total_schemes_in_db']}")
        print(f"• Partners in SQLite DB: {status['total_partners_in_db']}")
        print("\nTarget Portals:")
        for src in status["official_sources"]:
            print(f"  - {src['name']}: {src['url']}")
        print("=======================================================\n")
        return

    if args.logs > 0:
        logs = get_crawler_logs(limit=args.logs)
        print(f"\n=======================================================")
        print(f"  LAST {len(logs)} CRAWLER AUDIT LOGS")
        print("=======================================================")
        for l in logs:
            print(f"ID #{l['id']} | {l['created_at']} | Trigger: {l['trigger_source']} | Status: {l['status']}")
            print(f"  Schemes: {l['schemes_checked']} checked, {l['schemes_updated']} updated | Partners: {l['partners_checked']} checked, {l['partners_updated']} updated ({l['duration_sec']}s)")
            if l.get("diff_summary") and any(l["diff_summary"].values()):
                print(f"  Diff: {json.dumps(l['diff_summary'], ensure_ascii=False)}")
            if l.get("error_message"):
                print(f"  Error: {l['error_message']}")
            print("-" * 55)
        return

    if args.interval > 0:
        print(f"\n[Scheduler] Starting standalone crawler daemon with interval {args.interval} seconds (Press Ctrl+C to stop)...")
        CRAWLER_SCHEDULER.set_interval(args.interval)
        CRAWLER_SCHEDULER.start()
        try:
            while True:
                await asyncio.sleep(1)
        except KeyboardInterrupt:
            print("\n[Scheduler] Stopping daemon...")
            CRAWLER_SCHEDULER.stop()
        return

    # Default action or --now
    orchestrator = CrawlerOrchestrator()
    print("\n[Crawler] Running immediate crawl & sync...")
    result = await orchestrator.run_crawl_and_sync(trigger_source="cli_manual")
    print("\nCrawl Result Summary:")
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    asyncio.run(run_cli())
