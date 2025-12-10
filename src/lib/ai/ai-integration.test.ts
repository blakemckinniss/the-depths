/**
 * AI Integration Tests
 * Tests for AI-powered features with mocked LLM responses
 * Uses Full Mock approach: deterministic tests, no API costs
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  itemSchema,
  enemySchema,
  npcSchema,
  trapSchema,
  shrineSchema,
  bossSchema,
  companionSchema,
  roomNarrationSchema,
  combatNarrationSchema,
  roomEventSchema,
  combatRoundSchema,
  victorySchema,
  environmentalEntitySchema,
} from "./ai-schemas";

// =============================================================================
// MOCK RESPONSE FIXTURES
// =============================================================================

/**
 * Pre-recorded mock responses that match AI schema structures
 * These provide deterministic test data without API calls
 */
const MOCK_RESPONSES = {
  item: {
    name: "Shadowbane Dagger",
    description: "A curved blade that drinks in ambient light, its edge always cold to touch",
    lore: "Forged from the fang of a shadow wyrm that plagued the deep roads",
    useText: "The blade pulses with hungry darkness as you strike",
  },

  enemy: {
    name: "Hollow Knight",
    description: "An animated suit of rusted armor, empty but for the malevolent whispers echoing within",
    abilities: ["Shield Bash", "Spectral Strike"],
    weakness: "Holy damage shatters its binding",
    lastWords: "At last... release...",
  },

  npc: {
    name: "Mira the Wanderer",
    personality: "cautious, weary, hopeful",
    greeting: "Another living soul? I'd nearly given up hope of finding one in these depths",
    backstory: "A scholar who came seeking forbidden knowledge, only to become trapped",
    motivation: "Seeks safe passage to the surface and will trade secrets for protection",
  },

  trap: {
    name: "Pressure Plate Crusher",
    description: "Worn flagstones with a suspicious groove running across the ceiling above",
    triggerDescription: "A grinding roar as massive stone blocks descend from hidden compartments",
    disarmHint: "The mechanism seems to connect to that loose brick in the wall",
  },

  shrine: {
    name: "Altar of the Forgotten",
    description: "A cracked stone altar covered in melted candle wax, surrounded by scattered offerings",
    offeringPrompt: "The air grows thick with expectation, as if waiting for tribute",
    blessingDescription: "Those who honor the forgotten receive clarity in darkness",
    curseWarning: "Greed before this altar has turned many to stone",
  },

  boss: {
    name: "Vorn the Undying",
    title: "Keeper of the Crimson Gate",
    description:
      "A towering figure of bone and sinew, held together by chains of dark energy. Red light pulses from the hollow of its chest where a heart should be.",
    introDialogue: "You come to my domain seeking death? I shall grant it a thousand times over.",
    phaseTransitions: [
      "The chains binding Vorn snap as its form convulses with power!",
      "A howl echoes through the chamber as Vorn draws strength from the fallen!",
    ],
    deathDialogue: "The gate... will never... close...",
    specialAbility: "Soul Rend - tears at the essence of the living",
  },

  companion: {
    name: "Grix",
    appearance: "A scarred goblin with surprisingly intelligent eyes and mismatched armor",
    personality: "cunning, loyal, pragmatic",
    backstory: "Exiled from his tribe for refusing to eat prisoners, now seeks redemption through service",
    combatStyle: "Uses dirty tricks and flanking attacks, surprisingly effective against larger foes",
    loyaltyQuote: "Grix not run. Grix stay. You first not-hit Grix. Grix remember.",
    betrayalHint: "Sometimes catches him staring at your gold pouch a moment too long",
    deathQuote: "Tell... tribe... Grix was... good...",
  },

  roomNarration: {
    description: "The corridor opens into a vaulted chamber, dust motes dancing in shafts of pale light",
    entityIntro: "Something stirs in the darkness beyond the light's reach",
    environmentalDetail: "The smell of old stone and something else - copper, perhaps blood",
    foreshadowing: "Scratch marks on the walls suggest something large passed through recently",
  },

  combatNarration: {
    attackDescription: "You lunge forward, blade cutting an arc through the musty air",
    impactDescription: "Steel bites into rotted flesh with a sickening crunch",
    victimReaction: "The creature staggers back, black ichor weeping from the wound",
  },

  roomEvent: {
    roomDescription:
      "A {entity:Ancient Forge:mechanism:fire,metal,tool} dominates this smoke-stained chamber",
    ambiance: "The distant drip of water echoes from somewhere in the darkness",
    entityType: "enemy" as const,
    environmentalEntities: [
      {
        name: "Ancient Forge",
        class: "mechanism" as const,
        tags: ["fire", "metal", "tool"],
        description: "A dormant forge of dwarven make, cold but potentially functional",
        capabilityRelevance: {
          utilityType: "light" as const,
          itemTag: "tinderbox",
          hint: "Could be relit to provide warmth and crafting capability",
        },
      },
    ],
    enemy: {
      name: "Forge Guardian",
      description: "A construct of brass and iron, joints glowing with residual heat",
      tier: "standard" as const,
      abilities: ["Molten Spray", "Iron Grip"],
      weakness: "Water and cold cause its mechanisms to seize",
      battleCry: "INTRUDER DETECTED. INITIATING ELIMINATION PROTOCOL.",
      deathCry: "SYSTEM... FAILURE...",
    },
    foreshadow: "The forge's tools could prove useful if you survive",
    capabilityOpportunities: [
      {
        situation: "The forge's pilot light has gone out",
        utilityTypes: ["light" as const],
        outcomeHint: "Relighting it could activate dormant defenses",
      },
    ],
  },

  combatRound: {
    playerAttack: {
      narration: "You feint left then drive your blade toward the creature's core",
      impact: "The strike connects, carving a deep furrow in corrupted flesh",
      enemyReaction: "It shrieks, stumbling back with inhuman rage in its eyes",
    },
    enemyAttack: {
      narration: "Claws slash in a wild arc, seeking your throat",
      impact: "You barely deflect, the force numbing your arm",
      taunt: "Your flesh is WEAK, mortal!",
    },
    battleMomentum: "stalemate" as const,
    tensionNote: "The creature's wounds begin to knit together with sickening speed",
  },

  victory: {
    deathBlow: "Your blade finds the heart, driving deep with finality",
    enemyDeath: "The creature crumbles, its unholy animation finally ended",
    aftermath: "Silence settles over the chamber, broken only by your ragged breathing",
    lootReveal: {
      discovery: "Something glints among the remains",
    },
  },
};

