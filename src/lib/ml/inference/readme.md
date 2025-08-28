## RUN ##

```
cd ~/transfermation
PYTHONPATH=. python - <<'PY'
from src.lib.ml.inference.simulator import predict_with_and_without_transfer
res = predict_with_and_without_transfer(
    team="Arsenal",
    target_season="2025-2026",           # ← target
    incoming_player_name="Rodrygo",      # must exist in 2024–2025 files
    projected_minutes_in=2500,
    outgoing_minutes={"Leandro Trossard": 900, "Gabriel Martinelli": 800, "Gabriel Jesus": 800},
    cross_league_scale=0.95              # optional
)
print(res)
PY
```