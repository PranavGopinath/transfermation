"use client";

import { useState, useEffect, useCallback } from "react";
import { Player, Team } from "@/types";
import { PlayerSelector } from "@/components/PlayerSelector";
import { TeamSelector } from "@/components/TeamSelector";
import Customizations from "@/components/Customizations";
import PredictionSection from "@/components/PredictionSection";
import Image from "next/image";
import base from "../../public/base.png";
import base2 from "../../public/base2.png";
import { ScrollIndicator } from "./components/scroll-indicator";

export default function Home() {
  const [playerSearch, setPlayerSearch] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [searchResults, setSearchResults] = useState<Player[]>([]);
  const [teamSearchResults, setTeamSearchResults] = useState<Team[]>([]);
  const [loading, setLoading] = useState(false);
  const [teamLoading, setTeamLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [showTeamResults, setShowTeamResults] = useState(false);
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [prediction, setPrediction] = useState<{
    points_base: number;
    points_with: number;
    delta: number;
    season_target: string;
    season_features_from: string;
  } | null>(null);
  const [predicting, setPredicting] = useState(false);
  const [projectedMinutes, setProjectedMinutes] = useState<number>(2000);
  const [outgoingMinutesText, setOutgoingMinutesText] = useState<string>("");
  const [projectedMinutesError, setProjectedMinutesError] =
    useState<string>("");
  const [outgoingMinutesError, setOutgoingMinutesError] = useState<string>("");
  const [playerMinutes, setPlayerMinutes] = useState<string>("2000");
  const [outgoingMinutes, setOutgoingMinutes] = useState<string>("");

  const baseUrl =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8000";

  const predictImpact = useCallback(async () => {
    console.log('predictImpact called');
    console.log('selectedPlayer:', selectedPlayer);
    console.log('selectedTeam:', selectedTeam);
    console.log('playerMinutes:', playerMinutes);
    console.log('outgoingMinutes:', outgoingMinutes);
    
    if (!selectedPlayer || !selectedTeam) {
      console.log('Missing player or team selection');
      return;
    }

    const nextSeason = (() => {
      const latest = selectedTeam.latest_season || "2024-2025";
      const [y1, y2] = latest.split("-").map((s) => parseInt(s, 10));
      if (isNaN(y1) || isNaN(y2)) return "2025-2026";
      return `${y2}-${y2 + 1}`;
    })();

    const playerMinutesNum = parseInt(playerMinutes, 10);
    console.log('playerMinutesNum:', playerMinutesNum);
    
    if (
      !Number.isFinite(playerMinutesNum) ||
      playerMinutesNum < 0 ||
      playerMinutesNum > 4000
    ) {
      console.log('Invalid player minutes:', playerMinutesNum);
      setProjectedMinutesError("Projected minutes must be between 0 and 4000.");
      return;
    }
    setProjectedMinutesError("");
    console.log('Player minutes validation passed');

    let outgoingParsed: Record<string, number> | undefined = undefined;
    console.log('outgoingMinutes:', outgoingMinutes);
    
    if (outgoingMinutes.trim()) {
      try {
        // Try to parse as JSON first (new format)
        const parsed = JSON.parse(outgoingMinutes);
        if (Array.isArray(parsed)) {
          const temp: Record<string, number> = {};
          for (const item of parsed) {
            if (item.playerName && typeof item.minutes === 'number') {
              temp[item.playerName] = item.minutes;
            }
          }
          outgoingParsed = Object.keys(temp).length ? temp : undefined;
          console.log('outgoingParsed from JSON:', outgoingParsed);
        }
      } catch {
        // Fallback to old format parsing
        if (outgoingMinutes.includes(':')) {
          const parts = outgoingMinutes
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean);
          
          const temp: Record<string, number> = {};
          for (const part of parts) {
            const [name, minsStr] = part.split(":").map((s) => s.trim());
            const minsVal = parseInt(minsStr ?? "", 10);
            
            if (
              !name ||
              !Number.isFinite(minsVal) ||
              minsVal < 0 ||
              minsVal > 4000
            ) {
              console.log('Invalid outgoing minutes format:', part);
              setOutgoingMinutesError(
                'Use "Name:Minutes" with minutes 0–4000, comma-separated.'
              );
              return;
            }
            temp[name] = minsVal;
          }
          outgoingParsed = Object.keys(temp).length ? temp : undefined;
        } else {
          // If it's just a number, treat it as optional and skip validation
          console.log('Outgoing minutes is just a number, treating as optional');
          outgoingParsed = undefined;
        }
      }
    }
    setOutgoingMinutesError("");

    const totalOutgoing = outgoingParsed
      ? Object.values(outgoingParsed).reduce((a, b) => a + b, 0)
      : 0;
    if (totalOutgoing !== playerMinutesNum) {
      const msg = `Total outgoing minutes (${totalOutgoing}) must equal projected minutes (${playerMinutesNum}).`;
      setProjectedMinutesError(msg);
      setOutgoingMinutesError(msg);
      return;
    }

    setPredicting(true);
    setPrediction(null);
    console.log('Making API call to:', `${baseUrl}/prediction/whatif`);
    console.log('Request body:', {
      team_name: selectedTeam.name,
      incoming_player_name: selectedPlayer.name,
      target_season: nextSeason,
      projected_minutes_in: playerMinutesNum,
      outgoing_minutes: outgoingParsed,
      cross_league_scale: 1.0,
    });
    
    try {
      const response = await fetch(`${baseUrl}/prediction/whatif`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          team_name: selectedTeam.name,
          incoming_player_name: selectedPlayer.name,
          target_season: nextSeason,
          projected_minutes_in: playerMinutesNum,
          outgoing_minutes: outgoingParsed,
          cross_league_scale: 1.0,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        setPrediction(result);
      } else {
        const text = await response.text();
        console.error("Prediction failed:", response.status, text);
      }
    } catch (error) {
      console.error("Error predicting impact:", error);
    } finally {
      setPredicting(false);
    }
  }, [
    selectedPlayer,
    selectedTeam,
    baseUrl,
    playerMinutes,
    outgoingMinutes,
  ]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target.closest(".search-dropdown")) {
        setShowResults(false);
        setShowTeamResults(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground pb-6 overflow-x-hidden">
      <section className="relative h-[100vh] w-full overflow-hidden">
        {/* Background photo */}
        <Image
          src={base}
          alt="Base"
          fill
          priority
          sizes="100vw"
          className="object-cover"
        />
        {/* Bottom gradient overlay (the PNG itself) */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[28vh] sm:h-[24vh] md:h-[20vh]">
          <Image
            src={base2} // <-- your gradient PNG with alpha
            alt=""
            aria-hidden
            fill
            sizes="100vw"
            className="object-cover object-bottom"
            // no opacity on parent! keep it isolated so only this strip is affected
          />
        </div>
        {/* Content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
          <h1 className="mb-6 leading-tight flex items-end gap-2 whitespace-nowrap">
            <span className="italic text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl text-primary">
              Transfer
            </span>
            <span className="not-italic text-xl sm:text-2xl md:text-3xl lg:text-4xl xl:text-5xl text-primary">
              mation
            </span>
          </h1>
          <p className="font-sans text-primary/90 text-xs sm:text-base md:text-lg max-w-2xl">
            Discover the predicted impact of your team&apos;s dream signing.
          </p>
        </div>
        <div className="w-full flex text-center justify-center ">
          <ScrollIndicator />
        </div>
      </section>

      <Image src={base2} alt="Base2" className="w-full h-auto max-w-full" />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="bg-transparent text-card-foreground rounded-lg shadow-md p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <PlayerSelector
              playerSearch={playerSearch}
              setPlayerSearch={setPlayerSearch}
              searchResults={searchResults}
              setSearchResults={setSearchResults}
              loading={loading}
              setLoading={setLoading}
              showResults={showResults}
              setShowResults={setShowResults}
              setSelectedPlayer={setSelectedPlayer}
              selectedPlayer={selectedPlayer}
            />

            <TeamSelector
              teamSearch={teamSearch}
              setTeamSearch={setTeamSearch}
              teamSearchResults={teamSearchResults}
              setTeamSearchResults={setTeamSearchResults}
              teamLoading={teamLoading}
              setTeamLoading={setTeamLoading}
              showTeamResults={showTeamResults}
              setShowTeamResults={setShowTeamResults}
              setSelectedTeam={setSelectedTeam}
              selectedTeam={selectedTeam}
            />
          </div>
        </div>

        {/* Customizations Section */}
        <Customizations
          selectedPlayer={selectedPlayer}
          selectedTeam={selectedTeam}
          playerMinutes={playerMinutes}
          setPlayerMinutes={setPlayerMinutes}
          outgoingMinutes={outgoingMinutes}
          setOutgoingMinutes={setOutgoingMinutes}
        />

        {/* Prediction Section */}
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
        />
      </div>
    </div>
  );
}
