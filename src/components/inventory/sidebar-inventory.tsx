"use client"

import type { Item, Player, MapItem } from "@/lib/core/game-types"
import { EntityText } from "@/components/narrative/entity-text"

interface SidebarInventoryProps {
  player: Player
  onEquipItem: (item: Item) => void
  onUseItem?: (item: Item) => void
  onDropItem?: (item: Item) => void
  onActivateMap?: (map: MapItem) => void
  inCombat?: boolean
  /** Allow map activation (true when in tavern) */
  canActivateMap?: boolean
}

function isMapItem(item: Item): item is MapItem {
  return item.category === "consumable" && item.subtype === "map" && "mapProps" in item
}

function getItemIcon(item: Item): string {
  if (isMapItem(item)) return "🗺"
  if (item.category === "currency") return "💠"
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

export function SidebarInventory({ player, onEquipItem, onUseItem, onDropItem, onActivateMap, inCombat, canActivateMap }: SidebarInventoryProps) {
  if (!player) {
    return (
      <div className="h-full flex flex-col py-6 px-4 text-sm">
        <h2 className="text-primary font-medium tracking-wide mb-4">Backpack</h2>
        <p className="text-muted-foreground/50 text-xs italic">No adventurer</p>
      </div>
    )
  }

  const { inventory, stats } = player

  return (
    <div className="h-full flex flex-col py-6 px-4 text-sm overflow-hidden">
      {/* Gold Display */}
      <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/50">
        <span className="text-muted-foreground text-xs">Gold</span>
        <EntityText type="gold">{stats.gold}</EntityText>
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-primary font-medium tracking-wide">Backpack</h2>
        <span className="text-xs text-muted-foreground">{inventory.length}/20</span>
      </div>

      {inventory.length === 0 ? (
        <p className="text-muted-foreground/50 text-xs italic">Empty</p>
      ) : (
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin">
          {inventory.map((item) => {
            const mapItem = isMapItem(item) ? item : null
            return (
              <div key={item.id} className="group flex items-center gap-1.5 py-0.5 hover:bg-stone-800/30 px-1 -mx-1 rounded">
                <span className="text-xs opacity-50 flex-shrink-0">{getItemIcon(item)}</span>
                <EntityText type={item.rarity} entity={item} className="text-xs truncate flex-1 min-w-0">{item.name}</EntityText>
                {/* Inline stats */}
                <div className="flex items-center gap-1 text-[10px] flex-shrink-0">
                  {mapItem ? (
                    <>
                      <span className="text-purple-400">T{mapItem.mapProps.tier}</span>
                      {mapItem.mapProps.modifiers.length > 0 && (
                        <span className="text-amber-400/70">{mapItem.mapProps.modifiers.length}m</span>
                      )}
                    </>
                  ) : (
                    <>
                      {item.stats?.attack && <span className="text-entity-damage">+{item.stats.attack}</span>}
                      {item.stats?.defense && <span className="text-entity-armor">+{item.stats.defense}</span>}
                    </>
                  )}
                </div>
                {/* Hover actions */}
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 flex-shrink-0">
                  {mapItem && canActivateMap && onActivateMap && (
                    <button onClick={() => onActivateMap(mapItem)} className="text-[10px] text-purple-400 hover:underline">go</button>
                  )}
                  {item.type === "potion" && onUseItem && (
                    <button
                      onClick={() => onUseItem(item)}
                      disabled={player.stats.health >= player.stats.maxHealth}
                      className="text-[10px] text-entity-heal hover:underline disabled:opacity-30"
                    >use</button>
                  )}
                  {isEquippable(item) && !inCombat && (
                    <button onClick={() => onEquipItem(item)} className="text-[10px] text-primary hover:underline">eq</button>
                  )}
                  {!inCombat && onDropItem && !mapItem && (
                    <button onClick={() => onDropItem(item)} className="text-[10px] text-destructive/50 hover:text-destructive">x</button>
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
