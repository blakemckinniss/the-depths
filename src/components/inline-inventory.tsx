"use client"

import type { Item, Player } from "@/lib/game-types"
import { EntityText } from "./entity-text"

interface InlineInventoryProps {
  player: Player
  onUseItem: (item: Item) => void
  onEquipItem: (item: Item) => void
}

export function InlineInventory({ player, onUseItem, onEquipItem }: InlineInventoryProps) {
  const { inventory, equipment } = player

  if (inventory.length === 0 && !equipment.weapon && !equipment.armor) {
    return (
      <div className="py-3 text-muted-foreground text-sm italic animate-in fade-in duration-300">
        Your pack is empty.
      </div>
    )
  }

  return (
    <div className="py-3 space-y-3 animate-in fade-in duration-300">
      {(equipment.weapon || equipment.armor) && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">— Equipped —</div>
          {equipment.weapon && (
            <div className="text-sm flex items-center gap-2">
              <span className="text-muted-foreground">⚔</span>
              <EntityText type={equipment.weapon.rarity} entity={equipment.weapon}>{equipment.weapon.name}</EntityText>
              <span className="text-entity-damage text-xs">+{equipment.weapon.stats?.attack} ATK</span>
            </div>
          )}
          {equipment.armor && (
            <div className="text-sm flex items-center gap-2">
              <span className="text-muted-foreground">🛡</span>
              <EntityText type={equipment.armor.rarity} entity={equipment.armor}>{equipment.armor.name}</EntityText>
              <span className="text-entity-armor text-xs">+{equipment.armor.stats?.defense} DEF</span>
            </div>
          )}
        </div>
      )}

      {inventory.length > 0 && (
        <div className="space-y-1">
          <div className="text-xs text-muted-foreground uppercase tracking-wider">
            — Backpack ({inventory.length}) —
          </div>
          {inventory.map((item) => (
            <div key={item.id} className="text-sm flex items-center gap-2 group">
              <span className="text-muted-foreground">
                {item.type === "weapon" ? "⚔" : item.type === "armor" ? "🛡" : item.type === "potion" ? "🧪" : "•"}
              </span>
              <EntityText type={item.rarity} entity={item}>{item.name}</EntityText>
              {item.type === "potion" && (
                <button
                  onClick={() => onUseItem(item)}
                  className="text-xs text-entity-heal hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  [use]
                </button>
              )}
              {(item.type === "weapon" || item.type === "armor") && (
                <button
                  onClick={() => onEquipItem(item)}
                  className="text-xs text-primary hover:underline opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  [equip]
                </button>
              )}
              <span className="text-entity-gold text-xs ml-auto">{item.value}g</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
