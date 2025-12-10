"use client"
import { EntityText } from "@/components/narrative/entity-text"
import type { Item, UnknownItem } from "@/lib/core/game-types"
import { isUnknownItem } from "@/lib/items/unknown-item-system"

interface ItemActionMenuProps {
  item: Item | UnknownItem
  onUse?: () => void
  onEquip?: () => void
  onDrop?: () => void
  onExamine?: () => void
  onClose: () => void
  canEquip?: boolean
  isEquipped?: boolean
}

export function ItemActionMenu({
  item,
  onUse,
  onEquip,
  onDrop,
  onExamine,
  onClose,
  canEquip,
  isEquipped,
}: ItemActionMenuProps) {
  const unknown = isUnknownItem(item)

  return (
    <div className="absolute z-50 bg-background border border-border/50 rounded shadow-lg p-2 min-w-[140px]">
      <div className="text-xs text-muted-foreground mb-2 px-2">
        <EntityText type={item.rarity} entity={item}>
          {item.name}
        </EntityText>
      </div>

      <div className="space-y-0.5">
        {onExamine && (
          <button
            onClick={onExamine}
            className="w-full text-left px-2 py-1 text-sm hover:bg-secondary/40 rounded transition-colors"
          >
            Examine
          </button>
        )}

        {unknown && onUse && (
          <button
            onClick={onUse}
            className="w-full text-left px-2 py-1 text-sm hover:bg-secondary/40 rounded transition-colors text-amber-400"
          >
            Use... <span className="text-xs text-muted-foreground">(unknown effect)</span>
          </button>
        )}

        {!unknown && item.type === "potion" && onUse && (
          <button
            onClick={onUse}
            className="w-full text-left px-2 py-1 text-sm hover:bg-secondary/40 rounded transition-colors text-emerald-400"
          >
            Drink
          </button>
        )}

        {canEquip && onEquip && (
          <button
            onClick={onEquip}
            className="w-full text-left px-2 py-1 text-sm hover:bg-secondary/40 rounded transition-colors text-blue-400"
          >
            {isEquipped ? "Unequip" : "Equip"}
          </button>
        )}

        {onDrop && (
          <button
            onClick={onDrop}
            className="w-full text-left px-2 py-1 text-sm hover:bg-secondary/40 rounded transition-colors text-red-400/70"
          >
            Discard
          </button>
        )}

        <button
          onClick={onClose}
          className="w-full text-left px-2 py-1 text-sm hover:bg-secondary/40 rounded transition-colors text-muted-foreground"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
