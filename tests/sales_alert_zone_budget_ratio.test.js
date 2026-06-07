const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');

function makeEl(id) {
  return {
    id,
    textContent: '',
    innerHTML: '',
    hidden: false,
    value: '',
    dataset: {},
    style: {},
    classList: { toggle() {}, add() {}, remove() {} },
    addEventListener() {},
    querySelectorAll() { return []; },
    querySelector() { return null; }
  };
}

const elements = {};
[
  'updatedAt',
  'overviewModeBar',
  'weatherModeBar',
  'salesModeBar',
  'categoryModeBar',
  'newsModeBar',
  'todayAlerts',
  'alertCount',
  'overviewTrendCards',
  'salesAlertSection',
  'salesAlerts',
  'salesAlertCount',
  'errorBox',
  'loadingStatus'
].forEach((id) => { elements[id] = makeEl(id); });

const context = {
  console,
  fetch: async () => ({ ok: true, json: async () => ({}) }),
  setTimeout,
  clearTimeout,
  document: {
    addEventListener() {},
    querySelectorAll() { return []; },
    getElementById(id) {
      return elements[id] || (elements[id] = makeEl(id));
    }
  },
  window: { requestAnimationFrame(fn) { fn(); } }
};

vm.createContext(context);
vm.runInContext(
  source + `
window.__dashboardTest = { state, renderDashboard };
`,
  context,
  { filename: 'dashboard.js' }
);

[
  'renderWeather',
  'renderSales',
  'renderCategory',
  'renderProductAnalysis',
  'renderNews',
  'renderReviewNews',
  'renderTags'
].forEach((name) => {
  vm.runInContext(`${name} = function noop() {};`, context);
});

const currentDate = '2026-06-06';
const prevDate = '2026-05-30';
const zones = [
  { name: '高予算A', actual: 140000, budget: 100000, prev: 300000, ly: 120000 },
  { name: '高予算B', actual: 120000, budget: 100000, prev: 80000, ly: 110000 },
  { name: '高予算C', actual: 110000, budget: 100000, prev: 90000, ly: 100000 },
  { name: '低予算A', actual: 60000, budget: 100000, prev: 30000, ly: 90000 },
  { name: '低予算B', actual: 80000, budget: 100000, prev: 200000, ly: 85000 },
  { name: '低予算C', actual: 90000, budget: 100000, prev: 95000, ly: 95000 }
];

const legwearBumon = zones.flatMap((zone, index) => ([
  {
    date: currentDate,
    zone_code: String(index + 1).padStart(4, '0'),
    zone_name: zone.name,
    '部門CD': '0075',
    '部門名': 'メンズレッグウェア',
    '売上予算': zone.budget,
    '売上実績': zone.actual,
    '前年同週同曜日実績': zone.ly,
    '販売荒利高': Math.round(zone.actual * 0.32),
    '前年荒利高': Math.round(zone.ly * 0.31)
  },
  {
    date: prevDate,
    zone_code: String(index + 1).padStart(4, '0'),
    zone_name: zone.name,
    '部門CD': '0075',
    '部門名': 'メンズレッグウェア',
    '売上予算': zone.budget,
    '売上実績': zone.prev,
    '前年同週同曜日実績': zone.ly,
    '販売荒利高': Math.round(zone.prev * 0.3),
    '前年荒利高': Math.round(zone.ly * 0.31)
  }
]));

context.window.__dashboardTest.state.dateMode = 'daily';
context.window.__dashboardTest.renderDashboard({
  updatedAt: 'test',
  weatherLatest: zones.map((zone, index) => ({
    date: currentDate,
    zone: zone.name,
    area_name: zone.name,
    max_temp: 23.4 + index,
    min_temp: 17.8 + index,
    rain_mm: 1.2 + index,
    rain_vs_last_week: -0.8,
    rain_vs_last_year_same_weekday: 0.4,
    temp_vs_last_week: -1.7,
    temp_vs_last_year_same_weekday: 2.5,
    humidity_avg: 73 + index,
    humidity_vs_last_year_same_weekday: 4.2
  })),
  weatherTrend: [],
  legwearBumon,
  legwearCategory: [],
  legwearDates: [currentDate, prevDate],
  zoneOrder: zones.map((zone) => zone.name)
});

const html = elements.salesAlerts.innerHTML;

assert.strictEqual(elements.salesAlertSection.hidden, false);
assert.match(html, /全社計/);
assert.match(html, /全国/);
assert.match(html, /高予算A/);
assert.match(html, /高予算B/);
assert.match(html, /高予算C/);
assert.match(html, /低予算A/);
assert.match(html, /低予算B/);
assert.match(html, /低予算C/);
assert.match(html, /予算比 140\.0%/);
assert.match(html, /予算比 60\.0%/);
assert.match(html, /予算差 \+40,000円/);
assert.match(html, /予算差 -40,000円/);
assert.match(html, /予算比上位/);
assert.match(html, /予算比下位/);
assert.match(html, /気温/);
assert.match(html, /最高/);
assert.match(html, /23\.4℃/);
assert.match(html, /湿度/);
assert.match(html, /73\.0%/);

const firstHigh = html.indexOf('高予算A');
const firstLow = html.indexOf('低予算A');
const national = html.indexOf('全社計');
assert(national !== -1 && national < firstHigh, 'national total should render before budget-ratio zone winners');
assert(firstHigh !== -1 && firstLow !== -1 && firstHigh < firstLow, 'budget-ratio winners should render before losers');

console.log('sales alert zone budget ratio ok');
