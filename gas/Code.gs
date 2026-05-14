const SPREADSHEET_ID = '1jl6gP1BRGPyeI08FHPw2XWQW4zRXubjixK51VTr5yD0';
const SPREADSHEET_NAME = 'MD外部環境レーダー';
const TIME_ZONE = 'Asia/Tokyo';
const DASHBOARD_LIMIT = 50;
const NEWS_LOOKBACK_HOURS = 24;
const DAILY_TRIGGER_HOUR = 9;

const SHEET_DEFINITIONS = {
  weather_daily: [
    'date', 'week', 'zone', 'area_name', 'latitude', 'longitude', 'max_temp',
    'min_temp', 'avg_temp', 'rain_mm', 'weather_code', 'temp_vs_yesterday',
    'temp_vs_last_week', 'weather_alert', 'created_at', 'last_year_same_weekday_date',
    'last_year_max_temp', 'last_year_min_temp', 'last_year_avg_temp',
    'last_year_rain_mm', 'temp_vs_last_year_same_weekday',
    'rain_vs_last_year_same_weekday'
  ],
  news_daily: [
    'date', 'source_type', 'keyword', 'title', 'source', 'url', 'published_at',
    'summary', 'category', 'importance', 'md_insight', 'created_at'
  ],
  news_review: [
    'date', 'source_type', 'keyword', 'title', 'source', 'url', 'published_at',
    'summary', 'category', 'importance', 'md_insight', 'review_status',
    'review_reason', 'created_at'
  ],
  product_alerts: [
    'date', 'category', 'keyword', 'alert_type', 'evidence', 'importance',
    'sales_check_point', 'action', 'created_at'
  ],
  analysis_tags: [
    'date', 'week', 'zone', 'category', 'temp_tag', 'weather_tag',
    'market_tag', 'product_tag', 'action_hint', 'created_at'
  ],
  settings_keywords: ['enabled', 'type', 'keyword', 'category', 'priority', 'memo'],
  settings_zones: ['enabled', 'zone', 'area_name', 'latitude', 'longitude', 'category_memo'],
  settings_rules: ['enabled', 'rule_type', 'rule_name', 'condition', 'output_action', 'importance', 'reason', 'memo'],
  implementation_backlog: [
    'enabled', 'phase', 'task', 'purpose', 'detail', 'priority',
    'status', 'owner', 'memo', 'created_at'
  ]
};

const INITIAL_KEYWORDS = [
  [true, '商品', '靴下', 'レッグ', 5, '通年基本需要'],
  [true, '商品', 'ソックス', 'レッグ', 5, '通年基本需要'],
  [true, '商品', 'パンスト', 'レディースレッグ', 5, '通勤・フォーマル需要'],
  [true, '商品', 'タイツ', 'レディースレッグ', 5, '秋冬・防寒需要'],
  [true, '商品', 'レギンス', 'レッグ', 4, '通年・重ね履き需要'],
  [true, '商品', '着圧ソックス', 'レッグ', 4, '仕事・通勤・足もとサポート'],
  [true, '商品', '冷感ソックス', 'レッグ', 5, '春夏・夏物前倒し'],
  [true, '商品', 'UV レッグ', 'レッグ', 4, '紫外線対策'],
  [true, '商品', 'さらさら 靴下', 'レッグ', 4, '高温・湿度対策'],
  [true, '商品', '吸湿発熱 靴下', 'レッグ', 5, '秋冬立ち上がり'],
  [true, '商品', 'あったか靴下', 'レッグ', 5, '秋冬・防寒'],
  [true, '商品', '裏起毛タイツ', 'レディースレッグ', 5, '真冬・防寒強化'],
  [true, '商品', 'ルームソックス', 'レッグ', 4, '秋冬・室内需要'],
  [true, '商品', '5本指ソックス', 'レッグ', 3, '機能定番'],
  [true, '市場', 'レッグウェア 市場', '全体', 4, '市場全体確認'],
  [true, '市場', '靴下 市場', 'レッグ', 4, '通年市況確認'],
  [true, '市場', 'パンスト 市場', 'レディースレッグ', 4, 'レディースレッグ市況'],
  [true, '市場', 'タイツ 市場', 'レディースレッグ', 4, '秋冬市況確認'],
  [true, '競合', 'ドンキ 靴下', 'レッグ', 4, '競合・値頃訴求'],
  [true, '競合', 'ドンキ レッグウェア', '全体', 4, '競合売場確認'],
  [true, '競合', 'ドンキ あったか靴下', 'レッグ', 4, '秋冬競合訴求'],
  [true, '競合', 'ワークマン 靴下', 'レッグ', 4, '機能性競合'],
  [true, '競合', 'ワークマン 暑さ対策 靴下', 'レッグ', 4, '春夏機能訴求'],
  [true, '競合', 'ユニクロ ヒートテック 靴下', 'レッグ', 4, '秋冬機能訴求'],
  [true, '競合', 'ユニクロ エアリズム 靴下', 'レッグ', 4, '春夏機能訴求'],
  [true, '競合', 'しまむら 靴下', 'レッグ', 4, '値頃・品揃え'],
  [true, '競合', 'しまむら 冷感 靴下', 'レッグ', 3, '春夏値頃訴求']
];

// 売上ゾーンと1対1対応（北→南順）
const INITIAL_ZONES = [
  [true, '北海道', '札幌',   43.0618, 141.3545, '北海道代表'],
  [true, '青森',   '青森',   40.8247, 140.7400, '東北北部代表'],
  [true, '東北',   '仙台',   38.2682, 140.8694, '東北代表'],
  [true, '首都圏', '東京',   35.6762, 139.6503, '首都圏代表'],
  [true, '西関東', 'さいたま', 35.8617, 139.6455, '西関東代表'],
  [true, '東関東', '千葉',   35.6074, 140.1065, '東関東代表'],
  [true, '東関西', '京都',   35.0116, 135.7681, '東関西代表'],
  [true, '西関西', '大阪',   34.6937, 135.5023, '西関西代表'],
  [true, '中部',   '名古屋', 35.1815, 136.9066, '中部代表'],
  [true, '北陸',   '金沢',   36.5613, 136.6562, '北陸代表'],
  [true, '中国',   '広島',   34.3853, 132.4553, '中国代表'],
  [true, '四国',   '高松',   34.3428, 134.0466, '四国代表'],
  [true, '北九州', '北九州', 33.8834, 130.8751, '北九州代表'],
  [true, '筑豊',   '飯塚',   33.6464, 130.6916, '筑豊代表'],
  [true, '福岡',   '福岡',   33.5902, 130.4017, '福岡代表'],
  [true, '東九州', '大分',   33.2396, 131.6093, '東九州代表'],
  [true, '西九州', '佐賀',   33.2494, 130.2988, '西九州代表'],
  [true, '天草',   '熊本',   32.7898, 130.7417, '天草代表'],
  [true, '南九州', '鹿児島', 31.5966, 130.5571, '南九州代表'],
  [true, '西友',   '東京',   35.6762, 139.6503, '西友（東京）'],
];

const INITIAL_RULES = [
  [true, '天気', '夏日アラート', '最高気温25℃以上', '冷感・UV・さらさら系の前出し確認', 4, '春夏レッグの需要変化を確認するため', '気温上昇週の売場確認'],
  [true, '天気', '真夏日アラート', '最高気温30℃以上', '夏物訴求を強化', 5, '高温時は冷感・UV・さらさら系の需要が強まりやすい', '重点確認'],
  [true, '天気', '前週差アラート', '平均気温の前週差+5℃以上', '売場切替を前倒し確認', 5, '急な気温上昇は売場切替遅れのリスクになる', '前年差ではなく前週差'],
  [true, '天気', '季節外低温', '4月〜9月かつ最高気温15℃未満', 'パンスト・薄手レッグの動き確認', 2, '春夏期の低温は防寒強化ではなく売上分析メモとして扱う', 'あったか訴求にはしない'],
  [true, '天気', '防寒レッグ低温', '10月〜3月かつ最高気温15℃未満', 'タイツ・あったか靴下・防寒系の継続需要確認', 4, '秋冬期の低温は防寒レッグ需要に直結しやすい', '季節判定あり'],
  [true, '天気', '大雨アラート', '降水量20mm以上', '来店減・客数・雨天影響を確認', 3, '大雨は来店や売上の外部要因になりやすい', 'ルーム需要とは断定しない'],
  [true, 'ニュース', '取得期間', 'GoogleニュースRSS published_at が直近24時間以内', '直近ニュースのみ保存', 0, '毎日取得で古い記事が重複保存されるのを防ぐ', 'when:1d と公開日時で二重確認'],
  [true, 'ニュース', '野球ソックス除外', 'ホワイトソックス、レッドソックス、MLB、野球などを含む', '保存しない', 0, 'ソックス単語の野球チーム名ノイズを除外するため', 'スポーツ記事除外'],
  [true, 'ニュース', '成人・芸能ノイズ除外', 'グラビア、セクシー、DVD、芸能、網タイツ姿などを含む', '保存しない', 0, 'MD分析に使いづらい非商品ニュースを除外するため', '商品コラボは例外'],
  [true, 'ニュース', 'キャラクターコラボ許可', 'キャラクター/アニメ等 + 靴下/ソックス等 + 発売/商品/コラボ等', '保存する', 4, '靴下はキャラクターコラボ商品が多いため取り逃がさない', 'サンリオ、ディズニー等を想定'],
  [true, 'ニュース', '商品・小売文脈判定', '発売、新商品、価格、売上、市場、小売、店舗、ブランド、コラボ等を含む', 'MD用ニュースとして保存候補', 3, '単なる話題ではなく売場・商品分析に使える文脈を優先するため', '靴下/ソックスはこの文脈必須'],
  [true, 'ニュース重要度', '高重要度ニュース', '発売、新商品、価格、売上、市場、小売、店舗、競合名を含む', '重要度4〜5で扱う', 4, 'MD判断に直接つながる可能性が高い', '設定priorityより文脈を優先'],
  [true, 'ニュース重要度', '通常RSSニュース', '商品・小売文脈はあるが強いMDシグナルがない', '重要度3までに抑える', 3, 'キーワードpriorityだけで上位表示されすぎるのを防ぐ', 'ランキング調整'],
  [true, '重複', 'ニュースURL重複防止', '同じURLがnews_dailyに既に存在する', '保存しない', 0, '同じニュースを毎日重複保存しないため', 'URL単位'],
  [true, '重複', '分析タグ重複防止', '同じdate・zone・categoryがanalysis_tagsに既に存在する', '保存しない', 0, '日別分析キーの重複を防ぐため', '再生成時は手動クリアが必要']
];

const INITIAL_BACKLOG = [
  [true, '次期', '売上実績シート sales_daily 追加', '商品アラートを実績根拠つきにする', 'date・week・zone・category・product_group単位で売上数量、売上金額、粗利、在庫、販促フラグを蓄積する。', 5, '未着手', '', '売上実績データの取り込み元を決める必要あり。', '2026-05-04 21:45:00'],
  [true, '次期', '天気×売上結合ロジック', '気温・降水と売上変化の関係を見る', 'weather_dailyとsales_dailyをdate+zoneで結合し、気温帯、降水量、前週差、前年差ごとの売上リフトを算出する。', 5, '未着手', '', '売上分析・商品分析・棚割分析の基礎になる。', '2026-05-04 21:45:00'],
  [true, '次期', 'pattern_rules シート追加', '実績から見つかった勝ちパターンを保存する', '条件、対象カテゴリ、売上リフト、信頼度、サンプル数、アクションヒントを保存し、アラート判定に使う。', 4, '未着手', '', '例: 最高気温25度以上かつ前週差+3度以上で冷感ソックス売上+15%。', '2026-05-04 21:45:00'],
  [true, '次期', '商品アラートを実績パターン連動へ拡張', '重要度とアクションを実績で補正する', '現状のルールベースに、過去実績の売上リフト、信頼度、季節性を加えて、重要度とアクション文言を調整する。', 5, '未着手', '', '5月にあったか訴求を出さない等、季節妥当性もここで強化する。', '2026-05-04 21:45:00'],
  [true, '次期', 'ダッシュボードに実績根拠表示', '判断理由をMDが確認できるようにする', 'アラートカードに「過去同条件で冷感ソックス売上+15%、サンプル12日」のような根拠を表示する。', 4, '未着手', '', '単なる注意喚起ではなく、売場判断に使える画面にする。', '2026-05-04 21:45:00'],
  [true, '次期', 'アラート精度評価', '出したアラートが役に立ったか検証する', 'アラート発生日と翌日以降の売上変化を見て、有効アラート、不要アラート、見逃しを評価する。', 4, '未着手', '', '将来的にAI要約や予測モデルを入れる前の評価軸にする。', '2026-05-04 21:45:00']
];

