from __future__ import annotations
from pathlib import Path
import joblib
import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[4]
LEAGUE_SLUG = "pl"
DATA_DIR   = ROOT / "src/lib/data"               
MODELS_DIR = ROOT / f"src/lib/ml/v1/{LEAGUE_SLUG}"  
PIPE = joblib.load(MODELS_DIR / "pipeline.joblib")


LEAGUE_NAME = "Premier League"            
BASES = ["gls_per90","ast_per90","sot_per90","sca_per90","tklint_per90","blocks_per90","prgp_per90","prgc_per90","prgr_per90","avg_age_mwa"]
TREND_FEATURES = [f"trend_{m}" for m in BASES] + ["trend_team_minutes"]
NON_TREND_NUMS = [f"last1_{m}" for m in BASES] + [f"expw_{m}" for m in BASES] + ["last1_team_minutes","expw_team_minutes","history_len","promoted","missing_prev"]
NUM_FEATURES = NON_TREND_NUMS + TREND_FEATURES

def previous_season(season: str) -> str:
    a, b = season.split("-")
    y1, y2 = int(a), int(b)
    return f"{y1-1}-{y1}"
def _num(s): return pd.to_numeric(s, errors="coerce")
def _normalize_cols(df: pd.DataFrame) -> pd.DataFrame:
    lo = {c.lower(): c for c in df.columns}
    alias = {
        "squad":"Squad","team":"Squad","club":"Squad",
        "comp":"Comp","competition":"Comp","league":"Comp",
        "player":"Player","name":"Player",
        "min":"Min","minutes":"Min",
        "gls":"Gls","goals":"Gls","ast":"Ast","assists":"Ast",
        "sh":"Sh","shots":"Sh","sot":"SoT",
        "prgp":"PrgP","prgc":"PrgC","prgr":"PrgR",
        "tkl+int":"Tkl+Int","tkl":"Tkl","int":"Int",
        "blocks":"Blocks","age":"Age","sca":"SCA",
    }
    for k,t in alias.items():
        if k in lo and t not in df.columns:
            df = df.rename(columns={lo[k]: t})
    if "Tkl+Int" not in df.columns and {"Tkl","Int"}.issubset(df.columns):
        df["Tkl+Int"] = _num(df["Tkl"]) + _num(df["Int"])
    df.columns = [str(c).strip() for c in df.columns]
    return df

def _load_players(season: str, league_name: str) -> pd.DataFrame:
    p = DATA_DIR / f"fbref_merged_{season.replace('-', '_')}.csv"
    df = pd.read_csv(p)
    df = _normalize_cols(df)
    if "Comp" in df.columns:
        df = df[df["Comp"].astype(str).str.lower().str.contains(league_name.lower(), na=False)]
    for k in ["Player","Squad"]: 
        if k in df.columns: df[k] = df[k].astype(str).str.strip()
    return df

def _team_features_from_players(players: pd.DataFrame) -> pd.DataFrame:
    df = _normalize_cols(players)
    if "Comp" in df.columns:
        df = df[df["Comp"].astype(str).str.lower().str.contains(LEAGUE_NAME.lower(), na=False)]
    g = df.groupby("Squad", as_index=False)
    feats = []
    for squad, gg in g:
        mins = _num(gg.get("Min", 0)).fillna(0)
        tot_min = float(mins.sum())
        def per90_total(col):
            total = float(_num(gg.get(col, 0)).fillna(0).sum())
            return (total / (tot_min / 90.0)) if tot_min > 0 else np.nan
        def mwa(col):
            s = _num(gg.get(col, 0)).fillna(0)
            return float((s*mins).sum()/mins.sum()) if mins.sum() > 0 else np.nan
        feats.append({
            "Squad": squad,
            "team_minutes": tot_min,
            "gls_per90": per90_total("Gls"),
            "ast_per90": per90_total("Ast"),
            "sh_per90": per90_total("Sh"),
            "sot_per90": per90_total("SoT"),
            "sca_per90": per90_total("SCA"),
            "tklint_per90": per90_total("Tkl+Int"),
            "blocks_per90": per90_total("Blocks"),
            "prgp_per90": per90_total("PrgP"),
            "prgc_per90": per90_total("PrgC"),
            "prgr_per90": per90_total("PrgR"),
            "avg_age_mwa": mwa("Age"),
        })
    return pd.DataFrame(feats)

def _expw(vals: list[float], half_life=1.0) -> float:
    arr = np.array(vals, float)
    m = np.isfinite(arr)
    if not m.any(): return np.nan
    ages = np.arange(len(arr), dtype=float) 
    w = 0.5 ** (ages / half_life)
    w = (w[m] / w[m].sum())
    return float((arr[m] * w).sum())

def _trend(vals: list[float]) -> float:
    arr = np.array(vals, float)
    m = np.isfinite(arr)
    if m.sum() < 2: return 0.0
    x = np.arange(len(arr), dtype=float)[m]
    y = arr[m]
    return float(np.polyfit(x, y, 1)[0])

