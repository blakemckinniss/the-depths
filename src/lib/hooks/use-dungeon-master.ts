"use client"

import { useState, useCallback } from "react"
import { debugLog } from "@/lib/debug/debug"

interface DungeonMasterContext {
  [key: string]: string | number | boolean | undefined | object
}

export function useDungeonMaster() {
  const [isGenerating, setIsGenerating] = useState(false)

  const generate = useCallback(async <T = unknown>(type: string, context: DungeonMasterContext): Promise<T | null> => {
    setIsGenerating(true)
    try {
      const res = await fetch("/api/dungeon-master", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, context }),
      })

      if (!res.ok) {
        debugLog("Dungeon master request failed", { status: res.status }, { level: "error" })
        return null
      }

      const data = await res.json()
      return data as T
    } catch (error) {
      debugLog("Dungeon master error", error, { level: "error" })
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { generate, isGenerating }
}