// =============================================================================
// SCHEMA VALIDATION TESTS
// =============================================================================

describe("AI Schema Validation", () => {
  describe("itemSchema", () => {
    it("should validate correct item structure", () => {
      const result = itemSchema.safeParse(MOCK_RESPONSES.item);
      expect(result.success).toBe(true);
    });

    it("should reject missing required fields", () => {
      const result = itemSchema.safeParse({ name: "Test" });
      expect(result.success).toBe(false);
    });

    it("should accept null useText", () => {
      const item = { ...MOCK_RESPONSES.item, useText: null };
      const result = itemSchema.safeParse(item);
      expect(result.success).toBe(true);
    });
  });

  describe("enemySchema", () => {
    it("should validate correct enemy structure", () => {
      const result = enemySchema.safeParse(MOCK_RESPONSES.enemy);
      expect(result.success).toBe(true);
    });

    it("should require abilities array", () => {
      const { abilities, ...incomplete } = MOCK_RESPONSES.enemy;
      const result = enemySchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });

    it("should accept optional weakness and lastWords", () => {
      const enemy = {
        name: "Simple Enemy",
        description: "A basic foe",
        abilities: ["Attack"],
      };
      const result = enemySchema.safeParse(enemy);
      expect(result.success).toBe(true);
    });
  });

  describe("npcSchema", () => {
    it("should validate correct NPC structure", () => {
      const result = npcSchema.safeParse(MOCK_RESPONSES.npc);
      expect(result.success).toBe(true);
    });
  });

  describe("trapSchema", () => {
    it("should validate correct trap structure", () => {
      const result = trapSchema.safeParse(MOCK_RESPONSES.trap);
      expect(result.success).toBe(true);
    });
  });

  describe("shrineSchema", () => {
    it("should validate correct shrine structure", () => {
      const result = shrineSchema.safeParse(MOCK_RESPONSES.shrine);
      expect(result.success).toBe(true);
    });
  });

  describe("bossSchema", () => {
    it("should validate correct boss structure", () => {
      const result = bossSchema.safeParse(MOCK_RESPONSES.boss);
      expect(result.success).toBe(true);
    });

    it("should require phaseTransitions array", () => {
      const { phaseTransitions, ...incomplete } = MOCK_RESPONSES.boss;
      const result = bossSchema.safeParse(incomplete);
      expect(result.success).toBe(false);
    });
  });

  describe("companionSchema", () => {
    it("should validate correct companion structure", () => {
      const result = companionSchema.safeParse(MOCK_RESPONSES.companion);
      expect(result.success).toBe(true);
    });

    it("should accept optional betrayalHint", () => {
      const companion = { ...MOCK_RESPONSES.companion, betrayalHint: null };
      const result = companionSchema.safeParse(companion);
      expect(result.success).toBe(true);
    });
  });

  describe("roomNarrationSchema", () => {
    it("should validate correct room narration", () => {
      const result = roomNarrationSchema.safeParse(MOCK_RESPONSES.roomNarration);
      expect(result.success).toBe(true);
    });
  });

  describe("combatNarrationSchema", () => {
    it("should validate correct combat narration", () => {
      const result = combatNarrationSchema.safeParse(MOCK_RESPONSES.combatNarration);
      expect(result.success).toBe(true);
    });
  });

  describe("roomEventSchema", () => {
    it("should validate full room event", () => {
      const result = roomEventSchema.safeParse(MOCK_RESPONSES.roomEvent);
      expect(result.success).toBe(true);
    });

    it("should validate empty room event", () => {
      const emptyRoom = {
        roomDescription: "An empty chamber",
        ambiance: "Silence",
        entityType: "empty" as const,
      };
      const result = roomEventSchema.safeParse(emptyRoom);
      expect(result.success).toBe(true);
    });

    it("should validate entity type enum", () => {
      const validTypes = ["enemy", "treasure", "trap", "shrine", "npc", "empty", "boss"];
      for (const entityType of validTypes) {
        const event = {
          roomDescription: "Test room",
          ambiance: "Test ambiance",
          entityType,
        };
        const result = roomEventSchema.safeParse(event);
        expect(result.success, `entityType ${entityType} should be valid`).toBe(true);
      }
    });
  });

  describe("combatRoundSchema", () => {
    it("should validate correct combat round", () => {
      const result = combatRoundSchema.safeParse(MOCK_RESPONSES.combatRound);
      expect(result.success).toBe(true);
    });

    it("should validate momentum enum values", () => {
      const validMomentums = ["player_advantage", "enemy_advantage", "stalemate", "desperate"];
      for (const momentum of validMomentums) {
        const round = {
          ...MOCK_RESPONSES.combatRound,
          battleMomentum: momentum,
        };
        const result = combatRoundSchema.safeParse(round);
        expect(result.success, `momentum ${momentum} should be valid`).toBe(true);
      }
    });
  });

  describe("environmentalEntitySchema", () => {
    it("should validate environmental entity", () => {
      const entity = MOCK_RESPONSES.roomEvent.environmentalEntities![0];
      const result = environmentalEntitySchema.safeParse(entity);
      expect(result.success).toBe(true);
    });

    it("should validate entity class enum", () => {
      const validClasses = [
        "object",
        "substance",
        "creature",
        "mechanism",
        "magical",
        "corpse",
        "container",
      ];
      for (const entityClass of validClasses) {
        const entity = {
          name: "Test",
          class: entityClass,
          tags: ["test"],
          description: "Test entity",
        };
        const result = environmentalEntitySchema.safeParse(entity);
        expect(result.success, `class ${entityClass} should be valid`).toBe(true);
      }
    });
  });
});

