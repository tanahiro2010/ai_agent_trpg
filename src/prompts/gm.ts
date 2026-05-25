export type GMPromptContext = {
  scenarioTitle: string;
  scenePageId: string;
  scenePageNumber: number;
  sceneBody: string;
  sceneBranches: string;
  location: string;
  phase: string;
  turn: number;
  playerName: string;
  publicClues: string[];
  conversationHistory?: string;
  npcsPresent?: string[];
  lastPlayerAction?: string;
  lastDiceResult?: string;
  sceneTransition?: string;
};

export function buildGMSystemPrompt(): string {
  return [
    "あなたはTRPGのGM（ゲームマスター）です。",
    "",
    "役割:",
    "- 現在シーンの状況・NPCの台詞・雰囲気のみを描写する",
    "- プレイヤーキャラクターのセリフや行動は絶対に書かない",
    "",
    "会話:",
    "- NPCの台詞のみ「」で書く",
    "- プレイヤーが話した内容は繰り返さず、NPCの反応だけ書く",
    "",
    "厳守:",
    "- シナリオ全文の先読み・ページ先取り禁止（渡された現シーンのみ）",
    "- ダイス結果の決定禁止（[result]があるときのみ従う）",
    "- HP/SAN変更・新規NPC大量追加禁止",
    "- [T1 GM] などのメタ表記禁止",
    "- 「探索者たち」ではなくプレイヤー名で二人称（あなた）",
    "",
    "分量: 150〜400字。",
  ].join("\n");
}

export function buildGMUserPrompt(ctx: GMPromptContext): string {
  const parts = [
    `シナリオ: ${ctx.scenarioTitle}`,
    `現シーン: ${ctx.scenePageId}（${ctx.scenePageNumber}ページ）`,
    `ターン: ${ctx.turn}`,
    `フェーズ: ${ctx.phase}`,
    `現在地: ${ctx.location}`,
    `プレイヤー: ${ctx.playerName}`,
  ];

  if (ctx.sceneTransition) {
    parts.push("", "【シーン遷移・TS確定】", ctx.sceneTransition);
  }

  if (ctx.npcsPresent && ctx.npcsPresent.length > 0) {
    parts.push("", "場にいるNPC:", ...ctx.npcsPresent.map((n) => `- ${n}`));
  }

  parts.push(
    "",
    "── 現シーンのシナリオ本文（この範囲だけを根拠にすること）──",
    ctx.sceneBody,
    "── ここまで ──",
    "",
    "分岐（TSが処理。GMは勝手にページを進めない）:",
    ctx.sceneBranches,
  );

  if (ctx.conversationHistory) {
    parts.push("", "直近のやりとり（参考）:", ctx.conversationHistory);
  }

  if (ctx.publicClues.length > 0) {
    parts.push("", "到達済みシーン:", ...ctx.publicClues.map((c) => `- ${c}`));
  }

  if (ctx.lastPlayerAction) {
    parts.push("", "直前のPL行動（TS確定）:", ctx.lastPlayerAction);
    parts.push("PLの台詞を代わりに書かず、NPC・世界の反応のみ描写すること。");
  }

  if (ctx.lastDiceResult) {
    parts.push("", "判定結果（TS確定）:", ctx.lastDiceResult);
  }

  if (ctx.turn === 1 && !ctx.lastPlayerAction) {
    parts.push("", "オープニング: 上記シーン本文の冒頭状況から描写を始める。");
  } else if (ctx.lastPlayerAction) {
    parts.push("", "上記PL行動に対する結果描写（NPCの返答・情景の変化）。");
  }

  return parts.join("\n");
}
