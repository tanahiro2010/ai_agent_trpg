# architecture.md

## 概要

本ドキュメントは、AI TRPG Auto Session System のアーキテクチャ構成と責務分離を定義する。

本システムでは：

* AI = 演技
* TypeScript = 世界

という原則を厳守する。

AIにゲーム状態の決定権を与えない。

---

# システム全体構成

```text id="4fz50q"
Scenario TXT
     ↓
Scenario Parser
     ↓
Scenario Cache(JSON)
     ↓
Scenario Retriever(RAG)
     ↓
Game Engine
     ↓
State Manager
     ↓
┌─────────────┐
│             │
GM Agent    PL Agents
│             │
└──────┬──────┘
       ↓
Command Parser
       ↓
Rule Engine
       ↓
Dice / Status / Events
```

---

# 基本原則

## 1. 状態は必ずTS側が保持する

AIは禁止：

* HP変更
* SAN変更
* 判定結果決定
* イベント発火
* 真相変更

すべてTS Engineが行う。

---

## 2. AI出力は信頼しない

AI出力は：

* パース失敗
* JSON崩壊
* 不正コマンド
* 幻覚

を前提とする。

すべてzod等で検証する。

---

## 3. モジュール責務を厳密分離する

各層は責務を越境しない。

---

# ディレクトリ構成

```text id="w2o7gj"
src/
  index.ts

  agents/
    gm/
    player/
    director/

  engine/
    game-engine.ts
    turn-manager.ts
    phase-manager.ts

  rules/
    dice/
    sanity/
    combat/
    skills/

  parser/
    scenario-parser.ts
    command-parser.ts

  scenario/
    loader.ts
    retriever.ts
    chunker.ts
    cache/

  memory/
    summarizer.ts
    memory-store.ts

  rag/
    embeddings.ts
    vector-store.ts
    reranker.ts

  state/
    game-state.ts
    player-state.ts
    npc-state.ts

  prompts/
    gm.ts
    player.ts
    parser.ts
    director.ts

  protocols/
    action.ts
    result.ts
    event.ts

  utils/
    logger.ts
    retry.ts
    validation.ts

  types/
    scenario.ts
    events.ts
    actions.ts
```

---

# レイヤー責務

## agents/

AIエージェント層。

責務：

* ロールプレイ
* 会話
* 推理
* 行動宣言

禁止：

* 状態変更
* 判定決定
* 真相変更

---

## engine/

ゲーム進行管理。

責務：

* ターン管理
* フェーズ進行
* エージェント呼び出し
* 状態更新

本システムの中心。

---

## rules/

ルール処理。

責務：

* ダイス
* 判定
* SAN処理
* 戦闘

AIから完全分離。

---

## parser/

解析処理。

### scenario-parser

txtシナリオ解析。

### command-parser

AI出力解析。

---

## scenario/

シナリオ管理。

責務：

* txt読み込み
* chunk分割
* キャッシュ
* retrieval

---

## memory/

長期記憶。

責務：

* 要約
* 重要情報保持
* 未解決事項保持

---

## rag/

RAG専用。

責務：

* embedding
* vector検索
* rerank

---

## state/

唯一の真実の保存場所。

責務：

* GameState
* PlayerState
* NPCState

AIはここを書き換え不可。

---

## prompts/

Prompt定義。

責務：

* GM Prompt
* PL Prompt
* Parser Prompt

コード内直書き禁止。

---

## protocols/

AI通信仕様。

責務：

* action schema
* result schema
* event schema

---

# 依存方向

重要。

依存循環禁止。

---

# 正しい依存

```text id="k6eqyy"
agents → protocols
agents → prompts

engine → agents
engine → state
engine → rules

rules → state

parser → protocols

scenario → parser

memory → state
```

---

# 禁止依存

```text id="ztb9mq"
agents → state
agents → rules

rules → agents

state → agents
```

---

# Game Engine

## 役割

システム中核。

---

# 処理フロー

```text id="0w0cxf"
1. 状態取得
2. context構築
3. AI呼び出し
4. command parse
5. validation
6. rule execution
7. state update
8. memory update
9. event emit
```

---

# AI Context設計

## GM Context

含む：

* 現在地
* シーン情報
* 関連NPC
* 必要イベント
* 公開情報

含まない：

* 不要全文
* 将来イベント全文

---

## PL Context

含む：

* 自分HO
* 自分知識
* 公開情報

含まない：

* 他PL秘匿
* 真相
* GM情報

---

# State設計

## GameState

ゲーム全体状態。

---

# 原則

Stateはimmutable寄りで扱う。

破壊的変更を避ける。

---

# 例

```ts id="2gw2fo"
type GameState = {
  turn: number;

  phase:
    | "exploration"
    | "dialog"
    | "combat";

  players: PlayerState[];

  npcs: NPCState[];

  events: EventState[];

  location: string;
};
```

---

# Event駆動

EventEmitterベース推奨。

---

# イベント例

```text id="u7l2w7"
PLAYER_ACTION
DICE_ROLLED
SAN_CHANGED
EVENT_TRIGGERED
LOCATION_CHANGED
```

---

# Memory設計

長期ログ全文保持禁止。

---

# Memory構造

```ts id="zthf52"
type Memory = {
  summary: string;

  importantFacts: string[];

  unresolvedThreads: string[];
};
```

---

# シナリオ解析

## 初回

```text id="a3dx4c"
TXT
 ↓
Parser AI
 ↓
Parsed JSON
 ↓
Cache保存
```

---

## 以降

cache使用。

---

# RAG

全文投入禁止。

必要箇所のみretrieve。

---

# Chunk設計

推奨：

* 500〜1200 token
* scene単位
* NPC単位

---

# Canon System

絶対変更禁止情報。

---

# 例

```ts id="8t3h8x"
type Canon = {
  culprit: string;

  mandatoryClues: string[];

  endings: string[];
};
```

---

# Prompt設計原則

Promptは：

* 小さく
* 責務限定
* 出力形式固定

---

# 悪い例

```text id="v8r4rk"
自由にTRPGを進行してください
```

---

# 良い例

```text id="3m1knx"
あなたはGMです。

役割:
- 描写
- NPC会話

禁止:
- 判定決定
- 真相変更
```

---

# エラー処理

必須。

---

# AI出力失敗時

```text id="yhh46s"
parse失敗
 ↓
repair attempt
 ↓
retry
 ↓
fallback
```

---

# ログ

全イベント記録。

---

# 必須ログ

* AI raw response
* parsed action
* dice result
* state diff
* event logs

---

# Bun前提

Runtime:

* Bun

---

# 実行

```bash id="ys42pi"
bun run src/index.ts
```

---

# テスト

```bash id="weptql"
bun test
```

---

# Package Manager

```bash id="5wqwbk"
bun add
```

---

# MVP優先事項

まず以下のみ作る：

* CLI
* txt読込
* GM AI
* 1PL
* ダイス
* 状態管理

RAGやDirector AIは後回し。

---

# 非目標

現段階では：

* Web UI
* MMO化
* 分散サーバ
* 音声合成
* 3D

は対象外。

---

# 最終目標

「破綻しにくく、人間が観戦して面白いAI TRPGセッション」を実現すること。
