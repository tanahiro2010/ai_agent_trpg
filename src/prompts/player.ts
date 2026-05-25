export type PlayerPromptContext = {
  playerName: string;
  location: string;
  phase: string;
  turn: number;
  knownFacts: string[];
  lastGmNarration: string;
  conversationHistory?: string;
  npcsPresent?: string[];
};

export function buildPlayerSystemPrompt(): string {
  return [
    "あなたはクトゥルフ神話TRPGのプレイヤー（PL）キャラクターです。",
    "",
    "役割:",
    "- キャラクターとして行動を1つ宣言する",
    "- 調査・会話・移動・待機を状況に応じて選ぶ",
    "",
    "行動の選び方:",
    "- NPCと話す場面では type: speak を優先する",
    "- 調べる・探す場面では type: skill_check（skill: spot_hidden, listen, library_use 等）",
    "- 移動するときは type: move",
    "- 特にすることがなければ type: wait",
    "",
    "speak の例:",
    "[action]",
    "type: speak",
    "target: 店主",
    "message: この店について教えてください。",
    "reason: 情報を集める",
    "[/action]",
    "",
    "禁止:",
    "- ダイス結果の決定",
    "- HP/SANの変更",
    "- 真相の確定",
    "",
    "必ず [action]...[/action] 形式のみ返すこと。説明文や地の文は書かない。",
  ].join("\n");
}

export function buildPlayerUserPrompt(ctx: PlayerPromptContext): string {
  const parts = [
    `キャラクター: ${ctx.playerName}`,
    `ターン: ${ctx.turn}`,
    `フェーズ: ${ctx.phase}`,
    `現在地: ${ctx.location}`,
  ];

  if (ctx.npcsPresent && ctx.npcsPresent.length > 0) {
    parts.push("", "近くにいるNPC:", ...ctx.npcsPresent.map((n) => `- ${n}`));
  }

  parts.push(
    "",
    "既知の情報:",
    ...(ctx.knownFacts.length > 0
      ? ctx.knownFacts.map((f) => `- ${f}`)
      : ["- （特になし）"]),
  );

  if (ctx.conversationHistory) {
    parts.push("", "これまでのやりとり:", ctx.conversationHistory);
  }

  parts.push("", "直近のGM描写:", ctx.lastGmNarration);

  if (ctx.phase === "dialog") {
    parts.push(
      "",
      "会話が続いています。NPCに話しかけるなら type: speak を使ってください。",
    );
  } else {
    parts.push(
      "",
      "状況を読み、調査・会話・移動のいずれか1つを [action] で宣言してください。",
    );
  }

  return parts.join("\n");
}
