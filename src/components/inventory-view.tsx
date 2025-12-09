"use client"

import type { Item, Player } from "@/lib/game-types"
import { EntityText } from "./entity-text"

interface InventoryViewProps {
  player: Player
  onUseItem: (item: Item) => void
  onEquipItem: (item: Item) => void
  onDropItem: (item: Item) => void
}

export function InventoryView({ player, onUseItem, onEquipItem, onDropItem }: InventoryViewProps) {
  const { inventory, equipment } = player

  return (
    <div className="py-6 space-y-6 animate-in fade-in duration-300">
      <div>
        <h2 className="text-lg text-primary mb-4">Equipment</h2>
        <div className="space-y-3">
          <div className="flex items-start gap-4">
            <span className="text-muted-foreground w-16 text-sm">Weapon</span>
            {equipment.weapon ? (
              <div>
                <EntityText type={equipment.weapon.rarity}>{equipment.weapon.name}</EntityText>
                <div className="text-xs text-muted-foreground mt-1">
                  <span className="text-entity-damage">+{equipment.weapon.stats?.attack} Attack</span>
                  <span className="mx-2">•</span>
                  <span>{equipment.weapon.description}</span>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm italic">Empty</span>
            )}
          </div>
          <div className="flex items-start gap-4">
            <span className="text-muted-foreground w-16 text-sm">Armor</span>
            {equipment.armor ? (
              <div>
                <EntityText type={equipment.armor.rarity}>{equipment.armor.name}</EntityText>
                <div className="text-xs text-muted-foreground mt-1">
                  <span className="text-entity-armor">+{equipment.armor.stats?.defense} Defense</span>
                  <span className="mx-2">•</span>
                  <span>{equipment.armor.description}</span>
                </div>
              </div>
            ) : (
              <span className="text-muted-foreground text-sm italic">Empty</span>
            )}
          </div>
        </div>
      </div>

      <div>
        <h2 className="text-lg text-primary mb-4">Backpack ({inventory.length}/20)</h2>
        {inventory.length === 0 ? (
          <p className="text-muted-foreground text-sm italic">Your pack is empty.</p>
        ) : (
          <div className="space-y-2">
            {inventory.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-2 group">
                <span className="text-lg">
                  {item.type === "weapon" ? "⚔️" : item.type === "armor" ? "🛡️" : item.type === "potion" ? "🧪" : "📦"}
                </span>
                <div className="flex-1">
                  <EntityText type={item.rarity}>{item.name}</EntityText>
                  <div className="text-xs text-muted-foreground">
                    {item.stats?.attack && <span className="text-entity-damage">+{item.stats.attack} ATK </span>}
                    {item.stats?.defense && <span className="text-entity-armor">+{item.stats.defense} DEF </span>}
                    {item.stats?.health && <span className="text-entity-heal">+{item.stats.health} HP </span>}
                    <span className="text-entity-gold">• {item.value}g</span>
                  </div>
                </div>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  {item.type === "potion" && (
                    <button onClick={() => onUseItem(item)} className="text-xs text-entity-heal hover:underline">
                      [use]
                    </button>
                  )}
                  {(item.type === "weapon" || item.type === "armor") && (
                    <button onClick={() => onEquipItem(item)} className="text-xs text-primary hover:underline">
                      [equip]
                    </button>
                  )}
                  <button onClick={() => onDropItem(item)} className="text-xs text-destructive hover:underline">
                    [drop]
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
