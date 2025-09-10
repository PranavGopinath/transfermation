'use client';

import { useState, useEffect, useCallback } from 'react';

interface Player {
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

interface Team {
  id: number;
  name: string;
  country: string;
  league: string;
  latest_season: string;
  active_2024_2025: boolean;
  wins_2425: number | null;
  points_2425: number | null;
  position_2425: number | null;
}

interface Transfer {
  id: string;
  playerName: string;
  fromTeam: string;
  toTeam: string;
  transferValue: string;
}

export default function Home() {
  const [playerSearch, setPlayerSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [teamSearchResults, setTeamSearchResults] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showTeamResults, setShowTeamResults] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [predicting, setPredicting] = useState(false);

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

  const parseArray = <T,>(data: any): T[] =>
    Array.isArray(data) ? data
    : Array.isArray(data?.results) ? data.results
    : Array.isArray(data?.data) ? data.data
    : [];

  const getCountryFlag = (country: string): string => {
    const flagMap: { [key: string]: string } = {
      'ENGLAND': '/england.svg',
      'SPAIN': '/spain.svg',
      'GERMANY': '/germany.svg',
      'ITALY': '/italy.svg',
      'FRANCE': '/france.svg',
    };
    return flagMap[country.toUpperCase()] || '/globe.svg';
  };

  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  const predictImpact = useCallback(async () => {
    if (!selectedPlayer || !selectedTeam) return;
    
    setPredicting(true);
    try {
      const response = await fetch(`${baseUrl}/prediction/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_id: selectedPlayer.id,
          team_id: selectedTeam.id,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        setPrediction(result);
      } else {
        console.error('Prediction failed:', response.statusText);
      }
    } catch (error) {
      console.error('Error predicting impact:', error);
    } finally {
      setPredicting(false);
    }
  }, [selectedPlayer, selectedTeam, baseUrl]);

  useEffect(() => {
    console.log('showResults', showResults);
  }, [showResults]);

  const searchPlayers = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }
    setLoading(true);
    try {
      const url = `${baseUrl}/players/search/aggregate?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        const text = await response.text();
        console.error('Player search failed:', response.status, text);
        setSearchResults([]);
        setUsingFallback(true);
        } else {
          const data = await response.json();
          setSearchResults(data);
          setUsingFallback(false);
        }
    } catch (err) {
      console.error('Error searching players:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl]);

  const searchTeams = useCallback(async (query: string) => {
    if (query.trim().length < 2) {
      setTeamSearchResults([]);
      setShowTeamResults(false);
      return;
    }
    setTeamLoading(true);
    try {
      const url = `${baseUrl}/team/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        const text = await response.text();
        console.error('Team search failed:', response.status, text);
        setTeamSearchResults([]);
        setUsingFallback(true);
        } else {
          const data = await response.json();
          setTeamSearchResults(data);
          setUsingFallback(false);
        }
    } catch (err) {
      console.error('Error searching teams:', err);
      setTeamSearchResults([]);
    } finally {
      setTeamLoading(false);
    }
  }, [baseUrl]);

  useEffect(() => {
    const t = setTimeout(() => searchPlayers(playerSearch), 300);
    return () => clearTimeout(t);
  }, [playerSearch, searchPlayers]);

  useEffect(() => {
    const t = setTimeout(() => searchTeams(teamSearch), 300);
    return () => clearTimeout(t);
  }, [teamSearch, searchTeams]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-dropdown')) {
        setShowResults(false);
        setShowTeamResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Transfermation</h1>
          <p className="text-gray-600">Discover the predicted impact of your team's dream signings</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${usingFallback ? 'bg-yellow-500' : 'bg-green-500'}`}></div>
              <span className="text-sm text-gray-600">
                {usingFallback ? 'FastAPI server offline' : 'Connected to player database'}
              </span>
            </div>
            {usingFallback && (
              <button
                onClick={() => window.location.reload()}
                className="text-xs text-blue-600 hover:text-blue-800 underline"
              >
                Retry connection
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player Search */}
            <div className="relative">
              <label htmlFor="playerSearch" className="block text-sm font-medium text-gray-700 mb-2">
                Search by Player Name
              </label>
              <input
                type="text"
                id="playerSearch"
                placeholder="Enter player name..."
                value={playerSearch}
                onChange={(e) => {
                  setPlayerSearch(e.target.value);
                  setShowResults(true);
                  console.log('1');
                }}
                onFocus={() => {setShowResults(true);
                 console.log('3')}}
                className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  playerSearch ? 'text-slate-900' : 'text-slate-500'
                }`}
              />

              {showResults && (loading || searchResults.length > 0) && (
                <div className="search-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {loading ? (
                    <div className="px-4 py-2 text-gray-500 text-center">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((player) => (
                      <div
                        key={player.id}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onMouseDown={(e) => e.preventDefault()} // prevent blur
                        onClick={() => {
                          setPlayerSearch(player.name);
                          setSelectedPlayer(player);
                          setShowResults(false);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{player.name}</h4>
                            <p className="text-sm text-gray-600">
                              {player.teams} • {player.primary_pos}
                            </p>
                            <p className="text-xs text-gray-500">
                              {player.total_goals}G {player.total_assists}A • {player.total_matches} matches • {player.seasons_count} seasons
                            </p>
                          </div>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{player.nation}</span>
                        </div>
                      </div>
                    ))
                  ) : playerSearch.trim().length >= 2 ? (
                    <div className="px-4 py-2 text-gray-500 text-center">No players found</div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Team Search */}
            <div className="relative">
              <label htmlFor="teamSearch" className="block text-sm font-medium text-gray-700 mb-2">
                Search by Destination Team
              </label>
              <input
                type="text"
                id="teamSearch"
                placeholder="Enter team name..."
                value={teamSearch}
                onChange={(e) => {
                  setTeamSearch(e.target.value);
                  setShowTeamResults(true);
                }}
                onFocus={() => setShowTeamResults(true)}
                className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  teamSearch ? 'text-slate-900' : 'text-slate-500'
                }`}
              />

              {/* Team Results */}
              {showTeamResults && (teamLoading || teamSearchResults.length > 0) && (
                <div className="search-dropdown absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {teamLoading ? (
                    <div className="px-4 py-2 text-gray-500 text-center">Searching...</div>
                  ) : teamSearchResults.length > 0 ? (
                    teamSearchResults.map((team) => (
                      <div
                        key={team.id}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onMouseDown={(e) => e.preventDefault()} // prevent blur
                        onClick={() => {
                          setTeamSearch(team.name);
                          setSelectedTeam(team);
                          setShowTeamResults(false);
                          setTeamSearchResults([]);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-gray-900">{team.name}</h4>
                            <p className="text-sm text-gray-600">
                              {team.league} • {team.country}
                            </p>
                            <p className="text-xs text-gray-500">
                              {team.active_2024_2025 ? 'Current Season' : `Last: ${team.latest_season}`}
                              {team.position_2425 && ` • ${team.position_2425}${getOrdinalSuffix(team.position_2425)}`}
                            </p>
                          </div>
                          <div className="flex flex-col items-end">
                            <img 
                              src={getCountryFlag(team.country)} 
                              alt={team.country} 
                              className="w-6 h-6"
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  ) : teamSearch.trim().length >= 2 ? (
                    <div className="px-4 py-2 text-gray-500 text-center">No teams found</div>
                  ) : null}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Prediction Section */}
        {selectedPlayer && selectedTeam && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Transfer Impact Prediction</h2>
              <button
                onClick={predictImpact}
                disabled={predicting}
                className={`px-6 py-2 rounded-md font-medium ${
                  predicting
                    ? 'bg-gray-400 text-gray-700 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {predicting ? 'Predicting...' : 'Predict Impact'}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Selected Player</h3>
                <p className="text-lg">{selectedPlayer.name}</p>
                <p className="text-sm text-gray-600">{selectedPlayer.primary_pos} • {selectedPlayer.nation}</p>
              </div>
              <div className="p-4 border border-gray-200 rounded-lg">
                <h3 className="font-semibold text-gray-900 mb-2">Destination Team</h3>
                <p className="text-lg">{selectedTeam.name}</p>
                <p className="text-sm text-gray-600">{selectedTeam.league} • {selectedTeam.country}</p>
              </div>
            </div>

            {prediction && (
              <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-green-50 rounded-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-3">Prediction Results</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-blue-600">{prediction.impact_score.toFixed(1)}</div>
                    <div className="text-sm text-gray-600">Impact Score</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-green-600">{prediction.impact_level}</div>
                    <div className="text-sm text-gray-600">Impact Level</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-semibold text-purple-600">{(prediction.confidence * 100).toFixed(0)}%</div>
                    <div className="text-sm text-gray-600">Confidence</div>
                  </div>
                </div>
                
                {prediction.prediction_details && (
                  <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Goals/Match:</span> {prediction.prediction_details.player_goals_per_match}
                    </div>
                    <div>
                      <span className="font-medium">Assists/Match:</span> {prediction.prediction_details.player_assists_per_match}
                    </div>
                    <div>
                      <span className="font-medium">Team Position:</span> {prediction.prediction_details.team_position}
                    </div>
                    <div>
                      <span className="font-medium">Team Points:</span> {prediction.prediction_details.team_points}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {playerSearch && (searchResults?.length ?? 0) > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Selected Player</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults
                .filter((p) => p.name.toLowerCase() === playerSearch.toLowerCase())
                .slice(0, 3)
                .map((player) => (
                  <div key={player.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{player.name}</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{player.primary_pos}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <div className="font-medium">{player.teams}</div>
                      <div className="text-xs text-gray-500">
                        {player.first_season} - {player.last_season} • {player.nation}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-blue-600">{player.total_goals}</div>
                        <div className="text-xs text-gray-500">Total Goals</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-green-600">{player.total_assists}</div>
                        <div className="text-xs text-gray-500">Total Assists</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-purple-600">{player.total_matches}</div>
                        <div className="text-xs text-gray-500">Total Matches</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-orange-600">{player.seasons_count}</div>
                        <div className="text-xs text-gray-500">Seasons</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Selected Team Display */}
        {teamSearch && (teamSearchResults?.length ?? 0) > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Selected Team</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teamSearchResults
                .filter((t) => t.name.toLowerCase() === teamSearch.toLowerCase())
                .slice(0, 3)
                .map((team) => (
                  <div key={team.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{team.name}</h3>
                      <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">{team.league}</span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <div className="font-medium">{team.country}</div>
                      <div className="text-xs text-gray-500">
                        {team.active_2024_2025 ? 'Current Season' : `Last: ${team.latest_season}`}
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-blue-600">
                          {team.position_2425 ? `${team.position_2425}${getOrdinalSuffix(team.position_2425)}` : 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">Position</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-green-600">
                          {team.points_2425 || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">Points</div>
                      </div>
                      <div className="text-center p-2 bg-gray-50 rounded">
                        <div className="font-semibold text-purple-600">
                          {team.wins_2425 || 'N/A'}
                        </div>
                        <div className="text-xs text-gray-500">Wins</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
