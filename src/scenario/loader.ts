import { basename } from "node:path";
import { resolve } from "node:path";
import type { RawScenario } from "../types/scenario.ts";

/** KP/GMP向けセクション（あれば除去。無ければ何もしない） */
const KP_ONLY_SECTION_PATTERNS: RegExp[] = [
  /##\s*GMメモ[\s\S]*/i,
  /##\s*KP用[\s\S]*/i,
  /##\s*GM用[\s\S]*/i,
  /##\s*ゲームマスター向け[\s\S]*/i,
  /【KP】[\s\S]*?(?=\n#{1,2}\s|\n【|$)/i,
  /〈KP用〉[\s\S]*?(?=\n#{1,2}\s|$)/i,
];

function extractTitle(content: string, filePath: string): string {
  const markdownTitle = content.match(/^#\s+(.+)$/m);
  if (markdownTitle?.[1]) {
    return markdownTitle[1].trim();
  }

  const bracketTitle = content.match(/^【(.+?)】/m);
  if (bracketTitle?.[1] && bracketTitle[1].length <= 60) {
    return bracketTitle[1].trim();
  }

  const firstLine = content
    .split("\n")
    .map((l) => l.trim())
    .find((l) => l.length > 0);

  if (firstLine && firstLine.length <= 80 && !firstLine.startsWith("---")) {
    return firstLine;
  }

  return basename(filePath).replace(/\.txt$/i, "");
}

function stripKpOnlySections(content: string): string {
  let result = content;
  for (const pattern of KP_ONLY_SECTION_PATTERNS) {
    result = result.replace(pattern, "");
  }
  return result.trim();
}

export async function loadScenarioTxt(filePath: string): Promise<RawScenario> {
  const absolute = resolve(filePath);
  const file = Bun.file(absolute);
  const exists = await file.exists();
  if (!exists) {
    throw new Error(`Scenario file not found: ${absolute}`);
  }
  const content = await file.text();
  const title = extractTitle(content, absolute);
  return { title, path: absolute, content };
}

/**
 * GM/PLに渡すシナリオ抜粋。
 * Pixiv等のコピペtxt（GMメモ無し）でもそのまま先頭から使用する。
 */
export function getPublicScenarioExcerpt(
  content: string,
  maxChars = 6000,
): string {
  const cleaned = stripKpOnlySections(content);
  if (cleaned.length <= maxChars) {
    return cleaned;
  }
  return `${cleaned.slice(0, maxChars)}\n\n（…シナリオ続きあり。未公開部分は描写の参考にせず、既出の情報のみ使うこと）`;
}
