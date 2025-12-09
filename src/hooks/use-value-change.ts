"use client"

import { useEffect, useRef, useState } from "react"

type ChangeDirection = "increase" | "decrease" | null

/**
 * Hook to detect value changes and return animation class
 * Auto-clears after animation duration
 */
export function useValueChange(
  value: number,
  options?: {
    increaseClass?: string
    decreaseClass?: string
    duration?: number
  }
): string | null {
  const {
    increaseClass = "value-stat-up",
    decreaseClass = "value-stat-down",
    duration = 500,
  } = options ?? {}

  const prevValue = useRef(value)
  const [direction, setDirection] = useState<ChangeDirection>(null)

  useEffect(() => {
    if (value !== prevValue.current) {
      setDirection(value > prevValue.current ? "increase" : "decrease")
      prevValue.current = value

      const timeout = setTimeout(() => setDirection(null), duration)
      return () => clearTimeout(timeout)
    }
  }, [value, duration])

  if (direction === "increase") return increaseClass
  if (direction === "decrease") return decreaseClass
  return null
}

/**
 * Hook specifically for resource bars (mana, rage, energy, focus, souls)
 */
export function useResourceChange(
  value: number,
  resourceType: "mana" | "rage" | "energy" | "focus" | "souls"
): string | null {
  const resourceClasses: Record<string, string> = {
    mana: "bar-mana",
    rage: "bar-rage",
    energy: "bar-energy",
    focus: "bar-focus",
    souls: "bar-souls",
  }

  return useValueChange(value, {
    increaseClass: resourceClasses[resourceType],
    decreaseClass: "bar-drain",
    duration: 450,
  })
}

/**
 * Hook specifically for gold changes
 */
export function useGoldChange(value: number): string | null {
  return useValueChange(value, {
    increaseClass: "value-gold-gain",
    decreaseClass: "value-gold-loss",
    duration: 500,
  })
}
