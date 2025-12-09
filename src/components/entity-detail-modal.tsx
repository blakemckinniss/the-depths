"use client"

import type { ReactNode } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { useEntityModal, type DisplayableEntity } from "./entity-modal-context"
import { EntityText, RarityBadge } from "./entity-text"
import type {
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
  EntityType,
  ItemRarity,
} from "@/lib/game-types"
import { cn } from "@/lib/utils"

// Type guards for entity discrimination
function hasEntityType(entity: DisplayableEntity): entity is DisplayableEntity & { entityType: string } {
  return "entityType" in entity
}

function isItem(entity: DisplayableEntity): entity is Item {
  return "type" in entity && ["weapon", "armor", "potion", "misc", "key", "quest"].includes((entity as Item).type)
}

function isEnemy(entity: DisplayableEntity): entity is Enemy {
  return hasEntityType(entity) && entity.entityType === "enemy"
}

function isNPC(entity: DisplayableEntity): entity is NPC {
  return hasEntityType(entity) && entity.entityType === "npc"
}

function isTrap(entity: DisplayableEntity): entity is Trap {
  return hasEntityType(entity) && entity.entityType === "trap"
}

function isShrine(entity: DisplayableEntity): entity is Shrine {
  return hasEntityType(entity) && entity.entityType === "shrine"
}

function isStatusEffect(entity: DisplayableEntity): entity is StatusEffect {
  return hasEntityType(entity) && (entity.entityType === "effect" || entity.entityType === "curse" || entity.entityType === "blessing")
}

function isCompanion(entity: DisplayableEntity): entity is Companion {
  return hasEntityType(entity) && entity.entityType === "companion"
}

function isBoss(entity: DisplayableEntity): entity is Boss {
  return hasEntityType(entity) && entity.entityType === "boss"
}

function isAbility(entity: DisplayableEntity): entity is Ability {
  return hasEntityType(entity) && entity.entityType === "ability"
}

function isEnemyAbility(entity: DisplayableEntity): entity is EnemyAbility {
  return !hasEntityType(entity) && "chance" in entity && "narration" in entity && "cooldown" in entity
}

function isCompanionAbility(entity: DisplayableEntity): entity is CompanionAbility {
  return !hasEntityType(entity) && "effect" in entity && "narration" in entity && !("chance" in entity)
}

// Stat row component
function StatRow({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-border/30 last:border-0">
      <span className="text-muted-foreground text-sm">{label}</span>
      <span className={cn("font-medium", color)}>{value}</span>
    </div>
  )
}

// Section component
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-4">
      <h4 className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{title}</h4>
      <div className="bg-background/50 rounded-md p-3 border border-border/30">
        {children}
      </div>
    </div>
  )
}

// Individual entity renderers
function ItemDetail({ item }: { item: Item }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <RarityBadge rarity={item.rarity} />
        <span className="text-xs text-muted-foreground capitalize">{item.type}</span>
        {item.category && (
          <span className="text-xs text-muted-foreground">/ {item.category}</span>
        )}
      </div>

      {item.description && (
        <p className="text-sm text-muted-foreground mb-4">{item.description}</p>
      )}

      {item.stats && (
        <Section title="Stats">
          {item.stats.attack && <StatRow label="Attack" value={`+${item.stats.attack}`} color="text-entity-damage" />}
          {item.stats.defense && <StatRow label="Defense" value={`+${item.stats.defense}`} color="text-entity-armor" />}
          {item.stats.health && <StatRow label="Health" value={`+${item.stats.health}`} color="text-entity-heal" />}
        </Section>
      )}

      {item.damageType && (
        <Section title="Damage Type">
          <span className="capitalize text-sm">{item.damageType}</span>
        </Section>
      )}

      {item.effects && item.effects.length > 0 && (
        <Section title="Effects">
          {item.effects.map((effect, i) => (
            <div key={i} className="text-sm">
              <span className="text-indigo-400">{effect.name}</span>
              {effect.description && <span className="text-muted-foreground"> - {effect.description}</span>}
            </div>
          ))}
        </Section>
      )}

      {item.lore && (
        <Section title="Lore">
          <p className="text-sm italic text-muted-foreground">{item.lore}</p>
        </Section>
      )}

      <div className="mt-4 pt-3 border-t border-border/30 flex justify-between text-xs text-muted-foreground">
        <span>Value: <EntityText type="gold" noAnimation>{item.value}g</EntityText></span>
        {item.equipped && <span className="text-entity-item">Equipped</span>}
      </div>
    </>
  )
}

