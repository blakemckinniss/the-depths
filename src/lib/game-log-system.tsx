/**
 * Game Log System
 *
 * Structured, typed logging for game events. Instead of building JSX inline
 * at 139 callsites, we define log event types and render them centrally.
 *
 * Usage:
 *   const log = useGameLog()
 *   log.enemyEncounter(enemy)
 *   log.itemFound(item)
 *   log.combat.damage({ attacker: enemy, target: "player", damage: 15 })
 */

import type { ReactNode } from "react";
import type {
  Enemy,
  Item,
  NPC,
  Trap,
  Shrine,
  StatusEffect,
  Companion,
  Ability,
  LogEntry,
} from "./game-types";
import {
  EntityText,
  EnemyText,
  ItemText,
  NPCText,
  TrapText,
  ShrineText,
  EffectText,
} from "@/components/entity-text";

// =============================================================================
// LOG EVENT TYPES
// =============================================================================

export type LogCategory = LogEntry["type"];

// All possible structured log events
export type GameLogEvent =
  // Encounters
  | { event: "enemy_encounter"; enemy: Enemy }
  | { event: "trap_encounter"; trap: Trap }
  | { event: "shrine_encounter"; shrine: Shrine }
  | { event: "npc_encounter"; npc: NPC }

  // Combat
  | {
      event: "attack";
      attacker: "player" | Enemy;
      target: "player" | Enemy;
      damage: number;
      isCrit?: boolean;
      effectiveness?: "effective" | "resisted" | "normal";
    }
  | { event: "enemy_slain"; enemy: Enemy; gold: number; exp: number }
  | {
      event: "player_attack";
      enemy: Enemy;
      damage: number;
      isCrit?: boolean;
      effectiveness?: "effective" | "resisted" | "normal";
      narration?: string;
    }
  | {
      event: "enemy_attack";
      enemy: Enemy;
      damage: number;
      ability?: string;
      narration?: string;
    }
  | { event: "dodge"; enemy: Enemy }
  | { event: "flee_success"; enemy: Enemy }
  | { event: "flee_fail"; enemy: Enemy; damage: number }

  // Loot
  | { event: "item_found"; item: Item }
  | { event: "items_collected"; items: Item[]; totalGold?: number }
  | { event: "gold_found"; amount: number }
  | { event: "loot_container_discovered"; name: string; rarity: string }

  // Effects
  | { event: "effect_applied"; effect: StatusEffect; target: "player" | Enemy }
  | { event: "effect_expired"; effect: StatusEffect }
  | { event: "heal"; amount: number; source?: string }
  | { event: "damage_taken"; amount: number; source?: string }
  | { event: "curse_triggered"; effect: string }

  // Traps
  | { event: "trap_disarmed"; trap: Trap }
  | { event: "trap_triggered"; trap: Trap; damage: number }
  | { event: "trap_avoided"; trap: Trap }

  // Shrines
  | { event: "shrine_blessing"; shrine: Shrine; effect: StatusEffect }
  | { event: "shrine_ignored"; shrine: Shrine }
  | { event: "shrine_desecrated"; shrine: Shrine; effect?: StatusEffect }

  // NPC
  | { event: "npc_trade"; npc: NPC; item: Item; cost: number }
  | { event: "npc_ignored"; npc: NPC }
  | { event: "npc_attacked"; npc: NPC }

  // Player
  | { event: "level_up"; level: number; ability?: Ability }
  | { event: "stance_change"; stance: string }
  | { event: "ability_used"; ability: Ability; narration?: string }
  | { event: "item_equipped"; item: Item }
  | { event: "item_discarded"; item: Item }
  | { event: "potion_used"; item: Item; healing: number }

  // Dungeon
  | { event: "dungeon_entered"; name: string }
  | { event: "floor_descended"; floor: number }
  | { event: "dungeon_complete"; name: string }
  | { event: "room_entered"; description: string }

  // System
  | { event: "narration"; text: string }
  | { event: "system"; text: string }
  | { event: "companion_action"; companion: Companion; action: string }

  // Raw fallback (for migration)
  | { event: "raw"; content: ReactNode; category?: LogCategory };

// =============================================================================
// LOG RENDERER
// =============================================================================

function renderEffectiveness(
  effectiveness?: "effective" | "resisted" | "normal",
): ReactNode {
  if (!effectiveness || effectiveness === "normal") return null;
  return (
    <span
      className={
        effectiveness === "effective" ? "text-emerald-400" : "text-stone-500"
      }
    >
      {effectiveness === "effective" ? " Super effective!" : " Resisted..."}
    </span>
  );
}

