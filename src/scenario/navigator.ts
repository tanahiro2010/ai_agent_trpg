import type { PlayerAction } from "../types/actions.ts";
import type { ScenarioBranch, ScenarioPage } from "./page-parser.ts";

function actionText(action: PlayerAction): string {
  switch (action.type) {
    case "speak":
      return `${action.message} ${action.target} ${action.reason}`;
    case "skill_check":
      return `${action.skill} ${action.target} ${action.reason}`;
    case "move":
      return `${action.location} ${action.reason}`;
    case "wait":
      return action.reason;
  }
}

function matchesBranch(branch: ScenarioBranch, text: string): boolean {
  const normalized = text.toLowerCase();
  return branch.keywords.some((kw) => normalized.includes(kw.toLowerCase()));
}

/** 現在ページの分岐表に基づき次ページを決定（AIではなくTS） */
export function resolveNextPageId(
  page: ScenarioPage,
  action: PlayerAction,
): string | null {
  if (page.branches.length === 0) {
    return null;
  }

  if (action.branchId) {
    return page.branches.find((b) => b.branchId === action.branchId)?.targetPageId ?? null;
  }

  const text = actionText(action);

  if (action.type === "move" && page.id === "page-2") {
    const enter = page.branches.find((b) => b.targetPageId === "page-3");
    if (enter) return enter.targetPageId;
  }

  if (action.type === "speak" && page.id === "page-6") {
    const allow = page.branches.find((b) => b.targetPageId === "page-9");
    const deny = page.branches.find((b) => b.targetPageId === "page-10");
    if (deny && /ダメ|拒|いけない|無理|通さない/.test(text)) {
      return deny.targetPageId;
    }
    if (allow && /いい|OK|通して|許|構わ|説明/.test(text)) {
      return allow.targetPageId;
    }
  }

  if (action.type === "speak" && page.id === "page-3") {
    const hostile = page.branches.find((b) => b.targetPageId === "page-5");
    const friendly = page.branches.find((b) => b.targetPageId === "page-6");
    if (
      friendly &&
      /敵じゃない|味方|友好|話を聞|聞かせ|平和|待て|止まれ|違う/.test(text)
    ) {
      return friendly.targetPageId;
    }
    if (hostile && /敵ね|殺して|斬|攻撃|戦う|死んで/.test(text)) {
      return hostile.targetPageId;
    }
  }

  for (const branch of page.branches) {
    if (matchesBranch(branch, text)) {
      return branch.targetPageId;
    }
  }

  if (page.kind === "combat" && action.type === "skill_check") {
    const win = page.branches.find((b) => b.label.includes("勝"));
    const lose = page.branches.find((b) => b.label.includes("負"));
    if (action.skill === "dodge" || action.target.includes("回避")) {
      return win?.targetPageId ?? null;
    }
    return lose?.targetPageId ?? win?.targetPageId ?? null;
  }

  return null;
}

export function formatBranchesForPrompt(page: ScenarioPage): string {
  if (page.branches.length === 0) {
    return "（このシーンに明示的分岐なし）";
  }
  return page.branches
    .map((b) => `- branchId: ${b.branchId} | ${b.label} -> ${b.targetPageId}`)
    .join("\n");
}
