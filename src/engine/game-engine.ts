import { GMAgent } from "../agents/gm/gm-agent.ts";
import { PlayerAgent } from "../agents/player/player-agent.ts";
import type { LLMProvider } from "../llm/types.ts";
import { formatDiceResult } from "../protocols/result.ts";
import { getPublicScenarioExcerpt } from "../scenario/loader.ts";
import type { RawScenario } from "../types/scenario.ts";
import {
  addDiscoveredClue,
  createInitialGameState,
  type GameState,
} from "../state/game-state.ts";
import type { PlayerAction } from "../types/actions.ts";
import {
  log,
  logDiceResult,
  logGmNarration,
  logPlAction,
  logProgress,
} from "../utils/logger.ts";
import { resolvePlayerSkillCheck } from "../rules/skills/skill-resolver.ts";
import type { DiceResult } from "../protocols/result.ts";
import { EventBus } from "./event-bus.ts";
import { applyPhaseFromAction } from "./phase-manager.ts";
import { shouldContinue, startNextTurn } from "./turn-manager.ts";
import { SessionTranscript } from "../memory/session-transcript.ts";
import { formatActionForPrompt } from "./action-format.ts";
import type { SkillCheckAction } from "../types/actions.ts";

export type GameEngineConfig = {
  scenario: RawScenario;
  llm: LLMProvider;
  maxTurns?: number;
};

export type TurnOutcome = {
  state: GameState;
  gmNarration: string;
  playerAction: PlayerAction;
  diceResult?: DiceResult;
};

function clueIdFromSkillCheck(action: SkillCheckAction): string {
  const slug = `${action.skill}-${action.target}`
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9faf-]/g, "");
  return slug || "unknown-clue";
}

function applyClueFromAction(
  state: GameState,
  action: PlayerAction,
  dice?: DiceResult,
): GameState {
  if (action.type !== "skill_check" || !dice?.success) {
    return state;
  }
  return addDiscoveredClue(state, clueIdFromSkillCheck(action));
}

export class GameEngine {
  private state: GameState;
  private readonly gm: GMAgent;
  private readonly pl: PlayerAgent;
  private readonly bus = new EventBus();
  private readonly scenarioExcerpt: string;
  private readonly transcript = new SessionTranscript();
  private lastGmNarration = "";
  private lastDiceResultText?: string;

  constructor(private readonly config: GameEngineConfig) {
    this.state = createInitialGameState();
    this.gm = new GMAgent(config.llm);
    this.pl = new PlayerAgent(config.llm);
    this.scenarioExcerpt = getPublicScenarioExcerpt(config.scenario.content);

    this.bus.on("DICE_ROLLED", (e) => {
      log("event", "DICE_ROLLED", e.payload);
    });
    this.bus.on("STATE_UPDATED", (e) => {
      log("event", "STATE_UPDATED", e.payload);
    });
    this.bus.on("TURN_STARTED", (e) => {
      log("event", "TURN_STARTED", e.payload);
    });
  }

  getState(): GameState {
    return this.state;
  }

  private emitTurnStart(): void {
    this.bus.emit({
      type: "TURN_STARTED",
      turn: this.state.turn,
      timestamp: Date.now(),
      payload: { turn: this.state.turn },
    });
  }

  private getNpcsPresent(): string[] {
    return this.state.npcs
      .filter((n) => n.location === this.state.location)
      .map((n) => n.name);
  }

  private async runGmTurn(includePlayerContext: boolean): Promise<string> {
    const narration = await this.gm.narrate({
      scenarioExcerpt: this.scenarioExcerpt,
      location: this.state.location,
      phase: this.state.phase,
      turn: this.state.turn,
      publicClues: this.state.discoveredClues,
      conversationHistory: this.transcript.formatForPrompt(),
      npcsPresent: this.getNpcsPresent(),
      lastPlayerAction: includePlayerContext ? this.lastActionSummary : undefined,
      lastDiceResult: includePlayerContext ? this.lastDiceResultText : undefined,
    });

    this.lastGmNarration = narration;
    this.transcript.append({
      turn: this.state.turn,
      role: "gm",
      content: narration,
    });
    this.bus.emit({
      type: "GM_NARRATION",
      turn: this.state.turn,
      timestamp: Date.now(),
      payload: { text: narration },
    });
    return narration;
  }