def _history_seasons(target_season: str, available: list[str]) -> list[str]:
    ty = int(target_season.split("-")[0])
    hist = [s for s in available if int(s.split("-")[0]) <= ty-1]
    hist.sort(key=lambda s: int(s.split("-")[0]), reverse=True)
    return hist

def apply_transfer_to_players(
    team_players_prev: pd.DataFrame,
    incoming_row: pd.Series,
    projected_minutes_in: int,
    outgoing_minutes: dict[str, int] | None = None,
    cross_league_scale: float = 1.0, 
) -> pd.DataFrame:

    df = _normalize_cols(team_players_prev.copy())
    COUNT_COLS = ["Min","Gls","Ast","Sh","SoT","SCA","Tkl","Int","Blocks","PrgP","PrgC","PrgR","Tkl+Int"]
    for c in COUNT_COLS:
        if c in df.columns:
            df[c] = _num(df[c]).astype(float)

    team_minutes_baseline = float(_num(df.get("Min", 0)).fillna(0).sum())

    if outgoing_minutes:
        for name, mins_out in outgoing_minutes.items():
            if mins_out <= 0:
                continue
            mask = df["Player"].astype(str).str.lower() == str(name).lower()
            if not mask.any():
                continue
            cur_min = float(_num(df.loc[mask, "Min"]).sum())
            if cur_min <= 0:
                continue
            frac = max(0.0, min(mins_out / cur_min, 1.0))
            for col in COUNT_COLS:
                if col in df.columns:
                    cur = _num(df.loc[mask, col]).astype(float)
                    df.loc[mask, col] = (cur * (1.0 - frac)).astype(float)

    inc = _normalize_cols(pd.DataFrame([incoming_row])).iloc[0].to_dict()
    inc["Squad"] = df["Squad"].iloc[0]
    if "Comp" in df.columns:
        inc["Comp"] = df["Comp"].iloc[0]
    inc["Min"] = float(projected_minutes_in)

    per90_to_total = [
        ("gls_per90","Gls"), ("ast_per90","Ast"), ("sot_per90","SoT"),
        ("sca_per90","SCA"), ("prgp_per90","PrgP"), ("prgc_per90","PrgC"),
        ("prgr_per90","PrgR"), ("tklint_per90","Tkl+Int"),
    ]
    for p90, tot in per90_to_total:
        if p90 in inc and inc[p90] is not None and not pd.isna(inc[p90]):
            inc[tot] = cross_league_scale * float(inc[p90]) * inc["Min"] / 90.0

    for col in COUNT_COLS:
        if col == "Min":
            continue
        if col in inc and inc[col] is not None and not pd.isna(inc[col]):
            inc[col] = cross_league_scale * float(inc[col])

    df = pd.concat([df, pd.DataFrame([inc])], ignore_index=True)

    total_after = float(_num(df.get("Min", 0)).fillna(0).sum())
    delta = total_after - team_minutes_baseline

    if abs(delta) > 1e-6:
        if "Pos" in df.columns:
            outfield_mask = ~df["Pos"].astype(str).str.contains("GK", case=False, na=False)
        else:
            outfield_mask = pd.Series(True, index=df.index)

        incoming_idx = df.index[-1]
        candidates = df.index[outfield_mask & (df.index != incoming_idx)]

        if delta > 0:
            df = df.copy()
            donors = df.loc[candidates].copy()
            donors["_min"] = _num(donors.get("Min", 0)).fillna(0).astype(float)
            donors = donors.sort_values("_min", ascending=False)
            remaining = delta
            cap_fraction = 0.25
            for idx, rowp in donors.iterrows():
                if remaining <= 1e-6:
                    break
                cur = float(rowp["_min"])
                if cur <= 0:
                    continue
                take = min(cur * cap_fraction, remaining)
                factor = max(0.0, (cur - take) / max(cur, 1e-9))
                for col in COUNT_COLS:
                    if col in df.columns:
                        curv = _num(df.at[idx, col]).astype(float) if np.ndim(df.at[idx, col]) != 0 else float(_num(df.at[idx, col]))
                        df.at[idx, col] = float(curv) * factor
                remaining -= take

            if remaining > 1e-6:
                mins = _num(df.loc[candidates, "Min"]).fillna(0).astype(float)
                tot = float(mins.sum())
                if tot > 0:
                    frac = (mins / tot).clip(lower=0, upper=1)
                    scale = 1.0 - (remaining * frac / mins.replace(0, np.nan)).fillna(0)
                    scale = scale.clip(lower=0.0)
                    for idx, fac in scale.items():
                        for col in COUNT_COLS:
                            if col in df.columns:
                                df.at[idx, col] = float(_num(df.at[idx, col])) * float(fac)

        else:
            need = -delta
            pool = df.loc[candidates].copy()
            pool_min = float(_num(pool.get("Min", 0)).fillna(0).sum())
            if pool_min > 0:
                factor_up = 1.0 + need / pool_min
                for idx in pool.index:
                    for col in COUNT_COLS:
                        if col in df.columns:
                            df.at[idx, col] = float(_num(df.at[idx, col])) * float(factor_up)

    for c in COUNT_COLS:
        if c in df.columns:
            arr = _num(df[c]).astype(float)
            arr[arr < 0] = 0.0
            df[c] = arr

    return df
