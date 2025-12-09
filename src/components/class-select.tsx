"use client"

import { useState } from "react"
import { CLASSES, type PlayerClass } from "@/lib/ability-system"
import { cn } from "@/lib/utils"

interface ClassSelectProps {
  onSelectClass: (classId: PlayerClass) => void
}

export function ClassSelect({ onSelectClass }: ClassSelectProps) {
  const [selectedClass, setSelectedClass] = useState<PlayerClass | null>(null)
  const [hoveredClass, setHoveredClass] = useState<PlayerClass | null>(null)

  const displayClass = hoveredClass || selectedClass
  const classInfo = displayClass ? CLASSES[displayClass] : null

  const classOrder: PlayerClass[] = [
    "warrior",
    "barbarian",
    "paladin",
    "rogue",
    "ranger",
    "mage",
    "warlock",
    "necromancer",
    "cleric",
    "monk",
  ]

  return (
    <div className="flex flex-col items-center gap-6 p-6 max-w-2xl mx-auto">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-amber-200/90">Choose Your Path</h2>
        <p className="text-stone-400 text-sm">Select a class to begin your journey into the depths</p>
      </div>

      {/* Class Grid */}
      <div className="grid grid-cols-5 gap-2 w-full">
        {classOrder.map((classId) => {
          const cls = CLASSES[classId]
          return (
            <button
              key={classId}
              onClick={() => setSelectedClass(classId)}
              onMouseEnter={() => setHoveredClass(classId)}
              onMouseLeave={() => setHoveredClass(null)}
              className={cn(
                "p-3 rounded transition-all text-center",
                "bg-stone-800/50 hover:bg-stone-700/50",
                selectedClass === classId && "ring-1 ring-amber-500/50 bg-stone-700/60",
                cls.color,
              )}
            >
              <div className="text-sm font-medium">{cls.name}</div>
            </button>
          )
        })}
      </div>

      {/* Class Info Panel */}
      <div className={cn("w-full min-h-[200px] rounded p-4 transition-all", "bg-stone-800/30")}>
        {classInfo ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className={cn("text-xl font-bold", classInfo.color)}>{classInfo.name}</h3>
              <span className={cn("text-xs px-2 py-1 rounded bg-stone-700/50", classInfo.color)}>
                {classInfo.resourceType.toUpperCase()}
              </span>
            </div>

            <p className="text-stone-300 text-sm">{classInfo.description}</p>
            <p className="text-stone-500 text-xs italic">{classInfo.lore}</p>

            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="bg-stone-700/30 p-2 rounded">
                <div className="text-stone-500">Health</div>
                <div
                  className={cn(
                    classInfo.statBonuses.health > 0
                      ? "text-green-400"
                      : classInfo.statBonuses.health < 0
                        ? "text-red-400"
                        : "text-stone-400",
                  )}
                >
                  {classInfo.statBonuses.health > 0 ? "+" : ""}
                  {classInfo.statBonuses.health}
                </div>
              </div>
              <div className="bg-stone-700/30 p-2 rounded">
                <div className="text-stone-500">Attack</div>
                <div
                  className={cn(
                    classInfo.statBonuses.attack > 0
                      ? "text-green-400"
                      : classInfo.statBonuses.attack < 0
                        ? "text-red-400"
                        : "text-stone-400",
                  )}
                >
                  {classInfo.statBonuses.attack > 0 ? "+" : ""}
                  {classInfo.statBonuses.attack}
                </div>
              </div>
              <div className="bg-stone-700/30 p-2 rounded">
                <div className="text-stone-500">Defense</div>
                <div
                  className={cn(
                    classInfo.statBonuses.defense > 0
                      ? "text-green-400"
                      : classInfo.statBonuses.defense < 0
                        ? "text-red-400"
                        : "text-stone-400",
                  )}
                >
                  {classInfo.statBonuses.defense > 0 ? "+" : ""}
                  {classInfo.statBonuses.defense}
                </div>
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-stone-500 text-xs">Starting Abilities</div>
              <div className="flex flex-wrap gap-2">
                {classInfo.startingAbilities.map((abilityId) => (
                  <span key={abilityId} className="text-xs px-2 py-1 bg-stone-700/50 rounded text-stone-300">
                    {abilityId.split("_")[1]}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-stone-500 text-sm">
            Hover over a class to see details
          </div>
        )}
      </div>

      {/* Confirm Button */}
      <button
        onClick={() => selectedClass && onSelectClass(selectedClass)}
        disabled={!selectedClass}
        className={cn(
          "w-full py-3 rounded font-medium transition-all",
          selectedClass
            ? "bg-amber-600/80 hover:bg-amber-500/80 text-stone-900"
            : "bg-stone-700/50 text-stone-500 cursor-not-allowed",
        )}
      >
        {selectedClass ? `Embark as ${CLASSES[selectedClass].name}` : "Select a Class"}
      </button>
    </div>
  )
}
