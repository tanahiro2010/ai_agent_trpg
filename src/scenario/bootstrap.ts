import type { GameState } from "../state/game-state.ts";
import { createDefaultPlayer } from "../state/player-state.ts";
import type { ParsedScenarioPages } from "./page-parser.ts";
import { getPage } from "./page-parser.ts";
import { getSceneMetaForPage } from "./scene-metadata.ts";

export function createInitialGameStateFromScenario(
  parsed: ParsedScenarioPages,
): GameState {
  const startPage = getPage(parsed, parsed.startPageId);
  const meta = getSceneMetaForPage(parsed.startPageId);

  return {
    turn: 0,
    phase: meta.phase,
    players: [createDefaultPlayer("pl-1", "探索者")],
    npcs: meta.npcs.map((n) => ({ ...n })),
    discoveredClues: [],
    activeEvents: [],
    location: meta.location,
    sceneId: parsed.startPageId,
    scenarioTitle: parsed.title,
    visitedPages: startPage ? [parsed.startPageId] : [],
  };
}
