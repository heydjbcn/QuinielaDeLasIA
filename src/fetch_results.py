"""
WorldCupBench — Fetch Real Match Results.

Ingests actual World Cup 2026 match results into data/results/YYYY-MM-DD.json.
Supports two modes:
  1. Manual: reads from a hand-edited JSON file.
  2. API: fetches from football-data.org (free tier, key via env FOOTBALL_DATA_API_KEY).

Usage:
    # Manual mode (create/edit data/results/2026-06-11.json by hand, then run score.py)
    python src/fetch_results.py --manual

    # API mode
    export FOOTBALL_DATA_API_KEY="your_key"
    python src/fetch_results.py

    # Fetch specific date
    python src/fetch_results.py --date 2026-06-11

    # Fetch all played matches
    python src/fetch_results.py --all
"""

import argparse
import json
import os
import sys
from datetime import datetime, timezone, timedelta

try:
    import requests
except ImportError:
    requests = None

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import utils  # noqa: E402

RESULTS_DIR = os.path.join(utils.BASE_DIR, "data", "results")
TOURNAMENT_PATH = utils.TOURNAMENT_PATH

# football-data.org — FIFA World Cup 2026 competition ID.
# Check https://api.football-data.org/v4/competitions for the actual ID.
COMPETITION_ID = 2000  # FIFA World Cup (may need adjustment for 2026)
API_BASE = "https://api.football-data.org/v4"


def _log(msg: str):
    ts = datetime.now(timezone.utc).strftime("%H:%M:%S")
    print(f"[{ts}] {msg}")


def load_tournament_schedule() -> dict:
    """Load tournament.json and build a mapping of match_id -> match info."""
    with open(TOURNAMENT_PATH, "r", encoding="utf-8") as f:
        data = json.load(f)

    schedule = {}
    for match in data.get("matches", []):
        mid = match.get("match_id")
        if mid:
            # Convert numeric match_id to our format.
            if isinstance(mid, int):
                if mid <= 72:
                    match["match_id_str"] = f"GS-{mid:02d}"
                else:
                    match["match_id_str"] = str(mid)
            else:
                match["match_id_str"] = str(mid)
            schedule[mid] = match

    # Also index knockout bracket.
    for match in data.get("knockout_bracket", []):
        mid = match.get("match_id")
        if mid:
            schedule[mid] = match

    return schedule


def _outcome_from_score(home_goals: int, away_goals: int) -> str:
    if home_goals > away_goals:
        return "home"
    elif away_goals > home_goals:
        return "away"
    return "draw"


def fetch_from_api(api_key: str, date: str = None, fetch_all: bool = False) -> list:
    """Fetch results from football-data.org API."""
    if requests is None:
        _log("ERROR: 'requests' package not installed. Run: pip install requests")
        return []

    headers = {"X-Auth-Token": api_key}

    url = f"{API_BASE}/competitions/{COMPETITION_ID}/matches"
    params = {"status": "FINISHED"}
    if date and not fetch_all:
        params["dateFrom"] = date
        params["dateTo"] = date

    _log(f"Fetching from {url} with params={params}")
    resp = requests.get(url, headers=headers, params=params, timeout=30)
    resp.raise_for_status()
    data = resp.json()

    matches = []
    for m in data.get("matches", []):
        score = m.get("score", {})
        ft = score.get("fullTime", {})
        if ft.get("home") is None:
            continue

        home_goals = ft["home"]
        away_goals = ft["away"]

        result = {
            "match_id": _map_api_match_id(m),
            "home_team": m.get("homeTeam", {}).get("tla", ""),
            "away_team": m.get("awayTeam", {}).get("tla", ""),
            "score": {"home": home_goals, "away": away_goals},
            "outcome": _outcome_from_score(home_goals, away_goals),
            "date": m.get("utcDate", "")[:10],
            "stage": m.get("stage", ""),
            "group": m.get("group", ""),
        }
        matches.append(result)

    _log(f"Fetched {len(matches)} finished matches")
    return matches


