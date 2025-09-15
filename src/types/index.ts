export interface Player {
  id: number;
  name: string;
  nation: string;
  primary_pos: string;
  teams: string;
  first_season: string;
  last_season: string;
  seasons_count: number;
  total_matches: number;
  total_goals: number;
  total_assists: number;
  total_clean_sheets: number;
  avg_save_pct: number;
}

export interface Team {
  id: number;
  name: string;
  country: string;
  league: string;
  latest_season: string;
  active_2024_2025: boolean;
  wins_2425: number | null;
  points_2425: number | null;
  position_2425: number | null;
  losses_2425: number | null;
}

export interface Transfer {
  id: string;
  playerName: string;
  fromTeam: string;
  toTeam: string;
  transferValue: string;
}