/**
 * Renders a structured log event to JSX with proper entity linking
 */
export function renderLogEvent(event: GameLogEvent): {
  content: ReactNode;
  category: LogCategory;
} {
  switch (event.event) {
    // === ENCOUNTERS ===
    case "enemy_encounter":
      return {
        content: (
          <span>
            A <EnemyText enemy={event.enemy} /> blocks your path!
          </span>
        ),
        category: "combat",
      };

    case "trap_encounter":
      return {
        content: (
          <span>
            You notice a <TrapText trap={event.trap} /> ahead!
          </span>
        ),
        category: "narrative",
      };

    case "shrine_encounter":
      return {
        content: (
          <span>
            You discover a <ShrineText shrine={event.shrine} />.
          </span>
        ),
        category: "narrative",
      };

    case "npc_encounter":
      return {
        content: (
          <span>
            You encounter <NPCText npc={event.npc} />.
          </span>
        ),
        category: "narrative",
      };

    // === COMBAT ===
    case "attack": {
      const attackerName =
        event.attacker === "player" ? (
          <EntityText type="player">You</EntityText>
        ) : (
          <EnemyText enemy={event.attacker} />
        );
      const targetName =
        event.target === "player" ? (
          <EntityText type="player">you</EntityText>
        ) : (
          <EnemyText enemy={event.target} />
        );
      return {
        content: (
          <span>
            {attackerName} {event.attacker === "player" ? "strike" : "strikes"}{" "}
            {targetName} for{" "}
            <EntityText type="damage">
              {event.isCrit ? "CRIT! " : ""}
              {event.damage}
            </EntityText>{" "}
            damage{renderEffectiveness(event.effectiveness)}
          </span>
        ),
        category: "combat",
      };
    }

    case "player_attack":
      return {
        content: (
          <span>
            {event.narration ? (
              <>{event.narration} </>
            ) : (
              <>
                <EntityText type="player">You</EntityText> strike the{" "}
                <EnemyText enemy={event.enemy} /> for{" "}
              </>
            )}
            <EntityText type="damage">
              {event.isCrit ? "CRIT! " : ""}
              {event.damage}
            </EntityText>
            {!event.narration && " damage"}
            {renderEffectiveness(event.effectiveness)}
          </span>
        ),
        category: "combat",
      };

    case "enemy_attack":
      return {
        content: (
          <span>
            <EnemyText enemy={event.enemy} />{" "}
            {event.ability ? (
              <>
                uses <span className="text-red-400">{event.ability}</span>!{" "}
                {event.narration}{" "}
              </>
            ) : (
              <>strikes back for </>
            )}
            <EntityText type="damage">-{event.damage}</EntityText>
            {!event.ability && " damage!"}
          </span>
        ),
        category: "combat",
      };

    case "dodge":
      return {
        content: (
          <span>
            <EnemyText enemy={event.enemy} /> attacks but you{" "}
            <span className="text-cyan-400">dodge</span> the blow!
          </span>
        ),
        category: "combat",
      };

    case "enemy_slain":
      return {
        content: (
          <span>
            <EnemyText enemy={event.enemy} /> has been slain! You gain{" "}
            <EntityText type="gold">{event.gold}</EntityText> gold and{" "}
            <span className="text-emerald-400">{event.exp}</span> experience.
          </span>
        ),
        category: "combat",
      };

    case "flee_success":
      return {
        content: (
          <span>
            <EntityText type="player">You</EntityText> escape from the{" "}
            <EnemyText enemy={event.enemy} />!
          </span>
        ),
        category: "combat",
      };

    case "flee_fail":
      return {
        content: (
          <span>
            Failed to flee! The <EnemyText enemy={event.enemy} /> strikes for{" "}
            <EntityText type="damage">{event.damage}</EntityText> damage.
          </span>
        ),
        category: "combat",
      };

    // === LOOT ===
    case "item_found":
      return {
        content: (
          <span>
            You found: <ItemText item={event.item} />!
          </span>
        ),
        category: "loot",
      };

    case "items_collected":
      return {
        content: (
          <span>
            Collected {event.items.length} item
            {event.items.length !== 1 ? "s" : ""}:{" "}
            {event.items.map((item, i) => (
              <span key={item.id}>
                {i > 0 && ", "}
                <ItemText item={item} />
              </span>
            ))}
            {event.totalGold && event.totalGold > 0 && (
              <>
                {" "}
                worth{" "}
                <EntityText type="gold">{event.totalGold} gold</EntityText>
              </>
            )}
          </span>
        ),
        category: "loot",
      };

    case "gold_found":
      return {
        content: (
          <span>
            Found <EntityText type="gold">{event.amount} gold</EntityText>.
          </span>
        ),
        category: "loot",
      };

    case "loot_container_discovered":
      return {
        content: (
          <span>
            You discover a mysterious{" "}
            <EntityText
              type={
                event.rarity === "epic"
                  ? "legendary"
                  : (event.rarity as
                      | "legendary"
                      | "rare"
                      | "uncommon"
                      | "common")
              }
            >
              {event.name}
            </EntityText>
            ...
          </span>
        ),
        category: "loot",
      };

    // === EFFECTS ===
    case "effect_applied":
      return {
        content: (
          <span>
            {event.target === "player" ? (
              "You are"
            ) : (
              <>
                <EnemyText enemy={event.target} /> is
              </>
            )}{" "}
            afflicted with <EffectText effect={event.effect} />!
          </span>
        ),
        category: "effect",
      };

    case "effect_expired":
      return {
        content: (
          <span>
            <EffectText effect={event.effect} /> has worn off.
          </span>
        ),
        category: "effect",
      };

    case "heal":
      return {
        content: (
          <span>
            {event.source ? `${event.source}: ` : ""}
            <EntityText type="heal">+{event.amount}</EntityText> health.
          </span>
        ),
        category: "effect",
      };

    case "damage_taken":
      return {
        content: (
          <span>
            {event.source ? `${event.source}: ` : ""}
            <EntityText type="damage">-{event.amount}</EntityText> HP.
          </span>
        ),
        category: "combat",
      };

    case "curse_triggered":
      return {
        content: (
          <span className="text-red-400">
            <EntityText type="damage">Cursed!</EntityText> {event.effect}
          </span>
        ),
        category: "combat",
      };

    // === TRAPS ===
    case "trap_disarmed":
      return {
        content: (
          <span>
            You carefully disarm the <TrapText trap={event.trap} />.
            <EntityText type="heal"> Safe passage secured.</EntityText>
          </span>
        ),
        category: "narrative",
      };

    case "trap_triggered":
      return {
        content: (
          <span>
            The <TrapText trap={event.trap} /> activates!{" "}
            <EntityText type="damage">-{event.damage} HP</EntityText>
          </span>
        ),
        category: "combat",
      };

    case "trap_avoided":
      return {
        content: (
          <span>
            You carefully edge past the <TrapText trap={event.trap} />.
          </span>
        ),
        category: "narrative",
      };

    // === SHRINES ===
    case "shrine_blessing":
      return {
        content: (
          <span>
            The shrine bestows <EffectText effect={event.effect} /> upon you!
          </span>
        ),
        category: "effect",
      };

    case "shrine_ignored":
      return {
        content: (
          <span>
            You leave the <ShrineText shrine={event.shrine} /> undisturbed.
          </span>
        ),
        category: "narrative",
      };

    case "shrine_desecrated":
      return {
        content: (
          <span>
            You desecrate the <ShrineText shrine={event.shrine} />.
            {event.effect && (
              <>
                {" "}
                <EffectText effect={event.effect} /> gained!
              </>
            )}
          </span>
        ),
        category: "effect",
      };

    // === NPC ===
    case "npc_trade":
      return {
        content: (
          <span>
            You purchase <ItemText item={event.item} /> for{" "}
            <EntityText type="gold">{event.cost} gold</EntityText>.
          </span>
        ),
        category: "loot",
      };

    case "npc_ignored":
      return {
        content: (
          <span>
            You nod to <NPCText npc={event.npc} /> and continue on your way.
          </span>
        ),
        category: "narrative",
      };

    case "npc_attacked":
      return {
        content: (
          <span>
            <NPCText npc={event.npc} /> cries out as you attack!{" "}
            <EntityText type="enemy">They fight back!</EntityText>
          </span>
        ),
        category: "combat",
      };

    // === PLAYER ===
    case "level_up":
      return {
        content: (
          <span>
            <EntityText type="player">LEVEL UP!</EntityText> You are now level{" "}
            <span className="text-entity-gold font-bold">{event.level}</span>.
            {event.ability && (
              <>
                {" "}
                You learned a new ability:{" "}
                <EntityText type="rare">{event.ability.name}</EntityText>!
              </>
            )}
          </span>
        ),
        category: "system",
      };

    case "stance_change":
      return {
        content: (
          <span className="text-stone-400 text-sm">
            You shift to a{" "}
            <span className="text-amber-300">{event.stance}</span> stance.
          </span>
        ),
        category: "system",
      };

    case "ability_used":
      return {
        content: (
          <span>
            You use <EntityText type="ability">{event.ability.name}</EntityText>
            {event.narration && <>. {event.narration}</>}
          </span>
        ),
        category: "combat",
      };

    case "item_equipped":
      return {
        content: (
          <span>
            <EntityText type="player">You</EntityText> equip{" "}
            <ItemText item={event.item} />.
          </span>
        ),
        category: "system",
      };

    case "item_discarded":
      return {
        content: (
          <span>
            Discarded <ItemText item={event.item} />.
          </span>
        ),
        category: "system",
      };

    case "potion_used":
      return {
        content: (
          <span>
            <EntityText type="player">You</EntityText> consume{" "}
            <ItemText item={event.item} />.{" "}
            <EntityText type="heal">+{event.healing} health</EntityText>.
          </span>
        ),
        category: "effect",
      };

    // === DUNGEON ===
    case "dungeon_entered":
      return {
        content: (
          <span>
            You enter <EntityText type="location">{event.name}</EntityText>.
          </span>
        ),
        category: "narrative",
      };

    case "floor_descended":
      return {
        content: (
          <span>
            You descend to{" "}
            <EntityText type="location">Floor {event.floor}</EntityText>. The
            darkness grows deeper.
          </span>
        ),
        category: "narrative",
      };

    case "dungeon_complete":
      return {
        content: (
          <span>
            <EntityText type="legendary">DUNGEON COMPLETE!</EntityText> You have
            conquered <EntityText type="location">{event.name}</EntityText>!
          </span>
        ),
        category: "system",
      };

    case "room_entered":
      return {
        content: <span>{event.description}</span>,
        category: "narrative",
      };

    // === SYSTEM ===
    case "narration":
      return {
        content: <span>{event.text}</span>,
        category: "narrative",
      };

    case "system":
      return {
        content: <span className="text-stone-400 text-sm">{event.text}</span>,
        category: "system",
      };

    case "companion_action":
      return {
        content: (
          <span className="text-teal-400/80 italic">
            {event.companion.name}: {event.action}
          </span>
        ),
        category: "dialogue",
      };

    // === RAW FALLBACK ===
    case "raw":
      return {
        content: event.content,
        category: event.category || "narrative",
      };

    default: {
      // Exhaustiveness check - this should never be reached
      const _exhaustiveCheck: never = event;
      return {
        content: <span>Unknown event</span>,
        category: "system" as LogCategory,
      };
    }
  }
}

