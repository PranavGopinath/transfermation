'use client';

import React, { useState } from 'react';
import { Player, Team } from '@/types';
import { MinutesInput } from './MinutesInput';
import { OutgoingMinutesSelector } from './OutgoingMinutesSelector';
import { Plus, Minus } from 'lucide-react';

interface CustomizationsProps {
  selectedPlayer: Player | null;
  selectedTeam: Team | null;
  playerMinutes: string;
  setPlayerMinutes: (minutes: string) => void;
  outgoingMinutes: string;
  setOutgoingMinutes: (minutes: string) => void;
}

export default function Customizations({
  selectedPlayer,
  selectedTeam,
  playerMinutes,
  setPlayerMinutes,
  outgoingMinutes,
  setOutgoingMinutes,
}: CustomizationsProps) {
  const [isCustomizeExpanded, setIsCustomizeExpanded] = useState(false);

  const isStepsCompleted = selectedPlayer && selectedTeam;

  return (
    <div className="mb-6">
      <button
        onClick={() => isStepsCompleted && setIsCustomizeExpanded(!isCustomizeExpanded)}
        disabled={!isStepsCompleted}
        className={`flex items-center gap-2 text-sm transition-colors mb-4 ${
          isStepsCompleted
            ? "text-muted-foreground hover:text-foreground cursor-pointer"
            : "text-muted-foreground/50 cursor-not-allowed"
        }`}
      >
        {isCustomizeExpanded ? (
          <Minus className="w-4 h-4" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        <span>Customize</span>
      </button>
      
      {isCustomizeExpanded && isStepsCompleted && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4">
          <MinutesInput
            label="Incoming mins."
            description="Enter projected minutes for incoming player"
            value={playerMinutes}
            onChange={setPlayerMinutes}
            stepNumber="3"
            optional={true}
          />
          <OutgoingMinutesSelector
            selectedTeam={selectedTeam}
            outgoingMinutes={outgoingMinutes}
            setOutgoingMinutes={setOutgoingMinutes}
            stepNumber="4"
            optional={true}
          />
        </div>
      )}
    </div>
  );
}
