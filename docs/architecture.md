# アーキテクチャ詳細

## 1. 設計原則

- **AI = 演技**: AIは描写・会話・行動宣言のみ担当
- **TypeScript = 世界**: 状態・判定・イベントはTS側が唯一の真実として管理

このため、AIは「ゲーム世界の確定情報」を直接更新しません。

## 2. 主要コンポーネント

### `src/engine/`

- `game-engine.ts`: セッション進行の中核
- `turn-manager.ts`: ターン継続判定とターン加算
- `phase-manager.ts`: PL行動からフェーズ遷移（`speak`→`dialog`、それ以外→`exploration`）
- `event-bus.ts`: イベント発行/購読

### `src/agents/`

- `gm/gm-agent.ts`: GM描写生成
- `player/player-agent.ts`: PL行動生成（構造化アクション必須）

### `src/parser/`

- `command-parser.ts`: `[action]...[/action]` の抽出と検証
- `scenario-parser.ts`: 現状プレースホルダ（未実装）

### `src/rules/`

- `dice/dice-engine.ts`: d100判定ロジック
- `skills/skill-resolver.ts`: プレイヤースキル値を使った判定解決

### `src/state/`

- `game-state.ts`: 全体状態
- `player-state.ts`: PLステータス
- `npc-state.ts`: NPC状態

### `src/llm/`

- `mock-provider.ts`: 固定スクリプト返答
- `cohere-provider.ts`: Cohere v2 chat API

## 3. 実行フロー（1ターン）

1. ターン開始（`TURN_STARTED`）
2. 初回のみGMオープニング描写
3. PLが行動宣言
4. parser + zod で検証
5. 必要に応じて判定実行（`DICE_ROLLED`）
6. フェーズ・状態更新（`STATE_UPDATED` など）
7. GMが結果描写
8. ターン終了（`TURN_ENDED`）

## 4. 状態モデル

`GameState` は以下を持ちます。

- `turn`
- `phase`（`exploration | dialog | combat`）
- `players`
- `npcs`
- `discoveredClues`
- `activeEvents`
- `location`

設計上、状態更新は破壊的変更を避けた関数更新を優先しています。

## 5. イベントモデル

代表イベント:

- `PLAYER_ACTION`
- `DICE_ROLLED`
- `LOCATION_CHANGED`
- `TURN_STARTED` / `TURN_ENDED`
- `GM_NARRATION`
- `STATE_UPDATED`

イベントは監査・デバッグ用途のログにも使われます。

## 6. 責務境界（重要）

- AIは判定結果を決めない
- AIはHP/SANなどを直接変更しない
- TS側が判定・更新・真実保持を実施

この境界により、LLMの幻覚やフォーマット破綻による破綻を抑制します。
