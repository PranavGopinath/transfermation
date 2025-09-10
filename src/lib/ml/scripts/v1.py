from __future__ import annotations
import json, math
from dataclasses import dataclass
from pathlib import Path
from typing import Dict, List

import numpy as np
import pandas as pd
from scipy.stats import spearmanr

from sklearn.compose import ColumnTransformer
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error
from sklearn.linear_model import Ridge
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
import joblib
from xgboost import XGBRegressor
from pathlib import Path

# -------------------
# CONFIG (edit paths)
# -------------------

ROOT = Path(__file__).resolve().parents[4]

LEAGUE_NAME = "Premier League"  
LEAGUE_SLUG = "pl"

DATA_DIRS = [
    ROOT / "src/lib/data",
    ROOT / "src/ml/data/processed",
]
MODELS_DIR = ROOT / f"src/lib/ml/v1/{LEAGUE_SLUG}"
MODELS_DIR.mkdir(parents=True, exist_ok=True)

FEATURE_SEASONS = ["2021-2022", "2022-2023", "2023-2024"]
TARGET_SEASONS = ["2022-2023", "2023-2024", "2024-2025"]

CV_FOLDS = [dict(train=["2022-2023"], val="2023-2024")]
TEST_SEASON = "2024-2025"

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)


# -------------------
# IO helpers
# -------------------

def season_to_fname(season: str) -> str:
    return f"fbref_clean_{season.replace('-', '_')}.csv"

def load_player_df_for_season(season: str) -> pd.DataFrame | None:
    fname = season_to_fname(season)
    for d in DATA_DIRS:
        p = d / fname
        if p.exists():
            df = pd.read_csv(p)
            df["Season"] = season
            return df
    print(f"!! Missing player CSV for season {season} in {DATA_DIRS}")
    return None

def load_targets() -> pd.DataFrame:
    frames = []
    for season in TARGET_SEASONS:
        pat = f"*_{season.replace('-', '_')}_team_clean.csv"
        found_any = False
        for d in DATA_DIRS:
            for p in d.glob(pat):
                df = pd.read_csv(p)
                if "Comp" in df.columns:
                    df = df[df["Comp"].astype(str).str.strip() == LEAGUE_NAME]
                if df.empty: 
                    continue
                df["Season"] = season
                df["Squad"] = df["Squad"].astype(str).str.strip()
                pts_col = "Pts" if "Pts" in df.columns else ("Points" if "Points" in df.columns else None)
                if pts_col is None: 
                    continue
                df["points"] = pd.to_numeric(df[pts_col], errors="coerce")
                frames.append(df[["Season", "Squad", "points"]])
                found_any = True
        if not found_any:
            print(f"!! No team file found for {season} matching {pat} in {DATA_DIRS}")
    if not frames:
        raise FileNotFoundError("No targets assembled from team files.")
    return pd.concat(frames, ignore_index=True)

# -------------------
# Feature engineering (per season → team features)
# -------------------
NUMSAFE = lambda s: pd.to_numeric(s, errors="coerce")

def minutes_weighted_avg(series: pd.Series, minutes: pd.Series) -> float:
    s = NUMSAFE(series).fillna(0.0)
    m = NUMSAFE(minutes).fillna(0.0)
    wsum = (s * m).sum()
    denom = m.sum()
    return float(wsum / denom) if denom > 0 else np.nan

def sum_safe(series: pd.Series) -> float:
    return float(NUMSAFE(series).fillna(0.0).sum())