// =============================================================================
// LOG ENTRY CREATOR
// =============================================================================

/**
 * Creates a LogEntry from a structured event
 */
export function createLogEntry(event: GameLogEvent): LogEntry {
  const { content, category } = renderLogEvent(event);
  return {
    id: crypto.randomUUID(),
    content,
    type: category,
    timestamp: Date.now(),
  };
}

// =============================================================================
// GAME LOGGER CLASS
// =============================================================================

export type LogDispatcher = (entry: LogEntry) => void;

/**
 * Fluent API for game logging with full type safety
 */
export class GameLogger {
  constructor(private dispatch: LogDispatcher) {}

  private log(event: GameLogEvent) {
    this.dispatch(createLogEntry(event));
  }

  // Encounters
  enemyEncounter(enemy: Enemy) {
    this.log({ event: "enemy_encounter", enemy });
  }
  trapEncounter(trap: Trap) {
    this.log({ event: "trap_encounter", trap });
  }
  shrineEncounter(shrine: Shrine) {
    this.log({ event: "shrine_encounter", shrine });
  }
  npcEncounter(npc: NPC) {
    this.log({ event: "npc_encounter", npc });
  }

  // Combat
  playerAttack(
    enemy: Enemy,
    damage: number,
    opts?: {
      isCrit?: boolean;
      effectiveness?: "effective" | "resisted" | "normal";
      narration?: string;
    },
  ) {
    this.log({ event: "player_attack", enemy, damage, ...opts });
  }
  enemyAttack(
    enemy: Enemy,
    damage: number,
    opts?: { ability?: string; narration?: string },
  ) {
    this.log({ event: "enemy_attack", enemy, damage, ...opts });
  }
  dodge(enemy: Enemy) {
    this.log({ event: "dodge", enemy });
  }
  enemySlain(enemy: Enemy, gold: number, exp: number) {
    this.log({ event: "enemy_slain", enemy, gold, exp });
  }
  fleeSuccess(enemy: Enemy) {
    this.log({ event: "flee_success", enemy });
  }
  fleeFail(enemy: Enemy, damage: number) {
    this.log({ event: "flee_fail", enemy, damage });
  }