function doGet(e) {
  ensureDailyTrigger_();
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('MD外部環境レーダー')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

function setupSpreadsheet() {
  const ss = getSpreadsheet_();

  Object.keys(SHEET_DEFINITIONS).forEach(function(sheetName) {
    const headers = SHEET_DEFINITIONS[sheetName];
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    ensureHeaders_(sheet, headers);
    formatHeader_(sheet, headers.length);
  });

  seedSettings_(ss.getSheetByName('settings_keywords'), INITIAL_KEYWORDS);
  seedSettings_(ss.getSheetByName('settings_zones'), INITIAL_ZONES);
  seedSettings_(ss.getSheetByName('settings_rules'), INITIAL_RULES);
  seedSettings_(ss.getSheetByName('implementation_backlog'), INITIAL_BACKLOG);
  return { ok: true, message: 'setupSpreadsheet completed' };
}

function updateDailyData() {
  setupSpreadsheet();
  const ss = getSpreadsheet_();
  const yesterday = formatDate_(addDays_(new Date(getToday_()), -1));
  backfillPreviousWeekWeatherData();
  ensureWeatherDate_(ss, yesterday);
  fetchWeatherDaily();
  fetchNewsDaily();
  generateProductAlerts();
  generateAnalysisTags();
  sortDataSheets();
  const dashData = getDashboardData();
  exportToGithub_(dashData);
  return dashData;
}

function fetchWeatherDaily() {
  return fetchWeatherForDate_(getToday_());
}

function fetchWeatherForDate_(targetDate) {
  const ss = getSpreadsheet_();
  const week = getWeekNumber_(new Date(targetDate));
  const createdAt = getNow_();
  const zones = getEnabledSettings_('settings_zones');
  const sheet = ss.getSheetByName('weather_daily');
  const existingKeys = getExistingKeys_(sheet, [0, 2]);
  const rows = [];

  zones.forEach(function(zone) {
    try {
      const key = targetDate + '|' + zone.zone;
      if (existingKeys[key]) return;

      const weather = targetDate === getToday_()
        ? fetchOpenMeteo_(zone.latitude, zone.longitude)
        : fetchOpenMeteoArchive_(zone.latitude, zone.longitude, targetDate);
      const maxTemp = toNumber_(weather.temperature_2m_max);
      const minTemp = toNumber_(weather.temperature_2m_min);
      const avgTemp = round1_((maxTemp + minTemp) / 2);
      const rainMm = toNumber_(weather.precipitation_sum);
      const weatherCode = weather.weather_code;
      const yesterdayDiff = calcTempDiff_(sheet, zone.zone, targetDate, -1, avgTemp);
      const lastWeekDiff = calcTempDiff_(sheet, zone.zone, targetDate, -7, avgTemp);
      const lastYearDate = getLastYearSameWeekdayDate_(targetDate);
      const lastYearWeather = fetchOpenMeteoArchive_(zone.latitude, zone.longitude, lastYearDate);
      const lastYearMaxTemp = toNumberOrBlank_(lastYearWeather.temperature_2m_max);
      const lastYearMinTemp = toNumberOrBlank_(lastYearWeather.temperature_2m_min);
      const lastYearAvgTemp = calcAverageOrBlank_(lastYearMaxTemp, lastYearMinTemp);
      const lastYearRainMm = toNumberOrBlank_(lastYearWeather.precipitation_sum);
      const tempVsLastYear = diffOrBlank_(avgTemp, lastYearAvgTemp);
      const rainVsLastYear = diffOrBlank_(rainMm, lastYearRainMm);
      const alert = buildWeatherAlert_(zone.zone, maxTemp, rainMm, lastWeekDiff);

      rows.push([
        targetDate, week, zone.zone, zone.area_name, zone.latitude, zone.longitude,
        maxTemp, minTemp, avgTemp, rainMm, weatherCode, yesterdayDiff,
        lastWeekDiff, alert, createdAt, lastYearDate, lastYearMaxTemp,
        lastYearMinTemp, lastYearAvgTemp, lastYearRainMm, tempVsLastYear,
        rainVsLastYear
      ]);
    } catch (error) {
      Logger.log('fetchWeatherForDate_ failed: ' + targetDate + ' / ' + zone.zone + ' / ' + error);
    }
    Utilities.sleep(1500);
  });

  appendRows_(sheet, rows);
  return rows.length;
}

function backfillDailyData(dateString) {
  setupSpreadsheet();
  const targetDate = String(dateString || '').trim();
  if (!targetDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error('dateString must be yyyy-MM-dd');
  }

  const weatherCount = fetchWeatherForDate_(targetDate);
  const alertCount = generateProductAlerts(targetDate);
  const tagCount = generateAnalysisTags(targetDate);
  sortDataSheets();
  return {
    ok: true,
    date: targetDate,
    weatherRows: weatherCount,
    productAlertRows: alertCount,
    analysisTagRows: tagCount
  };
}

function backfillPreviousWeekWeatherData() {
  setupSpreadsheet();
  const today = getToday_();
  const startDate = formatDate_(addDays_(new Date(today), -13));
  const endDate = formatDate_(addDays_(new Date(today), -7));
  const result = backfillWeatherDateRange_(startDate, endDate);
  const refreshed = refreshWeatherDiffs_();
  sortDataSheets();
  return {
    ok: true,
    startDate: startDate,
    endDate: endDate,
    weatherRows: result.weatherRows,
    refreshed: refreshed
  };
}

function backfillWeatherDateRange_(startDate, endDate) {
  if (!String(startDate || '').match(/^\d{4}-\d{2}-\d{2}$/) ||
      !String(endDate || '').match(/^\d{4}-\d{2}-\d{2}$/)) {
    throw new Error('startDate and endDate must be yyyy-MM-dd');
  }

  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('weather_daily');
  const zones = getEnabledSettings_('settings_zones');
  const existingKeys = getExistingKeys_(sheet, [0, 2]);
  const createdAt = getNow_();
  const dateList = [];
  let cursor = new Date(startDate);
  const end = new Date(endDate);
  while (cursor <= end) {
    dateList.push(formatDate_(cursor));
    cursor = addDays_(cursor, 1);
  }

  const rows = [];
  zones.forEach(function(zone) {
    try {
      const missingDates = dateList.filter(function(date) {
        return !existingKeys[date + '|' + zone.zone];
      });
      if (!missingDates.length) return;

      const weatherMap = fetchOpenMeteoArchiveRange_(zone.latitude, zone.longitude, startDate, endDate);
      const lastYearStart = getLastYearSameWeekdayDate_(startDate);
      const lastYearEnd = getLastYearSameWeekdayDate_(endDate);
      const lastYearMap = fetchOpenMeteoArchiveRange_(zone.latitude, zone.longitude, lastYearStart, lastYearEnd);

      missingDates.forEach(function(date) {
        const key = date + '|' + zone.zone;
        const weather = weatherMap[date];
        if (!weather) {
          Logger.log('No weather range data: ' + date + ' / ' + zone.zone);
          return;
        }

        const maxTemp = toNumberOrBlank_(weather.temperature_2m_max);
        const minTemp = toNumberOrBlank_(weather.temperature_2m_min);
        const avgTemp = calcAverageOrBlank_(maxTemp, minTemp);
        const rainMm = toNumberOrBlank_(weather.precipitation_sum);
        const weatherCode = weather.weather_code;
        const lastYearDate = getLastYearSameWeekdayDate_(date);
        const lastYearWeather = lastYearMap[lastYearDate] || {};
        const lastYearMaxTemp = toNumberOrBlank_(lastYearWeather.temperature_2m_max);
        const lastYearMinTemp = toNumberOrBlank_(lastYearWeather.temperature_2m_min);
        const lastYearAvgTemp = calcAverageOrBlank_(lastYearMaxTemp, lastYearMinTemp);
        const lastYearRainMm = toNumberOrBlank_(lastYearWeather.precipitation_sum);
        const tempVsLastYear = diffOrBlank_(avgTemp, lastYearAvgTemp);
        const rainVsLastYear = diffOrBlank_(rainMm, lastYearRainMm);
        const alert = buildWeatherAlert_(zone.zone, Number(maxTemp || 0), Number(rainMm || 0), '');

        rows.push([
          date, getWeekNumber_(new Date(date)), zone.zone, zone.area_name, zone.latitude, zone.longitude,
          maxTemp, minTemp, avgTemp, rainMm, weatherCode, '',
          '', alert, createdAt, lastYearDate, lastYearMaxTemp,
          lastYearMinTemp, lastYearAvgTemp, lastYearRainMm, tempVsLastYear,
          rainVsLastYear
        ]);
        existingKeys[key] = true;
      });
    } catch (error) {
      Logger.log('backfillWeatherDateRange_ failed: ' + zone.zone + ' / ' + error);
    }
    Utilities.sleep(1500);
  });

  appendRows_(sheet, rows);
  return { weatherRows: rows.length };
}

function refreshWeatherDiffs_() {
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('weather_daily');
  if (!sheet || sheet.getLastRow() < 2) {
    return { updatedYesterday: 0, updatedLastWeek: 0 };
  }

  const lastRow = sheet.getLastRow();
  const lastCol = sheet.getLastColumn();
  const headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  const col = {};
  headers.forEach(function(header, index) {
    col[header] = index;
  });
  const required = ['date', 'zone', 'avg_temp', 'temp_vs_yesterday', 'temp_vs_last_week'];
  required.forEach(function(header) {
    if (typeof col[header] === 'undefined') throw new Error('Missing weather header: ' + header);
  });

  const values = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const avgByDateZone = {};
  values.forEach(function(row) {
    const date = normalizeValue_(row[col.date]);
    const zone = row[col.zone];
    const avg = row[col.avg_temp];
    if (date && zone && avg !== '' && avg !== null && typeof avg !== 'undefined') {
      avgByDateZone[date + '|' + zone] = Number(avg);
    }
  });

  let updatedYesterday = 0;
  let updatedLastWeek = 0;
  values.forEach(function(row) {
    const date = normalizeValue_(row[col.date]);
    const zone = row[col.zone];
    const avg = row[col.avg_temp];
    if (!date || !zone || avg === '' || avg === null || typeof avg === 'undefined') return;

    const yesterdayDate = formatDate_(addDays_(new Date(date), -1));
    const lastWeekDate = formatDate_(addDays_(new Date(date), -7));
    const yesterdayAvg = avgByDateZone[yesterdayDate + '|' + zone];
    const lastWeekAvg = avgByDateZone[lastWeekDate + '|' + zone];

    const newYesterday = typeof yesterdayAvg === 'number' ? round1_(Number(avg) - yesterdayAvg) : '';
    const newLastWeek = typeof lastWeekAvg === 'number' ? round1_(Number(avg) - lastWeekAvg) : '';
    if (row[col.temp_vs_yesterday] !== newYesterday) {
      row[col.temp_vs_yesterday] = newYesterday;
      updatedYesterday++;
    }
    if (row[col.temp_vs_last_week] !== newLastWeek) {
      row[col.temp_vs_last_week] = newLastWeek;
      updatedLastWeek++;
    }
  });

  sheet.getRange(2, 1, values.length, lastCol).setValues(values);
  return {
    updatedYesterday: updatedYesterday,
    updatedLastWeek: updatedLastWeek
  };
}

function sortDataSheets() {
  setupSpreadsheet();
  const ss = getSpreadsheet_();
  [
    'weather_daily',
    'news_daily',
    'news_review',
    'product_alerts',
    'analysis_tags'
  ].forEach(function(sheetName) {
    sortSheetByDate_(ss.getSheetByName(sheetName));
  });
  return { ok: true, message: 'date sheets sorted' };
}

function updateWeatherLastYearComparisons() {
  setupSpreadsheet();
  const ss = getSpreadsheet_();
  const sheet = ss.getSheetByName('weather_daily');
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return 0;

  const headers = values[0];
  const headerMap = buildHeaderMap_(headers);
  const targetColumns = [
    'last_year_same_weekday_date',
    'last_year_max_temp',
    'last_year_min_temp',
    'last_year_avg_temp',
    'last_year_rain_mm',
    'temp_vs_last_year_same_weekday',
    'rain_vs_last_year_same_weekday'
  ];
  const rowsToUpdate = [];

  for (let rowIndex = 1; rowIndex < values.length; rowIndex++) {
    const row = values[rowIndex];
    if (!row[headerMap.date] || !row[headerMap.zone]) continue;
    if (row[headerMap.last_year_same_weekday_date] && row[headerMap.temp_vs_last_year_same_weekday] !== '') continue;

    try {
      const date = formatDate_(new Date(row[headerMap.date]));
      const lastYearDate = getLastYearSameWeekdayDate_(date);
      const archive = fetchOpenMeteoArchive_(row[headerMap.latitude], row[headerMap.longitude], lastYearDate);
      const lastYearMaxTemp = toNumberOrBlank_(archive.temperature_2m_max);
      const lastYearMinTemp = toNumberOrBlank_(archive.temperature_2m_min);
      const lastYearAvgTemp = calcAverageOrBlank_(lastYearMaxTemp, lastYearMinTemp);
      const lastYearRainMm = toNumberOrBlank_(archive.precipitation_sum);
      const avgTemp = toNumberOrBlank_(row[headerMap.avg_temp]);
      const rainMm = toNumberOrBlank_(row[headerMap.rain_mm]);
      rowsToUpdate.push({
        rowNumber: rowIndex + 1,
        values: [
          lastYearDate,
          lastYearMaxTemp,
          lastYearMinTemp,
          lastYearAvgTemp,
          lastYearRainMm,
          diffOrBlank_(avgTemp, lastYearAvgTemp),
          diffOrBlank_(rainMm, lastYearRainMm)
        ]
      });
    } catch (error) {
      Logger.log('updateWeatherLastYearComparisons failed: row ' + (rowIndex + 1) + ' / ' + error);
    }
  }

  rowsToUpdate.forEach(function(item) {
    targetColumns.forEach(function(columnName, index) {
      sheet.getRange(item.rowNumber, headerMap[columnName] + 1).setValue(item.values[index]);
    });
  });

  return rowsToUpdate.length;
}

function fetchNewsDaily() {
  const ss = getSpreadsheet_();
  const today = getToday_();
  const createdAt = getNow_();
  const keywords = getEnabledSettings_('settings_keywords');
  const sheet = ss.getSheetByName('news_daily');
  const reviewSheet = ss.getSheetByName('news_review');
  const existingUrls = getExistingColumnSet_(sheet, 5);
  const existingReviewUrls = getExistingColumnSet_(reviewSheet, 5);
  const existingTitleKeys = getExistingNewsTitleKeys_(sheet);
  const existingReviewTitleKeys = getExistingNewsTitleKeys_(reviewSheet);
  const rows = [];
  const reviewRows = [];

  keywords.forEach(function(setting) {
    try {
      const items = fetchNewsItems_(setting);
      items.forEach(function(item) {
        const titleKey = buildNewsTitleKey_(setting.keyword, item.title);
        if (
          existingUrls[item.url] ||
          existingReviewUrls[item.url] ||
          existingTitleKeys[titleKey] ||
          existingReviewTitleKeys[titleKey]
        ) {
          return;
        }

        const decision = classifyNewsItem_(setting, item);
        if (decision.status === 'exclude') return;

        const row = [
          today,
          item.sourceType || 'google_news_rss',
          setting.keyword,
          item.title,
          item.source || 'MD外部環境レーダー',
          item.url,
          item.publishedAt || today,
          item.summary,
          setting.category,
          Number(setting.priority || item.importance || 3),
          item.mdInsight || buildDefaultInsight_(setting.keyword)
        ];

        if (decision.status === 'review') {
          reviewRows.push(row.concat(['保留', decision.reason, createdAt]));
          existingReviewUrls[item.url] = true;
          existingReviewTitleKeys[titleKey] = true;
          return;
        }

        rows.push([
          row[0],
          row[1],
          row[2],
          row[3],
          row[4],
          row[5],
          row[6],
          row[7],
          row[8],
          row[9],
          row[10],
          createdAt
        ]);
        existingUrls[item.url] = true;
        existingTitleKeys[titleKey] = true;
      });
    } catch (error) {
      Logger.log('fetchNewsDaily failed: ' + setting.keyword + ' / ' + error);
    }
  });

  appendRows_(sheet, rows);
  appendRows_(reviewSheet, reviewRows);
  return { accepted: rows.length, review: reviewRows.length };
}

function getExistingNewsTitleKeys_(sheet) {
  const set = {};
  if (!sheet || sheet.getLastRow() < 2) return set;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, Math.max(sheet.getLastColumn(), 4)).getValues();
  values.forEach(function(row) {
    const keyword = normalizeValue_(row[2]);
    const title = normalizeValue_(row[3]);
    const key = buildNewsTitleKey_(keyword, title);
    if (key) set[key] = true;
  });
  return set;
}

