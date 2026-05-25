import type { PlayerAction } from "../types/actions.ts";
import type { DiceResult } from "../protocols/result.ts";
import type { LogEntry } from "../utils/logger.ts";
import { readLogFile } from "../utils/log-reader.ts";

type ProgressData = {
  turn: number;
  location: string;
  phase: string;
  clues: string[];
};

type TurnBeat = {
  turn: number;
  pl?: PlayerAction;
  dice?: DiceResult;
  gm?: string;
  progress?: ProgressData;
};

const PHASE_LABEL: Record<string, string> = {
  exploration: "探索",
  dialog: "会話",
  combat: "戦闘",
};

function extractTitle(entries: LogEntry[]): string {
  for (const e of entries) {
    if (e.category === "session" && e.data && typeof e.data === "object") {
      const title = (e.data as { title?: string }).title;
      if (title) return title;
    }
    const match = e.message.match(/===\s*(.+?)\s*===/);
    if (match?.[1]) return match[1].trim();
  }
  return "セッション記録";
}

/** 第1ターンの PL 行動より前の GM 描写（オープニング） */
function tryExtractOpeningGm(entries: LogEntry[]): string | undefined {
  for (const e of entries) {
    if (e.category === "pl") break;

    if (e.category === "gm" && e.data && typeof e.data === "object") {
      const text = (e.data as { text?: string }).text;
      if (text) return text;
    }
    if (e.category === "ai-raw" && e.message === "GM response") {
      const text = extractTextFromAiRaw(e.data);
      if (text) return text;
    }
  }
  return undefined;
}

function extractTextFromAiRaw(data: unknown): string | undefined {
  if (!data || typeof data !== "object" || !("raw" in data)) return undefined;
  const raw = (data as { raw: string }).raw;
  try {
    const parsed = JSON.parse(raw) as {
      message?: { content?: Array<{ type?: string; text?: string }> };
    };
    const parts = parsed.message?.content ?? [];
    return parts
      .map((p) => p.text ?? "")
      .join("")
      .trim() || undefined;
  } catch {
    return raw.trim() || undefined;
  }
}

function buildTurnBeats(entries: LogEntry[]): Map<number, TurnBeat> {
  const turns = new Map<number, TurnBeat>();

  const ensure = (turn: number): TurnBeat => {
    let beat = turns.get(turn);
    if (!beat) {
      beat = { turn };
      turns.set(turn, beat);
    }
    return beat;
  };

  for (const e of entries) {
    if (e.category === "pl" && e.data && typeof e.data === "object") {
      const d = e.data as { turn?: number; action?: PlayerAction };
      if (typeof d.turn === "number" && d.action) {
        ensure(d.turn).pl = d.action;
      }
    }

    if (e.category === "gm" && e.data && typeof e.data === "object") {
      const d = e.data as { turn?: number; text?: string };
      if (typeof d.turn === "number" && d.text) {
        ensure(d.turn).gm = d.text;
      }
    }

    if (e.category === "dice" && e.data && typeof e.data === "object") {
      const d = e.data as DiceResult & { turn?: number };
      if (typeof d.turn === "number" && typeof d.roll === "number") {
        const { turn, roll, target, success, critical, fumble, skill } = d;
        ensure(turn).dice = { roll, target, success, critical, fumble, skill };
      }
    }

    if (e.category === "event" && e.message === "DICE_ROLLED" && e.data) {
      const d = e.data as DiceResult;
      if (typeof d.roll === "number") {
        const turn = inferTurnFromTimestamp(entries, e.timestamp);
        if (turn !== null) {
          ensure(turn).dice ??= d;
        }
      }
    }

    if (e.category === "progress" && e.data && typeof e.data === "object") {
      const d = e.data as ProgressData;
      if (typeof d.turn === "number") {
        ensure(d.turn).progress = d;
      }
    }
  }

  return turns;
}

