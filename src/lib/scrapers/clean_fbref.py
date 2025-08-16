import os
import re
import pandas as pd
from io import StringIO

CORE_FEATURES = [
    # Identity / context
    "Player", "Nation", "Age", "Pos", "Squad", "Season", "Min",

    # Attacking output
    "Gls", "Ast", "xG", "xA", "npxG", "xAG", "G+A", "npxG+xAG",
    "Sh", "SoT", "SoT%", "G/Sh", "G/SoT",

    # Progression
    "PrgC", "PrgP", "PrgR",

    # Passing / creation
    "KP", "1/3", "PPA", "CrsPA", "Cmp%", "TotDist", "PrgDist",

    # GCA/SCA
    "SCA", "GCA", "SCA90", "GCA90",

    # Defensive
    "Tkl", "TklW", "Int", "Blocks", "Clr", "Tkl+Int",

    # Possession / carrying
    "Touches", "Succ", "Succ%", "Carries", 

    # Discipline
    "CrdY", "CrdR", "Fls", "Fld",

    # Goalkeeping (only relevant if Pos == GK)
    "GA", "Saves", "Save%", "CS", "PSxG", "PSxG+/-", "#OPA", "AvgDist",

    # Playing time context (keep if present)
    "MP", "Starts", "90s", "Mn/MP", "PPM", "+/-", "+/-90",
]

ALIASES = [
    (r"^Player\b.*", "Player"),
    (r"^Nation\b.*", "Nation"),
    (r"^Age\b.*", "Age"),
    (r"^Pos(ition)?\b.*", "Pos"),
    (r"^Squad\b.*", "Squad"),
    (r"^Comp\b.*", "Comp"),
    (r"^Minutes?$|^Min\b.*", "Min"),
    (r"^\s*90s\b.*", "90s"),
    (r"^Starts\b.*", "Starts"),
    (r"^MP\b.*", "MP"),
    (r"^Gls\b.*", "Gls"),
    (r"^Ast\b.*", "Ast"),
    (r"^G\+A\b.*", "G+A"),
    (r"^G-PK\b.*", "G-PK"),
    (r"^PKatt\b.*", "PKatt"),
    (r"^PK\b(?![A-Za-z]).*", "PK"),
    (r"^CrdY\b.*", "CrdY"),
    (r"^CrdR\b.*", "CrdR"),
    (r"^xG\b.*", "xG"),
    (r"^npxG\b.*", "npxG"),
    (r"^xAG\b.*", "xAG"),
    (r"^npxG\+xAG\b.*", "npxG+xAG"),
    (r"^PrgC\b.*", "PrgC"),
    (r"^PrgP\b.*", "PrgP"),
    (r"^PrgR\b.*", "PrgR"),
    (r"^xG\+xAG\b.*", "xG+xAG"),
    (r"^Sh\b(?![a-zA-Z]).*", "Sh"),
    (r"^SoT\b.*", "SoT"),
    (r"^SoT%$", "SoT%"),
    (r"^G/Sh\b.*", "G/Sh"),
    (r"^G/SoT\b.*", "G/SoT"),
    (r"^Dist\b.*", "Dist"),
    (r"^Cmp%(\b|_).*", "Cmp%"),
    (r"^TotDist\b.*", "TotDist"),
    (r"^PrgDist(\b|_).*", "PrgDist"),
    (r"^KP\b.*", "KP"),
    (r"^1/3\b.*", "1/3"),
    (r"^PPA\b.*", "PPA"),
    (r"^CrsPA\b.*", "CrsPA"),
    (r"^SCA90\b.*", "SCA90"),
    (r"^GCA90\b.*", "GCA90"),
    (r"^SCA\b.*", "SCA"),
    (r"^GCA\b.*", "GCA"),
    (r"^Tkl\+Int\b.*", "Tkl+Int"),
    (r"^TklW\b.*", "TklW"),
    (r"^Tkl\b.*", "Tkl"),
    (r"^Int\b.*", "Int"),
    (r"^Blocks\b.*", "Blocks"),
    (r"^Clr\b.*", "Clr"),
    (r"^Touches\b.*", "Touches"),
    (r"^Succ%$", "Succ%"),
    (r"^Succ\b.*", "Succ"),
    (r"^Carries\b.*", "Carries"),
    (r"^Rec\b.*", "Rec"),
    (r"^Fls\b.*", "Fls"),
    (r"^Fld\b.*", "Fld"),
    # GK
    (r"^GA90?$|^GA\b.*", "GA"),
    (r"^Saves\b.*", "Saves"),
    (r"^Save%$", "Save%"),
    (r"^CS%?$|^CS\b.*", "CS"),
    (r"^PSxG\+/-$", "PSxG+/-"),
    (r"^PSxG\b.*", "PSxG"),
    (r"^#?OPA/90$", "#OPA/90"),
    (r"^#?OPA$", "#OPA"),
    (r"^AvgDist\b.*", "AvgDist"),
    # playing time context
    (r"^\+/-90$", "+/-90"),
    (r"^\+/-$", "+/-"),
    (r"^PPM\b.*", "PPM"),
    (r"^Mn/MP$", "Mn/MP"),
]

