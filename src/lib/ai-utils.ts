import { generateObject } from "ai"
import { createGroq } from "@ai-sdk/groq"
import type { z } from "zod"
import { generateMechanicsPrompt, validateEffect, type ConstraintSource } from "./game-mechanics-ledger"

// Groq client singleton
export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
})

// Model configuration
export const AI_CONFIG = {
  model: "moonshotai/kimi-k2-instruct-0905",
  // Temperature tuning per entity type
  temperature: {
    creative: 0.9,    // Names, descriptions, lore
    narrative: 0.8,   // Combat narration, events
    balanced: 0.75,   // General entities
    structured: 0.6,  // Stats-heavy, deterministic
  },
  maxRetries: 3,
  baseDelay: 1000, // ms
} as const

// LRU Cache for entity generation
class LRUCache<T> {
  private cache = new Map<string, { value: T; timestamp: number }>()
  private maxSize: number
  private ttl: number // Time to live in ms

  constructor(maxSize = 100, ttlMinutes = 30) {
    this.maxSize = maxSize
    this.ttl = ttlMinutes * 60 * 1000
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key)
    if (!entry) return undefined

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key)
      return undefined
    }

    // Move to end (most recently used)
    this.cache.delete(key)
    this.cache.set(key, entry)
    return entry.value
  }

  set(key: string, value: T): void {
    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }
    this.cache.set(key, { value, timestamp: Date.now() })
  }

  generateKey(...parts: (string | number | undefined)[]): string {
    return parts.filter(Boolean).join("::")
  }

  clear(): void {
    this.cache.clear()
  }

  get size(): number {
    return this.cache.size
  }
}

// Global caches
export const entityCache = new LRUCache<unknown>(200, 60) // 200 items, 60 min TTL
export const narrativeCache = new LRUCache<unknown>(100, 15) // 100 items, 15 min TTL

// Retry with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = AI_CONFIG.maxRetries,
  baseDelay: number = AI_CONFIG.baseDelay,
): Promise<T> {
  let lastError: Error | undefined

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await operation()
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))

      // Don't retry on validation errors (Zod)
      if (lastError.message.includes("validation") || lastError.message.includes("schema")) {
        throw lastError
      }

      // Last attempt - throw
      if (attempt === maxRetries - 1) {
        throw lastError
      }

      // Exponential backoff with jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 500
      await new Promise(resolve => setTimeout(resolve, delay))
    }
  }

  throw lastError
}

// Generic AI generation with retry, caching, and proper typing
export async function generateWithAI<T extends z.ZodType>(
  options: {
    schema: T
    prompt: string
    system: string
    temperature?: number
    maxTokens?: number
    cacheKey?: string
    useCache?: boolean
  }
): Promise<z.infer<T>> {
  const {
    schema,
    prompt,
    system,
    temperature = AI_CONFIG.temperature.balanced,
    maxTokens = 500,
    cacheKey,
    useCache = true,
  } = options

  // Check cache first
  if (useCache && cacheKey) {
    const cached = entityCache.get(cacheKey)
    if (cached) {
      return cached as z.infer<T>
    }
  }

  // Generate with retry
  const result = await withRetry(async () => {
    const { object } = await generateObject({
      model: groq(AI_CONFIG.model),
      schema,
      prompt,
      system,
      maxOutputTokens: maxTokens,
      temperature,
    })
    return object
  })

  // Cache result
  if (useCache && cacheKey) {
    entityCache.set(cacheKey, result)
  }

  return result
}

// Batch generation - generate multiple entities in one call
export async function generateBatch<T extends z.ZodType>(
  options: {
    schema: T
    prompts: Array<{ prompt: string; cacheKey?: string }>
    system: string
    temperature?: number
    maxTokens?: number
  }
): Promise<Array<z.infer<T>>> {
  const { schema, prompts, system, temperature, maxTokens } = options

  // Check cache for each prompt
  const results: Array<z.infer<T> | null> = []
  const uncachedIndices: number[] = []

  for (let i = 0; i < prompts.length; i++) {
    const { cacheKey } = prompts[i]
    if (cacheKey) {
      const cached = entityCache.get(cacheKey)
      if (cached) {
        results[i] = cached as z.infer<T>
        continue
      }
    }
    results[i] = null
    uncachedIndices.push(i)
  }

  // If all cached, return early
  if (uncachedIndices.length === 0) {
    return results as Array<z.infer<T>>
  }

  // Generate uncached items in parallel (with concurrency limit)
  const CONCURRENCY = 3
  for (let i = 0; i < uncachedIndices.length; i += CONCURRENCY) {
    const batch = uncachedIndices.slice(i, i + CONCURRENCY)
    const batchResults = await Promise.all(
      batch.map(async (idx) => {
        const result = await generateWithAI({
          schema,
          prompt: prompts[idx].prompt,
          system,
          temperature,
          maxTokens,
          cacheKey: prompts[idx].cacheKey,
          useCache: true,
        })
        return { idx, result }
      })
    )

    for (const { idx, result } of batchResults) {
      results[idx] = result
    }
  }

  return results as Array<z.infer<T>>
}