function EnemyDetail({ enemy }: { enemy: Enemy }) {
  return (
    <>
      {enemy.description && (
        <p className="text-sm text-muted-foreground mb-4">{enemy.description}</p>
      )}

      <Section title="Combat Stats">
        <StatRow label="Health" value={`${enemy.health} / ${enemy.maxHealth}`} color="text-entity-heal" />
        <StatRow label="Attack" value={enemy.attack} color="text-entity-damage" />
        <StatRow label="Defense" value={enemy.defense} color="text-entity-armor" />
      </Section>

      {(enemy.weakness || enemy.resistance) && (
        <Section title="Vulnerabilities">
          {enemy.weakness && <StatRow label="Weakness" value={enemy.weakness} color="text-green-400" />}
          {enemy.resistance && <StatRow label="Resistance" value={enemy.resistance} color="text-red-400" />}
        </Section>
      )}

      {enemy.abilities && enemy.abilities.length > 0 && (
        <Section title="Abilities">
          {enemy.abilities.map((ability, i) => (
            <div key={i} className="py-1 border-b border-border/20 last:border-0">
              <div className="font-medium text-sm text-amber-400">{ability.name}</div>
              <div className="text-xs text-muted-foreground">{ability.description}</div>
              {ability.damage && (
                <div className="text-xs mt-1">
                  <span className="text-entity-damage">{ability.damage} damage</span>
                  {ability.damageType && <span className="text-muted-foreground"> ({ability.damageType})</span>}
                </div>
              )}
            </div>
          ))}
        </Section>
      )}

      <div className="mt-4 pt-3 border-t border-border/30 flex justify-between text-xs text-muted-foreground">
        <span>EXP: <span className="text-entity-gold">{enemy.expReward}</span></span>
        <span>Gold: <EntityText type="gold" noAnimation>{enemy.goldReward}g</EntityText></span>
      </div>
    </>
  )
}

function NPCDetail({ npc }: { npc: NPC }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded bg-amber-900/30 text-amber-400 capitalize">{npc.role}</span>
        <span className="text-xs text-muted-foreground">
          Disposition: {npc.disposition > 0 ? "Friendly" : npc.disposition < 0 ? "Hostile" : "Neutral"}
        </span>
      </div>

      {npc.description && (
        <p className="text-sm text-muted-foreground mb-4">{npc.description}</p>
      )}

      {npc.personality && (
        <Section title="Personality">
          <p className="text-sm italic">{npc.personality}</p>
        </Section>
      )}

      {npc.inventory && npc.inventory.length > 0 && (
        <Section title="Inventory">
          {npc.inventory.map((item, i) => (
            <div key={i} className="text-sm py-1">
              <EntityText type={item.rarity} noAnimation>{item.name}</EntityText>
              <span className="text-muted-foreground ml-2">({item.value}g)</span>
            </div>
          ))}
        </Section>
      )}
    </>
  )
}

function TrapDetail({ trap }: { trap: Trap }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded bg-orange-900/30 text-orange-400 capitalize">{trap.trapType}</span>
        {trap.triggered && <span className="text-xs text-red-400">Triggered</span>}
        {trap.hidden && <span className="text-xs text-purple-400">Hidden</span>}
      </div>

      {trap.description && (
        <p className="text-sm text-muted-foreground mb-4">{trap.description}</p>
      )}

      <Section title="Properties">
        {trap.damage && <StatRow label="Damage" value={trap.damage} color="text-entity-damage" />}
        <StatRow label="Disarm DC" value={trap.disarmDC} color="text-amber-400" />
      </Section>

      {trap.effect && (
        <Section title="Effect">
          <div className="text-sm">
            <span className="text-purple-400">{trap.effect.name}</span>
            {trap.effect.description && <p className="text-muted-foreground text-xs mt-1">{trap.effect.description}</p>}
          </div>
        </Section>
      )}
    </>
  )
}

