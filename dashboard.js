// ── ゾーン順序 ───────────────────────────────────────────────
const ZONE_ORDER_NS = [
  '北海道','青森','東北','首都圏','西関東','東関東',
  '東関西','西関西','中部','北陸','中国','四国',
  '北九州','筑豊','福岡','東九州','西九州','天草','南九州','西友'
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
    if(!map[key])map[key]=Object.assign({},r,{date:dateKey,'売上実績':0,'前年同週同曜日実績':0,'売上予算':0,'販売荒利高':0,'前年荒利高':0,'達成率':null,'前年比':null,'荒利率':null,_hasLy:false,_hasProfit:false,_hasLyProfit:false});
    map[key]['売上実績']+=Number(r['売上実績']||0);
    map[key]['売上予算']+=Number(r['売上予算']||0);
    if(r['前年同週同曜日実績']!==''&&r['前年同週同曜日実績']!==null){map[key]['前年同週同曜日実績']+=Number(r['前年同週同曜日実績']||0);map[key]._hasLy=true;}
    var p=grossProfitFromRow(r,'売上実績');if(!Number.isNaN(p)){map[key]['販売荒利高']+=p;map[key]._hasProfit=true;}
    var lp=lastYearGrossProfitFromRow(r);if(!Number.isNaN(lp)){map[key]['前年荒利高']+=lp;map[key]._hasLyProfit=true;}
  });
  return Object.values(map);
}

// ── 初期化 ───────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('reloadButton').addEventListener('click', loadDashboard);
  document.querySelectorAll('.tab').forEach(btn => {
    btn.addEventListener('click', () => switchSection(btn.dataset.section));
  });
  loadDashboard();
});

function switchSection(sectionId) {
  document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.section === sectionId));
  document.querySelectorAll('.dashboard-section').forEach(s => s.classList.toggle('active', s.id === sectionId));
}

