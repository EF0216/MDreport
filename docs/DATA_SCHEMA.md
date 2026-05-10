# MD外部環境レーダー DATA_SCHEMA

スプレッドシートの主なシートと用途の整理です。

## 外部環境

### weather_daily

ゾーン別の日別天気データ。

主な列:

- `date`
- `week`
- `zone`
- `area_name`
- `max_temp`
- `min_temp`
- `avg_temp`
- `rain_mm`
- `temp_vs_yesterday`
- `temp_vs_last_week`
- `temp_vs_last_year_same_weekday`
- `last_year_same_weekday_date`
- `weather_alert`

気温比較は、基本的に前週同曜日と前年同週同曜日を確認軸にします。

### news_daily

採用済みニュース。

主な列:

- `date`
- `source_type`
- `keyword`
- `title`
- `source`
- `url`
- `published_at`
- `summary`
- `category`
- `importance`
- `md_insight`

### news_review

除外しすぎを防ぐための保留ニュース。
商品性や市場性が微妙なものはここで確認します。

## アラート・タグ

### product_alerts

天気、ニュース、売上変化から作る商品アラート。

主な列:

- `date`
- `category`
- `keyword`
- `alert_type`
- `evidence`
- `importance`
- `sales_check_point`
- `action`

### analysis_tags

後日の売上分析で使うタグ。
現状はレッグウェア全体を前提にし、カテゴリを細かく分けすぎない方針です。

## 売上実績

### legwear_bumon_daily

ゾーン、部門単位の日別売上。

主な列:

- `date`
- `week_no`
- `weekday`
- `zone_code`
- `zone_name`
- `部門CD`
- `部門名`
- `売上予算`
- `売上実績`
- `達成率`
- `前年同週同曜日実績`
- `前年比`
- `販売荒利高`
- `荒利率`
- `前年荒利高`

### legwear_category_daily

ゾーン、部門、カテゴリ、サブカテゴリ単位の日別売上。

主な列:

- `date`
- `week_no`
- `weekday`
- `zone_code`
- `zone_name`
- `部門CD`
- `部門名`
- `カテゴリCD`
- `カテゴリ名`
- `サブカテCD`
- `サブカテ名`
- `実績数量`
- `実績金額`
- `前年同週同曜日数量`
- `前年同週同曜日実績`
- `昨年対比`
- `販売荒利高`
- `荒利率`
- `前年荒利高`

## 設定系

### settings_keywords

ニュース取得キーワード。
レッグウェア中心に設定します。

### settings_zones

天気取得ゾーン。
北海道から南九州まで北から南の順に扱います。

### settings_rules

アラート判定ルール。
気温だけで断定せず、売上、荒利、前年差、前週同曜日比を併せて確認します。

## 比較軸

売上と気温の基本比較軸:

- 前週同曜日比
- 前年同週同曜日比
- 予算比
- 荒利
- 粗利率

商品タグは、気温で売上が動いたと断定せず「気温寄与候補」として表示します。
