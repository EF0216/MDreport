# MD外部環境レーダー

MD向けに、天気・市場ニュース・商品アラート・売上実績をまとめて確認するための Google Apps Script アプリです。

このリポジトリは公開用テンプレートです。実運用中のスプレッドシートID、Apps ScriptプロジェクトID、WebアプリURL、実データは含めていません。

## GitHub Pagesについて

GitHub Pagesで表示されるトップページは、公開説明とサンプル表示です。

実データを取得する本番ダッシュボードは Google Apps Script の Webアプリとして動きます。Apps Script 専用の `google.script.run` や HtmlService の include は、GitHub Pages上では動きません。

## 構成

```text
index.html        GitHub Pages用の説明ページ
gas/              Apps Script 本体
  Code.gs
  index.html
  style.html
  script.html
  appsscript.json
  .claspignore
  .clasp.json.example
docs/             補足ドキュメント
```

## セットアップ

1. Google スプレッドシートを新規作成します。
2. Apps Script プロジェクトを作成します。
3. Apps Script の「プロジェクトの設定」からスクリプトプロパティを追加します。

```text
SPREADSHEET_ID = 作成したスプレッドシートID
```

4. `gas/` 配下のファイルを Apps Script に反映します。
5. Apps Script エディタで `setupSpreadsheet()` を実行します。
6. `updateDailyData()` を実行して初回データを取得します。
7. `createDailyTrigger()` を実行すると、毎日自動更新のトリガーを作成できます。

## clasp を使う場合

```bash
cd gas
npm install
```

`gas/.clasp.json.example` を `gas/.clasp.json` にコピーし、自分の Apps Script プロジェクトIDを設定してください。

```json
{
  "scriptId": "YOUR_APPS_SCRIPT_PROJECT_ID",
  "rootDir": "."
}
```

その後、以下で反映できます。

```bash
npm run push
```

## 注意

- GitHub Pagesは静的ページです。スプレッドシートの実データは読み込みません。
- 実データ版を共有する場合は、Apps Script のWebアプリをデプロイしてURLを共有してください。
- 公開リポジトリへ `.clasp.json`、スプレッドシートID、WebアプリURL、実績データを含めないでください。

