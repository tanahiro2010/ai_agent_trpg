import { GMAgent } from "../agents/gm/gm-agent.ts";
import { PlayerAgent } from "../agents/player/player-agent.ts";
import type { LLMProvider } from "../llm/types.ts";
import { formatDiceResult } from "../protocols/result.ts";
import type { RawScenario } from "../types/scenario.ts";
import {
  applyPlayerSanLoss,
  applySceneToState,
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
import { shouldContinue, startNextTurn } from "./turn-manager.ts";
import { SessionTranscript } from "../memory/session-transcript.ts";
import { formatActionForPrompt } from "./action-format.ts";
import { createInitialGameStateFromScenario } from "../scenario/bootstrap.ts";
import {
  formatBranchesForPrompt,
  resolveNextPageId,
} from "../scenario/navigator.ts";
import {
  getPage,
  parseScenarioPages,
  type ParsedScenarioPages,
  type ScenarioPage,
} from "../scenario/page-parser.ts";
import { getSceneMetaForPage } from "../scenario/scene-metadata.ts";

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
  sceneChanged: boolean;
};

const SCENE_BODY_MAX = 2200;

function truncateSceneBody(body: string): string {
  if (body.length <= SCENE_BODY_MAX) return body;
  return `${body.slice(0, SCENE_BODY_MAX)}\n（…続きあり）`;
}

export class GameEngine {
  private state: GameState;
  private readonly gm: GMAgent;
  private readonly pl: PlayerAgent;
  private readonly bus = new EventBus();
  private readonly parsed: ParsedScenarioPages;
  private readonly transcript = new SessionTranscript();
  private lastGmNarration = "";
  private lastDiceResultText?: string;
  private lastActionSummary = "";
  private pendingSceneTransition?: string;
  private sessionEnded = false;

  constructor(private readonly config: GameEngineConfig) {
    this.parsed = parseScenarioPages(config.scenario);
    this.state = createInitialGameStateFromScenario(this.parsed);
    this.gm = new GMAgent(config.llm);
    this.pl = new PlayerAgent(config.llm);

    this.bus.on("DICE_ROLLED", (e) => log("event", "DICE_ROLLED", e.payload));
    this.bus.on("STATE_UPDATED", (e) => log("event", "STATE_UPDATED", e.payload));
    this.bus.on("TURN_STARTED", (e) => log("event", "TURN_STARTED", e.payload));
  }

  getState(): GameState {
    return this.state;
  }

  private getCurrentPage(): ScenarioPage | undefined {
    return getPage(this.parsed, this.state.sceneId);
  }

  private buildPromptContext(includePlayerContext: boolean) {
    const page = this.getCurrentPage();
    const player = this.state.players[0];
    return {
      scenarioTitle: this.state.scenarioTitle,
      scenePageId: this.state.sceneId,
      scenePageNumber: page?.number ?? 0,
      sceneBody: truncateSceneBody(page?.body ?? ""),
      sceneBranches: page ? formatBranchesForPrompt(page) : "",
      location: this.state.location,
      phase: this.state.phase,
      turn: this.state.turn,
      playerName: player?.name ?? "探索者",
      publicClues: this.state.visitedPages,
      conversationHistory: this.transcript.formatForPrompt(4),
      npcsPresent: this.getNpcsPresent(),
      lastPlayerAction: includePlayerContext ? this.lastActionSummary : undefined,
      lastDiceResult: includePlayerContext ? this.lastDiceResultText : undefined,
      sceneTransition: includePlayerContext ? this.pendingSceneTransition : undefined,
    };
  }

  private getNpcsPresent(): string[] {
    return this.state.npcs
      .filter((n) => n.location === this.state.location)
      .map((n) => n.name);
  }

