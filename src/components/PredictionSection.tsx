'use client';

import React from 'react';
import { Button } from './ui/button';

interface PredictionSectionProps {
  predictImpact: () => void;
  predicting: boolean;
  prediction: {
    points_base: number;
    points_with: number;
    delta: number;
    season_target: string;
    season_features_from: string;
  } | null;
}

export default function PredictionSection({
  predictImpact,
  predicting,
  prediction,
}: PredictionSectionProps) {
  return (
    <div className="text-card-foreground rounded-lg shadow-md p-4 sm:p-6 mb-6 w-full">
      <div className="flex items-center gap-4 mb-16">
        <div className="flex-1 h-px bg-border" />
        <p className="text-muted-foreground italic text-sm">
          {"See your predicted transfer impact ... maybe it will happen?"}
        </p>
        <Button
          onClick={predictImpact}
          disabled={predicting}
          className="bg-primary hover:bg-primary/90 text-black cursor-pointer px-8 py-6 text-lg font-serif italic"
        >
          {predicting ? 'Predicting...' : 'Impact'}
        </Button>
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