// =============================================================================
// MOCK RESPONSE INTEGRITY TESTS
// =============================================================================

describe("Mock Response Integrity", () => {
  it("all mock responses should be valid against their schemas", () => {
    expect(itemSchema.safeParse(MOCK_RESPONSES.item).success).toBe(true);
    expect(enemySchema.safeParse(MOCK_RESPONSES.enemy).success).toBe(true);
    expect(npcSchema.safeParse(MOCK_RESPONSES.npc).success).toBe(true);
    expect(trapSchema.safeParse(MOCK_RESPONSES.trap).success).toBe(true);
    expect(shrineSchema.safeParse(MOCK_RESPONSES.shrine).success).toBe(true);
    expect(bossSchema.safeParse(MOCK_RESPONSES.boss).success).toBe(true);
    expect(companionSchema.safeParse(MOCK_RESPONSES.companion).success).toBe(true);
    expect(roomNarrationSchema.safeParse(MOCK_RESPONSES.roomNarration).success).toBe(true);
    expect(combatNarrationSchema.safeParse(MOCK_RESPONSES.combatNarration).success).toBe(true);
    expect(roomEventSchema.safeParse(MOCK_RESPONSES.roomEvent).success).toBe(true);
    expect(combatRoundSchema.safeParse(MOCK_RESPONSES.combatRound).success).toBe(true);
  });

  it("mock responses should contain expected narrative quality", () => {
    // Item should have atmospheric description
    expect(MOCK_RESPONSES.item.description.length).toBeGreaterThan(20);
    expect(MOCK_RESPONSES.item.lore.length).toBeGreaterThan(10);

    // Enemy should have multiple abilities
    expect(MOCK_RESPONSES.enemy.abilities.length).toBeGreaterThanOrEqual(1);

    // Boss should have phase transitions
    expect(MOCK_RESPONSES.boss.phaseTransitions.length).toBeGreaterThanOrEqual(2);

    // NPC should have meaningful personality
    expect(MOCK_RESPONSES.npc.personality.split(",").length).toBeGreaterThanOrEqual(2);
  });
});

