const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');

const context = {
  console,
  fetch: async () => ({ ok: true, json: async () => ({}) }),
  setTimeout,
  clearTimeout,
  document: {
    addEventListener() {},
    querySelectorAll() { return []; },
    getElementById() {
      return {
        textContent: '',
        innerHTML: '',
        hidden: false,
        value: '',
        addEventListener() {},
        querySelectorAll() { return []; }
      };
    }
  },
  window: {}
};

vm.createContext(context);
vm.runInContext(
  source + `
window.__dashboardTest = {
  state,
  renderDashboard,
  setRenderSales(fn) { renderSales = fn; },
  setNoop(name, fn) { this[name] = fn; }
};`,
  context,
  { filename: 'dashboard.js' }
);

[
  'hideError',
  'renderModeBar',
  'buildImportantAlerts',
  'renderTodayAlerts',
  'renderSalesAlerts',
  'renderWeather',
  'renderCategory',
  'renderProductAnalysis',
  'renderNews',
  'renderReviewNews',
  'renderTags'
].forEach((name) => {
  vm.runInContext(`${name} = function noop() { return []; };`, context);
});

let capturedWeather = null;
context.captureSales = function captureSales(_rows, _dates, weatherItems) {
  capturedWeather = weatherItems;
};
context.window.__dashboardTest.setRenderSales(context.captureSales);

context.window.__dashboardTest.state.dateMode = 'weekly';
context.window.__dashboardTest.state.weekKey = '';
context.window.__dashboardTest.renderDashboard({
  updatedAt: 'test',
  weatherLatest: [
    {
      date: '2026-04-27',
      zone: '北海道',
      area_name: '北海道',
      max_temp: 16.5,
      min_temp: 8.7,
      rain_mm: 0,
      temp_vs_last_week: -1.5,
      temp_vs_last_year_same_weekday: -0.2
    }
  ],
  weatherTrend: [
    {
      date: '2026-05-04',
      zone: '北海道',
      area_name: '北海道',
      max_temp: 24.1,
      min_temp: 11.2,
      rain_mm: 1,
      temp_vs_last_week: 2.1,
      temp_vs_last_year_same_weekday: 0.4
    },
    {
      date: '2026-05-05',
      zone: '北海道',
      area_name: '北海道',
      max_temp: 30.0,
      min_temp: 10.1,
      rain_mm: 2,
      temp_vs_last_week: 4.1,
      temp_vs_last_year_same_weekday: 1.4
    }
  ],
  legwearBumon: [
    { date: '2026-05-04', zone_code: '0000', zone_name: '全社計', '部門CD': '0075', '部門名': 'メンズ', '売上実績': 100, '売上予算': 100, '前年同週同曜日実績': 90 },
    { date: '2026-05-04', zone_code: '0001', zone_name: '北海道', '部門CD': '0075', '部門名': 'メンズ', '売上実績': 50, '売上予算': 50, '前年同週同曜日実績': 40 }
  ],
  legwearCategory: [],
  legwearDates: ['2026-05-04'],
  zoneOrder: ['北海道']
});

assert(capturedWeather, 'renderSales should receive weather items');
const hokkaido = capturedWeather.find((item) => item.zone === '北海道');
assert(hokkaido, 'renderSales should receive selected-week weather for 北海道');
assert.strictEqual(hokkaido.max_temp, 30.0);
assert.strictEqual(hokkaido.min_temp, 10.1);
assert.strictEqual(hokkaido.temp_vs_last_week, 3.1);
