# AI TRPG Auto Session System - Product Overview v2

## 概要

本プロジェクトは、複数のAIエージェントのみでTRPGセッションを自律進行するシステムである。

特徴：

* 市販TRPGシナリオ対応
* 人間GM不要
* 人間PL不要
* AIのみでセッション進行
* 長時間セッション対応
* 秘匿情報管理
* 将来的な観戦・配信対応

システムは：

* GM AI
* PL AI
* Scenario Parser
* TypeScript Game Engine
* Rule Engine
* Memory System

によって構成される。

---

# 最重要設計思想

# 「AI = 演技」

# 「TypeScript = 世界」

AIは世界を変更しない。

TypeScript側が：

* 真実
* 状態
* 判定
* 秘匿
* イベント

を完全管理する。

---

# AIの責務

AIが担当するもの：

* ロールプレイ
* 会話
* 推理
* 感情表現
* 行動宣言
* 演出

AIが禁止されるもの：

* ダイス結果決定
* 状態変更
* 真相変更
* NPC追加
* イベント生成
* アイテム生成
* 情報確定

---

# TypeScript側責務

TSエンジンが以下を管理：

* ダイス
* 判定
* HP/SAN
* ステータス
* インベントリ
* 秘匿情報
* シナリオ状態
* NPC状態
* イベント
* ターン
* 情報開示

---

# システム構成

```text id="5isxra"
TXT Scenario
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
┌────────────┐
│            │
GM Agent   PL Agents
│            │
└─────┬──────┘
      ↓
Command Parser
      ↓
Rule Engine
      ↓
Dice / Status / Events
```

---

# 技術スタック

* TypeScript
* Node.js
* Bun
* Cohere API
* Cohere Embed
* zod
* yaml
* vector DB
* vitest

---

# 市販シナリオ対応

## 基本方針

市販TRPGシナリオは：

* 自然文
* GM向け注釈
* 秘匿情報
* 曖昧表現

を含むため、完全yaml化を前提としない。

---

# 採用方針

## 「txt + 自動解析 + キャッシュ」

を採用する。

---

# フロー

```text id="fzc8pc"
Scenario TXT
      ↓
Scenario Analyzer AI
      ↓
構造化データ生成
      ↓
JSON Cache保存
      ↓
Game Engine使用
```

---

# 目的

yamlを人間が手作業で書かない。

AI Parserが：

* NPC
* 場所
* イベント
* HO
* 秘匿情報
* エンディング

を抽出する。

---

# Scenario Parser

Parser AIはゲームAIとは別。

役割分離を徹底する。

---

# NG例

```text id="8eq1zr"
GM AIが直接シナリオtxt全文を読む
```

問題：

* 情報漏洩
* 真相破壊
* 長文劣化
* 設定忘却

---

# 正しい構成

```text id="v24m3e"
Scenario Parser
      ↓
Structured Scenario
      ↓
GM AI
```

---

# Scenario Cache

解析結果はキャッシュ保存。

---

# ディレクトリ構成

```text id="u2n0s0"
scenarios/
  murder.txt

cache/
  murder.parsed.json
```

---

# ParsedScenario

```ts id="4v9a9f"
type ParsedScenario = {
  title: string;

  locations: Location[];

  npcs: NPC[];

  clues: Clue[];

  hiddenInfo: HiddenInfo[];

  events: Event[];

  endings: Ending[];
};
```

---

# Canon System

シナリオの「絶対変更禁止情報」を保持する。

---

# Canon例

```ts id="zjlwm8"
type Canon = {
  culprit: string;

  trueEvents: string[];

  mandatoryClues: string[];

  endings: string[];
};
```

---

# 重要思想

# 「シナリオ本文 = 真実」

# 「GM AI = 解釈者」

GMは真実を持たない。

真実はTS側DBが保持する。

---

# RAGシステム

長文シナリオ対策としてRAGを採用する。

---

# フロー

```text id="p0d4vu"
Scenario TXT
     ↓
Chunk Splitter
     ↓
Embedding生成
     ↓
Vector DB
     ↓
Scenario Retriever
     ↓
GM Context Builder
```

---

# 目的

必要部分だけ取得する。

全文を毎回LLMへ渡さない。

---

# Cohere活用

使用予定：

* Cohere Command R+
* Cohere Embed v3
* Cohere Rerank

---

# Context構成

## GM Context

GMは：

* 現在シーン
* 必要描写
* 関連NPC
* 関連イベント

のみ取得。

---

## PL Context

PLには：

* 自分の知識
* 自分のHO
* 公開情報

のみ与える。

---

# 秘匿情報管理

最重要管理対象。

---

# Player Context

```ts id="4g6a0o"
privateContext[playerId]
knownFacts[playerId]
```

---

# HO（秘匿ハンドアウト）

PLごとに：

* 目的
* 秘密
* 狂気
* 背景

を分離管理。

---

# ゲーム進行

フェーズ制を採用。

---

# 基本ループ

```text id="dlb79q"
1. GM描写
2. PL行動
3. 判定
4. 結果描写
5. 状態更新
```

---

# コマンドシステム

AIは構造化コマンドを返す。

---

# 例

```text id="55m5bf"
[action]
type: skill_check
skill: spot_hidden
target: bookshelf
reason: 本棚を調べる
[/action]
```

---

# Rule Engine

TS側が：

* ダイス
* 成否
* クリティカル
* ファンブル

を決定する。

---

# 結果返却

```text id="wyu4ye"
[result]
roll: 12
target: 65
success: true
critical: false
[/result]
```

---

# GameState

```ts id="w0i0sz"
type GameState = {
  turn: number;

  phase:
    | "exploration"
    | "dialog"
    | "combat";

  players: PlayerState[];

  npcs: NPCState[];

  discoveredClues: string[];

  activeEvents: string[];

  location: string;
};
```

---

# Memory System

LLMへ全ログを渡さない。

要約メモリを生成する。

---

# Memory構造

```ts id="fydhhn"
type Memory = {
  summary: string;

  importantFacts: string[];

  unresolvedThreads: string[];
};
```

---

# Director AI

将来的に追加可能。

役割：

* 矛盾検知
* セッション停滞検知
* 会話整理
* テンポ改善

ゲーム進行には介入しない。

---

# 優先実装順

## Phase 1

* txt読み込み
* GM AI
* 単一PL
* ダイス
* 状態管理

---

## Phase 2

* Scenario Parser
* JSON Cache
* 複数PL
* HO
* Memory

---

## Phase 3

* RAG
* Vector Search
* Canon System
* Director AI

---

# 開発ルール

* AIを信用しない
* 状態はTS側管理
* 出力は必ず構造化
* zodで全検証
* ログ重視
* リトライ可能設計
* パース失敗前提

---

# 非目標

現段階では以下を対象外とする：

* 音声
* 3D
* MMO
* リアルタイムマルチサーバ
* 完全自律世界生成

---

# 最終目標

「人間が観戦して面白い、破綻しにくいAI TRPGセッションシステム」を実現すること。
