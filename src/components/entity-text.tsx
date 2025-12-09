import type React from "react";
import { cn } from "@/lib/utils";
import type {
  EntityType,
  ItemRarity,
  Enemy,
  Item,
  NPC,
  Trap,
  Shrine,
  StatusEffect,
  Companion,
  Ability,
} from "@/lib/game-types";
import { useEntityModal, type DisplayableEntity } from "./entity-modal-context";

export type EntityAnimation =
  | "none"
  | "critical"
  | "heal-surge"
  | "damage-shake"
  | "levelup"
  | "combo-ready";

interface EntityTextProps {
  children: React.ReactNode;
  type: EntityType | ItemRarity;
  className?: string;
  tooltip?: string;
  animation?: EntityAnimation;
  noAnimation?: boolean;
  entity?: DisplayableEntity; // Optional entity for click-to-view
  onClick?: () => void; // Custom click handler (overrides entity modal)
}

// Base styles (colors and font weights)
const entityStyles: Record<EntityType | ItemRarity, string> = {
  enemy: "text-entity-enemy font-medium",
  item: "text-entity-item",
  gold: "text-entity-gold font-medium entity-gold",
  weapon: "text-entity-weapon",
  armor: "text-entity-armor",
  potion: "text-entity-potion",
  location: "text-entity-location italic",
  player: "text-entity-player font-medium",
  damage: "text-entity-damage font-bold",
  heal: "text-entity-heal font-medium",
  common: "text-muted-foreground",
  uncommon: "text-entity-item",
  rare: "text-entity-rare font-medium entity-rare",
  legendary: "text-entity-legendary font-bold entity-legendary",
  npc: "text-amber-300 font-medium",
  trap: "text-orange-400 font-medium",
  shrine: "text-violet-400 font-medium italic",
  curse: "text-purple-500 font-bold entity-cursed",
  blessing: "text-sky-400 font-medium entity-blessing",
  boss: "text-red-500 font-bold uppercase tracking-wide entity-boss",
  companion: "text-teal-400 font-medium entity-companion",
  effect: "text-indigo-400 italic",
  unknown: "text-amber-400/80 italic",
  ability: "text-cyan-400 font-medium",
  environmental: "text-emerald-400/80",
};

// Animation class mapping
const animationStyles: Record<EntityAnimation, string> = {
  none: "",
  critical: "entity-critical",
  "heal-surge": "entity-heal-surge",
  "damage-shake": "entity-damage-shake",
  levelup: "entity-levelup",
  "combo-ready": "entity-combo-ready",
};

// Wrapper component that uses the hook
function ClickableEntityText({
  children,
  type,
  className,
  tooltip,
  animation = "none",
  noAnimation = false,
  entity,
  onClick,
}: EntityTextProps & { entity: DisplayableEntity }) {
  const { openEntity } = useEntityModal();

  return (
    <EntityTextInner
      type={type}
      className={className}
      tooltip={tooltip}
      animation={animation}
      noAnimation={noAnimation}
      onClick={onClick || (() => openEntity(entity))}
      isClickable
    >
      {children}
    </EntityTextInner>
  );
}

// Inner component without hook dependency
function EntityTextInner({
  children,
  type,
  className,
  tooltip,
  animation = "none",
  noAnimation = false,
  onClick,
  isClickable = false,
}: Omit<EntityTextProps, "entity"> & { isClickable?: boolean }) {
  // Get base style, stripping animation class if noAnimation is true
  let baseStyle = entityStyles[type] || "";
  if (noAnimation) {
    baseStyle = baseStyle.replace(/entity-\w+/g, "").trim();
  }

  const animationClass = animation !== "none" ? animationStyles[animation] : "";

  const clickableStyles = isClickable
    ? "cursor-pointer hover:underline hover:brightness-125 transition-all"
    : "";

  const content = (
    <span
      className={cn(baseStyle, animationClass, clickableStyles, className)}
      onClick={isClickable && onClick ? onClick : undefined}
      role={isClickable ? "button" : undefined}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable && onClick
          ? (e) => e.key === "Enter" && onClick()
          : undefined
      }
    >
      {children}
    </span>
  );

  if (tooltip) {
    return (
      <span className="group relative inline-block">
        {content}
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 text-xs bg-background/95 border border-border/50 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
          {tooltip}
        </span>
      </span>
    );
  }

  return content;
}

export function EntityText({
  children,
  type,
  className,
  tooltip,
  animation = "none",
  noAnimation = false,
  entity,
  onClick,
}: EntityTextProps) {
  // If entity is provided, use the clickable wrapper with hook
  if (entity) {
    return (
      <ClickableEntityText
        type={type}
        className={className}
        tooltip={tooltip}
        animation={animation}
        noAnimation={noAnimation}
        entity={entity}
        onClick={onClick}
      >
        {children}
      </ClickableEntityText>
    );
  }

  // Otherwise use the simple inner component (no entity = not clickable unless onClick provided)
  return (
    <EntityTextInner
      type={type}
      className={className}
      tooltip={tooltip}
      animation={animation}
      noAnimation={noAnimation}
      onClick={onClick}
      isClickable={!!onClick}
    >
      {children}
    </EntityTextInner>
  );
}

export function MysteryText({
  children,
  revealed = false,
  className,
}: {
  children: React.ReactNode;
  revealed?: boolean;
  className?: string;
}) {
  if (revealed) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      className={cn("text-muted-foreground italic entity-mystery", className)}
    >
      {children}
    </span>
  );
}

