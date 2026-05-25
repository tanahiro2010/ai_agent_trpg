import { appendFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import type { PlayerAction } from "../types/actions.ts";
import { formatDiceResult } from "../protocols/result.ts";
import type { DiceResult } from "../protocols/result.ts";

export type LogLevel = "info" | "warn" | "error" | "debug";

export type LogEntry = {
  level: LogLevel;
  category: string;
  message: string;
  data?: unknown;
  timestamp: number;
};

export type LoggerConfig = {
  includeRawConsole: boolean;
  logDirectory?: string;
};

/** コンソールに出す TRPG 必須カテゴリ（--include-raw 無し時） */
const TRPG_CONSOLE_CATEGORIES = new Set([
  "session",
  "gm",
  "pl",
  "dice",
  "progress",
]);

const entries: LogEntry[] = [];
let config: LoggerConfig = { includeRawConsole: false, logDirectory: "logs" };
let logFilePath: string | null = null;

export async function initLogger(options: LoggerConfig): Promise<string> {
  config = {
    includeRawConsole: options.includeRawConsole,
    logDirectory: options.logDirectory ?? "logs",
  };

  const dir = resolve(process.cwd(), config.logDirectory ?? "logs");
  await mkdir(dir, { recursive: true });

  const stamp = new Date().toISOString().replace(/[:.]/g, "-");
  logFilePath = resolve(dir, `session-${stamp}.jsonl`);
  await Bun.write(logFilePath, "");

  return logFilePath;
}

export function getLogFilePath(): string | null {
  return logFilePath;
}

function shouldPrintToConsole(category: string): boolean {
  if (config.includeRawConsole) {
    return true;
  }
  return TRPG_CONSOLE_CATEGORIES.has(category);
}

async function appendToLogFile(entry: LogEntry): Promise<void> {
  if (!logFilePath) return;
  const line = `${JSON.stringify(entry)}\n`;
  await appendFile(logFilePath, line, "utf8");
}

function formatConsoleLine(entry: LogEntry): string {
  switch (entry.category) {
    case "session":
      return entry.message;
    case "gm": {
      const text =
        entry.data &&
        typeof entry.data === "object" &&
        "text" in entry.data &&
        typeof (entry.data as { text: string }).text === "string"
          ? (entry.data as { text: string }).text
          : entry.message;
      return `\n--- GM（ターン ${formatTurn(entry)}）---\n${text}`;
    }
    case "pl": {
      return `\n--- PL ---\n${formatPlActionLine(entry.data)}`;
    }
    case "dice": {
      const dice = entry.data as DiceResult | undefined;
      if (dice && "roll" in dice) {
        return `\n--- 判定（TS）---\n${formatDiceResult(dice)}`;
      }
      return `\n--- 判定 ---\n${entry.message}`;
    }
    case "progress": {
      const d = entry.data as
        | { turn: number; location: string; phase: string; clues: string[] }
        | undefined;
      if (d) {
        const clues =
          d.clues.length > 0 ? d.clues.join(", ") : "（なし）";
        return `\n--- 進行 ---\nturn=${d.turn} | ${d.location} | ${d.phase} | 手がかり: ${clues}`;
      }
      return `\n--- 進行 ---\n${entry.message}`;
    }
    default: {
      const prefix = `[${entry.category}]`;
      if (entry.data !== undefined) {
        return `${prefix} ${entry.message}\n${JSON.stringify(entry.data, null, 2)}`;
      }
      return `${prefix} ${entry.message}`;
    }
  }
}

function formatTurn(entry: LogEntry): string {
  if (
    entry.data &&
    typeof entry.data === "object" &&
    "turn" in entry.data &&
    typeof (entry.data as { turn: number }).turn === "number"
  ) {
    return String((entry.data as { turn: number }).turn);
  }
  return "?";
}

function formatPlActionLine(data: unknown): string {
  if (!data || typeof data !== "object" || !("action" in data)) {
    return JSON.stringify(data, null, 2);
  }
  const action = (data as { action: PlayerAction }).action;
  switch (action.type) {
    case "speak":
      return `「${action.message}」\n→ ${action.target}（${action.reason}）`;
    case "skill_check":
      return `調査: ${action.target}（${action.skill}）\n→ ${action.reason}`;
    case "move":
      return `移動: ${action.location}\n→ ${action.reason}`;
    case "wait":
      return `待機: ${action.reason}`;
  }
}

export function log(
  category: string,
  message: string,
  data?: unknown,
  level: LogLevel = "info",
): void {
  const entry: LogEntry = {
    level,
    category,
    message,
    data,
    timestamp: Date.now(),
  };
  entries.push(entry);

  void appendToLogFile(entry).catch((err: unknown) => {
    console.error("[logger] failed to write log file:", err);
  });

  if (shouldPrintToConsole(category)) {
    console.log(formatConsoleLine(entry));
  }
}

export function logSessionStart(title: string, provider: string): void {
  log("session", `\n=== ${title} ===\nProvider: ${provider}\n`, {
    title,
    provider,
  });
}

export function logSessionEnd(logPath: string): void {
  log("session", `\n=== セッション終了 ===\n全ログ: ${logPath}`, { logPath });
}

export function logGmNarration(turn: number, text: string): void {
  log("gm", "GM描写", { turn, text });
}

export function logPlAction(turn: number, action: PlayerAction): void {
  log("pl", "PL行動", { turn, action });
}

export function logDiceResult(turn: number, result: DiceResult): void {
  log("dice", "ダイス判定", { turn, ...result });
}

export function logProgress(
  turn: number,
  location: string,
  phase: string,
  clues: string[],
): void {
  log("progress", "シナリオ進行", { turn, location, phase, clues });
}

export function getLogEntries(): readonly LogEntry[] {
  return entries;
}

export function clearLogs(): void {
  entries.length = 0;
}