// Cached mechanics prompt (generated once at module load)
const MECHANICS_PROMPT = generateMechanicsPrompt()

// Base system prompt builder
export function buildSystemPrompt(context: {
  dungeonTheme?: string
  dungeonName?: string
  floor?: number
  room?: number
  playerLevel?: number
  playerHealth?: number
  maxHealth?: number
  playerClass?: string
  companions?: string
  currentHazard?: string
  recentEvents?: string
  /** Set to true to include item mechanics rules (for loot generation) */
  includeItemMechanics?: boolean
}): string {
  const parts = [
    "You are a dark fantasy dungeon master running a roguelike dungeon crawler.",
    "Style: Atmospheric, terse, visceral. Like classic MUD games meets Dark Souls.",
    "Rules: Keep all text brief and punchy. No emojis. No breaking character. No game mechanics mentioned.",
    `Setting: ${context.dungeonName || "Ancient cursed dungeons"} - ${context.dungeonTheme || "filled with horrors and treasure"}.`,
  ]

  if (context.floor || context.room) {
    parts.push(`Player context: Level ${context.playerLevel || 1}, Floor ${context.floor || 1}, Room ${context.room || 1}.`)
  }
  if (context.playerHealth && context.maxHealth) {
    parts.push(`Health: ${context.playerHealth}/${context.maxHealth}`)
  }
  if (context.playerClass) {
    parts.push(`Class: ${context.playerClass}`)
  }
  if (context.companions) {
    parts.push(`Companions: ${context.companions}`)
  }
  if (context.currentHazard) {
    parts.push(`Environmental hazard: ${context.currentHazard}`)
  }
  if (context.recentEvents) {
    parts.push(`Recent events: ${context.recentEvents}`)
  }

  // Include mechanics rules when generating items/loot
  if (context.includeItemMechanics !== false) {
    parts.push("")
    parts.push(MECHANICS_PROMPT)
  }

  return parts.join("\n")
}

/**
 * Get just the mechanics prompt for routes that build their own system prompts
 */
export function getItemMechanicsPrompt(): string {
  return MECHANICS_PROMPT
}

/**
 * Validate an item's effects against constraint rules.
 * Clamps values that exceed limits and logs violations.
 *
 * @param item - The item with effects to validate
 * @param source - The constraint source (e.g., "common_item", "rare_item")
 * @returns The item with clamped/validated effects
 */
export function validateItemEffects<T extends {
  effect?: {
    power?: number
    duration?: number
    stacks?: number
    category?: string
    trigger?: string
  } | null
  effects?: Array<{
    power?: number
    duration?: number
    stacks?: number
    category?: string
    trigger?: string
  }>
}>(item: T, source: ConstraintSource): T {
  // Validate single effect
  if (item.effect) {
    const validation = validateEffect(item.effect, source)
    if (!validation.valid) {
      console.warn(`[AI Validation] Effect violations for ${source}:`, validation.violations)
      // Clamp values to constraints - don't reject, just fix
      const constraints = getEffectConstraints(source)
      item = {
        ...item,
        effect: {
          ...item.effect,
          power: item.effect.power ? Math.min(item.effect.power, constraints.maxPower) : undefined,
          duration: item.effect.duration && constraints.maxDuration > 0
            ? Math.min(item.effect.duration, constraints.maxDuration)
            : item.effect.duration,
          stacks: item.effect.stacks ? Math.min(item.effect.stacks, constraints.maxStacks) : undefined,
        }
      }
    }
  }

  // Validate effects array
  if (item.effects && item.effects.length > 0) {
    const constraints = getEffectConstraints(source)
    item = {
      ...item,
      effects: item.effects.map(effect => {
        const validation = validateEffect(effect, source)
        if (!validation.valid) {
          console.warn(`[AI Validation] Effect violations for ${source}:`, validation.violations)
          return {
            ...effect,
            power: effect.power ? Math.min(effect.power, constraints.maxPower) : undefined,
            duration: effect.duration && constraints.maxDuration > 0
              ? Math.min(effect.duration, constraints.maxDuration)
              : effect.duration,
            stacks: effect.stacks ? Math.min(effect.stacks, constraints.maxStacks) : undefined,
          }
        }
        return effect
      })
    }
  }

  return item
}

// Re-export constraint getter for internal use
import { getConstraints as getEffectConstraints } from "./game-mechanics-ledger"
export { getEffectConstraints }