function ShrineDetail({ shrine }: { shrine: Shrine }) {
  const riskColors = {
    safe: "text-green-400",
    moderate: "text-yellow-400",
    dangerous: "text-orange-400",
    deadly: "text-red-400",
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded bg-violet-900/30 text-violet-400 capitalize">{shrine.shrineType}</span>
        <span className={cn("text-xs capitalize", riskColors[shrine.riskLevel])}>{shrine.riskLevel}</span>
        {shrine.used && <span className="text-xs text-muted-foreground">Used</span>}
      </div>

      {shrine.description && (
        <p className="text-sm text-muted-foreground mb-4">{shrine.description}</p>
      )}

      {shrine.cost && (
        <Section title="Cost">
          {shrine.cost.health && <StatRow label="Health" value={`-${shrine.cost.health}`} color="text-entity-damage" />}
          {shrine.cost.gold && <StatRow label="Gold" value={`-${shrine.cost.gold}`} color="text-entity-gold" />}
          {shrine.cost.item && <StatRow label="Item" value={shrine.cost.item} />}
        </Section>
      )}

      {shrine.reward && (
        <Section title="Potential Reward">
          {shrine.reward.gold && <StatRow label="Gold" value={`+${shrine.reward.gold}`} color="text-entity-gold" />}
          {shrine.reward.effect && <StatRow label="Effect" value={shrine.reward.effect.name || "Unknown"} color="text-indigo-400" />}
          {shrine.reward.item && <StatRow label="Item" value={shrine.reward.item.name || "Unknown"} color="text-entity-item" />}
        </Section>
      )}
    </>
  )
}

function StatusEffectDetail({ effect }: { effect: StatusEffect }) {
  const typeColors = {
    buff: "text-green-400 bg-green-900/30",
    debuff: "text-red-400 bg-red-900/30",
    neutral: "text-blue-400 bg-blue-900/30",
  }

  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className={cn("text-xs px-2 py-0.5 rounded capitalize", typeColors[effect.effectType])}>
          {effect.effectType}
        </span>
        <span className="text-xs text-muted-foreground">
          {effect.duration === -1 ? "Permanent" : `${effect.duration} turns`}
        </span>
        {effect.stacks && effect.stacks > 1 && (
          <span className="text-xs text-amber-400">x{effect.stacks}</span>
        )}
      </div>

      {effect.description && (
        <p className="text-sm text-muted-foreground mb-4">{effect.description}</p>
      )}

      <Section title="Modifiers">
        {effect.modifiers.attack && <StatRow label="Attack" value={effect.modifiers.attack > 0 ? `+${effect.modifiers.attack}` : effect.modifiers.attack} color={effect.modifiers.attack > 0 ? "text-green-400" : "text-red-400"} />}
        {effect.modifiers.defense && <StatRow label="Defense" value={effect.modifiers.defense > 0 ? `+${effect.modifiers.defense}` : effect.modifiers.defense} color={effect.modifiers.defense > 0 ? "text-green-400" : "text-red-400"} />}
        {effect.modifiers.maxHealth && <StatRow label="Max Health" value={effect.modifiers.maxHealth > 0 ? `+${effect.modifiers.maxHealth}` : effect.modifiers.maxHealth} color={effect.modifiers.maxHealth > 0 ? "text-green-400" : "text-red-400"} />}
        {effect.modifiers.healthRegen && <StatRow label="Health Regen" value={effect.modifiers.healthRegen > 0 ? `+${effect.modifiers.healthRegen}` : effect.modifiers.healthRegen} color={effect.modifiers.healthRegen > 0 ? "text-green-400" : "text-red-400"} />}
        {effect.modifiers.goldMultiplier && <StatRow label="Gold Bonus" value={`${Math.round(effect.modifiers.goldMultiplier * 100)}%`} color="text-entity-gold" />}
        {effect.modifiers.expMultiplier && <StatRow label="EXP Bonus" value={`${Math.round(effect.modifiers.expMultiplier * 100)}%`} color="text-entity-gold" />}
      </Section>

      {effect.sourceType && (
        <div className="mt-4 pt-3 border-t border-border/30 text-xs text-muted-foreground">
          Source: <span className="capitalize">{effect.sourceType}</span>
        </div>
      )}
    </>
  )
}

