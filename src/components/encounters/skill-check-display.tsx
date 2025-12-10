"use client"

import type { SkillCheck } from "@/lib/core/game-types"

interface SkillCheckDisplayProps {
  check: SkillCheck
  compact?: boolean
}

export function SkillCheckDisplay({ check, compact }: SkillCheckDisplayProps) {
  const total = (check.roll || 0) + check.modifier
  const modStr = check.modifier >= 0 ? `+${check.modifier}` : `${check.modifier}`

  const resultColor =
    check.result === "critical_success"
      ? "text-emerald-400"
      : check.result === "success"
        ? "text-emerald-400"
        : check.result === "critical_failure"
          ? "text-red-400"
          : "text-red-400"

  const resultLabel =
    check.result === "critical_success"
      ? "CRITICAL SUCCESS!"
      : check.result === "success"
        ? "Success"
        : check.result === "critical_failure"
          ? "CRITICAL FAILURE!"
          : "Failed"

  if (compact) {
    return (
      <span className={`text-xs ${resultColor}`}>
        [{check.skill} {check.roll}
        {modStr}={total} vs DC{check.difficulty}]
      </span>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 bg-secondary/20 rounded text-sm">
      <span className="text-muted-foreground capitalize">{check.skill}:</span>
      <span className="font-mono">
        <span className={check.roll === 20 ? "text-emerald-400" : check.roll === 1 ? "text-red-400" : ""}>
          {check.roll}
        </span>
        <span className="text-muted-foreground">{modStr}</span>
        <span className="text-muted-foreground"> = </span>
        <span>{total}</span>
      </span>
      <span className="text-muted-foreground">vs DC {check.difficulty}</span>
      <span className={`font-medium ${resultColor}`}>{resultLabel}</span>
    </div>
  )
}
