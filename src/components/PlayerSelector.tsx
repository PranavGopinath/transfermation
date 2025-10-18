'use client';

import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Player } from '@/types';

interface PlayerSelectorProps {
  playerSearch: string;
  setPlayerSearch: (value: string) => void;
  searchResults: Player[];
  setSearchResults: (results: Player[]) => void;
  loading: boolean;
  setLoading: (loading: boolean) => void;
  showResults: boolean;
  setShowResults: (show: boolean) => void;
  setSelectedPlayer: (player: Player | null) => void;
  selectedPlayer: Player | null;
}

export function PlayerSelector({
  playerSearch,
  setPlayerSearch,
  searchResults,
  setSearchResults,
  loading,
  setLoading,
  showResults,
  setShowResults,
  setSelectedPlayer,
  selectedPlayer,
}: PlayerSelectorProps) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

  const searchPlayers = async (query: string) => {
    if (query.trim().length < 1) {
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
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setPlayerSearch(value);
    setShowResults(true);
    
    // Search immediately without delay
    searchPlayers(value);
  };

  const handlePlayerSelect = (player: Player) => {
    setPlayerSearch(player.name);
    setSelectedPlayer(player);
    setShowResults(false);
  };

  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-serif italic text-lg">1.</span>
        </div>
        <div>
          <h2 className="text-3xl mb-1 text-balance">Select a player.</h2>
          <p className="text-muted-foreground font-sans text-sm">Search for a player to transfer.</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Input
          placeholder="Search player..."
          value={playerSearch}
          onChange={handleInputChange}
          onFocus={() => setShowResults(true)}
          className="bg-white border-border text-black placeholder:text-gray-500"
        />

        {showResults && (loading || searchResults.length > 0) && (
          <div className="search-dropdown absolute z-50 w-full mt-1 bg-card text-card-foreground border border-border rounded-md shadow-lg max-h-48 sm:max-h-60 overflow-y-auto">
            {loading ? (
              <div className="px-3 sm:px-4 py-2 text-muted-foreground text-center text-sm">Searching...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map((player) => (
                <div
                  key={player.id}
                  className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handlePlayerSelect(player)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm sm:text-base truncate">{player.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {player.teams} • {player.primary_pos}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {player.total_goals}G {player.total_assists}A • {player.total_matches} matches • {player.seasons_count} seasons
                      </p>
                    </div>
                    <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded flex-shrink-0">{player.nation}</span>
                  </div>
                </div>
              ))
            ) : playerSearch.trim().length >= 1 ? (
              <div className="px-3 sm:px-4 py-2 text-muted-foreground text-center text-sm">No players found</div>
            ) : null}
          </div>
        )}
      </div>

      {selectedPlayer && (
        <Card className="bg-transparent border-border p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-serif italic text-foreground">{selectedPlayer.name}</h3>
                <Badge className="bg-green-700 text-white text-xs px-2 py-0.5">{selectedPlayer.primary_pos}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{selectedPlayer.first_season} - {selectedPlayer.last_season}</p>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-serif italic text-foreground mb-1">{selectedPlayer.total_goals}</div>
              <div className="text-xs text-muted-foreground">Goals</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-serif italic text-foreground mb-1">{selectedPlayer.total_assists}</div>
              <div className="text-xs text-muted-foreground">Assists</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-serif italic text-foreground mb-1">{selectedPlayer.total_matches}</div>
              <div className="text-xs text-muted-foreground">Matches</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-serif italic text-foreground mb-1">{selectedPlayer.seasons_count}</div>
              <div className="text-xs text-muted-foreground">Seasons</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
