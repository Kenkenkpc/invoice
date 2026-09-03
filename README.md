# 海外発送インボイス作成（Commercial / Proforma Invoice）

質問に順番に答えるだけで、Commercial InvoiceまたはProforma Invoiceの下書き・正式版を作成し、
Googleスプレッドシート（社内テンプレートのコピー）として出力するWebアプリです。

## 1. 起動方法

Node.jsなどのビルド環境は不要です。静的ファイルをそのまま配信するだけで動きます。

```bash
cd "インボイス作成ソフト"
python3 -m http.server 8743
```

ブラウザで `http://localhost:8743/` を開いてください。

Google Sheets連携を使う場合は、事前に [`docs/google-setup.md`](docs/google-setup.md) の手順で
OAuthクライアントIDを設定してください（未設定でも質問回答・下書き保存・印刷プレビューは使えます）。

## 2. データの保存について

- 回答内容は、**このブラウザのlocalStorage（この端末・このブラウザ内）にのみ**自動保存されます。
  サーバーには送信されません。
- 削除したい場合は、画面右上の「下書きを削除」ボタンを押すと、この端末から即座に消えます。
- Googleへの接続に使うアクセストークンは、ブラウザのメモリ内にのみ保持し、保存・ログ出力しません。

## 3. 実装済み機能

- 質問形式のフロー（目的→書類種類→送り主→買主→配送先→輸入者→商品→取引条件→梱包→書類情報→最終確認）
  - 質問の文言・分岐・入力チェック・表示条件は `src/rules/screens.js` / `src/rules/validation.js` /
    `src/rules/templateMapping.js` に集約し、画面コードに散らばらないようにしています。
- 「わからない」「該当しない」「未入力」「入力済み」「確認済み」を区別するフィールド状態モデル
  （`src/domain/types.js`）。0や`false`を空欄・不明と誤認しません。
- 下書きの自動保存・再開、前へ戻っても回答を保持、進捗ドット表示。
- 買主と配送先／輸入者の「同じ・違う・わからない」分岐（わからない場合は自動的に買主と同一にしない）。
- 商品カードの追加・複製・編集・削除、素材・用途からの英語説明の下書き自動合成（AI不使用）。
- 無料サンプルの単価「わからない」を0円扱いにしない（外部確認事項として明示）。
- HSコード・郵便番号・SKU・追跡番号などは文字列として保持（先頭ゼロ等を失わない）。
- 金額計算はBigInt固定小数点で行い、通貨ごとの小数桁とExcel/Sheetsと同じ四捨五入（ROUND）を再現
  （`src/domain/money.js`）。送料込み価格の場合は追加運賃を二重加算しません。
- 3種類の入力チェック（形式・計算エラー／必要情報の不足／外部確認事項）と、
  未解決の必須項目がある場合の自動DRAFT判定（`src/rules/validation.js`）。
- A4印刷・PDF保存プレビュー（`src/print/printView.js`）。テンプレートの30商品/3ページ制限を
  アプリの制限にせず、任意件数でページを動的に分割します（空ページなし、1商品の行を分断しない）。
- Googleスプレッドシート出力（`src/google/sheetsExport.js`）。テンプレート全体をコピーし、
  Header/Itemsシートに反映。31商品目以降は印刷用シート（Invoice_4以降）とItems行・集計式を
  自動拡張します。作成後にコピー先を読み戻して検証します。

## 4. テンプレートとの対応

参照テンプレート（Googleスプレッドシート `export-invoice-template`、
`assets/export-invoice-template.reference.xlsx` に同一内容を保存）の実ファイルを取得し、
Header/Items/Invoice_1〜3の実セル・数式を確認したうえで、`src/rules/templateMapping.js` に
セル対応表として一箇所にまとめています。UI画面にはセル番地やテンプレート固有の呼称は出しません。

`src/google/invoicePageFormulas.js` の31商品目以降のページ生成ロジックは、実テンプレートの
Invoice_2/Invoice_3シートの実際の数式との回帰テスト（`tests/invoiceFormulas.test.js`）で
一致を確認しています。

## 5. 検証結果

Node.jsが利用できない開発環境だったため、macOS標準のJavaScriptCore
（`osascript -l JavaScript`）を使った軽量テストランナー（`tests/jscore_run.py`）でロジックの
単体テストを実行し、あわせてChrome DevTools Protocol経由で実ブラウザ上の操作も検証しました。

### 単体テスト（96件、すべて合格）

```
tests/money.test.js            19 passed（丸め、線形計算、二重加算防止）
tests/validation.test.js        9 passed（DRAFT判定、輸入者わからない、サンプル単価わからない、書類切替でデータ保持）
tests/pagination.test.js       39 passed（0/1/9/10/11/19/20/21/29/30/31/45件、長文説明での分割、空ページなし）
tests/totals.test.js            6 passed（送料込み/別、単位混在での非合算）
tests/invoiceFormulas.test.js  23 passed（実テンプレートのInvoice_2/3数式との回帰一致）
```