// =============================================================================
// AI RESPONSE TRANSFORMATION TESTS
// =============================================================================

describe("AI Response Transformation", () => {
  describe("Entity Marker Parsing", () => {
    it("should parse entity markers from room descriptions", () => {
      const description = MOCK_RESPONSES.roomEvent.roomDescription;
      const markerPattern = /\{entity:([^:]+):([^:]+):([^}]+)\}/g;
      const matches = [...description.matchAll(markerPattern)];

      expect(matches.length).toBeGreaterThan(0);
      const [, name, entityClass, tags] = matches[0];
      expect(name).toBe("Ancient Forge");
      expect(entityClass).toBe("mechanism");
      expect(tags).toBe("fire,metal,tool");
    });

    it("should handle descriptions without entity markers", () => {
      const description = "A plain stone corridor stretches into darkness";
      const markerPattern = /\{entity:([^:]+):([^:]+):([^}]+)\}/g;
      const matches = [...description.matchAll(markerPattern)];
      expect(matches.length).toBe(0);
    });
  });

  describe("Capability Relevance Mapping", () => {
    it("should map utility types to player capabilities", () => {
      const validUtilityTypes = [
        "light",
        "reveal_traps",
        "reveal_secrets",
        "teleport",
        "unlock",
        "identify",
        "transmute_gold",
        "transmute_item",
        "charm",
        "dominate",
        "fear",
        "ward_area",
        "summon_companion",
        "banish",
        "dispel",
        "scry",
        "restore_item",
        "traverse",
        "break",
        "navigate",
      ];

      const entityRelevance = MOCK_RESPONSES.roomEvent.environmentalEntities![0].capabilityRelevance;
      expect(validUtilityTypes).toContain(entityRelevance?.utilityType);
    });
  });
});

