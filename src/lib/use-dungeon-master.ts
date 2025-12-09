"use client"

import { useState, useCallback } from "react"

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
        console.error("Dungeon master request failed:", res.status)
        return null
      }

      const data = await res.json()
      return data as T
    } catch (error) {
      console.error("Dungeon master error:", error)
      return null
    } finally {
      setIsGenerating(false)
    }
  }, [])

  return { generate, isGenerating }
}
