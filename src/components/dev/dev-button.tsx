"use client"

import type React from "react"

interface DevButtonProps {
  onClick: () => void
  children: React.ReactNode
  variant?: "default" | "danger" | "success" | "active"
  size?: "sm" | "md"
  disabled?: boolean
}

export function DevButton({ onClick, children, variant = "default", size = "md", disabled = false }: DevButtonProps) {
  const baseClasses =
    "font-mono transition-colors focus:outline-none focus:ring-1 focus:ring-yellow-500/50 disabled:opacity-50 disabled:cursor-not-allowed"

  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-xs"

  const variantClasses = {
    default: "bg-zinc-800 hover:bg-zinc-700 text-zinc-300",
    danger: "bg-red-900/50 hover:bg-red-800/50 text-red-400",
    success: "bg-green-900/50 hover:bg-green-800/50 text-green-400",
    active: "bg-yellow-900/50 text-yellow-400 ring-1 ring-yellow-500/50",
  }

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${sizeClasses} ${variantClasses[variant]}`}
    >
      {children}
    </button>
  )
}
