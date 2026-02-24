#!/usr/bin/env python3
"""Extract Yankees-only data from the full MLB roster JSON and enrich with
full batting/pitching stats from Lahman CSVs, plus HOF, awards, retired
numbers, nicknames, and historical moments."""

import csv
import json
import os
from collections import defaultdict

import pyreadr

SCRIPT_DIR = os.path.dirname(__file__)
DATA_DIR = os.path.join(SCRIPT_DIR, "..", "data")
SOURCE = os.path.join(DATA_DIR, "core_rosters_1900_2025.json")
BATTING_CSV = os.path.join(SCRIPT_DIR, "Batting.csv")
PITCHING_CSV = os.path.join(SCRIPT_DIR, "Pitching.csv")
OUTPUT = os.path.join(DATA_DIR, "yankees.json")

LAHMAN_DIR = os.path.join(DATA_DIR, "lahman")

# All 27 World Series wins
WS_WON = {
    1923, 1927, 1928, 1932, 1936, 1937, 1938, 1939, 1941,
    1943, 1947, 1949, 1950, 1951, 1952, 1953, 1956, 1958,
    1961, 1962, 1977, 1978, 1996, 1998, 1999, 2000, 2009,
}

# World Series losses (appeared but lost)
WS_LOST = {
    1921, 1922, 1926, 1942, 1955, 1957, 1960, 1963, 1964,
    1976, 1981, 2001, 2003,
}

# Era definitions for navigation
ERAS = [
    {"id": "dead-ball",      "label": "Dead Ball",       "start": 1903, "end": 1919, "tagline": "The Highlanders become the Yankees"},
    {"id": "murderers-row",  "label": "Murderers' Row",  "start": 1920, "end": 1935, "tagline": "Ruth, Gehrig, and the birth of a dynasty"},
    {"id": "dimaggio",       "label": "DiMaggio Era",    "start": 1936, "end": 1951, "tagline": "The Yankee Clipper's 56-game streak"},
    {"id": "mantle-maris",   "label": "Mantle & Maris",  "start": 1952, "end": 1964, "tagline": "The Mick, Roger, and 61*"},
    {"id": "lean-years",     "label": "The Lean Years",  "start": 1965, "end": 1975, "tagline": "Waiting for the next dynasty"},
    {"id": "bronx-zoo",      "label": "Bronx Zoo",       "start": 1976, "end": 1981, "tagline": "Reggie, Billy, and The Boss"},
    {"id": "mattingly",      "label": "Mattingly Era",   "start": 1982, "end": 1995, "tagline": "Donnie Baseball holds the fort"},
    {"id": "dynasty",        "label": "The Dynasty",     "start": 1996, "end": 2001, "tagline": "Jeter, Mo, and four rings in five years"},
    {"id": "modern",         "label": "Modern Era",      "start": 2002, "end": 2025, "tagline": "From the Bronx to the new Stadium"},
]

# Fun facts / famous quotes per era (for whimsy)
ERA_QUOTES = {
    "dead-ball": "\"They don't call it the House That Ruth Built for nothing.\"",
    "murderers-row": "\"I'd rather be lucky than good.\" — Lefty Gomez",
    "dimaggio": "\"I want to thank the Good Lord for making me a Yankee.\" — Joe DiMaggio",
    "mantle-maris": "\"If I had played my career hitting singles like Pete, I'd wear a dress.\" — Mickey Mantle",
    "lean-years": "\"It's déjà vu all over again.\" — Yogi Berra",
    "bronx-zoo": "\"The straw that stirs the drink.\" — Reggie Jackson",
    "mattingly": "\"I didn't come to New York to be a star. I brought my star with me.\" — Don Mattingly",
    "dynasty": "\"In my dreams, I never let the boys down.\" — Derek Jeter",
    "modern": "\"I tip my cap and call the Yankees my daddy.\" — Pedro Martinez, 2004",
}

# --- Retired Numbers ---
# Only players who appear in our roster data (managers excluded since they
# aren't in the roster JSON).  Number 8 was retired for both Dickey and Berra.
RETIRED_NUMBERS = {
    "ruthba01": 3,
    "gehrilo01": 4,
    "dimagjo01": 5,
    "mantlmi01": 7,
    "berrayo01": 8,
    "dickebi01": 8,
    "marisro01": 9,
    "rizzuph01": 10,
    "howarel01": 14,
    "munsoth01": 15,
    "fordwh01": 16,
    "mattido01": 23,
    "guidrro01": 49,
    "riverma01": 42,
    "jeterde01": 2,
    "willibe02": 51,
    "jacksre01": 44,
    "posadjo01": 20,
    "pettian01": 46,
    "randowi01": 30,
    "gossari01": 54,
    "combsea01": 1,    # Combs' number, later also Billy Martin's
    "lazzeto01": 6,    # Lazzeri's number, later also Joe Torre's
}

