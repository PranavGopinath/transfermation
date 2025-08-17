# fbref_pl_team_overview_tables.py
# Scrapes TEAM ("Squad ...") tables from the PL overview page:
# https://fbref.com/en/comps/9/<SEASON>/<SEASON>-Premier-League-Stats

import os
import time
import random
import hashlib
from io import StringIO
from typing import Dict, List, Optional, Tuple

import pandas as pd
import requests
from bs4 import BeautifulSoup, Comment
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry

SEASON = "2021-2022"                        
COMP_ID = 13                                
LEAGUE_SLUG = "Ligue-1"                
OUT_DIR = os.path.join("..", "data")
CACHE_HTML = True
CACHE_DIR = ".cache_fbref"

def _sleep(a=0.6, b=1.6): time.sleep(random.uniform(a, b))

HEADERS = {"User-Agent": "Mozilla/5.0"}

def make_session() -> requests.Session:
    s = requests.Session()
    retry = Retry(
        total=5,
        backoff_factor=1.5,
        status_forcelist=(429, 500, 502, 503, 504),
        allowed_methods=["GET"],
        raise_on_status=False,
    )
    s.headers.update(HEADERS)
    s.mount("https://", HTTPAdapter(max_retries=retry))
    s.mount("http://", HTTPAdapter(max_retries=retry))
    return s

SESSION = make_session()
if CACHE_HTML:
    os.makedirs(CACHE_DIR, exist_ok=True)

def _fetch_html(url: str) -> str:
    key = hashlib.sha1(url.encode()).hexdigest()
    path = os.path.join(CACHE_DIR, key + ".html")
    if CACHE_HTML and os.path.exists(path):
        with open(path, "r", encoding="utf-8") as f:
            return f.read()
    print(f"Fetching: {url}")
    resp = SESSION.get(url, timeout=30)
    tries = 0
    while resp.status_code == 429 and tries < 4:
        wait = (2 ** tries) + random.uniform(0, 1.2)
        print(f"429 Too Many Requests — backing off {wait:.1f}s")
        time.sleep(wait)
        resp = SESSION.get(url, timeout=30)
        tries += 1
    resp.raise_for_status()
    html = resp.text
    if CACHE_HTML:
        with open(path, "w", encoding="utf-8") as f:
            f.write(html)
    return html

def _flatten_columns(df: pd.DataFrame) -> pd.DataFrame:
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = [c[-1] if isinstance(c, tuple) else c for c in df.columns.values]
    df.columns = [str(c).strip() for c in df.columns]
    return df

def _clean_body(df: pd.DataFrame) -> pd.DataFrame:
    if "Rk" in df.columns:
        df = df[df["Rk"].astype(str).str.lower() != "rk"]
    for k in ["Player", "Squad", "Comp", "Team", "Club"]:
        if k in df.columns:
            df[k] = df[k].astype(str).str.strip()
    rename_map = {}
    if "Squad" not in df.columns:
        if "Team" in df.columns: rename_map["Team"] = "Squad"
        if "Club" in df.columns: rename_map["Club"] = "Squad"
    if "Comp" not in df.columns:
        if "Competition" in df.columns: rename_map["Competition"] = "Comp"
        if "League" in df.columns: rename_map["League"] = "Comp"
    if rename_map:
        df = df.rename(columns=rename_map)
    df = df.dropna(how="all")
    if "Squad" in df.columns:
        df = df.dropna(subset=["Squad"])
    return df

TARGET_SECTIONS: Dict[str, List[str]] = {
    "Squad Standard Stats":       ["Squad","MP","GF","GA","Pts","xG","xGA"],
    "Squad Goalkeeping":          ["Squad","GA","SoTA","Saves","Save%"],
    "Squad Advanced Goalkeeping": ["Squad","PSxG","PSxG/SoT","PSxG+/-"],
    "Squad Shooting":             ["Squad","Sh","SoT","SoT%","Sh/90"],
    "Squad Passing":              ["Squad","Cmp","Att","Cmp%","TotDist"],
    "Squad Pass Types":           ["Squad","KP","1/3","PPA","CrsPA"],
    "Squad Goal and Shot Creation":["Squad","SCA","GCA","SCA90","GCA90"],
    "Squad Defensive Actions":    ["Squad","Tkl","Int","Clr","Err"],
    "Squad Possession":           ["Squad","Touches","Drib","Carries"],
    "Squad Playing Time":         ["Squad","Min","90s","Starts","Compl"],
    "Squad Miscellaneous Stats":  ["Squad","CrdY","CrdR","Fls","Fld","Off"],
    "League Table / Standings":   ["Squad","W","D","L","Pts"],
}

