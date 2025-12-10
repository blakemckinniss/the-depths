"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import type { LogEntry } from "@/lib/core/game-types";
import { GameLogger, createGameLogger } from "@/lib/ai/game-log-system";

// ============================================================================
// CONTEXT TYPES
// ============================================================================

interface LogContextValue {
  // Log state
  logs: LogEntry[];

  // Direct log methods
  addLog: (entry: LogEntry) => void;
  addRawLog: (content: ReactNode, type?: LogEntry["type"]) => void;
  clearLogs: () => void;

  // Structured logger instance
  logger: GameLogger;
}

// ============================================================================
// CONTEXT
// ============================================================================

const LogContext = createContext<LogContextValue | null>(null);

// ============================================================================
// PROVIDER
// ============================================================================

interface LogProviderProps {
  children: ReactNode;
  maxLogs?: number;
}

export function LogProvider({ children, maxLogs = 100 }: LogProviderProps) {
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // Add a log entry
  const addLog = useCallback(
    (entry: LogEntry) => {
      setLogs((prev) => {
        const newLogs = [...prev, entry];
        // Keep only the last maxLogs entries
        if (newLogs.length > maxLogs) {
          return newLogs.slice(-maxLogs);
        }
        return newLogs;
      });
    },
    [maxLogs],
  );

  // Add a raw log entry (convenience method)
  const addRawLog = useCallback(
    (content: ReactNode, type: LogEntry["type"] = "narrative") => {
      const entry: LogEntry = {
        id: crypto.randomUUID(),
        content,
        type,
        timestamp: Date.now(),
      };
      addLog(entry);
    },
    [addLog],
  );

  // Clear all logs
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  // Create the structured logger, memoized with stable dispatch
  const logger = useMemo(() => createGameLogger(addLog), [addLog]);

  const value: LogContextValue = {
    logs,
    addLog,
    addRawLog,
    clearLogs,
    logger,
  };

  return <LogContext.Provider value={value}>{children}</LogContext.Provider>;
}

// ============================================================================
// HOOKS
// ============================================================================

export function useLog() {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error("useLog must be used within a LogProvider");
  }
  return context;
}

// Convenience hook for just the logs array
export function useLogs() {
  const { logs } = useLog();
  return logs;
}

// Convenience hook for the structured logger
export function useGameLogger() {
  const { logger } = useLog();
  return logger;
}

// Hook for adding logs without needing the full context
export function useAddLog() {
  const { addLog, addRawLog } = useLog();
  return { addLog, addRawLog };
}