  // Loot
  itemFound(item: Item) {
    this.log({ event: "item_found", item });
  }
  itemsCollected(items: Item[], totalGold?: number) {
    this.log({ event: "items_collected", items, totalGold });
  }
  goldFound(amount: number) {
    this.log({ event: "gold_found", amount });
  }
  lootContainerDiscovered(name: string, rarity: string) {
    this.log({ event: "loot_container_discovered", name, rarity });
  }

  // Effects
  effectApplied(effect: StatusEffect, target: "player" | Enemy) {
    this.log({ event: "effect_applied", effect, target });
  }
  effectExpired(effect: StatusEffect) {
    this.log({ event: "effect_expired", effect });
  }
  heal(amount: number, source?: string) {
    this.log({ event: "heal", amount, source });
  }
  damageTaken(amount: number, source?: string) {
    this.log({ event: "damage_taken", amount, source });
  }
  curseTriggered(effect: string) {
    this.log({ event: "curse_triggered", effect });
  }

  // Traps
  trapDisarmed(trap: Trap) {
    this.log({ event: "trap_disarmed", trap });
  }
  trapTriggered(trap: Trap, damage: number) {
    this.log({ event: "trap_triggered", trap, damage });
  }
  trapAvoided(trap: Trap) {
    this.log({ event: "trap_avoided", trap });
  }