def _score_match(cols: List[str], wanted: List[str]) -> int:
    cset = set(c.strip() for c in cols)
    wset = set(wanted)
    return len(cset.intersection(wset))

def _label_table(df: pd.DataFrame) -> Optional[str]:
    cols = [str(c) for c in df.columns]
    best_name, best_score = None, -1
    for name, sig in TARGET_SECTIONS.items():
        s = _score_match(cols, sig)
        if s > best_score:
            best_name, best_score = name, s
    return best_name if best_score >= 2 and "Squad" in df.columns else None

def _extract_all_tables_from_overview(html: str) -> List[pd.DataFrame]:
    soup = BeautifulSoup(html, "html.parser")
    frames: List[pd.DataFrame] = []

    def try_tables(tables_iter):
        for t in tables_iter:
            try:
                df = pd.read_html(StringIO(str(t)))[0]
                df = _clean_body(_flatten_columns(df))
                if "Squad" in df.columns or ("W" in df.columns and "Pts" in df.columns):
                    frames.append(df)
            except Exception:
                pass

    try_tables(soup.find_all("table"))
    for c in soup.find_all(string=lambda x: isinstance(x, Comment)):
        try:
            sub = BeautifulSoup(c, "html.parser")
            try_tables(sub.find_all("table"))
        except Exception:
            pass
    return frames

def scrape_pl_team_overview_tables(season: str) -> Dict[str, pd.DataFrame]:
    url = f"https://fbref.com/en/comps/{COMP_ID}/{season}/{season}-{LEAGUE_SLUG}-Stats"
    html = _fetch_html(url); _sleep()

    tables = _extract_all_tables_from_overview(html)

    labeled: Dict[str, pd.DataFrame] = {}
    for df in tables:
        name = _label_table(df)
        if not name:
            continue
        if name not in labeled:
            labeled[name] = df

    if "League Table / Standings" not in labeled:
        for df in tables:
            cols = set(df.columns)
            if {"Squad","W","D","L","Pts"}.issubset(cols):
                labeled["League Table / Standings"] = df
                break

    return labeled


def merge_squad_sections_to_wide(sections: Dict[str, pd.DataFrame], season: str) -> pd.DataFrame:
    """
    Merge all 'Squad …' tables into one wide team frame and attach Pts from standings.
    """
    squad_keys = [k for k in sections.keys() if k.startswith("Squad ")]
    if not squad_keys:
        raise RuntimeError("No 'Squad …' tables found to merge.")

    start_key = "Squad Standard Stats" if "Squad Standard Stats" in squad_keys else squad_keys[0]
    wide = sections[start_key].copy()

    wide = wide[wide["Squad"].astype(str).str.len() > 0]
    wide = wide.drop_duplicates(subset=["Squad"])

    for k in squad_keys:
        if k == start_key:
            continue
        df = sections[k].copy()
        if "Squad" not in df.columns:
            continue
        df = df[df["Squad"].astype(str).str.len() > 0]
        df = df.drop_duplicates(subset=["Squad"])

        dup_cols = set(wide.columns).intersection(set(df.columns)) - {"Squad"}
        df = df.drop(columns=list(dup_cols), errors="ignore")

        tag = k.replace("Squad ", "").replace(" ", "").lower()
        wide = pd.merge(wide, df, on="Squad", how="left", suffixes=("", f"_{tag}"))

    if "League Table / Standings" in sections:
        st = sections["League Table / Standings"]
        if {"Squad", "Pts"}.issubset(st.columns):
            st2 = st[["Squad", "Pts"]].drop_duplicates(subset=["Squad"])
            if "Pts" in wide.columns:
                wide = wide.drop(columns=["Pts"])
            wide = pd.merge(wide, st2, on="Squad", how="left")

    wide["Season"] = season
    wide["Comp"] = "Premier League"

    wide.columns = [str(c).strip() for c in wide.columns]
    return wide


if __name__ == "__main__":
    os.makedirs(OUT_DIR, exist_ok=True)

    sections = scrape_pl_team_overview_tables(SEASON)
    if not sections:
        print("⚠️ No sections found.")
    else:
        try:
            wide = merge_squad_sections_to_wide(sections, SEASON)
        except Exception as e:
            raise

        out_merged = os.path.join(OUT_DIR, f"ligue-1_{SEASON.replace('-', '_')}_team_merged.csv")
        wide.to_csv(out_merged, index=False)
        print(f"Saved merged team dataset: {out_merged}")
