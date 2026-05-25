import type { RawScenario } from "../types/scenario.ts";

export type ScenarioBranch = {
  branchId: string;
  label: string;
  targetPageId: string;
  keywords: string[];
};

export type ScenarioPageKind = "play" | "combat" | "ending";

export type ScenarioPage = {
  id: string;
  number: number;
  body: string;
  branches: ScenarioBranch[];
  kind: ScenarioPageKind;
};

export type ParsedScenarioPages = {
  title: string;
  pages: Map<string, ScenarioPage>;
  startPageId: string;
};

const PAGE_HEADER = /^#\s*(\d+)ページ\s*$/gm;
const BRANCH_TARGET = /^(\d+)ページへ\s*$/;

function classifyPage(body: string): ScenarioPageKind {
  if (/^END[A-Z]/m.test(body) || /『.+』/.test(body.slice(0, 200))) {
    return "ending";
  }
  if (/戦闘開始|〈回避〉|ダメージ/.test(body)) {
    return "combat";
  }
  return "play";
}

function keywordsFromLabel(label: string): string[] {
  const base = [label.trim()];
  const extras: string[] = [];

  if (/入る|入って|中へ|扉/.test(label)) {
    extras.push("入る", "扉", "進む", "中に", "入って");
  }
  if (/入らない|戻/.test(label)) {
    extras.push("入らない", "戻る", "無視", "やめ");
  }
  if (/友好|友好的/.test(label)) {
    extras.push("友好", "敵じゃない", "話を聞", "聞かせ", "味方", "平和");
  }
  if (/敵対/.test(label)) {
    extras.push("敵対", "敵ね", "攻撃", "戦う", "斬る", "殺して");
  }
  if (/説明/.test(label)) {
    extras.push("説明", "教え", "どこから");
  }
  if (/いい|OK|許/.test(label)) {
    extras.push("いい", "許", "通して", "大丈夫", "構わ");
  }
  if (/ダメ|拒|無理/.test(label)) {
    extras.push("ダメ", "拒", "無理", "嫌");
  }
  if (/勝/.test(label)) {
    extras.push("勝", "倒し", "撃破");
  }
  if (/負/.test(label)) {
    extras.push("負", "逃げ", "撤退");
  }

  return [...new Set([...base, ...extras])];
}

function parseBranches(body: string, pageId: string): ScenarioBranch[] {
  const lines = body.split("\n");
  const branches: ScenarioBranch[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]?.trim() ?? "";
    if (!line || line.startsWith("#") || line.startsWith("http")) continue;
    if (BRANCH_TARGET.test(line)) continue;

    let targetNum: string | null = null;
    for (let j = i + 1; j < Math.min(i + 12, lines.length); j++) {
      const ahead = lines[j]?.trim() ?? "";
      const targetMatch = ahead.match(BRANCH_TARGET);
      if (targetMatch?.[1]) {
        targetNum = targetMatch[1];
        break;
      }
    }
    if (!targetNum) continue;

    const label = line.replace(/へ\s*$/, "").trim();
    if (label.length < 2 || label.length > 80) continue;
    if (/^https?:/.test(label)) continue;

    const targetPageId = `page-${targetNum}`;
    const exists = branches.some((b) => b.targetPageId === targetPageId);
    if (exists) continue;

    branches.push({
      branchId: `${pageId}-to-${targetPageId}`,
      label,
      targetPageId,
      keywords: keywordsFromLabel(label),
    });
  }

  return branches;
}

export function parseScenarioPages(scenario: RawScenario): ParsedScenarioPages {
  const content = scenario.content;
  const title = scenario.title;

  const headers = [...content.matchAll(PAGE_HEADER)];
  const pages = new Map<string, ScenarioPage>();

  for (let i = 0; i < headers.length; i++) {
    const match = headers[i];
    if (!match || match.index === undefined) continue;

    const num = Number.parseInt(match[1] ?? "0", 10);
    const start = match.index + match[0].length;
    const end = headers[i + 1]?.index ?? content.length;
    const body = content.slice(start, end).trim();

    const id = `page-${num}`;
    pages.set(id, {
      id,
      number: num,
      body,
      branches: parseBranches(body, id),
      kind: classifyPage(body),
    });
  }

  const startPageId = pickStartPage(pages);

  return { title, pages, startPageId };
}

function pickStartPage(pages: Map<string, ScenarioPage>): string {
  const playable = [...pages.values()]
    .filter((p) => p.kind === "play" && p.branches.length > 0)
    .sort((a, b) => a.number - b.number);

  return playable[0]?.id ?? "page-2";
}

export function getPage(
  parsed: ParsedScenarioPages,
  pageId: string,
): ScenarioPage | undefined {
  return parsed.pages.get(pageId);
}
