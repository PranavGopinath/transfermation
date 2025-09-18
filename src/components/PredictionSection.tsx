'use client';

import { useState, useCallback } from 'react';
import { Player, Team } from '@/types';
import PlayerCard from './PlayerCard';
import TeamCard from './TeamCard';

interface PredictionSectionProps {
  selectedPlayer: Player | null;
  selectedTeam: Team | null;
  playerSearch: string;
  searchResults: Player[];
  teamSearch: string;
  teamSearchResults: Team[];
  predictImpact: () => void;
  predicting: boolean;
  prediction: any;
  projectedMinutes: number;
  setProjectedMinutes: (minutes: number) => void;
  outgoingMinutesText: string;
  setOutgoingMinutesText: (text: string) => void;
  projectedMinutesError: string;
  outgoingMinutesError: string;
}

export default function PredictionSection({
  selectedPlayer,
  selectedTeam,
  playerSearch,
  searchResults,
  teamSearch,
  teamSearchResults,
  predictImpact,
  predicting,
  prediction,
  projectedMinutes,
  setProjectedMinutes,
  outgoingMinutesText,
  setOutgoingMinutesText,
  projectedMinutesError,
  outgoingMinutesError,
}: PredictionSectionProps) {
  const getOrdinalSuffix = (num: number): string => {
    const j = num % 10;
    const k = num % 100;
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
  };

  return (
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
            <div className="absolute inset-0 rounded-md bg-gradient-to-r from-primary/40 to-transparent animate-pulse" />
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
                  <PlayerCard key={player.id} player={player} />
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
                  <TeamCard key={team.id} team={team} />
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
            onChange={(e) => setOutgoingMinutesText(e.target.value)}
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
  );
}