function buildNewsTitleKey_(keyword, title) {
  const normalized = normalizeNewsTitle_(title);
  if (!normalized) return '';
  return String(keyword || '').trim() + '|' + normalized;
}

function normalizeNewsTitle_(title) {
  return String(title || '')
    .replace(/（[^）]*）/g, '')
    .replace(/\([^)]*\)/g, '')
    .replace(/ - .+$/g, '')
    .replace(/｜.+$/g, '')
    .replace(/\|.+$/g, '')
    .replace(/[「」『』【】\[\]!"#$%&'()*+,\-./:;<=>?@\\^_`{|}~。、，．・…\s]/g, '')
    .replace(/[！!？?]/g, '')
    .toLowerCase()
    .slice(0, 80);
}

function generateProductAlerts(targetDate) {
  const ss = getSpreadsheet_();
  const today = targetDate || getToday_();
  const createdAt = getNow_();
  const weatherRows = readObjects_(ss.getSheetByName('weather_daily'))
    .filter(function(row) { return row.date === today; });
  const newsRows = readObjects_(ss.getSheetByName('news_daily'))
    .filter(function(row) { return row.date === today; });
  const sheet = ss.getSheetByName('product_alerts');
  const existingKeys = getExistingKeys_(sheet, [0, 1, 2, 3, 4]);
  const rows = [];

  weatherRows.forEach(function(row) {
    const maxTemp = Number(row.max_temp);
    const rainMm = Number(row.rain_mm);
    const lastWeekDiff = Number(row.temp_vs_last_week || 0);
    addAlertIfNew_(rows, existingKeys, {
      date: today,
      category: 'レッグ・インナー',
      keyword: '冷感・UV・さらさら',
      alertType: maxTemp >= 25 ? '気温上昇' : '',
      evidence: row.zone + '：最高気温' + maxTemp + '℃、前週差' + formatSigned_(lastWeekDiff) + '℃',
      importance: maxTemp >= 30 ? 5 : 4,
      salesCheckPoint: '冷感、UV、さらさら系の売場前出しと欠品を確認',
      action: maxTemp >= 30 ? '夏物訴求を強化' : '夏物前倒しを確認',
      createdAt: createdAt
    });
    addAlertIfNew_(rows, existingKeys, {
      date: today,
      category: '全体',
      keyword: '売場切替',
      alertType: lastWeekDiff >= 5 ? '前週差上昇' : '',
      evidence: row.zone + '：平均気温の前週差' + formatSigned_(lastWeekDiff) + '℃',
      importance: 5,
      salesCheckPoint: '売場切替タイミングとSKU投入状況を確認',
      action: '売場切替を前倒し',
      createdAt: createdAt
    });
    const coldSeasonAlert = buildColdSeasonAlert_(maxTemp);
    addAlertIfNew_(rows, existingKeys, {
      date: today,
      category: coldSeasonAlert.category,
      keyword: coldSeasonAlert.keyword,
      alertType: coldSeasonAlert.alertType,
      evidence: row.zone + '：最高気温' + maxTemp + '℃',
      importance: coldSeasonAlert.importance,
      salesCheckPoint: coldSeasonAlert.salesCheckPoint,
      action: coldSeasonAlert.action,
      createdAt: createdAt
    });
    addAlertIfNew_(rows, existingKeys, {
      date: today,
      category: '来店影響',
      keyword: '降雨',
      alertType: rainMm >= 20 ? '大雨' : '',
      evidence: row.zone + '：降水量' + rainMm + 'mm',
      importance: 3,
      salesCheckPoint: '来店減、客数、雨天影響を確認',
      action: '雨天影響を売上分析メモに残す',
      createdAt: createdAt
    });
  });

  newsRows.forEach(function(row) {
    const text = [row.keyword, row.title, row.summary].join(' ');
    const matched = text.match(/冷感|UV|着圧|猛暑|暖冬|暑さ|さらさら|パンスト/);
    if (!matched) return;
    addAlertIfNew_(rows, existingKeys, {
      date: today,
      category: row.category || '全体',
      keyword: matched[0],
      alertType: 'ニュース反応',
      evidence: row.title,
      importance: calcNewsImportance_(row),
      salesCheckPoint: row.keyword + '関連の売上、検索、棚前訴求を確認',
      action: buildDefaultInsight_(matched[0]),
      createdAt: createdAt
    });
  });

  appendRows_(sheet, rows);
  return rows.length;
}

function generateAnalysisTags(targetDate) {
  const ss = getSpreadsheet_();
  const today = targetDate || getToday_();
  const createdAt = getNow_();
  const weatherRows = readObjects_(ss.getSheetByName('weather_daily'))
    .filter(function(row) { return row.date === today; });
  const alerts = readObjects_(ss.getSheetByName('product_alerts'))
    .filter(function(row) { return row.date === today; });
  const sheet = ss.getSheetByName('analysis_tags');
  const existingKeys = getExistingKeys_(sheet, [0, 2, 3]);
  const rows = [];

  weatherRows.forEach(function(weather) {
    const relatedAlerts = alerts.filter(function(alert) {
      return String(alert.evidence || '').indexOf(weather.zone) >= 0 ||
        alert.category === '全体';
    });
    const importantAlerts = relatedAlerts.filter(function(alert) {
      return Number(alert.importance || 0) >= 4 || alert.alert_type === 'ニュース反応';
    });
    const tempTags = buildActionableTempTags_(weather);
    const weatherTags = buildActionableWeatherTags_(weather);
    const shouldKeep = tempTags.length || weatherTags.length || importantAlerts.length;
    if (!shouldKeep) return;

    const category = '全体';
    const key = today + '|' + weather.zone + '|' + category;
    if (existingKeys[key]) return;
    rows.push([
      today,
      weather.week,
      weather.zone,
      category,
      tempTags.join(' / ') || '-',
      weatherTags.join(' / ') || '-',
      buildMarketTag_(importantAlerts, tempTags, weatherTags),
      buildAnalysisProductTag_(importantAlerts, relatedAlerts, weather, tempTags, weatherTags),
      buildAnalysisActionHint_(weather, importantAlerts, relatedAlerts, tempTags, weatherTags),
      createdAt
    ]);
    existingKeys[key] = true;
  });

  appendRows_(sheet, rows);
  return rows.length;
}

function regenerateTodayAnalysisTags() {
  setupSpreadsheet();
  const ss = getSpreadsheet_();
  const today = getToday_();
  const tagSheet = ss.getSheetByName('analysis_tags');
  if (tagSheet) clearDateRows_(tagSheet, [today]);
  const count = generateAnalysisTags(today);
  sortDataSheets();
  return { ok: true, date: today, rows: count };
}

function refreshAnalysisTagsIfLegacy_(ss, today) {
  const sheet = ss.getSheetByName('analysis_tags');
  if (!sheet) return false;
  const todaysTags = readObjects_(sheet).filter(function(row) {
    return row.date === today;
  });
  const hasLegacy = todaysTags.some(function(row) {
    const productTag = String(row.product_tag || '').trim();
    return !isUsefulAnalysisTag_(row) ||
      row.category !== '全体' ||
      row.temp_tag === '平常' ||
      row.weather_tag === '雨なし' ||
      row.product_tag === '定点観測' ||
      row.market_tag === '通常' ||
      productTag === '-' ||
      productTag.indexOf('｜') === -1;
  });
  if (!hasLegacy) return false;
  clearDateRows_(sheet, [today]);
  generateAnalysisTags(today);
  return true;
}

function isUsefulAnalysisTag_(row) {
  const temp = String(row.temp_tag || '').trim();
  const weather = String(row.weather_tag || '').trim();
  const market = String(row.market_tag || '').trim();
  const product = String(row.product_tag || '').trim();
  const hasTemp = temp && temp !== '-' && temp !== '平常';
  const hasWeather = weather && weather !== '-' && weather !== '雨なし';
  const hasMarket = market && market !== '-' && market !== '通常';
  const hasProduct = product && product !== '-' && product !== '定点観測';
  return hasTemp || hasWeather || hasMarket || hasProduct;
}

function getDashboardData() {
  setupSpreadsheet();
  ensureDailyTrigger_();
  ensureTodayData_();
  const ss = getSpreadsheet_();
  const today = getToday_();
  const weatherRows = readObjects_(ss.getSheetByName('weather_daily'));
  const zoneOrder = getZoneOrder_();
  const newsRows = readObjects_(ss.getSheetByName('news_daily'));
  const reviewRows = readObjects_(ss.getSheetByName('news_review'));
  const productRows = readObjects_(ss.getSheetByName('product_alerts'));
  refreshAnalysisTagsIfLegacy_(ss, today);
  const tagRows = readObjects_(ss.getSheetByName('analysis_tags'));
  const weatherLatest = sortRowsByZoneOrder_(weatherRows.filter(function(row) { return row.date === today; }), zoneOrder);
  const newsLatest = newsRows.filter(function(row) { return row.date === today; }).slice(-DASHBOARD_LIMIT).reverse();
  const newsReview = reviewRows.filter(function(row) { return row.date === today; }).slice(-DASHBOARD_LIMIT).reverse();
  const productAlerts = productRows.filter(function(row) { return row.date === today; })
    .sort(function(a, b) { return Number(b.importance || 0) - Number(a.importance || 0); });
  const newsImportantAlerts = newsRows.filter(function(row) {
    return row.date === today && Number(row.importance || 0) >= 4;
  }).map(function(row) {
    return {
      date: row.date,
      category: row.category || 'ニュース',
      keyword: row.keyword || 'ニュース',
      alert_type: 'ニュース',
      evidence: row.title,
      importance: row.importance,
      sales_check_point: row.md_insight || row.summary || 'ニュース内容を売上分析時の外部要因として確認',
      action: row.source ? row.source + ' / ニュースタブで詳細確認' : 'ニュースタブで詳細確認',
      created_at: row.created_at
    };
  });
  const todayAlerts = productAlerts.concat(newsImportantAlerts)
    .sort(function(a, b) { return Number(b.importance || 0) - Number(a.importance || 0); })
    .slice(0, 12);
  const analysisTags = tagRows.filter(function(row) {
    return row.date === today && isUsefulAnalysisTag_(row);
  });

  const bumonSheet = ss.getSheetByName('legwear_bumon_daily');
  const categorySheet = ss.getSheetByName('legwear_category_daily');
  const bumonRows = bumonSheet ? readObjects_(bumonSheet) : [];
  const categoryRows = categorySheet ? readObjects_(categorySheet) : [];
  const legwearPayload = buildLegwearDashboardPayload_(bumonRows, categoryRows, today);

  return {
    updatedAt: getNow_(),
    todayAlerts: todayAlerts,
    zoneOrder: zoneOrder,
    weatherLatest: weatherLatest,
    weatherTrend: buildWeatherTrend_(weatherRows, today),
    newsLatest: newsLatest,
    newsReview: newsReview,
    productAlerts: productAlerts,
    analysisTags: analysisTags,
    legwearBumon: legwearPayload.bumonRows,
    legwearCategory: legwearPayload.categoryRows,
    legwearDates: legwearPayload.allDates,
    legwearCurrentWeekDates: legwearPayload.currentWeekDates,
    legwearWeeks: legwearPayload.weeks
  };
}

function buildLegwearDashboardPayload_(bumonRows, categoryRows, today) {
  const allInputRows = bumonRows.concat(categoryRows);
  const latestDate = getLatestDateOnOrBefore_(allInputRows, today) || today;
  const weeks = buildLegwearWeekWindows_(latestDate, 8);
  const earliestStart = weeks.length
    ? addDaysToDateString_(weeks[weeks.length - 1].startDate, -7)
    : latestDate;
  const inDashboardRange = function(row) {
    const date = String(row.date || '');
    return date && date >= earliestStart && date <= latestDate;
  };
  const filteredBumonRows = bumonRows.filter(inDashboardRange);
  const filteredCategoryRows = categoryRows.filter(inDashboardRange);
  const allDates = getUniqueSortedDates_(filteredBumonRows.concat(filteredCategoryRows));
  const currentWeek = weeks[0] || { startDate: latestDate, endDate: latestDate };
  const currentWeekDates = allDates.filter(function(date) {
    return date >= currentWeek.startDate && date <= currentWeek.endDate;
  });
  return {
    bumonRows: filteredBumonRows,
    categoryRows: filteredCategoryRows,
    allDates: allDates,
    currentWeekDates: currentWeekDates,
    weeks: weeks
  };
}

function getLatestDateOnOrBefore_(rows, today) {
  const dates = getUniqueSortedDates_(rows)
    .filter(function(date) { return date <= today; });
  return dates.length ? dates[0] : '';
}

function getUniqueSortedDates_(rows) {
  return [...new Set(rows.map(function(row) {
    return String(row.date || '');
  }).filter(Boolean))].sort().reverse();
}

function buildLegwearWeekWindows_(referenceDate, count) {
  const currentWeekStart = getMondayDateString_(referenceDate);
  const windows = [];
  for (let i = 0; i < count; i++) {
    const startDate = addDaysToDateString_(currentWeekStart, -7 * i);
    const nominalEndDate = addDaysToDateString_(startDate, 6);
    const endDate = i === 0 ? referenceDate : nominalEndDate;
    windows.push({
      key: startDate + '_' + endDate,
      label: formatWeekLabel_(startDate, endDate, i === 0),
      startDate: startDate,
      endDate: endDate,
      compareKey: addDaysToDateString_(startDate, -7) + '_' + addDaysToDateString_(endDate, -7),
      compareStartDate: addDaysToDateString_(startDate, -7),
      compareEndDate: addDaysToDateString_(endDate, -7),
      isCurrent: i === 0,
      isPartial: endDate !== nominalEndDate
    });
  }
  return windows;
}

function getMondayDateString_(dateString) {
  const date = parseDateString_(dateString);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return formatDate_(addDays_(date, diff));
}

function addDaysToDateString_(dateString, days) {
  return formatDate_(addDays_(parseDateString_(dateString), days));
}

function parseDateString_(dateString) {
  const parts = String(dateString).split('-').map(function(part) { return Number(part); });
  return new Date(parts[0], parts[1] - 1, parts[2]);
}

function formatWeekLabel_(startDate, endDate, isCurrent) {
  const start = parseDateString_(startDate);
  const end = parseDateString_(endDate);
  const label = (start.getMonth() + 1) + '/' + start.getDate() + '週';
  return isCurrent && startDate !== endDate
    ? label + '（' + (end.getMonth() + 1) + '/' + end.getDate() + 'まで）'
    : label;
}

function createDailyTrigger() {
  const exists = ScriptApp.getProjectTriggers().some(function(trigger) {
    return trigger.getHandlerFunction() === 'updateDailyData';
  });
  if (!exists) {
    ScriptApp.newTrigger('updateDailyData').timeBased().atHour(DAILY_TRIGGER_HOUR).everyDays(1).create();
  }
  return { ok: true, created: !exists };
}

function recreateDailyTrigger() {
  ScriptApp.getProjectTriggers().forEach(function(trigger) {
    if (trigger.getHandlerFunction() === 'updateDailyData') {
      ScriptApp.deleteTrigger(trigger);
    }
  });

  ScriptApp.newTrigger('updateDailyData')
    .timeBased()
    .atHour(DAILY_TRIGGER_HOUR)
    .everyDays(1)
    .create();

  return { ok: true, hour: DAILY_TRIGGER_HOUR };
}

function ensureDailyTrigger_() {
  try {
    const exists = ScriptApp.getProjectTriggers().some(function(trigger) {
      return trigger.getHandlerFunction() === 'updateDailyData';
    });
    if (!exists) {
      ScriptApp.newTrigger('updateDailyData')
        .timeBased()
        .atHour(DAILY_TRIGGER_HOUR)
        .everyDays(1)
        .create();
      Logger.log('Created missing updateDailyData trigger at hour ' + DAILY_TRIGGER_HOUR);
    }
  } catch (error) {
    Logger.log('ensureDailyTrigger_ failed: ' + error);
  }
}

function ensureTodayData_() {
  try {
    const ss = getSpreadsheet_();
    const today = getToday_();
    const yesterday = formatDate_(addDays_(new Date(today), -1));
    ensureWeatherDate_(ss, yesterday);
    const todayComplete = ensureWeatherDate_(ss, today);
    if (todayComplete) return;

    Logger.log('Today weather data is missing. Running fallback daily update for ' + today);
    fetchNewsDaily();
    generateProductAlerts();
    generateAnalysisTags();
    sortDataSheets();
  } catch (error) {
    Logger.log('ensureTodayData_ failed: ' + error);
  }
}

function ensureWeatherDate_(ss, targetDate) {
  const enabledZones = getEnabledSettings_('settings_zones').map(function(zone) {
    return zone.zone;
  });
  const existingZones = {};
  readObjects_(ss.getSheetByName('weather_daily')).forEach(function(row) {
    if (row.date === targetDate && row.zone) existingZones[row.zone] = true;
  });
  const missingZones = enabledZones.filter(function(zone) {
    return !existingZones[zone];
  });
  if (!missingZones.length) return true;

  Logger.log('Missing weather zones. Backfilling ' + targetDate + ' / ' + missingZones.join(', '));
  fetchWeatherForDate_(targetDate);
  generateProductAlerts(targetDate);
  generateAnalysisTags(targetDate);
  sortDataSheets();
  return false;
}

function fetchOpenMeteo_(latitude, longitude) {
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(latitude) +
    '&longitude=' + encodeURIComponent(longitude) +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code' +
    '&timezone=Asia%2FTokyo&forecast_days=1';
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (response.getResponseCode() >= 400) {
    throw new Error('Open-Meteo HTTP ' + response.getResponseCode());
  }
  const json = JSON.parse(response.getContentText());
  return {
    temperature_2m_max: json.daily.temperature_2m_max[0],
    temperature_2m_min: json.daily.temperature_2m_min[0],
    precipitation_sum: json.daily.precipitation_sum[0],
    weather_code: json.daily.weather_code[0]
  };
}

function fetchOpenMeteoForecastDays_(latitude, longitude, forecastDays) {
  const days = forecastDays || 8;
  const url = 'https://api.open-meteo.com/v1/forecast?latitude=' + encodeURIComponent(latitude) +
    '&longitude=' + encodeURIComponent(longitude) +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code' +
    '&timezone=Asia%2FTokyo&forecast_days=' + encodeURIComponent(days);
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (response.getResponseCode() >= 400) {
    throw new Error('Open-Meteo Forecast HTTP ' + response.getResponseCode());
  }
  const json = JSON.parse(response.getContentText());
  if (!json.daily || !json.daily.time) return [];

  return json.daily.time.map(function(date, index) {
    return {
      date: date,
      max_temp: toNumberOrBlank_(json.daily.temperature_2m_max[index]),
      min_temp: toNumberOrBlank_(json.daily.temperature_2m_min[index]),
      rain_mm: toNumberOrBlank_(json.daily.precipitation_sum[index]),
      weather_code: json.daily.weather_code[index]
    };
  });
}

function buildWeatherTrend_(weatherRows, today) {
  const startDate = formatDate_(addDays_(new Date(today), -14));
  const zones = getEnabledSettings_('settings_zones');
  const zoneOrder = zones.map(function(zone) { return zone.zone; });
  const zoneMeta = {};
  zones.forEach(function(zone) {
    zoneMeta[zone.zone] = zone;
  });

  const trendRows = weatherRows.filter(function(row) {
    return row.date >= startDate && row.date <= today;
  }).map(function(row) {
    return {
      date: row.date,
      zone: row.zone,
      area_name: row.area_name,
      max_temp: Number(row.max_temp || 0),
      min_temp: Number(row.min_temp || 0),
      avg_temp: Number(row.avg_temp || 0),
      rain_mm: Number(row.rain_mm || 0),
      last_year_max_temp: row.last_year_max_temp === '' ? '' : Number(row.last_year_max_temp || 0),
      last_year_min_temp: row.last_year_min_temp === '' ? '' : Number(row.last_year_min_temp || 0),
      source: 'actual'
    };
  });

  zones.forEach(function(zone) {
    try {
      const forecastRows = fetchOpenMeteoForecastDays_(zone.latitude, zone.longitude, 8);
      const futureRows = forecastRows.filter(function(item) {
        return item.date > today;
      });
      let lastYearForecastMap = {};
      if (futureRows.length) {
        const firstLastYearDate = getLastYearSameWeekdayDate_(futureRows[0].date);
        const lastLastYearDate = getLastYearSameWeekdayDate_(futureRows[futureRows.length - 1].date);
        lastYearForecastMap = fetchOpenMeteoArchiveRange_(zone.latitude, zone.longitude, firstLastYearDate, lastLastYearDate);
      }

      futureRows.forEach(function(item) {
        if (item.date <= today) return;
        const lastYearDate = getLastYearSameWeekdayDate_(item.date);
        const lastYearWeather = lastYearForecastMap[lastYearDate] || {};
        const avgTemp = calcAverageOrBlank_(item.max_temp, item.min_temp);
        trendRows.push({
          date: item.date,
          zone: zone.zone,
          area_name: zone.area_name,
          max_temp: Number(item.max_temp || 0),
          min_temp: Number(item.min_temp || 0),
          avg_temp: Number(avgTemp || 0),
          rain_mm: Number(item.rain_mm || 0),
          last_year_max_temp: lastYearWeather.temperature_2m_max === '' ? '' : toNumberOrBlank_(lastYearWeather.temperature_2m_max),
          last_year_min_temp: lastYearWeather.temperature_2m_min === '' ? '' : toNumberOrBlank_(lastYearWeather.temperature_2m_min),
          source: 'forecast'
        });
      });
    } catch (error) {
      Logger.log('buildWeatherTrend_ forecast failed: ' + zone.zone + ' / ' + error);
    }
    Utilities.sleep(1500);
  });

  return trendRows.sort(function(a, b) {
    const zoneDiff = zoneOrder.indexOf(a.zone) - zoneOrder.indexOf(b.zone);
    if (zoneDiff !== 0) return zoneDiff;
    return String(a.date).localeCompare(String(b.date));
  });
}

function getZoneOrder_() {
  return getEnabledSettings_('settings_zones').map(function(zone) {
    return zone.zone;
  });
}

function sortRowsByZoneOrder_(rows, zoneOrder) {
  return rows.slice().sort(function(a, b) {
    const aIndex = zoneOrder.indexOf(a.zone);
    const bIndex = zoneOrder.indexOf(b.zone);
    const normalizedA = aIndex < 0 ? 9999 : aIndex;
    const normalizedB = bIndex < 0 ? 9999 : bIndex;
    if (normalizedA !== normalizedB) return normalizedA - normalizedB;
    return String(a.zone || '').localeCompare(String(b.zone || ''), 'ja');
  });
}

function fetchOpenMeteoArchive_(latitude, longitude, date) {
  if (!latitude || !longitude || !date) {
    return {};
  }

  const url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + encodeURIComponent(latitude) +
    '&longitude=' + encodeURIComponent(longitude) +
    '&start_date=' + encodeURIComponent(date) +
    '&end_date=' + encodeURIComponent(date) +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code' +
    '&timezone=Asia%2FTokyo';
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (response.getResponseCode() >= 400) {
    throw new Error('Open-Meteo Archive HTTP ' + response.getResponseCode());
  }
  const json = JSON.parse(response.getContentText());
  if (!json.daily || !json.daily.time || !json.daily.time.length) {
    return {};
  }
  return {
    temperature_2m_max: json.daily.temperature_2m_max[0],
    temperature_2m_min: json.daily.temperature_2m_min[0],
    precipitation_sum: json.daily.precipitation_sum[0],
    weather_code: json.daily.weather_code[0]
  };
}

function fetchOpenMeteoArchiveRange_(latitude, longitude, startDate, endDate) {
  if (!latitude || !longitude || !startDate || !endDate) {
    return {};
  }

  const url = 'https://archive-api.open-meteo.com/v1/archive?latitude=' + encodeURIComponent(latitude) +
    '&longitude=' + encodeURIComponent(longitude) +
    '&start_date=' + encodeURIComponent(startDate) +
    '&end_date=' + encodeURIComponent(endDate) +
    '&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,weather_code' +
    '&timezone=Asia%2FTokyo';
  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true, followRedirects: true });
  if (response.getResponseCode() >= 400) {
    throw new Error('Open-Meteo Archive Range HTTP ' + response.getResponseCode());
  }
  const json = JSON.parse(response.getContentText());
  if (!json.daily || !json.daily.time) return {};

  const map = {};
  json.daily.time.forEach(function(date, index) {
    map[date] = {
      temperature_2m_max: json.daily.temperature_2m_max[index],
      temperature_2m_min: json.daily.temperature_2m_min[index],
      precipitation_sum: json.daily.precipitation_sum[index],
      weather_code: json.daily.weather_code[index]
    };
  });
  return map;
}