  private async runGmTurn(includePlayerContext: boolean): Promise<string> {
    const narration = await this.gm.narrate(this.buildPromptContext(includePlayerContext));
    this.pendingSceneTransition = undefined;
    this.lastGmNarration = narration;
    this.transcript.append({
      turn: this.state.turn,
      role: "gm",
      content: narration,
    });
    return narration;
  }

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
    }

    return undefined;
  }

  private applySceneNavigation(
    action: PlayerAction,
    dice?: DiceResult,
  ): boolean {
    const page = this.getCurrentPage();
    if (!page) return false;

    let nextId = resolveNextPageId(page, action);

    if (page.kind === "combat" && action.type === "skill_check" && dice) {
      const win = page.branches.find((b) => /勝/.test(b.label));
      const lose = page.branches.find((b) => /負/.test(b.label));
      nextId = dice.success
        ? (win?.targetPageId ?? nextId)
        : (lose?.targetPageId ?? nextId);
    }

    if (!nextId || nextId === this.state.sceneId) {
      return false;
    }

    const fromId = this.state.sceneId;
    const meta = getSceneMetaForPage(nextId);
    this.state = applySceneToState(this.state, nextId, meta);

    if (fromId === "page-2" && nextId === "page-3") {
      const sanLoss = Math.random() < 0.5 ? 0 : 1;
      if (sanLoss > 0 && this.state.players[0]) {
        this.state = applyPlayerSanLoss(
          this.state,
          this.state.players[0].id,
          sanLoss,
        );
        log("event", "SAN loss on door entry", { sanLoss });
      }
    }

    const nextPage = getPage(this.parsed, nextId);
    this.pendingSceneTransition = [
      `シーン遷移（TS確定）: ${fromId} → ${nextId}`,
      `場所: ${meta.location}`,
      nextPage ? `概要: ${nextPage.body.slice(0, 300)}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    log("event", "SCENE_CHANGED", {
      from: fromId,
      to: nextId,
      location: meta.location,
      phase: meta.phase,
    });

    const next = getPage(this.parsed, nextId);
    if (next?.kind === "ending") {
      this.sessionEnded = true;
    }

    return true;
  }

  async runTurn(): Promise<TurnOutcome | null> {
    const maxTurns = this.config.maxTurns ?? 4;
    if (this.sessionEnded || !shouldContinue({ state: this.state, maxTurns })) {
      return null;
    }

    this.state = startNextTurn(this.state);
    this.bus.emit({
      type: "TURN_STARTED",
      turn: this.state.turn,
      timestamp: Date.now(),
      payload: { turn: this.state.turn },
    });

    let sceneNarration = this.lastGmNarration;
    if (this.state.turn === 1) {
      sceneNarration = await this.runGmTurn(false);
    }

    const player = this.state.players[0];
    if (!player) throw new Error("No player in game state");

    const currentPage = this.getCurrentPage();
    const playerAction = await this.pl.decideAction({
      playerName: player.name,
      location: this.state.location,
      phase: this.state.phase,
      turn: this.state.turn,
      scenePageId: this.state.sceneId,
      sceneBranches: currentPage
        ? formatBranchesForPrompt(currentPage)
        : "",
      knownFacts: this.state.discoveredClues,
      lastGmNarration: sceneNarration,
      conversationHistory: this.transcript.formatForPrompt(),
      npcsPresent: this.getNpcsPresent(),
      combatHint:
        currentPage?.kind === "combat"
          ? "〈回避〉成功で勝利ルート、失敗で敗北ルート（TSが分岐処理）"
          : undefined,
    });

    this.lastActionSummary = formatActionForPrompt(playerAction);
    this.transcript.append({
      turn: this.state.turn,
      role: "pl",
      content: this.lastActionSummary,
    });
    this.lastDiceResultText = undefined;

    const diceResult = this.applyRules(playerAction);
    const sceneChanged = this.applySceneNavigation(playerAction, diceResult);

    const resultNarration = await this.runGmTurn(true);

    log("turn", `turn ${this.state.turn} completed`, {
      action: playerAction,
      dice: diceResult,
      sceneId: this.state.sceneId,
      sceneChanged,
    });

    return {
      state: this.state,
      gmNarration: resultNarration,
      playerAction,
      diceResult,
      sceneChanged,
    };
  }

  async runSession(): Promise<GameState> {
    log("engine", `session start: ${this.state.scenarioTitle}`, {
      startScene: this.state.sceneId,
    });

    while (
      !this.sessionEnded &&
      shouldContinue({ state: this.state, maxTurns: this.config.maxTurns ?? 4 })
    ) {
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
        outcome.state.visitedPages,
      );

      if (this.sessionEnded) break;
    }

    log("engine", "session end", { finalState: this.state });
    return this.state;
  }
}
