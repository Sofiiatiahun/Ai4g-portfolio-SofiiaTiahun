"""
Unified runner for NS Live Pulse.
Usage:
  python run.py --dashboard   # Starts the interactive web dashboard (http://127.0.0.1:8000)
  python run.py --fetch       # Fetches new live items and runs sentiment analysis once
  python run.py --evaluate    # Runs the 52-sample test benchmark and regenerates tables
  python run.py --daemon      # Runs the continuous autonomous loop (polls every 3 min)
"""

import sys
import argparse
import uvicorn
from src.scheduler import run_pipeline_step, continuous_loop
from src.evaluate import run_evaluation
from src.storage import init_db, export_json

def main():
    parser = argparse.ArgumentParser(description="NS Live Pulse - Simple Unified Runner")
    parser.add_argument("--dashboard", action="store_true", help="Launch the web dashboard")
    parser.add_argument("--fetch", action="store_true", help="Fetch fresh live items once and score them")
    parser.add_argument("--evaluate", action="store_true", help="Run the test benchmark against the 52 test items")
    parser.add_argument("--daemon", action="store_true", help="Run autonomous loop in the background")
    parser.add_argument("--interval", type=int, default=180, help="Loop interval in seconds (default 180)")
    
    args = parser.parse_args()
    init_db()

    # If no flags passed, default to launching dashboard
    if not (args.dashboard or args.fetch or args.evaluate or args.daemon):
        print("Starting Live Dashboard at http://127.0.0.1:8000 ... (Pass --help to see other commands)")
        uvicorn.run("src.app:app", host="127.0.0.1", port=8000, reload=False)
        return

    if args.fetch:
        print("Fetching fresh live transit posts and analyzing sentiment...")
        run_pipeline_step(run_secondary=False, verbose=True)
        export_json("data/collected_posts.json")
        print("Done! Data exported to data/collected_posts.json")

    if args.evaluate:
        print("Running honest model test benchmark (52 items)...")
        run_evaluation()

    if args.daemon:
        print(f"Starting continuous autonomous ingest every {args.interval} seconds...")
        continuous_loop(interval_seconds=args.interval)

    if args.dashboard:
        print("Starting Live Dashboard at http://127.0.0.1:8000 ...")
        uvicorn.run("src.app:app", host="127.0.0.1", port=8000, reload=False)

if __name__ == "__main__":
    main()
