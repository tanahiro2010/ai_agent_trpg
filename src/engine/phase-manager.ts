import type { GamePhase } from "../state/game-state.ts";
import type { GameState } from "../state/game-state.ts";
import { setPhase } from "../state/game-state.ts";
import type { PlayerAction } from "../types/actions.ts";

export function phaseFromAction(action: PlayerAction): GamePhase {
  if (action.type === "speak") {
    return "dialog";
  }
  return "exploration";
}

export function applyPhaseFromAction(
  state: GameState,
  action: PlayerAction,
): GameState {
  return setPhase(state, phaseFromAction(action));
}
