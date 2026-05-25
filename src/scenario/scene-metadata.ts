import type { NPCState } from "../state/npc-state.ts";
import type { GamePhase } from "../state/game-state.ts";
import { createNPC } from "../state/npc-state.ts";

export type SceneMeta = {
  location: string;
  phase: GamePhase;
  npcs: NPCState[];
};

const PAGE_SCENE: Record<string, SceneMeta> = {
  "page-2": {
    location: "日常（不思議な扉の前）",
    phase: "exploration",
    npcs: [],
  },
  "page-3": {
    location: "真っ白な空間",
    phase: "exploration",
    npcs: [createNPC("npc-girl", "少女", "真っ白な空間")],
  },
  "page-4": {
    location: "日常",
    phase: "exploration",
    npcs: [],
  },
  "page-5": {
    location: "真っ白な空間（戦闘）",
    phase: "combat",
    npcs: [createNPC("npc-noa-hostile", "少女（ノア・ヴァンレイン）", "真っ白な空間")],
  },
  "page-6": {
    location: "真っ白な空間",
    phase: "dialog",
    npcs: [createNPC("npc-noa-friendly", "少女（ノア・ヴァンレイン）", "真っ白な空間")],
  },
  "page-9": {
    location: "日常へ帰還",
    phase: "exploration",
    npcs: [],
  },
  "page-10": {
    location: "真っ白な空間（戦闘）",
    phase: "combat",
    npcs: [createNPC("npc-noa-hostile", "少女（ノア・ヴァンレイン）", "真っ白な空間")],
  },
};

const DEFAULT_SCENE: SceneMeta = {
  location: "シナリオ進行中",
  phase: "exploration",
  npcs: [],
};

export function getSceneMetaForPage(pageId: string): SceneMeta {
  if (pageId === "page-7" || pageId === "page-8") {
    return {
      location: "光に包まれた後の日常",
      phase: "exploration",
      npcs: [],
    };
  }
  return PAGE_SCENE[pageId] ?? DEFAULT_SCENE;
}
