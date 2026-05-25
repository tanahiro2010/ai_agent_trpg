# AI Agent TRPG (`ai_trpg`)

AIエージェント（GM/PL）でTRPGセッションを進行し、TypeScript側で状態・判定を厳密管理する実験プロジェクトです。  
設計原則は **「AI = 演技」「TypeScript = 世界」** です。

## 目次

- [プロジェクト概要](#プロジェクト概要)
- [現状の実装範囲](#現状の実装範囲)
- [クイックスタート](#クイックスタート)
- [CLIの使い方](#cliの使い方)
- [ログ仕様](#ログ仕様)
- [設計とドキュメント](#設計とドキュメント)
- [テスト](#テスト)
- [既知の制約](#既知の制約)

## プロジェクト概要

このリポジトリは、以下の責務分離でTRPGを実行します。

- **GM Agent**: 描写・会話・演出
- **Player Agent**: 構造化された行動宣言（`[action]...[/action]`）
- **TypeScript Engine**: ターン進行、判定、状態更新、ログ
- **Rule Engine**: ダイス処理（d100）と成功/失敗決定
- **Parser/Validation**: AI出力の構文抽出と zod 検証

## 現状の実装範囲

実装済み（MVP）:

- 単一PLでのターン進行
- `skill_check / speak / move / wait` の4アクション
- d100判定（クリティカル/ファンブル含む）
- セッションログ保存（JSONL）
- ストーリーリプレイ表示（ログ再生）
- Cohere API または Mock LLM で実行

未実装・プレースホルダ:

- Scenario Parser AI 本体（`src/parser/scenario-parser.ts`）
- RAG/ベクトル検索
- Director AI
- 複数PL本格対応

## クイックスタート

### 1) 前提

- [Bun](https://bun.com) が必要です。

### 2) 依存インストール

```bash
bun install
```

### 3) 環境変数（Cohere利用時）

`.env.example` を参考に `.env` を作成します。

```bash
COHERE_API_KEY=your_api_key_here
# COHERE_MODEL=command-r-plus-08-2024
# COHERE_MAX_TOKENS=2048
```

### 4) 実行

Mock LLM（デフォルト）:

```bash
bun run src/index.ts
```

Cohere使用:

```bash
bun run src/index.ts --cohere
```

## CLIの使い方

```bash
bun run src/index.ts [options]
```

主なオプション:

- `--scenario <path>`: シナリオtxt（デフォルト: `scenarios/sample.txt`）
- `--mock`: Mock LLMを使用（デフォルト）
- `--cohere`: Cohere APIを使用（`COHERE_API_KEY`必須）
- `--turns <n>`: 最大ターン数（デフォルト: `4`）
- `--include-raw`: raw AI/Parser/APIログもコンソール表示
- `--story <log.jsonl>`: ログからストーリー再生モード
- `-h, --help`: ヘルプ表示

### 実行例

```bash
# sampleシナリオを3ターンだけ実行
bun run src/index.ts --scenario scenarios/sample.txt --turns 3

# ログを読みやすい物語形式で再生
bun run src/index.ts --story logs/session-2026-01-01T00-00-00-000Z.jsonl
```

## ログ仕様

セッションログは常に `logs/session-<timestamp>.jsonl` に保存されます。

主なカテゴリ:

- `session`: セッション開始/終了
- `gm`: GM描写
- `pl`: PL行動（構造化済み）
- `dice`: 判定結果
- `progress`: 進行サマリ（場所/フェーズ/手がかり）
- `event`: エンジン内部イベント
- `ai-raw`: LLM生応答（常にファイル保存、表示はオプション依存）

## 設計とドキュメント

詳細は `docs/` を参照してください。

- [docs/architecture.md](docs/architecture.md)
- [docs/cli-and-operations.md](docs/cli-and-operations.md)
- [docs/scenario-and-actions.md](docs/scenario-and-actions.md)

補助資料（設計メモ）:

- `.cursor/overview.md`
- `.cursor/architecture.md`

## テスト

```bash
# 型検査
bun run typecheck

# テスト
bun test
```

## 既知の制約

- Bunランタイム依存のため、Node単体ではそのまま動作しません。
- 現在の初期状態は固定（1PL、NPC1体、初期ロケーション固定）です。
- Scenario Parser/RAGなどは今後実装予定です。