function fetchNewsItems_(setting) {
  try {
    return fetchGoogleNewsRssItems_(setting);
  } catch (error) {
    Logger.log('Google News RSS fetch failed: ' + setting.keyword + ' / ' + error);
  }

  return [];
}

function fetchGoogleNewsRssItems_(setting) {
  const query = buildNewsQuery_(setting.keyword);
  const url = 'https://news.google.com/rss/search?q=' + encodeURIComponent(query) +
    '&hl=ja&gl=JP&ceid=JP:ja';
  const response = UrlFetchApp.fetch(url, {
    muteHttpExceptions: true,
    followRedirects: true,
    headers: {
      'User-Agent': 'Mozilla/5.0'
    }
  });

  if (response.getResponseCode() >= 400) {
    throw new Error('Google News RSS HTTP ' + response.getResponseCode());
  }

  const document = XmlService.parse(response.getContentText());
  const channel = document.getRootElement().getChild('channel');
  if (!channel) return [];

  return channel.getChildren('item').map(function(item) {
    const title = getXmlText_(item, 'title');
    const link = getXmlText_(item, 'link');
    const rawPublishedAt = getXmlText_(item, 'pubDate');
    const publishedAt = normalizePublishedDate_(rawPublishedAt);
    const sourceElement = item.getChild('source');
    const source = sourceElement ? sourceElement.getText() : 'Googleニュース';
    const summary = stripHtml_(getXmlText_(item, 'description'));

    return {
      sourceType: 'google_news_rss',
      title: title,
      source: source,
      url: link || ('google-news-rss://' + encodeURIComponent(setting.keyword) + '/' + getToday_()),
      publishedAt: publishedAt,
      rawPublishedAt: rawPublishedAt,
      summary: summary || title,
      importance: setting.priority,
      mdInsight: buildDefaultInsight_(setting.keyword)
    };
  }).filter(function(item) {
    return item.title && item.url && isRecentNewsItem_(item);
  }).slice(0, 3);
}

