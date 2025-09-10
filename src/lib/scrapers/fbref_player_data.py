import os
import time
from io import StringIO

import pandas as pd
import requests
from bs4 import BeautifulSoup, Comment

table_types = {
    "standard": "stats",
    "shooting": "shooting",
    "passing": "passing",
    "passing_types": "passing_types",
    "gca": "gca",
    "defense": "defense",
    "possession": "possession",
    "playing_time": "playingtime",
    "misc": "misc",
    "keepers": "keepers",
    "keepersadv": "keepersadv",
}

TABLE_ID_OVERRIDES = {
    "stats": "stats_standard",
    "keepers": "stats_keeper",
    "keepersadv": "stats_keeper_adv",
    "playingtime": "stats_playing_time", 
}

HEADERS = {"User-Agent": "Mozilla/5.0"}

def _flatten_columns(df: pd.DataFrame) -> pd.DataFrame:
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[-1] if isinstance(c, tuple) else c for c in df.columns.values]
    df.columns = [str(c).strip() for c in df.columns]
    return df

def _clean_body(df: pd.DataFrame) -> pd.DataFrame:
    if "Rk" in df.columns:
        df = df[df["Rk"].astype(str).str.lower() != "rk"]
    if "Player" in df.columns:
        df = df[df["Player"].astype(str).str.lower() != "player"]
    df = df.dropna(how="all")
    for k in ["Player", "Squad", "Comp"]:
        if k in df.columns:
            df[k] = df[k].astype(str).str.strip()
    return df

def _standardize_keys(df: pd.DataFrame) -> pd.DataFrame:
    rename_map = {}
    for alt in ["Team", "Club"]:
        if alt in df.columns and "Squad" not in df.columns:
            rename_map[alt] = "Squad"
    for alt in ["Competition", "League"]:
        if alt in df.columns and "Comp" not in df.columns:
            rename_map[alt] = "Comp"
    if rename_map:
        df = df.rename(columns=rename_map)
    needed = {"Player", "Squad", "Comp"}
    if needed.issubset(df.columns):
        df = df.dropna(subset=list(needed))
    return df

def parse_fbref_table_by_id(html: str, table_id: str) -> pd.DataFrame | None:
    soup = BeautifulSoup(html, "html.parser")

    t = soup.find("table", id=table_id)
    if t:
        df = pd.read_html(StringIO(str(t)))[0]
        return _standardize_keys(_clean_body(_flatten_columns(df)))

    comments = soup.find_all(string=lambda text: isinstance(text, Comment))
    for c in comments:
        try:
            sub = BeautifulSoup(c, "html.parser") 
            t2 = sub.find("table", id=table_id)
            if t2:
                df = pd.read_html(StringIO(str(t2)))[0]
                return _standardize_keys(_clean_body(_flatten_columns(df)))
        except Exception:
            continue
    return None

def extract_table_from_url(url: str, table_id: str) -> pd.DataFrame | None:
    try:
        print(f"Scraping from {url}")
        res = requests.get(url, headers=HEADERS, timeout=30)
        res.raise_for_status()
        df = parse_fbref_table_by_id(res.text, table_id)
        if df is None:
            print(f"⚠️ No table with id '{table_id}' found.")
        return df
    except Exception as e:
        print(f"⚠️ Failed to fetch from {url}: {e}")
        return None

def collect_season_player_stats(season: str, save_csv: bool = True):
    base_url = f"https://fbref.com/en/comps/Big5/{season}/"
    all_tables: dict[str, pd.DataFrame] = {}

    for name, path in table_types.items():
        url = f"{base_url}{path}/players/{season}-Big-5-European-Leagues-Stats"
        table_id = TABLE_ID_OVERRIDES.get(path, f"stats_{path}")
        df = extract_table_from_url(url, table_id)
        time.sleep(3.0)
        if df is not None:
            all_tables[name] = df
        else:
            print(f"⚠️ Failed to fetch {name}")

    if "standard" not in all_tables:
        raise ValueError("Standard stats table missing. Can't proceed with merging.")

    merged_df = all_tables["standard"].copy()
    print(f"Base rows: {len(merged_df)}; cols: {len(merged_df.columns)}")

    keys = ["Player", "Squad", "Comp"]
    for name, df in all_tables.items():
        if name == "standard":
            continue
        if not set(keys).issubset(df.columns):
            print(f" Skipping {name}: missing merge keys {set(keys) - set(df.columns)}")
            continue
        df = df.drop_duplicates(subset=keys)
        try:
            before_cols = len(merged_df.columns)
            merged_df = pd.merge(merged_df, df, on=keys, how="left", suffixes=("", f"_{name}"))
            print(f" Merged {name}: +{len(merged_df.columns) - before_cols} cols")
        except Exception as e:
            print(f"Error merging {name}: {e}")

    merged_df["Season"] = season

    if save_csv:
        out_dir = os.path.join("..", "data")
        os.makedirs(out_dir, exist_ok=True)
        out_path = os.path.join(out_dir, f"fbref_merged_{season.replace('-', '_')}.csv")
        merged_df.to_csv(out_path, index=False)
        print(f" Saved merged stats to {out_path}")

    return merged_df

if __name__ == "__main__":
    season = "2024-2025"
    collect_season_player_stats(season)
