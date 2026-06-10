"""
WorldCupBench — Fetch Polymarket Odds.

Fetches World Cup 2026 odds from Polymarket's public API (CLOB/Gamma)
and saves them to data/polymarket/.

Usage:
    python src/fetch_polymarket.py
    python src/fetch_polymarket.py --output data/polymarket/odds.json
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone

try:
    import requests
except ImportError:
    requests = None

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import utils  # noqa: E402

POLYMARKET_DIR = os.path.join(utils.BASE_DIR, "data", "polymarket")

# Polymarket Gamma API (public, no auth required).
GAMMA_API = "https://gamma-api.polymarket.com"

# Search terms for World Cup markets.
WORLD_CUP_SEARCH_TERMS = [
    "FIFA World Cup 2026",
    "World Cup 2026 winner",
    "World Cup 2026",
]

# Standard bet amount per model per market.
STANDARD_BET = 10.0  # $10 USD


def _log(msg: str):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def search_markets(query: str) -> list:
    """Search Polymarket for markets matching query."""
    if requests is None:
        _log("ERROR: 'requests' package not installed.")
        return []

    url = f"{GAMMA_API}/events"
    params = {"title": query, "active": "true", "limit": 20}

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        events = resp.json()
        return events if isinstance(events, list) else []
    except Exception as e:
        _log(f"Search error for '{query}': {e}")
        return []


def fetch_market_prices(condition_id: str) -> dict:
    """Fetch current prices for a specific market condition."""
    if requests is None:
        return {}

    url = f"{GAMMA_API}/markets"
    params = {"condition_id": condition_id}

    try:
        resp = requests.get(url, params=params, timeout=15)
        resp.raise_for_status()
        return resp.json()
    except Exception as e:
        _log(f"Price fetch error: {e}")
        return {}


def fetch_all_world_cup_markets() -> dict:
    """Fetch all World Cup 2026 related markets from Polymarket."""
    all_markets = []
    seen_ids = set()

    for term in WORLD_CUP_SEARCH_TERMS:
        _log(f"Searching: '{term}'")
        events = search_markets(term)
        for event in events:
            eid = event.get("id")
            if eid and eid not in seen_ids:
                seen_ids.add(eid)
                all_markets.append(event)

    _log(f"Found {len(all_markets)} unique World Cup events")

    return {
        "last_updated": datetime.now(timezone.utc).isoformat(),
        "total_events": len(all_markets),
        "events": all_markets,
    }


def calculate_hypothetical_gains(odds: dict, predictions: list) -> dict:
    """Calculate hypothetical gains if we bet $10 per market using each model's predictions.

    This is a simplified simulation — in reality Polymarket is a prediction market
    with binary outcomes and prices, not traditional bookmaker odds.
    """
    # For now, this returns a stub structure.
    # The actual calculation requires mapping Polymarket market outcomes
    # to our prediction match_ids, which requires the markets to be live.
    results = {
        "standard_bet": STANDARD_BET,
        "models": [],
    }

    for pred in predictions:
        model_result = {
            "model_name": pred.get("model_name", "Unknown"),
            "champion": pred.get("final_standings", {}).get("champion", ""),
            "total_bet": 0,
            "total_return": 0,
            "total_gain": 0,
            "roi": 0,
            "bets": [],
        }
        results["models"].append(model_result)

    return results


def save_odds(data: dict, output_path: str = None):
    """Save odds data to JSON."""
    if output_path is None:
        output_path = os.path.join(POLYMARKET_DIR, "odds.json")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    _log(f"Saved odds to {output_path}")


def main():
    parser = argparse.ArgumentParser(description="Fetch Polymarket World Cup 2026 odds")
    parser.add_argument(
        "--output",
        default=None,
        help="Output JSON path (default: data/polymarket/odds.json)",
    )
    args = parser.parse_args()

    odds = fetch_all_world_cup_markets()
    save_odds(odds, args.output)

    if odds["total_events"] == 0:
        _log("No World Cup markets found. Markets may not be live yet.")
        _log("Try again closer to or during the tournament.")


if __name__ == "__main__":
    main()
