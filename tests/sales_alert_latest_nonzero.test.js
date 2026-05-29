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

const data = {
  updatedAt: 'test',
  weatherLatest: [{ date: '2026-05-29', zone: '東北', temp_vs_last_week: 1.2 }],
  weatherTrend: [],
  legwearBumon: [
    { date: '2026-05-28', zone_code: 34, zone_name: '東北', '部門CD': 75, '部門名': 'メンズ', '売上予算': 10000, '売上実績': 0, '前年同週同曜日実績': 0 },
    { date: '2026-05-27', zone_code: 34, zone_name: '東北', '部門CD': 75, '部門名': 'メンズ', '売上予算': 10000, '売上実績': 25000, '前年同週同曜日実績': 20000 },
    { date: '2026-05-20', zone_code: 34, zone_name: '東北', '部門CD': 75, '部門名': 'メンズ', '売上予算': 10000, '売上実績': 15000, '前年同週同曜日実績': 12000 }
  ],
  legwearCategory: [],
  legwearDates: ['2026-05-28', '2026-05-27', '2026-05-20'],
  zoneOrder: ['東北']
};

context.window.__dashboardTest.state.dateMode = 'daily';
context.window.__dashboardTest.renderDashboard(data);

assert.strictEqual(elements.salesAlertSection.hidden, false);
assert.match(elements.salesAlertCount.textContent, /件$/);
assert.match(elements.salesAlerts.innerHTML, /2026-05-27/);
assert.doesNotMatch(elements.salesAlerts.innerHTML, /2026-05-28/);
