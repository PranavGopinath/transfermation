from fastapi import FastAPI, Query
import psycopg2
from psycopg2.extras import RealDictCursor
from dotenv import load_dotenv
import os
from pathlib import Path

env_path = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

DB_USER = os.getenv("DB_USER")
DB_PASS = os.getenv("DB_PASS")
DB_NAME = os.getenv("DB_NAME")
DB_HOST = os.getenv("DB_HOST")
DB_PORT = os.getenv("DB_PORT")

app = FastAPI()

def get_conn():
    conn = psycopg2.connect(
        dbname=DB_NAME,
        user=DB_USER,
        password=DB_PASS,
        host=DB_HOST,
        port=DB_PORT,
    )
    return conn

@app.get("/search")
def search_players(q: str):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT p.id, p.name, p.nation, p.primary_pos,
               tm.name AS team, ps.season,
               ps.matches, ps.goals, ps.assists,
               ps.clean_sheets, ps.save_pct
        FROM players p
        JOIN player_season_summary ps ON p.id = ps.player_id
        LEFT JOIN teams tm ON tm.id = ps.team_id
        WHERE LOWER(p.name) LIKE LOWER(%s)
        ORDER BY ps.season_start_year DESC
        LIMIT 20;
    """, (f"%{q}%",))
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows

@app.get("/search/aggregate")
def search_aggregate(q: str):
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    cur.execute("""
        SELECT 
            p.id, 
            p.name, 
            p.nation, 
            p.primary_pos,
            string_agg(DISTINCT tm.name, ', ') AS teams,
            MIN(ps.season) AS first_season,
            MAX(ps.season) AS last_season,
            COUNT(DISTINCT ps.season) AS seasons_count,
            SUM(ps.matches) AS total_matches,
            SUM(ps.goals) AS total_goals,
            SUM(ps.assists) AS total_assists,
            SUM(ps.clean_sheets) AS total_clean_sheets,
            ROUND(AVG(ps.save_pct)::numeric, 2) AS avg_save_pct
        FROM player_season_summary ps
        JOIN players p ON p.id = ps.player_id
        LEFT JOIN teams tm ON tm.id = ps.team_id
        WHERE LOWER(p.name) LIKE LOWER(%s)
          AND ps.season_start_year >= EXTRACT(YEAR FROM CURRENT_DATE) - 4
        GROUP BY p.id, p.name, p.nation, p.primary_pos
        ORDER BY total_goals DESC NULLS LAST;
    """, (f"%{q}%",))
    rows = cur.fetchall()
    cur.close(); conn.close()
    return rows