  // Shrines
  shrineBlessing(shrine: Shrine, effect: StatusEffect) {
    this.log({ event: "shrine_blessing", shrine, effect });
  }
  shrineIgnored(shrine: Shrine) {
    this.log({ event: "shrine_ignored", shrine });
  }
  shrineDesecrated(shrine: Shrine, effect?: StatusEffect) {
    this.log({ event: "shrine_desecrated", shrine, effect });
  }

  // NPC
  npcTrade(npc: NPC, item: Item, cost: number) {
    this.log({ event: "npc_trade", npc, item, cost });
  }
  npcIgnored(npc: NPC) {
    this.log({ event: "npc_ignored", npc });
  }
  npcAttacked(npc: NPC) {
    this.log({ event: "npc_attacked", npc });
  }

  // Player
  levelUp(level: number, ability?: Ability) {
    this.log({ event: "level_up", level, ability });
  }
  stanceChange(stance: string) {
    this.log({ event: "stance_change", stance });
  }
  abilityUsed(ability: Ability, narration?: string) {
    this.log({ event: "ability_used", ability, narration });
  }
  itemEquipped(item: Item) {
    this.log({ event: "item_equipped", item });
  }
  itemDiscarded(item: Item) {
    this.log({ event: "item_discarded", item });
  }
  potionUsed(item: Item, healing: number) {
    this.log({ event: "potion_used", item, healing });
  }

  // Dungeon
  dungeonEntered(name: string) {
    this.log({ event: "dungeon_entered", name });
  }
  floorDescended(floor: number) {
    this.log({ event: "floor_descended", floor });
  }
  dungeonComplete(name: string) {
    this.log({ event: "dungeon_complete", name });
  }
  roomEntered(description: string) {
    this.log({ event: "room_entered", description });
  }

  // System
  narration(text: string) {
    this.log({ event: "narration", text });
  }
  system(text: string) {
    this.log({ event: "system", text });
  }
  companionAction(companion: Companion, action: string) {
    this.log({ event: "companion_action", companion, action });
  }

  // Raw fallback for complex cases during migration
  raw(content: ReactNode, category?: LogCategory) {
    this.log({ event: "raw", content, category });
  }
}

/**
 * Creates a GameLogger instance with the given dispatch function
 */
export function createGameLogger(dispatch: LogDispatcher): GameLogger {
  return new GameLogger(dispatch);
}
