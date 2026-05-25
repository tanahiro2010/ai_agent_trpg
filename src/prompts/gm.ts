export type GMPromptContext = {
  scenarioExcerpt: string;
  location: string;
  phase: string;
  turn: number;
  publicClues: string[];
  conversationHistory?: string;
  npcsPresent?: string[];
  lastPlayerAction?: string;
  lastDiceResult?: string;
};

export function buildGMSystemPrompt(): string {
  return [
    "あなたはクトゥルフ神話TRPG／テーブルトーク系シナリオのGM（ゲームマスター）です。",
    "",
    "役割:",
    "- 場面・雰囲気・五感の描写",
    "- 登場NPCの台詞（「」で会話を書く）",
    "- プレイヤーの会話（speak）への応答",
    "- 判定結果に沿った結果描写",
    "",
    "会話の書き方:",
    "- NPCが話す場面では必ずセリフを含める",
    "- 例: 店主が静かに言った。「……ようこそ。夜道は危いですよ。」",
    "- プレイヤーが話しかけた内容には、NPCが自然に返答する",
    "",
    "禁止:",
    "- ダイス目・成功失敗の決定（[result]を唯一の真実とする）",
    "- HP/SANの変更",
    "- シナリオに無い重大な真相・犯人の確定",
    "- 新規NPCの大量追加（既存NPCの反応は可）",
    "",
    "出力:",
    "- 描写と会話のみ（200〜500字程度）",
    "- [action]ブロックは出力しない",
  ].join("\n");
}

export function buildGMUserPrompt(ctx: GMPromptContext): string {
  const parts = [
    `ターン: ${ctx.turn}`,
    `フェーズ: ${ctx.phase}`,
    `現在地: ${ctx.location}`,
  ];

  if (ctx.npcsPresent && ctx.npcsPresent.length > 0) {
    parts.push("", "場にいるNPC:", ...ctx.npcsPresent.map((n) => `- ${n}`));
  }

  parts.push(
    "",
    "シナリオ資料（描写の参考。秘匿を勝手に公開しないこと）:",
    ctx.scenarioExcerpt,
  );

  if (ctx.conversationHistory) {
    parts.push("", "これまでの会話・描写:", ctx.conversationHistory);
  }

  if (ctx.publicClues.length > 0) {
    parts.push("", "発見済み手がかり:", ...ctx.publicClues.map((c) => `- ${c}`));
  }

  if (ctx.lastPlayerAction) {
    parts.push("", "直前のPL行動:", ctx.lastPlayerAction);
    if (ctx.phase === "dialog") {
      parts.push(
        "※会話フェーズです。PLの発言に対し、NPCの返答（セリフ）を必ず含めて描写してください。",
      );
    }
  }

  if (ctx.lastDiceResult) {
    parts.push("", "判定結果（TS確定・この結果を変更しないこと）:", ctx.lastDiceResult);
    parts.push(
      "成功なら新情報・進展を描写。失敗なら曖昧・誤解・危険の兆候を描写。",
    );
  } else if (ctx.turn === 1 && !ctx.lastPlayerAction) {
    parts.push("", "オープニング描写を書いてください。シナリオ冒頭の情景から始めてください。");
  } else if (!ctx.lastDiceResult && ctx.lastPlayerAction) {
    parts.push("", "PL行動への結果描写（会話ならNPCの返答を含める）を書いてください。");
  } else {
    parts.push("", "上記に基づき、次のGM描写を出力してください。");
  }

  return parts.join("\n");
}
