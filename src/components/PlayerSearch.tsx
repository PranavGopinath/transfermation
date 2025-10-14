'use client';

import { useEffect, useCallback } from 'react';
import { Player } from '@/types';

interface PlayerSearchProps {
  playerSearch: string;
  setPlayerSearch: (value: string) => void;
  searchResults: Player[];
  setSearchResults: (results: Player[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showResults: boolean;
  setShowResults: (show: boolean) => void;
  setSelectedPlayer: (player: Player | null) => void;
}

export default function PlayerSearch({
  playerSearch,
  setPlayerSearch,
  searchResults,
  setSearchResults,
  loading,
  setLoading,
  showResults,
  setShowResults,
  setSelectedPlayer,
}: PlayerSearchProps) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

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
      } else {
        const data = await response.json();
        setSearchResults(data);
      }
    } catch (err) {
      console.error('Error searching players:', err);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, [baseUrl, setSearchResults, setLoading, setShowResults]);

  useEffect(() => {
    const t = setTimeout(() => searchPlayers(playerSearch), 300);
    return () => clearTimeout(t);
  }, [playerSearch, searchPlayers]);

  return (
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
        }}
        onFocus={() => setShowResults(true)}
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
                      {player.total_goals}G {player.total_assists}A • {player.total_matches} matches • {player.seasons_count} seasons
                    </p>
                  </div>
                  <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded">{player.nation}</span>
                </div>
              </div>
            ))
          ) : playerSearch.trim().length >= 2 ? (
            <div className="px-4 py-2 text-muted-foreground text-center">No players found</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