function CompanionDetail({ companion }: { companion: Companion }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded bg-teal-900/30 text-teal-400">{companion.species}</span>
        <span className="text-xs text-muted-foreground capitalize">{companion.origin}</span>
        {!companion.alive && <span className="text-xs text-red-400">Deceased</span>}
      </div>

      <p className="text-sm text-muted-foreground mb-4">{companion.appearance}</p>

      <Section title="Stats">
        <StatRow label="Health" value={`${companion.stats.health} / ${companion.stats.maxHealth}`} color="text-entity-heal" />
        <StatRow label="Attack" value={companion.stats.attack} color="text-entity-damage" />
        <StatRow label="Defense" value={companion.stats.defense} color="text-entity-armor" />
        <StatRow label="Speed" value={companion.stats.speed} />
      </Section>

      <Section title="Bond">
        <StatRow label="Level" value={companion.bond.level} color="text-teal-400" />
        <StatRow label="Mood" value={companion.bond.mood} />
      </Section>

      {companion.abilities.length > 0 && (
        <Section title="Abilities">
          {companion.abilities.map((ability, i) => (
            <div key={i} className="py-1 border-b border-border/20 last:border-0">
              <div className="font-medium text-sm text-teal-400">{ability.name}</div>
              <div className="text-xs text-muted-foreground">{ability.description}</div>
            </div>
          ))}
        </Section>
      )}

      <Section title="Personality">
        <div className="flex flex-wrap gap-1">
          {(Array.isArray(companion.personality) ? companion.personality : [companion.personality]).map((trait: string, i: number) => (
            <span key={i} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">{trait}</span>
          ))}
        </div>
      </Section>

      {companion.quirk && (
        <Section title="Quirk">
          <p className="text-sm italic">{companion.quirk}</p>
        </Section>
      )}
    </>
  )
}

function BossDetail({ boss }: { boss: Boss }) {
  return (
    <>
      {boss.description && (
        <p className="text-sm text-muted-foreground mb-4">{boss.description}</p>
      )}

      <Section title="Combat Stats">
        <StatRow label="Health" value={`${boss.health} / ${boss.maxHealth}`} color="text-entity-heal" />
        <StatRow label="Attack" value={boss.attack} color="text-entity-damage" />
        <StatRow label="Defense" value={boss.defense} color="text-entity-armor" />
        <StatRow label="Current Phase" value={`${boss.currentPhase + 1} / ${boss.phases.length}`} color="text-amber-400" />
      </Section>

      <Section title="Phases">
        {boss.phases.map((phase, i) => (
          <div key={i} className={cn(
            "py-2 border-b border-border/20 last:border-0",
            i === boss.currentPhase && "bg-red-900/20 -mx-3 px-3 rounded"
          )}>
            <div className="font-medium text-sm text-red-400">{phase.name}</div>
            <div className="text-xs text-muted-foreground">
              Triggers at {phase.healthThreshold}% HP
            </div>
            {phase.specialAbility && (
              <div className="text-xs text-amber-400 mt-1">{phase.specialAbility}</div>
            )}
          </div>
        ))}
      </Section>

      <div className="mt-4 pt-3 border-t border-border/30 flex justify-between text-xs text-muted-foreground">
        <span>EXP: <span className="text-entity-gold">{boss.expReward}</span></span>
        <span>Gold: <EntityText type="gold" noAnimation>{boss.goldReward}g</EntityText></span>
      </div>
    </>
  )
}

function AbilityDetail({ ability }: { ability: Ability }) {
  return (
    <>
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs px-2 py-0.5 rounded bg-indigo-900/30 text-indigo-400 capitalize">{ability.category}</span>
        {ability.damageType && (
          <span className="text-xs text-muted-foreground capitalize">{ability.damageType}</span>
        )}
        {ability.isPassive && <span className="text-xs text-green-400">Passive</span>}
      </div>

      {ability.description && (
        <p className="text-sm text-muted-foreground mb-4">{ability.description}</p>
      )}

      <Section title="Properties">
        <StatRow label="Resource Cost" value={`${ability.resourceCost} ${ability.resourceType}`} color="text-blue-400" />
        <StatRow label="Cooldown" value={`${ability.cooldown} turns`} />
        <StatRow label="Level Required" value={ability.levelRequired} />
        {ability.baseDamage && <StatRow label="Base Damage" value={ability.baseDamage} color="text-entity-damage" />}
        {ability.baseHealing && <StatRow label="Base Healing" value={ability.baseHealing} color="text-entity-heal" />}
      </Section>

      {ability.tags && ability.tags.length > 0 && (
        <Section title="Tags">
          <div className="flex flex-wrap gap-1">
            {ability.tags.map((tag, i) => (
              <span key={i} className="text-xs px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">{tag}</span>
            ))}
          </div>
        </Section>
      )}

      {ability.castNarration && (
        <Section title="Cast">
          <p className="text-sm italic text-muted-foreground">{ability.castNarration}</p>
        </Section>
      )}
    </>
  )
}