function buildNewsQuery_(keyword) {
  const base = String(keyword || '').trim();
  const legwearContext = '(靴下 OR ソックス OR パンスト OR タイツ OR レッグウェア)';
  const exclusions = '-野球 -MLB -ホワイトソックス -レッドソックス -大リーグ -メジャー when:1d';
  if (base === 'ソックス') {
    return 'ソックス 靴下 OR レッグウェア ' + exclusions;
  }
  if (base.match(/靴下|ソックス|パンスト|タイツ|レッグ|レギンス/)) {
    return base + ' OR レッグウェア ' + exclusions;
  }
  return base + ' ' + legwearContext + ' ' + exclusions;
}

function isRelevantNewsItem_(setting, item) {
  return classifyNewsItem_(setting, item).status === 'accept';
}

function classifyNewsItem_(setting, item) {
  const keyword = String(setting.keyword || '');
  const text = [item.title, item.summary, item.source].join(' ');

  if (isSportsSockNoise_(text)) return { status: 'exclude', reason: '野球・スポーツ系ノイズ' };
  if (isAdultEntertainmentNoise_(text) && !isCharacterMerchLegwear_(text)) {
    return { status: 'exclude', reason: '成人・芸能系ノイズ' };
  }
  if (hasEntertainmentOnlyContext_(text) && !isCharacterMerchLegwear_(text)) {
    return { status: 'review', reason: 'エンタメ/生活者文脈。商品性確認待ち' };
  }

  if (keyword.indexOf('市場') >= 0) {
    if (hasMarketOrRetailContext_(text) && hasLegwearContext_(text)) {
      return { status: 'accept', reason: '市場・小売文脈あり' };
    }
    return { status: 'review', reason: '市場キーワードだが市場/小売文脈が弱い' };
  }

  if (keyword === 'ソックス' || keyword === '靴下' || keyword.indexOf('靴下') >= 0) {
    if (hasLegwearContext_(text) && hasMerchandisingContext_(text)) {
      return { status: 'accept', reason: '靴下商品・小売文脈あり' };
    }
    return { status: 'review', reason: '靴下文脈あり。商品・小売文脈確認待ち' };
  }

  if (keyword.match(/パンスト|タイツ|ストッキング/)) {
    if (hasMerchandisingContext_(text)) {
      return { status: 'accept', reason: 'パンスト/タイツの商品文脈あり' };
    }
    return { status: 'review', reason: 'パンスト/タイツ文脈あり。商品性確認待ち' };
  }

  if (keyword.match(/レギンス/) && !hasMerchandisingContext_(text)) {
    return { status: 'review', reason: 'レギンス文脈あり。商品・着こなし価値確認待ち' };
  }

  if (keyword.indexOf('ソックス') >= 0 && !hasLegwearContext_(text)) {
    return { status: 'review', reason: 'ソックス複合キーワードだがレッグ文脈が弱い' };
  }

  return { status: 'accept', reason: '採用' };
}

function isRecentNewsItem_(item) {
  const raw = item.rawPublishedAt || item.publishedAt;
  const published = new Date(raw);
  if (isNaN(published.getTime())) return false;

  const oldest = Date.now() - NEWS_LOOKBACK_HOURS * 60 * 60 * 1000;
  return published.getTime() >= oldest;
}

function isSportsSockNoise_(text) {
  return String(text || '').match(
    /ホワイトソックス|レッドソックス|MLB|大リーグ|メジャー|野球|球団|投手|打者|本塁打|勝ち越し|連勝|連敗|ドジャース|ヤンキース|カブス|レッドソックス|ホワイトソックス/
  ) !== null;
}

function isAdultEntertainmentNoise_(text) {
  return String(text || '').match(
    /コスプレ|グラビア|美乳|セクシー|大人セクシー|DVD|アイドル|声優|えなこ|パンストダンサー|パンティ|ストッキング姿|網タイツの破壊力|愛人秘書|奇跡の\d+歳|写真集|水着|谷間|胸元|バスト|ハンカチ|ダイエット|激変|芸能|炎上|不倫|秘書/
  ) !== null;
}

function hasEntertainmentOnlyContext_(text) {
  return String(text || '').match(
    /攻略|イベント|ゲーム|芸能|グラドル|メイド服|ハンドメイド|育児|見守りカメラ|お昼寝|サンダル|スニーカー|シャンダル/
  ) !== null;
}

function isCharacterMerchLegwear_(text) {
  const value = String(text || '');
  const hasCharacterContext = value.match(
    /キャラクター|アニメ|漫画|マンガ|ゲーム|サンリオ|ディズニー|ポケモン|ちいかわ|ミッフィー|ムーミン|スヌーピー|ピーナッツ|ナルミヤ|パックマン|初音ミク/
  ) !== null;
  const hasLegwear = value.match(/靴下|くつ下|ソックス|レッグウェア|タイツ|パンスト|ストッキング/) !== null;
  const hasMerch = value.match(/発売|新発売|商品|コラボ|限定|販売|店舗|店頭|ブランド|シリーズ/) !== null;

  return hasCharacterContext && hasLegwear && hasMerch;
}

function hasLegwearContext_(text) {
  return String(text || '').match(
    /靴下|くつ下|ソックス売場|レッグウェア|パンスト|タイツ|レギンス|フットカバー|着圧|冷感|吸湿発熱|あったか|裏起毛|衣料|アパレル|ファッション|しまむら|ユニクロ|GU|ワークマン|ドンキ|ドン・キホーテ/
  ) !== null;
}

function hasMerchandisingContext_(text) {
  return String(text || '').match(
    /発売|新発売|新商品|商品|売上|市場|小売|店舗|店頭|売場|価格|値下げ|セール|PB|ブランド|コラボ|コーデ|着こなし|防寒|冷感|UV|機能|メーカー|工場|楽天|アツギ|福助|グンゼ|靴下屋|しまむら|ユニクロ|GU|ワークマン|ドンキ|ドン・キホーテ|無印良品|PR TIMES|日本経済新聞|流通|アパレル|ファッション/
  ) !== null;
}

function hasMarketOrRetailContext_(text) {
  return String(text || '').match(
    /市場|売上|調査|規模|シェア|成長|予測|発売|新発売|新商品|商品|小売|店舗|店頭|売場|価格|値下げ|セール|PB|ブランド|コラボ|メーカー|工場|楽天|PR TIMES|日本経済新聞|流通|アパレル|ファッション|しまむら|ユニクロ|GU|ワークマン|ドンキ|ドン・キホーテ/
  ) !== null;
}

function buildDummyNewsItems_(setting) {
  const today = getToday_();
  const seedUrl = 'dummy://md-environment-radar/' + encodeURIComponent(setting.keyword) + '/' + today;
  return [{
    sourceType: 'dummy',
    title: setting.keyword + ' 関連の外部環境チェック',
    source: '仮ニュース',
    url: seedUrl,
    publishedAt: today,
    summary: setting.memo + '。後でRSS、News API、AI要約に差し替え可能な仮データです。',
    importance: setting.priority,
    mdInsight: buildDefaultInsight_(setting.keyword)
  }];
}

