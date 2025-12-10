import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * ID generation that works during SSR and client-side.
 * - SSR/prerender: Uses deterministic counter (Next.js 16 requirement)
 * - Client after hydration: Uses crypto.randomUUID() for true uniqueness
 */
let idCounter = 0
let hydrated = false

// Mark hydrated after first client-side effect
if (typeof window !== "undefined") {
  // Use requestIdleCallback or setTimeout to defer until after hydration
  const markHydrated = () => { hydrated = true }
  if ("requestIdleCallback" in window) {
    (window as Window & { requestIdleCallback: (cb: () => void) => void }).requestIdleCallback(markHydrated)
  } else {
    setTimeout(markHydrated, 0)
  }
}

/**
 * Generate a unique ID that works during SSR and client-side.
 * SSR: deterministic counter. Client: crypto.randomUUID().
 */
export function generateId(): string {
  // After hydration, use true random UUIDs to avoid save/load collisions
  if (hydrated && typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // SSR/prerender: deterministic counter
  idCounter++
  return `ssr-${idCounter.toString(36).padStart(8, "0")}`
}

/**
 * Reset counter to avoid collisions when loading saved games.
 * Call this after loading a save to ensure new IDs don't collide.
 */
export function resetIdCounter(minValue = 1000000): void {
  idCounter = minValue
}