function inferTurnFromTimestamp(
  entries: LogEntry[],
  timestamp: number,
): number | null {
  let lastTurn: number | null = null;
  for (const e of entries) {
    if (e.timestamp > timestamp) break;
    if (e.category === "event" && e.message === "TURN_STARTED" && e.data) {
      const t = (e.data as { turn?: number }).turn;
      if (typeof t === "number") lastTurn = t;
    }
    if (e.data && typeof e.data === "object" && "turn" in e.data) {
      const t = (e.data as { turn: number }).turn;
      if (typeof t === "number") lastTurn = t;
    }
  }
  return lastTurn;
}

function formatPlBeat(action: PlayerAction): string[] {
  const lines: string[] = ["▶ あなた"];
  switch (action.type) {
    case "speak":
      lines.push(`　「${action.message}」`);
      lines.push(`　${action.target}に話しかける。`);
      break;
    case "skill_check":
      lines.push(`　${action.target}を調べる（${action.skill}）`);
      lines.push(`　—— ${action.reason}`);
      break;
    case "move":
      lines.push(`　${action.location}へ向かう。`);
      lines.push(`　—— ${action.reason}`);
      break;
    case "wait":
      lines.push(`　様子を見る。—— ${action.reason}`);
      break;
  }
  return lines;
}

function formatDiceBeat(dice: DiceResult): string[] {
  const skill = dice.skill ? `${dice.skill} ` : "";
  const outcome = dice.critical
    ? "クリティカル！"
    : dice.fumble
      ? "ファンブル……"
      : dice.success
        ? "成功"
        : "失敗";
  return [
    "▶ 判定",
    `　${skill}出目 ${dice.roll} / 目標 ${dice.target} → ${outcome}`,
  ];
}

function formatGmBeat(text: string): string[] {
  return ["▶ 描写", "", ...text.split("\n"), ""];
}

function formatProgressFootnote(p: ProgressData): string[] {
  const phase = PHASE_LABEL[p.phase] ?? p.phase;
  const clues =
    p.clues.length > 0 ? p.clues.join("、") : "特になし";
  return [
    `　（${p.location}｜${phase}｜手がかり: ${clues}）`,
    "",
  ];
}

function renderTurn(turn: number, beat: TurnBeat): string[] {
  const lines: string[] = [`── 第${turn}幕 ──`, ""];

  if (beat.pl) {
    lines.push(...formatPlBeat(beat.pl), "");
  }
  if (beat.dice) {
    lines.push(...formatDiceBeat(beat.dice), "");
  }
  if (beat.gm) {
    lines.push(...formatGmBeat(beat.gm));
  }
  if (beat.progress) {
    lines.push(...formatProgressFootnote(beat.progress));
  }

  return lines;
}

export function formatStoryFromEntries(entries: LogEntry[]): string {
  const title = extractTitle(entries);
  const turns = buildTurnBeats(entries);
  const sortedTurns = [...turns.keys()].sort((a, b) => a - b);

  const lines: string[] = [
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    `  ${title}`,
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━",
    "",
  ];

  const opening = tryExtractOpeningGm(entries);
  const firstTurn = sortedTurns[0];
  const firstBeat = firstTurn !== undefined ? turns.get(firstTurn) : undefined;

  if (opening && firstBeat && !firstBeat.gm?.includes(opening.slice(0, 40))) {
    lines.push("── 序章 ──", "", "▶ 描写", "", ...opening.split("\n"), "", "");
  }

  for (const turn of sortedTurns) {
    const beat = turns.get(turn);
    if (beat) {
      lines.push(...renderTurn(turn, beat));
    }
  }

  lines.push("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━", "  （セッション記録の終わり）", "");

  return lines.join("\n");
}

export async function runStoryReplay(logPath: string): Promise<void> {
  const entries = await readLogFile(logPath);
  if (entries.length === 0) {
    throw new Error("Log file is empty or unreadable");
  }
  console.log(formatStoryFromEntries(entries));
}
