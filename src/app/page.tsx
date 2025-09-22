'use client';

import { useState, useEffect, useCallback } from 'react';
import { Player, Team } from '@/types';
import PlayerSearch from '@/components/PlayerSearch';
import TeamSearch from '@/components/TeamSearch';
import PredictionSection from '@/components/PredictionSection';
import ConnectionStatus from '@/components/ConnectionStatus';
import Image from 'next/image';
import base from '../../public/base.svg';
import base2 from '../../public/base2.svg';

export default function Home() {
  const [playerSearch, setPlayerSearch] = useState('');
  const [teamSearch, setTeamSearch] = useState('');
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [teamSearchResults, setTeamSearchResults] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showTeamResults, setShowTeamResults] = useState(false);
  const [usingFallback, setUsingFallback] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [prediction, setPrediction] = useState<any>(null);
  const [predicting, setPredicting] = useState(false);
  const [projectedMinutes, setProjectedMinutes] = useState<number>(2000);
  const [outgoingMinutesText, setOutgoingMinutesText] = useState<string>('');
  const [projectedMinutesError, setProjectedMinutesError] = useState<string>('');
  const [outgoingMinutesError, setOutgoingMinutesError] = useState<string>('');

  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:8000';

  const predictImpact = useCallback(async () => {
    if (!selectedPlayer || !selectedTeam) return;

    const nextSeason = (() => {
      const latest = selectedTeam.latest_season || '2024-2025';
      const [y1, y2] = latest.split('-').map((s) => parseInt(s, 10));
      if (isNaN(y1) || isNaN(y2)) return '2025-2026';
      return `${y2}-${y2 + 1}`;
    })();

    if (!Number.isFinite(projectedMinutes) || projectedMinutes < 0 || projectedMinutes > 4000) {
      setProjectedMinutesError('Projected minutes must be between 0 and 4000.');
      return;
    }
    setProjectedMinutesError('');

    let outgoingParsed: Record<string, number> | undefined = undefined;
    if (outgoingMinutesText.trim()) {
      const parts = outgoingMinutesText.split(',').map((p) => p.trim()).filter(Boolean);
      const temp: Record<string, number> = {};
      for (const part of parts) {
        const [name, minsStr] = part.split(':').map((s) => s.trim());
        const minsVal = parseInt(minsStr ?? '', 10);
        if (!name || !Number.isFinite(minsVal) || minsVal < 0 || minsVal > 4000) {
          setOutgoingMinutesError('Use "Name:Minutes" with minutes 0–4000, comma-separated.');
          return;
        }
        temp[name] = minsVal;
      }
      outgoingParsed = Object.keys(temp).length ? temp : undefined;
    }
    setOutgoingMinutesError('');

    const totalOutgoing = outgoingParsed ? Object.values(outgoingParsed).reduce((a, b) => a + b, 0) : 0;
    if (totalOutgoing !== projectedMinutes) {
      const msg = `Total outgoing minutes (${totalOutgoing}) must equal projected minutes (${projectedMinutes}).`;
      setProjectedMinutesError(msg);
      setOutgoingMinutesError(msg);
      return;
    }

    setPredicting(true);
    setPrediction(null);
    try {
      const response = await fetch(`${baseUrl}/prediction/whatif`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_name: selectedTeam.name,
          incoming_player_name: selectedPlayer.name,
          target_season: nextSeason,
          projected_minutes_in: projectedMinutes,
          outgoing_minutes: outgoingParsed,
          cross_league_scale: 1.0,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setPrediction(result);
      } else {
        const text = await response.text();
        console.error('Prediction failed:', response.status, text);
      }
    } catch (error) {
      console.error('Error predicting impact:', error);
    } finally {
      setPredicting(false);
    }
  }, [selectedPlayer, selectedTeam, baseUrl, projectedMinutes, outgoingMinutesText]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest('.search-dropdown')) {
        setShowResults(false);
        setShowTeamResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pb-6">

<section className="relative h-[100svh] w-screen"> {/* use h-screen if you prefer */}
    <Image
      src={base}
      alt="Base"
      fill
      className="object-cover"
      priority
      sizes="100vw"
    />
    <div className="absolute inset-0 bg-black/50" />
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
      <h1 className="text-5xl md:text-7xl font-serif text-[#EDE6B9] mb-3">
        Transfermation
      </h1>
      <p className="text-[#EDE6B9]/90">
        Discover the predicted impact of your team's dream signing.
      </p>
    </div>
  </section>
  <Image src={base2} alt="Base2" className="w-full h-auto" />
      <div className="max-w-6xl mx-auto">

        <div className="bg-card text-card-foreground rounded-lg shadow-md p-6 mb-6">
          <ConnectionStatus usingFallback={usingFallback} />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <PlayerSearch
              playerSearch={playerSearch}
              setPlayerSearch={setPlayerSearch}
              searchResults={searchResults}
              setSearchResults={setSearchResults}
              loading={loading}
              setLoading={setLoading}
              showResults={showResults}
              setShowResults={setShowResults}
              setSelectedPlayer={setSelectedPlayer}
              usingFallback={usingFallback}
              setUsingFallback={setUsingFallback}
            />

            <TeamSearch
              teamSearch={teamSearch}
              setTeamSearch={setTeamSearch}
              teamSearchResults={teamSearchResults}
              setTeamSearchResults={setTeamSearchResults}
              teamLoading={teamLoading}
              setTeamLoading={setTeamLoading}
              showTeamResults={showTeamResults}
              setShowTeamResults={setShowTeamResults}
              setSelectedTeam={setSelectedTeam}
              usingFallback={usingFallback}
              setUsingFallback={setUsingFallback}
            />
          </div>
        </div>

        {/* Prediction Section */}
        {(selectedPlayer || selectedTeam) && (
          <PredictionSection
            selectedPlayer={selectedPlayer}
            selectedTeam={selectedTeam}
            playerSearch={playerSearch}
            searchResults={searchResults}
            teamSearch={teamSearch}
            teamSearchResults={teamSearchResults}
            predictImpact={predictImpact}
            predicting={predicting}
            prediction={prediction}
            projectedMinutes={projectedMinutes}
            setProjectedMinutes={setProjectedMinutes}
            outgoingMinutesText={outgoingMinutesText}
            setOutgoingMinutesText={setOutgoingMinutesText}
            projectedMinutesError={projectedMinutesError}
            outgoingMinutesError={outgoingMinutesError}
          />
        )}
      </div>
    </div>
  );
}