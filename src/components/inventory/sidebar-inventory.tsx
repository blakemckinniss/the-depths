"use client"

import type { Item, Player } from "@/lib/core/game-types"
import { EntityText } from "@/components/narrative/entity-text"

interface SidebarInventoryProps {
  player: Player
  onEquipItem: (item: Item) => void
  onUseItem?: (item: Item) => void
  onDropItem?: (item: Item) => void
  inCombat?: boolean
}

function getItemIcon(item: Item): string {
  if (item.type === "weapon" || item.category === "weapon") return "⚔"
  if (item.type === "armor" || item.category === "armor") {
    const slot = item.armorProps?.slot || item.subtype
    switch (slot) {
      case "head": return "👑"
      case "chest": return "🎽"
      case "legs": return "👖"
      case "feet": return "👢"
      case "hands": return "🧤"
      case "shield": return "🛡"
      case "cloak": return "🧣"
      case "belt": return "📦"
      default: return "🛡"
    }
  }
  if (item.category === "trinket") {
    switch (item.subtype) {
      case "ring": return "💍"
      case "amulet":
      case "necklace": return "📿"
      default: return "✧"
    }
  }
  if (item.type === "potion") return "◉"
  return "◆"
}

function isEquippable(item: Item): boolean {
  return (
    item.type === "weapon" ||
    item.type === "armor" ||
    item.category === "weapon" ||
    item.category === "armor" ||
    item.category === "trinket"
  )
}

function getSlotHint(item: Item): string | null {
  if (item.type === "weapon" || item.category === "weapon") {
    return item.subtype === "shield" ? "Off Hand" : "Main Hand"
  }
  if (item.type === "armor" || item.category === "armor") {
    const slot = item.armorProps?.slot || item.subtype
    switch (slot) {
      case "head": return "Head"
      case "chest": return "Chest"
      case "legs": return "Legs"
      case "feet": return "Feet"
      case "hands": return "Hands"
      case "shield": return "Off Hand"
      case "cloak": return "Cloak"
      case "belt": return "Belt"
      default: return "Armor"
    }
  }
  if (item.category === "trinket") {
    switch (item.subtype) {
      case "ring": return "Ring"
      case "amulet":
      case "necklace": return "Amulet"
      case "cloak": return "Cloak"
      default: return "Accessory"
    }
  }
  return null
}

export function SidebarInventory({ player, onEquipItem, onUseItem, onDropItem, inCombat }: SidebarInventoryProps) {
  if (!player) {
    return (
      <div className="h-full flex flex-col py-6 px-4 text-sm">
        <h2 className="text-primary font-medium tracking-wide mb-4">Backpack</h2>
        <p className="text-muted-foreground/50 text-xs italic">No adventurer</p>
      </div>
    )
  }

  const { inventory } = player

  return (
    <div className="h-full flex flex-col py-6 px-4 text-sm">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-primary font-medium tracking-wide">Backpack</h2>
        <span className="text-xs text-muted-foreground">{inventory.length}/20</span>
      </div>

      {inventory.length === 0 ? (
        <p className="text-muted-foreground/50 text-xs italic">Empty</p>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-1 scrollbar-thin">
          {inventory.map((item) => {
            const slotHint = getSlotHint(item)
            return (
              <div key={item.id} className="group py-1.5">
                <div className="flex items-start gap-2">
                  <span className="text-sm opacity-60">{getItemIcon(item)}</span>
                  <div className="flex-1 min-w-0">
                    <EntityText type={item.rarity} entity={item} className="block truncate">{item.name}</EntityText>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-2">
                      {slotHint && <span className="text-stone-500">[{slotHint}]</span>}
                      {item.stats?.attack && <span className="text-entity-damage">+{item.stats.attack}</span>}
                      {item.stats?.defense && <span className="text-entity-armor">+{item.stats.defense}</span>}
                      {item.stats?.health && <span className="text-entity-heal">+{item.stats.health}</span>}
                      <span className="text-entity-gold">{item.value}g</span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 mt-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.type === "potion" && onUseItem && (
                    <button
                      onClick={() => onUseItem(item)}
                      disabled={player.stats.health >= player.stats.maxHealth}
                      className="text-xs text-entity-heal hover:underline disabled:opacity-30 disabled:no-underline"
                    >
                      use
                    </button>
                  )}
                  {isEquippable(item) && !inCombat && (
                    <button onClick={() => onEquipItem(item)} className="text-xs text-primary hover:underline">
                      equip
                    </button>
                  )}
                  {!inCombat && onDropItem && (
                    <button
                      onClick={() => onDropItem(item)}
                      className="text-xs text-destructive/70 hover:text-destructive hover:underline"
                    >
                      drop
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