def normalize_columns(df: pd.DataFrame) -> pd.DataFrame:
    lower_to_orig = {c.lower(): c for c in df.columns}

    aliases = {
        "squad": "Squad", "team": "Squad", "club": "Squad", "squad_x": "Squad", "squad_y": "Squad",
        "comp": "Comp", "competition": "Comp", "league": "Comp",
        "player": "Player", "name": "Player",
        "min": "Min", "minutes": "Min",
        "gls": "Gls", "goals": "Gls",
        "ast": "Ast", "assists": "Ast",
        "sh": "Sh", "shots": "Sh",
        "sot": "SoT",
        "prgp": "PrgP", "prg p": "PrgP",
        "prgc": "PrgC", "prg c": "PrgC",
        "prgr": "PrgR", "prg r": "PrgR",
        "tkl+int": "Tkl+Int", "tkl_int": "Tkl+Int",
        "tkl": "Tkl", "int": "Int",
        "blocks": "Blocks",
        "age": "Age",
        "sca": "SCA",
    }

    for lk, target in aliases.items():
        if lk in lower_to_orig and target not in df.columns:
            df = df.rename(columns={lower_to_orig[lk]: target})

    if "Tkl+Int" not in df.columns and {"Tkl","Int"}.issubset(df.columns):
        df["Tkl+Int"] = pd.to_numeric(df["Tkl"], errors="coerce") + pd.to_numeric(df["Int"], errors="coerce")

    df.columns = [str(c).strip() for c in df.columns]
    return df


def build_team_features_from_players(players_prev: pd.DataFrame) -> pd.DataFrame:
    df = players_prev.copy()
    df = normalize_columns(df)

    if "Comp" in df.columns:
        df = df[df["Comp"].astype(str).str.strip() == LEAGUE_NAME]

    for k in ["Player","Squad"]:
        if k in df.columns:
            df[k] = df[k].astype(str).str.strip()

    if "Squad" not in df.columns or "Min" not in df.columns:
        raise ValueError("Expected 'Squad' and 'Min' columns in player DF.")

    groups = df.groupby("Squad", as_index=False)
    feats = []
    for squad, g in groups:
        mins = NUMSAFE(g.get("Min", 0))
        team_minutes = mins.sum()

        def per90_from_total(col):
            total = sum_safe(g.get(col, 0))
            return (total / (team_minutes / 90.0)) if team_minutes > 0 else np.nan

        def mwa(col):
            return minutes_weighted_avg(g.get(col, 0), mins)

        feats.append({
            "Squad": squad,
            "team_minutes": float(team_minutes),
            "gls_per90": per90_from_total("Gls"),
            "ast_per90": per90_from_total("Ast"),
            "sh_per90": per90_from_total("Sh"),
            "sot_per90": per90_from_total("SoT"),
            "sca_per90": per90_from_total("SCA"),
            "tklint_per90": per90_from_total("Tkl+Int"),
            "blocks_per90": per90_from_total("Blocks"),
            "prgp_per90": per90_from_total("PrgP"),
            "prgc_per90": per90_from_total("PrgC"),
            "prgr_per90": per90_from_total("PrgR"),
            "avg_age_mwa": mwa("Age"),
        })
    return pd.DataFrame(feats)

def make_team_features_by_season() -> dict[str, pd.DataFrame]:
    team_feats_by_season = {}
    for s in FEATURE_SEASONS:
        pdf = load_player_df_for_season(s)
        if pdf is None:
            continue
        tdf = build_team_features_from_players(pdf)
        tdf["FeaturesSeason"] = s
        team_feats_by_season[s] = tdf
    return team_feats_by_season


def season_start_year(season: str) -> int:
    return int(season.split("-")[0])

def history_seasons_for(t: str) -> List[str]:
    t_year = season_start_year(t)
    hist = [s for s in FEATURE_SEASONS if season_start_year(s) <= t_year - 1]
    hist.sort(key=season_start_year, reverse=True)
    return hist

HIST_METRICS = [
    "gls_per90","ast_per90","sot_per90","sca_per90",
    "tklint_per90","blocks_per90",
    "prgp_per90","prgc_per90","prgr_per90",
    "avg_age_mwa","team_minutes",
]

def exp_decay_weights(n: int, half_life: float = 1.0) -> np.ndarray:
    ages = np.arange(n, dtype=float)
    w = 0.5 ** (ages / half_life)
    return w / w.sum() if w.sum() > 0 else np.ones(n)/n

def linear_trend(values: List[float]) -> float:
    x = np.arange(len(values), dtype=float)
    y = np.array(values, dtype=float)
    mask = np.isfinite(y)
    if mask.sum() < 2:
        return np.nan
    return float(np.polyfit(x[mask], y[mask], 1)[0])

