"use client"

import { useState, useEffect } from "react"
import { Team } from "@/types"
import { Card } from "./ui/card"
import { Input } from "./ui/input"
import { Badge } from "./ui/badge"
import { Button } from "./ui/button"
import { X, Plus } from "lucide-react"

interface OutgoingMinutesSelectorProps {
  selectedTeam: Team | null
  outgoingMinutes: string
  setOutgoingMinutes: (minutes: string) => void
  stepNumber: string
}

interface PlayerMinutes {
  playerName: string
  minutes: number
}

export function OutgoingMinutesSelector({
  selectedTeam,
  outgoingMinutes,
  setOutgoingMinutes,
  stepNumber,
}: OutgoingMinutesSelectorProps) {
  const [playerMinutesList, setPlayerMinutesList] = useState<PlayerMinutes[]>([])
  const [newPlayerName, setNewPlayerName] = useState("")
  const [newMinutes, setNewMinutes] = useState("")

  // Parse outgoing minutes string to player list
  useEffect(() => {
    if (outgoingMinutes) {
      try {
        const parsed = JSON.parse(outgoingMinutes)
        if (Array.isArray(parsed)) {
          setPlayerMinutesList(parsed)
        }
      } catch {
        // If not JSON, try to parse as "Name:Minutes,Name2:Minutes" format
        const parts = outgoingMinutes.split(",").map(p => p.trim()).filter(Boolean)
        const parsed = parts.map(part => {
          const [name, minsStr] = part.split(":").map(s => s.trim())
          return {
            playerName: name || "",
            minutes: parseInt(minsStr || "0", 10) || 0
          }
        }).filter(p => p.playerName)
        setPlayerMinutesList(parsed)
      }
    }
  }, [outgoingMinutes])


  const addPlayerMinutes = () => {
    if (!newPlayerName.trim() || !newMinutes.trim()) return

    const minutes = parseInt(newMinutes, 10)
    if (isNaN(minutes) || minutes < 0 || minutes > 4000) return

    const newList = [...playerMinutesList, { playerName: newPlayerName.trim(), minutes }]
    setPlayerMinutesList(newList)
    setOutgoingMinutes(JSON.stringify(newList))
    setNewPlayerName("")
    setNewMinutes("")
  }

  const removePlayerMinutes = (index: number) => {
    const newList = playerMinutesList.filter((_, i) => i !== index)
    setPlayerMinutesList(newList)
    setOutgoingMinutes(JSON.stringify(newList))
  }


  const totalMinutes = playerMinutesList.reduce((sum, p) => sum + p.minutes, 0)

  return (
    <div>
      <div className="flex items-start gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
          <span className="text-primary font-serif italic text-lg">{stepNumber}.</span>
        </div>
        <div>
          <h2 className="text-3xl mb-1 text-balance">
            Outgoing mins <span className="italic">(optional)</span>
          </h2>
          <p className="text-muted-foreground font-sans text-sm">
            Select players from {selectedTeam?.name} to replace with incoming minutes.
          </p>
        </div>
      </div>

      {/* Add Player Minutes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mb-4">
        <Input
          placeholder="Player name"
          value={newPlayerName}
          onChange={(e) => setNewPlayerName(e.target.value)}
          className="bg-white border-border text-black placeholder:text-gray-500"
        />
        <Input
          type="number"
          placeholder="Minutes"
          value={newMinutes}
          onChange={(e) => setNewMinutes(e.target.value)}
          className="bg-white border-border text-black placeholder:text-gray-500"
        />
        <Button
          onClick={addPlayerMinutes}
          disabled={!newPlayerName.trim() || !newMinutes.trim()}
          className="bg-primary hover:bg-primary/90 text-black"
        >
          <Plus className="w-4 h-4 mr-1" />
          Add
        </Button>
      </div>

      {/* Current Player Minutes List */}
      {playerMinutesList.length > 0 && (
        <Card className="bg-transparent border-border p-4">
          <div className="flex justify-between items-center mb-3">
            <h3 className="text-sm font-medium text-foreground">Selected Players</h3>
            <div className="text-sm text-muted-foreground">
              Total: {totalMinutes} minutes
            </div>
          </div>
          <div className="space-y-2">
            {playerMinutesList.map((player, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted/50 rounded-md"
              >
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {player.minutes}m
                  </Badge>
                  <span className="text-sm text-foreground">{player.playerName}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removePlayerMinutes(index)}
                  className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                >
                  <X className="w-3 h-3" />
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}
