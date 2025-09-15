'use client';

import { Player } from '@/types';

interface PlayerCardProps {
  player: Player;
}

export default function PlayerCard({ player }: PlayerCardProps) {
  return (
    <div className="border border-border rounded-lg p-4">
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
  );
}