function EnemyAbilityDetail({ ability }: { ability: EnemyAbility }) {
  return (
    <>
      {ability.description && (
        <p className="text-sm text-muted-foreground mb-4">{ability.description}</p>
      )}

      <Section title="Properties">
        {ability.damage && <StatRow label="Damage" value={ability.damage} color="text-entity-damage" />}
        {ability.damageType && <StatRow label="Damage Type" value={ability.damageType} />}
        <StatRow label="Cooldown" value={`${ability.cooldown} turns`} />
        <StatRow label="Use Chance" value={`${Math.round(ability.chance * 100)}%`} color="text-amber-400" />
      </Section>

      {ability.effect && (
        <Section title="Applies Effect">
          <div className="text-sm">
            <span className="text-purple-400">{ability.effect.name}</span>
            {ability.effect.description && <p className="text-muted-foreground text-xs mt-1">{ability.effect.description}</p>}
          </div>
        </Section>
      )}

      {ability.narration && (
        <Section title="Cast">
          <p className="text-sm italic text-muted-foreground">{ability.narration}</p>
        </Section>
      )}
    </>
  )
}

function CompanionAbilityDetail({ ability }: { ability: CompanionAbility }) {
  return (
    <>
      {ability.description && (
        <p className="text-sm text-muted-foreground mb-4">{ability.description}</p>
      )}

      <Section title="Properties">
        <StatRow label="Type" value={ability.effect.type} color="text-cyan-400" />
        <StatRow label="Target" value={ability.effect.target.replace("_", " ")} />
        <StatRow label="Cooldown" value={`${ability.cooldown} turns`} />
        {ability.effect.value && <StatRow label="Value" value={ability.effect.value} color="text-entity-damage" />}
      </Section>

      {ability.effect.statusEffect && (
        <Section title="Applies Effect">
          <div className="text-sm">
            <span className="text-purple-400">{ability.effect.statusEffect.name}</span>
            {ability.effect.statusEffectChance && ability.effect.statusEffectChance < 1 && (
              <span className="text-muted-foreground ml-2">({Math.round(ability.effect.statusEffectChance * 100)}% chance)</span>
            )}
          </div>
        </Section>
      )}

      {ability.narration && (
        <Section title="Cast">
          <p className="text-sm italic text-muted-foreground">{ability.narration}</p>
        </Section>
      )}
    </>
  )
}

function GenericDetail({ entity }: { entity: DisplayableEntity }) {
  const hasEntityType = "entityType" in entity
  return (
    <>
      {"description" in entity && entity.description && (
        <p className="text-sm text-muted-foreground mb-4">{entity.description}</p>
      )}

      <Section title="Properties">
        {hasEntityType && <StatRow label="Type" value={(entity as { entityType: string }).entityType} />}
        <StatRow label="ID" value={entity.id.slice(0, 8) + "..."} />
      </Section>
    </>
  )
}

// Main modal component
export function EntityDetailModal() {
  const { entity, isOpen, closeEntity } = useEntityModal()

  if (!entity) return null

  // Determine display type for styling
  const getDisplayType = (): EntityType | ItemRarity => {
    if (isItem(entity)) return entity.rarity
    if (isEnemyAbility(entity) || isCompanionAbility(entity)) return "ability"
    return (entity as { entityType: EntityType }).entityType
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeEntity()}>
      <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto bg-zinc-900/95 border-zinc-700">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <EntityText type={getDisplayType()} noAnimation className="text-xl">
              {entity.name}
            </EntityText>
          </DialogTitle>
          {"aiGenerated" in entity && entity.aiGenerated && (
            <DialogDescription className="text-xs text-muted-foreground">
              AI Generated
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="mt-2">
          {isItem(entity) && <ItemDetail item={entity} />}
          {isEnemy(entity) && <EnemyDetail enemy={entity} />}
          {isNPC(entity) && <NPCDetail npc={entity} />}
          {isTrap(entity) && <TrapDetail trap={entity} />}
          {isShrine(entity) && <ShrineDetail shrine={entity} />}
          {isStatusEffect(entity) && <StatusEffectDetail effect={entity} />}
          {isCompanion(entity) && <CompanionDetail companion={entity} />}
          {isBoss(entity) && <BossDetail boss={entity} />}
          {isAbility(entity) && <AbilityDetail ability={entity} />}
          {isEnemyAbility(entity) && <EnemyAbilityDetail ability={entity} />}
          {isCompanionAbility(entity) && <CompanionAbilityDetail ability={entity} />}
          {!isItem(entity) && !isEnemy(entity) && !isNPC(entity) && !isTrap(entity) &&
           !isShrine(entity) && !isStatusEffect(entity) && !isCompanion(entity) &&
           !isBoss(entity) && !isAbility(entity) && !isEnemyAbility(entity) &&
           !isCompanionAbility(entity) && <GenericDetail entity={entity} />}
        </div>
      </DialogContent>
    </Dialog>
  )
}
