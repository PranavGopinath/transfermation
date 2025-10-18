'use client';

import React from 'react';
import { Player, Team } from '@/types';
import PlayerCard from './PlayerCard';
import TeamCard from './TeamCard';
import { MinutesInput } from './MinutesInput';

interface PredictionSectionProps {
  selectedPlayer: Player | null;
  selectedTeam: Team | null;
  playerSearch: string;
  searchResults: Player[];
  teamSearch: string;
  teamSearchResults: Team[];
  predictImpact: () => void;
  predicting: boolean;
  prediction: {
    points_base: number;
    points_with: number;
    delta: number;
    season_target: string;
    season_features_from: string;
  } | null;
  projectedMinutes: number;
  setProjectedMinutes: (minutes: number) => void;
  outgoingMinutesText: string;
  setOutgoingMinutesText: (text: string) => void;
  projectedMinutesError: string;
  outgoingMinutesError: string;
  playerMinutes: string;
  setPlayerMinutes: (minutes: string) => void;
  outgoingMinutes: string;
  setOutgoingMinutes: (minutes: string) => void;
}

export default function PredictionSection({
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
  playerMinutes,
  setPlayerMinutes,
  outgoingMinutes,
  setOutgoingMinutes,
}: PredictionSectionProps) {

  return (
    <div className="text-card-foreground rounded-lg shadow-md p-4 sm:p-6 mb-6 w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4">
        <MinutesInput
          label="Enter player mins."
          description="Enter projected minutes for player."
          value={playerMinutes}
          onChange={setPlayerMinutes}
          stepNumber="3"
        />
        <MinutesInput
          label="Outgoing mins"
          description="Enter outgoing minutes for player."
          value={outgoingMinutes}
          onChange={setOutgoingMinutes}
          stepNumber="4"
          optional
        />
      </div>

      <div className="flex justify-center mb-4">
        <button
          onClick={predictImpact}
          disabled={predicting}
          className={`group relative px-4 sm:px-6 py-2 sm:py-3 text-sm sm:text-base rounded-md font-medium transition-all duration-300 transform ${
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

      {prediction && (
        <div className="mt-4 p-3 sm:p-4 rounded-lg" style={{ background: 'var(--gradient-primary)' }}>
          <h3 className="text-base sm:text-lg font-semibold text-foreground mb-3">Predicted Team Points Impact</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">{prediction.points_base?.toFixed ? prediction.points_base.toFixed(1) : prediction.points_base}</div>
              <div className="text-xs sm:text-sm text-foreground">Baseline Points</div>
            </div>
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-bold text-primary">{prediction.points_with?.toFixed ? prediction.points_with.toFixed(1) : prediction.points_with}</div>
              <div className="text-xs sm:text-sm text-foreground">With Transfer</div>
            </div>
            <div className="text-center">
              <div className={`text-2xl sm:text-3xl font-bold ${prediction.delta >= 0 ? 'text-primary' : 'text-destructive'}`}>{prediction.delta?.toFixed ? prediction.delta.toFixed(1) : prediction.delta}</div>
              <div className="text-xs sm:text-sm text-foreground">Delta (± points)</div>
            </div>
          </div>
          <div className="mt-2 text-xs sm:text-sm text-foreground">Season: {prediction.season_target} (features from {prediction.season_features_from})</div>
        </div>
      )}
    </div>
  );
}