export function DamageNumber({
  amount,
  isCritical = false,
  isHeal = false,
  className,
}: {
  amount: number;
  isCritical?: boolean;
  isHeal?: boolean;
  className?: string;
}) {
  if (isHeal) {
    return (
      <EntityText type="heal" animation="heal-surge" className={className}>
        +{amount}
      </EntityText>
    );
  }

  return (
    <EntityText
      type="damage"
      animation={isCritical ? "critical" : "damage-shake"}
      className={cn(isCritical && "text-lg", className)}
    >
      {isCritical && "CRIT! "}
      {amount}
    </EntityText>
  );
}

export function LevelUpText({
  level,
  className,
}: {
  level: number;
  className?: string;
}) {
  return (
    <span className={cn("entity-levelup inline-block", className)}>
      <span className="text-entity-gold font-bold">LEVEL UP!</span>
      <span className="text-muted-foreground"> → </span>
      <span className="text-entity-player font-bold">Level {level}</span>
    </span>
  );
}

export function RarityBadge({
  rarity,
  className,
}: {
  rarity: ItemRarity;
  className?: string;
}) {
  const rarityLabels: Record<ItemRarity, string> = {
    common: "Common",
    uncommon: "Uncommon",
    rare: "Rare",
    legendary: "Legendary",
  };

  return (
    <span
      className={cn(
        "text-xs px-1.5 py-0.5 rounded",
        rarity === "legendary" && "entity-legendary font-bold",
        rarity === "rare" && "entity-rare text-entity-rare",
        rarity === "uncommon" && "text-entity-item",
        rarity === "common" && "text-muted-foreground",
        className,
      )}
    >
      {rarityLabels[rarity]}
    </span>
  );
}

// =============================================================================
// ENTITY-SPECIFIC COMPONENTS
// These auto-extract name and provide clickability - use these instead of
// manually passing entity={x} and children={x.name} to EntityText
// =============================================================================

interface EntityComponentProps {
  className?: string;
  animation?: EntityAnimation;
  noAnimation?: boolean;
}

/** Clickable enemy name - auto-links to entity modal */
export function EnemyText({
  enemy,
  className,
  animation,
  noAnimation,
}: EntityComponentProps & { enemy: Enemy }) {
  return (
    <EntityText
      type="enemy"
      entity={enemy}
      className={className}
      animation={animation}
      noAnimation={noAnimation}
    >
      {enemy.name}
    </EntityText>
  );
}

/** Clickable item name - auto-infers rarity styling and links to entity modal */
export function ItemText({
  item,
  className,
  animation,
  noAnimation,
}: EntityComponentProps & { item: Item }) {
  // Use rarity for styling if available, otherwise fall back to entityType
  const type = item.rarity || item.entityType || "item";
  return (
    <EntityText
      type={type}
      entity={item}
      className={className}
      animation={animation}
      noAnimation={noAnimation}
    >
      {item.name}
    </EntityText>
  );
}

/** Clickable NPC name - auto-links to entity modal */
export function NPCText({
  npc,
  className,
  animation,
  noAnimation,
}: EntityComponentProps & { npc: NPC }) {
  return (
    <EntityText
      type="npc"
      entity={npc}
      className={className}
      animation={animation}
      noAnimation={noAnimation}
    >
      {npc.name}
    </EntityText>
  );
}

/** Clickable trap name - auto-links to entity modal */
export function TrapText({
  trap,
  className,
  animation,
  noAnimation,
}: EntityComponentProps & { trap: Trap }) {
  return (
    <EntityText
      type="trap"
      entity={trap}
      className={className}
      animation={animation}
      noAnimation={noAnimation}
    >
      {trap.name}
    </EntityText>
  );
}

/** Clickable shrine name - auto-links to entity modal */
export function ShrineText({
  shrine,
  className,
  animation,
  noAnimation,
}: EntityComponentProps & { shrine: Shrine }) {
  return (
    <EntityText
      type="shrine"
      entity={shrine}
      className={className}
      animation={animation}
      noAnimation={noAnimation}
    >
      {shrine.name}
    </EntityText>
  );
}

/** Clickable status effect name - auto-styles based on buff/debuff */
export function EffectText({
  effect,
  className,
  animation,
  noAnimation,
}: EntityComponentProps & { effect: StatusEffect }) {
  const type =
    effect.effectType === "buff"
      ? "blessing"
      : effect.effectType === "debuff"
        ? "curse"
        : "effect";
  return (
    <EntityText
      type={type}
      entity={effect}
      className={className}
      animation={animation}
      noAnimation={noAnimation}
    >
      {effect.name}
    </EntityText>
  );
}

/** Clickable companion name - auto-links to entity modal */
export function CompanionText({
  companion,
  className,
  animation,
  noAnimation,
}: EntityComponentProps & { companion: Companion }) {
  return (
    <EntityText
      type="companion"
      entity={companion}
      className={className}
      animation={animation}
      noAnimation={noAnimation}
    >
      {companion.name}
    </EntityText>
  );
}

/** Clickable ability name - auto-links to entity modal */
export function AbilityText({
  ability,
  className,
  animation,
  noAnimation,
}: EntityComponentProps & { ability: Ability }) {
  return (
    <EntityText
      type="ability"
      entity={ability}
      className={className}
      animation={animation}
      noAnimation={noAnimation}
    >
      {ability.name}
    </EntityText>
  );
}
