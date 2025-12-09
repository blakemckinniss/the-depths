"use client"

import { useState } from "react"
import { EntityText } from "./entity-text"
import type { UnknownItem, Player, SkillCheck } from "@/lib/game-types"
import { rollSkillCheck, formatSkillCheck, getDifficultyLabel } from "@/lib/skill-check"
import type { UnknownItemUseResponse } from "@/lib/use-event-chain"

interface UnknownItemUseProps {
  item: UnknownItem
  player: Player
  onUse: (method: string, target: string) => Promise<UnknownItemUseResponse | null>
  onCancel: () => void
  onResult: (result: UnknownItemUseResponse, skillCheck?: SkillCheck) => void
  isGenerating: boolean
}

export function UnknownItemUse({ item, player: _player, onUse, onCancel, onResult, isGenerating }: UnknownItemUseProps) {
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null)
  const [selectedTarget, setSelectedTarget] = useState<string>("self")
  const [pendingResult, setPendingResult] = useState<UnknownItemUseResponse | null>(null)
  const [skillCheckResult, setSkillCheckResult] = useState<SkillCheck | null>(null)
  const [phase, setPhase] = useState<"select" | "confirm" | "skill_check" | "result">("select")

  const handleMethodSelect = (method: string) => {
    setSelectedMethod(method)
    setPhase("confirm")
  }

  const handleConfirmUse = async () => {
    if (!selectedMethod) return

    const result = await onUse(selectedMethod, selectedTarget)
    if (result) {
      setPendingResult(result)

      // Check if skill check is required
      if (result.skillCheck?.required) {
        setPhase("skill_check")
      } else {
        setPhase("result")
        onResult(result)
      }
    }
  }

  const handleSkillCheck = () => {
    if (!pendingResult?.skillCheck || !skillCheckResult) return

    // Apply skill check results
    onResult(pendingResult, skillCheckResult)
    setPhase("result")
  }

  const performSkillCheck = () => {
    if (!pendingResult?.skillCheck) return

    const check = rollSkillCheck(_player, pendingResult.skillCheck.skill, pendingResult.skillCheck.difficulty)
    setSkillCheckResult(check)
  }

  // Get danger color based on method
  const getMethodDanger = (method: string): string => {
    const dangerous = ["drink", "consume", "eat", "absorb", "inject"]
    const risky = ["apply", "throw", "break", "taste"]
    if (dangerous.includes(method.toLowerCase())) return "text-red-400"
    if (risky.includes(method.toLowerCase())) return "text-amber-400"
    return "text-emerald-400"
  }

  return (
    <div className="space-y-4 p-4 bg-background/50 rounded">
      {/* Item Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <EntityText type={item.rarity}>
            {item.name}
          </EntityText>
          <span className="text-xs text-muted-foreground">({item.rarity})</span>
        </div>
        <p className="text-sm text-muted-foreground italic">{item.appearance}</p>
      </div>

      {/* Sensory Details */}
      {item.sensoryDetails && Object.keys(item.sensoryDetails).length > 0 && (
        <div className="text-xs space-y-1 text-muted-foreground/80">
          {item.sensoryDetails.smell && <div>Smell: {item.sensoryDetails.smell}</div>}
          {item.sensoryDetails.texture && <div>Texture: {item.sensoryDetails.texture}</div>}
          {item.sensoryDetails.weight && <div>Weight: {item.sensoryDetails.weight}</div>}
          {item.sensoryDetails.sound && <div>Sound: {item.sensoryDetails.sound}</div>}
        </div>
      )}

      {/* AI Hints */}
      {item.aiHints && item.aiHints.length > 0 && (
        <div className="text-xs italic text-amber-400/70 space-y-1">
          {item.aiHints.map((hint, i) => (
            <div key={i}>&quot;{hint}&quot;</div>
          ))}
        </div>
      )}

      {/* Phase: Select Method */}
      {phase === "select" && (
        <div className="space-y-2">
          <div className="text-sm text-muted-foreground">How do you wish to use this?</div>
          <div className="flex flex-wrap gap-2">
            {item.possibleUses.map((method) => (
              <button
                key={method}
                onClick={() => handleMethodSelect(method)}
                className={`px-3 py-1.5 text-sm bg-secondary/30 hover:bg-secondary/60 
                  transition-colors rounded capitalize ${getMethodDanger(method)}`}
              >
                {method}
              </button>
            ))}
          </div>
          <button onClick={onCancel} className="text-xs text-muted-foreground hover:text-foreground">
            Put it away
          </button>
        </div>
      )}

      {/* Phase: Confirm */}
      {phase === "confirm" && selectedMethod && (
        <div className="space-y-3">
          <div className="text-sm">
            <span className="text-muted-foreground">Action: </span>
            <span className={`capitalize ${getMethodDanger(selectedMethod)}`}>{selectedMethod}</span>
            <span className="text-muted-foreground"> the </span>
            <EntityText type={item.rarity}>
              {item.name}
            </EntityText>
          </div>

          {/* Target selection for certain methods */}
          {["apply", "throw", "use on"].some((m) => selectedMethod.toLowerCase().includes(m)) && (
            <div className="flex gap-2 text-sm">
              <span className="text-muted-foreground">Target:</span>
              {["self", "weapon", "armor", "environment"].map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTarget(t)}
                  className={`px-2 py-0.5 text-xs rounded capitalize ${
                    selectedTarget === t
                      ? "bg-primary/30 text-primary"
                      : "bg-secondary/20 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          )}

          <div className="text-xs text-amber-400/70 italic">This action may have unknown consequences...</div>

          <div className="flex gap-2">
            <button
              onClick={handleConfirmUse}
              disabled={isGenerating}
              className="px-4 py-2 text-sm bg-primary/20 hover:bg-primary/40 
                text-primary transition-colors rounded disabled:opacity-50"
            >
              {isGenerating ? "The fates decide..." : "Proceed"}
            </button>
            <button
              onClick={() => setPhase("select")}
              className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              Back
            </button>
          </div>
        </div>
      )}

      {/* Phase: Skill Check */}
      {phase === "skill_check" && pendingResult?.skillCheck && (
        <div className="space-y-3">
          <div className="text-amber-400 text-sm font-medium">A skill check is required!</div>

          <div className="p-3 bg-secondary/20 rounded space-y-2">
            <div className="flex justify-between text-sm">
              <span className="capitalize">{pendingResult.skillCheck.skill} Check</span>
              <span className="text-muted-foreground">
                DC {pendingResult.skillCheck.difficulty} ({getDifficultyLabel(pendingResult.skillCheck.difficulty)})
              </span>
            </div>

            {!skillCheckResult ? (
              <button
                onClick={performSkillCheck}
                className="w-full py-2 bg-amber-500/20 hover:bg-amber-500/40 
                  text-amber-400 rounded transition-colors text-sm"
              >
                Roll d20
              </button>
            ) : (
              <div className="space-y-2">
                <div
                  className={`text-center text-lg font-bold ${
                    skillCheckResult.result === "critical_success"
                      ? "text-emerald-400 animate-pulse"
                      : skillCheckResult.result === "success"
                        ? "text-emerald-400"
                        : skillCheckResult.result === "critical_failure"
                          ? "text-red-400 animate-pulse"
                          : "text-red-400"
                  }`}
                >
                  {formatSkillCheck(skillCheckResult)}
                </div>

                {skillCheckResult.result === "success" || skillCheckResult.result === "critical_success" ? (
                  <div className="text-xs text-emerald-400/80">
                    {pendingResult.skillCheck.successBonus || "You succeed!"}
                  </div>
                ) : (
                  <div className="text-xs text-red-400/80">
                    {pendingResult.skillCheck.failurePenalty || "You fail..."}
                  </div>
                )}

                <button
                  onClick={handleSkillCheck}
                  className="w-full py-2 bg-primary/20 hover:bg-primary/40 
                    text-primary rounded transition-colors text-sm"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Phase: Result (brief preview, full result handled by parent) */}
      {phase === "result" && pendingResult && (
        <div className="text-sm text-muted-foreground italic">Processing outcome...</div>
      )}
    </div>
  )
}
