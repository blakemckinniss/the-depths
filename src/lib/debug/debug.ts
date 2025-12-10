/**
 * Debug Logging for The Depths
 *
 * Toggle with DEBUG flag or NODE_ENV
 * All logs prefixed with [DEPTHS] for easy filtering
 */

const DEBUG = process.env.NODE_ENV === "development"

type LogLevel = "debug" | "info" | "warn" | "error"

interface LogOptions {
  level?: LogLevel
  data?: unknown
}

/**
 * Debug logger - only outputs in development
 *
 * Usage:
 *   debugLog("handleSelectPath", { roomType, floor })
 *   debugLog("Combat damage", { damage, enemy: enemy.name }, { level: "info" })
 */
export function debugLog(
  message: string,
  data?: unknown,
  options?: LogOptions
): void {
  if (!DEBUG) return

  const level = options?.level || "debug"
  const prefix = `[DEPTHS:${level.toUpperCase()}]`
  const timestamp = new Date().toISOString().split("T")[1].slice(0, 12)

  const logFn = {
    debug: console.log,
    info: console.info,
    warn: console.warn,
    error: console.error,
  }[level]

  if (data !== undefined) {
    logFn(`${prefix} ${timestamp} ${message}`, data)
  } else {
    logFn(`${prefix} ${timestamp} ${message}`)
  }
}

/**
 * Trace function execution with timing
 *
 * Usage:
 *   const end = traceStart("handleUseAbility")
 *   // ... handler logic ...
 *   end() // logs: [DEPTHS:TRACE] handleUseAbility completed in 45ms
 */
export function traceStart(name: string): () => void {
  if (!DEBUG) return () => {}

  const start = performance.now()
  debugLog(`${name} started`)

  return () => {
    const duration = Math.round(performance.now() - start)
    debugLog(`${name} completed in ${duration}ms`, undefined, { level: "info" })
  }
}

/**
 * Log state changes
 *
 * Usage:
 *   logStateChange("player.health", oldHealth, newHealth)
 */
export function logStateChange(
  path: string,
  oldValue: unknown,
  newValue: unknown
): void {
  if (!DEBUG) return
  if (oldValue === newValue) return

  debugLog(`State: ${path}`, { from: oldValue, to: newValue })
}

/**
 * Conditional breakpoint for debugging
 *
 * Usage:
 *   debugBreak(damage > 100, "Unusually high damage")
 */
export function debugBreak(condition: boolean, reason?: string): void {
  if (!DEBUG || !condition) return

  console.warn(`[DEPTHS:BREAK] ${reason || "Debug breakpoint hit"}`)
  // eslint-disable-next-line no-debugger
  debugger
}

/**
 * Game state snapshot for debugging
 */
export function snapshotState(label: string, state: unknown): void {
  if (!DEBUG) return

  console.groupCollapsed(`[DEPTHS:SNAPSHOT] ${label}`)
  console.log(JSON.parse(JSON.stringify(state)))
  console.groupEnd()
}