実行方法：
```bash
python3 tests/jscore_run.py tests/assert.js src/domain/types.js src/domain/money.js src/domain/state.js src/rules/validation.js tests/validation.test.js
python3 tests/jscore_run.py tests/assert.js src/calc/pagination.js tests/pagination.test.js
python3 tests/jscore_run.py tests/assert.js src/domain/types.js src/domain/money.js src/domain/state.js src/calc/totals.js tests/totals.test.js
python3 tests/jscore_run.py tests/assert.js src/google/invoicePageFormulas.js tests/invoiceFormulas.test.js
python3 tests/jscore_run.py tests/assert.js src/domain/money.js tests/money.test.js
```

### 型チェック

```
npm run typecheck   # tsc --noEmit（allowJs+checkJs） → エラー0件
```

### 実ブラウザでの動作確認（Chrome、CDP経由で操作・スクリーンショット確認）

- 全11画面を例外なく遷移できること（コンソールエラー0件）
- 送り主・買主・配送先「同じ」・輸入者「わからない」を含む一連の入力
- 商品2件（複製込み）での明細金額・小計・総額（送料別途分を含め182.50 USD）の一致
- 商品31件への拡張：印刷プレビューが4ページに分割され、明細番号が1〜31まで欠番・重複なく
  連番になること、小計307.50・総額327.50が最終ページのみに表示されること
- 必須項目未解決時はDRAFTバナー表示、解決後に「FINALにする」操作でFINAL表示に切り替わること
- Google未設定時に「Googleスプレッドシートを作成」を押すと、偽の成功表示をせず設定手順への
  案内が出ること
- ラベルとフォーム部品の`for`/`id`関連付け（アクセシビリティ）

### 未検証（このセッションでは実行できなかったもの）

- Google Sheets連携の実際のOAuth・コピー・書き込み（`GOOGLE_CLIENT_ID`未設定のため）。
  ロジック自体は実装・レビュー済みですが、実際のGoogleアカウントでの通し動作は
  [`docs/google-setup.md`](docs/google-setup.md) の設定後にご確認ください。
- 実ブラウザでのキーボード操作のみでの全画面走査（スクリーンリーダーでの読み上げ含む）。

## 6. 未接続の外部機能・既知の制約

- **Google Sheets出力**：OAuthクライアントID未設定のため未接続です。設定手順は
  `docs/google-setup.md` を参照してください。設定前でも質問回答・下書き保存・印刷プレビューは
  利用できます。
- **AIによる翻訳・商品説明生成**：この環境ではAPIキーを設定していないため無効です。
  商品説明は、入力済みの名称・素材・用途から機械的に合成した「下書き案」を提示し、
  ユーザーが確認・編集する方式のみ実装しています（翻訳は行いません）。
- **HS分類の自動提案**：実装していません（公式HS品目表データとの照合が必要なため）。
  未入力の場合は「確認待ち」として保存され、通関業者・税関相談窓口への確認を案内します。
- **国・配送会社ごとの提出要件データベース**：一次情報を都度確認できる範囲に限定し、
  一般的なIncoterms 2020（出典：ICC）や用語解説のみを実装しています。個別の法的要件判定は
  行いません（`src/rules/validation.js`の外部確認事項として、常に相手・配送会社への確認を促します）。
- **会社の正式英語名の自動決定**：行っていません。日本語原文を残したまま、英語表記は
  ユーザー自身の入力を求めます（誤った名称を正式表記として確定しないため）。

## 7. 技術構成についての補足

開発序盤はネットワーク帯域制限によりNode.js導入に時間がかかったため、ビルドステップなしで
ブラウザがそのまま実行できる**Vanilla JavaScript（ESモジュール）+ JSDoc型注釈**で実装しました。
その後Node.js 22 / TypeScript 5を導入できたため、`tsconfig.json`（`allowJs`/`checkJs`）で
実際に型チェックを実行し、検出された不整合（コールバックの引数数、DOM要素の型キャストなど）を
すべて修正済みです。

```bash
npm install --no-save typescript   # 初回のみ
npm run typecheck                  # ./node_modules/.bin/tsc --noEmit
```

現時点で**エラー0件**です。実行時の挙動はビルドなしのままで変えていません
（`src/`のJavaScriptがそのままブラウザで動きます）。将来ビルドツール（Vite等）を
導入する場合も、`.js`を`.ts`にリネームするだけで移行できる構成にしています。

## ディレクトリ構成

```
index.html / styles.css        画面の入れ物とスタイル
src/domain/                    データモデル・金額計算（純粋ロジック）
src/rules/                     質問定義・分岐・入力チェック・テンプレート対応表（中心ルール）
src/calc/                      合計金額・印刷ページ割り
src/ui/                        画面描画（rules層を読んで描画するだけ）
src/print/                     A4印刷プレビュー
src/google/                    Google Sheets/Drive連携
tests/                         単体テスト（Node不要、JavaScriptCoreで実行）
assets/                        参照テンプレートの実ファイル（コピー、編集しない）
docs/                          Google連携の設定手順
```
