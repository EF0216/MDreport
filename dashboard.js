// ── ゾーン順序 ───────────────────────────────────────────────
const ZONE_ORDER_NS = [
  '北海道','青森','東北','北関東','首都圏','西関東','東関東',
  '京葉','STリテール','西友','中京','中部','北陸','関西',
  '東関西','西関西','中国','四国','福岡','北九州','筑豊',
  '西九州','東九州','天草','南九州'
];

function sortZonesNS(zoneNames) {
  return [...zoneNames].sort((a, b) => {
    const ai = ZONE_ORDER_NS.indexOf(a), bi = ZONE_ORDER_NS.indexOf(b);
    if (ai === -1 && bi === -1) return String(a).localeCompare(String(b), 'ja');
    if (ai === -1) return 1; if (bi === -1) return -1;
    return ai - bi;
  });
}

function shiftDateString(date, days) {
  const d = new Date(`${date}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

function pickComparisonDate(dates, date) {
  const lastWeekDate = shiftDateString(date, -7);
  if (dates.includes(lastWeekDate)) {
    return { date: lastWeekDate, label: '前週同曜日', rateLabel: '前週同曜日比', diffLabel: '前週同曜日差' };
  }
  const fallback = dates[dates.indexOf(date) + 1] || '';
  return {
    date: fallback,
    label: fallback ? '前回' : '比較日なし',
    rateLabel: fallback ? '前回比' : '比較なし',
    diffLabel: fallback ? '前回差' : '比較なし'
  };
}

// ── 状態 ─────────────────────────────────────────────────────
const state = { loading: false, data: null, dateMode: 'daily', weekKey: '', weekWindows: [] };

function inflateCompactRows(value) {
  if (!value || value.__compactRows !== true || !Array.isArray(value.columns) || !Array.isArray(value.rows)) return value;
  return value.rows.map(function(row) {
    var obj = {};
    value.columns.forEach(function(column, index) {
      obj[column] = Array.isArray(row) && typeof row[index] !== 'undefined' ? row[index] : '';
    });
    return obj;
  });
}

function inflateDashboardData(data) {
  if (!data || data.__compact !== 'columns_rows_v1') return data;
  Object.keys(data).forEach(function(key) {
    data[key] = inflateCompactRows(data[key]);
  });
  return data;
}

// ── グローバル週ウィンドウ ────────────────────────────────────
function _gwToMonday(ds){var d=new Date(ds+'T00:00:00');var day=d.getDay();var diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function _gwAddDays(ds,n){var d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
function buildGlobalWeekWindows(dates){
  if(!dates||!dates.length)return[];
  var mondaySet={};
  dates.forEach(function(d){if(d)mondaySet[_gwToMonday(d)]=true;});
  return Object.keys(mondaySet).sort().reverse().slice(0,8).map(function(mon){
    var end=_gwAddDays(mon,6);var prevMon=_gwAddDays(mon,-7);var prevEnd=_gwAddDays(prevMon,6);
    var p=mon.split('-');
    return{key:mon,label:parseInt(p[1])+'月'+parseInt(p[2])+'日週',startDate:mon,endDate:end,compareKey:prevMon,compareStartDate:prevMon,compareEndDate:prevEnd};
  });
}
function currentWeekWindow(){return state.weekWindows.find(function(w){return w.key===state.weekKey;})||state.weekWindows[0]||null;}

function renderModeBar(barId){
  var el=document.getElementById(barId);if(!el)return;
  var weeks=state.weekWindows;
  el.innerHTML='<div class="toolbar-row">'+
    '<div class="segmented-control">'+
    '<button type="button" class="segment'+(state.dateMode==='daily'?' is-active':'')+'" data-mode="daily">日別</button>'+
    '<button type="button" class="segment'+(state.dateMode==='weekly'?' is-active':'')+'" data-mode="weekly">週別</button>'+
    '</div>'+
    '<div class="week-tabs'+(state.dateMode==='weekly'&&weeks.length?' is-visible':'')+'" id="'+barId+'Weeks">'+
    weeks.map(function(w){return'<button type="button" class="week-tab'+(w.key===state.weekKey?' is-active':'')+'" data-week="'+w.key+'">'+w.label+'</button>';}).join('')+
    '</div></div>';
  el.querySelectorAll('.segment').forEach(function(btn){btn.onclick=function(){
    var mode=btn.dataset.mode;if(mode==='weekly'&&!weeks.length)return;
    state.dateMode=mode;if(mode==='weekly'&&!state.weekKey&&weeks.length)state.weekKey=weeks[0].key;
    renderDashboard(state.data);};});
  el.querySelectorAll('.week-tab').forEach(function(btn){btn.onclick=function(){state.weekKey=btn.dataset.week;renderDashboard(state.data);};});
}

function aggregateBumonPeriod(rows,startDate,endDate,dateKey){
  var map={};
  rows.filter(function(r){return r.date>=startDate&&r.date<=endDate;}).forEach(function(r){
    var key=[String(r.zone_code||''),r.zone_name||'',String(r['部門CD']||''),r['部門名']||''].join('|');
    if(!map[key])map[key]=Object.assign({},r,{date:dateKey,'売上実績':0,'前年同週同曜日実績':0,'売上予算':0,'販売荒利高':0,'前年荒利高':0,'荒利予算':0,'達成率':null,'前年比':null,'荒利率':null,'荒利予算比':null,_hasLy:false,_hasProfit:false,_hasLyProfit:false});
    map[key]['売上実績']+=Number(r['売上実績']||0);
    map[key]['売上予算']+=Number(r['売上予算']||0);
    map[key]['荒利予算']+=Number(r['荒利予算']||0);
    if(r['前年同週同曜日実績']!==''&&r['前年同週同曜日実績']!==null){map[key]['前年同週同曜日実績']+=Number(r['前年同週同曜日実績']||0);map[key]._hasLy=true;}
    var p=grossProfitFromRow(r,'売上実績');if(!Number.isNaN(p)){map[key]['販売荒利高']+=p;map[key]._hasProfit=true;}
    var lp=lastYearGrossProfitFromRow(r);if(!Number.isNaN(lp)){map[key]['前年荒利高']+=lp;map[key]._hasLyProfit=true;}
  });
  return Object.values(map);
}

// カテゴリ/サブカテ単位の集計（任意の日付セット）
// 週別モードで「当週4日なら前週も4日(同曜日)」と公平比較するため、
// 期間 (startDate-endDate) ではなく日付の列挙で集計する。
function aggregateCategoryByDates(rows,allowedDates,dateKey){
  var allow={};(allowedDates||[]).forEach(function(d){if(d)allow[d]=true;});
  var map={};
  rows.filter(function(r){return allow[r.date];}).forEach(function(r){
    var key=[String(r.zone_code||''),r.zone_name||'',String(r['部門CD']||''),r['部門名']||'',String(r['カテゴリCD']||''),r['カテゴリ名']||'',String(r['サブカテCD']||''),r['サブカテ名']||''].join('|');
    if(!map[key])map[key]=Object.assign({},r,{date:dateKey,'実績数量':0,'実績金額':0,'前年同週同曜日数量':0,'前年同週同曜日実績':0,'販売荒利高':0,'前年荒利高':0,'昨年対比':null,'荒利率':null,_hasLy:false,_hasProfit:false,_hasLyProfit:false});
    map[key]['実績数量']+=Number(r['実績数量']||0);
    map[key]['実績金額']+=Number(r['実績金額']||0);
    if(r['前年同週同曜日実績']!==''&&r['前年同週同曜日実績']!==null){
      map[key]['前年同週同曜日実績']+=Number(r['前年同週同曜日実績']||0);
      map[key]['前年同週同曜日数量']+=Number(r['前年同週同曜日数量']||0);
      map[key]._hasLy=true;
    }
    var p=grossProfitFromRow(r,'実績金額');if(!Number.isNaN(p)){map[key]['販売荒利高']+=p;map[key]._hasProfit=true;}
    var lp=lastYearGrossProfitFromRow(r);if(!Number.isNaN(lp)){map[key]['前年荒利高']+=lp;map[key]._hasLyProfit=true;}
  });
  return Object.values(map);
}

// ── 初期化 ───────────────────────────────────────────────────
function _bootstrapDashboard() {
  document.getElementById('reloadButton').addEventListener('click', loadDashboard);
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });
  loadDashboard();
}
// dashboard.html 側で動的 script 注入しているため、本スクリプトが評価される時点で
// 既に DOMContentLoaded が発火済みのケースがある。readyState で分岐する。
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bootstrapDashboard);
} else {
  _bootstrapDashboard();
}

function switchSection(sectionId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.section === sectionId));
  document.querySelectorAll('.dashboard-section').forEach(s => s.classList.toggle('active', s.id === sectionId));
}

// ── データ読み込み（fetch版） ─────────────────────────────────
async function loadDashboard() {
  setLoading(true, '読み込み中...');
  try {
    // cache busting: ブラウザ/CDN のキャッシュで古い JSON を掴まないよう、
    // 毎回 URL を変えて取得する。GitHub Pages 側の更新を即時に反映するため。
    const res = await fetch('./data/dashboard_data.json?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) throw new Error(`データ取得失敗 (${res.status})`);
    const data = inflateDashboardData(await res.json());
    state.data = data;
    renderDashboard(data);
    setLoading(false);
  } catch (err) {
    showError(err);
    setLoading(false);
  }
}

// ── レンダリング本体 ──────────────────────────────────────────
function renderDashboard(data) {
  hideError();
  document.getElementById('updatedAt').textContent = data.updatedAt || '-';

  // グローバル週ウィンドウ初期化
  var allDates=[...new Set([
    ...(data.legwearBumon||[]).map(function(r){return r.date;}),
    ...(data.legwearCategory||[]).map(function(r){return r.date;})
  ].filter(Boolean))].sort().reverse();
  state.weekWindows=buildGlobalWeekWindows(allDates);
  if(state.dateMode==='weekly'&&!state.weekKey&&state.weekWindows.length)state.weekKey=state.weekWindows[0].key;
  ['overviewModeBar','weatherModeBar','salesModeBar','categoryModeBar','newsModeBar'].forEach(renderModeBar);

  var _alerts=buildImportantAlerts(data);
  if(state.dateMode==='weekly'){
    var _wwA=currentWeekWindow();
    if(_wwA)_alerts=_alerts.filter(function(a){return a.date>=_wwA.startDate&&a.date<=_wwA.endDate;});
  }else{
    var _today=(data.weatherLatest&&data.weatherLatest[0]&&data.weatherLatest[0].date)||new Date().toISOString().slice(0,10);
    _alerts=_alerts.filter(function(a){return a.date===_today;});
  }
  // 気温タブ: 週別モード対応
  var weatherItems=data.weatherLatest||[];
  var weatherTrendItems=data.weatherTrend||[];
  var weatherDailyItems=data.weatherDaily||[];
  // weatherTrend には temp_vs_yesterday / temp_vs_last_week / temp_vs_last_year_same_weekday が
  // 含まれていないため、weatherDaily の同日同ゾーンの値で補完して売上タブ用 weather にする。
  var enrichWithDaily=(function(){
    var dailyMap={};
    weatherDailyItems.forEach(function(w){if(w.date&&w.zone)dailyMap[w.date+'|'+w.zone]=w;});
    return function(trend){
      return (trend||[]).map(function(t){
        var d=dailyMap[(t.date||'')+'|'+(t.zone||'')];
        if(!d)return t;
        var pick=function(tv,dv){return(tv!==undefined&&tv!==null&&tv!=='')?tv:dv;};
        return Object.assign({},t,{
          temp_vs_yesterday:pick(t.temp_vs_yesterday,d.temp_vs_yesterday),
          temp_vs_last_week:pick(t.temp_vs_last_week,d.temp_vs_last_week),
          temp_vs_last_year_same_weekday:pick(t.temp_vs_last_year_same_weekday,d.temp_vs_last_year_same_weekday),
          last_year_rain_mm:pick(t.last_year_rain_mm,d.last_year_rain_mm),
          rain_vs_last_year_same_weekday:pick(t.rain_vs_last_year_same_weekday,d.rain_vs_last_year_same_weekday),
          last_year_same_weekday_date:t.last_year_same_weekday_date||d.last_year_same_weekday_date,
          weather_alert:t.weather_alert||d.weather_alert
        });
      });
    };
  })();
  var salesWeatherItems=weatherTrendItems.length?enrichWithDaily(weatherTrendItems):(weatherDailyItems.length?weatherDailyItems:weatherItems);
  var salesAlertWeatherItems=salesWeatherItems;
  if(state.dateMode==='weekly'){
    var wwW=currentWeekWindow();
    if(wwW){
      weatherItems=aggregateWeatherPeriod(weatherTrendItems.length?weatherTrendItems:weatherItems,wwW.startDate,wwW.endDate,wwW.key,wwW.startDate+'～'+wwW.endDate,wwW.compareStartDate+'～'+wwW.compareEndDate,data.zoneOrder||[],wwW.compareStartDate,wwW.compareEndDate);
      salesWeatherItems=weatherItems;
      salesAlertWeatherItems=weatherItems;
    }
  }
  renderOverviewTrendCards(data);
  renderTodayAlerts(_alerts);
  renderStoreSalesHighlight(data.storeFocusDaily || [], data.storeFocusSubcat || [], data.storeFocusDates || []);
  renderSalesAlerts(data.legwearBumon || [], data.legwearCategory || [], salesAlertWeatherItems);
  renderWeather(weatherItems, weatherTrendItems, data.zoneOrder || []);

  // 売上タブ: 週別モード対応
  var bumonRows=data.legwearBumon||[];
  var bumonDates=data.legwearDates||[];
  if(state.dateMode==='weekly'){
    var ww=currentWeekWindow();
    if(ww){bumonRows=aggregateBumonPeriod(data.legwearBumon||[],ww.startDate,ww.endDate,ww.key).concat(aggregateBumonPeriod(data.legwearBumon||[],ww.compareStartDate,ww.compareEndDate,ww.compareKey));bumonDates=[ww.key];}
  }
  renderSales(bumonRows, bumonDates, salesWeatherItems);
  // カテゴリタブ: 週別モード対応
  // 公平比較のため、当週でデータがある日付に対して、前週の同曜日のみを比較対象にする
  // 例: 当週が月火水木の4日なら、前週も月火水木の4日で集計（曜日数を揃える）
  var catRows=data.legwearCategory||[];
  var catDates=data.legwearDates||[];
  if(state.dateMode==='weekly'){
    var wwC=currentWeekWindow();
    if(wwC){
      var currentActualDates=[...new Set((data.legwearCategory||[])
        .filter(function(r){return r.date>=wwC.startDate&&r.date<=wwC.endDate;})
        .map(function(r){return r.date;}))].sort();
      var correspondingPrevDates=currentActualDates.map(function(d){return shiftDateString(d,-7);});
      catRows=aggregateCategoryByDates(data.legwearCategory||[],currentActualDates,wwC.key)
        .concat(aggregateCategoryByDates(data.legwearCategory||[],correspondingPrevDates,wwC.compareKey));
      catDates=[wwC.key,wwC.compareKey];
    }
  }
  renderCategory(catRows, catDates);
  renderProductAnalysis(
    data.legwearCategory || [],
    data.legwearCurrentWeekDates || data.legwearDates || [],
    data.weatherTrend || [],
    data.legwearWeeks || [],
    // 7日前(前週同曜日)の比較対象判定に使うため、今週分の legwearDates ではなく
    // 直近全日付を持つ legwearAllDates を渡す。
    data.legwearAllDates || data.legwearDates || []
  );

  // ニュースタブ: 週別モード対応
  var newsItems=data.newsLatest||[];
  if(state.dateMode==='weekly'){
    var wwN=currentWeekWindow();
    if(wwN){newsItems=newsItems.filter(function(r){return r.date>=wwN.startDate&&r.date<=wwN.endDate;});}
  }
  renderNews(newsItems);
  renderReviewNews(data.newsReview || []);
  renderTags(data.analysisTags || []);
  renderStoreSales(data.storeFocusDaily || [], data.storeFocusSubcat || [], data.storeFocusDates || []);
  renderStoreCategory(data.storeFocusSubcat || [], data.storeFocusDates || []);
}

function buildImportantAlerts(data) {
  var baseAlerts = data.alertHistory || data.todayAlerts || [];
  var newsSource = data.newsHistory || (data.newsLatest || [])
    .filter(function(row){return Number(row.importance||0)>=4;})
    .map(function(row){return{
      date:row.date,category:row.category||'ニュース',keyword:row.keyword||row.title||'ニュース',
      alert_type:'ニュース',evidence:row.title,importance:row.importance,
      sales_check_point:row.md_insight||row.summary||'ニュース内容を売上分析時の外部要因として確認',
      action:row.source?row.source+' / ニュースタブで詳細確認':'ニュースタブで詳細確認',
      created_at:row.created_at
    };});
  var seen={};
  return baseAlerts.concat(newsSource).filter(function(item){
    var key=(item.date||'')+'|'+(item.alert_type||'')+'|'+(item.evidence||item.keyword||'');
    if(seen[key])return false;
    seen[key]=true;
    return true;
  });
}

// ── ユーティリティ ────────────────────────────────────────────
function setLoading(isLoading, message) {
  state.loading = isLoading;
  const status = document.getElementById('status');
  status.hidden = !isLoading;
  status.textContent = message || '';
  document.getElementById('reloadButton').disabled = isLoading;
}
function showError(err) {
  const box = document.getElementById('error');
  box.hidden = false;
  box.textContent = err && err.message ? err.message : String(err);
}
function hideError() { document.getElementById('error').hidden = true; }

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}
function escapeAttribute(value) {
  const text = String(value || '#');
  if (text.startsWith('dummy://')) return '#';
  return escapeHtml(text);
}
function sortByImportance(items) {
  return [...items].sort((a, b) => Number(b.importance || 0) - Number(a.importance || 0));
}
function renderCards(elementId, items, template) {
  const container = document.getElementById(elementId);
  container.innerHTML = items.length
    ? items.map(template).join('')
    : '<div class="empty">表示できるデータはまだありません。</div>';
}
function formatSigned(value) {
  if (value === '' || value === null || typeof value === 'undefined') return '±0';
  const n = Number(value);
  if (Number.isNaN(n)) return escapeHtml(value);
  return n > 0 ? `+${n}` : `${n}`;
}
function numberOrNaN(value) {
  if (value === '' || value === null || typeof value === 'undefined') return NaN;
  const n = Number(value);
  return Number.isFinite(n) ? n : NaN;
}
function formatTemp(value) {
  const n = numberOrNaN(value);
  return Number.isNaN(n) ? '-' : `${n}℃`;
}
function formatMm(value) {
  const n = numberOrNaN(value);
  return Number.isNaN(n) ? '-' : `${n}mm`;
}
function formatTempDiffOrDash(value) {
  if (value === '' || value === null || typeof value === 'undefined') return '-';
  const n = Number(value);
  if (Number.isNaN(n)) return '-';
  if (n === 0) return '±0';
  return n > 0 ? `+${n}` : `${n}`;
}
function tempCompareClass(current, lastYear) {
  const c = numberOrNaN(current), ly = numberOrNaN(lastYear);
  if (Number.isNaN(c) || Number.isNaN(ly)) return 'temp-neutral';
  if (c > ly) return 'temp-hot';
  if (c < ly) return 'temp-cool';
  return 'temp-neutral';
}
function tempDiffClass(value) {
  const n = numberOrNaN(value);
  if (Number.isNaN(n) || n === 0) return 'temp-neutral';
  return n > 0 ? 'temp-hot' : 'temp-cool';
}
// 湿度の表示ヘルパー（GASアプリの formatHumidity / formatSignedHumidityDiff / signedWeatherDiffClass と同等）
function formatHumidity(value) {
  const n = numberOrNaN(value);
  return Number.isNaN(n) ? '-' : n.toFixed(1) + '%';
}
function formatSignedHumidityDiff(value) {
  const n = numberOrNaN(value);
  if (Number.isNaN(n)) return '-';
  const sign = n === 0 ? '±' : n > 0 ? '+' : '';
  return sign + n.toFixed(1) + 'pt';
}
// 湿度前年差の着色（湿度が高い＝客足に不利の扱いで、+を num-bad / -を num-good）
function humidityDiffClass(value) {
  const n = numberOrNaN(value);
  return Number.isNaN(n) || n === 0 ? '' : n > 0 ? 'num-bad' : 'num-good';
}
// 不快指数（THI）= 0.81×気温 + 0.01×湿度×(0.99×気温 − 14.3) + 46.3
function discomfortIndex(temp, humidity) {
  const T = numberOrNaN(temp), H = numberOrNaN(humidity);
  if (Number.isNaN(T) || Number.isNaN(H)) return NaN;
  return 0.81 * T + 0.01 * H * (0.99 * T - 14.3) + 46.3;
}
// 代表気温：avg_temp があれば優先、無ければ (最高+最低)/2
function thiRepTemp(item) {
  const a = numberOrNaN(item.avg_temp);
  if (!Number.isNaN(a)) return a;
  const mx = numberOrNaN(item.max_temp), mn = numberOrNaN(item.min_temp);
  return (Number.isNaN(mx) || Number.isNaN(mn)) ? NaN : (mx + mn) / 2;
}
function thiLastYearTemp(item) {
  const a = numberOrNaN(item.last_year_avg_temp);
  if (!Number.isNaN(a)) return a;
  const mx = numberOrNaN(item.last_year_max_temp), mn = numberOrNaN(item.last_year_min_temp);
  return (Number.isNaN(mx) || Number.isNaN(mn)) ? NaN : (mx + mn) / 2;
}
function formatDiscomfortIndex(item) {
  const v = discomfortIndex(thiRepTemp(item), item.humidity_avg);
  return Number.isNaN(v) ? '-' : v.toFixed(1);
}
function discomfortIndexYearDiff(item) {
  const cur = discomfortIndex(thiRepTemp(item), item.humidity_avg);
  const ly = discomfortIndex(thiLastYearTemp(item), item.last_year_humidity_avg);
  return (Number.isNaN(cur) || Number.isNaN(ly)) ? NaN : cur - ly;
}
function formatSignedDiscomfortDiff(item) {
  const n = discomfortIndexYearDiff(item);
  if (Number.isNaN(n)) return '-';
  const sign = n === 0 ? '±' : n > 0 ? '+' : '';
  return sign + n.toFixed(1);
}
// 不快指数が高い（蒸し暑い）方を num-bad で着色
function discomfortDiffClass(item) {
  const n = discomfortIndexYearDiff(item);
  return Number.isNaN(n) || n === 0 ? '' : n > 0 ? 'num-bad' : 'num-good';
}
function drawEmptyChart(chart, message) {
  chart.innerHTML = `<div class="empty">${escapeHtml(message)}</div>`;
}
function normalizePercentValue(value) {
  const n = numberOrNaN(value);
  if (Number.isNaN(n)) return NaN;
  return Math.abs(n) <= 1 ? n * 100 : n;
}
function grossProfitFromRow(row, amountField) {
  const direct = numberOrNaN(row['販売荒利高']);
  if (!Number.isNaN(direct)) return direct;
  const rate = normalizePercentValue(row['荒利率']);
  const amount = numberOrNaN(row[amountField]);
  if (!Number.isNaN(rate) && !Number.isNaN(amount)) return amount * rate / 100;
  return NaN;
}
function lastYearGrossProfitFromRow(row) { return numberOrNaN(row['前年荒利高']); }
function grossMarginRate(profit, amount) {
  const p = numberOrNaN(profit), a = numberOrNaN(amount);
  return Number.isNaN(p) || !a ? NaN : p / a * 100;
}
function yoyRateValue(actual, lastYear) {
  const a = numberOrNaN(actual), ly = numberOrNaN(lastYear);
  return Number.isNaN(a) || !ly ? null : a / ly * 100;
}
function formatYen(value) {
  const n = numberOrNaN(value);
  return Number.isNaN(n) ? '-' : n.toLocaleString('ja-JP') + '円';
}
function formatSignedYen(value) {
  const n = numberOrNaN(value);
  if (Number.isNaN(n)) return '-';
  return (n > 0 ? '+' : '') + n.toLocaleString('ja-JP') + '円';
}
function formatPct(value) {
  const n = numberOrNaN(value);
  return Number.isNaN(n) ? '-' : n.toFixed(1) + '%';
}
function formatNum(value) {
  const n = numberOrNaN(value);
  return Number.isNaN(n) ? '-' : n.toLocaleString('ja-JP');
}

function formatCompactYen(value) {
  const n = numberOrNaN(value);
  if (Number.isNaN(n)) return '-';
  if (Math.abs(n) >= 10000) return Math.round(n / 10000).toLocaleString('ja-JP') + '万';
  return Math.round(n).toLocaleString('ja-JP');
}

function isBumonAggregateRow(row) {
  return String(row && row.zone_code || '').padStart(4, '0') === '0000' || (row && row.zone_name) === '全社計';
}

function preferredBumonRows(rows) {
  const list = rows || [];
  const aggregateRows = list.filter(isBumonAggregateRow);
  return aggregateRows.length ? aggregateRows : list.filter((row) => !isBumonAggregateRow(row));
}

function sumBumonMetrics(rows) {
  const base = { actual: 0, budget: 0, lastYear: 0, profit: 0, lastYearProfit: 0, hasActual: false, hasProfit: false, hasLastYearProfit: false };
  preferredBumonRows(rows).forEach((row) => {
    const actual = numberOrNaN(row['売上実績']);
    const budget = numberOrNaN(row['売上予算']);
    const lastYear = numberOrNaN(row['前年同週同曜日実績']);
    const profit = grossProfitFromRow(row, '売上実績');
    const lastYearProfit = lastYearGrossProfitFromRow(row);
    if (!Number.isNaN(actual)) { base.actual += actual; base.hasActual = true; }
    if (!Number.isNaN(budget)) base.budget += budget;
    if (!Number.isNaN(lastYear)) base.lastYear += lastYear;
    if (!Number.isNaN(profit)) { base.profit += profit; base.hasProfit = true; }
    if (!Number.isNaN(lastYearProfit)) { base.lastYearProfit += lastYearProfit; base.hasLastYearProfit = true; }
  });
  base.budgetRatio = base.budget ? base.actual / base.budget * 100 : NaN;
  base.yearRatio = base.lastYear ? base.actual / base.lastYear * 100 : NaN;
  base.grossRate = base.actual && base.hasProfit ? base.profit / base.actual * 100 : NaN;
  base.profitYearRatio = base.lastYearProfit && base.hasProfit ? base.profit / base.lastYearProfit * 100 : NaN;
  return base;
}

function bumonMetricsByDate(rows) {
  const map = {};
  (rows || []).forEach((row) => {
    if (!row.date) return;
    if (!map[row.date]) map[row.date] = [];
    map[row.date].push(row);
  });
  return Object.keys(map).sort().map((date) => Object.assign({ date }, sumBumonMetrics(map[date])));
}

function latestNonZeroMetric(metrics) {
  return [...(metrics || [])].reverse().find((item) => item.hasActual && item.actual > 0) || null;
}

function overviewBumonContext(data) {
  const rows = data.legwearBumon || [];
  const daily = bumonMetricsByDate(rows);
  if (state.dateMode === 'weekly') {
    const ww = currentWeekWindow();
    if (ww) {
      const currentRows = aggregateBumonPeriod(rows, ww.startDate, ww.endDate, ww.key);
      const compareRows = aggregateBumonPeriod(rows, ww.compareStartDate, ww.compareEndDate, ww.compareKey);
      const weeklySeries = (state.weekWindows || []).slice().reverse().map((w) =>
        Object.assign({ date: w.key }, sumBumonMetrics(aggregateBumonPeriod(rows, w.startDate, w.endDate, w.key)))
      ).filter((item) => item.hasActual);
      return {
        labelSuffix: '当週',
        periodLabel: ww.startDate + '～' + ww.endDate,
        current: Object.assign({ date: ww.key }, sumBumonMetrics(currentRows)),
        compare: Object.assign({ date: ww.compareKey }, sumBumonMetrics(compareRows)),
        compareLabel: '比較: 前週累計 ' + formatSparklineDate(ww.compareStartDate) + '～' + formatSparklineDate(ww.compareEndDate),
        series: weeklySeries
      };
    }
  }
  const current = latestNonZeroMetric(daily);
  const currentIndex = current ? daily.findIndex((item) => item.date === current.date) : -1;
  const sameWeekday = current ? shiftDateString(current.date, -7) : '';
  const compare = daily.find((item) => item.date === sameWeekday) || (currentIndex > 0 ? daily[currentIndex - 1] : null);
  const compareLabel = compare && compare.date
    ? '比較: ' + (compare.date === sameWeekday ? '前週同曜日 ' : '直前実績 ') + formatSparklineDate(compare.date)
    : '比較: -';
  return {
    labelSuffix: '本日',
    periodLabel: current ? current.date : '-',
    current,
    compare,
    compareLabel,
    series: daily.slice(-14)
  };
}

function formatDegreeShort(value) {
  const n = numberOrNaN(value);
  return Number.isNaN(n) ? '-' : n.toFixed(1);
}

function temperatureRangeLabel(temp) {
  return '最高' + formatDegreeShort(temp.high) + ' / 最低' + formatDegreeShort(temp.low);
}

function temperatureForecastChipLabel(temp) {
  const count = Number(temp && temp.forecastCount || 0);
  return count > 0 ? formatNum(count) + '日先まで' : '実績のみ';
}

function lastYearTemperatureValue(value, row) {
  const n = numberOrNaN(value);
  if (Number.isNaN(n)) return NaN;
  return row && row.source === 'forecast' && n === 0 ? NaN : n;
}

function temperatureStatsForDate(date, rows) {
  let high = NaN;
  let low = NaN;
  let lastYearHigh = NaN;
  let lastYearLow = NaN;
  let highZone = '';
  let lowZone = '';
  let isForecast = false;
  (rows || []).forEach((row) => {
    const maxTemp = numberOrNaN(row.max_temp);
    const minTemp = numberOrNaN(row.min_temp);
    const lyMaxTemp = lastYearTemperatureValue(row.last_year_max_temp, row);
    const lyMinTemp = lastYearTemperatureValue(row.last_year_min_temp, row);
    if (row.source === 'forecast') isForecast = true;
    if (!Number.isNaN(maxTemp) && (Number.isNaN(high) || maxTemp > high)) {
      high = maxTemp;
      highZone = row.zone || row.area_name || '';
    }
    if (!Number.isNaN(minTemp) && (Number.isNaN(low) || minTemp < low)) {
      low = minTemp;
      lowZone = row.zone || row.area_name || '';
    }
    if (!Number.isNaN(lyMaxTemp) && (Number.isNaN(lastYearHigh) || lyMaxTemp > lastYearHigh)) {
      lastYearHigh = lyMaxTemp;
    }
    if (!Number.isNaN(lyMinTemp) && (Number.isNaN(lastYearLow) || lyMinTemp < lastYearLow)) {
      lastYearLow = lyMinTemp;
    }
  });
  return { date, high, low, lastYearHigh, lastYearLow, highZone, lowZone, isForecast };
}

function overviewTemperatureContext(data) {
  const source = (data.weatherTrend && data.weatherTrend.length)
    ? data.weatherTrend
    : ((data.weatherLatest && data.weatherLatest.length) ? data.weatherLatest : (data.weatherDaily || []));
  const byDate = {};
  source.forEach((row) => {
    if (!row.date) return;
    if (!byDate[row.date]) byDate[row.date] = [];
    byDate[row.date].push(row);
  });
  const allSeries = Object.keys(byDate).sort().map((date) => temperatureStatsForDate(date, byDate[date]))
    .filter((item) => !Number.isNaN(item.high) || !Number.isNaN(item.low));
  let series = allSeries;
  if (state.dateMode === 'weekly') {
    const ww = currentWeekWindow();
    if (ww) series = allSeries.filter((item) => item.date >= ww.startDate && item.date <= ww.endDate);
  } else {
    series = allSeries.slice(-22);
  }
  const range = series.reduce((memo, item) => {
    if (!Number.isNaN(item.high) && (Number.isNaN(memo.high) || item.high > memo.high)) {
      memo.high = item.high;
      memo.highZone = item.highZone;
    }
    if (!Number.isNaN(item.low) && (Number.isNaN(memo.low) || item.low < memo.low)) {
      memo.low = item.low;
      memo.lowZone = item.lowZone;
    }
    return memo;
  }, { high: NaN, low: NaN, highZone: '', lowZone: '' });
  return {
    high: range.high,
    low: range.low,
    highZone: range.highZone,
    lowZone: range.lowZone,
    series,
    dayCount: series.length,
    forecastCount: series.filter((item) => item.isForecast).length
  };
}

function salesDepartmentBreakdown(rows, date) {
  const totals = {};
  preferredBumonRows((rows || []).filter((row) => row.date === date)).forEach((row) => {
    const name = String(row['部門名'] || '');
    const shortName = name.includes('レディース') ? 'レディース' : name.includes('メンズ') ? 'メンズ' : (name || '部門');
    const actual = numberOrNaN(row['売上実績']);
    if (Number.isNaN(actual)) return;
    totals[shortName] = (totals[shortName] || 0) + actual;
  });
  return ['レディース', 'メンズ'].filter((name) => Object.prototype.hasOwnProperty.call(totals, name))
    .map((name) => name + formatCompactYen(totals[name]));
}

function salesOverviewFoot(data, current) {
  const dateLabel = current && current.date ? formatSparklineDate(current.date) + ' 合計' : '最新合計';
  const breakdown = salesDepartmentBreakdown(data.legwearBumon || [], current && current.date);
  const parts = [dateLabel];
  if (breakdown.length) parts.push(breakdown.join('・'));
  parts.push('対予算 ' + formatPct(current && current.budgetRatio));
  return parts.join(' / ');
}

function metricDelta(current, compare, field, asRate) {
  if (!current || !compare) return NaN;
  const c = numberOrNaN(current[field]);
  const p = numberOrNaN(compare[field]);
  if (Number.isNaN(c) || Number.isNaN(p) || (asRate && !p)) return NaN;
  return asRate ? (c / p * 100 - 100) : c - p;
}

function trendChip(delta, fixedLabel, suffix) {
  if (fixedLabel) return { label: fixedLabel, tone: 'neutral' };
  const n = numberOrNaN(delta);
  const unit = suffix || '';
  if (Number.isNaN(n)) return { label: '-', tone: 'neutral' };
  if (n === 0) return { label: '±0.0' + unit, tone: 'neutral' };
  return { label: (n > 0 ? '▲ +' : '▼ ') + n.toFixed(1) + unit, tone: n > 0 ? 'up' : 'down' };
}

function formatSparklineScaleLabel(value, scale) {
  const n = numberOrNaN(value);
  if (Number.isNaN(n)) return '-';
  if (scale && scale.type === 'yen') return formatCompactYen(n);
  if (scale && scale.type === 'pct') return (Math.abs(n) >= 100 ? n.toFixed(0) : n.toFixed(1)) + '%';
  return Math.abs(n) >= 100 ? Math.round(n).toLocaleString('ja-JP') : n.toFixed(1);
}

function sparklineSvg(values, tone, scale) {
  const nums = (values || []).map((v) => numberOrNaN(v)).filter((v) => !Number.isNaN(v));
  const stroke = tone === 'down' ? '#4f7bdc' : tone === 'alert' ? '#f59e0b' : tone === 'profit' ? '#8b5cf6' : '#18a77f';
  if (nums.length < 2) return '<svg viewBox="0 0 320 54" aria-hidden="true"><path d="M74 42 L312 42" stroke="' + stroke + '" stroke-width="3" fill="none" opacity=".75"/></svg>';
  const min = Math.min.apply(null, nums);
  const max = Math.max.apply(null, nums);
  const range = Math.max(1, max - min);
  const left = 74, right = 312, top = 8, bottom = 42;
  const yFor = (value) => bottom - ((value - min) / range) * (bottom - top);
  const ticks = [max, (max + min) / 2, min];
  const grid = ticks.map((tick) => {
    const yy = yFor(tick).toFixed(1);
    return '<line class="overview-scale-grid" x1="' + left + '" y1="' + yy + '" x2="' + right + '" y2="' + yy + '" stroke="#d8e2ec" stroke-width="1" opacity=".92"></line>' +
      '<text class="overview-scale-label" x="2" y="' + (Number(yy) + 3.2).toFixed(1) + '" fill="#334e68" font-size="9" font-weight="900" stroke="#ffffff" stroke-width="1.1" paint-order="stroke">' + escapeHtml(formatSparklineScaleLabel(tick, scale)) + '</text>';
  }).join('');
  const points = nums.map((value, index) => {
    const x = left + (index / Math.max(1, nums.length - 1)) * (right - left);
    const y = yFor(value);
    return x.toFixed(1) + ',' + y.toFixed(1);
  });
  const area = [left + ',50'].concat(points).concat([right + ',50']).join(' ');
  return '<svg viewBox="0 0 320 54" preserveAspectRatio="none" aria-hidden="true">' +
    grid +
    '<polygon points="' + area + '" fill="' + stroke + '" opacity=".13"></polygon>' +
    '<polyline points="' + points.join(' ') + '" fill="none" stroke="' + stroke + '" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"></polyline>' +
    '<circle cx="' + points[points.length - 1].split(',')[0] + '" cy="' + points[points.length - 1].split(',')[1] + '" r="2.8" fill="' + stroke + '"></circle>' +
    '</svg>';
}

function temperatureTrendLegend() {
  return '<div class="overview-trend-temp-legend">' +
    '<span><i class="overview-temp-key"></i>最高気温</span>' +
    '<span><i class="overview-temp-key low"></i>最低気温</span>' +
    '<span><i class="overview-temp-key last-high"></i>昨年最高</span>' +
    '<span><i class="overview-temp-key last-low"></i>昨年最低</span>' +
    '<span><i class="overview-temp-key forecast"></i>予報</span>' +
    '</div>';
}

function temperatureSparklineSvg(series) {
  const rows = (series || []).filter((item) => item && item.date);
  const allValues = [];
  rows.forEach((item) => {
    ['high', 'low', 'lastYearHigh', 'lastYearLow'].forEach((field) => {
      const value = numberOrNaN(item[field]);
      if (!Number.isNaN(value)) allValues.push(value);
    });
  });
  if (rows.length < 2 || !allValues.length) return sparklineSvg(rows.map((item) => item.high), 'alert');
  const min = Math.floor(Math.min.apply(null, allValues) / 5) * 5;
  const max = Math.ceil(Math.max.apply(null, allValues) / 5) * 5;
  const range = Math.max(1, max - min);
  const left = 70, right = 708, top = 8, bottom = 64;
  const x = (index) => left + (index / Math.max(1, rows.length - 1)) * (right - left);
  const y = (value) => bottom - ((value - min) / range) * (bottom - top);
  const line = (field, color, dashed) => {
    const points = rows.map((item, index) => {
      const value = numberOrNaN(item[field]);
      return Number.isNaN(value) ? '' : x(index).toFixed(1) + ',' + y(value).toFixed(1);
    }).filter(Boolean).join(' ');
    if (!points) return '';
    return '<polyline points="' + points + '" fill="none" stroke="' + color + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"' + (dashed ? ' stroke-dasharray="5 5"' : '') + '></polyline>';
  };
  const ticks = [max, Math.round((max + min) / 2), min];
  const grid = ticks.map((tick) => {
    const yy = y(tick).toFixed(1);
    return '<line class="overview-scale-grid" x1="' + left + '" y1="' + yy + '" x2="' + right + '" y2="' + yy + '" stroke="#d8e2ec" stroke-width="1"></line>' +
      '<text class="overview-scale-label" x="1" y="' + (Number(yy) + 3.2).toFixed(1) + '" fill="#334e68" font-size="9" font-weight="900" stroke="#ffffff" stroke-width="1.1" paint-order="stroke">' + tick + '℃</text>';
  }).join('');
  const forecastDots = rows.map((item, index) => {
    if (!item.isForecast) return '';
    const value = numberOrNaN(item.high);
    if (Number.isNaN(value)) return '';
    return '<circle cx="' + x(index).toFixed(1) + '" cy="' + y(value).toFixed(1) + '" r="2.5" fill="#f59e0b"></circle>';
  }).join('');
  return '<svg viewBox="0 0 720 72" preserveAspectRatio="none" aria-hidden="true">' +
    grid +
    line('lastYearHigh', '#8f6bff', true) +
    line('lastYearLow', '#96a4ba', true) +
    line('high', '#6fa6ff', false) +
    line('low', '#9aa7bb', false) +
    forecastDots +
    '</svg>';
}

function formatSparklineDate(date) {
  const value = String(date || '');
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return Number(match[2]) + '/' + Number(match[3]);
}

function sparklineDateLabels(series, maxLabels) {
  const rows = (series || []).filter((item) => item && item.date);
  if (!rows.length) return [];
  const count = Math.max(1, Math.min(rows.length, maxLabels || 3));
  const indexes = count >= 3
    ? Array.from({ length: count }, (_, index) => Math.round(index * (rows.length - 1) / (count - 1)))
    : rows.map((_, index) => index);
  const seen = {};
  return indexes.map((index) => formatSparklineDate(rows[index].date)).filter((label) => {
    if (!label || seen[label]) return false;
    seen[label] = true;
    return true;
  });
}

function buildOverviewTrendCards(data) {
  const ctx = overviewBumonContext(data);
  const current = ctx.current || {};
  const compare = ctx.compare || {};
  const series = ctx.series || [];
  const temperature = overviewTemperatureContext(data);
  const salesDates = sparklineDateLabels(series);
  const temperatureDates = sparklineDateLabels(temperature.series || [], 7);
  const compareLabel = ctx.compareLabel || '';
  const salesDelta = trendChip(metricDelta(current, compare, 'actual', true), null, '%');
  const budgetDelta = trendChip(metricDelta(current, compare, 'budgetRatio', false), null, 'pt');
  const yearDelta = trendChip(metricDelta(current, compare, 'yearRatio', false), null, 'pt');
  const yearCompareLabel = compareLabel ? compareLabel.replace(/^比較: /, 'pt差: ') : '';
  const grossDelta = trendChip(metricDelta(current, compare, 'grossRate', false), null, 'pt');
  return [
    { label: 'レッグウェア売上(' + (state.dateMode === 'weekly' ? '当週' : '最新') + ')', value: formatCompactYen(current.actual), unit: '', chip: salesDelta, foot: salesOverviewFoot(data, current), compareLabel, tone: 'down', series: series.map((item) => item.actual), scale: { type: 'yen' }, dates: salesDates },
    { label: '予算比', value: formatPct(current.budgetRatio).replace('%', ''), unit: '%', chip: budgetDelta, foot: '全社計 合計', compareLabel, tone: 'good', series: series.map((item) => item.budgetRatio), scale: { type: 'pct' }, dates: salesDates },
    { label: '前年同週同曜日比', value: formatPct(current.yearRatio).replace('%', ''), unit: '%', chip: yearDelta, foot: '対比元: 前年同週同曜日実績', compareLabel: yearCompareLabel, tone: 'good', series: series.map((item) => item.yearRatio), scale: { type: 'pct' }, dates: salesDates },
    { label: '粗利率', value: formatPct(current.grossRate).replace('%', ''), unit: '%', chip: grossDelta, foot: '荒利前年比 ' + formatPct(current.profitYearRatio), compareLabel, tone: 'profit', series: series.map((item) => item.grossRate), scale: { type: 'pct' }, dates: salesDates },
    { label: '全国気温予報', value: temperatureRangeLabel(temperature), unit: '℃', chip: trendChip(null, temperatureForecastChipLabel(temperature)), foot: '最高 ' + (temperature.highZone || '-') + ' / 最低 ' + (temperature.lowZone || '-'), tone: 'alert', series: temperature.series || [], dates: temperatureDates, className: 'temperature-card', chartHtml: temperatureSparklineSvg(temperature.series || []), legendHtml: temperatureTrendLegend() }
  ];
}

function renderOverviewTrendCards(data) {
  const container = document.getElementById('overviewTrendCards');
  if (!container) return;
  const cards = buildOverviewTrendCards(data || {});
  container.innerHTML = cards.map((card) => {
    const chip = card.chip || { label: '-', tone: 'neutral' };
    return '<article class="overview-trend-card ' + escapeAttribute(card.className || '') + '">' +
      '<div class="overview-trend-head"><div class="overview-trend-label">' + escapeHtml(card.label) + '</div>' +
      '<span class="overview-trend-chip ' + escapeAttribute(chip.tone) + '">' + escapeHtml(chip.label) + '</span></div>' +
      '<div class="overview-trend-value">' + escapeHtml(card.value) + '<span class="overview-trend-unit">' + escapeHtml(card.unit || '') + '</span></div>' +
      '<div class="overview-trend-chart">' + (card.chartHtml || sparklineSvg(card.series, card.tone, card.scale)) + '</div>' +
      '<div class="overview-trend-axis">' + (card.dates || []).map((label) => '<span>' + escapeHtml(label) + '</span>').join('') + '</div>' +
      (card.legendHtml || '') +
      '<div class="overview-trend-foot">' + escapeHtml(card.foot) + '</div>' +
      (card.compareLabel ? '<div class="overview-trend-compare">' + escapeHtml(card.compareLabel) + '</div>' : '') +
      '</article>';
  }).join('');
}

// -- 重要アラートタブ
function renderTodayAlerts(items) {
  const sorted = sortByImportance(items);
  const groupMap = {};
  // ニュース反応はキーワード違いで同じニュースが重複しやすいので、
  // evidence（タイトル）単位で横断統合する。それ以外は keyword + alert_type で従来通り。
  // タイトル末尾のソース表記など揺れに耐えるため、記号・空白を除去した先頭30字をキーにする。
  const normalizeNewsEvidence = ev => String(ev||'')
    .replace(/\s+/g,'')
    .replace(/[「」『』（）()\[\]【】]/g,'')
    .replace(/[ー〜～~・\-—–.,。、:：;；!！?？"'"'"]/g,'')
    .toLowerCase()
    .slice(0,30);
  sorted.forEach(item => {
    const isNews = (item.alert_type||'') === 'ニュース反応';
    const key = isNews
      ? 'news||' + normalizeNewsEvidence(item.evidence)
      : item.keyword + '||' + (item.alert_type||'');
    if (!groupMap[key]) groupMap[key] = Object.assign({}, item, {_evidences:[], _keywords:[]});
    groupMap[key]._evidences.push(item.evidence);
    if (item.keyword && groupMap[key]._keywords.indexOf(item.keyword) < 0) {
      groupMap[key]._keywords.push(item.keyword);
    }
  });
  const consolidated = Object.values(groupMap).map(g => {
    const base = Object.assign({}, g);
    const isNews = (g.alert_type||'') === 'ニュース反応';
    if (isNews) {
      // ニュースは evidence で統合済み（1件のみ）。複数キーワードは併記
      base.evidence = g._evidences[0];
      if (g._keywords.length > 1) base.keyword = g._keywords.join(' / ');
    } else if (g._evidences.length === 1) {
      base.evidence = g._evidences[0];
    } else {
      const shown = g._evidences.slice(0,5);
      const rest = g._evidences.length - shown.length;
      base.evidence = shown.join(' / ') + (rest > 0 ? ' 他'+rest+'件' : '');
    }
    return base;
  }).sort((a,b) => Number(b.importance||0) - Number(a.importance||0));
  const display = consolidated.slice(0,12);
  document.getElementById('alertCount').textContent = display.length + '件';
  renderCards('todayAlerts', display, function(item) {
    return '<article class="card important"><div class="meta"><span>' + escapeHtml(item.date) + '</span><span>' + escapeHtml(item.category) + '</span><span>' + escapeHtml(item.keyword||'') + '</span><span class="importance">重要度 ' + escapeHtml(item.importance) + '</span></div><div class="card-title">' + escapeHtml(item.evidence) + '</div><div>' + escapeHtml(item.sales_check_point) + '</div><div class="action">' + escapeHtml(item.action) + '</div></article>';
  });
}

// -- 重要タブ: 店舗売上 好調・苦戦（予算比 上位3／下位3）
// storeFocusDaily の最新日付から、区分「良(上位)」順位1-3 と「悪(下位)」順位1-3 を抜き出し、
// 売上動向アラートと同じカード仕様（タイトル＋合計サマリ＋メンズ/レディース内訳）で表示する。
// 内訳には storeFocusSubcat から主要サブカテ（前週金額影響の最大）と荒利/粗利率/荒利前年比を付ける。
function renderStoreSalesHighlight(dailyRows, subcatRows, dates) {
  const section = document.getElementById('storeHighlightSection');
  if (!section) return;
  const goodEl = document.getElementById('storeHighlightGood');
  const badEl = document.getElementById('storeHighlightBad');
  const dateBadge = document.getElementById('storeHighlightDate');
  const rowsAll = (dailyRows || []).filter((r) => r && r['日付']);
  if (!rowsAll.length) { section.hidden = true; return; }
  const dateList = (dates && dates.length) ? dates
    : [...new Set(rowsAll.map((r) => String(r['日付'])))].sort().reverse();
  const latest = dateList[0];
  const prevD = shiftDateString(latest, -7);
  const dayRows = rowsAll.filter((r) => String(r['日付']) === String(latest));
  const isGood = (k) => k === '良' || k === '上位';
  const isBad = (k) => k === '悪' || k === '下位';

  // 店舗ごとに 合計/メンズ/レディース 行をまとめ、順位順に上位3店舗を返す
  const groupStores = (predicate) => {
    const map = {};
    const order = [];
    dayRows.filter((r) => predicate(String(r['区分'] || ''))).forEach((r) => {
      const code = String(r['店舗CD'] || '') + '|' + (r['店舗名'] || '');
      if (!map[code]) { map[code] = { cd: r['店舗CD'], name: r['店舗名'], zone: r['ゾーン名'], rank: numberOrNaN(r['順位']), bumon: {} }; order.push(code); }
      map[code].bumon[String(r['部門'] || '')] = r;
      const rk = numberOrNaN(r['順位']); if (!Number.isNaN(rk)) map[code].rank = rk;
    });
    return order.map((c) => map[c])
      .sort((a, b) => (Number.isNaN(a.rank) ? 999 : a.rank) - (Number.isNaN(b.rank) ? 999 : b.rank))
      .slice(0, 3);
  };
  const good = groupStores(isGood);
  const bad = groupStores(isBad);
  if (!good.length && !bad.length) { section.hidden = true; return; }
  section.hidden = false;
  if (dateBadge) dateBadge.textContent = latest || '';

  const fY = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v))) ? '-' : Math.round(Number(v)).toLocaleString('ja-JP') + '円';
  const fR = (v) => (v === null || v === '' || Number.isNaN(Number(v))) ? '-' : Number(v).toFixed(1) + '%';
  const fD = (v) => { const n = Number(v || 0); return (n > 0 ? '+' : '') + n.toLocaleString('ja-JP') + '円'; };
  const rCls = (v) => (v === null || v === '' || Number.isNaN(Number(v))) ? '' : Number(v) >= 100 ? 'num-good' : Number(v) >= 95 ? 'num-warn' : 'num-bad';

  // 店舗×部門のサブカテ集計（storeFocusSubcat）。荒利合計と主要サブカテ（前週金額影響の絶対値最大）を返す。
  const subLatest = (subcatRows || []).filter((r) => r && String(r['日付']) === String(latest));
  const bumonOf = (raw) => { raw = String(raw || ''); return raw.indexOf('レディース') >= 0 ? 'レディース' : raw.indexOf('メンズ') >= 0 ? 'メンズ' : raw; };
  const detail = (cd, which) => {
    const rows = subLatest.filter((r) => String(r['店舗CD']) === String(cd) && bumonOf(r['部門名']) === which);
    if (!rows.length) return null;
    let p = 0, lp = 0, sales = 0, hasP = false, hasLp = false, main = null;
    rows.forEach((r) => {
      const pp = numberOrNaN(r['販売荒利高']); if (!Number.isNaN(pp)) { p += pp; hasP = true; }
      const lpp = numberOrNaN(r['昨年荒利']); if (!Number.isNaN(lpp)) { lp += lpp; hasLp = true; }
      const sv = numberOrNaN(r['売上実績']); if (!Number.isNaN(sv)) sales += sv;
      const today = numberOrNaN(r['売上実績']) || 0, prev = numberOrNaN(r['前週売上']) || 0;
      const diff = today - prev;
      const lyp = numberOrNaN(r['昨年荒利']);
      if (main === null || Math.abs(diff) > Math.abs(main.diff)) {
        main = {
          cat: r['ミニ部門名'], sub: r['品種名'], diff: diff,
          pct: Number.isNaN(numberOrNaN(r['前週同曜日比'])) ? null : numberOrNaN(r['前週同曜日比']) - 100,
          profit: numberOrNaN(r['販売荒利高']),
          profitYoy: (!Number.isNaN(lyp) && lyp) ? numberOrNaN(r['販売荒利高']) / lyp * 100 : null
        };
      }
    });
    return { profit: hasP ? p : NaN, grossRate: sales ? p / sales * 100 : NaN, profitYoy: (hasLp && lp) ? p / lp * 100 : null, main: main };
  };
  const fmtMain = (m) => {
    if (!m) return '<div class="sales-main-empty">該当なし</div>';
    const cls = m.diff >= 0 ? 'num-good' : 'num-bad';
    const pctStr = (m.pct === null || Number.isNaN(Number(m.pct))) ? '-' : (m.pct >= 0 ? '+' : '') + Number(m.pct).toFixed(1) + '%';
    return '<span class="sales-main-name">' + escapeHtml(m.cat) + ' / ' + escapeHtml(m.sub) + '</span>' +
      '<span class="' + cls + '">金額影響 ' + escapeHtml(fD(m.diff)) + '</span>' +
      '<span class="sales-main-amount">' + escapeHtml(pctStr) + '</span>' +
      '<span class="sales-main-amount">荒利 ' + escapeHtml(fY(m.profit)) + '</span>' +
      '<span class="' + rCls(m.profitYoy) + '">荒利前年比 ' + escapeHtml(fR(m.profitYoy)) + '</span>';
  };
  const grossLine = (d) => d ? ('<div class="sales-gross-line">荒利 ' + fY(d.profit) + ' / 粗利率 ' + fR(d.grossRate) +
    ' / 荒利前年比 <span class="' + rCls(d.profitYoy) + '">' + fR(d.profitYoy) + '</span></div>') : '';

  const bumonBlock = (label, r, cd, which) => {
    if (!r) return '';
    const d = detail(cd, which);
    return '<div class="sales-alert-bumon"><div class="sales-alert-bumon-head"><span>' + label + '</span><span>' +
      '<span class="' + rCls(r['前週同曜日比']) + '">前週同曜日比 ' + fR(r['前週同曜日比']) + '</span> ' +
      '<span class="' + rCls(r['昨年比']) + '">前年 ' + fR(r['昨年比']) + '</span> ' +
      '<span class="' + rCls(r['予算比']) + '">予算 ' + fR(r['予算比']) + '</span> ' +
      '<span class="' + rCls(r['荒利予算比']) + '">荒利予算 ' + fR(r['荒利予算比']) + '</span> ' +
      '<span class="sales-alert-amount">' + fY(r['前週同曜日実績']) + ' → ' + fY(r['売上実績']) + '</span>' +
      '</span></div>' +
      '<div class="sales-alert-main">' + fmtMain(d && d.main) + '</div>' +
      grossLine(d) + '</div>';
  };

  const card = (s, positive) => {
    const t = s.bumon['合計'] || s.bumon['全体'] || s.bumon['計'] || {};
    const arrow = positive ? '▲' : '▼';
    const cls = positive ? 'num-good' : 'num-bad';
    const title = escapeHtml(s.name || '') + '：' +
      '<span class="' + rCls(t['前週同曜日比']) + '">前週同曜日比 ' + fR(t['前週同曜日比']) + '</span> ' +
      '<span class="' + rCls(t['昨年比']) + '">前年比 ' + fR(t['昨年比']) + '</span> ' +
      '<span class="' + rCls(t['予算比']) + '">予算比 ' + fR(t['予算比']) + '</span> ' +
      '<span class="' + rCls(t['荒利予算比']) + '">荒利予算比 ' + fR(t['荒利予算比']) + '</span>';
    const desc = '<div style="font-size:13px;color:var(--muted)">合計　前週同曜日（' + escapeHtml(prevD) + '）' + fY(t['前週同曜日実績']) +
      ' → 対象日 ' + fY(t['売上実績']) + ' / 予算 ' + fY(t['予算']) + ' / 前年同週 ' + fY(t['昨年実績']) + '</div>';
    const breakdown = '<div class="sales-alert-breakdown">' +
      bumonBlock('メンズ', s.bumon['メンズ'], s.cd, 'メンズ') +
      bumonBlock('レディース', s.bumon['レディース'], s.cd, 'レディース') + '</div>';
    return '<article class="card">' +
      '<div class="meta"><span>' + escapeHtml(latest) + '</span><span>' + escapeHtml(s.zone || '') + '</span>' +
      '<span class="' + cls + '" style="font-weight:800">' + arrow + ' #' + escapeHtml(s.rank) + ' ' + escapeHtml(s.name || '') + '　店舗売上</span></div>' +
      '<div class="card-title">' + title + '</div>' +
      desc + breakdown +
      '</article>';
  };

  goodEl.innerHTML = good.length ? good.map((s) => card(s, true)).join('') : '<div class="empty">好調店舗データはまだありません。</div>';
  badEl.innerHTML = bad.length ? bad.map((s) => card(s, false)).join('') : '<div class="empty">苦戦店舗データはまだありません。</div>';
}

// -- ニュース・タグ
function renderNews(items) {
  const container = document.getElementById('newsList');
  if (!items.length) { container.innerHTML = '<div class="empty">ニュースデータはまだありません。</div>'; return; }
  container.innerHTML = sortByImportance(items).map(function(item) {
    return '<article class="list-item"><div class="meta"><span>' + escapeHtml(item.date) + '</span><span>' + escapeHtml(item.keyword) + '</span><span>' + escapeHtml(item.source) + '</span><span class="importance">重要度 ' + escapeHtml(item.importance) + '</span></div><a href="' + escapeAttribute(item.url) + '" target="_blank" rel="noreferrer">' + escapeHtml(item.title) + '</a><p>' + escapeHtml(item.summary) + '</p><div class="action">MD示唆：' + escapeHtml(item.md_insight) + '</div></article>';
  }).join('');
}

function renderReviewNews(items) {
  const container = document.getElementById('reviewList');
  if (!items.length) { container.innerHTML = '<div class="empty">保留ニュースはありません。</div>'; return; }
  container.innerHTML = items.map(function(item) {
    return '<article class="list-item"><div class="meta"><span>' + escapeHtml(item.date) + '</span><span>' + escapeHtml(item.keyword) + '</span><span>' + escapeHtml(item.source) + '</span><span>' + escapeHtml(item.review_status||'保留') + '</span></div><a href="' + escapeAttribute(item.url) + '" target="_blank" rel="noreferrer">' + escapeHtml(item.title) + '</a><p>' + escapeHtml(item.summary) + '</p><div class="action">保留理由：' + escapeHtml(item.review_reason||'確認待ち') + '</div></article>';
  }).join('');
}

function renderTags(items) {
  const tbody = document.getElementById('tagTable');
  if (!items.length) { tbody.innerHTML = '<tr><td colspan="9">今日、分析タグとして残すほどの外部要因はありません。</td></tr>'; return; }
  tbody.innerHTML = items.map(function(item) {
    return '<tr><td>' + escapeHtml(item.date) + '</td><td>' + escapeHtml(item.week) + '</td><td>' + escapeHtml(item.zone) + '</td><td>' + escapeHtml(item.category) + '</td><td>' + escapeHtml(item.temp_tag) + '</td><td>' + escapeHtml(item.weather_tag) + '</td><td>' + escapeHtml(item.market_tag) + '</td><td>' + escapeHtml(item.product_tag) + '</td><td>' + escapeHtml(item.action_hint) + '</td></tr>';
  }).join('');
}
// -- 気温タブ
function sortWeatherRowsByZone(rows, zoneOrder) {
  var ordered=zoneOrder&&zoneOrder.length?zoneOrder:ZONE_ORDER_NS;
  return rows.slice().sort(function(a,b){
    var ai=ordered.indexOf(a.zone),bi=ordered.indexOf(b.zone);
    if(ai===-1&&bi===-1)return String(a.zone||'').localeCompare(String(b.zone||''),'ja');
    if(ai===-1)return 1;
    if(bi===-1)return -1;
    return ai-bi;
  });
}

function aggregateWeatherPeriod(rows,startDate,endDate,dateKey,displayDate,comparisonDate,zoneOrder,compareStartDate,compareEndDate) {
  var rowAvgTemp=function(row){
    var avg=numberOrNaN(row.avg_temp);
    if(!Number.isNaN(avg))return avg;
    var maxTemp=numberOrNaN(row.max_temp),minTemp=numberOrNaN(row.min_temp);
    return Number.isNaN(maxTemp)||Number.isNaN(minTemp)?NaN:(maxTemp+minTemp)/2;
  };
  var rowLastYearAvgTemp=function(row){
    var avg=numberOrNaN(row.last_year_avg_temp);
    if(!Number.isNaN(avg))return avg;
    var maxTemp=numberOrNaN(row.last_year_max_temp),minTemp=numberOrNaN(row.last_year_min_temp);
    return Number.isNaN(maxTemp)||Number.isNaN(minTemp)?NaN:(maxTemp+minTemp)/2;
  };
  var average=function(values){return values.length?Math.round(values.reduce(function(sum,value){return sum+value;},0)/values.length*10)/10:'';};
  var compareAvgByZone={};
  var compareRainByZone={};
  if(compareStartDate&&compareEndDate){
    var compareGroups={};
    var compareRainGroups={};
    (rows||[]).filter(function(row){return row.date>=compareStartDate&&row.date<=compareEndDate;}).forEach(function(row){
      var zone=row.zone||'';
      if(!zone)return;
      var avg=rowAvgTemp(row);
      if(!Number.isNaN(avg)){
        if(!compareGroups[zone])compareGroups[zone]=[];
        compareGroups[zone].push(avg);
      }
      var rainVal=numberOrNaN(row.rain_mm);
      if(!Number.isNaN(rainVal)){
        if(typeof compareRainGroups[zone]==='undefined')compareRainGroups[zone]=0;
        compareRainGroups[zone]+=rainVal;
      }
    });
    Object.keys(compareGroups).forEach(function(zone){compareAvgByZone[zone]=average(compareGroups[zone]);});
    Object.keys(compareRainGroups).forEach(function(zone){compareRainByZone[zone]=Math.round(compareRainGroups[zone]*10)/10;});
  }
  var grouped={};
  (rows||[]).filter(function(row){return row.date>=startDate&&row.date<=endDate;}).forEach(function(row){
    var zone=row.zone||'';
    if(!zone)return;
    if(!grouped[zone]){
      grouped[zone]={
        date:dateKey,
        display_date:displayDate||dateKey,
        zone:zone,
        area_name:row.area_name||zone,
        max_temp:null,
        min_temp:null,
        rain_mm:0,
        temp_vs_yesterday:'',
        avg_temp_values:[],
        max_temp_values:[],
        min_temp_values:[],
        rain_values:[],
        humidity_values:[],
        last_year_humidity_values:[],
        humidity_vs_ly_values:[],
        temp_vs_last_week_values:[],
        temp_vs_last_year_values:[],
        last_year_avg_values:[],
        last_year_rain_values:[],
        last_year_max_temp:null,
        last_year_min_temp:null,
        last_year_same_weekday_date:comparisonDate||'',
        weather_alerts:[]
      };
    }
    var item=grouped[zone];
    var maxTemp=numberOrNaN(row.max_temp);
    var minTemp=numberOrNaN(row.min_temp);
    var rain=numberOrNaN(row.rain_mm);
    var avgTemp=rowAvgTemp(row);
    var weekDiff=numberOrNaN(row.temp_vs_last_week);
    var yearDiff=numberOrNaN(row.temp_vs_last_year_same_weekday);
    var lyMax=numberOrNaN(row.last_year_max_temp);
    var lyMin=numberOrNaN(row.last_year_min_temp);
    var lyAvg=rowLastYearAvgTemp(row);
    var lyRain=numberOrNaN(row.last_year_rain_mm);
    var humidity=numberOrNaN(row.humidity_avg);
    var lyHumidity=numberOrNaN(row.last_year_humidity_avg);
    var humidityYearDiff=numberOrNaN(row.humidity_vs_last_year_same_weekday);
    if(!Number.isNaN(maxTemp)){item.max_temp=item.max_temp===null?maxTemp:Math.max(item.max_temp,maxTemp);item.max_temp_values.push(maxTemp);}
    if(!Number.isNaN(minTemp)){item.min_temp=item.min_temp===null?minTemp:Math.min(item.min_temp,minTemp);item.min_temp_values.push(minTemp);}
    if(!Number.isNaN(rain)){item.rain_mm+=rain;item.rain_values.push(rain);}
    if(!Number.isNaN(humidity))item.humidity_values.push(humidity);
    if(!Number.isNaN(lyHumidity))item.last_year_humidity_values.push(lyHumidity);
    if(!Number.isNaN(humidityYearDiff))item.humidity_vs_ly_values.push(humidityYearDiff);
    if(!Number.isNaN(lyRain))item.last_year_rain_values.push(lyRain);
    if(!Number.isNaN(avgTemp))item.avg_temp_values.push(avgTemp);
    if(!Number.isNaN(weekDiff))item.temp_vs_last_week_values.push(weekDiff);
    if(!Number.isNaN(yearDiff))item.temp_vs_last_year_values.push(yearDiff);
    if(!Number.isNaN(lyAvg))item.last_year_avg_values.push(lyAvg);
    if(!Number.isNaN(lyMax))item.last_year_max_temp=item.last_year_max_temp===null?lyMax:Math.max(item.last_year_max_temp,lyMax);
    if(!Number.isNaN(lyMin))item.last_year_min_temp=item.last_year_min_temp===null?lyMin:Math.min(item.last_year_min_temp,lyMin);
    if(row.weather_alert&&String(row.weather_alert).indexOf('通常観測')===-1)item.weather_alerts.push(row.weather_alert);
  });
  return sortWeatherRowsByZone(Object.values(grouped).map(function(item){
    var avgTemp=average(item.avg_temp_values);
    var lastWeekDiff=average(item.temp_vs_last_week_values);
    var compareAvg=compareAvgByZone[item.zone];
    if(lastWeekDiff===''&&avgTemp!==''&&typeof compareAvg!=='undefined'&&compareAvg!=='')lastWeekDiff=Math.round((avgTemp-compareAvg)*10)/10;
    var lastYearDiff=average(item.temp_vs_last_year_values);
    var lastYearAvg=average(item.last_year_avg_values);
    if(lastYearDiff===''&&avgTemp!==''&&lastYearAvg!=='')lastYearDiff=Math.round((avgTemp-lastYearAvg)*10)/10;
    // 降水量は週合計で扱うため、昨年降水量も同週合計で集計し、前年差はその合計同士の差にする。
    var thisYearRain=Math.round(item.rain_mm*10)/10;
    var lastYearRain=item.last_year_rain_values.length?Math.round(item.last_year_rain_values.reduce(function(sum,value){return sum+value;},0)*10)/10:'';
    var rainVsLastYear=lastYearRain===''?'':Math.round((thisYearRain-lastYearRain)*10)/10;
    var compareRain=compareRainByZone[item.zone];
    var rainVsLastWeek=(typeof compareRain!=='undefined'&&compareRain!=='')?Math.round((thisYearRain-compareRain)*10)/10:'';
    // 週別の気温タブ用：最高/最低/降水/湿度の「週内平均」も持たせる（合計・極値は他タブ用に従来通り温存）。
    var avgMaxTemp=average(item.max_temp_values);
    var avgMinTemp=average(item.min_temp_values);
    var avgRain=average(item.rain_values);
    var avgHumidity=average(item.humidity_values);
    var avgLastYearRain=average(item.last_year_rain_values);
    var avgRainVsLastYear=(avgRain!==''&&avgLastYearRain!=='')?Math.round((avgRain-avgLastYearRain)*10)/10:'';
    var avgHumidityYearDiff=average(item.humidity_vs_ly_values);
    return {
      date:item.date,
      display_date:item.display_date,
      zone:item.zone,
      area_name:item.area_name,
      avg_temp:avgTemp,
      max_temp:item.max_temp===null?'':item.max_temp,
      min_temp:item.min_temp===null?'':item.min_temp,
      avg_max_temp:avgMaxTemp,
      avg_min_temp:avgMinTemp,
      avg_rain_mm:avgRain,
      avg_last_year_rain_mm:avgLastYearRain,
      avg_rain_vs_last_year_same_weekday:avgRainVsLastYear,
      humidity_avg:avgHumidity,
      last_year_humidity_avg:average(item.last_year_humidity_values),
      humidity_vs_last_year_same_weekday:avgHumidityYearDiff,
      rain_mm:thisYearRain,
      rain_vs_last_week:rainVsLastWeek,
      temp_vs_yesterday:'',
      temp_vs_last_week:lastWeekDiff,
      temp_vs_last_year_same_weekday:lastYearDiff,
      last_year_avg_temp:lastYearAvg,
      last_year_max_temp:item.last_year_max_temp===null?'':item.last_year_max_temp,
      last_year_min_temp:item.last_year_min_temp===null?'':item.last_year_min_temp,
      last_year_rain_mm:lastYearRain,
      rain_vs_last_year_same_weekday:rainVsLastYear,
      last_year_same_weekday_date:item.last_year_same_weekday_date,
      weather_alert:item.weather_alerts.length?[...new Set(item.weather_alerts)].slice(0,3).join(' / '):item.zone+'：通常観測'
    };
  }),zoneOrder||[]);
}

function buildNationalAvgWeather(items) {
  var valid=items.filter(function(i){return i.zone&&i.zone!=='全国平均';});
  if(!valid.length)return null;
  var avgNum=function(key){var vals=valid.map(function(i){return numberOrNaN(i[key]);}).filter(function(v){return!Number.isNaN(v);});return vals.length?vals.reduce(function(a,b){return a+b;},0)/vals.length:NaN;};
  var roundAvg=function(key){var value=avgNum(key);return Number.isNaN(value)?'':Math.round(value*10)/10;};
  return{
    date:valid[0].date,display_date:valid[0].display_date||valid[0].date,zone:'全国平均',area_name:'全国平均',
    max_temp:roundAvg('max_temp'),
    min_temp:roundAvg('min_temp'),
    rain_mm:roundAvg('rain_mm'),
    avg_max_temp:roundAvg('avg_max_temp'),
    avg_min_temp:roundAvg('avg_min_temp'),
    avg_rain_mm:roundAvg('avg_rain_mm'),
    avg_last_year_rain_mm:roundAvg('avg_last_year_rain_mm'),
    avg_rain_vs_last_year_same_weekday:roundAvg('avg_rain_vs_last_year_same_weekday'),
    temp_vs_last_week:roundAvg('temp_vs_last_week'),
    temp_vs_yesterday:roundAvg('temp_vs_yesterday'),
    temp_vs_last_year_same_weekday:roundAvg('temp_vs_last_year_same_weekday'),
    last_year_max_temp:roundAvg('last_year_max_temp'),
    last_year_min_temp:roundAvg('last_year_min_temp'),
    last_year_rain_mm:roundAvg('last_year_rain_mm'),
    rain_vs_last_year_same_weekday:roundAvg('rain_vs_last_year_same_weekday'),
    rain_vs_last_week:roundAvg('rain_vs_last_week'),
    humidity_avg:roundAvg('humidity_avg'),
    last_year_humidity_avg:roundAvg('last_year_humidity_avg'),
    humidity_vs_last_year_same_weekday:roundAvg('humidity_vs_last_year_same_weekday'),
    last_year_same_weekday_date:valid[0].last_year_same_weekday_date||'-',
    weather_alert:'全国平均'
  };
}

function renderWeatherKpiColumn(w) {
  if (!w) return '';
  var avgTemp = numberOrNaN(w.avg_temp);
  var maxTemp = numberOrNaN(w.max_temp);
  var primaryTemp = Number.isNaN(avgTemp) ? maxTemp : avgTemp;
  if (Number.isNaN(primaryTemp)) return '';
  var lastYearAvgTemp = numberOrNaN(w.last_year_avg_temp);
  var primaryLastYearTemp = Number.isNaN(lastYearAvgTemp) ? numberOrNaN(w.last_year_max_temp) : lastYearAvgTemp;
  var hasLW = w.temp_vs_last_week !== '' && w.temp_vs_last_week !== null && typeof w.temp_vs_last_week !== 'undefined';
  var tempDiff = numberOrNaN(hasLW ? w.temp_vs_last_week : w.temp_vs_yesterday);
  var yearTempDiff = numberOrNaN(w.temp_vs_last_year_same_weekday);
  var rainWeekDiff = numberOrNaN(w.rain_vs_last_week);
  var rainYearDiff = numberOrNaN(w.rain_vs_last_year_same_weekday);
  var humidityYearDiff = numberOrNaN(w.humidity_vs_last_year_same_weekday);
  var formatWeatherValue = function(value, unit) {
    var n = numberOrNaN(value);
    return Number.isNaN(n) ? '-' : n.toFixed(1) + unit;
  };
  var formatSignedWeatherValue = function(value, unit) {
    var n = numberOrNaN(value);
    if (Number.isNaN(n)) return '-';
    var sign = n === 0 ? '\u00b1' : n > 0 ? '+' : '';
    return sign + n.toFixed(1) + unit;
  };
  var signedWeatherDiffClass = function(value) {
    var n = numberOrNaN(value);
    return Number.isNaN(n) || n === 0 ? '' : n > 0 ? 'num-bad' : 'num-good';
  };
  return '<div class="zs-col"><div class="zs-col-head">\u6c17\u6e29</div>'+
    '<div class="zs-kpi"><span class="zs-kpi-l '+tempCompareClass(primaryTemp, primaryLastYearTemp)+'">\u5e73\u5747</span><span class="zs-kpi-v">'+formatWeatherValue(primaryTemp, '\u2103')+'</span></div>'+
    '<div class="zs-kpi"><span class="zs-kpi-l">'+(hasLW?'\u524d\u9031\u5dee':'\u524d\u65e5\u5dee')+'</span><span class="zs-kpi-v '+tempDiffClass(tempDiff)+'">'+formatSignedWeatherValue(tempDiff, '\u2103')+'</span></div>'+
    '<div class="zs-kpi"><span class="zs-kpi-l">\u524d\u5e74\u5dee</span><span class="zs-kpi-v '+tempDiffClass(yearTempDiff)+'">'+formatSignedWeatherValue(yearTempDiff, '\u2103')+'</span></div>'+
    '<div class="zs-kpi"><span class="zs-kpi-l">\u964d\u6c34\u91cf</span><span class="zs-kpi-v">'+formatWeatherValue(w.rain_mm, 'mm')+'</span></div>'+
    '<div class="zs-kpi"><span class="zs-kpi-l">\u964d\u6c34\u524d\u9031\u5dee</span><span class="zs-kpi-v '+signedWeatherDiffClass(rainWeekDiff)+'">'+formatSignedWeatherValue(rainWeekDiff, 'mm')+'</span></div>'+
    '<div class="zs-kpi"><span class="zs-kpi-l">\u964d\u6c34\u524d\u5e74\u5dee</span><span class="zs-kpi-v '+signedWeatherDiffClass(rainYearDiff)+'">'+formatSignedWeatherValue(rainYearDiff, 'mm')+'</span></div>'+
    '<div class="zs-kpi"><span class="zs-kpi-l">\u6e7f\u5ea6</span><span class="zs-kpi-v">'+formatHumidity(w.humidity_avg)+'</span></div>'+
    '<div class="zs-kpi"><span class="zs-kpi-l">\u6e7f\u5ea6\u524d\u5e74\u5dee</span><span class="zs-kpi-v '+signedWeatherDiffClass(humidityYearDiff)+'">'+formatSignedHumidityDiff(humidityYearDiff)+'</span></div>'+
    '</div>';
}

function renderSalesAlertWeatherCompact(w) {
  if (!w) return '';
  var avgTemp = numberOrNaN(w.avg_temp);
  var maxTemp = numberOrNaN(w.max_temp);
  var primaryTemp = Number.isNaN(avgTemp) ? maxTemp : avgTemp;
  if (Number.isNaN(primaryTemp)) return '';
  var lastYearAvgTemp = numberOrNaN(w.last_year_avg_temp);
  var primaryLastYearTemp = Number.isNaN(lastYearAvgTemp) ? numberOrNaN(w.last_year_max_temp) : lastYearAvgTemp;
  var hasLW = w.temp_vs_last_week !== '' && w.temp_vs_last_week !== null && typeof w.temp_vs_last_week !== 'undefined';
  var tempDiff = numberOrNaN(hasLW ? w.temp_vs_last_week : w.temp_vs_yesterday);
  var yearTempDiff = numberOrNaN(w.temp_vs_last_year_same_weekday);
  var formatWeatherValue = function(value, unit) {
    var n = numberOrNaN(value);
    return Number.isNaN(n) ? '-' : n.toFixed(1) + unit;
  };
  var formatSignedWeatherValue = function(value, unit) {
    var n = numberOrNaN(value);
    if (Number.isNaN(n)) return '-';
    var sign = n === 0 ? '\u00b1' : n > 0 ? '+' : '';
    return sign + n.toFixed(1) + unit;
  };
  var chip = function(label, value, cls) {
    return '<span class="sales-weather-chip"><span>' + escapeHtml(label) + '</span><strong class="' + (cls || '') + '">' + escapeHtml(value) + '</strong></span>';
  };
  return '<div class="sales-weather-compact">' +
    chip('\u6c17\u6e29', formatWeatherValue(primaryTemp, '\u2103'), tempCompareClass(primaryTemp, primaryLastYearTemp)) +
    chip(hasLW ? '\u524d\u9031' : '\u524d\u65e5', formatSignedWeatherValue(tempDiff, '\u2103'), tempDiffClass(tempDiff)) +
    chip('\u524d\u5e74', formatSignedWeatherValue(yearTempDiff, '\u2103'), tempDiffClass(yearTempDiff)) +
    chip('\u96e8', formatWeatherValue(w.rain_mm, 'mm'), '') +
    chip('\u6e7f\u5ea6', formatHumidity(w.humidity_avg), '') +
    '</div>';
}

function renderWeather(items, trendItems, zoneOrder) {
  var national=buildNationalAvgWeather(items);
  var allItems=national?[national].concat(items):items;
  // 昨年降水量・降水前年差の表示ヘルパー（空文字 / null / undefined を ' - ' に揃える）
  var fmtMm=function(v){var n=numberOrNaN(v);return Number.isNaN(n)?'-':n.toFixed(1)+'mm';};
  var fmtMmDiff=function(v){var n=numberOrNaN(v);return Number.isNaN(n)?'-':((n>0?'+':'')+n.toFixed(1)+'mm');};
  var rainDiffClass=function(v){var n=numberOrNaN(v);return Number.isNaN(n)?'':(n>0?'num-bad':n<0?'num-good':'');};
  // 週別モードのときだけ、気温タブは最高/最低/降水/湿度を「週内平均」で表示する（日別は従来どおり）。
  var weekly = state.dateMode === 'weekly';
  var hasVal=function(v){return v!==''&&v!==null&&typeof v!=='undefined'&&!Number.isNaN(Number(v));};
  var pickWeekly=function(item, avgKey, baseKey){var v=item[avgKey];return (weekly&&hasVal(v))?v:item[baseKey];};
  var fmtDeg=function(v){return hasVal(v)?escapeHtml(v)+'℃':'-';};
  var maxLabel = weekly ? '平均最高' : '最高';
  var minLabel = weekly ? '平均最低' : '最低';
  var rainLabel = weekly ? '平均降水量' : '降水量';
  renderCards('weatherCards', allItems, function(item) {
    var maxV=pickWeekly(item,'avg_max_temp','max_temp');
    var minV=pickWeekly(item,'avg_min_temp','min_temp');
    var rainV=weekly?item.avg_rain_mm:item.rain_mm;
    var lyRainV=weekly?item.avg_last_year_rain_mm:item.last_year_rain_mm;
    var rainDiffV=weekly?item.avg_rain_vs_last_year_same_weekday:item.rain_vs_last_year_same_weekday;
    return '<article class="card"><div class="meta"><span>' + escapeHtml(item.display_date||item.date) + '</span><span>' + escapeHtml(item.zone) + '</span></div><div class="card-title">' + escapeHtml(item.area_name) + '：<span class="' + tempCompareClass(maxV,item.last_year_max_temp) + '">' + maxLabel + fmtDeg(maxV) + '</span></div><div><span class="' + tempCompareClass(minV,item.last_year_min_temp) + '">' + minLabel + fmtDeg(minV) + '</span> / ' + rainLabel + (hasVal(rainV)?escapeHtml(rainV)+'mm':'-') + '（昨年 ' + fmtMm(lyRainV) + ' / 前年差 <span class="' + rainDiffClass(rainDiffV) + '">' + fmtMmDiff(rainDiffV) + '</span>） / 湿度' + formatHumidity(item.humidity_avg) + '（不快指数' + formatDiscomfortIndex(item) + '）</div><div>前週差 <span class="' + tempDiffClass(item.temp_vs_last_week) + '">' + formatTempDiffOrDash(item.temp_vs_last_week) + '℃</span> / 前日差 <span class="' + tempDiffClass(item.temp_vs_yesterday) + '">' + formatTempDiffOrDash(item.temp_vs_yesterday) + '℃</span> / 前年差 <span class="' + tempDiffClass(item.temp_vs_last_year_same_weekday) + '">' + formatTempDiffOrDash(item.temp_vs_last_year_same_weekday) + '℃</span> / 湿度前年差 <span class="' + humidityDiffClass(item.humidity_vs_last_year_same_weekday) + '">' + formatSignedHumidityDiff(item.humidity_vs_last_year_same_weekday) + '</span> / 不快指数前年差 <span class="' + discomfortDiffClass(item) + '">' + formatSignedDiscomfortDiff(item) + '</span> / 昨年 ' + escapeHtml(item.last_year_same_weekday_date||'-') + '</div><div class="action">' + escapeHtml(item.weather_alert) + '</div></article>';
  });
  var tbody = document.getElementById('weatherTable');
  tbody.innerHTML = allItems.map(function(item) {
    var maxV=pickWeekly(item,'avg_max_temp','max_temp');
    var minV=pickWeekly(item,'avg_min_temp','min_temp');
    var rainV=weekly?item.avg_rain_mm:item.rain_mm;
    var lyRainV=weekly?item.avg_last_year_rain_mm:item.last_year_rain_mm;
    var rainDiffV=weekly?item.avg_rain_vs_last_year_same_weekday:item.rain_vs_last_year_same_weekday;
    return '<tr><td>' + escapeHtml(item.display_date||item.date) + '</td><td>' + escapeHtml(item.zone) + '</td><td>' + fmtDeg(maxV) + '</td><td>' + fmtDeg(minV) + '</td><td>' + (hasVal(rainV)?escapeHtml(rainV)+'mm':'-') + '</td><td>' + fmtMm(lyRainV) + '</td><td class="' + rainDiffClass(rainDiffV) + '">' + fmtMmDiff(rainDiffV) + '</td><td>' + formatHumidity(item.humidity_avg) + '</td><td>' + formatDiscomfortIndex(item) + '</td><td>' + formatTempDiffOrDash(item.temp_vs_last_week) + '℃</td><td>' + formatTempDiffOrDash(item.temp_vs_last_year_same_weekday) + '℃</td><td class="' + humidityDiffClass(item.humidity_vs_last_year_same_weekday) + '">' + formatSignedHumidityDiff(item.humidity_vs_last_year_same_weekday) + '</td><td class="' + discomfortDiffClass(item) + '">' + formatSignedDiscomfortDiff(item) + '</td><td>' + escapeHtml(item.last_year_same_weekday_date||'-') + '</td><td>' + escapeHtml(item.weather_alert) + '</td></tr>';
  }).join('');
  renderWeatherTrend(trendItems||[], allItems, zoneOrder||[]);
}

function buildNationalAvgTrend(trendItems) {
  var dateMap={};
  trendItems.forEach(function(i){if(!i.zone||i.zone==='全国平均')return;if(!dateMap[i.date])dateMap[i.date]=[];dateMap[i.date].push(i);});
  return Object.keys(dateMap).map(function(date){var n=buildNationalAvgWeather(dateMap[date]);if(n)n.date=date;return n;}).filter(Boolean);
}

function renderWeatherTrend(trendItems, todayItems, zoneOrder) {
  var select = document.getElementById('weatherZoneSelect');
  var chart = document.getElementById('weatherTrendChart');
  if (!select||!chart) return;
  var natTrend=buildNationalAvgTrend(trendItems);
  var allTrend=natTrend.concat(trendItems);
  var available = new Set(allTrend.map(function(i){return i.zone;}).filter(Boolean));
  var zones = ['全国平均'].concat(
    zoneOrder.filter(function(z){return available.has(z)&&z!=='全国平均';}).concat(
      [...available].filter(function(z){return !zoneOrder.includes(z)&&z!=='全国平均';}).sort(function(a,b){return String(a).localeCompare(String(b),'ja');})
    )
  ).filter(function(z){return available.has(z);});
  if (!zones.length) { select.innerHTML='<option>データなし</option>'; drawEmptyChart(chart,'天気データがまだありません'); return; }
  var preferred = (todayItems.find(function(i){return Number(i.max_temp||0)>=25;})||{zone:todayItems[0]&&todayItems[0].zone||zones[0]}).zone||zones[0];
  var current = zones.includes(select.value) ? select.value : (zones.includes(preferred)?preferred:zones[0]);
  select.innerHTML = zones.map(function(z){return '<option value="'+escapeAttribute(z)+'"'+(z===current?' selected':'')+'>'+escapeHtml(z)+'</option>';}).join('');
  select.onchange = function(){window.requestAnimationFrame(function(){drawWeatherChart(chart,allTrend,select.value);});};
  window.requestAnimationFrame(function(){drawWeatherChart(chart,allTrend,select.value||current);});
}

function drawWeatherChart(chart, trendItems, zone) {
  var rows = trendItems.filter(function(i){return i.zone===zone;}).sort(function(a,b){return String(a.date).localeCompare(String(b.date));});
  if (!rows.length){drawEmptyChart(chart,'このゾーンの天気データがありません');return;}
  var W=920,H=190,pad={top:16,right:16,bottom:36,left:42};
  var plotW=W-pad.left-pad.right, plotH=H-pad.top-pad.bottom;
  var temps=rows.flatMap(function(r){return[numberOrNaN(r.max_temp),numberOrNaN(r.min_temp),numberOrNaN(r.last_year_max_temp),numberOrNaN(r.last_year_min_temp)];}).filter(function(v){return !Number.isNaN(v);});
  if (!temps.length){drawEmptyChart(chart,'このゾーンの気温データがありません');return;}
  var minY=Math.floor(Math.min.apply(null,temps)/5)*5-2, maxY=Math.ceil(Math.max.apply(null,temps)/5)*5+2;
  var x=function(i){return pad.left+(rows.length===1?plotW/2:plotW*i/(rows.length-1));};
  var y=function(v){return pad.top+plotH-((Number(v)-minY)/(maxY-minY||1))*plotH;};
  var grid=[];
  for(var t=minY;t<=maxY;t+=5){var ty=y(t);grid.push('<line x1="'+pad.left+'" y1="'+ty+'" x2="'+(W-pad.right)+'" y2="'+ty+'" stroke="#d8e2ec" stroke-width="1"/><text x="4" y="'+(ty+4)+'" fill="#62748a" font-size="12">'+t+'℃</text>');}
  var labels=rows.map(function(r,i){if(i%Math.ceil(rows.length/7)!==0&&i!==rows.length-1)return null;return '<text x="'+(x(i)-15)+'" y="'+(H-14)+'" fill="#334e68" font-size="12">'+escapeHtml(String(r.date).slice(5))+'</text>';}).filter(Boolean);
  var fDots=rows.map(function(r,i){return(r.source!=='forecast'||Number.isNaN(numberOrNaN(r.max_temp)))?'':'<circle cx="'+x(i)+'" cy="'+y(r.max_temp)+'" r="4" fill="#f59e0b"/>';}).join('');
  var hDots=rows.map(function(r,i){var v=numberOrNaN(r.max_temp);if(Number.isNaN(v))return'';return'<circle class="chart-hit" cx="'+x(i)+'" cy="'+y(v)+'" r="11" fill="transparent" tabindex="0" data-tooltip="'+escapeAttribute(buildWeatherTooltip(r))+'"/>';}).join('');
  chart.innerHTML='<div class="chart-tooltip" hidden></div><svg viewBox="0 0 '+W+' '+H+'" preserveAspectRatio="none">'+grid.join('')+buildSvgPath(rows,x,y,'max_temp','#1f5f99')+buildSvgPath(rows,x,y,'min_temp','#64748b')+buildSvgPath(rows,x,y,'last_year_max_temp','#8b5cf6',true)+buildSvgPath(rows,x,y,'last_year_min_temp','#94a3b8',true)+fDots+hDots+labels.join('')+'</svg>';
  bindChartTooltip(chart);
}

function buildWeatherTooltip(row) {
  var type=row.source==='forecast'?'予報':'実績';
  var rainLine='降水量 '+formatMm(row.rain_mm);
  if(row.last_year_rain_mm!==''&&row.last_year_rain_mm!==null&&row.last_year_rain_mm!==undefined){
    rainLine+='（昨年 '+formatMm(row.last_year_rain_mm)+'）';
  }
  return [row.date+' '+row.zone+'（'+type+'）','最高 '+formatTemp(row.max_temp)+' / 最低 '+formatTemp(row.min_temp),'昨年最高 '+formatTemp(row.last_year_max_temp)+' / 昨年最低 '+formatTemp(row.last_year_min_temp),rainLine,'湿度 '+formatHumidity(row.humidity_avg)].join('\n');
}

function bindChartTooltip(chart) {
  var tooltip=chart.querySelector('.chart-tooltip');
  if(!tooltip)return;
  var show=function(target,event){var text=target.getAttribute('data-tooltip');if(!text)return;tooltip.innerHTML=escapeHtml(text).replace(/\n/g,'<br>');tooltip.hidden=false;move(event);};
  var move=function(event){if(tooltip.hidden||!event)return;var rect=chart.getBoundingClientRect();var tx=Math.min(Math.max(event.clientX-rect.left+12,8),rect.width-tooltip.offsetWidth-8);var ty=Math.min(Math.max(event.clientY-rect.top-tooltip.offsetHeight-10,8),rect.height-tooltip.offsetHeight-8);tooltip.style.left=tx+'px';tooltip.style.top=ty+'px';};
  var hide=function(){tooltip.hidden=true;};
  chart.querySelectorAll('.chart-hit').forEach(function(dot){dot.addEventListener('mouseenter',function(e){show(dot,e);});dot.addEventListener('mousemove',move);dot.addEventListener('mouseleave',hide);dot.addEventListener('focus',function(e){show(dot,e);});dot.addEventListener('blur',hide);});
}

function buildSvgPath(rows, x, y, key, color, dashed) {
  var segments=[],points=[];
  rows.forEach(function(row,i){var v=numberOrNaN(row[key]);if(Number.isNaN(v)){if(points.length)segments.push(points);points=[];return;}points.push([x(i),y(v)]);});
  if(points.length)segments.push(points);
  return segments.map(function(seg){
    if(seg.length===1)return '<circle cx="'+seg[0][0]+'" cy="'+seg[0][1]+'" r="3" fill="'+color+'"/>';
    var d=seg.map(function(p,i){return(i===0?'M':'L')+' '+p[0]+' '+p[1];}).join(' ');
    return '<path d="'+d+'" fill="none" stroke="'+color+'" stroke-width="'+(dashed?1.8:2.6)+'" stroke-linecap="round" stroke-linejoin="round" '+(dashed?'stroke-dasharray="6 5"':'')+'/>';
  }).join('');
}
// -- 売上タブ
function renderSales(allRows, dates, weatherItems) {
  var container=document.getElementById('salesContent');
  var select=document.getElementById('salesDateSelect');
  if(!dates.length){select.innerHTML='<option>データなし</option>';container.innerHTML='<div class="empty">売上データはまだありません。</div>';return;}
  select.innerHTML=dates.map(function(d){return'<option value="'+escapeAttribute(d)+'">'+escapeHtml(d)+'</option>';}).join('');
  var allWeatherItems=weatherItems||[];
  var weatherByDateZone=function(date){
    var rows=allWeatherItems.filter(function(w){return w.date===date;});
    var national=buildNationalAvgWeather(rows);
    var weatherByZone={};
    (national?[national].concat(rows):rows).forEach(function(w){if(w.zone)weatherByZone[w.zone]=w;});
    return weatherByZone;
  };
  var renderForDate=function(date){
    var rows=allRows.filter(function(r){return r.date===date;});
    var weatherByZone=weatherByDateZone(date);
    if(!rows.length){container.innerHTML='<div class="empty">この日のデータはありません。</div>';return;}
    var isAggr=function(r){return String(r.zone_code||'').padStart(4,'0')==='0000'||r.zone_name==='全社計';};
    var totalRows=rows.filter(isAggr);
    var zoneRows=rows.filter(function(r){return !isAggr(r);});
    var zoneNames=sortZonesNS([...new Set(zoneRows.map(function(r){return r.zone_name;}))]);
    var allZones=totalRows.length?[{name:'全社計',isTotal:true}].concat(zoneNames.map(function(n){return{name:n,isTotal:false};})):zoneNames.map(function(n){return{name:n,isTotal:false};});
    var makeCol=function(row){
      if(!row)return{budget:NaN,actual:NaN,ratio:NaN,ly:NaN,yoy:NaN,profit:NaN,grossRate:NaN,lyProfit:NaN,profitYoy:null};
      var actual=numberOrNaN(row['売上実績']);
      var budget=numberOrNaN(row['売上予算']);
      var ratio=numberOrNaN(row['達成率']);
      if(Number.isNaN(ratio)&&!Number.isNaN(actual)&&!Number.isNaN(budget)&&budget)ratio=Math.round(actual/budget*1000)/10;
      var profit=grossProfitFromRow(row,'売上実績');
      var grossRate=!Number.isNaN(normalizePercentValue(row['荒利率']))?normalizePercentValue(row['荒利率']):grossMarginRate(profit,actual);
      var lyProfit=lastYearGrossProfitFromRow(row);
      var gpBudget=numberOrNaN(row['荒利予算']);
      var gpBudgetRatio=numberOrNaN(row['荒利予算比']);
      if(Number.isNaN(gpBudgetRatio)&&!Number.isNaN(profit)&&!Number.isNaN(gpBudget)&&gpBudget)gpBudgetRatio=Math.round(profit/gpBudget*1000)/10;
      var ly=numberOrNaN(row['前年同週同曜日実績']);
      var yoy=numberOrNaN(row['前年比']);
      if(Number.isNaN(yoy)&&!Number.isNaN(actual)&&!Number.isNaN(ly)&&ly)yoy=Math.round(actual/ly*1000)/10;
      return{budget:budget,actual:actual,ratio:ratio,ly:ly,yoy:yoy,profit:profit,grossRate:grossRate,lyProfit:lyProfit,profitYoy:yoyRateValue(profit,lyProfit),gpBudget:gpBudget,gpBudgetRatio:gpBudgetRatio};
    };
    var pctClass=function(v){return(v===null||Number.isNaN(Number(v)))?'':Number(v)>=100?'num-good':Number(v)>=95?'num-warn':'num-bad';};
    var colHtml=function(label,col){
      return '<div class="zs-col"><div class="zs-col-head">'+label+'</div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">予算</span><span class="zs-kpi-v">'+(Number.isNaN(col.budget)?'-':col.budget.toLocaleString('ja-JP'))+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">実績</span><span class="zs-kpi-v">'+(Number.isNaN(col.actual)?'-':col.actual.toLocaleString('ja-JP'))+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">達成率</span><span class="zs-kpi-v '+pctClass(col.ratio)+'">'+(Number.isNaN(col.ratio)?'-':col.ratio.toFixed(1)+'%')+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">前年同週</span><span class="zs-kpi-v">'+(Number.isNaN(col.ly)?'-':col.ly.toLocaleString('ja-JP'))+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">前年比</span><span class="zs-kpi-v '+pctClass(col.yoy)+'">'+(Number.isNaN(col.yoy)?'-':col.yoy.toFixed(1)+'%')+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">荒利</span><span class="zs-kpi-v">'+(Number.isNaN(col.profit)?'-':Math.round(col.profit).toLocaleString('ja-JP'))+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">粗利率</span><span class="zs-kpi-v">'+(Number.isNaN(col.grossRate)?'-':col.grossRate.toFixed(1)+'%')+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">荒利予算比</span><span class="zs-kpi-v '+pctClass(col.gpBudgetRatio)+'">'+(Number.isNaN(col.gpBudgetRatio)?'-':col.gpBudgetRatio.toFixed(1)+'%')+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">荒利前年比</span><span class="zs-kpi-v '+pctClass(col.profitYoy)+'">'+(col.profitYoy===null||Number.isNaN(Number(col.profitYoy))?'-':Number(col.profitYoy).toFixed(1)+'%')+'</span></div>'+
        '</div>';
    };
    var tempColHtml=function(w){
      if(!w)return'<div class="zs-col"><div class="zs-col-head">気温</div><div class="zs-kpi" style="color:var(--muted);font-size:12px">データなし</div></div>';
      var hasLW=w.temp_vs_last_week!==''&&w.temp_vs_last_week!==null&&typeof w.temp_vs_last_week!=='undefined';
      var diff=numberOrNaN(hasLW?w.temp_vs_last_week:w.temp_vs_yesterday);
      var diffLY=numberOrNaN(w.temp_vs_last_year_same_weekday);
      var diffStr=Number.isNaN(diff)?'-':(diff===0?'±':diff>0?'+':'')+diff.toFixed(1)+'℃';
      var diffLYStr=Number.isNaN(diffLY)?'-':(diffLY===0?'±':diffLY>0?'+':'')+diffLY.toFixed(1)+'℃';
      var diffCls=diff>0?'num-bad':diff<0?'num-good':'';
      var diffLYCls=diffLY>0?'num-bad':diffLY<0?'num-good':'';
      var tempValue=function(v){var n=numberOrNaN(v);return Number.isNaN(n)?'-':n.toFixed(1)+'℃';};
      // 降水量（雨は多いほど客足に不利なため、+を num-bad / -を num-good で着色）
      var rainVal=function(v){var n=numberOrNaN(v);return Number.isNaN(n)?'-':n.toFixed(1)+'mm';};
      var rainDiffStr=function(v){var n=numberOrNaN(v);return Number.isNaN(n)?'-':(n===0?'±':n>0?'+':'')+n.toFixed(1)+'mm';};
      var rainDiffCls=function(v){var n=numberOrNaN(v);return Number.isNaN(n)?'':n>0?'num-bad':n<0?'num-good':'';};
      var rainVsLW=w.rain_vs_last_week;
      var rainVsLY=w.rain_vs_last_year_same_weekday;
      return '<div class="zs-col"><div class="zs-col-head">気温</div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">最高</span><span class="zs-kpi-v">'+tempValue(w.max_temp)+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">最低</span><span class="zs-kpi-v">'+tempValue(w.min_temp)+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">'+(hasLW?'前週差':'前日差')+'</span><span class="zs-kpi-v '+diffCls+'">'+diffStr+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">前年差</span><span class="zs-kpi-v '+diffLYCls+'">'+diffLYStr+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">降水量</span><span class="zs-kpi-v">'+rainVal(w.rain_mm)+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">降水前週差</span><span class="zs-kpi-v '+rainDiffCls(rainVsLW)+'">'+rainDiffStr(rainVsLW)+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">降水前年差</span><span class="zs-kpi-v '+rainDiffCls(rainVsLY)+'">'+rainDiffStr(rainVsLY)+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">湿度</span><span class="zs-kpi-v">'+formatHumidity(w.humidity_avg)+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">湿度前年差</span><span class="zs-kpi-v '+humidityDiffClass(w.humidity_vs_last_year_same_weekday)+'">'+formatSignedHumidityDiff(w.humidity_vs_last_year_same_weekday)+'</span></div>'+
        '</div>';
    };
    container.innerHTML='<div class="zs-grid">'+allZones.map(function(z){
      var zr=z.isTotal?totalRows:rows.filter(function(r){return r.zone_name===z.name;});
      var mens=makeCol(zr.find(function(r){return String(r['部門CD']).padStart(4,'0')==='0075';}));
      var ladies=makeCol(zr.find(function(r){return String(r['部門CD']).padStart(4,'0')==='0187';}));
      var tA=(!Number.isNaN(mens.actual)?mens.actual:0)+(!Number.isNaN(ladies.actual)?ladies.actual:0);
      var tB=(!Number.isNaN(mens.budget)?mens.budget:0)+(!Number.isNaN(ladies.budget)?ladies.budget:0);
      var tL=(!Number.isNaN(mens.ly)?mens.ly:0)+(!Number.isNaN(ladies.ly)?ladies.ly:0);
      var tP=(!Number.isNaN(mens.profit)?mens.profit:0)+(!Number.isNaN(ladies.profit)?ladies.profit:0);
      var tLP=(!Number.isNaN(mens.lyProfit)?mens.lyProfit:0)+(!Number.isNaN(ladies.lyProfit)?ladies.lyProfit:0);
      var tGB=(!Number.isNaN(mens.gpBudget)?mens.gpBudget:0)+(!Number.isNaN(ladies.gpBudget)?ladies.gpBudget:0);
      var total={budget:tB||NaN,actual:tA||NaN,ratio:tB?Math.round(tA/tB*1000)/10:NaN,ly:tL||NaN,yoy:tL?Math.round(tA/tL*1000)/10:NaN,profit:tP||NaN,grossRate:grossMarginRate(tP,tA),lyProfit:tLP||NaN,profitYoy:yoyRateValue(tP,tLP),gpBudget:tGB||NaN,gpBudgetRatio:tGB?Math.round(tP/tGB*1000)/10:NaN};
      var wData=z.isTotal?(weatherByZone['全国平均']||weatherByZone['全社計']||null):(weatherByZone[z.name]||null);
      return '<article class="card zs-card'+(z.isTotal?' zs-card-total':'')+'"><div class="zs-card-head">'+escapeHtml(z.name)+'</div><div class="zs-cols">'+colHtml('メンズ',mens)+colHtml('レディース',ladies)+colHtml('合計',total)+tempColHtml(wData)+'</div></article>';
    }).join('')+'</div>';
  };
  select.onchange=function(){renderForDate(select.value);};
  renderForDate(dates[0]);
}
// -- カテゴリタブ
function renderCategory(allRows, dates) {
  var dateSelect=document.getElementById('categoryDateSelect');
  var zoneSelect=document.getElementById('categoryZoneSelect');
  var bumonSelect=document.getElementById('categoryBumonSelect');
  if(!dates.length){dateSelect.innerHTML='<option>データなし</option>';document.getElementById('categoryTableBody').innerHTML='<tr><td colspan="13">売上データはまだありません。</td></tr>';return;}
  dateSelect.innerHTML=dates.map(function(d){return'<option value="'+escapeAttribute(d)+'">'+escapeHtml(d)+'</option>';}).join('');
  var isAggRow=function(r){return r.zone_name==='全社計'||String(r.zone_code||'').padStart(4,'0')==='0000';};
  var rebuildZones=function(date){
    var rows=allRows.filter(function(r){return r.date===date&&!isAggRow(r);});
    var zones=sortZonesNS([...new Set(rows.map(function(r){return r.zone_name;}).filter(Boolean))]);
    var all=['全ゾーン'].concat(zones);
    var prev=zoneSelect.value;
    zoneSelect.innerHTML=all.map(function(z){return'<option value="'+escapeAttribute(z)+'">'+escapeHtml(z)+'</option>';}).join('');
    if(all.includes(prev))zoneSelect.value=prev;
  };
  var renderTable=function(){
    var date=dateSelect.value;
    var comparison=pickComparisonDate(dates,date);
    var prevDate=comparison.date;
    var zone=zoneSelect.value;
    var bumon=bumonSelect.value;
    var pickRows=function(targetDate){
      var picked;
      if(!zone||zone==='全ゾーン'){picked=allRows.filter(function(r){return r.date===targetDate&&isAggRow(r);});if(!picked.length)picked=allRows.filter(function(r){return r.date===targetDate&&!isAggRow(r);});}
      else{picked=allRows.filter(function(r){return r.date===targetDate&&!isAggRow(r)&&r.zone_name===zone;});}
      if(bumon)picked=picked.filter(function(r){return String(r['部門CD']).padStart(4,'0')===bumon;});
      return picked;
    };
    var rows=pickRows(date);
    var prevRows=prevDate?pickRows(prevDate):[];
    var aggregateRows=function(sourceRows){
      var map={};
      sourceRows.forEach(function(r){
        var key=r['部門CD']+'|'+r['部門名']+'|'+r['カテゴリCD']+'|'+r['カテゴリ名']+'|'+r['サブカテCD']+'|'+r['サブカテ名'];
        if(!map[key])map[key]=Object.assign({},r,{'実績数量':0,'実績金額':0,'前年同週同曜日実績':0,'販売荒利高':0,'前年荒利高':0,hasLy:false,hasProfit:false,hasLyProfit:false});
        map[key]['実績数量']+=Number(r['実績数量']||0);
        map[key]['実績金額']+=Number(r['実績金額']||0);
        var profit=grossProfitFromRow(r,'実績金額');var lyProfit=lastYearGrossProfitFromRow(r);
        if(!Number.isNaN(profit)){map[key]['販売荒利高']+=profit;map[key].hasProfit=true;}
        if(!Number.isNaN(lyProfit)){map[key]['前年荒利高']+=lyProfit;map[key].hasLyProfit=true;}
        if(r['前年同週同曜日実績']!==''&&r['前年同週同曜日実績']!==null&&typeof r['前年同週同曜日実績']!=='undefined'){map[key]['前年同週同曜日実績']+=Number(r['前年同週同曜日実績']||0);map[key].hasLy=true;}
      });
      return map;
    };
    var map=aggregateRows(rows);var prevMap=aggregateRows(prevRows);
    Object.keys(map).forEach(function(key){if(prevMap[key]){map[key].prevDayAmt=Number(prevMap[key]['実績金額']||0);map[key].hasPrevDay=true;}else{map[key].prevDayAmt=0;map[key].hasPrevDay=false;}});
    var aggregated=Object.values(map).sort(function(a,b){var d=String(a['部門CD']).localeCompare(String(b['部門CD']));if(d!==0)return d;var c=String(a['カテゴリCD']).localeCompare(String(b['カテゴリCD']));if(c!==0)return c;return String(a['サブカテCD']).localeCompare(String(b['サブカテCD']));});
    var tbody=document.getElementById('categoryTableBody');
    if(!aggregated.length){tbody.innerHTML='<tr><td colspan="13">データがありません。</td></tr>';return;}
    var pctCls=function(v){return v===null?'':v>=100?'num-good':v>=95?'num-warn':'num-bad';};
    var dataRow=function(r){
      var pw=r.hasPrevDay?Number(r.prevDayAmt||0):null;
      var pPct=pw?Math.round(Number(r['実績金額']||0)/pw*1000)/10:null;
      var lyA=r.hasLy?r['前年同週同曜日実績']:null;
      var yoy=(lyA&&r['実績金額'])?Math.round(r['実績金額']/lyA*1000)/10:null;
      var sDiff=lyA!==null?Number(r['実績金額']||0)-Number(lyA||0):null;
      var profit=r.hasProfit?Number(r['販売荒利高']||0):null;
      var margin=profit!==null?grossMarginRate(profit,r['実績金額']):null;
      var lyP=r.hasLyProfit?Number(r['前年荒利高']||0):null;
      var pDiff=profit!==null&&lyP!==null?profit-lyP:null;
      return '<tr><td>'+escapeHtml(r['部門名']||'')+'</td><td>'+escapeHtml(r['カテゴリ名']||'')+'</td><td>'+escapeHtml(r['サブカテ名']||'')+'</td><td class="num">'+formatNum(r['実績数量'])+'</td><td class="num">'+formatYen(r['実績金額'])+'</td><td class="num">'+(pw!==null?formatYen(pw):'-')+'</td><td class="num '+(pPct!==null?pctCls(pPct):'')+'">'+(pPct!==null?pPct.toFixed(1)+'%':'-')+'</td><td class="num">'+(lyA!==null?formatYen(lyA):'-')+'</td><td class="num '+(sDiff!==null?(sDiff>=0?'num-good':'num-bad'):'')+'">'+(sDiff!==null?formatSignedYen(sDiff):'-')+'</td><td class="num '+pctCls(yoy)+'">'+(yoy!==null?yoy.toFixed(1)+'%':'-')+'</td><td class="num">'+(profit!==null?formatYen(profit):'-')+'</td><td class="num '+(pDiff!==null?(pDiff>=0?'num-good':'num-bad'):'')+'">'+(pDiff!==null?formatSignedYen(pDiff):'-')+'</td><td class="num">'+(margin!==null?formatPct(margin):'-')+'</td></tr>';
    };
    var html='';var prevCatKey=null;
    var catSub={qty:0,amt:0,prevAmt:0,hasPrevDay:false,lyAmt:0,hasLy:false,profitAmt:0,hasProfit:false,lyProfitAmt:0,hasLyProfit:false,name:''};
    var grand={qty:0,amt:0,prevAmt:0,hasPrevDay:false,lyAmt:0,hasLy:false,profitAmt:0,hasProfit:false,lyProfitAmt:0,hasLyProfit:false};
    var stRow=function(label,s){
      var pPct=(s.hasPrevDay&&s.prevAmt)?Math.round(s.amt/s.prevAmt*1000)/10:null;
      var yoy=(s.hasLy&&s.lyAmt&&s.amt)?Math.round(s.amt/s.lyAmt*1000)/10:null;
      var sDiff=s.hasLy?s.amt-s.lyAmt:null;var margin=s.hasProfit?grossMarginRate(s.profitAmt,s.amt):null;var pDiff=s.hasProfit&&s.hasLyProfit?s.profitAmt-s.lyProfitAmt:null;
      return '<tr class="row-cat-subtotal"><td></td><td colspan="2">'+escapeHtml(label)+'　小計</td><td class="num">'+formatNum(s.qty)+'</td><td class="num">'+formatYen(s.amt)+'</td><td class="num">'+(s.hasPrevDay?formatYen(s.prevAmt):'-')+'</td><td class="num '+(pPct!==null?pctCls(pPct):'')+'">'+(pPct!==null?pPct.toFixed(1)+'%':'-')+'</td><td class="num">'+(s.hasLy?formatYen(s.lyAmt):'-')+'</td><td class="num '+(sDiff!==null?(sDiff>=0?'num-good':'num-bad'):'')+'">'+(sDiff!==null?formatSignedYen(sDiff):'-')+'</td><td class="num '+(yoy!==null?pctCls(yoy):'')+'">'+(yoy!==null?yoy.toFixed(1)+'%':'-')+'</td><td class="num">'+(s.hasProfit?formatYen(s.profitAmt):'-')+'</td><td class="num '+(pDiff!==null?(pDiff>=0?'num-good':'num-bad'):'')+'">'+(pDiff!==null?formatSignedYen(pDiff):'-')+'</td><td class="num">'+(margin!==null?formatPct(margin):'-')+'</td></tr>';
    };
    var gtRow=function(s){
      var pPct=(s.hasPrevDay&&s.prevAmt)?Math.round(s.amt/s.prevAmt*1000)/10:null;
      var yoy=(s.hasLy&&s.lyAmt&&s.amt)?Math.round(s.amt/s.lyAmt*1000)/10:null;
      var sDiff=s.hasLy?s.amt-s.lyAmt:null;var margin=s.hasProfit?grossMarginRate(s.profitAmt,s.amt):null;var pDiff=s.hasProfit&&s.hasLyProfit?s.profitAmt-s.lyProfitAmt:null;
      return '<tr class="row-grand-total"><td colspan="3">合　計</td><td class="num">'+formatNum(s.qty)+'</td><td class="num">'+formatYen(s.amt)+'</td><td class="num">'+(s.hasPrevDay?formatYen(s.prevAmt):'-')+'</td><td class="num '+(pPct!==null?pctCls(pPct):'')+'">'+(pPct!==null?pPct.toFixed(1)+'%':'-')+'</td><td class="num">'+(s.hasLy?formatYen(s.lyAmt):'-')+'</td><td class="num '+(sDiff!==null?(sDiff>=0?'num-good':'num-bad'):'')+'">'+(sDiff!==null?formatSignedYen(sDiff):'-')+'</td><td class="num '+(yoy!==null?pctCls(yoy):'')+'">'+(yoy!==null?yoy.toFixed(1)+'%':'-')+'</td><td class="num">'+(s.hasProfit?formatYen(s.profitAmt):'-')+'</td><td class="num '+(pDiff!==null?(pDiff>=0?'num-good':'num-bad'):'')+'">'+(pDiff!==null?formatSignedYen(pDiff):'-')+'</td><td class="num">'+(margin!==null?formatPct(margin):'-')+'</td></tr>';
    };
    aggregated.forEach(function(r,i){
      var catKey=r['部門CD']+'|'+r['カテゴリCD'];
      if(prevCatKey!==null&&prevCatKey!==catKey){html+=stRow(catSub.name,catSub);catSub={qty:0,amt:0,prevAmt:0,hasPrevDay:false,lyAmt:0,hasLy:false,profitAmt:0,hasProfit:false,lyProfitAmt:0,hasLyProfit:false,name:''};}
      prevCatKey=catKey;catSub.name=r['カテゴリ名'];
      html+=dataRow(r);
      var ly=r.hasLy?r['前年同週同曜日実績']:0;var profit=r.hasProfit?Number(r['販売荒利高']||0):0;var lyProfit=r.hasLyProfit?Number(r['前年荒利高']||0):0;
      catSub.qty+=Number(r['実績数量']||0);catSub.amt+=Number(r['実績金額']||0);
      if(r.hasPrevDay){catSub.prevAmt+=Number(r.prevDayAmt||0);catSub.hasPrevDay=true;}
      if(r.hasLy){catSub.lyAmt+=ly;catSub.hasLy=true;}
      if(r.hasProfit){catSub.profitAmt+=profit;catSub.hasProfit=true;}
      if(r.hasLyProfit){catSub.lyProfitAmt+=lyProfit;catSub.hasLyProfit=true;}
      grand.qty+=Number(r['実績数量']||0);grand.amt+=Number(r['実績金額']||0);
      if(r.hasPrevDay){grand.prevAmt+=Number(r.prevDayAmt||0);grand.hasPrevDay=true;}
      if(r.hasLy){grand.lyAmt+=ly;grand.hasLy=true;}
      if(r.hasProfit){grand.profitAmt+=profit;grand.hasProfit=true;}
      if(r.hasLyProfit){grand.lyProfitAmt+=lyProfit;grand.hasLyProfit=true;}
      if(i===aggregated.length-1)html+=stRow(catSub.name,catSub);
    });
    html+=gtRow(grand);
    tbody.innerHTML=html;
  };
  rebuildZones(dates[0]);renderTable();
  dateSelect.onchange=function(){rebuildZones(dateSelect.value);renderTable();};
  zoneSelect.onchange=renderTable;bumonSelect.onchange=renderTable;
}
// -- 売上動向アラート（概略版）
function renderSalesAlerts(bumonRows, categoryRows, weatherItems) {
  var section=document.getElementById('salesAlertSection');
  var container=document.getElementById('salesAlerts');
  var countBadge=document.getElementById('salesAlertCount');
  if(!section)return;
  var dates=[...new Set(bumonRows.map(function(r){return r.date;}).filter(Boolean))].sort().reverse();
  var isAggr=function(r){return String(r.zone_code||'').padStart(4,'0')==='0000'||r.zone_name==='全社計';};
  var hasAmount=function(row,key){var n=Number(row[key]||0);return !Number.isNaN(n)&&Math.abs(n)>0;};
  // 予算だけ先に入った未確定日を重要タブの売上比較対象にしない。
  var salesDates=dates.filter(function(date){
    return bumonRows.some(function(r){return r.date===date&&!isAggr(r)&&hasAmount(r,'売上実績');})||
      (categoryRows||[]).some(function(r){return r.date===date&&!isAggr(r)&&hasAmount(r,'実績金額');});
  });
  var comparisonDates=salesDates.length?salesDates:dates;
  var currentDates,prevDates,todayD,prevD,comparison;
  if(state.dateMode==='weekly'){
    var _ww=currentWeekWindow();
    if(!_ww){section.hidden=true;return;}
    var _pw=state.weekWindows.find(function(w){return w.key===_ww.compareKey;});
    currentDates=comparisonDates.filter(function(d){return d>=_ww.startDate&&d<=_ww.endDate;});
    // 当週と同じ曜日（7日前）だけを前週の比較対象にする
    var _correspondingPrev=currentDates.map(function(d){var dt=new Date(d);dt.setDate(dt.getDate()-7);return dt.toISOString().slice(0,10);});
    prevDates=comparisonDates.filter(function(d){return _correspondingPrev.includes(d);});
    if(!currentDates.length){section.hidden=true;return;}
    todayD=_ww.endDate;prevD=_pw?_pw.endDate:'';
    comparison={label:_ww.label+' vs 前週同曜日',rateLabel:'前週同曜日比',diffLabel:'前週同曜日差'};
  }else{
    if(comparisonDates.length<2){section.hidden=true;return;}
    todayD=comparisonDates[0];
    comparison=pickComparisonDate(comparisonDates,todayD);
    prevD=comparison.date;
    if(!prevD){section.hidden=true;return;}
    currentDates=[todayD];prevDates=[prevD];
  }

  var scopedWeatherItems=weatherItems||[];
  if(state.dateMode!=='weekly'){
    var datedWeatherItems=scopedWeatherItems.filter(function(w){return w&&w.date;});
    var matchedWeatherItems=scopedWeatherItems.filter(function(w){return w&&(!w.date||w.date===todayD);});
    scopedWeatherItems=(matchedWeatherItems.length||!datedWeatherItems.length)?matchedWeatherItems:[];
  }
  var weatherByZone={};
  scopedWeatherItems.forEach(function(w){if(w.zone)weatherByZone[w.zone]=w;});
  var nationalWeather=buildNationalAvgWeather(scopedWeatherItems);
  if(nationalWeather){
    weatherByZone['全社計']=nationalWeather;
    weatherByZone['全国']=nationalWeather;
  }
  var allTempDiffs=Object.values(weatherByZone).map(function(w){var hasLW=w.temp_vs_last_week!==''&&w.temp_vs_last_week!==null&&typeof w.temp_vs_last_week!=='undefined';return hasLW?Number(w.temp_vs_last_week):null;}).filter(function(v){return v!==null&&!Number.isNaN(v);});
  var avgTempDiff=allTempDiffs.length?allTempDiffs.reduce(function(a,b){return a+b;},0)/allTempDiffs.length:null;

  // ── ゾーン別集計（bumonRows） ──
  var sumByZoneDetail=function(rows){
    var m={};
    rows.filter(function(r){return !isAggr(r);}).forEach(function(r){
      var z=r.zone_name;if(!z)return;
      var bcd=String(r['部門CD']||'').padStart(4,'0');
      var actual=Number(r['売上実績']||0);
      var budget=Number(r['売上予算']||0);
      var ly=Number(r['前年同週同曜日実績']||0);
      var profit=grossProfitFromRow(r,'売上実績');
      var lyProfit=lastYearGrossProfitFromRow(r);
      var gpBudget=Number(r['荒利予算']||0);
      if(!m[z])m[z]={total:0,mens:0,ladies:0,totalBudget:0,mensBudget:0,ladiesBudget:0,totalLy:0,mensLy:0,ladiesLy:0,totalProfit:0,mensProfit:0,ladiesProfit:0,totalLyProfit:0,mensLyProfit:0,ladiesLyProfit:0,totalGpBudget:0,mensGpBudget:0,ladiesGpBudget:0};
      m[z].total+=actual;m[z].totalBudget+=budget;m[z].totalLy+=ly;m[z].totalGpBudget+=gpBudget;
      if(!Number.isNaN(profit))m[z].totalProfit+=profit;
      if(!Number.isNaN(lyProfit))m[z].totalLyProfit+=lyProfit;
      if(bcd==='0075'){m[z].mens+=actual;m[z].mensBudget+=budget;m[z].mensLy+=ly;m[z].mensGpBudget+=gpBudget;if(!Number.isNaN(profit))m[z].mensProfit+=profit;if(!Number.isNaN(lyProfit))m[z].mensLyProfit+=lyProfit;}
      if(bcd==='0187'){m[z].ladies+=actual;m[z].ladiesBudget+=budget;m[z].ladiesLy+=ly;m[z].ladiesGpBudget+=gpBudget;if(!Number.isNaN(profit))m[z].ladiesProfit+=profit;if(!Number.isNaN(lyProfit))m[z].ladiesLyProfit+=lyProfit;}
    });
    var national=Object.values(m).reduce(function(acc,row){Object.keys(acc).forEach(function(key){acc[key]+=Number(row[key]||0);});return acc;},{total:0,mens:0,ladies:0,totalBudget:0,mensBudget:0,ladiesBudget:0,totalLy:0,mensLy:0,ladiesLy:0,totalProfit:0,mensProfit:0,ladiesProfit:0,totalLyProfit:0,mensLyProfit:0,ladiesLyProfit:0,totalGpBudget:0,mensGpBudget:0,ladiesGpBudget:0});
    if(national.total>0)m['全社計']=national;
    return m;
  };
  var zTodayD=sumByZoneDetail(bumonRows.filter(function(r){return currentDates.includes(r.date);}));
  var zPrevD=sumByZoneDetail(bumonRows.filter(function(r){return prevDates.includes(r.date);}));
  var zToday=Object.fromEntries(Object.entries(zTodayD).map(function(e){return[e[0],e[1].total];}));
  var zPrev=Object.fromEntries(Object.entries(zPrevD).map(function(e){return[e[0],e[1].total];}));

  // ── カテゴリ別集計（categoryRows） ──
  var sumCatByZoneBumon=function(rows){
    var m={};
    rows.filter(function(r){return !isAggr(r);}).forEach(function(r){
      var zone=r.zone_name;
      var bumon=String(r['部門CD']||'').padStart(4,'0');
      if(!zone||!['0075','0187'].includes(bumon))return;
      var bumonName=r['部門名']||(bumon==='0075'?'メンズレッグウェア':'レディースレッグウェア');
      var category=r['カテゴリ名']||'未設定';
      var subcategory=r['サブカテ名']||'未設定';
      var key=zone+'|||'+bumon+'|||'+category+'|||'+subcategory;
      if(!m[key])m[key]={zone:zone,bumon:bumon,bumonName:bumonName,category:category,subcategory:subcategory,today:0,prev:0,ly:0,hasLy:false,profit:0,profitLy:0,hasProfit:false,hasProfitLy:false};
      m[key].today+=Number(r['実績金額']||0);
      var profit=grossProfitFromRow(r,'実績金額');
      var profitLy=lastYearGrossProfitFromRow(r);
      if(!Number.isNaN(profit)){m[key].profit+=profit;m[key].hasProfit=true;}
      if(!Number.isNaN(profitLy)){m[key].profitLy+=profitLy;m[key].hasProfitLy=true;}
      if(r['前年同週同曜日実績']!==''&&r['前年同週同曜日実績']!==null&&typeof r['前年同週同曜日実績']!=='undefined'){m[key].ly+=Number(r['前年同週同曜日実績']||0);m[key].hasLy=true;}
    });
    return m;
  };
  var catTodayMap=sumCatByZoneBumon((categoryRows||[]).filter(function(r){return currentDates.includes(r.date);}));
  var catPrevMap=sumCatByZoneBumon((categoryRows||[]).filter(function(r){return prevDates.includes(r.date);}));
  Object.keys(catPrevMap).forEach(function(key){
    if(!catTodayMap[key]){catTodayMap[key]=Object.assign({},catPrevMap[key],{today:0,ly:0,hasLy:false,profit:0,profitLy:0,hasProfit:false,hasProfitLy:false});}
    catTodayMap[key].prev=catPrevMap[key].today||0;
  });

  // ── findMainCategory（ゾーン×部門の主力カテゴリ） ──
  var findMainCategory=function(zone,bumon,direction){
    var rows=Object.values(catTodayMap)
      .filter(function(r){return (zone==='全社計'||r.zone===zone)&&r.bumon===bumon;})
      .map(function(r){
        var diff=Number(r.today||0)-Number(r.prev||0);
        var pct=r.prev?diff/r.prev*100:null;
        var grossRate=r.hasProfit?grossMarginRate(r.profit,r.today):NaN;
        var profitYoy=r.hasProfitLy&&r.profitLy?r.profit/r.profitLy*100:null;
        return Object.assign({},r,{diff:diff,pct:pct,grossRate:grossRate,profitYoy:profitYoy,impactAmount:Math.abs(diff)});
      }).filter(function(r){return Math.abs(r.diff)>0;});
    if(!rows.length)return null;
    var directional=rows.filter(function(r){return direction==='up'?r.diff>0:r.diff<0;});
    var candidates=directional.length?directional:rows;
    return candidates.sort(function(a,b){return b.impactAmount-a.impactAmount;})[0];
  };

  // ── findSubcatZoneMoves（サブカテ×ゾーン分布） ──
  var findSubcatZoneMoves=function(bumon,category,subcategory,direction,limit){
    var grouped={};
    Object.values(catTodayMap).filter(function(r){return r.bumon===bumon&&r.category===category&&r.subcategory===subcategory;}).forEach(function(r){
      var key=r.zone;
      if(!grouped[key])grouped[key]={zone:r.zone,today:0,prev:0,ly:0,hasLy:false,profit:0,profitLy:0,hasProfit:false,hasProfitLy:false};
      grouped[key].today+=Number(r.today||0);grouped[key].prev+=Number(r.prev||0);
      if(r.hasProfit){grouped[key].profit+=Number(r.profit||0);grouped[key].hasProfit=true;}
      if(r.hasProfitLy){grouped[key].profitLy+=Number(r.profitLy||0);grouped[key].hasProfitLy=true;}
      if(r.hasLy){grouped[key].ly+=Number(r.ly||0);grouped[key].hasLy=true;}
    });
    return Object.values(grouped).map(function(r){
      var diff=Number(r.today||0)-Number(r.prev||0);
      var pct=r.prev?diff/r.prev*100:null;
      var yoy=r.hasLy&&r.ly?r.today/r.ly*100:null;
      var grossRate=r.hasProfit?grossMarginRate(r.profit,r.today):NaN;
      var profitYoy=r.hasProfitLy&&r.profitLy?r.profit/r.profitLy*100:null;
      return Object.assign({},r,{diff:diff,pct:pct,yoy:yoy,grossRate:grossRate,profitYoy:profitYoy,impactAmount:Math.abs(diff)});
    }).filter(function(r){return direction==='up'?r.diff>0:r.diff<0;}).sort(function(a,b){return b.impactAmount-a.impactAmount;}).slice(0,limit);
  };

  // ── buildSubcatChanges（サブカテゴリ別変動） ──
  var buildSubcatChanges=function(){
    var grouped={};
    Object.values(catTodayMap).forEach(function(r){
      var key=r.bumon+'|||'+(r.bumonName||r.bumon)+'|||'+r.category+'|||'+r.subcategory;
      if(!grouped[key])grouped[key]={bumon:r.bumon,bumonName:r.bumonName,category:r.category,subcategory:r.subcategory,todayAmt:0,prevAmt:0,lyAmt:0,hasLy:false,profitAmt:0,profitLyAmt:0,hasProfit:false,hasProfitLy:false};
      grouped[key].todayAmt+=Number(r.today||0);grouped[key].prevAmt+=Number(r.prev||0);
      if(r.hasLy){grouped[key].lyAmt+=Number(r.ly||0);grouped[key].hasLy=true;}
      if(r.hasProfit){grouped[key].profitAmt+=Number(r.profit||0);grouped[key].hasProfit=true;}
      if(r.hasProfitLy){grouped[key].profitLyAmt+=Number(r.profitLy||0);grouped[key].hasProfitLy=true;}
    });
    return Object.values(grouped).filter(function(r){return r.prevAmt>=1000&&r.todayAmt>=100;}).map(function(r){
      var diff=Number(r.todayAmt||0)-Number(r.prevAmt||0);
      var pct=r.prevAmt?diff/r.prevAmt*100:null;
      var yoy=r.hasLy&&r.lyAmt?r.todayAmt/r.lyAmt*100:null;
      var grossRate=r.hasProfit?grossMarginRate(r.profitAmt,r.todayAmt):NaN;
      var profitYoy=r.hasProfitLy&&r.profitLyAmt?r.profitAmt/r.profitLyAmt*100:null;
      return Object.assign({},r,{diff:diff,pct:pct,yoy:yoy,grossRate:grossRate,profitYoy:profitYoy,impactAmount:Math.abs(diff),
        goodZones:findSubcatZoneMoves(r.bumon,r.category,r.subcategory,'up',3),
        badZones:findSubcatZoneMoves(r.bumon,r.category,r.subcategory,'down',3)});
    }).filter(function(r){return Math.abs(r.diff)>0;});
  };

  // ── judgeTwoAxis ──
  var judgeTwoAxis=function(dayPct,yoy){
    if(yoy===null||Number.isNaN(yoy))return{label:dayPct>=0?comparison.rateLabel+'回復':comparison.rateLabel+'下落',className:dayPct>=0?'num-good':'num-bad'};
    if(dayPct>=0&&yoy>=100)return{label:'好調継続',className:'num-good'};
    if(dayPct>=0&&yoy<100)return{label:comparison.rateLabel+'回復・前年差不足',className:'num-warn'};
    if(dayPct<0&&yoy>=100)return{label:comparison.rateLabel+'反動・前年差は維持',className:'num-warn'};
    return{label:'注意',className:'num-bad'};
  };

  var alerts=[];

  // ── ゾーンアラート ──
  var allZoneChanges=Object.keys(zTodayD).filter(function(z){
    var td=zTodayD[z]||{};
    return (td.totalBudget||0)>0&&(td.total||0)>0;
  }).map(function(z){
    var td=zTodayD[z]||{};var pd=zPrevD[z]||{};
    var pct=zPrev[z]?(zToday[z]-zPrev[z])/zPrev[z]*100:null;
    var budgetRatio=td.totalBudget?td.total/td.totalBudget*100:null;
    var yoy=td.totalLy?td.total/td.totalLy*100:null;
    var weather=weatherByZone[z]||null;
    var w=weather||{};
    var hasLW=w.temp_vs_last_week!==''&&w.temp_vs_last_week!==null&&typeof w.temp_vs_last_week!=='undefined';
    var tempDiff=Number(hasLW?w.temp_vs_last_week:(w.temp_vs_yesterday||0));
    var tempCompareLabel=hasLW?'前週差':'前日差';
    var direction=budgetRatio!==null&&budgetRatio>=100?'up':'down';
    return{zone:z,today:zToday[z],prev:zPrev[z],pct:pct,tempDiff:tempDiff,tempCompareLabel:tempCompareLabel,weather:weather,
      todayMens:td.mens||0,prevMens:pd.mens||0,budgetMens:td.mensBudget||0,lyMens:td.mensLy||0,profitMens:td.mensProfit||0,lyProfitMens:td.mensLyProfit||0,
      todayLadies:td.ladies||0,prevLadies:pd.ladies||0,budgetLadies:td.ladiesBudget||0,lyLadies:td.ladiesLy||0,profitLadies:td.ladiesProfit||0,lyProfitLadies:td.ladiesLyProfit||0,
      budgetTotal:td.totalBudget||0,lyTotal:td.totalLy||0,profitTotal:td.totalProfit||0,lyProfitTotal:td.totalLyProfit||0,
      yoy:yoy,budgetRatio:budgetRatio,budgetGapTotal:(td.total||0)-(td.totalBudget||0),judgment:judgeTwoAxis(pct===null?0:pct,yoy),
      grossRateTotal:grossMarginRate(td.totalProfit||0,td.total||0),profitYoy:td.totalLyProfit?td.totalProfit/td.totalLyProfit*100:null,
      gpBudgetRatioTotal:td.totalGpBudget?(td.totalProfit||0)/td.totalGpBudget*100:null,
      grossRateMens:grossMarginRate(td.mensProfit||0,td.mens||0),profitYoyMens:td.mensLyProfit?td.mensProfit/td.mensLyProfit*100:null,
      mensYoy:td.mensLy?td.mens/td.mensLy*100:null,mensBudgetRatio:td.mensBudget?td.mens/td.mensBudget*100:null,
      mensGpBudgetRatio:td.mensGpBudget?(td.mensProfit||0)/td.mensGpBudget*100:null,
      grossRateLadies:grossMarginRate(td.ladiesProfit||0,td.ladies||0),profitYoyLadies:td.ladiesLyProfit?td.ladiesProfit/td.ladiesLyProfit*100:null,
      ladiesYoy:td.ladiesLy?td.ladies/td.ladiesLy*100:null,ladiesBudgetRatio:td.ladiesBudget?td.ladies/td.ladiesBudget*100:null,
      ladiesGpBudgetRatio:td.ladiesGpBudget?(td.ladiesProfit||0)/td.ladiesGpBudget*100:null,
      mainMens:findMainCategory(z,'0075',direction),mainLadies:findMainCategory(z,'0187',direction)};
  }).sort(function(a,b){return b.budgetRatio-a.budgetRatio;});

  var selectedBudgetZones={};
  var zoneUpDown=[];
  var addBudgetZone=function(z,rankType){
    if(!z||selectedBudgetZones[z.zone])return;
    selectedBudgetZones[z.zone]=true;
    zoneUpDown.push(Object.assign({},z,{budgetRankType:rankType}));
  };
  var nationalChange=allZoneChanges.find(function(z){return z.zone==='全社計';});
  var budgetZoneChanges=allZoneChanges.filter(function(z){return z.zone!=='全社計';});
  addBudgetZone(nationalChange,'全国');
  budgetZoneChanges.slice().sort(function(a,b){return b.budgetRatio-a.budgetRatio;}).slice(0,3).forEach(function(z){addBudgetZone(z,'予算比上位');});
  budgetZoneChanges.slice().sort(function(a,b){return a.budgetRatio-b.budgetRatio;}).slice(0,3).forEach(function(z){addBudgetZone(z,'予算比下位');});
  zoneUpDown.forEach(function(z){
    var isUp=Number(z.budgetRatio)>=100;var tempNote='';
    if(Math.abs(z.tempDiff)>=2){
      var tl='平均気温'+z.tempCompareLabel;
      if(isUp&&z.tempDiff>=2)tempNote=tl+'+'+z.tempDiff.toFixed(1)+'℃ → 気温寄与の可能性';
      else if(isUp&&z.tempDiff<=-2)tempNote=tl+z.tempDiff.toFixed(1)+'℃ → 気温以外の要因で伸長';
      else if(!isUp&&z.tempDiff<=-2)tempNote=tl+z.tempDiff.toFixed(1)+'℃ → 気温寄与の可能性';
      else if(!isUp&&z.tempDiff>=2)tempNote=tl+'+'+z.tempDiff.toFixed(1)+'℃にもかかわらず下落';
    }
    alerts.push({type:isUp?'zone_budget_good':'zone_budget_bad',zone:z.zone,pct:z.pct,today:z.today,prev:z.prev,tempNote:tempNote,todayD:todayD,prevD:prevD,
      compareLabel:comparison.label,compareRateLabel:comparison.rateLabel,compareDiffLabel:comparison.diffLabel,
      weather:z.weather,
      todayMens:z.todayMens,prevMens:z.prevMens,budgetMens:z.budgetMens,lyMens:z.lyMens,mensYoy:z.mensYoy,mensBudgetRatio:z.mensBudgetRatio,
      profitMens:z.profitMens,lyProfitMens:z.lyProfitMens,grossRateMens:z.grossRateMens,profitYoyMens:z.profitYoyMens,mensGpBudgetRatio:z.mensGpBudgetRatio,
      todayLadies:z.todayLadies,prevLadies:z.prevLadies,budgetLadies:z.budgetLadies,lyLadies:z.lyLadies,ladiesYoy:z.ladiesYoy,ladiesBudgetRatio:z.ladiesBudgetRatio,
      profitLadies:z.profitLadies,lyProfitLadies:z.lyProfitLadies,grossRateLadies:z.grossRateLadies,profitYoyLadies:z.profitYoyLadies,ladiesGpBudgetRatio:z.ladiesGpBudgetRatio,
      budgetTotal:z.budgetTotal,budgetGapTotal:z.budgetGapTotal,lyTotal:z.lyTotal,yoy:z.yoy,budgetRatio:z.budgetRatio,budgetRankType:z.budgetRankType,judgment:z.judgment,
      profitTotal:z.profitTotal,lyProfitTotal:z.lyProfitTotal,grossRateTotal:z.grossRateTotal,profitYoy:z.profitYoy,gpBudgetRatioTotal:z.gpBudgetRatioTotal,
      mainMens:z.mainMens,mainLadies:z.mainLadies});
  });

  // ── サブカテアラート ──
  var subcatChanges=buildSubcatChanges();
  var subcatUpDown=[].concat(
    subcatChanges.filter(function(s){return s.diff>0;}).sort(function(a,b){return b.impactAmount-a.impactAmount;}).slice(0,3),
    subcatChanges.filter(function(s){return s.diff<0;}).sort(function(a,b){return b.impactAmount-a.impactAmount;}).slice(0,3)
  );
  subcatUpDown.forEach(function(s){
    alerts.push({type:s.diff>0?'subcat_up':'subcat_down',
      部門名:s.bumonName,カテゴリ名:s.category,サブカテ名:s.subcategory,
      pct:s.pct,diff:s.diff,todayAmt:s.todayAmt,prevAmt:s.prevAmt,
      lyAmt:s.lyAmt,hasLy:s.hasLy,yoy:s.yoy,profitAmt:s.profitAmt,profitLyAmt:s.profitLyAmt,
      grossRate:s.grossRate,profitYoy:s.profitYoy,goodZones:s.goodZones,badZones:s.badZones,avgTempDiff:avgTempDiff,
      todayD:todayD,prevD:prevD,compareLabel:comparison.label,compareRateLabel:comparison.rateLabel,compareDiffLabel:comparison.diffLabel});
  });

  if(!alerts.length){section.hidden=true;return;}
  section.hidden=false;
  countBadge.textContent=alerts.length+'件';

  // ── HTML ヘルパー ──
  var fY=function(v){return(v===null||v===undefined||Number.isNaN(Number(v)))?'-':Math.round(Number(v)).toLocaleString('ja-JP')+'円';};
  var fR=function(v){return(v===null||Number.isNaN(Number(v)))?'-':Number(v).toFixed(1)+'%';};
  var fD=function(v){var n=Number(v||0);return(n>0?'+':'')+n.toLocaleString('ja-JP')+'円';};
  var rCls=function(v){return(v===null||Number.isNaN(Number(v)))?'':Number(v)>=100?'num-good':Number(v)>=95?'num-warn':'num-bad';};
  var pCls2=function(t,p){return!p?'':t>=p?'num-good':'num-bad';};
  var grossLine=function(profit,margin,pYoy){return'<div class="sales-gross-line">荒利 '+fY(profit)+' / 粗利率 '+fR(margin)+' / 荒利前年比 <span class="'+rCls(pYoy)+'">'+fR(pYoy)+'</span></div>';};
  var fmtMain=function(item){
    if(!item)return'<span class="sales-main-empty">明細なし</span>';
    var pct=item.pct===null||item.pct===undefined?'-':(item.pct>0?'+':'')+item.pct.toFixed(1)+'%';
    var cls=item.diff>=0?'num-good':'num-bad';
    return'<span class="sales-main-name">'+escapeHtml(item.category)+' / '+escapeHtml(item.subcategory)+'</span>'+
      '<span class="'+cls+'">金額影響 '+escapeHtml(fD(item.diff))+'</span>'+
      '<span class="sales-main-amount">'+escapeHtml(pct)+'</span>'+
      '<span class="sales-main-amount">荒利 '+escapeHtml(fY(item.profit))+'</span>'+
      '<span class="'+rCls(item.profitYoy)+'">荒利前年比 '+escapeHtml(fR(item.profitYoy))+'</span>';
  };
  var fmtSubcatRow=function(item){
    var pct=item.pct===null||item.pct===undefined?'-':(item.pct>0?'+':'')+item.pct.toFixed(1)+'%';
    var cls=item.diff>=0?'num-good':'num-bad';
    return'<li><span class="sales-subcat-name">'+escapeHtml(item.zone)+'</span>'+
      '<span class="sales-main-amount">実績 '+escapeHtml(fY(item.today))+'</span>'+
      '<span class="'+cls+'">'+escapeHtml(fD(item.diff))+'</span>'+
      '<span class="sales-main-amount">'+escapeHtml(pct)+'</span>'+
      '<span class="sales-zone-yoy '+rCls(item.yoy)+'">前年比 '+escapeHtml(fR(item.yoy))+'</span>'+
      '<span class="sales-zone-yoy '+rCls(item.profitYoy)+'">荒利前年比 '+escapeHtml(fR(item.profitYoy))+'</span></li>';
  };
  var fmtSubcatList=function(items){
    if(!items||!items.length)return'<div class="sales-main-empty">該当なし</div>';
    return'<ol class="sales-subcat-list">'+items.map(fmtSubcatRow).join('')+'</ol>';
  };

  container.innerHTML=alerts.map(function(a){
    var isUp=a.type==='zone_up'||a.type==='subcat_up';
    var isBudgetZone=a.type==='zone_budget_good'||a.type==='zone_budget_bad';
    var isZone=isBudgetZone||a.type==='zone_up'||a.type==='zone_down';
    var cls=isZone?rCls(a.budgetRatio):(isUp?'num-good':'num-bad');
    var arrow=(isBudgetZone?a.type==='zone_budget_good':isUp)?'▲':'▼';
    var pctStr=(a.pct===null||a.pct===undefined||Number.isNaN(Number(a.pct)))?'-':(a.pct>0?'+':'')+a.pct.toFixed(1)+'%';
    var yoyStr=isZone?fR(a.yoy):'-';
    var budgetStr=isZone?fR(a.budgetRatio):'-';
    var gpBudgetStr=isZone?fR(a.gpBudgetRatioTotal):'-';
    var budgetGapStr=isZone?fD(a.budgetGapTotal):'';
    var budgetGapCls=isZone&&Number(a.budgetGapTotal)>=0?'num-good':'num-bad';
    var prevAmt=isZone?a.prev:a.prevAmt;
    var todAmt=isZone?a.today:a.todayAmt;
    var title=isZone
      ?escapeHtml(a.zone)+'：<span class="'+cls+'">予算比 '+budgetStr+'</span> <span class="'+rCls(a.gpBudgetRatioTotal)+'">荒利予算比 '+gpBudgetStr+'</span> <span class="'+budgetGapCls+'">予算差 '+escapeHtml(budgetGapStr)+'</span> <span class="'+rCls(a.yoy)+'">前年比 '+yoyStr+'</span>'
      :escapeHtml(a.サブカテ名)+'：<span class="'+cls+'">'+escapeHtml(a.compareRateLabel)+' '+pctStr+'</span> <span class="'+cls+'">金額影響 '+escapeHtml(fD(a.diff))+'</span>';
    var label=isZone
      ?escapeHtml(a.zone)+'　'+escapeHtml(a.budgetRankType||'ゾーン売上')
      :escapeHtml(a.部門名)+' / '+escapeHtml(a.カテゴリ名)+'（全社計）';
    var judgment=isZone?'<div class="sales-judgment '+escapeAttribute(cls||'')+'">'+escapeHtml(a.budgetRankType||'ゾーン')+' / '+escapeHtml(a.compareRateLabel)+' '+escapeHtml(pctStr)+'</div>':'';
    var weatherHtml=isZone&&a.weather?renderSalesAlertWeatherCompact(a.weather):'';
    var weatherBlock=weatherHtml?'<div class="sales-alert-weather">'+weatherHtml+'</div>':'';
    var bumonBreakdown=isZone?'<div class="sales-alert-breakdown">'+
      '<div class="sales-alert-bumon"><div class="sales-alert-bumon-head"><span>メンズ</span><span>'+
        '<span class="'+pCls2(a.todayMens,a.prevMens)+'">'+escapeHtml(a.compareLabel)+' '+fR(a.prevMens?(a.todayMens-a.prevMens)/a.prevMens*100:null)+'</span> '+
        '<span class="'+rCls(a.mensYoy)+'">前年 '+fR(a.mensYoy)+'</span> '+
        '<span class="'+rCls(a.mensBudgetRatio)+'">予算 '+fR(a.mensBudgetRatio)+'</span> '+
        '<span class="'+rCls(a.mensGpBudgetRatio)+'">荒利予算 '+fR(a.mensGpBudgetRatio)+'</span> '+
        '<span class="sales-alert-amount">'+fY(a.prevMens)+' → '+fY(a.todayMens)+'</span>'+
      '</span></div>'+
      '<div class="sales-alert-main">'+fmtMain(a.mainMens)+'</div>'+
      grossLine(a.profitMens,a.grossRateMens,a.profitYoyMens)+'</div>'+
      '<div class="sales-alert-bumon"><div class="sales-alert-bumon-head"><span>レディース</span><span>'+
        '<span class="'+pCls2(a.todayLadies,a.prevLadies)+'">'+escapeHtml(a.compareLabel)+' '+fR(a.prevLadies?(a.todayLadies-a.prevLadies)/a.prevLadies*100:null)+'</span> '+
        '<span class="'+rCls(a.ladiesYoy)+'">前年 '+fR(a.ladiesYoy)+'</span> '+
        '<span class="'+rCls(a.ladiesBudgetRatio)+'">予算 '+fR(a.ladiesBudgetRatio)+'</span> '+
        '<span class="'+rCls(a.ladiesGpBudgetRatio)+'">荒利予算 '+fR(a.ladiesGpBudgetRatio)+'</span> '+
        '<span class="sales-alert-amount">'+fY(a.prevLadies)+' → '+fY(a.todayLadies)+'</span>'+
      '</span></div>'+
      '<div class="sales-alert-main">'+fmtMain(a.mainLadies)+'</div>'+
      grossLine(a.profitLadies,a.grossRateLadies,a.profitYoyLadies)+'</div></div>':'';
    var subcatMetrics='';var subcatTempBlock='';var subcatZoneBlock='';
    if(!isZone){
      var mb=function(lbl,val,cls2){return'<div class="sa-mb"><div class="sa-mb-l">'+escapeHtml(lbl)+'</div><div class="sa-mb-v '+(cls2||'')+'">'+val+'</div></div>';};
      var scPct=a.pct===null?'-':(a.pct>=0?'+':'')+a.pct.toFixed(1)+'%';
      var yoyDiff=a.hasLy?Number(a.todayAmt||0)-Number(a.lyAmt||0):null;
      var yoyDiffCls=yoyDiff===null?'':(yoyDiff>=0?'num-good':'num-bad');
      subcatMetrics='<div class="sa-metrics">'+
        mb('実績',fY(a.todayAmt))+
        mb('前週同曜日差',fD(a.diff),isUp?'num-good':'num-bad')+
        mb('前週同曜日比',scPct,isUp?'num-good':'num-bad')+
        mb('前年同週同曜日',a.hasLy?fY(a.lyAmt):'-')+
        mb('売上昨対差',yoyDiff===null?'-':fD(yoyDiff),yoyDiffCls)+
        mb('前年比',fR(a.yoy),rCls(a.yoy))+
        mb('荒利',fY(a.profitAmt))+
        mb('粗利率',fR(a.grossRate))+
        mb('荒利前年比',fR(a.profitYoy),rCls(a.profitYoy))+
        '</div>';
      if(a.avgTempDiff!==null&&!Number.isNaN(Number(a.avgTempDiff))){
        var td=Number(a.avgTempDiff);
        var tempLbl=Math.abs(td)<2?'気温影響薄い':isUp&&td>=2?'気温影響あり':isUp&&td<=-2?'気温影響逆':!isUp&&td<=-2?'気温影響あり':'気温影響逆';
        var tempNote2=Math.abs(td)<2?'→ 気温以外の要因も確認':isUp&&td>=2?'→ 気温寄与の可能性':isUp&&td<=-2?'→ 気温以外の要因で伸長':!isUp&&td<=-2?'→ 気温寄与の可能性':'→ 気温+にもかかわらず下落';
        subcatTempBlock='<div class="sa-temp"><strong>'+escapeHtml(tempLbl)+'</strong>'+
          '<div class="sa-temp-detail">主要ゾーン気温 前週差 '+(td>=0?'+':'')+td.toFixed(1)+'℃'+
          ' / '+escapeHtml(a.compareRateLabel)+' '+scPct+
          ' / 前年比 '+fR(a.yoy)+
          ' / 荒利前年比 '+fR(a.profitYoy)+
          ' '+escapeHtml(tempNote2)+'</div></div>';
      }
      subcatZoneBlock='<div class="sales-zone-subcats">'+
        '<div class="sales-zone-subcat-group"><div class="sales-zone-subcat-title num-good">伸びゾーン 上位3</div>'+fmtSubcatList(a.goodZones)+'</div>'+
        '<div class="sales-zone-subcat-group"><div class="sales-zone-subcat-title num-bad">落ちゾーン 上位3</div>'+fmtSubcatList(a.badZones)+'</div></div>';
    }
    return'<article class="card">'+
      '<div class="meta"><span>'+escapeHtml(a.todayD)+'</span><span>'+(isZone?'ゾーン':'サブカテゴリ')+'</span><span class="'+cls+'" style="font-weight:800">'+arrow+' '+label+'</span></div>'+
      '<div class="card-title">'+title+'</div>'+
      (isZone?'<div style="font-size:13px;color:var(--muted)">合計　'+escapeHtml(a.compareLabel)+'（'+escapeHtml(a.prevD)+'）'+fY(a.prev)+' → 対象日 '+fY(a.today)+' / 予算 '+fY(a.budgetTotal)+' / 予算差 '+escapeHtml(budgetGapStr)+' / 前年同週 '+fY(a.lyTotal)+'</div>'+grossLine(a.profitTotal,a.grossRateTotal,a.profitYoy)+judgment+weatherBlock+bumonBreakdown+(a.tempNote?'<div class="action" style="font-size:12px;margin-top:6px">🌡️ '+escapeHtml(a.tempNote)+'</div>':''):subcatMetrics+subcatTempBlock+subcatZoneBlock)+
      '</article>';
  }).join('');
}

// -- ニュース・タグ（再定義不要 - 先に追加済み）
// renderNews / renderReviewNews / renderTags は既にファイルに含まれています
// -- 商品分析タブ
function renderProductAnalysis(allRows, dates, weatherTrend, productWeeks, comparisonDates) {
  var dateSelect=document.getElementById('productDateSelect');
  var bumonSelect=document.getElementById('productBumonSelect');
  var categorySelect=document.getElementById('productCategorySelect');
  var sortSelect=document.getElementById('productSortSelect');
  var periodMode=document.getElementById('productPeriodMode');
  var weekTabs=document.getElementById('productWeekTabs');
  var summary=document.getElementById('productSummaryCards');
  var cards=document.getElementById('productAnalysisCards');
  var tbody=document.getElementById('productAnalysisTableBody');
  var countBadge=document.getElementById('productAnalysisCount');
  if(!dateSelect||!summary||!cards||!tbody)return;
  var allDataDates=([].concat(comparisonDates&&comparisonDates.length?comparisonDates:[...new Set((allRows||[]).map(function(r){return r.date;}).filter(Boolean))])).sort().reverse();
  var dailyDates=(dates&&dates.length?dates:allDataDates.slice(0,1)).slice();
  var _toMonday=function(ds){var d=new Date(ds+'T00:00:00');var day=d.getDay();var diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  var _addDays=function(ds,n){var d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  var buildWeekWindowsFromDates=function(dates){
    if(!dates.length)return[];
    var mondaySet={};
    dates.forEach(function(d){var mon=_toMonday(d);if(!mondaySet[mon])mondaySet[mon]=true;});
    return Object.keys(mondaySet).sort().reverse().slice(0,8).map(function(mon){
      var endDate=_addDays(mon,6);
      var prevMon=_addDays(mon,-7);
      var prevEnd=_addDays(prevMon,6);
      var parts=mon.split('-');
      var label=parseInt(parts[1])+'月'+parseInt(parts[2])+'日週';
      return{key:mon,label:label,startDate:mon,endDate:endDate,compareKey:prevMon,compareStartDate:prevMon,compareEndDate:prevEnd};
    });
  };
  var weekWindows=(productWeeks&&productWeeks.length?productWeeks.slice(0,8):buildWeekWindowsFromDates(allDataDates));
  if(!allRows.length&&!dailyDates.length){
    dateSelect.innerHTML='<option>データなし</option>';categorySelect.innerHTML='<option value="">全カテゴリ</option>';countBadge.textContent='0件';
    summary.innerHTML='';cards.innerHTML='<div class="empty">商品実績データはまだありません。</div>';tbody.innerHTML='<tr><td colspan="16">商品実績データはまだありません。</td></tr>';return;
  }
  var viewMode='daily';
  var selectedWeekKey=weekWindows[0]?weekWindows[0].key:'';
  var activeRows=allRows;
  var isAggRow=function(r){return r.zone_name==='全社計'||String(r.zone_code||'').padStart(4,'0')==='0000';};
  var bumonCode=function(r){return String(r['部門CD']||'').padStart(4,'0');};
  var productKey=function(r){return[bumonCode(r),r['部門名']||'',r['カテゴリCD']||'',r['カテゴリ名']||'',r['サブカテCD']||'',r['サブカテ名']||''].join('|');};
  var currentDate=dailyDates[0]||'';
  dateSelect.innerHTML=dailyDates.map(function(d){return'<option value="'+escapeAttribute(d)+'">'+escapeHtml(d)+'</option>';}).join('');
  dateSelect.value=currentDate;
  var getMondayStr=function(ds){var d=new Date(ds+'T00:00:00');var day=d.getDay();var diff=day===0?-6:1-day;d.setDate(d.getDate()+diff);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  var addDaysToStr=function(ds,n){var d=new Date(ds+'T00:00:00');d.setDate(d.getDate()+n);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');};
  var currentWeekWindow=function(){return weekWindows.find(function(w){return w.key===selectedWeekKey;})||weekWindows[0]||null;};
  var activeDateKey=function(){var w=currentWeekWindow();return viewMode==='weekly'&&w?w.key:dateSelect.value;};
  var compForActive=function(){
    var w=currentWeekWindow();
    if(viewMode==='weekly'&&w)return{date:w.compareKey,displayDate:w.compareStartDate+'～'+w.compareEndDate,label:'前週累計',rateLabel:'前週累計比',diffLabel:'前週累計差'};
    var todayDate=dateSelect.value;
    var prevDate7=shiftDateString(todayDate,-7);
    if(allDataDates.indexOf(prevDate7)>=0){
      return{date:prevDate7,label:'前週同曜日',rateLabel:'前週同曜日比',diffLabel:'前週同曜日差'};
    }
    return pickComparisonDate(allDataDates,todayDate);
  };
  var aggregatePeriod=function(startDate,endDate,dateKey){
    var map={};
    allRows.filter(function(r){return r.date>=startDate&&r.date<=endDate;}).forEach(function(r){
      var key=[String(r.zone_code||''),r.zone_name||'',productKey(r)].join('|');
      if(!map[key])map[key]=Object.assign({},r,{date:dateKey,'実績数量':0,'実績金額':0,'前年同週同曜日数量':0,'前年同週同曜日実績':0,'販売荒利高':0,'前年荒利高':0,hasLy:false,hasProfit:false,hasLyProfit:false});
      map[key]['実績数量']+=Number(r['実績数量']||0);map[key]['実績金額']+=Number(r['実績金額']||0);
      if(r['前年同週同曜日実績']!==''&&r['前年同週同曜日実績']!==null){map[key]['前年同週同曜日実績']+=Number(r['前年同週同曜日実績']||0);map[key].hasLy=true;}
      var profit=grossProfitFromRow(r,'実績金額');var lyProfit=lastYearGrossProfitFromRow(r);
      if(!Number.isNaN(profit)){map[key]['販売荒利高']+=profit;map[key].hasProfit=true;}
      if(!Number.isNaN(lyProfit)){map[key]['前年荒利高']+=lyProfit;map[key].hasLyProfit=true;}
    });
    return Object.values(map);
  };
  var buildWeeklyRows=function(){var w=currentWeekWindow();if(!w)return allRows;return aggregatePeriod(w.startDate,w.endDate,w.key).concat(aggregatePeriod(w.compareStartDate,w.compareEndDate,w.compareKey));};
  var selectedBumon=function(){return bumonSelect.value||'';};
  var selectedCategory=function(){return categorySelect.value||'';};
  var matchesFilters=function(r){if(selectedBumon()&&bumonCode(r)!==selectedBumon())return false;if(selectedCategory()){var ck=r['カテゴリCD']+'|'+r['カテゴリ名'];if(ck!==selectedCategory())return false;}return true;};
  var pctText=function(v,signed){if(v===null||Number.isNaN(Number(v)))return'-';var n=Number(v);var sign=signed&&n>0?'+':'';return sign+n.toFixed(1)+'%';};
  var pctClass=function(v,goodAt100){if(v===null||Number.isNaN(Number(v)))return'';var n=Number(v);return goodAt100===false?(n>=0?'num-good':'num-bad'):(n>=100?'num-good':n>=95?'num-warn':'num-bad');};
  var rebuildCategoryOptions=function(){
    var prev=categorySelect.value||'';
    activeRows=viewMode==='weekly'?buildWeeklyRows():allRows;
    var source=activeRows.filter(function(r){return r.date===activeDateKey()&&!isAggRow(r);});
    var map={};
    source.forEach(function(r){if(selectedBumon()&&bumonCode(r)!==selectedBumon())return;map[r['カテゴリCD']+'|'+r['カテゴリ名']]=r['カテゴリ名']||'未設定';});
    categorySelect.innerHTML='<option value="">全カテゴリ</option>'+Object.keys(map).sort(function(a,b){return map[a].localeCompare(map[b],'ja');}).map(function(k){return'<option value="'+escapeAttribute(k)+'">'+escapeHtml(map[k])+'</option>';}).join('');
    if(Object.prototype.hasOwnProperty.call(map,prev))categorySelect.value=prev;
  };
  var aggregateProducts=function(sourceRows){
    var map={};
    sourceRows.filter(matchesFilters).forEach(function(r){
      var key=productKey(r);
      if(!map[key])map[key]={key:key,bumonCode:bumonCode(r),bumonName:r['部門名']||'',categoryName:r['カテゴリ名']||'',subcategoryName:r['サブカテ名']||'',qty:0,amount:0,profit:0,lyQty:0,lyAmount:0,lyProfit:0,hasLy:false,hasProfit:false,hasLyProfit:false};
      map[key].qty+=Number(r['実績数量']||0);map[key].amount+=Number(r['実績金額']||0);
      var profit=grossProfitFromRow(r,'実績金額');var lyProfit=lastYearGrossProfitFromRow(r);
      if(!Number.isNaN(profit)){map[key].profit+=profit;map[key].hasProfit=true;}
      if(!Number.isNaN(lyProfit)){map[key].lyProfit+=lyProfit;map[key].hasLyProfit=true;}
      if(r['前年同週同曜日実績']!==''&&r['前年同週同曜日実績']!==null){map[key].lyAmount+=Number(r['前年同週同曜日実績']||0);map[key].hasLy=true;}
    });
    return map;
  };
  var rowsForNational=function(date){var agg=activeRows.filter(function(r){return r.date===date&&isAggRow(r);});return agg.length?agg:activeRows.filter(function(r){return r.date===date&&!isAggRow(r);});};
  var buildRows=function(){
    var date=activeDateKey();var comparison=compForActive();var prevDate=comparison.date;
    var todayMap=aggregateProducts(rowsForNational(date));
    var prevMap=prevDate?aggregateProducts(rowsForNational(prevDate)):{};
    return Object.values(todayMap).map(function(item){
      var prev=prevMap[item.key]||{};var prevAmount=Number(prev.amount||0);
      var dayDiff=Number(item.amount||0)-prevAmount;var dayPct=prevAmount?dayDiff/prevAmount*100:null;
      var yoy=item.hasLy&&item.lyAmount?item.amount/item.lyAmount*100:null;
      var grossRate=item.hasProfit?grossMarginRate(item.profit,item.amount):NaN;
      var profitYoy=item.hasLyProfit&&item.lyProfit?item.profit/item.lyProfit*100:null;
      return Object.assign({},item,{prevAmount:prevAmount,prevDate:comparison.displayDate||prevDate,targetDate:date,dayDiff:dayDiff,dayPct:dayPct,yoy:yoy,grossRate:grossRate,profitYoy:profitYoy,impactAmount:Math.abs(dayDiff),compareLabel:comparison.label,compareRateLabel:comparison.rateLabel,compareDiffLabel:comparison.diffLabel,goodZones:[],badZones:[]});
    }).filter(function(row){return row.amount||row.prevAmount;});
  };
  var renderView=function(){
    activeRows=viewMode==='weekly'?buildWeeklyRows():allRows;
    var rows=buildRows();var sortMode=sortSelect.value||'impact';
    var sorted=[].concat(rows).sort(function(a,b){if(sortMode==='up')return b.dayDiff-a.dayDiff;if(sortMode==='down')return a.dayDiff-b.dayDiff;if(sortMode==='amount')return b.amount-a.amount;return b.impactAmount-a.impactAmount;});
    countBadge.textContent=rows.length+'件';
    var total=rows.reduce(function(acc,r){acc.amount+=r.amount;acc.prev+=r.prevAmount;if(r.hasProfit){acc.profit+=r.profit;acc.hasProfit=true;}if(r.hasLy){acc.ly+=r.lyAmount;acc.hasLy=true;}return acc;},{amount:0,prev:0,profit:0,ly:0,hasProfit:false,hasLy:false});
    var tDiff=total.amount-total.prev;var tPct=total.prev?tDiff/total.prev*100:null;var tYoy=total.hasLy&&total.ly?total.amount/total.ly*100:null;var tGross=total.hasProfit?grossMarginRate(total.profit,total.amount):NaN;var tProfitYoy=total.hasLyProfit&&total.lyProfit?total.profit/total.lyProfit*100:null;
    var ups=[].concat(rows).filter(function(r){return r.dayDiff>0;}).sort(function(a,b){return b.impactAmount-a.impactAmount;}).slice(0,3);
    var downs=[].concat(rows).filter(function(r){return r.dayDiff<0;}).sort(function(a,b){return b.impactAmount-a.impactAmount;}).slice(0,3);
    var bigYoyGap=[].concat(rows).filter(function(r){return r.yoy!==null;}).sort(function(a,b){return Math.abs(100-b.yoy)-Math.abs(100-a.yoy);})[0]||null;
    var sumCard=function(label,value,detail,cls){return'<article class="product-summary-card"><div class="product-summary-label">'+escapeHtml(label)+'</div><div class="product-summary-value '+(cls||'')+'">'+value+'</div><div class="product-summary-detail">'+detail+'</div></article>';};
    var rowDetail=function(row){if(!row)return'該当なし';var compareDate=row.prevDate?'（'+escapeHtml(row.prevDate)+'）':'';return escapeHtml(row.bumonName)+' / '+escapeHtml(row.categoryName)+'<br>実績 '+formatYen(row.amount)+' / '+escapeHtml(row.compareDiffLabel||'前週差')+compareDate+' <span class="'+(pctClass(row.dayDiff,false))+'">'+formatSignedYen(row.dayDiff)+'</span> / '+escapeHtml(row.compareRateLabel||'前週比')+' <span class="'+pctClass(row.dayPct,false)+'">'+pctText(row.dayPct,true)+'</span><br>前年同週 '+(row.hasLy?formatYen(row.lyAmount):'-')+' / 前年比 <span class="'+pctClass(row.yoy)+'">'+pctText(row.yoy)+'</span><br>荒利 '+(row.hasProfit?formatYen(row.profit):'-')+' / 粗利率 '+formatPct(row.grossRate)+' / 荒利前年比 <span class="'+pctClass(row.profitYoy)+'">'+pctText(row.profitYoy)+'</span>';};
    var summaryCards=[sumCard('全体',formatYen(total.amount),escapeHtml(rows[0]&&rows[0].compareDiffLabel||'前週差')+' <span class="'+(tDiff>=0?'num-good':'num-bad')+'">'+formatSignedYen(tDiff)+'</span> / '+escapeHtml(rows[0]&&rows[0].compareRateLabel||'前週比')+' '+pctText(tPct,true)+' / 前年比 '+pctText(tYoy)+'<br>荒利 '+(total.hasProfit?formatYen(total.profit):'-')+' / 粗利率 '+formatPct(tGross)+' / 荒利前年比 <span class="'+pctClass(tProfitYoy)+'">'+pctText(tProfitYoy)+'</span>')];
    ups.forEach(function(r,i){summaryCards.push(sumCard('伸び上位'+(i+1),escapeHtml(r.subcategoryName)+' <span class="num-good">'+pctText(r.dayPct,true)+'</span>',rowDetail(r),'num-good'));});
    downs.forEach(function(r,i){summaryCards.push(sumCard('落ち上位'+(i+1),escapeHtml(r.subcategoryName)+' <span class="num-bad">'+pctText(r.dayPct,true)+'</span>',rowDetail(r),'num-bad'));});
    if(bigYoyGap)summaryCards.push(sumCard('前年差注意',escapeHtml(bigYoyGap.subcategoryName)+' <span class="'+pctClass(bigYoyGap.yoy)+'">'+pctText(bigYoyGap.yoy)+'</span>',rowDetail(bigYoyGap)));
    summary.innerHTML=summaryCards.join('');
    var buildProductZones=function(){
      var date=activeDateKey();var comp=compForActive();var prevDate=comp.date;
      var zRows=activeRows.filter(function(r){return r.date===date&&!isAggRow(r)&&matchesFilters(r);});
      var pRows=prevDate?activeRows.filter(function(r){return r.date===prevDate&&!isAggRow(r)&&matchesFilters(r);}):[];
      var zMap={};
      zRows.forEach(function(r){
        var pk=productKey(r);var zk=pk+'||'+(r.zone_name||'');
        if(!zMap[zk])zMap[zk]={pk:pk,zone:r.zone_name||'',today:0,lyAmount:0,hasLy:false,profit:0,hasProfit:false,lyProfit:0,hasLyProfit:false};
        zMap[zk].today+=Number(r['実績金額']||0);
        if(r['前年同週同曜日実績']!==''&&r['前年同週同曜日実績']!==null){zMap[zk].lyAmount+=Number(r['前年同週同曜日実績']||0);zMap[zk].hasLy=true;}
        var p=grossProfitFromRow(r,'実績金額');if(!Number.isNaN(p)){zMap[zk].profit+=p;zMap[zk].hasProfit=true;}
        var lp=lastYearGrossProfitFromRow(r);if(!Number.isNaN(lp)){zMap[zk].lyProfit+=lp;zMap[zk].hasLyProfit=true;}
      });
      var pMap={};
      pRows.forEach(function(r){var zk=productKey(r)+'||'+(r.zone_name||'');if(!pMap[zk])pMap[zk]={prev:0};pMap[zk].prev+=Number(r['実績金額']||0);});
      var byPk={};
      Object.keys(zMap).forEach(function(zk){
        var z=zMap[zk];var prev=(pMap[zk]||{prev:0}).prev;var diff=z.today-prev;
        var pct=prev?diff/prev*100:null;
        var yoy=z.hasLy&&z.lyAmount?z.today/z.lyAmount*100:null;
        var profitYoy=z.hasLyProfit&&z.lyProfit?z.profit/z.lyProfit*100:null;
        if(!byPk[z.pk])byPk[z.pk]=[];
        byPk[z.pk].push({zone:z.zone,today:z.today,diff:diff,pct:pct,yoy:yoy,profitYoy:profitYoy});
      });
      return byPk;
    };
    var productZones=buildProductZones();
    rows.forEach(function(row){
      var zones=productZones[row.key]||[];
      row.goodZones=zones.filter(function(z){return z.diff>0;}).sort(function(a,b){return b.diff-a.diff;}).slice(0,3);
      row.badZones=zones.filter(function(z){return z.diff<0;}).sort(function(a,b){return a.diff-b.diff;}).slice(0,3);
    });
    var fmtPZoneRow=function(z){
      var pct=z.pct===null?'-':(z.pct>0?'+':'')+z.pct.toFixed(1)+'%';
      var cls=z.diff>=0?'num-good':'num-bad';
      return'<li><span class="sales-subcat-name">'+escapeHtml(z.zone)+'</span>'+
        '<span class="sales-main-amount">実績 '+formatYen(z.today)+'</span>'+
        '<span class="'+cls+'">'+formatSignedYen(z.diff)+'</span>'+
        '<span class="sales-main-amount">'+pct+'</span>'+
        '<span class="sales-zone-yoy '+pctClass(z.yoy)+'">前年比 '+pctText(z.yoy)+'</span>'+
        '<span class="sales-zone-yoy '+pctClass(z.profitYoy)+'">荒利前年比 '+pctText(z.profitYoy)+'</span></li>';
    };
    var fmtPZoneList=function(zones){
      if(!zones||!zones.length)return'<div class="sales-main-empty">該当なし</div>';
      return'<ol class="sales-subcat-list">'+zones.map(fmtPZoneRow).join('')+'</ol>';
    };
    cards.innerHTML=sorted.slice(0,12).map(function(row){
      var diffCls=row.dayDiff>=0?'num-good':'num-bad';
      return'<article class="card product-card">'+
        '<div class="meta"><span>'+escapeHtml(row.bumonName)+'</span><span>'+escapeHtml(row.categoryName)+'</span></div>'+
        '<div class="product-card-title">'+escapeHtml(row.subcategoryName)+'</div>'+
        '<div class="product-kpi-grid">'+
        '<div><span>実績</span><strong>'+formatYen(row.amount)+'</strong></div>'+
        '<div><span>'+escapeHtml(row.compareDiffLabel||'前週差')+'</span><strong class="'+diffCls+'">'+formatSignedYen(row.dayDiff)+'</strong></div>'+
        '<div><span>'+escapeHtml(row.compareRateLabel||'前週比')+'</span><strong class="'+diffCls+'">'+pctText(row.dayPct,true)+'</strong></div>'+
        '<div><span>前年比</span><strong class="'+pctClass(row.yoy)+'">'+pctText(row.yoy)+'</strong></div>'+
        '<div><span>荒利</span><strong>'+(row.hasProfit?formatYen(row.profit):'-')+'</strong></div>'+
        '<div><span>粗利率</span><strong>'+formatPct(row.grossRate)+'</strong></div>'+
        '<div><span>荒利前年比</span><strong class="'+pctClass(row.profitYoy)+'">'+pctText(row.profitYoy)+'</strong></div>'+
        '</div>'+
        '<div class="sales-zone-subcats">'+
        '<div class="sales-zone-subcat-group"><div class="sales-zone-subcat-title num-good">伸びゾーン 上位3</div>'+fmtPZoneList(row.goodZones)+'</div>'+
        '<div class="sales-zone-subcat-group"><div class="sales-zone-subcat-title num-bad">落ちゾーン 上位3</div>'+fmtPZoneList(row.badZones)+'</div>'+
        '</div>'+
        '</article>';
    }).join('')||'<div class="empty">条件に合う商品実績はありません。</div>';
    var _date=activeDateKey();
    var _dw=weatherTrend.filter(function(w){return w.date===_date&&w.zone&&w.zone!=='全国平均';});
    var _avgTD=_dw.length?_dw.reduce(function(s,w){return s+Number(w.temp_vs_last_week||0);},0)/_dw.length:null;
    var buildTempMemo=function(row){
      if(_avgTD===null||Number.isNaN(_avgTD))return'-';
      var td=_avgTD;var isUp=row.dayDiff>=0;
      var lbl=Math.abs(td)<2?'気温影響薄い':isUp&&td>=2?'気温上昇寄与の可能性':isUp&&td<=-2?'気温以外の要因で伸長':!isUp&&td<=-2?'気温影響あり':'気温影響逆';
      var note=Math.abs(td)<2?'→ 気温以外の要因も確認':isUp&&td>=2?'→ 気温寄与の可能性':isUp&&td<=-2?'→ 気温以外の要因で伸長':!isUp&&td<=-2?'→ 気温寄与の可能性':'→ 気温+にもかかわらず下落';
      return lbl+' 主要ゾーン気温 前週差 '+(td>=0?'+':'')+td.toFixed(1)+'℃ / '+(row.compareRateLabel||'前週比')+' '+pctText(row.dayPct,true)+' / 前年比 '+pctText(row.yoy)+' / 荒利前年比 '+pctText(row.profitYoy)+' '+note;
    };
    var fmtZoneText=function(zones){if(!zones||!zones.length)return'-';return zones.map(function(z){return z.zone+' '+formatSignedYen(z.diff);}).join(' / ');};
    tbody.innerHTML=sorted.slice(0,80).map(function(row){
      return '<tr><td>'+escapeHtml(row.bumonName)+'</td><td>'+escapeHtml(row.categoryName)+'</td><td>'+escapeHtml(row.subcategoryName)+'</td><td class="num">'+formatYen(row.amount)+'</td><td class="num">'+(row.prevDate?formatYen(row.prevAmount):'-')+'</td><td class="num '+(row.dayDiff>=0?'num-good':'num-bad')+'">'+formatSignedYen(row.dayDiff)+'</td><td class="num '+(row.dayDiff>=0?'num-good':'num-bad')+'">'+pctText(row.dayPct,true)+'</td><td class="num">'+(row.hasLy?formatYen(row.lyAmount):'-')+'</td><td class="num '+pctClass(row.yoy)+'">'+pctText(row.yoy)+'</td><td class="num">'+(row.hasProfit?formatYen(row.profit):'-')+'</td><td class="num">'+formatPct(row.grossRate)+'</td><td class="num">'+(row.hasLyProfit?formatYen(row.lyProfit):'-')+'</td><td class="num '+pctClass(row.profitYoy)+'">'+pctText(row.profitYoy)+'</td><td>'+escapeHtml(buildTempMemo(row))+'</td><td>'+escapeHtml(fmtZoneText(row.goodZones))+'</td><td>'+escapeHtml(fmtZoneText(row.badZones))+'</td></tr>';
    }).join('');
  };
  var renderWeekTabs=function(){
    if(!weekTabs)return;
    weekTabs.classList.toggle('is-visible',viewMode==='weekly'&&weekWindows.length>0);
    weekTabs.innerHTML=weekWindows.map(function(w){return'<button type="button" class="week-tab '+(w.key===selectedWeekKey?'is-active':'')+'" data-week="'+escapeAttribute(w.key)+'">'+escapeHtml(w.label)+'</button>';}).join('');
    weekTabs.querySelectorAll('.week-tab').forEach(function(btn){btn.onclick=function(){selectedWeekKey=btn.dataset.week||selectedWeekKey;renderWeekTabs();rebuildCategoryOptions();renderView();};});
  };
  var setViewMode=function(mode){
    viewMode=mode==='weekly'&&weekWindows.length?'weekly':'daily';
    if(dateSelect)dateSelect.disabled=viewMode==='weekly';
    periodMode&&periodMode.querySelectorAll('.segment').forEach(function(btn){btn.classList.toggle('is-active',btn.dataset.mode===viewMode);});
    renderWeekTabs();rebuildCategoryOptions();renderView();
  };
  if(periodMode)periodMode.querySelectorAll('.segment').forEach(function(btn){btn.classList.toggle('is-active',btn.dataset.mode===viewMode);btn.onclick=function(){setViewMode(btn.dataset.mode||'daily');};});
  renderWeekTabs();rebuildCategoryOptions();renderView();
  dateSelect.onchange=function(){if(viewMode==='daily'){rebuildCategoryOptions();renderView();}};
  bumonSelect.onchange=function(){rebuildCategoryOptions();renderView();};
  categorySelect.onchange=renderView;sortSelect.onchange=renderView;
}

// 店舗売上タブ: 売上タブと同じゾーン別カードUI。区分(上位/下位)→店舗(順位昇順)→部門(メンズ/レディース/合計)。
// 荒利・粗利率・荒利前年比は店舗日次に列が無いため、store_focus_subcat の荒利を店舗×部門で集計して補う。
function renderStoreSales(dailyRows, subcatRows, dates) {
  const select = document.getElementById('storeSalesDateSelect');
  const container = document.getElementById('storeSalesContent');
  if (!select || !container) return;
  const rowsAll = (dailyRows || []).filter((r) => r && r['日付']);
  const subAll = (subcatRows || []).filter((r) => r && r['日付']);
  const dateList = (dates && dates.length) ? dates
    : [...new Set(rowsAll.map((r) => String(r['日付'])))].sort().reverse();
  if (!dateList.length) {
    select.innerHTML = '<option>データなし</option>';
    container.innerHTML = '<div class="empty">店舗売上データはまだありません。</div>';
    return;
  }
  select.innerHTML = dateList.map((d) => `<option value="${escapeAttribute(d)}">${escapeHtml(d)}</option>`).join('');

  const wByDateZone = {};
  ((state.data && state.data.weatherTrend) || []).forEach((w) => { if (w.date && w.zone) wByDateZone[`${w.date}|${w.zone}`] = w; });
  ((state.data && state.data.weatherDaily) || []).forEach((w) => { if (w.date && w.zone) wByDateZone[`${w.date}|${w.zone}`] = w; });

  const pctClass = (v) => v === null || Number.isNaN(Number(v)) ? '' : Number(v) >= 100 ? 'num-good' : Number(v) >= 95 ? 'num-warn' : 'num-bad';
  const numFmt = (v) => Number.isNaN(numberOrNaN(v)) ? '-' : numberOrNaN(v).toLocaleString('ja-JP');
  const pctFmt = (v) => Number.isNaN(numberOrNaN(v)) ? '-' : numberOrNaN(v).toFixed(1) + '%';

  // 店舗×部門の荒利集計（subcatから）。{ 店舗CD: { all:{p,lp,hasP,hasLp}, bumon:{ 部門名:{...} } } }
  const buildProfitMap = (date) => {
    const m = {};
    subAll.filter((r) => String(r['日付']) === date).forEach((r) => {
      const code = String(r['店舗CD'] || '');
      const raw = String(r['部門名'] || '');
      const bumon = raw.indexOf('レディース') >= 0 ? 'レディース' : raw.indexOf('メンズ') >= 0 ? 'メンズ' : raw;
      if (!m[code]) m[code] = { all: { p: 0, lp: 0, hasP: false, hasLp: false }, bumon: {} };
      if (!m[code].bumon[bumon]) m[code].bumon[bumon] = { p: 0, lp: 0, hasP: false, hasLp: false };
      const p = numberOrNaN(r['販売荒利高']);
      const lp = numberOrNaN(r['昨年荒利']);
      if (!Number.isNaN(p)) { m[code].all.p += p; m[code].all.hasP = true; m[code].bumon[bumon].p += p; m[code].bumon[bumon].hasP = true; }
      if (!Number.isNaN(lp)) { m[code].all.lp += lp; m[code].all.hasLp = true; m[code].bumon[bumon].lp += lp; m[code].bumon[bumon].hasLp = true; }
    });
    return m;
  };

  const makeCol = (row, prof) => {
    const base = row ? {
      budget: numberOrNaN(row['予算']),
      actual: numberOrNaN(row['売上実績']),
      ratio: numberOrNaN(row['予算比']),
      ly: numberOrNaN(row['昨年実績']),
      yoy: numberOrNaN(row['昨年比'])
    } : { budget: NaN, actual: NaN, ratio: NaN, ly: NaN, yoy: NaN };
    if (Number.isNaN(base.ratio) && !Number.isNaN(base.actual) && !Number.isNaN(base.budget) && base.budget) base.ratio = Math.round(base.actual / base.budget * 1000) / 10;
    if (Number.isNaN(base.yoy) && !Number.isNaN(base.actual) && !Number.isNaN(base.ly) && base.ly) base.yoy = Math.round(base.actual / base.ly * 1000) / 10;
    const profit = (prof && prof.hasP) ? prof.p : NaN;
    const lyProfit = (prof && prof.hasLp) ? prof.lp : NaN;
    base.profit = profit;
    base.grossRate = grossMarginRate(profit, base.actual);
    base.lyProfit = lyProfit;
    base.profitYoy = yoyRateValue(profit, lyProfit);
    return base;
  };
  const colHtml = (label, col) => `
    <div class="zs-col">
      <div class="zs-col-head">${label}</div>
      <div class="zs-kpi"><span class="zs-kpi-l">予算</span><span class="zs-kpi-v">${numFmt(col.budget)}</span></div>
      <div class="zs-kpi"><span class="zs-kpi-l">実績</span><span class="zs-kpi-v">${numFmt(col.actual)}</span></div>
      <div class="zs-kpi"><span class="zs-kpi-l">達成率</span><span class="zs-kpi-v ${pctClass(col.ratio)}">${pctFmt(col.ratio)}</span></div>
      <div class="zs-kpi"><span class="zs-kpi-l">前年同週</span><span class="zs-kpi-v">${numFmt(col.ly)}</span></div>
      <div class="zs-kpi"><span class="zs-kpi-l">前年比</span><span class="zs-kpi-v ${pctClass(col.yoy)}">${pctFmt(col.yoy)}</span></div>
      <div class="zs-kpi"><span class="zs-kpi-l">荒利</span><span class="zs-kpi-v">${Number.isNaN(col.profit) ? '-' : Math.round(col.profit).toLocaleString('ja-JP')}</span></div>
      <div class="zs-kpi"><span class="zs-kpi-l">粗利率</span><span class="zs-kpi-v">${Number.isNaN(col.grossRate) ? '-' : col.grossRate.toFixed(1) + '%'}</span></div>
      <div class="zs-kpi"><span class="zs-kpi-l">荒利前年比</span><span class="zs-kpi-v ${pctClass(col.profitYoy)}">${col.profitYoy === null || Number.isNaN(Number(col.profitYoy)) ? '-' : Number(col.profitYoy).toFixed(1) + '%'}</span></div>
    </div>`;
  // 売上タブの気温列と同一仕様（最高/最低/前週差(or前日差)/前年差/降水量/降水前週差/降水前年差/湿度/湿度前年差）
  const tempColHtml = (w) => {
    if (!w) return '<div class="zs-col"><div class="zs-col-head">気温</div><div class="zs-kpi" style="color:var(--muted);font-size:12px">データなし</div></div>';
    const hasLW = w.temp_vs_last_week !== '' && w.temp_vs_last_week !== null && typeof w.temp_vs_last_week !== 'undefined';
    const diff = numberOrNaN(hasLW ? w.temp_vs_last_week : w.temp_vs_yesterday);
    const diffLY = numberOrNaN(w.temp_vs_last_year_same_weekday);
    const diffStr = Number.isNaN(diff) ? '-' : (diff === 0 ? '±' : diff > 0 ? '+' : '') + diff.toFixed(1) + '℃';
    const diffLYStr = Number.isNaN(diffLY) ? '-' : (diffLY === 0 ? '±' : diffLY > 0 ? '+' : '') + diffLY.toFixed(1) + '℃';
    const diffCls = diff > 0 ? 'num-bad' : diff < 0 ? 'num-good' : '';
    const diffLYCls = diffLY > 0 ? 'num-bad' : diffLY < 0 ? 'num-good' : '';
    const tempValue = (v) => { const n = numberOrNaN(v); return Number.isNaN(n) ? '-' : n.toFixed(1) + '℃'; };
    const rainVal = (v) => { const n = numberOrNaN(v); return Number.isNaN(n) ? '-' : n.toFixed(1) + 'mm'; };
    const rainDiffStr = (v) => { const n = numberOrNaN(v); return Number.isNaN(n) ? '-' : (n === 0 ? '±' : n > 0 ? '+' : '') + n.toFixed(1) + 'mm'; };
    const rainDiffCls = (v) => { const n = numberOrNaN(v); return Number.isNaN(n) ? '' : n > 0 ? 'num-bad' : n < 0 ? 'num-good' : ''; };
    return '<div class="zs-col"><div class="zs-col-head">気温</div>'+
      '<div class="zs-kpi"><span class="zs-kpi-l">最高</span><span class="zs-kpi-v">'+tempValue(w.max_temp)+'</span></div>'+
      '<div class="zs-kpi"><span class="zs-kpi-l">最低</span><span class="zs-kpi-v">'+tempValue(w.min_temp)+'</span></div>'+
      '<div class="zs-kpi"><span class="zs-kpi-l">'+(hasLW?'前週差':'前日差')+'</span><span class="zs-kpi-v '+diffCls+'">'+diffStr+'</span></div>'+
      '<div class="zs-kpi"><span class="zs-kpi-l">前年差</span><span class="zs-kpi-v '+diffLYCls+'">'+diffLYStr+'</span></div>'+
      '<div class="zs-kpi"><span class="zs-kpi-l">降水量</span><span class="zs-kpi-v">'+rainVal(w.rain_mm)+'</span></div>'+
      '<div class="zs-kpi"><span class="zs-kpi-l">降水前週差</span><span class="zs-kpi-v '+rainDiffCls(w.rain_vs_last_week)+'">'+rainDiffStr(w.rain_vs_last_week)+'</span></div>'+
      '<div class="zs-kpi"><span class="zs-kpi-l">降水前年差</span><span class="zs-kpi-v '+rainDiffCls(w.rain_vs_last_year_same_weekday)+'">'+rainDiffStr(w.rain_vs_last_year_same_weekday)+'</span></div>'+
      '<div class="zs-kpi"><span class="zs-kpi-l">湿度</span><span class="zs-kpi-v">'+formatHumidity(w.humidity_avg)+'</span></div>'+
      '<div class="zs-kpi"><span class="zs-kpi-l">湿度前年差</span><span class="zs-kpi-v '+humidityDiffClass(w.humidity_vs_last_year_same_weekday)+'">'+formatSignedHumidityDiff(w.humidity_vs_last_year_same_weekday)+'</span></div>'+
      '</div>';
  };

  const renderForDate = (date) => {
    const rows = rowsAll.filter((r) => String(r['日付']) === date);
    if (!rows.length) { container.innerHTML = '<div class="empty">この日のデータはありません。</div>'; return; }
    const profitMap = buildProfitMap(date);
    const kubuns = [...new Set(rows.map((r) => String(r['区分'] || '')))];
    const kubunRank = (k) => (k === '良' || k === '上位') ? 0 : (k === '悪' || k === '下位') ? 2 : 1;
    const ordered = kubuns.slice().sort((a, b) => kubunRank(a) - kubunRank(b));
    container.innerHTML = ordered.map((kubun) => {
      const kr = rows.filter((r) => String(r['区分'] || '') === kubun);
      const order = [];
      const map = {};
      kr.forEach((r) => {
        const code = String(r['店舗CD'] || '');
        if (!map[code]) { map[code] = { code, name: r['店舗名'], zone: r['ゾーン名'], rank: numberOrNaN(r['順位']), bumon: {} }; order.push(code); }
        map[code].bumon[String(r['部門'] || '')] = r;
        const rk = numberOrNaN(r['順位']); if (!Number.isNaN(rk)) map[code].rank = rk;
      });
      order.sort((a, b) => {
        const ra = map[a].rank, rb = map[b].rank;
        if (Number.isNaN(ra)) return 1; if (Number.isNaN(rb)) return -1; return ra - rb;
      });
      const cards = order.map((code) => {
        const s = map[code];
        const prof = profitMap[code] || { all: null, bumon: {} };
        const mens = makeCol(s.bumon['メンズ'], prof.bumon['メンズ']);
        const ladies = makeCol(s.bumon['レディース'], prof.bumon['レディース']);
        const totalRow = s.bumon['合計'] || s.bumon['全体'] || s.bumon['計'] || null;
        let total;
        if (totalRow) {
          total = makeCol(totalRow, prof.all);
        } else {
          const sum = (a, b) => (Number.isNaN(a) ? 0 : a) + (Number.isNaN(b) ? 0 : b);
          const tA = sum(mens.actual, ladies.actual), tB = sum(mens.budget, ladies.budget), tL = sum(mens.ly, ladies.ly);
          const tProfit = (prof.all && prof.all.hasP) ? prof.all.p : NaN;
          const tLyProfit = (prof.all && prof.all.hasLp) ? prof.all.lp : NaN;
          total = {
            budget: tB || NaN, actual: tA || NaN, ratio: tB ? Math.round(tA / tB * 1000) / 10 : NaN,
            ly: tL || NaN, yoy: tL ? Math.round(tA / tL * 1000) / 10 : NaN,
            profit: tProfit, grossRate: grossMarginRate(tProfit, tA || NaN), lyProfit: tLyProfit, profitYoy: yoyRateValue(tProfit, tLyProfit)
          };
        }
        const wt = tempColHtml(wByDateZone[`${date}|${s.zone}`] || null);
        const head = `${Number.isNaN(s.rank) ? '' : '#' + s.rank + ' '}${escapeHtml(s.name || '')}${s.zone ? ' <span style="font-weight:400;color:var(--muted);font-size:12px">' + escapeHtml(s.zone) + '</span>' : ''}`;
        return `<article class="card zs-card">
          <div class="zs-card-head">${head}</div>
          <div class="zs-cols" ${wt ? 'style="grid-template-columns: 1fr 1fr 1fr auto"' : ''}>
            ${colHtml('メンズ', mens)}${colHtml('レディース', ladies)}${colHtml('合計', total)}${wt}
          </div>
        </article>`;
      }).join('');
      return `<div class="section-heading" style="margin-top:16px"><h3>${escapeHtml(kubun || '注目店舗')}</h3></div><div class="zs-grid">${cards}</div>`;
    }).join('');
  };
  select.onchange = () => renderForDate(select.value);
  renderForDate(dateList[0]);
}

// 店舗カテゴリタブ: カテゴリタブと同じ明細テーブル（データ行＋カテゴリ小計＋合計）。日付＋店舗セレクタ。
// フィールド対応: 部門名→部門, ミニ部門名→カテゴリ, 品種名→サブカテ, 売上数量/売上実績,
//   前週売上→売上前週, 昨年売上実績→前年金額, 販売荒利高→荒利, 昨年荒利→前年荒利。比率・差は集計から算出。
function renderStoreCategory(subcatRows, dates) {
  const dateSelect = document.getElementById('storeCategoryDateSelect');
  const storeSelect = document.getElementById('storeCategoryStoreSelect');
  const tbody = document.getElementById('storeCategoryTableBody');
  if (!dateSelect || !storeSelect || !tbody) return;
  const rowsAll = (subcatRows || []).filter((r) => r && r['日付']);
  const dateList = (dates && dates.length) ? dates
    : [...new Set(rowsAll.map((r) => String(r['日付'])))].sort().reverse();
  if (!dateList.length) {
    dateSelect.innerHTML = '<option>データなし</option>';
    storeSelect.innerHTML = '';
    tbody.innerHTML = '<tr><td colspan="13">店舗カテゴリデータはまだありません。</td></tr>';
    return;
  }
  dateSelect.innerHTML = dateList.map((d) => `<option value="${escapeAttribute(d)}">${escapeHtml(d)}</option>`).join('');
  const orderKubun = (k) => (k === '良' || k === '上位') ? 0 : (k === '悪' || k === '下位') ? 2 : 1;
  const pctCls = (v) => v === null || Number.isNaN(Number(v)) ? '' : Number(v) >= 100 ? 'num-good' : Number(v) >= 95 ? 'num-warn' : 'num-bad';
  const diffCls = (v) => v === null ? '' : v >= 0 ? 'num-good' : 'num-bad';
  let currentDate = dateList[0];

  const buildStoreOptions = (date) => {
    const rows = rowsAll.filter((r) => String(r['日付']) === date);
    const order = [];
    const map = {};
    rows.forEach((r) => {
      const code = String(r['店舗CD'] || '');
      if (!map[code]) { map[code] = { code, name: r['店舗名'], kubun: String(r['区分'] || ''), rank: numberOrNaN(r['順位']) }; order.push(code); }
    });
    order.sort((a, b) => {
      const ka = orderKubun(map[a].kubun), kb = orderKubun(map[b].kubun);
      if (ka !== kb) return ka - kb;
      const ra = map[a].rank, rb = map[b].rank;
      if (Number.isNaN(ra)) return 1; if (Number.isNaN(rb)) return -1; return ra - rb;
    });
    const prev = storeSelect.value;
    storeSelect.innerHTML = order.map((code) => {
      const s = map[code];
      const label = (s.kubun ? '[' + s.kubun + '] ' : '') + (Number.isNaN(s.rank) ? '' : '#' + s.rank + ' ') + (s.name || code);
      return `<option value="${escapeAttribute(code)}">${escapeHtml(label)}</option>`;
    }).join('');
    if (order.includes(prev)) storeSelect.value = prev;
  };

  const metricsRow = (cells) => cells;
  const lineRow = (bumon, cat, sub, s, cls) => {
    const prevPct = (s.hasPrev && s.prevAmt) ? Math.round(s.amt / s.prevAmt * 1000) / 10 : null;
    const yoy = (s.hasLy && s.lyAmt && s.amt) ? Math.round(s.amt / s.lyAmt * 1000) / 10 : null;
    const salesDiff = s.hasLy ? s.amt - s.lyAmt : null;
    const margin = s.hasProfit ? grossMarginRate(s.profit, s.amt) : null;
    const profitDiff = (s.hasProfit && s.hasLyProfit) ? s.profit - s.lyProfit : null;
    return `<tr class="${cls || ''}">
      <td>${escapeHtml(bumon)}</td>
      <td>${escapeHtml(cat)}</td>
      <td>${escapeHtml(sub)}</td>
      <td class="num">${formatNum(s.qty)}</td>
      <td class="num">${formatYen(s.amt)}</td>
      <td class="num">${s.hasPrev ? formatYen(s.prevAmt) : '-'}</td>
      <td class="num ${pctCls(prevPct)}">${prevPct !== null ? prevPct.toFixed(1) + '%' : '-'}</td>
      <td class="num">${s.hasLy ? formatYen(s.lyAmt) : '-'}</td>
      <td class="num ${diffCls(salesDiff)}">${salesDiff !== null ? formatSignedYen(salesDiff) : '-'}</td>
      <td class="num ${pctCls(yoy)}">${yoy !== null ? yoy.toFixed(1) + '%' : '-'}</td>
      <td class="num">${s.hasProfit ? formatYen(s.profit) : '-'}</td>
      <td class="num ${diffCls(profitDiff)}">${profitDiff !== null ? formatSignedYen(profitDiff) : '-'}</td>
      <td class="num">${margin !== null ? formatPct(margin) : '-'}</td>
    </tr>`;
  };
  const subtotalRow = (label, s) => {
    const prevPct = (s.hasPrev && s.prevAmt) ? Math.round(s.amt / s.prevAmt * 1000) / 10 : null;
    const yoy = (s.hasLy && s.lyAmt && s.amt) ? Math.round(s.amt / s.lyAmt * 1000) / 10 : null;
    const salesDiff = s.hasLy ? s.amt - s.lyAmt : null;
    const margin = s.hasProfit ? grossMarginRate(s.profit, s.amt) : null;
    const profitDiff = (s.hasProfit && s.hasLyProfit) ? s.profit - s.lyProfit : null;
    return `<tr class="row-cat-subtotal">
      <td></td><td colspan="2">${escapeHtml(label)}　小計</td>
      <td class="num">${formatNum(s.qty)}</td>
      <td class="num">${formatYen(s.amt)}</td>
      <td class="num">${s.hasPrev ? formatYen(s.prevAmt) : '-'}</td>
      <td class="num ${pctCls(prevPct)}">${prevPct !== null ? prevPct.toFixed(1) + '%' : '-'}</td>
      <td class="num">${s.hasLy ? formatYen(s.lyAmt) : '-'}</td>
      <td class="num ${diffCls(salesDiff)}">${salesDiff !== null ? formatSignedYen(salesDiff) : '-'}</td>
      <td class="num ${pctCls(yoy)}">${yoy !== null ? yoy.toFixed(1) + '%' : '-'}</td>
      <td class="num">${s.hasProfit ? formatYen(s.profit) : '-'}</td>
      <td class="num ${diffCls(profitDiff)}">${profitDiff !== null ? formatSignedYen(profitDiff) : '-'}</td>
      <td class="num">${margin !== null ? formatPct(margin) : '-'}</td>
    </tr>`;
  };
  const grandTotalRow = (s) => {
    const prevPct = (s.hasPrev && s.prevAmt) ? Math.round(s.amt / s.prevAmt * 1000) / 10 : null;
    const yoy = (s.hasLy && s.lyAmt && s.amt) ? Math.round(s.amt / s.lyAmt * 1000) / 10 : null;
    const salesDiff = s.hasLy ? s.amt - s.lyAmt : null;
    const margin = s.hasProfit ? grossMarginRate(s.profit, s.amt) : null;
    const profitDiff = (s.hasProfit && s.hasLyProfit) ? s.profit - s.lyProfit : null;
    return `<tr class="row-grand-total">
      <td colspan="3">合　計</td>
      <td class="num">${formatNum(s.qty)}</td>
      <td class="num">${formatYen(s.amt)}</td>
      <td class="num">${s.hasPrev ? formatYen(s.prevAmt) : '-'}</td>
      <td class="num ${pctCls(prevPct)}">${prevPct !== null ? prevPct.toFixed(1) + '%' : '-'}</td>
      <td class="num">${s.hasLy ? formatYen(s.lyAmt) : '-'}</td>
      <td class="num ${diffCls(salesDiff)}">${salesDiff !== null ? formatSignedYen(salesDiff) : '-'}</td>
      <td class="num ${pctCls(yoy)}">${yoy !== null ? yoy.toFixed(1) + '%' : '-'}</td>
      <td class="num">${s.hasProfit ? formatYen(s.profit) : '-'}</td>
      <td class="num ${diffCls(profitDiff)}">${profitDiff !== null ? formatSignedYen(profitDiff) : '-'}</td>
      <td class="num">${margin !== null ? formatPct(margin) : '-'}</td>
    </tr>`;
  };
  const emptyAcc = () => ({ qty: 0, amt: 0, prevAmt: 0, hasPrev: false, lyAmt: 0, hasLy: false, profit: 0, hasProfit: false, lyProfit: 0, hasLyProfit: false });
  const accumulate = (acc, r) => {
    acc.qty += numberOrNaN(r['売上数量']) || 0;
    acc.amt += numberOrNaN(r['売上実績']) || 0;
    const pw = numberOrNaN(r['前週売上']); if (!Number.isNaN(pw)) { acc.prevAmt += pw; acc.hasPrev = true; }
    const ly = numberOrNaN(r['昨年売上実績']); if (!Number.isNaN(ly)) { acc.lyAmt += ly; acc.hasLy = true; }
    const pf = numberOrNaN(r['販売荒利高']); if (!Number.isNaN(pf)) { acc.profit += pf; acc.hasProfit = true; }
    const lpf = numberOrNaN(r['昨年荒利']); if (!Number.isNaN(lpf)) { acc.lyProfit += lpf; acc.hasLyProfit = true; }
  };

  const renderTable = (date, storeCode) => {
    let rows = rowsAll.filter((r) => String(r['日付']) === date);
    if (storeCode) rows = rows.filter((r) => String(r['店舗CD'] || '') === storeCode);
    if (!rows.length) { tbody.innerHTML = '<tr><td colspan="13">この条件のデータはありません。</td></tr>'; return; }
    // 部門名|ミニ部門名|品種 で集計
    const map = {};
    const order = [];
    rows.forEach((r) => {
      const bumon = String(r['部門名'] || '');
      const cat = String(r['ミニ部門名'] || '');
      const sub = String(r['品種名'] || '');
      const key = `${bumon}|${cat}|${String(r['品種CD'] || sub)}`;
      if (!map[key]) { map[key] = { bumon, cat, sub, acc: emptyAcc() }; order.push(key); }
      accumulate(map[key].acc, r);
    });
    order.sort((a, b) => {
      const A = map[a], B = map[b];
      const d1 = String(A.bumon).localeCompare(String(B.bumon)); if (d1 !== 0) return d1;
      const d2 = String(A.cat).localeCompare(String(B.cat)); if (d2 !== 0) return d2;
      return String(A.sub).localeCompare(String(B.sub));
    });

    let html = '';
    let prevCatKey = null;
    let catSub = emptyAcc(); let catName = '';
    const grand = emptyAcc();
    const addInto = (dst, src) => {
      dst.qty += src.qty; dst.amt += src.amt;
      if (src.hasPrev) { dst.prevAmt += src.prevAmt; dst.hasPrev = true; }
      if (src.hasLy) { dst.lyAmt += src.lyAmt; dst.hasLy = true; }
      if (src.hasProfit) { dst.profit += src.profit; dst.hasProfit = true; }
      if (src.hasLyProfit) { dst.lyProfit += src.lyProfit; dst.hasLyProfit = true; }
    };
    order.forEach((key, i) => {
      const e = map[key];
      const catKey = `${e.bumon}|${e.cat}`;
      if (prevCatKey !== null && prevCatKey !== catKey) {
        html += subtotalRow(catName, catSub);
        catSub = emptyAcc();
      }
      prevCatKey = catKey;
      catName = e.cat;
      html += lineRow(e.bumon, e.cat, e.sub, e.acc);
      addInto(catSub, e.acc);
      addInto(grand, e.acc);
      if (i === order.length - 1) html += subtotalRow(catName, catSub);
    });
    html += grandTotalRow(grand);
    tbody.innerHTML = html;
  };

  dateSelect.onchange = () => { currentDate = dateSelect.value; buildStoreOptions(currentDate); renderTable(currentDate, storeSelect.value); };
  storeSelect.onchange = () => renderTable(currentDate, storeSelect.value);
  buildStoreOptions(currentDate);
  renderTable(currentDate, storeSelect.value);
}

