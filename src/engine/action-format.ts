import type { PlayerAction } from "../types/actions.ts";

export function formatActionForPrompt(action: PlayerAction): string {
  switch (action.type) {
    case "skill_check":
      return `調査: ${action.target} を ${action.skill} で調べる（${action.reason}）`;
    case "speak":
      return `会話: ${action.target} に「${action.message}」と話す（${action.reason}）`;
    case "move":
      return `移動: ${action.location} へ向かう（${action.reason}）`;
    case "wait":
      return `待機: ${action.reason}`;
  }
}
