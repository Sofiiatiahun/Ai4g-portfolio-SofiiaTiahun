"""
Continuous pipeline runner for NS Live Pulse.
Periodically fetches new items from Reddit & Fediverse/Mastodon,
runs RobBERT sentiment analysis, and persists into SQLite.
"""

import time
import argparse
from datetime import datetime, timezone
from src.fetcher import fetch_all_transit_posts
from src.models import analyze_sentiment
from src.storage import init_db, save_post, get_stats, export_json

def run_pipeline_step(run_secondary: bool = False, verbose: bool = True) -> int:
    """Executes a single fetch -> analyse -> store cycle. Returns number of new items saved."""
    if verbose:
        print(f"[{datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M:%S UTC')}] Fetching fresh transit items...")
    
    posts = fetch_all_transit_posts()
    new_saved = 0

    for p in posts:
        # Check sentiment with pre-trained transformer
        analysis = analyze_sentiment(p["text"], run_secondary=run_secondary)
        p["primary_sentiment"] = analysis["primary_sentiment"]
        p["primary_score"] = analysis["primary_score"]
        p["secondary_sentiment"] = analysis["secondary_sentiment"]
        p["secondary_score"] = analysis["secondary_score"]
        
        saved = save_post(p)
        if saved:
            new_saved += 1
            if verbose:
                print(f" -> Saved new item [{p['id']}] [{p['primary_sentiment']}|{p['primary_score']}]: {p['text'][:70]}...")

    if verbose:
        stats = get_stats()
        print(f"[{datetime.now(timezone.utc).strftime('%H:%M:%S')}] Cycle complete: +{new_saved} new posts. Total stored: {stats['total_posts']} (Net Sentiment: {stats['net_sentiment']})")
    
    return new_saved

def continuous_loop(interval_seconds: int = 180, run_secondary: bool = False) -> None:
    """Runs continuous background daemon checking every interval_seconds."""
    init_db()
    print(f"=== Starting NS Live Pulse Autonomous Pipeline (Interval: {interval_seconds}s) ===")
    cycle = 0
    try:
        while True:
            cycle += 1
            print(f"\n--- Cycle #{cycle} ---")
            run_pipeline_step(run_secondary=run_secondary, verbose=True)
            export_json("data/collected_posts.json")
            time.sleep(interval_seconds)
    except KeyboardInterrupt:
        print("\nPipeline gracefully stopped.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NS Live Pulse continuous runner")
    parser.add_argument("--once", action="store_true", help="Run a single ingest cycle and exit")
    parser.add_argument("--interval", type=int, default=180, help="Polling interval in seconds")
    parser.add_argument("--with-secondary", action="store_true", help="Also run secondary model")
    args = parser.parse_args()

    init_db()
    if args.once:
        run_pipeline_step(run_secondary=args.with_secondary, verbose=True)
        export_json("data/collected_posts.json")
    else:
        continuous_loop(interval_seconds=args.interval, run_secondary=args.with_secondary)
