"use client"

import { useState } from "react"
import { RACE_DEFINITIONS, type PlayerRace, type RaceDefinition } from "@/lib/character/race-system"
import { cn } from "@/lib/core/utils"

interface RaceSelectProps {
  onSelectRace: (raceId: PlayerRace) => void
  selectedClass?: string | null // To show class synergies/restrictions
}

export function RaceSelect({ onSelectRace, selectedClass }: RaceSelectProps) {
  const [selectedRace, setSelectedRace] = useState<PlayerRace | null>(null)
  const [hoveredRace, setHoveredRace] = useState<PlayerRace | null>(null)

  const displayRace = hoveredRace || selectedRace
  const raceInfo: RaceDefinition | null = displayRace ? RACE_DEFINITIONS[displayRace] : null

  // Organized by category
  const raceOrder: PlayerRace[] = [
    // Row 1: Mortals
    "human", "elf", "dark_elf", "dwarf", "halfling",
    // Row 2: Exotic
    "orc", "gnome", "half_giant", "dragonborn", "tiefling",
    // Row 3: Supernatural
    "demon", "angel", "undead", "vampire", "werewolf",
  ]

  const isRestricted = (race: PlayerRace): boolean => {
    if (!selectedClass) return false
    const def = RACE_DEFINITIONS[race]
    return def.classRestrictions?.includes(selectedClass as any) ?? false
  }

  const hasSynergy = (race: PlayerRace): boolean => {
    if (!selectedClass) return false
    const def = RACE_DEFINITIONS[race]
    return def.classSynergies?.some(s => s.class === selectedClass) ?? false
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-amber-200/90">Choose Your Heritage</h2>
        <p className="text-stone-400 text-sm">Select a race to shape your abilities and destiny</p>
      </div>

      {/* Race Grid */}
      <div className="grid grid-cols-5 gap-2 w-full">
        {raceOrder.map((raceId) => {
          const race = RACE_DEFINITIONS[raceId]
          const restricted = isRestricted(raceId)
          const synergy = hasSynergy(raceId)
          return (
            <button
              key={raceId}
              onClick={() => !restricted && setSelectedRace(raceId)}
              onMouseEnter={() => setHoveredRace(raceId)}
              onMouseLeave={() => setHoveredRace(null)}
              disabled={restricted}
              className={cn(
                "p-3 rounded transition-all text-center relative",
                "bg-stone-800/50 hover:bg-stone-700/50",
                selectedRace === raceId && "ring-1 ring-amber-500/50 bg-stone-700/60",
                synergy && "ring-1 ring-green-500/30",
                restricted && "opacity-40 cursor-not-allowed",
                race.color,
              )}
            >
              <div className="text-sm font-medium">{race.name}</div>
              {synergy && <div className="absolute -top-1 -right-1 w-2 h-2 bg-green-500 rounded-full" />}
            </button>
          )
        })}
      </div>

      {/* Race Info Panel */}
      <div className={cn("w-full min-h-[240px] rounded p-4 transition-all", "bg-stone-800/30")}>
        {raceInfo ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={cn("text-xl font-bold", raceInfo.color)}>{raceInfo.name}</h3>
              <span className="text-xs px-2 py-1 rounded bg-stone-700/50 text-stone-400">
                {raceInfo.category.toUpperCase()}
              </span>
            </div>

            <p className="text-stone-300 text-sm">{raceInfo.description}</p>
            <p className="text-stone-500 text-xs italic">{raceInfo.lore}</p>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2 text-xs">
              {Object.entries(raceInfo.statBonuses).slice(0, 6).map(([stat, value]) => (
                <div key={stat} className="bg-stone-700/30 p-2 rounded">
                  <div className="text-stone-500 capitalize">{stat}</div>
                  <div className={cn(
                    value > 0 ? "text-green-400" : value < 0 ? "text-red-400" : "text-stone-400"
                  )}>
                    {value > 0 ? "+" : ""}{value}
                  </div>
                </div>
              ))}
            </div>

            {/* Resistances & Weaknesses */}
            <div className="flex gap-4 text-xs">
              {raceInfo.resistances.length > 0 && (
                <div>
                  <span className="text-green-400">Resist: </span>
                  {raceInfo.resistances.map(r => `${r.type} -${r.reduction}%`).join(", ")}
                </div>
              )}
              {raceInfo.weaknesses.length > 0 && (
                <div>
                  <span className="text-red-400">Weak: </span>
                  {raceInfo.weaknesses.map(w => `${w.type} +${w.increase}%`).join(", ")}
                </div>
              )}
            </div>

            {/* Racial Abilities */}
            <div className="space-y-1">
              <div className="text-stone-500 text-xs">Racial Abilities</div>
              <div className="flex flex-wrap gap-2">
                {raceInfo.abilities.map((ability) => (
                  <span
                    key={ability.id}
                    className={cn(
                      "text-xs px-2 py-1 bg-stone-700/50 rounded",
                      ability.isPassive ? "text-blue-300" : "text-amber-300"
                    )}
                    title={ability.description}
                  >
                    {ability.name} {ability.unlockLevel > 1 && `(Lv.${ability.unlockLevel})`}
                  </span>
                ))}
              </div>
            </div>

            {/* Class Synergy Note */}
            {selectedClass && raceInfo.classSynergies?.some(s => s.class === selectedClass) && (
              <div className="text-green-400 text-xs bg-green-900/20 p-2 rounded">
                Synergy: {raceInfo.classSynergies.find(s => s.class === selectedClass)?.bonus}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-stone-500 text-sm">
            Hover over a race to see details
          </div>
        )}
      </div>

      {/* Confirm Button */}
      <button
        onClick={() => selectedRace && onSelectRace(selectedRace)}
        disabled={!selectedRace}
        className={cn(
          "w-full py-3 rounded font-medium transition-all",
          selectedRace
            ? "bg-amber-600/80 hover:bg-amber-500/80 text-stone-900"
            : "bg-stone-700/50 text-stone-500 cursor-not-allowed",
        )}
      >
        {selectedRace ? `Begin as ${RACE_DEFINITIONS[selectedRace].name}` : "Select a Race"}
      </button>
    </div>
  )
}
