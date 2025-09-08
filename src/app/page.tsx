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
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);

  const searchPlayers = useCallback(async (query: string) => {
    if (query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/players/search?q=${encodeURIComponent(query)}`);
      if (response.ok) {
        const result = await response.json();
        setSearchResults(result.data);
        setUsingFallback(false);
        setShowResults(true);
      } else {
        console.error('Search failed:', response.statusText);
        setSearchResults([]);
        setUsingFallback(true);
      }
    } catch (error) {
      console.error('Error searching players:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      searchPlayers(playerSearch);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [playerSearch, searchPlayers]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-dropdown')) {
        setShowResults(false);
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
            <div className="relative">
              <label htmlFor="playerSearch" className="block text-sm font-medium text-gray-700 mb-2">
                Search by Player Name
              </label>
              <input
                type="text"
                id="playerSearch"
                placeholder="Enter player name..."
                value={playerSearch}
                onChange={(e) => setPlayerSearch(e.target.value)}
                onFocus={() => setShowResults(true)}
                className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  playerSearch ? "text-slate-900" : "text-slate-500"
                }`}
              />
              
              {/* Search Results Dropdown */}
              {showResults && (searchResults.length > 0 || loading) && (
                <div className="search-dropdown absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {loading ? (
                    <div className="px-4 py-2 text-gray-500 text-center">
                      Searching...
                    </div>
                  ) : searchResults.length > 0 ? (
                    searchResults.map((player) => (
                      <div
                        key={player.id}
                        className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                        onClick={() => {
                          setPlayerSearch(player.name);
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
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            {player.nation}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="px-4 py-2 text-gray-500 text-center">
                      No players found
                    </div>
                  )}
                </div>
              )}
            </div>

            <div>
              <label htmlFor="teamSearch" className="block text-sm font-medium text-gray-700 mb-2">
                Search by Destination Team
              </label>
                <input
                  type="text"
                  id="teamSearch"
                  placeholder="Enter team name..."
                  value={teamSearch}
                  onChange={(e) => setTeamSearch(e.target.value)}
                  className={`w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    teamSearch ? "text-slate-900" : "text-slate-500"
                  }`}
                />  
            </div>
          </div>
        </div>

        {playerSearch && searchResults.length > 0 && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Selected Player</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {searchResults
                .filter(player => player.name.toLowerCase() === playerSearch.toLowerCase())
                .slice(0, 3)
                .map((player) => (
                  <div key={player.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{player.name}</h3>
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                        {player.primary_pos}
                      </span>
                    </div>
                    <div className="text-sm text-gray-600 mb-2">
                      <div className="font-medium">{player.teams}</div>
                      <div className="text-xs text-gray-500">{player.first_season} - {player.last_season} • {player.nation}</div>
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
      </div>
    </div>
  );
}
