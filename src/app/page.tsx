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
  losses_2425: number | null;
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
  const [projectedMinutes, setProjectedMinutes] = useState<number>(2000);
  const [outgoingMinutesText, setOutgoingMinutesText] = useState<string>('');
  const [projectedMinutesError, setProjectedMinutesError] = useState<string>('');
  const [outgoingMinutesError, setOutgoingMinutesError] = useState<string>('');

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

    const nextSeason = (() => {
      const latest = selectedTeam.latest_season || '2024-2025';
      const [y1, y2] = latest.split('-').map((s) => parseInt(s, 10));
      if (isNaN(y1) || isNaN(y2)) return '2025-2026';
      return `${y2}-${y2 + 1}`;
    })();

    const parseOutgoing = (txt: string): Record<string, number> | undefined => {
      const t = txt.trim();
      if (!t) return undefined;
      const out: Record<string, number> = {};
      t.split(',').forEach((pair) => {
        const [name, mins] = pair.split(':').map((s) => s.trim());
        const m = parseInt(mins, 10);
        if (name && !isNaN(m)) out[name] = m;
      });
      return Object.keys(out).length ? out : undefined;
    };

    if (!Number.isFinite(projectedMinutes) || projectedMinutes < 0 || projectedMinutes > 4000) {
      setProjectedMinutesError('Projected minutes must be between 0 and 4000.');
      return;
    }
    setProjectedMinutesError('');

    let outgoingParsed: Record<string, number> | undefined = undefined;
    if (outgoingMinutesText.trim()) {
      const parts = outgoingMinutesText.split(',').map((p) => p.trim()).filter(Boolean);
      const temp: Record<string, number> = {};
      for (const part of parts) {
        const [name, minsStr] = part.split(':').map((s) => s.trim());
        const minsVal = parseInt(minsStr ?? '', 10);
        if (!name || !Number.isFinite(minsVal) || minsVal < 0 || minsVal > 4000) {
          setOutgoingMinutesError('Use "Name:Minutes" with minutes 0–4000, comma-separated.');
          return;
        }
        temp[name] = minsVal;
      }
      outgoingParsed = Object.keys(temp).length ? temp : undefined;
    }
    setOutgoingMinutesError('');

    const totalOutgoing = outgoingParsed ? Object.values(outgoingParsed).reduce((a, b) => a + b, 0) : 0;
    if (totalOutgoing !== projectedMinutes) {
      const msg = `Total outgoing minutes (${totalOutgoing}) must equal projected minutes (${projectedMinutes}).`;
      setProjectedMinutesError(msg);
      setOutgoingMinutesError(msg);
      return;
    }

    setPredicting(true);
    setPrediction(null);
    try {
      const response = await fetch(`${baseUrl}/prediction/whatif`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: selectedTeam.name,
          incoming_player_name: selectedPlayer.name,
          target_season: nextSeason,
          projected_minutes_in: projectedMinutes,
          outgoing_minutes: outgoingParsed,
          cross_league_scale: 1.0,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setPrediction(result);
      } else {
        const text = await response.text();
        console.error('Prediction failed:', response.status, text);
      }
    } catch (error) {
      console.error('Error predicting impact:', error);
    } finally {
      setPredicting(false);
    }
  }, [selectedPlayer, selectedTeam, baseUrl, projectedMinutes, outgoingMinutesText]);

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
    <div className="min-h-screen bg-background text-foreground p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Transfermation</h1>
          <p className="text-muted-foreground">Discover the predicted impact of your team's dream signings</p>
        </div>

        <div className="bg-card text-card-foreground rounded-lg shadow-md p-6 mb-6">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${usingFallback ? 'bg-destructive' : 'bg-secondary'}`}></div>
              <span className="text-sm text-muted-foreground">
                {usingFallback ? 'FastAPI server offline' : 'Connected to player database'}
              </span>
            </div>
            {usingFallback && (
              <button
                onClick={() => window.location.reload()}
                className="text-xs text-primary hover:underline"
              >
                Retry connection
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Player Search */}
            <div className="relative">
              <label htmlFor="playerSearch" className="block text-sm font-medium text-foreground mb-2">
                Search Player Name
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
                className={`w-full px-4 py-2 border border-border bg-card rounded-md focus:ring-2 focus:ring-primary focus:border-transparent ${
                  playerSearch ? 'text-foreground' : 'text-muted-foreground'
                }`}
              />

              {showResults && (loading || searchResults.length > 0) && (
                <div className="search-dropdown absolute z-50 w-full mt-1 bg-card text-card-foreground border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {loading ? (
                    <div className="px-4 py-2 text-muted-foreground text-center">Searching...</div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((player) => (
                      <div
                        key={player.id}
                        className="px-4 py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setPlayerSearch(player.name);
                          setSelectedPlayer(player);
                          setShowResults(false);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-foreground">{player.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {player.teams} • {player.primary_pos}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {player.total_goals}G {player.total_assists}A • {player.total_matches} matches • 
                            </p>
                          <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">{player.nation}</span>

                          </div>
                        </div>
                      </div>
                    ))
                  ) : playerSearch.trim().length >= 2 ? (
                    <div className="px-4 py-2 text-muted-foreground text-center">No players found</div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Team Search */}
            <div className="relative">
              <label htmlFor="teamSearch" className="block text-sm font-medium text-foreground mb-2">
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
                className={`w-full px-4 py-2 border border-border bg-card rounded-md focus:ring-2 focus:ring-primary focus:border-transparent ${
                  teamSearch ? 'text-foreground' : 'text-muted-foreground'
                }`}
              />

              {/* Team Results */}
              {showTeamResults && (teamLoading || teamSearchResults.length > 0) && (
                <div className="search-dropdown absolute z-50 w-full mt-1 bg-card text-card-foreground border border-border rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {teamLoading ? (
                    <div className="px-4 py-2 text-muted-foreground text-center">Searching...</div>
                  ) : teamSearchResults.length > 0 ? (
                    teamSearchResults.map((team) => (
                      <div
                        key={team.id}
                        className="px-4 py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => {
                          setTeamSearch(team.name);
                          setSelectedTeam(team);
                          setShowTeamResults(false);
                          setTeamSearchResults([]);
                        }}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <h4 className="font-medium text-foreground">{team.name}</h4>
                            <p className="text-sm text-muted-foreground">
                              {team.league} • {team.country}
                            </p>
                            <p className="text-xs text-muted-foreground">
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

        {(selectedPlayer || selectedTeam) && (
          <div className="bg-card text-card-foreground rounded-lg shadow-md p-6 mb-6 w-full">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-foreground">Transfer Impact Prediction</h2>
              <button
                onClick={predictImpact}
                disabled={predicting}
                className={`group relative px-6 py-2 rounded-md font-medium transition-all duration-300 transform ${
                  predicting
                    ? 'bg-muted text-background cursor-not-allowed'
                    : 'bg-primary text-background hover:bg-primary/90 hover:scale-105 hover:shadow-lg hover:shadow-primary/25 active:scale-95'
                }`}
              >
                <span className="relative z-10">
                  {predicting ? 'Predicting...' : 'Predict Impact'}
                </span>
                {!predicting && (
                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                )}
                {predicting && (
                  <div className="absolute inset-0 rounded-md bg-gradient-to-r from-muted/50 to-transparent animate-pulse" />
                )}
              </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 h-full items-stretch">
            {playerSearch && (searchResults?.length ?? 0) > 0 && (
          <div className="bg-card text-card-foreground rounded-lg shadow-md h-full">
            <h2 className="text-xl font-semibold text-foreground mb-4">Selected Player</h2>
            <div className="grid grid-cols-1 gap-4 w-full">
              {searchResults
                .filter((p) => p.name.toLowerCase() === playerSearch.toLowerCase())
                .slice(0, 3)
                .map((player) => (
                  <div key={player.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-foreground">{player.name}</h3>
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">{player.primary_pos}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      <div className="font-medium">{player.teams}</div>
                      <div className="text-xs text-muted-foreground">
                        {player.first_season} - {player.last_season} • {player.nation}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-semibold text-primary">{player.total_goals}</div>
                        <div className="text-xs text-muted-foreground">Total Goals</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-semibold text-primary">{player.total_assists}</div>
                        <div className="text-xs text-muted-foreground">Total Assists</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-semibold text-primary">{player.total_matches}</div>
                        <div className="text-xs text-muted-foreground">Total Matches</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-semibold text-primary">{player.seasons_count}</div>
                        <div className="text-xs text-muted-foreground">Seasons</div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
              {teamSearch && (teamSearchResults?.length ?? 0) > 0 && (
          <div className="bg-card text-card-foreground rounded-lg shadow-md h-full">
            <h2 className="text-xl font-semibold text-foreground mb-4">Selected Team</h2>
            <div className="grid grid-cols-1 gap-4 w-full">
              {teamSearchResults
                .filter((t) => t.name.toLowerCase() === teamSearch.toLowerCase())
                .slice(0, 3)
                .map((team) => (
                  <div key={team.id} className="border border-border rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-semibold text-foreground mb-1">{team.name}</h3>
                      <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">{team.league}</span>
                    </div>
                    <div className="text-sm text-muted-foreground mb-2">
                      <div className="font-medium flex items-center gap-2">
                        <img 
                          src={getCountryFlag(team.country)} 
                          alt={team.country} 
                          className="w-4 h-4"
                        />
                        {team.country}
                      </div>
                      <div className="text-xs text-muted-foreground">
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-semibold text-primary">
                          {team.position_2425 ? `${team.position_2425}${getOrdinalSuffix(team.position_2425)}` : 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">Position</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-semibold text-primary">
                          {team.points_2425 || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">Points</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-semibold text-primary">
                          {team.wins_2425 || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">Wins</div>
                      </div>
                      <div className="text-center p-2 bg-muted rounded">
                        <div className="font-semibold text-primary">
                          {team.losses_2425 || 'N/A'}
                        </div>
                        <div className="text-xs text-muted-foreground">Losses</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              </div>
        )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              <div className="p-4 border border-border rounded-lg">
                <label className="block text-sm font-medium text-foreground mb-2">Projected Minutes for Incoming Player</label>
                <input
                  type="number"
                  min={0}
                  max={4000}
                  value={projectedMinutes}
                  onChange={(e) => {
                    const v = parseInt(e.target.value || '0', 10);
                    setProjectedMinutes(Number.isFinite(v) ? v : 0);
                    if (!Number.isFinite(v) || v < 0 || v > 4000) {
                      setProjectedMinutesError('Projected minutes must be between 0 and 4000.');
                      return;
                    } else {
                      setProjectedMinutesError('');
                    }
                    // Re-validate totals match when projected changes
                    if (outgoingMinutesText.trim()) {
                      const parts = outgoingMinutesText.split(',').map((p) => p.trim()).filter(Boolean);
                      let sum = 0;
                      for (const part of parts) {
                        const [name, minsStr] = part.split(':').map((s) => s.trim());
                        const minsVal = parseInt(minsStr ?? '', 10);
                        if (!name || !Number.isFinite(minsVal) || minsVal < 0 || minsVal > 4000) {
                          return;
                        }
                        sum += minsVal;
                      }
                      if (sum !== (Number.isFinite(v) ? v : 0)) {
                        const msg = `Total outgoing minutes (${sum}) must equal projected minutes (${Number.isFinite(v) ? v : 0}).`;
                        setProjectedMinutesError(msg);
                        setOutgoingMinutesError(msg);
                      } else {
                        setProjectedMinutesError('');
                        setOutgoingMinutesError('');
                      }
                    }
                  }}
                  className={`w-full px-3 py-2 border ${projectedMinutesError ? 'border-destructive' : 'border-border'} rounded-md focus:ring-2 focus:ring-primary focus:border-transparent ${
                    projectedMinutes ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                />
                {projectedMinutesError && (
                  <p className="mt-1 text-xs text-destructive">{projectedMinutesError}</p>
                )}
              </div>
              <div className="p-4 border border-border rounded-lg">
                <label className="block text-sm font-medium text-foreground mb-2">Outgoing Minutes (optional)</label>
                <input
                  type="text"
                  placeholder="e.g., Gabriel Jesus:1200, Trossard:600"
                  value={outgoingMinutesText}
                  onChange={(e) => {
                    const val = e.target.value;
                    setOutgoingMinutesText(val);
                    if (!val.trim()) { setOutgoingMinutesError(''); return; }
                    const parts = val.split(',').map((p) => p.trim()).filter(Boolean);
                    for (const part of parts) {
                      const [name, minsStr] = part.split(':').map((s) => s.trim());
                      const minsVal = parseInt(minsStr ?? '', 10);
                      if (!name || !Number.isFinite(minsVal) || minsVal < 0 || minsVal > 4000) {
                        setOutgoingMinutesError('Use "Name:Minutes" with minutes 0–4000, comma-separated.');
                        return;
                      }
                    }
                    // Validate totals match
                    let sum = 0;
                    for (const part of parts) {
                      const [_, minsStr] = part.split(':').map((s) => s.trim());
                      const minsVal = parseInt(minsStr ?? '', 10);
                      sum += Number.isFinite(minsVal) ? minsVal : 0;
                    }
                    if (sum !== projectedMinutes) {
                      const msg = `Total outgoing minutes (${sum}) must equal projected minutes (${projectedMinutes}).`;
                      setOutgoingMinutesError(msg);
                      setProjectedMinutesError(msg);
                    } else {
                      setOutgoingMinutesError('');
                      setProjectedMinutesError('');
                    }
                  }}
                  className={`w-full px-3 py-2 border ${outgoingMinutesError ? 'border-destructive' : 'border-border'} rounded-md focus:ring-2 focus:ring-primary focus:border-transparent ${
                    outgoingMinutesText ? 'text-foreground' : 'text-muted-foreground'
                  }`}
                />
                <p className="mt-1 text-xs text-muted-foreground">Format: Name:Minutes, Name2:Minutes</p>
                {outgoingMinutesError && (
                  <p className="mt-1 text-xs text-destructive">{outgoingMinutesError}</p>
                )}
              </div>
            </div>

            {prediction && (
              <div className="mt-4 p-4 rounded-lg" style={{ background: 'var(--gradient-primary)' }}>
                <h3 className="text-lg font-semibold text-foreground mb-3">Predicted Team Points Impact</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{prediction.points_base?.toFixed ? prediction.points_base.toFixed(1) : prediction.points_base}</div>
                    <div className="text-sm text-foreground">Baseline Points</div>
                  </div>
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{prediction.points_with?.toFixed ? prediction.points_with.toFixed(1) : prediction.points_with}</div>
                    <div className="text-sm text-foreground">With Transfer</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${prediction.delta >= 0 ? 'text-primary' : 'text-destructive'}`}>{prediction.delta?.toFixed ? prediction.delta.toFixed(1) : prediction.delta}</div>
                    <div className="text-sm text-foreground">Delta (± points)</div>
                  </div>
                </div>
                <div className="mt-2 text-sm text-foreground">Season: {prediction.season_target} (features from {prediction.season_features_from})</div>
              </div>
            )}
          </div>
        )}

        {/* Selected Team Display */}

      </div>
    </div>
  );
}
