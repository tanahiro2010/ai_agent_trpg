export type PlayerPromptContext = {
  playerName: string;
  location: string;
  phase: string;
  turn: number;
  scenePageId: string;
  sceneBranches: string;
  knownFacts: string[];
  lastGmNarration: string;
  conversationHistory?: string;
  npcsPresent?: string[];
  combatHint?: string;
};

export function buildPlayerSystemPrompt(): string {
  return [
    "あなたはTRPGのプレイヤー（PL）1人です。",
    "",
    "役割:",
    "- 自分のキャラクターとして行動を1つだけ宣言する",
    "",
    "行動タイプ:",
    "- speak: 会話・交渉・宣言",
    "- skill_check: 調査・回避・聞き耳など（skill: dodge, spot_hidden, listen, persuade 等）",
    "- move: 場所移動・扉に入る（location に目的地）",
    "- wait: 様子見",
    "",
    "禁止:",
    "- ダイス結果の決定",
    "- 状態変更",
    "- 地の文・説明文（[action] のみ）",
    "",
    "必ず [action]...[/action] のみ返すこと。",
  ].join("\n");
}

export function buildPlayerUserPrompt(ctx: PlayerPromptContext): string {
  const parts = [
    `キャラクター: ${ctx.playerName}`,
    `ターン: ${ctx.turn}`,
    `現在地: ${ctx.location}`,
    `フェーズ: ${ctx.phase}`,
    `現シーン: ${ctx.scenePageId}`,
  ];

  if (ctx.npcsPresent && ctx.npcsPresent.length > 0) {
    parts.push("", "近くのNPC:", ...ctx.npcsPresent.map((n) => `- ${n}`));
  }

  parts.push("", "シナリオ上の選択肢（参考）:", ctx.sceneBranches);

  if (ctx.combatHint) {
    parts.push("", ctx.combatHint);
  }

  parts.push(
    "",
    "既知:",
    ...(ctx.knownFacts.length > 0
      ? ctx.knownFacts.map((f) => `- ${f}`)
      : ["- （特になし）"]),
  );

  if (ctx.conversationHistory) {
    parts.push("", "これまでのやりとり:", ctx.conversationHistory);
  }

  parts.push("", "直近のGM描写:", ctx.lastGmNarration);

  if (ctx.phase === "combat") {
    parts.push(
      "",
      "戦闘中です。回避するなら skill_check（skill: dodge, target: 回避）を使うこと。",
    );
  } else if (ctx.phase === "dialog") {
    parts.push("", "会話・交渉には speak を使うこと。");
  } else {
    parts.push("", "扉に入る・移動するなら move、調べるなら skill_check、話すなら speak。");
  }

  return parts.join("\n");
}
