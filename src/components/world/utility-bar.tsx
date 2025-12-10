"use client"

import type { PlayerCapability } from "@/lib/mechanics/player-capabilities"

interface UtilityBarProps {
  capabilities: PlayerCapability[]
  onUse: (capability: PlayerCapability) => void
  disabled?: boolean
}

/**
 * Utility bar for always-available capabilities (Teleport, etc.)
 * Displays as a compact row of buttons below the main action area
 */
export function UtilityBar({ capabilities, onUse, disabled }: UtilityBarProps) {
  if (capabilities.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5 p-2 border-t border-stone-700/50 bg-stone-900/30">
      <span className="text-stone-500 text-xs uppercase tracking-wide self-center mr-1">
        Utility:
      </span>
      {capabilities.map((cap) => (
        <button
          key={cap.id}
          onClick={() => onUse(cap)}
          disabled={disabled || !cap.available}
          className={`
            px-2.5 py-1 text-xs rounded border transition-colors
            ${cap.available && !disabled
              ? "bg-stone-800 border-stone-600 hover:bg-stone-700 hover:border-stone-500 text-stone-200"
              : "bg-stone-900 border-stone-700 text-stone-500 cursor-not-allowed"
            }
          `}
          title={cap.available ? cap.description || cap.name : cap.reason || "Unavailable"}
        >
          {getCapabilityIcon(cap)} {cap.name}
          {cap.cost && (
            <span className="ml-1 text-stone-400">
              ({cap.cost.amount} {getResourceAbbrev(cap.cost.type)})
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

/**
 * Get an icon character for a capability based on its utility type
 */
function getCapabilityIcon(cap: PlayerCapability): string {
  switch (cap.utilityType) {
    case "teleport":
      return "◈"
    case "light":
      return "☀"
    case "identify":
      return "◎"
    case "scry":
      return "◇"
    case "ward_area":
      return "◆"
    case "dispel":
      return "✧"
    default:
      return "◦"
  }
}

/**
 * Get abbreviated resource type for display
 */
function getResourceAbbrev(type: string): string {
  switch (type) {
    case "mana":
      return "MP"
    case "health":
      return "HP"
    case "rage":
      return "RP"
    case "energy":
      return "EP"
    case "focus":
      return "FP"
    case "consumable":
      return "×"
    default:
      return ""
  }
}
