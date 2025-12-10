"use client"

import { useState } from "react"
import type { Player, Item, MapItem, CraftingCurrency, MapTier } from "@/lib/core/game-types"
import type { AlchemyResult } from "@/lib/ai/ai-alchemy-system"
import type { EssenceCraftRecipe } from "@/lib/items/transmogrification-system"
import { EntityText } from "@/components/narrative/entity-text"
import { StatBar } from "@/components/character/stat-bar"
import { CLASSES, canLevelUpAbility, getAbilityLevelUpCost, ABILITY_LEVEL_CONFIG, getAbilityLevelMultiplier } from "@/lib/character/ability-system"
import { AlchemyWorkbench } from "@/components/encounters/alchemy-workbench"
import { TransmogMenu } from "@/components/encounters/transmog-menu"

interface TavernProps {
  player: Player
  floor: number
  onEnterDungeons: () => void
  onRestoreHealth: (cost: number, amount: number) => void
  onBuyKey: (keyRarity: "common" | "uncommon" | "rare") => void
  onBuyMap?: (tier: MapTier, price: number) => void
  onBuyCurrency?: (currencyId: string, price: number) => void
  onActivateMap?: (map: MapItem) => void
  onApplyCurrency?: (currency: CraftingCurrency, map: MapItem) => void
  onLevelUpAbility?: (abilityId: string) => void
  onTransmogrify?: (itemIds: string[], narrations: string[]) => void
  onCraftFromEssence?: (recipe: EssenceCraftRecipe, result: Item | null) => void
  onAlchemyExperiment?: (result: AlchemyResult | null, materialsUsed: string[]) => void
}

type TavernTab = "maps" | "services" | "training" | "crafting"

