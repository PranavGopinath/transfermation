from fastapi import APIRouter
from psycopg2.extras import RealDictCursor
from ..common.db import get_conn


router = APIRouter(prefix="/team", tags=["teams"])


@router.get("/search")
def search_teams(q: str):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute(
        """
        SELECT 
            tm.id,
            tm.name,
            tm.country,
            tm.league,
            '2024-2025' AS latest_season
        FROM teams tm
        WHERE LOWER(tm.name) LIKE LOWER(%s)
          AND tm.league IN (
              'Premier League',
              'La Liga', 
              'Bundesliga',
              'Serie A',
              'Ligue 1'
          )
        ORDER BY tm.name ASC
        LIMIT 20;
        """,
        (f"%{q}%",),
    )
    rows = cur.fetchall()
    cur.close()
    conn.close()
    return rows



