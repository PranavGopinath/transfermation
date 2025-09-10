from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from psycopg2.extras import RealDictCursor
from ..common.db import get_conn
import numpy as np
import joblib
from pathlib import Path
import os

router = APIRouter(prefix="/prediction", tags=["prediction"])

class PredictionRequest(BaseModel):
    player_id: int
    team_id: int

def load_model():
    """Load the trained model"""
    try:
        model_path = Path(__file__).parent.parent.parent.parent.parent / "model.pkl"
        if model_path.exists():
            return joblib.load(model_path)
        else:
            return None
    except Exception as e:
        print(f"Error loading model: {e}")
        return None

def get_player_features(player_id: int, team_id: int):
    """Get player and team features for prediction"""
    conn = get_conn()
    cur = conn.cursor(cursor_factory=RealDictCursor)
    
    try:
        cur.execute("""
            SELECT 
                p.id,
                p.name as player_name,
                p.primary_pos,
                p.nation,
                SUM(ps.matches) as total_matches,
                SUM(ps.goals) as total_goals,
                SUM(ps.assists) as total_assists,
                SUM(ps.clean_sheets) as total_clean_sheets,
                AVG(ps.save_pct) as avg_save_pct,
                COUNT(DISTINCT ps.season) as seasons_count
            FROM players p
            JOIN player_season_summary ps ON p.id = ps.player_id
            WHERE p.id = %s
            GROUP BY p.id, p.name, p.primary_pos, p.nation
        """, (player_id,))
        
        player_data = cur.fetchone()
        if not player_data:
            raise HTTPException(status_code=404, detail="Player not found")
        
        cur.execute("""
            SELECT 
                tm.id,
                tm.name as team_name,
                tm.league,
                tm.country,
                tm.position_2425,
                tm.points_2425,
                tm.wins_2425
            FROM teams tm
            WHERE tm.id = %s
        """, (team_id,))
        
        team_data = cur.fetchone()
        if not team_data:
            raise HTTPException(status_code=404, detail="Team not found")
        
        return player_data, team_data
        
    finally:
        cur.close()
        conn.close()

def create_feature_vector(player_data, team_data):
    """Create feature vector for prediction"""
    total_matches = player_data['total_matches'] or 0
    total_goals = player_data['total_goals'] or 0
    total_assists = player_data['total_assists'] or 0
    total_clean_sheets = player_data['total_clean_sheets'] or 0
    
    features = {
        'player_goals_per_match': total_goals / max(total_matches, 1),
        'player_assists_per_match': total_assists / max(total_matches, 1),
        'player_clean_sheets_per_match': total_clean_sheets / max(total_matches, 1),
        'player_avg_save_pct': player_data['avg_save_pct'] or 0,
        'player_seasons_count': player_data['seasons_count'] or 1,
        'team_position': team_data['position_2425'] or 20, 
        'team_points': team_data['points_2425'] or 0,
        'team_wins': team_data['wins_2425'] or 0,
    }
    
    feature_vector = np.array([
        features['player_goals_per_match'],
        features['player_assists_per_match'],
        features['player_clean_sheets_per_match'],
        features['player_avg_save_pct'],
        features['player_seasons_count'],
        features['team_position'],
        features['team_points'],
        features['team_wins'],
    ]).reshape(1, -1)
    
    return feature_vector

@router.post("/predict")
def predict_impact(request: PredictionRequest):
    """Predict the impact of a player joining a team"""
    try:
        player_data, team_data = get_player_features(request.player_id, request.team_id)
        
        features = create_feature_vector(player_data, team_data)
        
        model = load_model()
        
        if model is not None:
            prediction = model.predict(features)[0]
            confidence = 0.85 
        else:
            prediction = predict_fallback(player_data, team_data)
            confidence = 0.60
        
        impact_score = float(prediction)
        impact_level = get_impact_level(impact_score)
        
        return {
            "player_name": player_data['player_name'],
            "team_name": team_data['team_name'],
            "league": team_data['league'],
            "impact_score": impact_score,
            "impact_level": impact_level,
            "confidence": confidence,
            "prediction_details": {
                "player_goals_per_match": round((player_data['total_goals'] or 0) / max(player_data['total_matches'] or 1, 1), 2),
                "player_assists_per_match": round((player_data['total_assists'] or 0) / max(player_data['total_matches'] or 1, 1), 2),
                "team_position": team_data['position_2425'],
                "team_points": team_data['points_2425'],
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")

def predict_fallback(player_data, team_data):
    """Fallback prediction using simple heuristics"""
    total_matches = player_data['total_matches'] or 0
    total_goals = player_data['total_goals'] or 0
    total_assists = player_data['total_assists'] or 0
    total_clean_sheets = player_data['total_clean_sheets'] or 0
    
    player_quality = (
        (total_goals / max(total_matches, 1)) * 0.4 +
        (total_assists / max(total_matches, 1)) * 0.3 +
        (total_clean_sheets / max(total_matches, 1)) * 0.2 +
        (player_data['avg_save_pct'] or 0) * 0.1
    )
    
    team_quality = 1.0 / max(team_data['position_2425'] or 20, 1) 
    
    impact = (player_quality * 0.7 + team_quality * 0.3) * 10 
    
    return min(max(impact, 1.0), 10.0)  

def get_impact_level(score):
    """Convert impact score to descriptive level"""
    if score >= 8.5:
        return "Exceptional"
    elif score >= 7.0:
        return "High"
    elif score >= 5.5:
        return "Moderate"
    elif score >= 4.0:
        return "Low"
    else:
        return "Minimal"