function getXmlText_(element, childName) {
  const child = element.getChild(childName);
  return child ? child.getText() : '';
}

function stripHtml_(text) {
  return String(text || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizePublishedDate_(value) {
  const date = new Date(value);
  if (isNaN(date.getTime())) return getToday_();
  return Utilities.formatDate(date, TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
}


function getSpreadsheet_() {
  if (SPREADSHEET_ID && SPREADSHEET_ID.indexOf('PASTE_') !== 0) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  const files = DriveApp.getFilesByName(SPREADSHEET_NAME);
  while (files.hasNext()) {
    const file = files.next();
    if (file.getMimeType() === MimeType.GOOGLE_SHEETS) {
      return SpreadsheetApp.openById(file.getId());
    }
  }

  throw new Error('Drive内に「' + SPREADSHEET_NAME + '」というGoogleスプレッドシートが見つかりません。');
}

function ensureHeaders_(sheet, headers) {
  const lastColumn = Math.max(sheet.getLastColumn(), headers.length);
  const current = sheet.getRange(1, 1, 1, lastColumn).getValues()[0];
  headers.forEach(function(header, index) {
    if (current[index] !== header) {
      sheet.getRange(1, index + 1).setValue(header);
    }
  });
}

function buildHeaderMap_(headers) {
  const map = {};
  headers.forEach(function(header, index) {
    if (header) map[header] = index;
  });
  return map;
}

function formatHeader_(sheet, headerLength) {
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headerLength)
    .setBackground('#1F4E78')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold')
    .setWrap(true);
  sheet.autoResizeColumns(1, headerLength);
}

function seedSettings_(sheet, initialRows) {
  if (sheet.getLastRow() > 1) return;
  sheet.getRange(2, 1, initialRows.length, initialRows[0].length).setValues(initialRows);
}

function getEnabledSettings_(sheetName) {
  return readObjects_(getSpreadsheet_().getSheetByName(sheetName))
    .filter(function(row) { return row.enabled === true || String(row.enabled).toUpperCase() === 'TRUE'; });
}

function readObjects_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const headers = values.shift();
  return values.filter(function(row) {
    return row.some(function(value) { return value !== ''; });
  }).map(function(row) {
    const obj = {};
    headers.forEach(function(header, index) {
      obj[header] = normalizeValue_(row[index]);
    });
    return obj;
  });
}

function latestObjects_(sheet, limit) {
  const rows = readObjects_(sheet);
  return rows.slice(Math.max(rows.length - limit, 0)).reverse();
}

function appendRows_(sheet, rows) {
  if (!rows.length) return;
  sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
}

function sortSheetByDate_(sheet) {
  if (!sheet || sheet.getLastRow() < 3) return;
  sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn())
    .sort([
      { column: 1, ascending: true },
      { column: 2, ascending: true },
      { column: 3, ascending: true }
    ]);
}

function getExistingKeys_(sheet, columnIndexes) {
  const set = {};
  if (!sheet || sheet.getLastRow() < 2) return set;
  const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).getValues();
  values.forEach(function(row) {
    const key = columnIndexes.map(function(index) { return normalizeValue_(row[index]); }).join('|');
    set[key] = true;
  });
  return set;
}

function getExistingColumnSet_(sheet, columnIndex) {
  const set = {};
  if (!sheet || sheet.getLastRow() < 2) return set;
  const values = sheet.getRange(2, columnIndex + 1, sheet.getLastRow() - 1, 1).getValues();
  values.forEach(function(row) {
    if (row[0]) set[String(row[0])] = true;
  });
  return set;
}

function addAlertIfNew_(rows, existingKeys, alert) {
  if (!alert.alertType) return;
  const key = [alert.date, alert.category, alert.keyword, alert.alertType, alert.evidence].join('|');
  if (existingKeys[key]) return;
  rows.push([
    alert.date, alert.category, alert.keyword, alert.alertType, alert.evidence,
    alert.importance, alert.salesCheckPoint, alert.action, alert.createdAt
  ]);
  existingKeys[key] = true;
}

function calcTempDiff_(sheet, zone, baseDate, offsetDays, currentAvg) {
  const targetDate = formatDate_(addDays_(new Date(baseDate), offsetDays));
  const rows = readObjects_(sheet);
  const match = rows.reverse().find(function(row) {
    return row.date === targetDate && row.zone === zone;
  });
  if (!match || match.avg_temp === '') return '';
  return round1_(currentAvg - Number(match.avg_temp));
}

function getLastYearSameWeekdayDate_(dateString) {
  return formatDate_(addDays_(new Date(dateString), -364));
}

function calcAverageOrBlank_(maxValue, minValue) {
  if (maxValue === '' || minValue === '') return '';
  return round1_((Number(maxValue) + Number(minValue)) / 2);
}

function diffOrBlank_(currentValue, baseValue) {
  if (currentValue === '' || baseValue === '') return '';
  return round1_(Number(currentValue) - Number(baseValue));
}

function toNumberOrBlank_(value) {
  if (value === '' || value === null || typeof value === 'undefined') return '';
  const number = Number(value);
  return Number.isNaN(number) ? '' : round1_(number);
}

function buildWeatherAlert_(zone, maxTemp, rainMm, lastWeekDiff) {
  const parts = [];
  if (maxTemp >= 30) parts.push('夏物強化');
  else if (maxTemp >= 25) parts.push('冷感・UV・さらさら前出し確認');
  else if (maxTemp < 15 && isColdSeason_()) parts.push('防寒レッグ継続');
  else if (maxTemp < 15) parts.push('低温による春夏動向確認');
  if (Number(lastWeekDiff || 0) >= 5) parts.push('売場切替前倒し');
  if (rainMm >= 20) parts.push('大雨影響確認');
  return parts.length ? zone + '：' + parts.join(' / ') : zone + '：通常観測';
}

function buildColdSeasonAlert_(maxTemp) {
  if (maxTemp >= 15) {
    return { alertType: '' };
  }

  if (isColdSeason_()) {
    return {
      category: 'レッグ',
      keyword: '防寒レッグ',
      alertType: '低温継続',
      importance: 4,
      salesCheckPoint: 'タイツ、あったか靴下、防寒系の継続需要を確認',
      action: '防寒レッグの売場縮小を急ぎすぎない'
    };
  }

  return {
    category: 'レディースレッグ',
    keyword: '薄手レッグ',
    alertType: '季節外低温',
    importance: 2,
    salesCheckPoint: 'パンスト、レギンス、薄手ソックスの前週同曜日比・前年差・荒利率を確認',
    action: '低温で上がる前提にせず、春夏切替の売上影響として検証'
  };
}

function isColdSeason_() {
  const month = Number(Utilities.formatDate(new Date(), TIME_ZONE, 'M'));
  return month >= 10 || month <= 3;
}

function isColdSeasonDate_(dateString) {
  const date = new Date(String(dateString || getToday_()) + 'T00:00:00');
  const month = Number(Utilities.formatDate(date, TIME_ZONE, 'M'));
  return month >= 10 || month <= 3;
}

function calcNewsImportance_(row) {
  const title = String(row.title || '');
  const sourceType = String(row.source_type || '');
  const base = Number(row.importance || 3);

  if (title.match(/発売|新発売|新商品|コラボ|限定|価格|値下げ|売上|市場|小売|店舗|しまむら|ユニクロ|ワークマン|ドンキ|ドン・キホーテ/)) {
    return Math.min(5, Math.max(base, 4));
  }

  if (sourceType === 'google_news_rss') {
    return Math.min(base, 3);
  }

  return base;
}

function buildDefaultInsight_(keyword) {
  if (String(keyword).match(/冷感|UV|さらさら|暑さ|猛暑/)) {
    return '気温上昇週は、冷感ソックス単品訴求よりも「通勤・仕事の日の足もと快適」に寄せる';
  }
  if (String(keyword).match(/着圧/)) {
    return '通勤・立ち仕事需要と合わせて、機能訴求を棚前で見える化する';
  }
  if (String(keyword).match(/パンスト/)) {
    return '気温が不安定な週はパンスト継続と夏物切替の両方を確認する';
  }
  return '売上分析時に外部要因として確認する';
}

function buildTempTag_(maxTemp, lastWeekDiff) {
  if (maxTemp >= 30) return '真夏日';
  if (maxTemp >= 25) return '夏日';
  if (maxTemp < 15) return '低温';
  if (lastWeekDiff >= 5) return '急上昇';
  return '平常';
}

function buildRainTag_(rainMm) {
  if (rainMm >= 20) return '大雨';
  if (rainMm > 0) return '雨';
  return '雨なし';
}

function buildActionHint_(weather, alerts) {
  if (alerts.length) {
    return alerts.slice(0, 3).map(function(alert) { return alert.action; }).join(' / ');
  }
  return weather.weather_alert || '定点観測を継続';
}

function buildActionableTempTags_(weather) {
  const tags = [];
  const maxTemp = Number(weather.max_temp);
  const lastWeekDiff = Number(weather.temp_vs_last_week);
  const lastYearDiff = Number(weather.temp_vs_last_year_same_weekday);
  if (!Number.isNaN(maxTemp)) {
    if (maxTemp >= 30) tags.push('真夏日30℃以上');
    else if (maxTemp >= 25) tags.push('夏日25℃以上');
    else if (maxTemp < 15) tags.push('季節外低温15℃未満');
  }
  if (!Number.isNaN(lastWeekDiff)) {
    if (lastWeekDiff >= 5) tags.push('前週同曜日比+5℃以上');
    else if (lastWeekDiff <= -5) tags.push('前週同曜日比-5℃以下');
  }
  if (!Number.isNaN(lastYearDiff)) {
    if (lastYearDiff >= 3) tags.push('前年差+3℃以上');
    else if (lastYearDiff <= -3) tags.push('前年差-3℃以下');
  }
  return unique_(tags);
}

function buildActionableWeatherTags_(weather) {
  const tags = [];
  const rain = Number(weather.rain_mm);
  if (!Number.isNaN(rain)) {
    if (rain >= 20) tags.push('大雨20mm以上');
    else if (rain >= 5) tags.push('降水5mm以上');
  }
  const code = Number(weather.weather_code);
  if (!Number.isNaN(code) && code >= 95) tags.push('雷雨注意');
  return unique_(tags);
}

function buildMarketTag_(importantAlerts, tempTags, weatherTags) {
  const tags = [];
  if (tempTags.length) tags.push('気温変化あり');
  if (weatherTags.length) tags.push('降水影響あり');
  if (importantAlerts.some(function(alert) { return alert.alert_type === 'ニュース反応'; })) {
    tags.push('ニュース反応あり');
  }
  if (importantAlerts.some(function(alert) { return alert.alert_type !== 'ニュース反応'; })) {
    tags.push('商品アラートあり');
  }
  return unique_(tags).join(' / ') || '-';
}

function buildAnalysisProductTag_(importantAlerts, relatedAlerts, weather, tempTags, weatherTags) {
  const source = importantAlerts.length ? importantAlerts : relatedAlerts;
  const tags = unique_(source.map(function(alert) {
    return buildProductTagFromAlert_(alert);
  }).filter(Boolean));
  const tempValidationTag = buildProductTempValidationTag_(weather, tempTags, weatherTags);
  if (tempValidationTag) tags.unshift(tempValidationTag);
  if (!tags.length) {
    const weatherTag = buildWeatherBasedProductTag_(weather, tempTags, weatherTags);
    if (weatherTag) tags.push(weatherTag);
  }
  return tags.slice(0, 3).join(' / ') || '-';
}

function buildProductTempValidationTag_(weather, tempTags, weatherTags) {
  const maxTemp = Number(weather.max_temp);
  const weekDiff = Number(weather.temp_vs_last_week);
  const tagsText = tempTags.concat(weatherTags).join(' ');
  const hasHighSignal =
    (!Number.isNaN(weekDiff) && weekDiff >= 2) ||
    (!Number.isNaN(maxTemp) && maxTemp >= 25) ||
    tagsText.match(/夏日|真夏日|前週同曜日比\+/);
  const hasLowSignal =
    (!Number.isNaN(weekDiff) && weekDiff <= -2) ||
    tagsText.match(/季節外低温|前週同曜日比-|前年差-3℃/);

  if (hasHighSignal) {
    return '気温寄与候補｜高温・ゾーン補正後｜パンスト/価格訴求・レディースベーシック・ココピタを前週同曜日比/前年差/荒利率で検証';
  }
  if (hasLowSignal) {
    return '気温寄与検証｜低温・ゾーン補正後｜パンスト上昇は断定せず、春夏切替/キャラクター/ベーシックの実績差を確認';
  }
  return '';
}