def _map_api_match_id(api_match: dict) -> str:
    """Map football-data.org match to our match_id convention.

    This is approximate — ideally we match by teams + date against tournament.json.
    """
    stage = api_match.get("stage", "")
    matchday = api_match.get("matchday", 0)

    # Load schedule for mapping.
    home = api_match.get("homeTeam", {}).get("tla", "")
    away = api_match.get("awayTeam", {}).get("tla", "")
    date = api_match.get("utcDate", "")[:10]

    # Try to match against tournament.json.
    try:
        schedule = load_tournament_schedule()
        for mid, match in schedule.items():
            m_home = match.get("home_team", "")
            m_away = match.get("away_team", "")
            m_date = match.get("date", "")
            if m_home == home and m_away == away and m_date == date:
                return match.get("match_id_str", str(mid))
    except Exception:
        pass

    # Fallback: construct from stage.
    return f"{stage}_{home}v{away}_{date}"


def save_results(matches: list, results_dir: str = RESULTS_DIR):
    """Save results grouped by date."""
    os.makedirs(results_dir, exist_ok=True)

    by_date = {}
    for m in matches:
        date = m.get("date", "unknown")
        by_date.setdefault(date, []).append(m)

    for date, day_matches in by_date.items():
        filepath = os.path.join(results_dir, f"{date}.json")

        # Merge with existing file if present.
        existing = []
        if os.path.exists(filepath):
            try:
                with open(filepath, "r", encoding="utf-8") as f:
                    data = json.load(f)
                existing = data if isinstance(data, list) else data.get("matches", [])
            except (json.JSONDecodeError, OSError):
                pass

        # Merge: update existing by match_id, add new.
        existing_ids = {m["match_id"] for m in existing}
        merged = existing[:]
        for m in day_matches:
            if m["match_id"] in existing_ids:
                # Update existing.
                merged = [e if e["match_id"] != m["match_id"] else m for e in merged]
            else:
                merged.append(m)

        output = {
            "date": date,
            "last_updated": datetime.now(timezone.utc).isoformat(),
            "matches": merged,
        }

        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(output, f, ensure_ascii=False, indent=2)

        _log(f"Saved {len(merged)} results to {filepath}")


def create_manual_template(date: str, results_dir: str = RESULTS_DIR):
    """Create a template JSON for manual result entry."""
    os.makedirs(results_dir, exist_ok=True)
    filepath = os.path.join(results_dir, f"{date}.json")

    if os.path.exists(filepath):
        _log(f"File already exists: {filepath}")
        return

    # Find matches scheduled for this date.
    try:
        schedule = load_tournament_schedule()
        day_matches = []
        for mid, match in schedule.items():
            if match.get("date") == date:
                day_matches.append(
                    {
                        "match_id": match.get("match_id_str", str(mid)),
                        "home_team": match.get("home_team", ""),
                        "away_team": match.get("away_team", ""),
                        "score": {"home": None, "away": None},
                        "outcome": None,
                        "date": date,
                        "stage": "group_stage" if isinstance(mid, int) and mid <= 72 else "knockout",
                        "group": match.get("group", ""),
                    }
                )
    except Exception:
        day_matches = []

    output = {
        "date": date,
        "last_updated": None,
        "matches": day_matches,
    }

    with open(filepath, "w", encoding="utf-8") as f:
        json.dump(output, f, ensure_ascii=False, indent=2)

    _log(f"Template created: {filepath} ({len(day_matches)} matches)")
    _log("Edit the file to fill in scores and outcomes, then run score.py")


def main():
    parser = argparse.ArgumentParser(description="Fetch World Cup 2026 match results")
    parser.add_argument(
        "--date",
        default=None,
        help="Specific date to fetch (YYYY-MM-DD). Default: today.",
    )
    parser.add_argument(
        "--all",
        action="store_true",
        help="Fetch all finished matches.",
    )
    parser.add_argument(
        "--manual",
        action="store_true",
        help="Create a manual template for the given date.",
    )
    parser.add_argument(
        "--results-dir",
        default=RESULTS_DIR,
        help=f"Results directory (default: {RESULTS_DIR})",
    )
    args = parser.parse_args()

    date = args.date or datetime.now(timezone.utc).strftime("%Y-%m-%d")

    if args.manual:
        create_manual_template(date, args.results_dir)
        return

    api_key = os.environ.get("FOOTBALL_DATA_API_KEY", "")
    if not api_key:
        _log("No FOOTBALL_DATA_API_KEY found. Creating manual template instead.")
        create_manual_template(date, args.results_dir)
        _log("Tip: Set FOOTBALL_DATA_API_KEY env var for automatic fetching.")
        return

    matches = fetch_from_api(api_key, date, args.all)
    if matches:
        save_results(matches, args.results_dir)
    else:
        _log("No finished matches found.")


if __name__ == "__main__":
    main()