def aggregate_history(rows: List[dict]) -> dict:
    out = {}
    out["history_len"] = len(rows)
    if not rows:
        for m in HIST_METRICS:
            out[f"last1_{m}"] = np.nan
            out[f"expw_{m}"] = np.nan
            out[f"trend_{m}"] = np.nan
            out[f"mean_all_{m}"] = np.nan
        return out

    for m in HIST_METRICS:
        seq = [r.get(m, np.nan) for r in rows] 
        out[f"last1_{m}"] = seq[0]

        arr = np.array(seq, dtype=float)
        out[f"mean_all_{m}"] = float(np.nanmean(arr)) if np.isfinite(arr).any() else np.nan

        w = exp_decay_weights(len(seq), half_life=1.0)
        mask = np.isfinite(arr)
        out[f"expw_{m}"] = float((arr[mask] * (w[mask] / w[mask].sum())).sum()) if mask.any() else np.nan

        out[f"trend_{m}"] = linear_trend(seq)
    return out

# -------------------
# Build dataset 
# -------------------
def build_team_season_dataset_multi() -> pd.DataFrame:
    team_feats_by_season = make_team_features_by_season()
    targets = load_targets()

    rows = []
    for t in TARGET_SEASONS:
        hist_seasons = [s for s in history_seasons_for(t) if s in team_feats_by_season]
        if not hist_seasons:
            print(f"Skipping {t}: no previous feature seasons found.")
            continue

        tgt_t = targets[targets["Season"] == t].copy()
        if tgt_t.empty:
            print(f"!! No targets for {t}.")
            continue

        by_season = {s: team_feats_by_season[s].set_index("Squad") for s in hist_seasons}

        most_recent_prev = hist_seasons[0]
        prev_teams = set(by_season[most_recent_prev].index.tolist())
        tgt_t["promoted"] = (~tgt_t["Squad"].isin(prev_teams)).astype(int)

        for _, row in tgt_t.iterrows():
            team = row["Squad"]

            hist_rows = []
            for s in hist_seasons:
                df = by_season[s]
                if team in df.index:
                    d = df.loc[team].to_dict()
                    d["FeaturesSeason"] = s
                    hist_rows.append(d)

            agg = aggregate_history(hist_rows)
            out = {"Season": t, "Squad": team, "points": row["points"], "promoted": int(row["promoted"])}
            out.update(agg)
            rows.append(out)

    data = pd.DataFrame(rows)
    last1_cols = [f"last1_{m}" for m in HIST_METRICS]
    data["missing_prev"] = data[last1_cols].isna().any(axis=1).astype(int)
    return data

# -------------------
# Modeling
# -------------------
BASES = ["gls_per90","ast_per90","sot_per90","sca_per90",
         "tklint_per90","blocks_per90","prgp_per90","prgc_per90","prgr_per90","avg_age_mwa"]

TREND_FEATURES = [f"trend_{m}" for m in BASES] + ["trend_team_minutes"]
NON_TREND_NUMS = (
    [f"last1_{m}" for m in BASES] +
    [f"expw_{m}"  for m in BASES] +
    ["last1_team_minutes","expw_team_minutes","history_len","promoted","missing_prev"]
)
NUM_FEATURES = NON_TREND_NUMS + TREND_FEATURES

def ridge_pipeline():
    return Pipeline([
        ("prep", ColumnTransformer(
            transformers=[
                ("num",   Pipeline([
                    ("imp", SimpleImputer(strategy="median")),
                    ("scaler", StandardScaler()),
                ]), NON_TREND_NUMS),
                ("trend", SimpleImputer(strategy="constant", fill_value=0.0, keep_empty_features=True), TREND_FEATURES),
            ],
            remainder="drop",
        )),
        ("mdl", Ridge(alpha=3.0, random_state=42)),
    ])

def xgb_pipeline():
    return Pipeline([
        ("prep", ColumnTransformer(
            transformers=[
                ("num",   SimpleImputer(strategy="median"), NON_TREND_NUMS),
                ("trend", SimpleImputer(strategy="constant", fill_value=0.0, keep_empty_features=True), TREND_FEATURES),
            ],
            remainder="drop",
        )),
        ("mdl", XGBRegressor(
            n_estimators=400, max_depth=4, learning_rate=0.07,
            subsample=0.9, colsample_bytree=0.8, reg_lambda=1.0,
            random_state=42, n_jobs=4, tree_method="hist",
        )),
    ])

