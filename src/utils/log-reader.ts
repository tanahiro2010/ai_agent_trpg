import { resolve } from "node:path";
import type { LogEntry } from "./logger.ts";

export async function readLogFile(filePath: string): Promise<LogEntry[]> {
  const absolute = resolve(filePath);
  const file = Bun.file(absolute);
  if (!(await file.exists())) {
    throw new Error(`Log file not found: ${absolute}`);
  }

  const text = await file.text();
  const entries: LogEntry[] = [];

  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      entries.push(JSON.parse(trimmed) as LogEntry);
    } catch {
      // 壊れた行はスキップ
    }
  }

  return entries;
}
