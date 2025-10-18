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

  // Check if steps 1 and 2 are completed
  const isStepsCompleted = selectedPlayer && selectedTeam;

  if (!isStepsCompleted) {
    return null;
  }

  return (
    <div className="mb-6">
      <button
        onClick={() => setIsCustomizeExpanded(!isCustomizeExpanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-4"
      >
        {isCustomizeExpanded ? (
          <Minus className="w-4 h-4" />
        ) : (
          <Plus className="w-4 h-4" />
        )}
        <span>Customize</span>
      </button>
      
      {isCustomizeExpanded && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-4">
          <MinutesInput
            label="Incoming mins."
            description="Enter projected minutes for incoming player."
            value={playerMinutes}
            onChange={setPlayerMinutes}
            stepNumber="3"
          />
          <OutgoingMinutesSelector
            selectedPlayer={selectedPlayer}
            selectedTeam={selectedTeam}
            outgoingMinutes={outgoingMinutes}
            setOutgoingMinutes={setOutgoingMinutes}
            stepNumber="4"
          />
        </div>
      )}
    </div>
  );
}
