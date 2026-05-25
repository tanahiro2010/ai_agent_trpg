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
};

export function createInitialGameState(): GameState {
  return {
    turn: 0,
    phase: "exploration",
    players: [createDefaultPlayer("pl-1", "探偵・小林")],
    npcs: [createNPC("npc-shopkeeper", "店主・佐藤", "夜鶴堂")],
    discoveredClues: [],
    activeEvents: [],
    location: "夜鶴堂",
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