// ── データ読み込み（fetch版） ─────────────────────────────────
async function loadDashboard() {
  setLoading(true, '読み込み中...');
  try {
    const res = await fetch('./data/dashboard_data.json');
    if (!res.ok) throw new Error(`データ取得失敗 (${res.status})`);
    const data = await res.json();
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

  renderTodayAlerts(buildImportantAlerts(data));
  renderSalesAlerts(data.legwearBumon || [], data.legwearCategory || [], data.weatherLatest || []);
  renderWeather(data.weatherLatest || [], data.weatherTrend || [], data.zoneOrder || []);

  // 売上タブ: 週別モード対応
  var bumonRows=data.legwearBumon||[];
  var bumonDates=data.legwearDates||[];
  if(state.dateMode==='weekly'){
    var ww=currentWeekWindow();
    if(ww){bumonRows=aggregateBumonPeriod(data.legwearBumon||[],ww.startDate,ww.endDate,ww.key).concat(aggregateBumonPeriod(data.legwearBumon||[],ww.compareStartDate,ww.compareEndDate,ww.compareKey));bumonDates=[ww.key];}
  }
  renderSales(bumonRows, bumonDates, data.weatherLatest || []);
  renderCategory(data.legwearCategory || [], data.legwearDates || []);
  renderProductAnalysis(
    data.legwearCategory || [],
    data.legwearCurrentWeekDates || data.legwearDates || [],
    data.weatherTrend || [],
    data.legwearWeeks || [],
    data.legwearDates || []
  );
  renderNews(data.newsLatest || []);
  renderReviewNews(data.newsReview || []);
  renderTags(data.analysisTags || []);
}

function buildImportantAlerts(data) {
  const baseAlerts = data.todayAlerts || [];
  const importantNews = (data.newsLatest || [])
    .filter(row => Number(row.importance || 0) >= 4)
    .map(row => ({
      date: row.date,
      category: row.category || 'ニュース',
      keyword: row.keyword || row.title || 'ニュース',
      alert_type: 'ニュース',
      evidence: row.title,
      importance: row.importance,
      sales_check_point: row.md_insight || row.summary || 'ニュース内容を売上分析時の外部要因として確認',
      action: row.source ? `${row.source} / ニュースタブで詳細確認` : 'ニュースタブで詳細確認',
      created_at: row.created_at
    }));
  const seen = {};
  return [...baseAlerts, ...importantNews].filter(item => {
    const key = `${item.date||''}|${item.alert_type||''}|${item.evidence||item.keyword||''}`;
    if (seen[key]) return false;
    seen[key] = true;
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

// -- 重要アラートタブ
function renderTodayAlerts(items) {
  const sorted = sortByImportance(items);
  const groupMap = {};
  sorted.forEach(item => {
    const key = item.keyword + '||' + (item.alert_type||'');
    if (!groupMap[key]) groupMap[key] = Object.assign({}, item, {_evidences:[]});
    groupMap[key]._evidences.push(item.evidence);
  });
  const consolidated = Object.values(groupMap).map(g => {
    const base = Object.assign({}, g);
    if (g._evidences.length === 1) { base.evidence = g._evidences[0]; }
    else {
      const shown = g._evidences.slice(0,5);
      const rest = g._evidences.length - shown.length;
      base.evidence = shown.join(' / ') + (rest > 0 ? ' 他'+rest+'件' : '');
    }
    return base;
  }).sort((a,b) => Number(b.importance||0) - Number(a.importance||0));
  const display = consolidated.slice(0,12);
  document.getElementById('alertCount').textContent = display.length + '件';
  renderCards('todayAlerts', display, function(item) {
    return '<article class="card important"><div class="meta"><span>' + escapeHtml(item.date) + '</span><span>' + escapeHtml(item.category) + '</span><span class="importance">重要度 ' + escapeHtml(item.importance) + '</span></div><div class="card-title">' + escapeHtml(item.evidence) + '</div><div>' + escapeHtml(item.sales_check_point) + '</div><div class="action">' + escapeHtml(item.action) + '</div></article>';
  });
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
function renderWeather(items, trendItems, zoneOrder) {
  renderCards('weatherCards', items, function(item) {
    return '<article class="card"><div class="meta"><span>' + escapeHtml(item.date) + '</span><span>' + escapeHtml(item.zone) + '</span></div><div class="card-title">' + escapeHtml(item.area_name) + '：<span class="' + tempCompareClass(item.max_temp,item.last_year_max_temp) + '">最高' + escapeHtml(item.max_temp) + '℃</span></div><div><span class="' + tempCompareClass(item.min_temp,item.last_year_min_temp) + '">最低' + escapeHtml(item.min_temp) + '℃</span> / 降水量' + escapeHtml(item.rain_mm) + 'mm</div><div>前週差 <span class="' + tempDiffClass(item.temp_vs_last_week) + '">' + formatTempDiffOrDash(item.temp_vs_last_week) + '℃</span> / 前日差 <span class="' + tempDiffClass(item.temp_vs_yesterday) + '">' + formatTempDiffOrDash(item.temp_vs_yesterday) + '℃</span> / 前年差 <span class="' + tempDiffClass(item.temp_vs_last_year_same_weekday) + '">' + formatTempDiffOrDash(item.temp_vs_last_year_same_weekday) + '℃</span> / 昨年 ' + escapeHtml(item.last_year_same_weekday_date||'-') + '</div><div class="action">' + escapeHtml(item.weather_alert) + '</div></article>';
  });
  var tbody = document.getElementById('weatherTable');
  tbody.innerHTML = items.map(function(item) {
    return '<tr><td>' + escapeHtml(item.date) + '</td><td>' + escapeHtml(item.zone) + '</td><td>' + escapeHtml(item.max_temp) + '℃</td><td>' + escapeHtml(item.min_temp) + '℃</td><td>' + escapeHtml(item.rain_mm) + 'mm</td><td>' + formatTempDiffOrDash(item.temp_vs_last_week) + '℃</td><td>' + formatTempDiffOrDash(item.temp_vs_last_year_same_weekday) + '℃</td><td>' + escapeHtml(item.last_year_same_weekday_date||'-') + '</td><td>' + escapeHtml(item.weather_alert) + '</td></tr>';
  }).join('');
  renderWeatherTrend(trendItems||[], items, zoneOrder||[]);
}

function renderWeatherTrend(trendItems, todayItems, zoneOrder) {
  var select = document.getElementById('weatherZoneSelect');
  var chart = document.getElementById('weatherTrendChart');
  if (!select||!chart) return;
  var available = new Set(trendItems.map(function(i){return i.zone;}).filter(Boolean));
  var zones = zoneOrder.filter(function(z){return available.has(z);}).concat(
    [...available].filter(function(z){return !zoneOrder.includes(z);}).sort(function(a,b){return String(a).localeCompare(String(b),'ja');})
  );
  if (!zones.length) { select.innerHTML='<option>データなし</option>'; drawEmptyChart(chart,'天気データがまだありません'); return; }
  var preferred = (todayItems.find(function(i){return Number(i.max_temp||0)>=25;})||{zone:todayItems[0]&&todayItems[0].zone||zones[0]}).zone||zones[0];
  var current = zones.includes(select.value) ? select.value : preferred;
  select.innerHTML = zones.map(function(z){return '<option value="'+escapeAttribute(z)+'"'+(z===current?' selected':'')+'>'+escapeHtml(z)+'</option>';}).join('');
  select.onchange = function(){window.requestAnimationFrame(function(){drawWeatherChart(chart,trendItems,select.value);});};
  window.requestAnimationFrame(function(){drawWeatherChart(chart,trendItems,select.value||current);});
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
  return [row.date+' '+row.zone+'（'+type+'）','最高 '+formatTemp(row.max_temp)+' / 最低 '+formatTemp(row.min_temp),'昨年最高 '+formatTemp(row.last_year_max_temp)+' / 昨年最低 '+formatTemp(row.last_year_min_temp),'降水量 '+formatMm(row.rain_mm)].join('\n');
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
  var weatherByZoneAll={};
  allWeatherItems.forEach(function(w){if(w.zone)weatherByZoneAll[w.zone]=w;});
  var renderForDate=function(date){
    var rows=allRows.filter(function(r){return r.date===date;});
    var weatherByZone=weatherByZoneAll;
    if(!rows.length){container.innerHTML='<div class="empty">この日のデータはありません。</div>';return;}
    var isAggr=function(r){return String(r.zone_code||'').padStart(4,'0')==='0000'||r.zone_name==='全社計';};
    var totalRows=rows.filter(isAggr);
    var zoneRows=rows.filter(function(r){return !isAggr(r);});
    var zoneNames=sortZonesNS([...new Set(zoneRows.map(function(r){return r.zone_name;}))]);
    var allZones=totalRows.length?[{name:'全社計',isTotal:true}].concat(zoneNames.map(function(n){return{name:n,isTotal:false};})):zoneNames.map(function(n){return{name:n,isTotal:false};});
    var makeCol=function(row){
      if(!row)return{budget:NaN,actual:NaN,ratio:NaN,ly:NaN,yoy:NaN,profit:NaN,grossRate:NaN,lyProfit:NaN,profitYoy:null};
      var actual=numberOrNaN(row['売上実績']);
      var profit=grossProfitFromRow(row,'売上実績');
      var grossRate=!Number.isNaN(normalizePercentValue(row['荒利率']))?normalizePercentValue(row['荒利率']):grossMarginRate(profit,actual);
      var lyProfit=lastYearGrossProfitFromRow(row);
      return{budget:numberOrNaN(row['売上予算']),actual:actual,ratio:numberOrNaN(row['達成率']),ly:numberOrNaN(row['前年同週同曜日実績']),yoy:numberOrNaN(row['前年比']),profit:profit,grossRate:grossRate,lyProfit:lyProfit,profitYoy:yoyRateValue(profit,lyProfit)};
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
        '<div class="zs-kpi"><span class="zs-kpi-l">荒利前年比</span><span class="zs-kpi-v '+pctClass(col.profitYoy)+'">'+(col.profitYoy===null||Number.isNaN(Number(col.profitYoy))?'-':Number(col.profitYoy).toFixed(1)+'%')+'</span></div>'+
        '</div>';
    };
    var tempColHtml=function(w){
      if(!w)return'<div class="zs-col"><div class="zs-col-head">気温</div><div class="zs-kpi" style="color:var(--muted);font-size:12px">データなし</div></div>';
      var hasLW=w.temp_vs_last_week!==''&&w.temp_vs_last_week!==null&&typeof w.temp_vs_last_week!=='undefined';
      var diff=Number(hasLW?w.temp_vs_last_week:(w.temp_vs_yesterday||0));
      var diffLY=Number(w.temp_vs_last_year_same_weekday||0);
      var diffStr=(diff===0?'±':diff>0?'+':'')+diff.toFixed(1)+'℃';
      var diffLYStr=(diffLY===0?'±':diffLY>0?'+':'')+diffLY.toFixed(1)+'℃';
      var diffCls=diff>0?'num-bad':diff<0?'num-good':'';
      var diffLYCls=diffLY>0?'num-bad':diffLY<0?'num-good':'';
      return '<div class="zs-col"><div class="zs-col-head">気温</div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">最高</span><span class="zs-kpi-v">'+(w.max_temp!=null?Number(w.max_temp).toFixed(1)+'℃':'-')+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">最低</span><span class="zs-kpi-v">'+(w.min_temp!=null?Number(w.min_temp).toFixed(1)+'℃':'-')+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">'+(hasLW?'前週差':'前日差')+'</span><span class="zs-kpi-v '+diffCls+'">'+diffStr+'</span></div>'+
        '<div class="zs-kpi"><span class="zs-kpi-l">前年差</span><span class="zs-kpi-v '+diffLYCls+'">'+diffLYStr+'</span></div>'+
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
      var total={budget:tB||NaN,actual:tA||NaN,ratio:tB?Math.round(tA/tB*1000)/10:NaN,ly:tL||NaN,yoy:tL?Math.round(tA/tL*1000)/10:NaN,profit:tP||NaN,grossRate:grossMarginRate(tP,tA),lyProfit:tLP||NaN,profitYoy:yoyRateValue(tP,tLP)};
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
  if(dates.length<2){section.hidden=true;return;}
  var todayD=dates[0];
  var comparison=pickComparisonDate(dates,todayD);
  var prevD=comparison.date;
  if(!prevD){section.hidden=true;return;}
  var isAggr=function(r){return String(r.zone_code||'').padStart(4,'0')==='0000'||r.zone_name==='全社計';};

  // weatherByZone（日付フィルタなし、GAS版に準拠）
  var weatherByZone={};
  (weatherItems||[]).forEach(function(w){if(w.zone)weatherByZone[w.zone]=w;});
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
      if(!m[z])m[z]={total:0,mens:0,ladies:0,totalBudget:0,mensBudget:0,ladiesBudget:0,totalLy:0,mensLy:0,ladiesLy:0,totalProfit:0,mensProfit:0,ladiesProfit:0,totalLyProfit:0,mensLyProfit:0,ladiesLyProfit:0};
      m[z].total+=actual;m[z].totalBudget+=budget;m[z].totalLy+=ly;
      if(!Number.isNaN(profit))m[z].totalProfit+=profit;
      if(!Number.isNaN(lyProfit))m[z].totalLyProfit+=lyProfit;
      if(bcd==='0075'){m[z].mens+=actual;m[z].mensBudget+=budget;m[z].mensLy+=ly;if(!Number.isNaN(profit))m[z].mensProfit+=profit;if(!Number.isNaN(lyProfit))m[z].mensLyProfit+=lyProfit;}
      if(bcd==='0187'){m[z].ladies+=actual;m[z].ladiesBudget+=budget;m[z].ladiesLy+=ly;if(!Number.isNaN(profit))m[z].ladiesProfit+=profit;if(!Number.isNaN(lyProfit))m[z].ladiesLyProfit+=lyProfit;}
    });
    var national=Object.values(m).reduce(function(acc,row){Object.keys(acc).forEach(function(key){acc[key]+=Number(row[key]||0);});return acc;},{total:0,mens:0,ladies:0,totalBudget:0,mensBudget:0,ladiesBudget:0,totalLy:0,mensLy:0,ladiesLy:0,totalProfit:0,mensProfit:0,ladiesProfit:0,totalLyProfit:0,mensLyProfit:0,ladiesLyProfit:0});
    if(national.total>0)m['全社計']=national;
    return m;
  };
  var zTodayD=sumByZoneDetail(bumonRows.filter(function(r){return r.date===todayD;}));
  var zPrevD=sumByZoneDetail(bumonRows.filter(function(r){return r.date===prevD;}));
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
  var catTodayMap=sumCatByZoneBumon((categoryRows||[]).filter(function(r){return r.date===todayD;}));
  var catPrevMap=sumCatByZoneBumon((categoryRows||[]).filter(function(r){return r.date===prevD;}));
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
  var allZoneChanges=Object.keys(zToday).filter(function(z){return (zPrev[z]||0)>=10000&&(zToday[z]||0)>0;}).map(function(z){
    var pct=(zToday[z]-zPrev[z])/zPrev[z]*100;
    var td=zTodayD[z]||{};var pd=zPrevD[z]||{};
    var yoy=td.totalLy?td.total/td.totalLy*100:null;
    var w=weatherByZone[z]||{};
    var hasLW=w.temp_vs_last_week!==''&&w.temp_vs_last_week!==null&&typeof w.temp_vs_last_week!=='undefined';
    var tempDiff=Number(hasLW?w.temp_vs_last_week:(w.temp_vs_yesterday||0));
    var tempCompareLabel=hasLW?'前週差':'前日差';
    var direction=pct>=0?'up':'down';
    return{zone:z,today:zToday[z],prev:zPrev[z],pct:pct,tempDiff:tempDiff,tempCompareLabel:tempCompareLabel,
      todayMens:td.mens||0,prevMens:pd.mens||0,budgetMens:td.mensBudget||0,lyMens:td.mensLy||0,profitMens:td.mensProfit||0,lyProfitMens:td.mensLyProfit||0,
      todayLadies:td.ladies||0,prevLadies:pd.ladies||0,budgetLadies:td.ladiesBudget||0,lyLadies:td.ladiesLy||0,profitLadies:td.ladiesProfit||0,lyProfitLadies:td.ladiesLyProfit||0,
      budgetTotal:td.totalBudget||0,lyTotal:td.totalLy||0,profitTotal:td.totalProfit||0,lyProfitTotal:td.totalLyProfit||0,
      yoy:yoy,budgetRatio:td.totalBudget?td.total/td.totalBudget*100:null,judgment:judgeTwoAxis(pct,yoy),
      grossRateTotal:grossMarginRate(td.totalProfit||0,td.total||0),profitYoy:td.totalLyProfit?td.totalProfit/td.totalLyProfit*100:null,
      grossRateMens:grossMarginRate(td.mensProfit||0,td.mens||0),profitYoyMens:td.mensLyProfit?td.mensProfit/td.mensLyProfit*100:null,
      mensYoy:td.mensLy?td.mens/td.mensLy*100:null,mensBudgetRatio:td.mensBudget?td.mens/td.mensBudget*100:null,
      grossRateLadies:grossMarginRate(td.ladiesProfit||0,td.ladies||0),profitYoyLadies:td.ladiesLyProfit?td.ladiesProfit/td.ladiesLyProfit*100:null,
      ladiesYoy:td.ladiesLy?td.ladies/td.ladiesLy*100:null,ladiesBudgetRatio:td.ladiesBudget?td.ladies/td.ladiesBudget*100:null,
      mainMens:findMainCategory(z,'0075',direction),mainLadies:findMainCategory(z,'0187',direction)};
  }).sort(function(a,b){return b.pct-a.pct;});

  var nationalChange=allZoneChanges.find(function(z){return z.zone==='全社計';});
  var zoneOnlyChanges=allZoneChanges.filter(function(z){return z.zone!=='全社計'&&Math.abs(z.pct)>=10;});
  var zoneUpDown=[].concat(
    nationalChange?[nationalChange]:[],
    zoneOnlyChanges.filter(function(z){return z.pct>0;}).slice(0,3),
    zoneOnlyChanges.filter(function(z){return z.pct<0;}).slice(-3).reverse()
  );
  zoneUpDown.forEach(function(z){
    var isUp=z.pct>0;var tempNote='';
    if(Math.abs(z.tempDiff)>=2){
      var tl='平均気温'+z.tempCompareLabel;
      if(isUp&&z.tempDiff>=2)tempNote=tl+'+'+z.tempDiff.toFixed(1)+'℃ → 気温寄与の可能性';
      else if(isUp&&z.tempDiff<=-2)tempNote=tl+z.tempDiff.toFixed(1)+'℃ → 気温以外の要因で伸長';
      else if(!isUp&&z.tempDiff<=-2)tempNote=tl+z.tempDiff.toFixed(1)+'℃ → 気温寄与の可能性';
      else if(!isUp&&z.tempDiff>=2)tempNote=tl+'+'+z.tempDiff.toFixed(1)+'℃にもかかわらず下落';
    }
    alerts.push({type:isUp?'zone_up':'zone_down',zone:z.zone,pct:z.pct,today:z.today,prev:z.prev,tempNote:tempNote,todayD:todayD,prevD:prevD,
      compareLabel:comparison.label,compareRateLabel:comparison.rateLabel,compareDiffLabel:comparison.diffLabel,
      todayMens:z.todayMens,prevMens:z.prevMens,budgetMens:z.budgetMens,lyMens:z.lyMens,mensYoy:z.mensYoy,mensBudgetRatio:z.mensBudgetRatio,
      profitMens:z.profitMens,lyProfitMens:z.lyProfitMens,grossRateMens:z.grossRateMens,profitYoyMens:z.profitYoyMens,
      todayLadies:z.todayLadies,prevLadies:z.prevLadies,budgetLadies:z.budgetLadies,lyLadies:z.lyLadies,ladiesYoy:z.ladiesYoy,ladiesBudgetRatio:z.ladiesBudgetRatio,
      profitLadies:z.profitLadies,lyProfitLadies:z.lyProfitLadies,grossRateLadies:z.grossRateLadies,profitYoyLadies:z.profitYoyLadies,
      budgetTotal:z.budgetTotal,lyTotal:z.lyTotal,yoy:z.yoy,budgetRatio:z.budgetRatio,judgment:z.judgment,
      profitTotal:z.profitTotal,lyProfitTotal:z.lyProfitTotal,grossRateTotal:z.grossRateTotal,profitYoy:z.profitYoy,
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
      pct:s.pct,diff:s.diff,todayAmt:s.todayAmt,prevAmt:s.prevAmt,yoy:s.yoy,profitAmt:s.profitAmt,profitLyAmt:s.profitLyAmt,
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
    var isZone=a.type==='zone_up'||a.type==='zone_down';
    var cls=isUp?'num-good':'num-bad';
    var arrow=isUp?'▲':'▼';
    var pctStr=(isUp?'+':'')+a.pct.toFixed(1)+'%';
    var yoyStr=isZone?fR(a.yoy):'-';
    var budgetStr=isZone?fR(a.budgetRatio):'-';
    var prevAmt=isZone?a.prev:a.prevAmt;
    var todAmt=isZone?a.today:a.todayAmt;
    var title=isZone
      ?escapeHtml(a.zone)+'：<span class="'+cls+'">'+escapeHtml(a.compareRateLabel)+' '+pctStr+'</span> <span class="'+rCls(a.yoy)+'">前年比 '+yoyStr+'</span> <span class="'+rCls(a.budgetRatio)+'">予算比 '+budgetStr+'</span>'
      :escapeHtml(a.サブカテ名)+'：<span class="'+cls+'">'+escapeHtml(a.compareRateLabel)+' '+pctStr+'</span> <span class="'+cls+'">金額影響 '+escapeHtml(fD(a.diff))+'</span>';
    var label=isZone
      ?escapeHtml(a.zone)+'　ゾーン売上'
      :escapeHtml(a.部門名)+' / '+escapeHtml(a.カテゴリ名)+'（全社計）';
    var judgment=isZone&&a.judgment?'<div class="sales-judgment '+escapeAttribute(a.judgment.className||'')+'">2軸判定：'+escapeHtml(a.judgment.label)+'</div>':'';
    var bumonBreakdown=isZone?'<div class="sales-alert-breakdown">'+
      '<div class="sales-alert-bumon"><div class="sales-alert-bumon-head"><span>メンズ</span><span>'+
        '<span class="'+pCls2(a.todayMens,a.prevMens)+'">'+escapeHtml(a.compareLabel)+' '+fR(a.prevMens?(a.todayMens-a.prevMens)/a.prevMens*100:null)+'</span> '+
        '<span class="'+rCls(a.mensYoy)+'">前年 '+fR(a.mensYoy)+'</span> '+
        '<span class="'+rCls(a.mensBudgetRatio)+'">予算 '+fR(a.mensBudgetRatio)+'</span> '+
        '<span class="sales-alert-amount">'+fY(a.prevMens)+' → '+fY(a.todayMens)+'</span>'+
      '</span></div>'+
      '<div class="sales-alert-main">'+fmtMain(a.mainMens)+'</div>'+
      grossLine(a.profitMens,a.grossRateMens,a.profitYoyMens)+'</div>'+
      '<div class="sales-alert-bumon"><div class="sales-alert-bumon-head"><span>レディース</span><span>'+
        '<span class="'+pCls2(a.todayLadies,a.prevLadies)+'">'+escapeHtml(a.compareLabel)+' '+fR(a.prevLadies?(a.todayLadies-a.prevLadies)/a.prevLadies*100:null)+'</span> '+
        '<span class="'+rCls(a.ladiesYoy)+'">前年 '+fR(a.ladiesYoy)+'</span> '+
        '<span class="'+rCls(a.ladiesBudgetRatio)+'">予算 '+fR(a.ladiesBudgetRatio)+'</span> '+
        '<span class="sales-alert-amount">'+fY(a.prevLadies)+' → '+fY(a.todayLadies)+'</span>'+
      '</span></div>'+
      '<div class="sales-alert-main">'+fmtMain(a.mainLadies)+'</div>'+
      grossLine(a.profitLadies,a.grossRateLadies,a.profitYoyLadies)+'</div></div>':'';
    var subcatMetrics='';var subcatTempBlock='';var subcatZoneBlock='';
    if(!isZone){
      var mb=function(lbl,val,cls2){return'<div class="sa-mb"><div class="sa-mb-l">'+escapeHtml(lbl)+'</div><div class="sa-mb-v '+(cls2||'')+'">'+val+'</div></div>';};
      var scPct=a.pct===null?'-':(a.pct>=0?'+':'')+a.pct.toFixed(1)+'%';
      subcatMetrics='<div class="sa-metrics">'+
        mb('実績',fY(a.todayAmt))+
        mb('前週同曜日差',fD(a.diff),isUp?'num-good':'num-bad')+
        mb('前週同曜日比',scPct,isUp?'num-good':'num-bad')+
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
      (isZone?'<div style="font-size:13px;color:var(--muted)">合計　'+escapeHtml(a.compareLabel)+'（'+escapeHtml(a.prevD)+'）'+fY(a.prev)+' → 本日 '+fY(a.today)+' / 予算 '+fY(a.budgetTotal)+' / 前年同週 '+fY(a.lyTotal)+'</div>'+grossLine(a.profitTotal,a.grossRateTotal,a.profitYoy)+judgment+bumonBreakdown+(a.tempNote?'<div class="action" style="font-size:12px;margin-top:6px">🌡️ '+escapeHtml(a.tempNote)+'</div>':''):subcatMetrics+subcatTempBlock+subcatZoneBlock)+
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
    return pickComparisonDate(allDataDates,dateSelect.value);
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
    cards.innerHTML=sorted.slice(0,12).map(function(row){
      return '<article class="card product-card"><div class="meta"><span>'+escapeHtml(row.bumonName)+'</span><span>'+escapeHtml(row.categoryName)+'</span></div><div class="product-card-title">'+escapeHtml(row.subcategoryName)+'</div><div class="product-kpi-grid"><div><span>実績</span><strong>'+formatYen(row.amount)+'</strong></div><div><span>前週差</span><strong class="'+(row.dayDiff>=0?'num-good':'num-bad')+'">'+formatSignedYen(row.dayDiff)+'</strong></div><div><span>前週比</span><strong class="'+(row.dayDiff>=0?'num-good':'num-bad')+'">'+pctText(row.dayPct,true)+'</strong></div><div><span>前年比</span><strong class="'+pctClass(row.yoy)+'">'+pctText(row.yoy)+'</strong></div><div><span>荒利</span><strong>'+(row.hasProfit?formatYen(row.profit):'-')+'</strong></div><div><span>粗利率</span><strong>'+formatPct(row.grossRate)+'</strong></div></div></article>';
    }).join('')||'<div class="empty">条件に合う商品実績はありません。</div>';
    tbody.innerHTML=sorted.slice(0,80).map(function(row){
      return '<tr><td>'+escapeHtml(row.bumonName)+'</td><td>'+escapeHtml(row.categoryName)+'</td><td>'+escapeHtml(row.subcategoryName)+'</td><td class="num">'+formatYen(row.amount)+'</td><td class="num">'+(row.prevDate?formatYen(row.prevAmount):'-')+'</td><td class="num '+(row.dayDiff>=0?'num-good':'num-bad')+'">'+formatSignedYen(row.dayDiff)+'</td><td class="num '+(row.dayDiff>=0?'num-good':'num-bad')+'">'+pctText(row.dayPct,true)+'</td><td class="num">'+(row.hasLy?formatYen(row.lyAmount):'-')+'</td><td class="num '+pctClass(row.yoy)+'">'+pctText(row.yoy)+'</td><td class="num">'+(row.hasProfit?formatYen(row.profit):'-')+'</td><td class="num">'+formatPct(row.grossRate)+'</td><td class="num">'+(row.hasLyProfit?formatYen(row.lyProfit):'-')+'</td><td class="num '+pctClass(row.profitYoy)+'">'+pctText(row.profitYoy)+'</td><td>-</td><td>-</td><td>-</td></tr>';
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