  private lastActionSummary = "";

  private applyRules(action: PlayerAction): DiceResult | undefined {
    const player = this.state.players[0];
    if (!player) return undefined;

    if (action.type === "skill_check") {
      const dice = resolvePlayerSkillCheck(player, action);
      this.lastDiceResultText = formatDiceResult(dice);
      this.bus.emit({
        type: "DICE_ROLLED",
        turn: this.state.turn,
        timestamp: Date.now(),
        payload: {
          roll: dice.roll,
          target: dice.target,
          success: dice.success,
          critical: dice.critical,
          fumble: dice.fumble,
        },
      });
      return dice;
    }

    if (action.type === "move") {
      this.state = { ...this.state, location: action.location };
      this.bus.emit({
        type: "LOCATION_CHANGED",
        turn: this.state.turn,
        timestamp: Date.now(),
        payload: { playerId: player.id, location: action.location },
      });
    }

    return undefined;
  }

  async runTurn(): Promise<TurnOutcome | null> {
    const maxTurns = this.config.maxTurns ?? 4;
    if (!shouldContinue({ state: this.state, maxTurns })) {
      return null;
    }

    this.state = startNextTurn(this.state);
    this.emitTurnStart();

    let sceneNarration = this.lastGmNarration;
    if (this.state.turn === 1) {
      sceneNarration = await this.runGmTurn(false);
    }

    const player = this.state.players[0];
    if (!player) {
      throw new Error("No player in game state");
    }

    const playerAction = await this.pl.decideAction({
      playerName: player.name,
      location: this.state.location,
      phase: this.state.phase,
      turn: this.state.turn,
      knownFacts: this.state.discoveredClues,
      lastGmNarration: sceneNarration,
      conversationHistory: this.transcript.formatForPrompt(),
      npcsPresent: this.getNpcsPresent(),
    });

    this.lastActionSummary = formatActionForPrompt(playerAction);
    this.transcript.append({
      turn: this.state.turn,
      role: "pl",
      content: this.lastActionSummary,
    });
    this.lastDiceResultText = undefined;
    this.bus.emit({
      type: "PLAYER_ACTION",
      turn: this.state.turn,
      timestamp: Date.now(),
      payload: { playerId: player.id, actionType: playerAction.type },
    });

    const diceResult = this.applyRules(playerAction);
    this.state = applyPhaseFromAction(this.state, playerAction);
    this.state = applyClueFromAction(this.state, playerAction, diceResult);

    this.bus.emit({
      type: "STATE_UPDATED",
      turn: this.state.turn,
      timestamp: Date.now(),
      payload: {
        summary: `turn=${this.state.turn} clues=${this.state.discoveredClues.join(",")}`,
      },
    });

    const resultNarration = await this.runGmTurn(true);

    this.bus.emit({
      type: "TURN_ENDED",
      turn: this.state.turn,
      timestamp: Date.now(),
      payload: { turn: this.state.turn },
    });

    log("turn", `turn ${this.state.turn} completed`, {
      action: playerAction,
      dice: diceResult,
      state: this.state,
    });

    return {
      state: this.state,
      gmNarration: resultNarration,
      playerAction,
      diceResult,
    };
  }

  async runSession(): Promise<GameState> {
    log("engine", `session start: ${this.config.scenario.title}`);

    while (shouldContinue({ state: this.state, maxTurns: this.config.maxTurns ?? 4 })) {
      const outcome = await this.runTurn();
      if (!outcome) break;

      logGmNarration(outcome.state.turn, outcome.gmNarration);
      logPlAction(outcome.state.turn, outcome.playerAction);
      if (outcome.diceResult) {
        logDiceResult(outcome.state.turn, outcome.diceResult);
      }
      logProgress(
        outcome.state.turn,
        outcome.state.location,
        outcome.state.phase,
        outcome.state.discoveredClues,
      );
    }

    log("engine", "session end", { finalState: this.state });
    return this.state;
  }
}
