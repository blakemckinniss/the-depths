import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Counter for deterministic ID generation.
 * Next.js 16 blocks Math.random(), crypto.randomUUID(), and Date.now() during prerendering.
 */
let idCounter = 0

/**
 * Generate a unique ID that works during SSR and client-side.
 * Uses pure counter - deterministic and prerender-safe.
 */
export function generateId(): string {
  idCounter++
  // Format: id-XXXXXXXX (8 chars, base36)
  return `id-${idCounter.toString(36).padStart(8, "0")}`
}