NUMERIC_PREFERRED = set([
    "Age","Min","90s","Gls","Ast","G+A","G-PK","PK","PKatt","CrdY","CrdR",
    "xG","npxG","xAG","npxG+xAG","PrgC","PrgP","PrgR","xG+xAG",
    "Sh","SoT","SoT%","G/Sh","G/SoT","Dist","Cmp%","TotDist","PrgDist",
    "KP","1/3","PPA","CrsPA","SCA","GCA","SCA90","GCA90",
    "Tkl","TklW","Int","Blocks","Clr","Tkl+Int",
    "Touches","Succ","Succ%","Carries","GA","Saves","Save%","CS","PSxG","PSxG+/-","#OPA","#OPA/90","AvgDist",
    "MP","Starts","Mn/MP","PPM","+/-","+/-90"
])

def _dedupe_columns_collapse_first(df: pd.DataFrame) -> pd.DataFrame:
    """
    Collapse duplicate-named columns by taking the first non-null per row.
    """
    if df.columns.duplicated().any():
        df = (df.T.groupby(level=0).apply(lambda g: g.bfill().iloc[0]).T)
        # Make dtype decisions explicit to avoid FutureWarning
        df = df.infer_objects(copy=False)
    return df

def _flatten_columns(df: pd.DataFrame) -> pd.DataFrame:
    if isinstance(df.columns, pd.MultiIndex):
        df.columns = ["_".join([str(c) for c in tup if str(c) != ""]).strip() for tup in df.columns]
    else:
        df.columns = [str(c).strip() for c in df.columns]
    return df

def _apply_aliases(df: pd.DataFrame) -> pd.DataFrame:
    renamed = {}
    for col in df.columns:
        new = None
        for pat, target in ALIASES:
            if re.search(pat, col, flags=re.IGNORECASE):
                new = target
                break
        renamed[col] = new or col
    df = df.rename(columns=renamed)
    return df

def _drop_header_echo_rows(df: pd.DataFrame) -> pd.DataFrame:
    if "Player" in df.columns:
        df = df[df["Player"].notna()]
        df = df[df["Player"].astype(str).str.lower() != "player"]
    return df

def _coerce_numeric(df: pd.DataFrame) -> pd.DataFrame:
    for c in df.columns:
        if c in NUMERIC_PREFERRED:
            df[c] = pd.to_numeric(df[c], errors="coerce")
    return df

def clean_to_core_features(df: pd.DataFrame, season: str | None = None) -> pd.DataFrame:
    df = _flatten_columns(df)
    df = _apply_aliases(df)

    # ➕ collapse duplicate columns created by aliasing/merging
    df = _dedupe_columns_collapse_first(df)

    df = _drop_header_echo_rows(df)

    # standardize keys
    for k in ("Player", "Squad"):
        if k in df.columns:
            df[k] = df[k].astype(str).str.strip()

    if season is not None:
        df["Season"] = season

    # Keep only available target columns
    keep = [c for c in CORE_FEATURES if c in df.columns]
    missing = [c for c in CORE_FEATURES if c not in df.columns]

    cleaned = df[keep].copy()

    # ➕ ensure no duplicates remain in the kept set (safety)
    if cleaned.columns.duplicated().any():
        cleaned = _dedupe_columns_collapse_first(cleaned)

    # numeric coercion (now guaranteed Series per column)
    cleaned = _coerce_numeric(cleaned)

    # drop exact duplicates on identity cols
    id_keys = [k for k in ["Player", "Squad", "Season"] if k in cleaned.columns]
    if id_keys:
        cleaned = cleaned.drop_duplicates(subset=id_keys, keep="first")

    if missing:
        print(f"⚠️ Missing {len(missing)} expected columns (skipped): {missing[:12]}{'...' if len(missing)>12 else ''}")
    
    if {"npxG", "xAG"}.issubset(cleaned.columns):
        cleaned["npxG+xAG"] = cleaned["npxG"] + cleaned["xAG"]

    if {"SoT", "Sh"}.issubset(cleaned.columns):
        denom = cleaned["Sh"].replace(0, pd.NA)
        cleaned["SoT%"] = (cleaned["SoT"] / denom) * 100

    return cleaned

def load_and_clean(csv_path: str, season: str | None = None) -> pd.DataFrame:
    df = pd.read_csv(csv_path)
    return clean_to_core_features(df, season=season)

if __name__ == "__main__":
    in_csv  = os.path.join("..", "data", "fbref_merged_2024_2025.csv")   # adjust as needed
    out_dir = os.path.join("..", "data")
    os.makedirs(out_dir, exist_ok=True)

    cleaned = load_and_clean(in_csv, season="2024-2025")
    out_csv = os.path.join(out_dir, "fbref_clean_2024_2025.csv")
    cleaned.to_csv(out_csv, index=False)
    print(f"✅ Saved cleaned file: {out_csv} (shape={cleaned.shape})")