function buildProductTagFromAlert_(alert) {
  const text = [
    alert.category,
    alert.keyword,
    alert.alert_type,
    alert.sales_check_point,
    alert.action,
    alert.evidence
  ].join(' ');
  const theme = detectProductTheme_(text);
  if (!theme) return '';
  const trigger = detectDemandTrigger_(text);
  const viewpoint = detectCheckViewpoint_(text);
  return theme + '｜' + trigger + '｜' + viewpoint;
}

function buildWeatherBasedProductTag_(weather, tempTags, weatherTags) {
  const maxTemp = Number(weather.max_temp);
  const date = String(weather.date || getToday_());
  const tagsText = tempTags.concat(weatherTags).join(' ');
  if (tagsText.indexOf('季節外低温') >= 0 || (!Number.isNaN(maxTemp) && maxTemp < 15 && !isColdSeasonDate_(date))) {
    return '春夏切替検証｜季節外低温｜パンスト上昇は断定せず、薄手レッグの前週同曜日比・前年差・荒利率で影響確認';
  }
  if (!Number.isNaN(maxTemp) && maxTemp < 15 && isColdSeasonDate_(date)) {
    return '防寒レッグ｜低温継続｜タイツ/あったか靴下の前週同曜日比・前年差・荒利率を確認';
  }
  if (tagsText.match(/真夏日|夏日|前週同曜日比\+5℃|前年差\+3℃/)) {
    return '春夏快適系｜高温・気温上昇｜冷感/UV/さらさら/薄手ソックスの前週同曜日比・前年差・欠品を確認';
  }
  if (tagsText.match(/前週同曜日比-5℃|前年差-3℃/)) {
    return '気温低下検証｜気温反動｜春夏快適系の鈍化と薄手レッグ残り需要をゾーン補正後で実績確認';
  }
  if (tagsText.match(/大雨|降水|雷雨/)) {
    return '雨天影響候補｜来店・客数変動｜ソックス/薄手レッグの前週同曜日比と客数影響を確認';
  }
  return '';
}

function detectProductTheme_(text) {
  const value = String(text || '');
  if (value.match(/冷感|UV|さらさら|暑さ|猛暑|夏物|エアリズム|吸水速乾/)) {
    return '春夏快適系';
  }
  if (value.match(/パンスト|ストッキング|薄手レッグ/)) {
    return '薄手レッグ';
  }
  if (value.match(/タイツ|レギンス|防寒|あったか|吸湿発熱|裏起毛|ヒートテック/)) {
    return isColdSeason_() ? '防寒レッグ' : '気温低下影響';
  }
  if (value.match(/着圧|サポート|立ち仕事|通勤/)) {
    return '機能サポート系';
  }
  if (value.match(/ルームソックス|室内/)) {
    return '室内・リラックス系';
  }
  if (value.match(/5本指|五本指/)) {
    return '機能定番';
  }
  if (value.match(/コラボ|限定|キャラクター|サンリオ|ディズニー|STAR WARS|スター・ウォーズ|アニメ/)) {
    return '企画・コラボ商品';
  }
  if (value.match(/ドンキ|ドン・キホーテ|ワークマン|ユニクロ|しまむら|GU/)) {
    return '競合訴求';
  }
  if (value.match(/靴下|ソックス|レッグウェア|レッグ/)) {
    return 'ソックス定番';
  }
  if (value.match(/売場切替|売場|SKU|投入/)) {
    return '売場運用';
  }
  return '';
}

function detectDemandTrigger_(text) {
  const value = String(text || '');
  if (value.match(/気温上昇|高温|暑さ|猛暑|夏物|冷感|UV|さらさら/)) return '高温・春夏需要';
  if (value.match(/季節外低温/)) return '季節外低温・春夏切替検証';
  if (value.match(/低温|防寒|あったか|吸湿発熱|裏起毛/)) return '低温・防寒/継続需要';
  if (value.match(/大雨|降雨|雨天|降水/)) return '雨天・来店影響';
  if (value.match(/ニュース反応|発売|新発売|新商品|コラボ|限定|価格|値下げ/)) return 'ニュース/販促反応';
  if (value.match(/競合|ドンキ|ドン・キホーテ|ワークマン|ユニクロ|しまむら|GU/)) return '競合売場・価格訴求';
  if (value.match(/売場切替|SKU|投入|前倒し/)) return '売場切替タイミング';
  return '外部要因反応';
}

function detectCheckViewpoint_(text) {
  const value = String(text || '');
  const points = [];
  if (value.match(/欠品|SKU|投入|売場|前出し|切替/)) points.push('売場/SKU/欠品');
  if (value.match(/価格|値下げ|値頃|セール|競合/)) points.push('価格/競合');
  if (value.match(/ニュース|発売|新商品|コラボ|限定/)) points.push('ニュース起点の売上反応');
  if (value.match(/雨|来店|客数/)) points.push('客数/来店影響');
  points.push('前週比・前年差・荒利率');
  return unique_(points).slice(0, 3).join('確認、') + '確認';
}

function buildAnalysisActionHint_(weather, importantAlerts, relatedAlerts, tempTags, weatherTags) {
  const source = importantAlerts.length ? importantAlerts : relatedAlerts;
  const actions = unique_(source.map(function(alert) {
    return alert.action;
  }).filter(Boolean));
  if (actions.length) return actions.slice(0, 3).join(' / ');

  const factors = tempTags.concat(weatherTags).join(' / ');
  if (factors) {
    return weather.zone + '：' + factors + '。売上の前週同曜日比・前年差・荒利率を確認';
  }
  return weather.zone + '：分析上の注目要因なし';
}

function getToday_() {
  return formatDate_(new Date());
}

function getNow_() {
  return Utilities.formatDate(new Date(), TIME_ZONE, 'yyyy-MM-dd HH:mm:ss');
}

function formatDate_(date) {
  return Utilities.formatDate(date, TIME_ZONE, 'yyyy-MM-dd');
}

function addDays_(date, days) {
  const copied = new Date(date.getTime());
  copied.setDate(copied.getDate() + days);
  return copied;
}

function getWeekNumber_(date) {
  const target = new Date(date.valueOf());
  const dayNumber = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNumber + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const firstDayNumber = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDayNumber + 3);
  return 1 + Math.round((target - firstThursday) / 604800000);
}

function normalizeValue_(value) {
  if (Object.prototype.toString.call(value) === '[object Date]') return formatDate_(value);
  return value;
}

function toNumber_(value) {
  const number = Number(value);
  return isNaN(number) ? 0 : round1_(number);
}

function round1_(value) {
  return Math.round(Number(value) * 10) / 10;
}

function formatSigned_(value) {
  if (value === '' || value === null || typeof value === 'undefined') return '±0';
  return Number(value) > 0 ? '+' + value : String(value);
}

function unique_(values) {
  const seen = {};
  return values.filter(function(value) {
    if (!value || seen[value]) return false;
    seen[value] = true;
    return true;
  });
}
// ==================== レッグウェア売上実績 ====================
const LEGWEAR_SHEET_DEFS = {
  legwear_bumon_daily: [
    'date', 'week_no', 'weekday', 'zone_code', 'zone_name',
    '部門CD', '部門名', '売上予算', '売上実績', '達成率',
    '前年同週同曜日実績', '前年比', '販売荒利高', '荒利率', '前年荒利高'
  ],
  legwear_category_daily: [
    'date', 'week_no', 'weekday', 'zone_code', 'zone_name',
    '部門CD', '部門名', 'カテゴリCD', 'カテゴリ名',
    'サブカテCD', 'サブカテ名', '実績数量', '実績金額',
    '前年同週同曜日数量', '前年同週同曜日実績', '昨年対比',
    '販売荒利高', '荒利率', '前年荒利高'
  ],
};

// weather_dailyをクリアするだけ（ヘッダーは残す）
function clearWeatherDaily() {
  setupSpreadsheet();
  const ss = getSpreadsheet_();
  const sh = ss.getSheetByName('weather_daily');
  if (!sh) { Logger.log('weather_daily not found'); return; }
  const lastRow = sh.getLastRow();
  if (lastRow > 1) sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).clearContent();
  Logger.log('weather_daily cleared');
}

// 指定した日数分だけ取得（例: fetchWeatherDays_(0,1) = 今日・昨日）
function fetchWeatherDays_(fromDaysAgo, toDaysAgo) {
  setupSpreadsheet();
  const today = new Date();
  let totalRows = 0;
  for (let i = fromDaysAgo; i >= toDaysAgo; i--) {
    const dateStr = formatDate_(addDays_(today, -i));
    Logger.log('Fetching: ' + dateStr);
    try {
      const count = fetchWeatherForDate_(dateStr);
      totalRows += count;
      Logger.log('  -> ' + count + ' rows');
    } catch(e) { Logger.log('  -> Error: ' + e); }
  }
  sortDataSheets();
  Logger.log('Batch done. rows: ' + totalRows);
  return totalRows;
}

// ① 7〜5日前（3日分 ≒ 3分）
function refetchWeatherBatch1() { fetchWeatherDays_(7, 5); }
// ② 4〜2日前（3日分 ≒ 3分）
function refetchWeatherBatch2() { fetchWeatherDays_(4, 2); }
// ③ 昨日・今日（2日分 ≒ 2分）
function refetchWeatherBatch3() { fetchWeatherDays_(1, 0); }

// 今日の product_alerts / analysis_tags をクリアして再生成（旧ゾーンアラートの削除に使う）
function regenerateTodayAlerts() {
  setupSpreadsheet();
  const ss = getSpreadsheet_();
  const today = getToday_();
  const alertSheet = ss.getSheetByName('product_alerts');
  const tagSheet   = ss.getSheetByName('analysis_tags');
  if (alertSheet) clearDateRows_(alertSheet, [today]);
  if (tagSheet)   clearDateRows_(tagSheet,   [today]);
  generateProductAlerts(today);
  generateAnalysisTags(today);
  Logger.log('regenerateTodayAlerts done for ' + today);
  return { ok: true, date: today };
}

// GASエディタから手動実行：settings_zonesを売上ゾーンに合わせて更新
function resetZones() {
  const ss = getSpreadsheet_();
  const sh = ss.getSheetByName('settings_zones');
  if (!sh) { Logger.log('settings_zones not found'); return; }
  const lastRow = sh.getLastRow();
  if (lastRow > 1) sh.getRange(2, 1, lastRow - 1, sh.getLastColumn()).clearContent();
  sh.getRange(2, 1, INITIAL_ZONES.length, INITIAL_ZONES[0].length).setValues(INITIAL_ZONES);
  Logger.log('Zones reset: ' + INITIAL_ZONES.length + ' zones');
}

// GASエディタから手動実行してシートヘッダーを修正する
function fixLegwearHeaders() {
  const ss = getSpreadsheet_();
  Object.keys(LEGWEAR_SHEET_DEFS).forEach(function(sheetName) {
    const sh = ss.getSheetByName(sheetName);
    if (!sh) return;
    ensureHeaders_(sh, LEGWEAR_SHEET_DEFS[sheetName]);
    Logger.log('Fixed headers for: ' + sheetName);
  });
}

function clearDateRows_(sheet, dates) {
  const dateSet = new Set(dates);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;
  const lastCol = sheet.getLastColumn();
  const allData = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
  const toKeep = allData.filter(function(row) {
    return !dateSet.has(String(normalizeValue_(row[0])));
  });
  const deleted = allData.length - toKeep.length;
  // 一括クリア→一括書き戻し（行ごと削除より高速）
  sheet.getRange(2, 1, lastRow - 1, lastCol).clearContent();
  if (toKeep.length > 0) {
    sheet.getRange(2, 1, toKeep.length, lastCol).setValues(toKeep);
  }
  return deleted;
}

// ── GitHub Export ─────────────────────────────────────────────────────────

function exportToGithub_(dashboardData) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  const owner = props.getProperty('GITHUB_OWNER');
  const repo  = props.getProperty('GITHUB_REPO');
  const branch = props.getProperty('GITHUB_BRANCH') || 'main';

  if (!token || !owner || !repo) {
    Logger.log('exportToGithub_: GITHUB_TOKEN / GITHUB_OWNER / GITHUB_REPO not set — skipping');
    return { ok: false, reason: 'github credentials not configured' };
  }

  const ss = getSpreadsheet_();
  const sheetNames = Object.keys(SHEET_DEFINITIONS).concat(['legwear_bumon_daily', 'legwear_category_daily']);
  const files = {};

  sheetNames.forEach(function(sheetName) {
    const sheet = ss.getSheetByName(sheetName);
    if (!sheet) return;
    files['data/' + sheetName + '.json'] = readObjects_(sheet);
  });

  if (dashboardData) {
    files['data/dashboard_data.json'] = dashboardData;
  }

  files['data/meta.json'] = {
    updated_at: getNow_(),
    today: getToday_(),
    sheets: sheetNames
  };

  let errors = 0;
  Object.keys(files).forEach(function(path) {
    try {
      pushFileToGithub_(token, owner, repo, branch, path, JSON.stringify(files[path]));
    } catch (err) {
      Logger.log('exportToGithub_: failed ' + path + ' / ' + err);
      errors++;
    }
  });

  Logger.log('exportToGithub_: done files=' + Object.keys(files).length + ' errors=' + errors);
  return { ok: errors === 0, errors: errors, files: Object.keys(files).length };
}

