'use client';

import { useEffect, useCallback } from 'react';
import { Team } from '@/types';
import Image from 'next/image';

interface TeamSearchProps {
  teamSearch: string;
  setTeamSearch: (value: string) => void;
  teamSearchResults: Team[];
  setTeamSearchResults: (results: Team[]) => void;
  teamLoading: boolean;
  setTeamLoading: (loading: boolean) => void;
  showTeamResults: boolean;
  setShowTeamResults: (show: boolean) => void;
  setSelectedTeam: (team: Team | null) => void;
}

export default function TeamSearch({
  teamSearch,
  setTeamSearch,
  teamSearchResults,
  setTeamSearchResults,
  teamLoading,
  setTeamLoading,
  showTeamResults,
  setShowTeamResults,
  setSelectedTeam,
}: TeamSearchProps) {
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
      } else {
        const data = await response.json();
        setTeamSearchResults(data);
      }
    } catch (err) {
      console.error('Error searching teams:', err);
      setTeamSearchResults([]);
    } finally {
      setTeamLoading(false);
    }
  }, [baseUrl, setTeamSearchResults, setTeamLoading, setShowTeamResults]);

  useEffect(() => {
    const t = setTimeout(() => searchTeams(teamSearch), 300);
    return () => clearTimeout(t);
  }, [teamSearch, searchTeams]);

  return (
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
        className={`w-full px-3 sm:px-4 py-2 sm:py-3 text-sm sm:text-base border border-border bg-card rounded-md focus:ring-2 focus:ring-primary focus:border-transparent ${
          teamSearch ? 'text-foreground' : 'text-muted-foreground'
        }`}
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
                onClick={() => {
                  setTeamSearch(team.name);
                  setSelectedTeam(team);
                  setShowTeamResults(false);
                  setTeamSearchResults([]);
                }}
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
          ) : teamSearch.trim().length >= 2 ? (
            <div className="px-3 sm:px-4 py-2 text-muted-foreground text-center text-sm">No teams found</div>
          ) : null}
        </div>
      )}
    </div>
  );
}
