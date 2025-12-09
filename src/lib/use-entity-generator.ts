"use client"

import { useState, useCallback } from "react"
import { debugLog } from "./debug"

export type EntityGenerationType =
  | "item"
  | "enemy"
  | "npc"
  | "trap"
  | "shrine"
  | "boss"
  | "companion"
  | "room_narration"
  | "combat_narration"
  | "event_outcome"

export function useEntityGenerator() {
  const [isGenerating, setIsGenerating] = useState(false)

  const generate = useCallback(async (type: EntityGenerationType, context: Record<string, unknown>) => {
    setIsGenerating(true)
    try {
      const response = await fetch("/api/entity-generator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context }),
      })

      if (!response.ok) {
        debugLog("Entity generation failed", { status: response.status }, { level: "error" })
        return null
      }

      const data = await response.json()
      return data
    } catch (error) {
      debugLog("Entity generation error", error, { level: "error" })
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [])

  const generateBatch = useCallback(async (requests: Array<{ type: EntityGenerationType; context: Record<string, unknown> }>) => {
    setIsGenerating(true)
    try {
      const results = await Promise.all(
        requests.map(async ({ type, context }: { type: EntityGenerationType; context: Record<string, unknown> }) => {
          try {
            const response = await fetch("/api/entity-generator", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ type, context }),
            })
            if (!response.ok) return null
            return await response.json()
          } catch {
            return null
          }
        }),
      )
      return results
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { generate, generateBatch, isGenerating }
}
