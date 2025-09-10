import os
import re
import glob
import argparse
import pandas as pd

KEEP_SCHEMA = [
    # identity
    "Squad", "Comp", "Season",
    # table/standings
    "MP", "W", "D", "L", "GF", "GA", "GD", "Pts",
    # possession
    "Poss",
    # shooting
    "Sh", "SoT", "Sh/90", "SoT/90", "G/Sh", "G/SoT", "SoT%",
    # expected goals
    "xG", "xGA", "xGD", "xGD/90",
    # passing / progression
    "Cmp%", "TotDist", "PrgDist", "PrgP", "KP", "1/3", "PPA", "CrsPA",
    # chance creation
    "SCA", "GCA", "SCA90", "GCA90",
    # defense
    "Tkl", "Int", "Blocks", "Clr", "Tkl+Int",
    # discipline
    "CrdY", "CrdR",
]

ALIASES = {
    "Matches": "MP",
    "Match Played": "MP",
    "Cmp%_passing": "Cmp%",
    "PrgP_passing": "PrgP",
    "KP_passing": "KP",
    "1/3_passing": "1/3",
    "PPA_passing": "PPA",
    "CrsPA_passing": "CrsPA",
    "SCA_gca": "SCA",
    "GCA_gca": "GCA",
    "SCA90_gca": "SCA90",
    "GCA90_gca": "GCA90",
    "Blocks_defense": "Blocks",
    "Sh_defense": "Blocks",  
    "Clr_defense": "Clr",
    "Tkl+Int_defense": "Tkl+Int",
}

PERCENT_LIKE = {"Poss", "Cmp%", "SoT%"}

def _strip_percent(x):
    if pd.isna(x): return x
    if isinstance(x, str): return x.replace('%','').strip()
    return x

def _to_num(series):
    return pd.to_numeric(series.map(_strip_percent), errors="coerce")

def ensure_cols(df, cols):
    for c in cols:
        if c not in df.columns:
            df[c] = pd.NA
    return df

def pick(df, names):
    for n in names:
        if n in df.columns:
            return df[n]
    return pd.Series([pd.NA]*len(df), index=df.index)

def compute_xgd(df):
    xg  = pd.to_numeric(pick(df, ["xG"]), errors="coerce")
    xga = pd.to_numeric(pick(df, ["xGA", "xG Allowed"]), errors="coerce")
    return xg - xga

def normalize_columns(df):
    df = df.copy()
    df.columns = [str(c).strip() for c in df.columns]
    for src, tgt in ALIASES.items():
        if src in df.columns and tgt not in df.columns:
            df.rename(columns={src: tgt}, inplace=True)
    if "Squad" in df.columns:
        df = df[df["Squad"].astype(str).str.len() > 0]
        df = df[df["Squad"].astype(str).str.lower() != "squad"]
    return df

def guess_season_from_filename(path):
    m = re.search(r"(\d{4}_\d{4})", os.path.basename(path))
    return m.group(1).replace("_","-") if m else None

def guess_comp_from_filename(path):
    base = os.path.basename(path).lower()
    if base.startswith("pl_"): return "Premier League"
    if base.startswith("laliga_"): return "La Liga"
    if base.startswith("seriea_"): return "Serie A"
    if base.startswith("bundesliga_"): return "Bundesliga"
    if base.startswith("ligue1_") or base.startswith("ligue-1_"): return "Ligue 1"
    return pd.NA

def clean_team_df(raw: pd.DataFrame, season_hint=None, comp_hint=None) -> pd.DataFrame:
    df = normalize_columns(raw)

    if "Season" not in df.columns or df["Season"].isna().all():
        df["Season"] = season_hint if season_hint else pd.NA
    if "Comp" not in df.columns or df["Comp"].isna().all():
        df["Comp"] = comp_hint if comp_hint else pd.NA

    if "xGD" not in df.columns:
        df["xGD"] = compute_xgd(df)
    if "xGD/90" not in df.columns:
        df["xGD/90"] = pd.NA  

    for col in df.columns:
        if col in {"Squad", "Comp", "Season"}:
            continue
        if col in PERCENT_LIKE:
            df[col] = _to_num(df[col])
        else:
            df[col] = pd.to_numeric(df[col], errors="coerce")

    df = ensure_cols(df, KEEP_SCHEMA)
    return df[KEEP_SCHEMA].copy()

def main():
    ap = argparse.ArgumentParser(description="Clean FBref team merged files (per-season outputs only).")
    ap.add_argument("--glob", required=True, help="Input glob, e.g. ../data/pl_*_team_merged.csv")
    ap.add_argument("--out-dir", default="../data", help="Output directory")
    args = ap.parse_args()

    paths = sorted(glob.glob(args.glob))
    if not paths:
        print(f"No files matched: {args.glob}")
        return

    os.makedirs(args.out_dir, exist_ok=True)

    for p in paths:
        print(f"Cleaning: {p}")
        df_raw = pd.read_csv(p)

        season_hint = guess_season_from_filename(p)
        comp_hint   = guess_comp_from_filename(p)

        df_clean = clean_team_df(df_raw, season_hint, comp_hint)

        base = os.path.basename(p)
        out_name = base.replace("_team_merged.csv", "_team_clean.csv")
        out_path = os.path.join(args.out_dir, out_name)
        df_clean.to_csv(out_path, index=False)
        print(f"  → saved {out_path} ({len(df_clean)} rows, {len(df_clean.columns)} cols)")

if __name__ == "__main__":
    main()
