# CLI / 運用ガイド

## 1. 実行コマンド

```bash
bun run src/index.ts [options]
```

## 2. オプション一覧

- `--scenario <path>`
  - シナリオtxtを指定
  - 省略時: `scenarios/sample.txt`
- `--mock`
  - Mock LLMを使用（デフォルト）
- `--cohere`
  - Cohere APIを使用
- `--turns <n>`
  - 最大ターン数（既定4）
- `--include-raw`
  - rawログをコンソールにも表示
- `--story <log.jsonl>`
  - ログ再生モード（API不要）
- `-h, --help`
  - ヘルプ表示

## 3. 実行モード

### 3.1 Play mode

実際にセッションを回すモードです。

```bash
bun run src/index.ts --scenario scenarios/sample.txt --mock --turns 4
```

### 3.2 Story replay mode

既存ログを読み、人間が読みやすい物語形式に整形します。

```bash
bun run src/index.ts --story logs/session-*.jsonl
```

## 4. 環境変数

`.env`（プロジェクトルート）を `loadProjectEnv()` が読み込みます。

- `COHERE_API_KEY`（必須: `--cohere` 使用時）
- `COHERE_MODEL`（任意）
- `COHERE_MAX_TOKENS`（任意）

## 5. ログ運用

## 5.1 出力先

- デフォルト: `logs/`
- 形式: JSON Lines（1行1JSON）

## 5.2 代表カテゴリ

- `session`: 開始・終了
- `gm`: GM描写
- `pl`: PL行動
- `dice`: 判定結果
- `progress`: 進行サマリ
- `event`: 内部イベント
- `ai-raw`: LLMの生応答

`--include-raw` 未指定時は、TRPG進行に必須なカテゴリのみコンソールに表示されます。  
ただし `ai-raw` を含む全カテゴリはファイルに保存されます。

## 6. 推奨の開発コマンド

```bash
bun run typecheck
bun test
```

## 7. 失敗時チェックリスト

1. Bunが導入済みか
2. `bun install` 実行済みか
3. `--cohere` 利用時に `COHERE_API_KEY` が設定されているか
4. `--scenario` / `--story` のパスが正しいか
