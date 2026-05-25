import { createDefaultPlayer, type PlayerState } from "./player-state.ts";
import { createNPC, type NPCState } from "./npc-state.ts";

export type GamePhase = "exploration" | "dialog" | "combat";

export type GameState = {
  turn: number;
  phase: GamePhase;
  players: PlayerState[];
  npcs: NPCState[];
  discoveredClues: string[];
  activeEvents: string[];
  location: string;
  sceneId: string;
  scenarioTitle: string;
  visitedPages: string[];
};

export function createInitialGameState(): GameState {
  return {
    turn: 0,
    phase: "exploration",
    players: [createDefaultPlayer("pl-1", "探索者")],
    npcs: [createNPC("npc-shopkeeper", "店主・佐藤", "夜鶴堂")],
    discoveredClues: [],
    activeEvents: [],
    location: "夜鶴堂",
    sceneId: "default",
    scenarioTitle: "未設定",
    visitedPages: [],
  };
}

export function applyPlayerSanLoss(
  state: GameState,
  playerId: string,
  loss: number,
): GameState {
  return {
    ...state,
    players: state.players.map((p) =>
      p.id === playerId ? { ...p, san: Math.max(0, p.san - loss) } : p,
    ),
  };
}

export function applySceneToState(
  state: GameState,
  sceneId: string,
  meta: { location: string; phase: GamePhase; npcs: NPCState[] },
): GameState {
  const visited = state.visitedPages.includes(sceneId)
    ? state.visitedPages
    : [...state.visitedPages, sceneId];

  return {
    ...state,
    sceneId,
    location: meta.location,
    phase: meta.phase,
    npcs: meta.npcs.map((n) => ({ ...n })),
    visitedPages: visited,
    discoveredClues: [...state.discoveredClues, sceneId],
  };
}

export function advanceTurn(state: GameState): GameState {
  return { ...state, turn: state.turn + 1 };
}

export function addDiscoveredClue(state: GameState, clueId: string): GameState {
  if (state.discoveredClues.includes(clueId)) {
    return state;
  }
  return {
    ...state,
    discoveredClues: [...state.discoveredClues, clueId],
  };
}

export function setLocation(state: GameState, location: string): GameState {
  return { ...state, location };
}

export function setPhase(state: GameState, phase: GamePhase): GameState {
  return { ...state, phase };
}
