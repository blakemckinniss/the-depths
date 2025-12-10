"use client"

import { useState } from "react"
import type { Player } from "@/lib/core/game-types"
import { EntityText } from "@/components/narrative/entity-text"
import { StatBar } from "@/components/character/stat-bar"
import { CLASSES } from "@/lib/character/ability-system"

interface TavernProps {
  player: Player
  onEnterDungeons: () => void
  onRestoreHealth: (cost: number, amount: number) => void
  onBuyKey: (keyRarity: "common" | "uncommon" | "rare") => void
}

export function Tavern({ player, onEnterDungeons, onRestoreHealth, onBuyKey }: TavernProps) {
  const [activeTab, setActiveTab] = useState<"main" | "healer" | "keysmith" | "party">("main")

  const healthMissing = player.stats.maxHealth - player.stats.health
  const healCostPerHp = 1
  const fullHealCost = healthMissing * healCostPerHp

  const keyPrices = {
    common: 25,
    uncommon: 75,
    rare: 200,
  }

  const classDef = player.class ? CLASSES[player.class] : null

  return (
    <div className="min-h-screen flex flex-col p-4 max-w-2xl mx-auto">
      {/* Tavern Header */}
      <div className="text-center py-6 space-y-2">
        <h1 className="text-2xl font-bold text-amber-400">The Rusted Flagon</h1>
        <p className="text-stone-500 text-sm">A haven between the depths</p>
      </div>

      {/* Player Summary */}
      <div className="bg-stone-800/30 rounded p-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <EntityText type="player">{player.name}</EntityText>
            {classDef && (
              <span className="text-stone-400 text-sm ml-2">
                Level {player.stats.level} {classDef.name}
              </span>
            )}
          </div>
          <div className="text-right">
            <EntityText type="gold">{player.stats.gold} Gold</EntityText>
          </div>
        </div>
        <StatBar
          current={player.stats.health}
          max={player.stats.maxHealth}
          label="Health"
          color="health"
        />
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 mb-6">
        {["main", "healer", "keysmith", "party"].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab as typeof activeTab)}
            className={`flex-1 py-2 px-3 text-sm rounded transition-colors ${
              activeTab === tab
                ? "bg-amber-900/40 text-amber-300"
                : "bg-stone-800/30 text-stone-400 hover:bg-stone-800/50"
            }`}
          >
            {tab === "main" && "Hall"}
            {tab === "healer" && "Healer"}
            {tab === "keysmith" && "Keysmith"}
            {tab === "party" && "Companions"}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1">
        {activeTab === "main" && (
          <div className="space-y-4">
            <div className="bg-stone-900/50 rounded p-4">
              <p className="text-stone-300 italic mb-4">
                &quot;The fire crackles warmly as adventurers share tales of the depths. A hooded figure in the corner eyes
                you knowingly...&quot;
              </p>

              <button
                onClick={onEnterDungeons}
                className="w-full py-4 bg-gradient-to-r from-amber-900/50 to-red-900/50 hover:from-amber-800/60 hover:to-red-800/60 text-amber-200 rounded font-medium transition-all"
              >
                Venture into the Dungeons
              </button>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-stone-800/30 p-3 rounded">
                <div className="text-stone-500 text-xs uppercase">Keys Held</div>
                <div className="text-lg text-cyan-400">{player.keys.length}</div>
              </div>
              <div className="bg-stone-800/30 p-3 rounded">
                <div className="text-stone-500 text-xs uppercase">Companions</div>
                <div className="text-lg text-teal-400">
                  {player.party.active.length}/{player.party.maxActive}
                </div>
              </div>
            </div>

            {/* Inventory Preview */}
            <div className="bg-stone-800/30 p-3 rounded">
              <div className="text-stone-500 text-xs uppercase mb-2">Equipment</div>
              <div className="space-y-1 text-sm">
                <div>
                  <span className="text-stone-500">Weapon: </span>
                  {player.equipment.weapon ? (
                    <EntityText type={player.equipment.weapon.rarity} entity={player.equipment.weapon}>{player.equipment.weapon.name}</EntityText>
                  ) : (
                    <span className="text-stone-600">None</span>
                  )}
                </div>
                <div>
                  <span className="text-stone-500">Armor: </span>
                  {player.equipment.armor ? (
                    <EntityText type={player.equipment.armor.rarity} entity={player.equipment.armor}>{player.equipment.armor.name}</EntityText>
                  ) : (
                    <span className="text-stone-600">None</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "healer" && (
          <div className="space-y-4">
            <div className="bg-stone-900/50 rounded p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-green-900/30 flex items-center justify-center text-2xl">
                  ✚
                </div>
                <div>
                  <EntityText type="npc">Sister Meridia</EntityText>
                  <p className="text-stone-500 text-sm">Temple Healer</p>
                </div>
              </div>
              <p className="text-stone-400 text-sm italic mb-4">&quot;The light shall mend what the darkness has torn...&quot;</p>
            </div>

            {healthMissing > 0 ? (
              <div className="space-y-3">
                <button
                  onClick={() => onRestoreHealth(Math.ceil(fullHealCost * 0.25), Math.ceil(healthMissing * 0.25))}
                  disabled={player.stats.gold < Math.ceil(fullHealCost * 0.25)}
                  className="w-full py-3 bg-green-900/30 hover:bg-green-800/40 text-green-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Light Healing (+{Math.ceil(healthMissing * 0.25)} HP) -{" "}
                  <EntityText type="gold">{Math.ceil(fullHealCost * 0.25)}g</EntityText>
                </button>

                <button
                  onClick={() => onRestoreHealth(Math.ceil(fullHealCost * 0.5), Math.ceil(healthMissing * 0.5))}
                  disabled={player.stats.gold < Math.ceil(fullHealCost * 0.5)}
                  className="w-full py-3 bg-green-900/40 hover:bg-green-800/50 text-green-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Greater Healing (+{Math.ceil(healthMissing * 0.5)} HP) -{" "}
                  <EntityText type="gold">{Math.ceil(fullHealCost * 0.5)}g</EntityText>
                </button>

                <button
                  onClick={() => onRestoreHealth(fullHealCost, healthMissing)}
                  disabled={player.stats.gold < fullHealCost}
                  className="w-full py-3 bg-green-900/50 hover:bg-green-800/60 text-green-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Full Restoration (+{healthMissing} HP) - <EntityText type="gold">{fullHealCost}g</EntityText>
                </button>
              </div>
            ) : (
              <div className="text-center py-8 text-green-400">&quot;You are in perfect health, adventurer.&quot;</div>
            )}
          </div>
        )}

        {activeTab === "keysmith" && (
          <div className="space-y-4">
            <div className="bg-stone-900/50 rounded p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-cyan-900/30 flex items-center justify-center text-2xl">🗝️</div>
                <div>
                  <EntityText type="npc">Korvin the Keysmith</EntityText>
                  <p className="text-stone-500 text-sm">Master of Locks</p>
                </div>
              </div>
              <p className="text-stone-400 text-sm italic mb-4">
                &quot;Every door holds secrets. The right key reveals the right treasure...&quot;
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => onBuyKey("common")}
                disabled={player.stats.gold < keyPrices.common}
                className="w-full py-3 bg-stone-700/40 hover:bg-stone-600/50 text-stone-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between px-4"
              >
                <span>Bronze Key</span>
                <EntityText type="gold">{keyPrices.common}g</EntityText>
              </button>

              <button
                onClick={() => onBuyKey("uncommon")}
                disabled={player.stats.gold < keyPrices.uncommon}
                className="w-full py-3 bg-cyan-900/30 hover:bg-cyan-800/40 text-cyan-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between px-4"
              >
                <span>Silver Key</span>
                <EntityText type="gold">{keyPrices.uncommon}g</EntityText>
              </button>

              <button
                onClick={() => onBuyKey("rare")}
                disabled={player.stats.gold < keyPrices.rare}
                className="w-full py-3 bg-violet-900/30 hover:bg-violet-800/40 text-violet-300 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between px-4"
              >
                <span>Golden Key</span>
                <EntityText type="gold">{keyPrices.rare}g</EntityText>
              </button>
            </div>

            {/* Current Keys */}
            <div className="bg-stone-800/30 rounded p-3 mt-4">
              <div className="text-stone-500 text-xs uppercase mb-2">Your Keys</div>
              <div className="flex flex-wrap gap-2">
                {player.keys.map((key) => (
                  <span
                    key={key.id}
                    className={`text-xs px-2 py-1 rounded ${
                      key.rarity === "master"
                        ? "bg-stone-700/50 text-stone-300"
                        : key.rarity === "legendary"
                          ? "bg-amber-900/40 text-amber-300"
                          : key.rarity === "rare"
                            ? "bg-violet-900/40 text-violet-300"
                            : key.rarity === "uncommon"
                              ? "bg-cyan-900/40 text-cyan-300"
                              : "bg-stone-700/40 text-stone-400"
                    }`}
                  >
                    {key.name}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}

        {activeTab === "party" && (
          <div className="space-y-4">
            <div className="bg-stone-900/50 rounded p-4">
              <p className="text-stone-400 text-sm italic">
                &quot;Your companions rest here, awaiting your call to adventure...&quot;
              </p>
            </div>

            {/* Active Party */}
            <div className="bg-stone-800/30 rounded p-3">
              <div className="text-stone-500 text-xs uppercase mb-2">
                Active Party ({player.party.active.length}/{player.party.maxActive})
              </div>
              {player.party.active.length > 0 ? (
                <div className="space-y-2">
                  {player.party.active.map((companion) => (
                    <div key={companion.id} className="flex items-center justify-between p-2 bg-stone-900/50 rounded">
                      <div>
                        <EntityText type="companion" entity={companion}>{companion.name}</EntityText>
                        <span className="text-stone-500 text-xs ml-2">{companion.species}</span>
                      </div>
                      <StatBar
                        label=""
                        current={companion.stats.health}
                        max={companion.stats.maxHealth}
                        color="health"
                        compact
                      />
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-stone-600 text-sm">No active companions</p>
              )}
            </div>

            {/* Reserve */}
            {player.party.reserve.length > 0 && (
              <div className="bg-stone-800/30 rounded p-3">
                <div className="text-stone-500 text-xs uppercase mb-2">Reserve ({player.party.reserve.length})</div>
                <div className="space-y-2">
                  {player.party.reserve.map((companion) => (
                    <div
                      key={companion.id}
                      className="flex items-center justify-between p-2 bg-stone-900/30 rounded opacity-70"
                    >
                      <div>
                        <EntityText type="companion" entity={companion}>{companion.name}</EntityText>
                        <span className="text-stone-500 text-xs ml-2">{companion.species}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Graveyard */}
            {player.party.graveyard.length > 0 && (
              <div className="bg-red-900/10 rounded p-3">
                <div className="text-red-400/70 text-xs uppercase mb-2">Fallen ({player.party.graveyard.length})</div>
                <div className="flex flex-wrap gap-2">
                  {player.party.graveyard.map((companion) => (
                    <span key={companion.id} className="text-xs text-red-400/50 line-through">
                      {companion.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