// =============================================================================
// AI FALLBACK BEHAVIOR TESTS
// =============================================================================

describe("AI Fallback Behavior", () => {
  it("should have valid default item when AI fails", () => {
    const fallbackItem = {
      name: "Mysterious Object",
      description: "An item of unknown origin",
      lore: "Its history is lost to time",
      useText: null,
    };
    expect(itemSchema.safeParse(fallbackItem).success).toBe(true);
  });

  it("should have valid default enemy when AI fails", () => {
    const fallbackEnemy = {
      name: "Unknown Creature",
      description: "A hostile being lurking in the shadows",
      abilities: ["Attack"],
      weakness: null,
      lastWords: null,
    };
    expect(enemySchema.safeParse(fallbackEnemy).success).toBe(true);
  });

  it("should have valid default room event when AI fails", () => {
    const fallbackRoom = {
      roomDescription: "A stone chamber stretches before you",
      ambiance: "Dust motes float in stale air",
      entityType: "empty" as const,
    };
    expect(roomEventSchema.safeParse(fallbackRoom).success).toBe(true);
  });
});

// =============================================================================
// CONTENT SAFETY TESTS
// =============================================================================

describe("Content Safety", () => {
  it("mock responses should not contain prohibited content", () => {
    const allText = JSON.stringify(MOCK_RESPONSES);

    // Should be dark fantasy but not gratuitously violent
    expect(allText).not.toMatch(/explicit|gore|torture/i);

    // Should maintain fantasy setting
    expect(allText).not.toMatch(/real-world|modern|contemporary/i);
  });

  it("mock responses should maintain consistent tone", () => {
    // All descriptions should be in fantasy style
    expect(MOCK_RESPONSES.item.description).toMatch(/blade|dark|cold/i);
    expect(MOCK_RESPONSES.enemy.description).toMatch(/armor|whispers|malevolent/i);
    expect(MOCK_RESPONSES.boss.description).toMatch(/bone|chains|dark/i);
  });
});

// =============================================================================
// EXPORTED MOCK FACTORY
// =============================================================================

/**
 * Factory for creating deterministic mock AI responses
 * Use these in integration tests that need AI-generated content
 */
export const mockAIResponses = {
  getItem: () => structuredClone(MOCK_RESPONSES.item),
  getEnemy: () => structuredClone(MOCK_RESPONSES.enemy),
  getNPC: () => structuredClone(MOCK_RESPONSES.npc),
  getTrap: () => structuredClone(MOCK_RESPONSES.trap),
  getShrine: () => structuredClone(MOCK_RESPONSES.shrine),
  getBoss: () => structuredClone(MOCK_RESPONSES.boss),
  getCompanion: () => structuredClone(MOCK_RESPONSES.companion),
  getRoomNarration: () => structuredClone(MOCK_RESPONSES.roomNarration),
  getCombatNarration: () => structuredClone(MOCK_RESPONSES.combatNarration),
  getRoomEvent: () => structuredClone(MOCK_RESPONSES.roomEvent),
  getCombatRound: () => structuredClone(MOCK_RESPONSES.combatRound),
  getVictory: () => structuredClone(MOCK_RESPONSES.victory),

  /**
   * Create a custom mock that passes schema validation
   */
  createCustomItem: (overrides: Partial<typeof MOCK_RESPONSES.item>) => ({
    ...MOCK_RESPONSES.item,
    ...overrides,
  }),

  createCustomEnemy: (overrides: Partial<typeof MOCK_RESPONSES.enemy>) => ({
    ...MOCK_RESPONSES.enemy,
    ...overrides,
  }),

  createCustomRoomEvent: (overrides: Partial<typeof MOCK_RESPONSES.roomEvent>) => ({
    ...MOCK_RESPONSES.roomEvent,
    ...overrides,
  }),
};