function pushFileToGithub_(token, owner, repo, branch, path, content) {
  const apiUrl = 'https://api.github.com/repos/' + owner + '/' + repo + '/contents/' + path;
  const headers = {
    'Authorization': 'Bearer ' + token,
    'Accept': 'application/vnd.github.v3+json',
    'X-GitHub-Api-Version': '2022-11-28'
  };

  let sha = null;
  try {
    const getResp = UrlFetchApp.fetch(apiUrl + '?ref=' + branch, {
      headers: headers,
      muteHttpExceptions: true
    });
    if (getResp.getResponseCode() === 200) {
      sha = JSON.parse(getResp.getContentText()).sha;
    }
  } catch (e) {}

  const body = {
    message: 'data: update ' + path + ' [' + getToday_() + ']',
    content: Utilities.base64Encode(content, Utilities.Charset.UTF_8),
    branch: branch
  };
  if (sha) body.sha = sha;

  const putResp = UrlFetchApp.fetch(apiUrl, {
    method: 'PUT',
    headers: Object.assign({ 'Content-Type': 'application/json' }, headers),
    payload: JSON.stringify(body),
    muteHttpExceptions: true
  });

  const code = putResp.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error('GitHub API ' + code + ': ' + putResp.getContentText().slice(0, 300));
  }
}

// テスト実行用（GASエディタから直接呼ぶ）
function testExportToGithub() {
  const result = exportToGithub_(null);
  Logger.log(JSON.stringify(result));
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    // 日付指定で行を削除するアクション
    if (data.action === 'clear_dates') {
      if (!data.sheet || !data.dates) return res_({ok:false, error:'invalid payload'});
      const ss = getSpreadsheet_();
      const sh = ss.getSheetByName(data.sheet);
      if (!sh) return res_({ok:false, error:'sheet not found: '+data.sheet});
      const deleted = clearDateRows_(sh, data.dates);
      return res_({ok:true, deleted:deleted});
    }

    const sheetName = data.sheet;
    const rows = data.rows;

    if (!sheetName || !rows || !rows.length) return res_({ok:false, error:'invalid payload'});
    if (!LEGWEAR_SHEET_DEFS[sheetName]) return res_({ok:false, error:'unknown sheet: '+sheetName});

    const ss = getSpreadsheet_();
    const headers = LEGWEAR_SHEET_DEFS[sheetName];
    let sh = ss.getSheetByName(sheetName);
    if (!sh) {
      sh = ss.insertSheet(sheetName);
      ensureHeaders_(sh, headers);
      formatHeader_(sh, headers.length);
    }
    ensureHeaders_(sh, headers);

    // 重複キー定義
    const keyColumns = sheetName === 'legwear_bumon_daily'
      ? [0, 3, 5]        // date, zone_code, 部門CD
      : [0, 3, 5, 7, 9]; // date, zone_code, 部門CD, カテゴリCD, サブカテCD

    const existingKeys = getExistingKeys_(sh, keyColumns);
    const newRows = rows.filter(function(row) {
      const key = keyColumns.map(function(i){ return String(row[i]||''); }).join('|');
      if (existingKeys[key]) return false;
      existingKeys[key] = true; // 同一バッチ内の重複も防ぐ
      return true;
    });

    if (newRows.length) {
      appendRows_(sh, newRows);
      sortSheetByDate_(sh);
    }

    return res_({ok:true, appended:newRows.length, skipped:rows.length-newRows.length, sheet:sheetName});
  } catch(err) {
    return res_({ok:false, error:String(err)});
  }
}

function res_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function analyzeWeatherSalesProductMovementTemp() {
  const ss = getSpreadsheet_();
  const weatherRows = readObjects_(ss.getSheetByName('weather_daily'));
  const salesRows = readObjects_(ss.getSheetByName('legwear_category_daily'));
  const weatherByKey = {};
  weatherRows.forEach(function(row) {
    if (!row.date || !row.zone) return;
    weatherByKey[row.date + '|' + row.zone] = row;
  });

  const salesByKey = {};
  salesRows.forEach(function(row) {
    const key = buildTempSalesKey_(row.date, row.zone_name, row['部門名'], row['カテゴリ名'], row['サブカテ名']);
    if (!key) return;
    salesByKey[key] = row;
  });

  const groups = {};
  const dateSet = {};
  let matchedRows = 0;
  salesRows.forEach(function(row) {
    const date = row.date;
    const zone = row.zone_name;
    if (!date || !zone || !row['カテゴリ名'] || !row['サブカテ名']) return;
    const weather = weatherByKey[date + '|' + zone];
    if (!weather) return;
    const lastWeekDate = formatDate_(addDays_(new Date(date + 'T00:00:00'), -7));
    const lastWeek = salesByKey[buildTempSalesKey_(lastWeekDate, zone, row['部門名'], row['カテゴリ名'], row['サブカテ名'])];
    if (!lastWeek) return;

    const actual = Number(row['実績金額'] || 0);
    const lastWeekActual = Number(lastWeek['実績金額'] || 0);
    const lastYearActual = Number(row['前年同週同曜日実績'] || 0);
    if (actual + lastWeekActual < 10000 || lastWeekActual < 3000) return;

    const weekDiff = actual - lastWeekActual;
    const weekPct = (weekDiff / lastWeekActual) * 100;
    const yoyPct = lastYearActual > 0 ? (actual / lastYearActual) * 100 : null;
    const tempWeekDiff = Number(weather.temp_vs_last_week || 0);
    const tempYearDiff = Number(weather.temp_vs_last_year_same_weekday || 0);
    const rain = Number(weather.rain_mm || 0);
    const gross = Number(row['販売荒利高'] || 0);
    const grossRate = Number(row['荒利率'] || 0);

    const productKey = [row['部門名'], row['カテゴリ名'], row['サブカテ名']].join(' / ');
    if (!groups[productKey]) {
      groups[productKey] = {
        product: productKey,
        department: row['部門名'],
        category: row['カテゴリ名'],
        subcategory: row['サブカテ名'],
        rows: [],
        current: 0,
        lastWeek: 0,
        lastYear: 0,
        weekDiff: 0,
        gross: 0
      };
    }
    groups[productKey].rows.push({
      date: date,
      zone: zone,
      actual: actual,
      lastWeekActual: lastWeekActual,
      lastYearActual: lastYearActual,
      weekDiff: weekDiff,
      weekPct: clampTemp_(weekPct, -100, 200),
      yoyPct: yoyPct === null ? null : clampTemp_(yoyPct - 100, -100, 200),
      tempWeekDiff: tempWeekDiff,
      tempYearDiff: tempYearDiff,
      rain: rain,
      gross: gross,
      grossRate: grossRate
    });
    groups[productKey].current += actual;
    groups[productKey].lastWeek += lastWeekActual;
    groups[productKey].lastYear += lastYearActual;
    groups[productKey].weekDiff += weekDiff;
    groups[productKey].gross += gross;
    dateSet[date] = true;
    matchedRows++;
  });

  const summaries = Object.keys(groups).map(function(key) {
    const group = groups[key];
    const rows = group.rows;
    const tempWeek = rows.map(function(r) { return r.tempWeekDiff; });
    const salesWeekPct = rows.map(function(r) { return r.weekPct; });
    const tempYear = rows.filter(function(r) { return r.yoyPct !== null; }).map(function(r) { return r.tempYearDiff; });
    const salesYoyPct = rows.filter(function(r) { return r.yoyPct !== null; }).map(function(r) { return r.yoyPct; });
    const up = rows.filter(function(r) { return r.tempWeekDiff >= 2; });
    const down = rows.filter(function(r) { return r.tempWeekDiff <= -2; });
    const flat = rows.filter(function(r) { return r.tempWeekDiff > -2 && r.tempWeekDiff < 2; });
    const weekPctTotal = group.lastWeek ? ((group.current / group.lastWeek) * 100 - 100) : 0;
    const yoyTotal = group.lastYear ? ((group.current / group.lastYear) * 100) : null;
    const corrWeek = pearsonTemp_(tempWeek, salesWeekPct);
    const corrYear = pearsonTemp_(tempYear, salesYoyPct);
    return {
      product: group.product,
      n: rows.length,
      current: Math.round(group.current),
      weekDiff: Math.round(group.weekDiff),
      weekPct: round1_(weekPctTotal),
      yoy: yoyTotal === null ? null : round1_(yoyTotal),
      gross: Math.round(group.gross),
      grossRate: group.current ? round1_(group.gross / group.current * 100) : 0,
      corrTempWeekToSalesWeek: round1_(corrWeek),
      corrTempYearToSalesYoy: corrYear === null ? null : round1_(corrYear),
      tempUpWeekPct: weightedWeekPctTemp_(up),
      tempFlatWeekPct: weightedWeekPctTemp_(flat),
      tempDownWeekPct: weightedWeekPctTemp_(down),
      tempUpN: up.length,
      tempDownN: down.length,
      verdict: buildTempRelationVerdict_(corrWeek, up, down, flat)
    };
  }).filter(function(row) {
    return row.n >= 8 && row.current >= 50000;
  });

  summaries.sort(function(a, b) {
    return Math.abs(b.corrTempWeekToSalesWeek || 0) - Math.abs(a.corrTempWeekToSalesWeek || 0);
  });

  const positive = summaries.filter(function(row) {
    return row.corrTempWeekToSalesWeek >= 0.3 && row.tempUpN >= 3;
  }).slice(0, 8);
  const negative = summaries.filter(function(row) {
    return row.corrTempWeekToSalesWeek <= -0.3 && row.tempDownN >= 3;
  }).slice(0, 8);
  const weakImportant = summaries.filter(function(row) {
    return Math.abs(row.corrTempWeekToSalesWeek || 0) < 0.2 && row.current >= 200000;
  }).slice(0, 8);

  return {
    period: Object.keys(dateSet).sort()[0] + ' - ' + Object.keys(dateSet).sort().slice(-1)[0],
    note: '前週同曜日が存在する行だけを使用。短期データのため相関は仮説確認であり因果判定ではありません。',
    matchedRows: matchedRows,
    productCount: summaries.length,
    positiveTempCandidates: positive,
    negativeTempCandidates: negative,
    weakTempImportantProducts: weakImportant,
    topByAbsCorrelation: summaries.slice(0, 12)
  };
}

function buildTempSalesKey_(date, zone, department, category, subcategory) {
  if (!date || !zone || !department || !category || !subcategory) return '';
  return [date, zone, department, category, subcategory].join('|');
}

function pearsonTemp_(xs, ys) {
  if (!xs || !ys || xs.length !== ys.length || xs.length < 3) return 0;
  const n = xs.length;
  const avgX = xs.reduce(function(sum, value) { return sum + Number(value || 0); }, 0) / n;
  const avgY = ys.reduce(function(sum, value) { return sum + Number(value || 0); }, 0) / n;
  let numerator = 0;
  let denomX = 0;
  let denomY = 0;
  for (let i = 0; i < n; i++) {
    const dx = Number(xs[i] || 0) - avgX;
    const dy = Number(ys[i] || 0) - avgY;
    numerator += dx * dy;
    denomX += dx * dx;
    denomY += dy * dy;
  }
  if (!denomX || !denomY) return 0;
  return numerator / Math.sqrt(denomX * denomY);
}

function weightedWeekPctTemp_(rows) {
  if (!rows.length) return null;
  const current = rows.reduce(function(sum, row) { return sum + row.actual; }, 0);
  const previous = rows.reduce(function(sum, row) { return sum + row.lastWeekActual; }, 0);
  return previous ? round1_((current / previous) * 100 - 100) : null;
}

function clampTemp_(value, min, max) {
  return Math.max(min, Math.min(max, Number(value || 0)));
}

function buildTempRelationVerdict_(corr, up, down, flat) {
  const upPct = weightedWeekPctTemp_(up);
  const downPct = weightedWeekPctTemp_(down);
  const flatPct = weightedWeekPctTemp_(flat);
  if (corr >= 0.35 && upPct !== null && (flatPct === null || upPct > flatPct + 5)) {
    return '高温寄与候補';
  }
  if (corr <= -0.35 && downPct !== null && (flatPct === null || downPct > flatPct + 5)) {
    return '低温寄与候補';
  }
  return '気温だけでは弱い';
}