export function Tavern({ player, floor, onRestoreHealth, onBuyMap, onBuyCurrency, onActivateMap, onApplyCurrency, onLevelUpAbility, onTransmogrify, onCraftFromEssence, onAlchemyExperiment }: TavernProps) {
  const [activeTab, setActiveTab] = useState<TavernTab>("maps")
  const [selectedMap, setSelectedMap] = useState<MapItem | null>(null)
  const [servicesSection, setServicesSection] = useState<"healer" | "party">("healer")
  const [craftingSection, setCraftingSection] = useState<"alchemy" | "altar">("alchemy")

  const playerMaps = player.inventory.filter(
    (item): item is MapItem => item.category === "consumable" && item.subtype === "map"
  )

  const playerCurrencies = player.inventory.filter(
    (item): item is CraftingCurrency => item.category === "currency"
  )

  const healthMissing = player.stats.maxHealth - player.stats.health
  const healCost = healthMissing * 1
  const classDef = player.class ? CLASSES[player.class] : null

  const tabs: { id: TavernTab; label: string; icon: string }[] = [
    { id: "maps", label: "Maps", icon: "🗺️" },
    { id: "services", label: "Services", icon: "✚" },
    { id: "training", label: "Training", icon: "⚔" },
    { id: "crafting", label: "Crafting", icon: "⚗️" },
  ]

  return (
    <div className="min-h-screen flex flex-col p-4 max-w-2xl mx-auto">
      {/* Header with Player Info */}
      <div className="bg-gradient-to-r from-stone-800/50 to-stone-900/50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-900/40 flex items-center justify-center text-lg">🍺</div>
            <div>
              <h1 className="text-amber-400 font-semibold">The Rusted Flagon</h1>
              <p className="text-stone-500 text-xs">A haven between the depths</p>
            </div>
          </div>
          <div className="text-right">
            <EntityText type="gold" className="text-lg">{player.stats.gold}</EntityText>
            <div className="text-stone-500 text-xs">gold</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <EntityText type="player" className="text-sm">{player.name}</EntityText>
              {classDef && <span className="text-stone-500 text-xs">L{player.stats.level} {classDef.name}</span>}
            </div>
            <StatBar current={player.stats.health} max={player.stats.maxHealth} label="" color="health" compact />
          </div>
          <div className="text-right text-xs">
            <div className="text-purple-400">{playerMaps.length} maps</div>
            <div className="text-teal-400">{player.party.active.length}/{player.party.maxActive} party</div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 mb-4 bg-stone-900/30 rounded-lg p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 py-2.5 px-3 rounded-md text-sm font-medium transition-all flex items-center justify-center gap-2 ${
              activeTab === tab.id
                ? "bg-amber-900/50 text-amber-300 shadow-lg"
                : "text-stone-400 hover:text-stone-300 hover:bg-stone-800/30"
            }`}
          >
            <span>{tab.icon}</span>
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {/* === MAPS TAB === */}
        {activeTab === "maps" && (
          <div className="space-y-4">
            {/* Map Selection / Portal */}
            <div className="bg-stone-900/40 rounded-lg border border-stone-700/30">
              <div className="p-4 border-b border-stone-700/30">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⚡</span>
                    <div>
                      <div className="text-amber-300 font-medium">Map Device</div>
                      <div className="text-stone-500 text-xs">Select a map to enter the dungeon</div>
                    </div>
                  </div>
                  {selectedMap && (
                    <button
                      onClick={() => {
                        onActivateMap?.(selectedMap)
                        setSelectedMap(null)
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-md font-medium text-sm transition-colors"
                    >
                      Enter Portal
                    </button>
                  )}
                </div>
              </div>

              {playerMaps.length > 0 ? (
                <div className="p-2 max-h-64 overflow-y-auto">
                  <div className="grid gap-2">
                    {playerMaps.map((map) => {
                      const isSelected = selectedMap?.id === map.id
                      const rarityColor = map.rarity === "legendary" ? "border-amber-500 bg-amber-900/20" :
                                          map.rarity === "rare" ? "border-yellow-500 bg-yellow-900/20" :
                                          map.rarity === "uncommon" ? "border-cyan-500 bg-cyan-900/20" :
                                          "border-stone-600 bg-stone-800/30"
                      return (
                        <button
                          key={map.id}
                          onClick={() => setSelectedMap(isSelected ? null : map)}
                          className={`w-full p-3 rounded-lg border-2 text-left transition-all ${
                            isSelected ? "border-amber-400 bg-amber-900/30 ring-2 ring-amber-400/20" : rarityColor + " hover:brightness-110"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs px-1.5 py-0.5 rounded font-mono font-bold ${
                                map.mapProps.tier >= 8 ? "bg-red-900/50 text-red-300" :
                                map.mapProps.tier >= 5 ? "bg-orange-900/50 text-orange-300" :
                                "bg-stone-700/50 text-stone-300"
                              }`}>T{map.mapProps.tier}</span>
                              <span className={`font-medium ${
                                map.rarity === "legendary" ? "text-amber-400" :
                                map.rarity === "rare" ? "text-yellow-400" :
                                map.rarity === "uncommon" ? "text-cyan-400" :
                                "text-stone-300"
                              }`}>
                                {map.mapProps.theme}
                              </span>
                            </div>
                            <span className="text-stone-500 text-xs">{map.mapProps.floors}F</span>
                          </div>
                          {map.mapProps.modifiers.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {map.mapProps.modifiers.map((mod) => (
                                <span key={mod.id} className="text-[10px] px-1.5 py-0.5 rounded bg-red-900/40 text-red-300" title={mod.description}>
                                  {mod.name}
                                </span>
                              ))}
                            </div>
                          )}
                          {map.mapProps.quality > 0 && (
                            <div className="text-[10px] text-cyan-400 mt-1">+{map.mapProps.quality}% quality</div>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center">
                  <div className="text-stone-500 mb-2">No maps available</div>
                  <div className="text-stone-600 text-xs">Purchase maps below or find them in dungeons</div>
                </div>
              )}
            </div>

            {/* Buy Maps */}
            <div className="bg-stone-900/40 rounded-lg border border-stone-700/30">
              <div className="p-3 border-b border-stone-700/30 flex items-center gap-2">
                <span>🗺️</span>
                <span className="text-stone-300 text-sm font-medium">Cartographer Theron</span>
              </div>
              <div className="p-3 grid grid-cols-3 gap-2">
                {[
                  { tier: 1 as MapTier, price: 20 },
                  { tier: 2 as MapTier, price: 50 },
                  { tier: 3 as MapTier, price: 100 },
                ].map(({ tier, price }) => (
                  <button
                    key={tier}
                    onClick={() => onBuyMap?.(tier, price)}
                    disabled={player.stats.gold < price || !onBuyMap}
                    className="py-3 bg-stone-800/50 hover:bg-stone-700/50 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="text-stone-300 font-medium">T{tier} Map</div>
                    <div className="text-amber-400 text-xs">{price}g</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Crafting Orbs */}
            <div className="bg-stone-900/40 rounded-lg border border-stone-700/30">
              <div className="p-3 border-b border-stone-700/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span>💠</span>
                  <span className="text-stone-300 text-sm font-medium">Crafting Orbs</span>
                </div>
                {playerCurrencies.length > 0 && (
                  <div className="flex gap-1">
                    {playerCurrencies.slice(0, 4).map((c) => (
                      <span key={c.id} className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900/30 text-purple-300">
                        {c.name.replace("Orb of ", "").slice(0, 4)} x{c.stackSize || 1}
                      </span>
                    ))}
                    {playerCurrencies.length > 4 && <span className="text-stone-500 text-xs">+{playerCurrencies.length - 4}</span>}
                  </div>
                )}
              </div>
              <div className="p-3 grid grid-cols-4 gap-2">
                {[
                  { id: "orb_transmutation", name: "Trans", price: 5, color: "stone" },
                  { id: "orb_alteration", name: "Alter", price: 8, color: "stone" },
                  { id: "orb_alchemy", name: "Alch", price: 25, color: "cyan" },
                  { id: "orb_chaos", name: "Chaos", price: 50, color: "purple" },
                ].map((orb) => (
                  <button
                    key={orb.id}
                    onClick={() => onBuyCurrency?.(orb.id, orb.price)}
                    disabled={player.stats.gold < orb.price || !onBuyCurrency}
                    className={`py-2 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                      orb.color === "cyan" ? "bg-cyan-900/30 hover:bg-cyan-800/40 text-cyan-300" :
                      orb.color === "purple" ? "bg-purple-900/30 hover:bg-purple-800/40 text-purple-300" :
                      "bg-stone-800/50 hover:bg-stone-700/50 text-stone-300"
                    }`}
                  >
                    <div className="text-xs font-medium">{orb.name}</div>
                    <div className="text-[10px] text-amber-400">{orb.price}g</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* === SERVICES TAB === */}
        {activeTab === "services" && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setServicesSection("healer")}
                className={`flex-1 py-2 rounded-md text-sm transition-colors ${
                  servicesSection === "healer" ? "bg-green-900/40 text-green-300" : "bg-stone-800/30 text-stone-400"
                }`}
              >✚ Healer</button>
              <button
                onClick={() => setServicesSection("party")}
                className={`flex-1 py-2 rounded-md text-sm transition-colors ${
                  servicesSection === "party" ? "bg-teal-900/40 text-teal-300" : "bg-stone-800/30 text-stone-400"
                }`}
              >👥 Companions</button>
            </div>

            {servicesSection === "healer" && (
              <div className="bg-stone-900/40 rounded-lg border border-stone-700/30 p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-green-900/30 flex items-center justify-center text-xl">✚</div>
                  <div>
                    <div className="text-green-300 font-medium">Sister Meridia</div>
                    <div className="text-stone-500 text-xs italic">"The light shall mend..."</div>
                  </div>
                </div>

                {healthMissing > 0 ? (
                  <div className="space-y-2">
                    {[
                      { pct: 0.25, label: "Light" },
                      { pct: 0.5, label: "Greater" },
                      { pct: 1, label: "Full" },
                    ].map(({ pct, label }) => {
                      const hp = Math.ceil(healthMissing * pct)
                      const cost = Math.ceil(healCost * pct)
                      return (
                        <button
                          key={pct}
                          onClick={() => onRestoreHealth(cost, hp)}
                          disabled={player.stats.gold < cost}
                          className="w-full py-2.5 bg-green-900/30 hover:bg-green-800/40 text-green-300 rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-between px-4"
                        >
                          <span>{label} Healing <span className="text-green-400/70">+{hp} HP</span></span>
                          <span className="text-amber-400">{cost}g</span>
                        </button>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-4 text-green-400 text-sm">"You are in perfect health."</div>
                )}
              </div>
            )}

            {servicesSection === "party" && (
              <div className="space-y-3">
                <div className="bg-stone-900/40 rounded-lg border border-stone-700/30 p-4">
                  <div className="text-stone-500 text-xs uppercase mb-2">Active Party ({player.party.active.length}/{player.party.maxActive})</div>
                  {player.party.active.length > 0 ? (
                    <div className="space-y-2">
                      {player.party.active.map((c) => (
                        <div key={c.id} className="flex items-center justify-between p-2 bg-stone-800/30 rounded">
                          <div>
                            <EntityText type="companion" entity={c} className="text-sm">{c.name}</EntityText>
                            <span className="text-stone-500 text-xs ml-2">{c.species}</span>
                          </div>
                          <div className="w-24">
                            <StatBar label="" current={c.stats.health} max={c.stats.maxHealth} color="health" compact />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-stone-600 text-sm">No active companions</div>
                  )}
                </div>

                {player.party.reserve.length > 0 && (
                  <div className="bg-stone-800/30 rounded-lg p-3">
                    <div className="text-stone-500 text-xs uppercase mb-2">Reserve ({player.party.reserve.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {player.party.reserve.map((c) => (
                        <span key={c.id} className="text-xs px-2 py-1 bg-stone-900/50 rounded text-stone-400">{c.name}</span>
                      ))}
                    </div>
                  </div>
                )}

                {player.party.graveyard.length > 0 && (
                  <div className="bg-red-900/10 rounded-lg p-3">
                    <div className="text-red-400/70 text-xs uppercase mb-2">Fallen ({player.party.graveyard.length})</div>
                    <div className="flex flex-wrap gap-2">
                      {player.party.graveyard.map((c) => (
                        <span key={c.id} className="text-xs text-red-400/50 line-through">{c.name}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* === TRAINING TAB === */}
        {activeTab === "training" && (
          <div className="space-y-4">
            <div className="bg-stone-900/40 rounded-lg border border-stone-700/30 p-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-900/30 flex items-center justify-center text-xl">⚔</div>
                <div>
                  <div className="text-amber-300 font-medium">Gregor the Battlemaster</div>
                  <div className="text-stone-500 text-xs italic">"Gold buys power..."</div>
                </div>
              </div>

              {player.abilities.length > 0 ? (
                <div className="space-y-3">
                  {player.abilities.map((ability) => {
                    const level = ability.level || 1
                    const maxLevel = ability.maxLevel || ABILITY_LEVEL_CONFIG.maxLevel
                    const cost = getAbilityLevelUpCost(ability)
                    const check = canLevelUpAbility(player, ability.id)
                    const isMaxed = level >= maxLevel
                    const mult = getAbilityLevelMultiplier(ability)
                    const currentDmg = ability.baseDamage ? Math.floor(ability.baseDamage * mult) : null
                    const currentHeal = ability.baseHealing ? Math.floor(ability.baseHealing * mult) : null

                    return (
                      <div key={ability.id} className="bg-stone-800/30 rounded-md p-3">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <span className="text-stone-300 font-medium">{ability.name}</span>
                            <span className="text-stone-500 text-xs">L{level}/{maxLevel}</span>
                          </div>
                          <div className="flex gap-2 text-xs">
                            {currentDmg && <span className="text-red-400">{currentDmg} dmg</span>}
                            {currentHeal && <span className="text-green-400">{currentHeal} heal</span>}
                          </div>
                        </div>
                        <div className="flex gap-0.5 mb-2">
                          {Array.from({ length: maxLevel }).map((_, i) => (
                            <div key={i} className={`h-1 flex-1 rounded ${i < level ? "bg-amber-500" : "bg-stone-700"}`} />
                          ))}
                        </div>
                        {isMaxed ? (
                          <div className="text-center text-stone-500 text-xs">Mastered</div>
                        ) : (
                          <button
                            onClick={() => onLevelUpAbility?.(ability.id)}
                            disabled={!check.canLevel || !onLevelUpAbility}
                            className="w-full py-2 bg-amber-900/30 hover:bg-amber-800/40 text-amber-300 rounded text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                          >
                            Level Up • <span className="text-amber-400">{cost}g</span>
                          </button>
                        )}
                        {!check.canLevel && !isMaxed && check.reason && (
                          <div className="text-red-400/70 text-xs text-center mt-1">{check.reason}</div>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <div className="text-center py-4 text-stone-500">"Choose a class first."</div>
              )}
            </div>

            <div className="bg-stone-800/20 rounded-md p-3 text-xs text-stone-500">
              <div className="font-medium mb-1">Training Info</div>
              <div>• Each level: +{Math.round(ABILITY_LEVEL_CONFIG.damageScalePerLevel * 100)}% power</div>
              <div>• Max level: {ABILITY_LEVEL_CONFIG.maxLevel}</div>
            </div>
          </div>
        )}

        {/* === CRAFTING TAB === */}
        {activeTab === "crafting" && (
          <div className="space-y-4">
            {/* Sub-tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setCraftingSection("alchemy")}
                className={`flex-1 py-2 rounded-md text-sm transition-colors ${
                  craftingSection === "alchemy" ? "bg-purple-900/40 text-purple-300" : "bg-stone-800/30 text-stone-400"
                }`}
              >⚗️ Alchemy</button>
              <button
                onClick={() => setCraftingSection("altar")}
                className={`flex-1 py-2 rounded-md text-sm transition-colors ${
                  craftingSection === "altar" ? "bg-violet-900/40 text-violet-300" : "bg-stone-800/30 text-stone-400"
                }`}
              >✨ Altar</button>
            </div>

            {craftingSection === "alchemy" && (
              <div className="bg-stone-900/40 rounded-lg border border-stone-700/30 p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-purple-900/30 flex items-center justify-center text-xl">⚗️</div>
                  <div>
                    <div className="text-purple-300 font-medium">Vesper the Alchemist</div>
                    <div className="text-stone-500 text-xs italic">"Essence reshaped..."</div>
                  </div>
                </div>

                {player.materials.length > 0 ? (
                  <AlchemyWorkbench
                    player={player}
                    floor={floor}
                    materials={player.materials}
                    onExperimentComplete={(result, materialsUsed) => {
                      onAlchemyExperiment?.(result, materialsUsed)
                    }}
                  />
                ) : (
                  <div className="text-center py-4 text-stone-500 text-sm">
                    Gather materials from dungeons to experiment.
                  </div>
                )}
              </div>
            )}

            {craftingSection === "altar" && (
              <div className="bg-stone-900/40 rounded-lg border border-stone-700/30 p-4">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-violet-900/30 flex items-center justify-center text-xl">✨</div>
                  <div>
                    <div className="text-violet-300 font-medium">Transmog Altar</div>
                    <div className="text-stone-500 text-xs italic">"Sacrifice for power..."</div>
                  </div>
                </div>

                <TransmogMenu
                  player={player}
                  onTransmogrify={(itemIds, narrations) => onTransmogrify?.(itemIds, narrations)}
                  onCraftFromEssence={(recipe, result) => onCraftFromEssence?.(recipe, result)}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
