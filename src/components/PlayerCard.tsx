'use client';

import { Player } from '@/types';

interface PlayerCardProps {
  player: Player;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  return (
    <div className="border border-border rounded-lg p-3 sm:p-4">
      <div className="flex justify-between items-start mb-2 gap-2">
        <h3 className="text-sm sm:text-base font-semibold text-foreground truncate flex-1">{player.name}</h3>
        <span className="text-xs bg-secondary text-secondary-foreground px-2 py-1 rounded flex-shrink-0">{player.primary_pos}</span>
      </div>
      <div className="text-xs sm:text-sm text-muted-foreground mb-2">
        <div className="font-medium truncate">{player.teams}</div>
        <div className="text-xs text-muted-foreground">
          {player.first_season} - {player.last_season} • {player.nation}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-1 sm:gap-2 text-xs sm:text-sm">
        <div className="text-center p-1.5 sm:p-2 bg-muted rounded">
          <div className="font-semibold text-primary text-sm sm:text-base">{player.total_goals}</div>
          <div className="text-xs text-muted-foreground">Goals</div>
        </div>
        <div className="text-center p-1.5 sm:p-2 bg-muted rounded">
          <div className="font-semibold text-primary text-sm sm:text-base">{player.total_assists}</div>
          <div className="text-xs text-muted-foreground">Assists</div>
        </div>
        <div className="text-center p-1.5 sm:p-2 bg-muted rounded">
          <div className="font-semibold text-primary text-sm sm:text-base">{player.total_matches}</div>
          <div className="text-xs text-muted-foreground">Matches</div>
        </div>
        <div className="text-center p-1.5 sm:p-2 bg-muted rounded">
          <div className="font-semibold text-primary text-sm sm:text-base">{player.seasons_count}</div>
          <div className="text-xs text-muted-foreground">Seasons</div>
        </div>
      </div>
    </div>
  );
}
