import type { GameState } from "../state/game-state.ts";
import { advanceTurn } from "../state/game-state.ts";

export type TurnContext = {
  state: GameState;
  maxTurns: number;
};

export function shouldContinue(ctx: TurnContext): boolean {
  return ctx.state.turn < ctx.maxTurns;
}

export function startNextTurn(state: GameState): GameState {
  return advanceTurn(state);
}