@dataclass
class Metrics:
    mae: float
    rmse: float
    spearman: float

def eval_metrics(y_true, y_pred) -> Metrics:
    mae = mean_absolute_error(y_true, y_pred)
    rmse = math.sqrt(mean_squared_error(y_true, y_pred))
    rho = spearmanr(y_true, y_pred, nan_policy="omit").statistic
    return Metrics(mae, rmse, rho)

def run_cv_and_select(X: pd.DataFrame, y: pd.Series):
    results = []
    for fold in CV_FOLDS:
        tr_seasons, val_season = fold["train"], fold["val"]
        tr_idx = X["Season"].isin(tr_seasons).values
        va_idx = X["Season"] == val_season

        Xtr, ytr = X.loc[tr_idx, :], y.loc[tr_idx]
        Xva, yva = X.loc[va_idx, :], y.loc[va_idx]

        models = {
            "ridge": ridge_pipeline(),
            "xgb": xgb_pipeline(),
        }
        for name, pipe in models.items():
            pipe.fit(Xtr, ytr)
            pred = pipe.predict(Xva)
            m = eval_metrics(yva, pred)
            results.append({"model": name, "fold": val_season, **m.__dict__})
            print(f"[CV] {name} → {val_season}: MAE={m.mae:.2f}  RMSE={m.rmse:.2f}  ρ={m.spearman:.3f}")

    dfres = pd.DataFrame(results)
    best_name = dfres.groupby("model")["mae"].mean().sort_values().index[0]
    print("\nBest by mean CV MAE:", best_name)
    return best_name, dfres

def refit_and_test(best_name: str, data: pd.DataFrame):

    train_idx = data["Season"] != TEST_SEASON
    test_idx = data["Season"] == TEST_SEASON
    Xtr, ytr = data.loc[train_idx, :], data.loc[train_idx, "points"]
    Xte, yte = data.loc[test_idx, :], data.loc[test_idx, "points"]

    pipe = ridge_pipeline() if best_name == "ridge" else xgb_pipeline()
    pipe.fit(Xtr, ytr)
    yhat = pipe.predict(Xte)

    m = eval_metrics(yte, yhat)
    print(f"\n[TEST {TEST_SEASON}] {best_name}: MAE={m.mae:.2f}  RMSE={m.rmse:.2f}  ρ={m.spearman:.3f}")

    joblib.dump(pipe, MODELS_DIR / "pipeline.joblib")

    meta = {
        "model": best_name,
        "cv_folds": CV_FOLDS,
        "test_season": TEST_SEASON,
        "metrics": {"test_mae": m.mae, "test_rmse": m.rmse, "test_spearman": m.spearman},
        "features": {"numeric": NUM_FEATURES},
    }
    (MODELS_DIR / "metadata.json").write_text(json.dumps(meta, indent=2))

    schema = {
        "raw_columns": ["Season","Squad","points"] + NUM_FEATURES,
        "note": "ColumnTransformer selects features by name; keep names stable at inference.",
    }
    (MODELS_DIR / "columns.json").write_text(json.dumps(schema, indent=2))

    out = pd.DataFrame({"Squad": Xte["Squad"], "Season": Xte["Season"], "actual": yte, "pred": yhat})
    out.sort_values("actual", ascending=False).to_csv(MODELS_DIR / f"pred_vs_actual_{TEST_SEASON}.csv", index=False)
    print(f"Saved artifacts in {MODELS_DIR.resolve()}")

# -------------------
# Entry
# -------------------
def main():
    data = build_team_season_dataset_multi()
    if data.empty:
        raise SystemExit("No data built. Check your input CSV paths and targets.csv.")

    cols = ["Season","Squad","points"] + NUM_FEATURES
    for c in cols:
        if c not in data.columns:
            data[c] = np.nan
    data = data[cols].reset_index(drop=True)

    best_name, dfres = run_cv_and_select(data, data["points"])
    dfres.to_csv(MODELS_DIR / "cv_results.csv", index=False)

    refit_and_test(best_name, data)

if __name__ == "__main__":
    main()
