# MD外部環境レーダー

Google Apps Script と Google スプレッドシートで動く、MD向けの外部環境・売上分析ダッシュボードです。

天気、ニュース、商品アラート、売上実績をスプレッドシートに蓄積し、Apps Script の Web アプリとして表示します。

## できること

- Open-Meteo からゾーン別の天気を取得
- Google News RSS から商品・市場ニュースを取得
- 気温、降水、ニュースから商品アラートと分析タグを作成
- 売上実績、前週同曜日比、前年比、予算比、荒利、粗利率をダッシュボード表示
- 日別と週別の表示切替
- スプレッドシートをDBとして使うため、外部サーバー不要

## ファイル構成

```text
Code.gs
index.html
style.html
script.html
appsscript.json
.claspignore
.clasp.json.example
docs/
```

## セットアップ

1. Google スプレッドシートを新規作成します。
2. Apps Script プロジェクトを作成します。
3. Apps Script の「プロジェクトの設定」からスクリプトプロパティを追加します。

```text
SPREADSHEET_ID = 作成したスプレッドシートID
```

4. このリポジトリのファイルを Apps Script に反映します。
5. Apps Script エディタで `setupSpreadsheet()` を実行します。
6. `updateDailyData()` を実行して初回データを取得します。
7. `createDailyTrigger()` を実行すると、毎日自動更新のトリガーを作成できます。

## clasp を使う場合

`.clasp.json.example` を `.clasp.json` にコピーし、自分の Apps Script プロジェクトIDを設定してください。

```json
{
  "scriptId": "YOUR_APPS_SCRIPT_PROJECT_ID",
  "rootDir": "."
}
```

その後、以下で反映できます。

```bash
npm install
npm run push
```

## 注意

この公開版には、実運用中のスプレッドシートID、Apps ScriptプロジェクトID、WebアプリURL、実データは含めていません。

Webアプリの公開範囲は、利用環境に合わせて Apps Script のデプロイ設定で調整してください。

