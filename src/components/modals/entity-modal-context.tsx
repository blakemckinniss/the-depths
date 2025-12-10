"use client"

import { createContext, useContext, useState, useCallback, type ReactNode } from "react"
import type {
  GameEntity,
  Item,
  Enemy,
  NPC,
  Trap,
  Shrine,
  StatusEffect,
  Companion,
  Boss,
  Ability,
  EnemyAbility,
  CompanionAbility,
  MapItem,
} from "@/lib/core/game-types"

// Union type of all displayable entities
export type DisplayableEntity =
  | GameEntity
  | Item
  | Enemy
  | NPC
  | Trap
  | Shrine
  | StatusEffect
  | Companion
  | Boss
  | Ability
  | EnemyAbility
  | CompanionAbility

// Item action handlers
export interface ItemActions {
  onEquipItem?: (item: Item) => void
  onUseItem?: (item: Item) => void
  onDropItem?: (item: Item) => void
  onActivateMap?: (map: MapItem) => void
  canActivateMap?: boolean
  inCombat?: boolean
}

interface EntityModalContextType {
  entity: DisplayableEntity | null
  isOpen: boolean
  openEntity: (entity: DisplayableEntity) => void
  closeEntity: () => void
  actions: ItemActions
  setActions: (actions: ItemActions) => void
}

const EntityModalContext = createContext<EntityModalContextType | null>(null)

export function EntityModalProvider({ children }: { children: ReactNode }) {
  const [entity, setEntity] = useState<DisplayableEntity | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [actions, setActions] = useState<ItemActions>({})

  const openEntity = useCallback((entity: DisplayableEntity) => {
    setEntity(entity)
    setIsOpen(true)
  }, [])

  const closeEntity = useCallback(() => {
    setIsOpen(false)
    // Delay clearing entity to allow close animation
    setTimeout(() => setEntity(null), 200)
  }, [])

  return (
    <EntityModalContext.Provider value={{ entity, isOpen, openEntity, closeEntity, actions, setActions }}>
      {children}
    </EntityModalContext.Provider>
  )
}

export function useEntityModal() {
  const context = useContext(EntityModalContext)
  if (!context) {
    throw new Error("useEntityModal must be used within EntityModalProvider")
  }
  return context
}
