'use client';

import { Team } from '@/types';
import Image from 'next/image';

interface TeamCardProps {
  team: Team;
}

export default function TeamCard({ team }: TeamCardProps) {
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

  return (
    <div className="border border-border rounded-lg p-3 sm:p-4">
      <div className="flex justify-between items-start gap-2">
        <h3 className="text-sm sm:text-base font-semibold text-foreground mb-1 truncate flex-1">{team.name}</h3>
        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded flex-shrink-0">{team.league}</span>
      </div>
      <div className="text-xs sm:text-sm text-muted-foreground mb-2">
        <div className="font-medium flex items-center gap-2">
          <Image 
            src={getCountryFlag(team.country)} 
            alt={team.country} 
            width={14}
            height={14}
            className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0"
          />
          <span className="truncate">{team.country}</span>
        </div>
        <div className="text-xs text-muted-foreground">
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
        <div className="text-center p-1.5 sm:p-2 bg-muted rounded">
          <div className="font-semibold text-primary text-sm sm:text-base">
            {team.position_2425 ? `${team.position_2425}${getOrdinalSuffix(team.position_2425)}` : 'N/A'}
          </div>
          <div className="text-xs text-muted-foreground">Position</div>
        </div>
        <div className="text-center p-1.5 sm:p-2 bg-muted rounded">
          <div className="font-semibold text-primary text-sm sm:text-base">
            {team.points_2425 || 'N/A'}
          </div>
          <div className="text-xs text-muted-foreground">Points</div>
        </div>
        <div className="text-center p-1.5 sm:p-2 bg-muted rounded">
          <div className="font-semibold text-primary text-sm sm:text-base">
            {team.wins_2425 || 'N/A'}
          </div>
          <div className="text-xs text-muted-foreground">Wins</div>
        </div>
        <div className="text-center p-1.5 sm:p-2 bg-muted rounded">
          <div className="font-semibold text-primary text-sm sm:text-base">
            {team.losses_2425 || 'N/A'}
          </div>
          <div className="text-xs text-muted-foreground">Losses</div>
        </div>
      </div>
    </div>
  );
}
