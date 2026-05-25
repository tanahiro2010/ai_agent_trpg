# シナリオとアクション仕様

## 1. シナリオ入力（txt）

本プロジェクトは、まず `txt` を直接読み込むMVP構成です。

- 読み込み: `src/scenario/loader.ts`
- 型: `RawScenario { title, path, content }`

## 2. タイトル抽出ルール

`loadScenarioTxt()` は以下優先順でタイトルを抽出します。

1. Markdown見出し (`# タイトル`)
2. 括弧タイトル (`【タイトル】`)
3. 最初の有効行
4. ファイル名（`.txt`除去）

## 3. 公開抜粋の生成

`getPublicScenarioExcerpt()` はGM/PLへ渡す本文を作ります。

- GM向けセクション（`## GMメモ` など）を削除
- 文字数上限を超える場合は末尾を省略文付きで切り詰め

これにより、不要な秘匿情報の露出を抑えます。

## 4. PLアクション形式

PLは必ず以下形式で出力します。

```text
[action]
type: ...
...
[/action]
```

許可アクション型:

- `skill_check`
- `speak`
- `move`
- `wait`

## 5. パースと修復

`src/parser/command-parser.ts` の流れ:

1. `[action]` ブロック抽出
2. `key: value` 行を辞書化
3. 軽微な修復（例: `action`→`type`, `investigate`→`skill_check`）
4. zodスキーマ検証

失敗時は再プロンプトして再出力させるリトライ戦略を取ります。

## 6. 判定との接続

- `skill_check` のみダイス判定を実行
- スキル値は `PlayerState.skills` から解決（未定義時は25）
- 成功時には手がかりIDを `discoveredClues` に追加

## 7. 実装上の注意

- Scenario Parser AI (`scenario-parser.ts`) は現時点で未実装
- シナリオの構造化・RAG統合は将来フェーズの対象