# --- Famous Nicknames ---
NICKNAMES = {
    "ruthba01": "The Sultan of Swat",
    "gehrilo01": "The Iron Horse",
    "dimagjo01": "The Yankee Clipper",
    "mantlmi01": "The Mick",
    "jacksre01": "Mr. October",
    "riverma01": "Mo",
    "jeterde01": "The Captain",
    "judgeaa01": "All Rise",
    "mattido01": "Donnie Baseball",
    "willibe02": "Bernie Boom Boom",
    "berrayo01": "Yogi",
    "fordwh01": "The Chairman of the Board",
    "rizzuph01": "The Scooter",
    "guidrro01": "Louisiana Lightning",
    "gossari01": "Goose",
    "munsoth01": "Tugboat",
    "marisro01": "Rog",
    "dickebi01": "The Man Nobody Knows",
    "combsea01": "The Kentucky Colonel",
    "lazzeto01": "Poosh 'Em Up",
    "henderi01": "Man of Steal",
    "winfida01": "Winnie",
    "posadjo01": "Georgie",
    "coneda01": "Coney",
    "pettian01": "Andy Petty",
    "larsedo01": "The Perfect Man",
}

# --- "On This Date" Moments ---
ON_THIS_DATE = [
    {"month": 4, "day": 18, "year": 1923, "text": "Yankees christen Yankee Stadium with a win — Babe Ruth hits the first homer"},
    {"month": 6, "day": 2, "year": 1925, "text": "Wally Pipp sits out with a headache — Lou Gehrig begins his 2,130-game streak"},
    {"month": 9, "day": 30, "year": 1927, "text": "Babe Ruth hits home run #60, a record that stands for 34 years"},
    {"month": 7, "day": 4, "year": 1939, "text": "Lou Gehrig delivers his 'Luckiest Man' farewell speech at Yankee Stadium"},
    {"month": 5, "day": 15, "year": 1941, "text": "Joe DiMaggio begins his 56-game hitting streak"},
    {"month": 7, "day": 17, "year": 1941, "text": "DiMaggio's 56-game hitting streak is stopped in Cleveland"},
    {"month": 10, "day": 8, "year": 1956, "text": "Don Larsen throws a perfect game in World Series Game 5"},
    {"month": 10, "day": 1, "year": 1961, "text": "Roger Maris hits home run #61, breaking Ruth's single-season record"},
    {"month": 6, "day": 8, "year": 1969, "text": "Mickey Mantle's #7 is retired at Yankee Stadium"},
    {"month": 10, "day": 18, "year": 1977, "text": "Reggie Jackson hits three home runs in World Series Game 6 — 'Mr. October'"},
    {"month": 7, "day": 4, "year": 1983, "text": "The Pine Tar Game — George Brett's home run is initially called out"},
    {"month": 9, "day": 4, "year": 1993, "text": "Jim Abbott throws a no-hitter despite being born without a right hand"},
    {"month": 10, "day": 26, "year": 1996, "text": "Yankees win the World Series for the first time since 1978 — the Dynasty begins"},
    {"month": 5, "day": 17, "year": 1998, "text": "David Wells throws a perfect game against the Twins"},
    {"month": 7, "day": 18, "year": 1999, "text": "David Cone throws a perfect game on Yogi Berra Day"},
    {"month": 10, "day": 26, "year": 2000, "text": "Yankees beat the Mets in the Subway Series for their 3rd straight title"},
    {"month": 11, "day": 1, "year": 2001, "text": "Derek Jeter's walk-off homer in Game 4 of the World Series — 'Mr. November'"},
    {"month": 11, "day": 4, "year": 2001, "text": "The heartbreaking Game 7 loss to Arizona — the Dynasty ends"},
    {"month": 9, "day": 19, "year": 2008, "text": "The final game at the original Yankee Stadium"},
    {"month": 11, "day": 4, "year": 2009, "text": "Yankees win World Series #27, the first in the new Yankee Stadium"},
    {"month": 9, "day": 19, "year": 2011, "text": "Mariano Rivera breaks the all-time saves record (602)"},
    {"month": 9, "day": 22, "year": 2013, "text": "Mariano Rivera's final game — a tearful exit from the mound"},
    {"month": 9, "day": 25, "year": 2014, "text": "Derek Jeter's walk-off single in his final Yankee Stadium game"},
    {"month": 9, "day": 28, "year": 2022, "text": "Aaron Judge hits home run #62, breaking the AL record"},
    {"month": 5, "day": 1, "year": 1991, "text": "Nolan Ryan throws his 7th no-hitter — but Don Mattingly's Yankees were the opponent"},
    {"month": 10, "day": 9, "year": 1958, "text": "Yankees rally from 3-1 deficit to beat the Braves and win the World Series"},
    {"month": 10, "day": 10, "year": 1956, "text": "Mickey Mantle wins the Triple Crown, leading the Yankees to a World Series title"},
    {"month": 4, "day": 15, "year": 1997, "text": "MLB retires Jackie Robinson's #42 league-wide — Rivera grandfathered in"},
    {"month": 8, "day": 2, "year": 1979, "text": "Thurman Munson tragically dies in a plane crash — the Bronx mourns"},
    {"month": 7, "day": 1, "year": 1941, "text": "Joe DiMaggio extends his hitting streak to 45 games vs. the Red Sox"},
    {"month": 6, "day": 13, "year": 1948, "text": "Babe Ruth's final appearance at Yankee Stadium — his number 3 is retired"},
    {"month": 10, "day": 2, "year": 1978, "text": "Bucky Dent's three-run homer lifts the Yankees over the Red Sox in a one-game playoff"},
    {"month": 6, "day": 17, "year": 1962, "text": "Mickey Mantle, Roger Maris, and Bill Skowron hit consecutive homers"},
    {"month": 10, "day": 15, "year": 2003, "text": "Aaron Boone's walk-off homer in Game 7 of the ALCS vs. the Red Sox"},
    {"month": 10, "day": 20, "year": 2004, "text": "The Red Sox complete an unprecedented 3-0 comeback to beat the Yankees in the ALCS"},
    {"month": 5, "day": 14, "year": 1996, "text": "Dwight Gooden throws a no-hitter for the Yankees"},
    {"month": 7, "day": 24, "year": 1983, "text": "Dave Righetti throws a no-hitter on George Steinbrenner's birthday"},
]