def build_feature_vector_baseline(team: str, target_season: str) -> pd.DataFrame:
    prev = previous_season(target_season)              
    available = sorted({p.name.split("fbref_merged_")[-1].split(".csv")[0].replace("_","-")
                        for p in DATA_DIR.glob("fbref_merged_*.csv")})
    hist = _history_seasons(target_season, available)
    if not hist or hist[0] != prev:
        raise ValueError(f"Expected history's most recent season to be {prev}, found {hist[:1]}")

    hist_rows = []
    for s in hist:                                     
        feats = _team_features_from_players(_load_players(s, LEAGUE_NAME))
        row = feats[feats["Squad"].str.lower() == team.lower()]
        if not row.empty:
            hist_rows.append(row.iloc[0].to_dict())

    out = {"Season": target_season, "Squad": team,
           "history_len": len(hist_rows), "promoted": 0, "missing_prev": int(len(hist_rows)==0)}
    for m in BASES + ["team_minutes"]:
        seq = [r.get(m, np.nan) for r in hist_rows]    
        out[f"last1_{m}"] = seq[0] if seq else np.nan
        out[f"expw_{m}"]  = _expw(seq) if seq else np.nan
        out[f"trend_{m}"] = _trend(seq) if seq else 0.0
    X = pd.DataFrame([out])
    for c in NUM_FEATURES:
        if c not in X.columns: X[c] = np.nan
    return X[["Season","Squad"] + NUM_FEATURES]

def build_feature_vector_with_swap(
    team: str,
    target_season: str,
    incoming_player_name: str,
    incoming_source_season: str | None, 
    projected_minutes_in: int,
    outgoing_minutes: dict[str,int] | None = None,
    cross_league_scale: float = 1.0,
) -> pd.DataFrame:
    prev = previous_season(target_season)              
    if incoming_source_season is not None and incoming_source_season != prev:
        raise ValueError(f"incoming_source_season must be {prev} for target {target_season}, got {incoming_source_season}")

   
    available = sorted({p.name.split("fbref_merged_")[-1].split(".csv")[0].replace("_","-")
                        for p in DATA_DIR.glob("fbref_merged_*.csv")})
    hist = _history_seasons(target_season, available)
    if not hist or hist[0] != prev:
        raise ValueError(f"Expected history's most recent season to be {prev}, found {hist[:1]}")

    prev_players = _load_players(prev, LEAGUE_NAME)
    team_prev = prev_players[prev_players["Squad"].str.lower() == team.lower()].copy()
    if team_prev.empty:
        raise ValueError(f"{team} not found in {prev} players.")

    src_df = _load_players(prev, "")
    inc_rows = src_df[src_df["Player"].str.lower() == incoming_player_name.lower()]
    if inc_rows.empty:
        raise ValueError(f"Incoming player {incoming_player_name} not found in season {prev}.")
    incoming_row = inc_rows.iloc[0]

    team_prev_swapped = apply_transfer_to_players(
        team_prev, incoming_row, projected_minutes_in,
        outgoing_minutes, cross_league_scale=cross_league_scale
    )

    hist_rows = []
    for s in hist:                                     
        feats = (_team_features_from_players(team_prev_swapped)
                 if s == prev else
                 _team_features_from_players(_load_players(s, LEAGUE_NAME)))
        row = feats[feats["Squad"].str.lower() == team.lower()]
        if not row.empty:
            hist_rows.append(row.iloc[0].to_dict())

    out = {"Season": target_season, "Squad": team,
           "history_len": len(hist_rows), "promoted": 0, "missing_prev": int(len(hist_rows)==0)}
    for m in BASES + ["team_minutes"]:
        seq = [r.get(m, np.nan) for r in hist_rows]
        out[f"last1_{m}"] = seq[0] if seq else np.nan
        out[f"expw_{m}"]  = _expw(seq) if seq else np.nan
        out[f"trend_{m}"] = _trend(seq) if seq else 0.0

    X = pd.DataFrame([out])
    for c in NUM_FEATURES:
        if c not in X.columns: X[c] = np.nan
    return X[["Season","Squad"] + NUM_FEATURES]

def predict_with_and_without_transfer(
    team: str,
    target_season: str,
    incoming_player_name: str,
    projected_minutes_in: int,
    outgoing_minutes: dict[str,int] | None = None,
    cross_league_scale: float = 1.0,
) -> dict:
    X_base = build_feature_vector_baseline(team, target_season)
    base_pred = float(PIPE.predict(X_base)[0])

    X_swap = build_feature_vector_with_swap(
        team, target_season, incoming_player_name, None,
        projected_minutes_in, outgoing_minutes, cross_league_scale
    )
    with_pred = float(PIPE.predict(X_swap)[0])

    return {
        "season_target": target_season,
        "season_features_from": previous_season(target_season),
        "points_base": base_pred,
        "points_with": with_pred,
        "delta": with_pred - base_pred
    }
