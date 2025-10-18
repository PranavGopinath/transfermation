'use client';

import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Team } from '@/types';
import Image from 'next/image';
import { X } from 'lucide-react';

interface TeamSelectorProps {
  teamSearch: string;
  setTeamSearch: (value: string) => void;
  teamSearchResults: Team[];
  setTeamSearchResults: (results: Team[]) => void;
  teamLoading: boolean;
  setTeamLoading: (loading: boolean) => void;
  showTeamResults: boolean;
  setShowTeamResults: (show: boolean) => void;
  setSelectedTeam: (team: Team | null) => void;
  selectedTeam: Team | null;
}

export function TeamSelector({
  teamSearch,
  setTeamSearch,
  teamSearchResults,
  setTeamSearchResults,
  teamLoading,
  setTeamLoading,
  showTeamResults,
  setShowTeamResults,
  setSelectedTeam,
  selectedTeam,
}: TeamSelectorProps) {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

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

  const searchTeams = async (query: string) => {
    if (query.trim().length < 1) {
      setTeamSearchResults([]);
      setShowTeamResults(false);
      return;
    }
    setTeamLoading(true);
    try {
      const url = `${baseUrl}/team/search?q=${encodeURIComponent(query)}`;
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) {
        setTeamSearchResults([]);
      } else {
        const data = await response.json();
        setTeamSearchResults(data);
      }
    } catch (err) {
      setTeamSearchResults([]);
    } finally {
      setTeamLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setTeamSearch(value);
    setShowTeamResults(true);
    
    // Search immediately without delay
    searchTeams(value);
  };

  const handleTeamSelect = (team: Team) => {
    setTeamSearch(team.name);
    setSelectedTeam(team);
    setShowTeamResults(false);
    setTeamSearchResults([]);
  };

  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-serif italic text-lg">2.</span>
        </div>
        <div>
          <h2 className="text-3xl mb-1 text-balance">Select a team.</h2>
          <p className="text-muted-foreground font-sans text-sm">Search for a team to transfer player to.</p>
        </div>
      </div>

      <div className="relative mb-4">
        <Input
          placeholder="Search team..."
          value={teamSearch}
          onChange={handleInputChange}
          onFocus={() => setShowTeamResults(true)}
          className="bg-white border-border text-black placeholder:text-gray-500"
        />

        {showTeamResults && (teamLoading || teamSearchResults.length > 0) && (
          <div className="search-dropdown absolute z-50 w-full mt-1 bg-card text-card-foreground border border-border rounded-md shadow-lg max-h-48 sm:max-h-60 overflow-y-auto">
            {teamLoading ? (
              <div className="px-3 sm:px-4 py-2 text-muted-foreground text-center text-sm">Searching...</div>
            ) : teamSearchResults.length > 0 ? (
              teamSearchResults.map((team) => (
                <div
                  key={team.id}
                  className="px-3 sm:px-4 py-2 sm:py-3 hover:bg-muted cursor-pointer border-b border-border last:border-b-0"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => handleTeamSelect(team)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-foreground text-sm sm:text-base truncate">{team.name}</h4>
                      <p className="text-xs sm:text-sm text-muted-foreground truncate">
                        {team.league} • {team.country}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {team.active_2024_2025 ? 'Current Season' : `Last: ${team.latest_season}`}
                        {team.position_2425 && ` • ${team.position_2425}${getOrdinalSuffix(team.position_2425)}`}
                      </p>
                    </div>
                    <div className="flex flex-col items-end flex-shrink-0">
                      <Image 
                        src={getCountryFlag(team.country)} 
                        alt={team.country} 
                        width={20}
                        height={20}
                        className="w-5 h-5 sm:w-6 sm:h-6"
                      />
                    </div>
                  </div>
                </div>
              ))
            ) : teamSearch.trim().length >= 1 ? (
              <div className="px-3 sm:px-4 py-2 text-muted-foreground text-center text-sm">No teams found</div>
            ) : null}
          </div>
        )}
      </div>

      {selectedTeam && (
        <Card className="bg-transparent border-border p-6">
          <div className="flex items-start justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-serif italic text-foreground">{selectedTeam.name}</h3>
                <Badge className="bg-green-700 text-white text-xs px-2 py-0.5">{selectedTeam.league}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{selectedTeam.country} • {selectedTeam.league}</p>
            </div>
            <X className="w-4 h-4 text-red-400 cursor-pointer" onClick={() => setSelectedTeam(null)} />
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-3xl font-serif italic text-foreground mb-1">
                {selectedTeam.position_2425 || 'N/A'}
                {selectedTeam.position_2425 && (
                  <sup className="text-sm">{getOrdinalSuffix(selectedTeam.position_2425)}</sup>
                )}
              </div>
              <div className="text-xs text-muted-foreground">Position</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-serif italic text-foreground mb-1">{selectedTeam.points_2425 || 'N/A'}</div>
              <div className="text-xs text-muted-foreground">Points</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-serif italic text-foreground mb-1">{selectedTeam.wins_2425 || 'N/A'}</div>
              <div className="text-xs text-muted-foreground">Wins</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-serif italic text-foreground mb-1">{selectedTeam.losses_2425 || 'N/A'}</div>
              <div className="text-xs text-muted-foreground">Losses</div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