# Award IDs we care about from Lahman AwardsPlayers
AWARD_MAP = {
    "Most Valuable Player": "MVP",
    "Cy Young Award": "CY",
    "Gold Glove": "GG",
    "Silver Slugger": "SS",
    "Rookie of the Year": "ROY",
}


def parse_int(val):
    if not val or not str(val).strip():
        return 0
    try:
        return int(float(val))
    except (ValueError, TypeError):
        return 0


def parse_float(val):
    if not val or not str(val).strip():
        return None
    try:
        return float(val)
    except (ValueError, TypeError):
        return None


def ipouts_to_ip(ipouts):
    """Convert IPouts (total outs recorded) to familiar IP format like '66.1'."""
    full_innings = ipouts // 3
    remainder = ipouts % 3
    return f"{full_innings}.{remainder}"


def load_batting_stats():
    """Load Batting.csv and index by (playerID, yearID, teamID).
    Aggregates across stints for same team-year."""
    stats = {}
    if not os.path.exists(BATTING_CSV):
        print(f"  Warning: {BATTING_CSV} not found, skipping batting enrichment")
        return stats

    with open(BATTING_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = row.get("playerID", "").strip()
            year = row.get("yearID", "").strip()
            team = row.get("teamID", "").strip()
            if not pid or not year or team != "NYA":
                continue

            key = (pid, year)
            if key not in stats:
                stats[key] = {"G": 0, "AB": 0, "H": 0, "HR": 0, "RBI": 0,
                              "R": 0, "BB": 0, "SB": 0, "2B": 0, "3B": 0, "SO": 0}

            s = stats[key]
            s["G"] += parse_int(row.get("G"))
            s["AB"] += parse_int(row.get("AB"))
            s["H"] += parse_int(row.get("H"))
            s["HR"] += parse_int(row.get("HR"))
            s["RBI"] += parse_int(row.get("RBI"))
            s["R"] += parse_int(row.get("R"))
            s["BB"] += parse_int(row.get("BB"))
            s["SB"] += parse_int(row.get("SB"))
            s["2B"] += parse_int(row.get("2B") or row.get("X2B"))
            s["3B"] += parse_int(row.get("3B") or row.get("X3B"))
            s["SO"] += parse_int(row.get("SO"))

    print(f"  Loaded {len(stats)} NYA batter-seasons from Batting.csv")
    return stats


def load_pitching_stats():
    """Load Pitching.csv and index by (playerID, yearID) for NYA.
    Aggregates across stints."""
    stats = {}
    if not os.path.exists(PITCHING_CSV):
        print(f"  Warning: {PITCHING_CSV} not found, skipping pitching enrichment")
        return stats

    with open(PITCHING_CSV, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            pid = row.get("playerID", "").strip()
            year = row.get("yearID", "").strip()
            team = row.get("teamID", "").strip()
            if not pid or not year or team != "NYA":
                continue

            key = (pid, year)
            if key not in stats:
                stats[key] = {"W": 0, "L": 0, "G": 0, "GS": 0, "SV": 0,
                              "IPouts": 0, "SO": 0, "BB": 0, "ER": 0, "H": 0,
                              "HR": 0, "CG": 0, "SHO": 0}

            s = stats[key]
            s["W"] += parse_int(row.get("W"))
            s["L"] += parse_int(row.get("L"))
            s["G"] += parse_int(row.get("G"))
            s["GS"] += parse_int(row.get("GS"))
            s["SV"] += parse_int(row.get("SV"))
            s["IPouts"] += parse_int(row.get("IPouts"))
            s["SO"] += parse_int(row.get("SO"))
            s["BB"] += parse_int(row.get("BB"))
            s["ER"] += parse_int(row.get("ER"))
            s["H"] += parse_int(row.get("H"))
            s["HR"] += parse_int(row.get("HR"))
            s["CG"] += parse_int(row.get("CG"))
            s["SHO"] += parse_int(row.get("SHO"))

    print(f"  Loaded {len(stats)} NYA pitcher-seasons from Pitching.csv")
    return stats


def load_lahman_rdata():
    """Load supplementary data from Lahman RData files."""
    result = {}

    # Hall of Fame — set of inducted playerIDs
    hof_set = set()
    try:
        hof_data = pyreadr.read_r(os.path.join(LAHMAN_DIR, "HallOfFame.RData"))
        df = list(hof_data.values())[0]
        inducted = df[(df["inducted"] == "Y") & (df["category"] == "Player")]
        hof_set = set(inducted["playerID"].unique())
        print(f"  Loaded {len(hof_set)} HOF inductees from HallOfFame.RData")
    except Exception as e:
        print(f"  Warning: Could not load HallOfFame.RData: {e}")
    result["hof"] = hof_set

    # Awards — {(playerID, yearID): [award_codes]}
    awards_by_py = defaultdict(list)
    try:
        awards_data = pyreadr.read_r(os.path.join(LAHMAN_DIR, "AwardsPlayers.RData"))
        df = list(awards_data.values())[0]
        for _, row in df.iterrows():
            code = AWARD_MAP.get(row["awardID"])
            if code:
                key = (row["playerID"], int(row["yearID"]))
                if code not in awards_by_py[key]:
                    awards_by_py[key].append(code)
        print(f"  Loaded {len(awards_by_py)} player-year award entries")
    except Exception as e:
        print(f"  Warning: Could not load AwardsPlayers.RData: {e}")
    result["awards"] = dict(awards_by_py)

    # All-Star — {(playerID, yearID)} set
    allstar_set = set()
    try:
        as_data = pyreadr.read_r(os.path.join(LAHMAN_DIR, "AllstarFull.RData"))
        df = list(as_data.values())[0]
        for _, row in df.iterrows():
            allstar_set.add((row["playerID"], int(row["yearID"])))
        print(f"  Loaded {len(allstar_set)} All-Star appearances")
    except Exception as e:
        print(f"  Warning: Could not load AllstarFull.RData: {e}")
    result["allstar"] = allstar_set

    # Teams — {yearID: {"W": w, "L": l}} for NYA
    team_records = {}
    try:
        teams_data = pyreadr.read_r(os.path.join(LAHMAN_DIR, "Teams.RData"))
        df = list(teams_data.values())[0]
        nya = df[df["teamID"] == "NYA"]
        for _, row in nya.iterrows():
            year = int(row["yearID"])
            team_records[year] = {"W": int(row["W"]), "L": int(row["L"])}
        print(f"  Loaded {len(team_records)} NYA season records from Teams.RData")
    except Exception as e:
        print(f"  Warning: Could not load Teams.RData: {e}")
    result["records"] = team_records

    return result


def compute_avg(h, ab):
    """Compute batting average as a display string like '.312'."""
    if not ab or ab == 0:
        return None
    avg = h / ab
    return f".{round(avg * 1000):03d}"


def compute_era(er, ipouts):
    """Compute ERA from earned runs and IPouts."""
    if not ipouts or ipouts == 0:
        return None
    innings = ipouts / 3
    era = (er / innings) * 9
    return round(era, 2)


def enrich_player(entry, pid, year, lahman):
    """Add retiredNum, hof, nickname, and awards to a player entry."""
    if pid in RETIRED_NUMBERS:
        entry["retiredNum"] = RETIRED_NUMBERS[pid]
    if pid in lahman["hof"]:
        entry["hof"] = True
    if pid in NICKNAMES:
        entry["nickname"] = NICKNAMES[pid]

    # Awards for this season
    awards = []
    award_key = (pid, year)
    if award_key in lahman["awards"]:
        awards.extend(lahman["awards"][award_key])
    if (pid, year) in lahman["allstar"]:
        if "AS" not in awards:
            awards.append("AS")
    if awards:
        entry["awards"] = awards


def build_leaderboards(years_data, lahman):
    """Build cumulative leaderboard data for MVPs, Cy Youngs, All-Stars, WS wins."""
    # Collect all playerIDs that appear in our roster data, with names
    player_names = {}
    player_ws_wins = defaultdict(int)

    for year_str, roster in years_data.items():
        year = int(year_str)
        is_ws_win = roster.get("worldSeries") == "won"

        all_players = []
        for pos, p in roster.get("position_players", {}).items():
            all_players.append(p)
        for sp in roster.get("pitchers", {}).get("starters", []):
            all_players.append(sp)
        cl = roster.get("pitchers", {}).get("closer")
        if cl:
            all_players.append(cl)

        for p in all_players:
            pid = p.get("playerID")
            if pid:
                player_names[pid] = p["name"]
                if is_ws_win:
                    player_ws_wins[pid] += 1

    # Count awards only for years the player was actually on the Yankees roster
    roster_pids = set(player_names.keys())
    player_years = defaultdict(set)
    for year_str, roster in years_data.items():
        year = int(year_str)
        for pos, p in roster.get("position_players", {}).items():
            if p.get("playerID"):
                player_years[p["playerID"]].add(year)
        for sp in roster.get("pitchers", {}).get("starters", []):
            if sp.get("playerID"):
                player_years[sp["playerID"]].add(year)
        cl = roster.get("pitchers", {}).get("closer")
        if cl and cl.get("playerID"):
            player_years[cl["playerID"]].add(year)

    mvp_counts = defaultdict(int)
    cy_counts = defaultdict(int)
    as_counts = defaultdict(int)

    for (pid, year), codes in lahman["awards"].items():
        if pid not in roster_pids or year not in player_years.get(pid, set()):
            continue
        if "MVP" in codes:
            mvp_counts[pid] += 1
        if "CY" in codes:
            cy_counts[pid] += 1

    for (pid, year) in lahman["allstar"]:
        if pid in roster_pids and year in player_years.get(pid, set()):
            as_counts[pid] += 1

    def top5(counts):
        sorted_items = sorted(counts.items(), key=lambda x: -x[1])
        return [{"playerID": pid, "name": player_names.get(pid, pid), "count": c}
                for pid, c in sorted_items[:5] if c > 0]

    return {
        "mvp": top5(mvp_counts),
        "cyYoung": top5(cy_counts),
        "allStar": top5(as_counts),
        "wsWins": top5(player_ws_wins),
    }


def process():
    print("Loading source data...")
    with open(SOURCE) as f:
        data = json.load(f)

    batting = load_batting_stats()
    pitching = load_pitching_stats()

    print("Loading Lahman RData files...")
    lahman = load_lahman_rdata()

    nya = data["teams"]["NYA"]
    years_data = {}
    enriched_batters = 0
    enriched_pitchers = 0

    for year_str, roster in sorted(nya["years"].items(), key=lambda x: int(x[0])):
        year = int(year_str)
        enriched = {
            "position_players": {},
            "pitchers": {"starters": [], "closer": None},
            "worldSeries": "won" if year in WS_WON else ("lost" if year in WS_LOST else None),
        }

        # Position players — enrich with batting stats
        for pos, player in roster.get("position_players", {}).items():
            pid = player["playerID"]
            entry = {
                "playerID": pid,
                "name": player["name"],
                "G": player.get("G", 0),
            }

            bstats = batting.get((pid, year_str))
            if bstats:
                entry["AB"] = bstats["AB"]
                entry["H"] = bstats["H"]
                entry["HR"] = bstats["HR"]
                entry["RBI"] = bstats["RBI"]
                entry["R"] = bstats["R"]
                entry["BB"] = bstats["BB"]
                entry["SB"] = bstats["SB"]
                avg = compute_avg(bstats["H"], bstats["AB"])
                if avg:
                    entry["AVG"] = avg
                enriched_batters += 1

            enrich_player(entry, pid, year, lahman)
            enriched["position_players"][pos] = entry

        # Starters — enrich with pitching stats
        for sp in roster.get("pitchers", {}).get("starters", []):
            pid = sp["playerID"]
            ipouts = sp.get("IPouts", 0)
            entry = {
                "playerID": pid,
                "name": sp["name"],
                "G": sp.get("G", 0),
                "GS": sp.get("GS", 0),
                "IP": ipouts_to_ip(ipouts),
                "IPouts": ipouts,
            }

            pstats = pitching.get((pid, year_str))
            if pstats:
                entry["W"] = pstats["W"]
                entry["L"] = pstats["L"]
                entry["SO"] = pstats["SO"]
                entry["BB"] = pstats["BB"]
                era = compute_era(pstats["ER"], pstats["IPouts"])
                if era is not None:
                    entry["ERA"] = era
                enriched_pitchers += 1

            enrich_player(entry, pid, year, lahman)
            enriched["pitchers"]["starters"].append(entry)

        # Closer — enrich with pitching stats
        cl = roster.get("pitchers", {}).get("closer")
        if cl:
            pid = cl["playerID"]
            ipouts = cl.get("IPouts", 0)
            entry = {
                "playerID": pid,
                "name": cl["name"],
                "G": cl.get("G", 0),
                "SV": cl.get("SV", 0),
                "IP": ipouts_to_ip(ipouts),
                "IPouts": ipouts,
            }

            pstats = pitching.get((pid, year_str))
            if pstats:
                entry["W"] = pstats["W"]
                entry["L"] = pstats["L"]
                entry["SO"] = pstats["SO"]
                era = compute_era(pstats["ER"], pstats["IPouts"])
                if era is not None:
                    entry["ERA"] = era
                enriched_pitchers += 1

            enrich_player(entry, pid, year, lahman)
            enriched["pitchers"]["closer"] = entry

        years_data[year_str] = enriched

    # Season records
    season_records = {}
    for year_str in years_data:
        year = int(year_str)
        if year in lahman["records"]:
            season_records[year_str] = lahman["records"][year]

    # Leaderboards
    leaderboards = build_leaderboards(years_data, lahman)

    output = {
        "team": "NYA",
        "teamName": "New York Yankees",
        "years": years_data,
        "eras": ERAS,
        "eraQuotes": ERA_QUOTES,
        "wsWon": sorted(WS_WON),
        "wsLost": sorted(WS_LOST),
        "seasonRecords": season_records,
        "onThisDate": ON_THIS_DATE,
        "leaderboards": leaderboards,
    }

    os.makedirs(os.path.dirname(OUTPUT), exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(output, f, separators=(",", ":"))

    size_kb = os.path.getsize(OUTPUT) / 1024
    print(f"\nWrote {OUTPUT} ({size_kb:.1f} KB)")
    print(f"  {len(years_data)} years ({min(years_data)}–{max(years_data)})")
    print(f"  {len(WS_WON)} WS wins, {len(WS_LOST)} WS losses")
    print(f"  Enriched {enriched_batters} batter-seasons, {enriched_pitchers} pitcher-seasons")
    print(f"  {len(season_records)} season records, {len(ON_THIS_DATE)} OTD moments")
    print(f"  Leaderboards: {', '.join(f'{k}({len(v)})' for k,v in leaderboards.items())}")


if __name__ == "__main__":
    process()
