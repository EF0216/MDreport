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
  renderWeatherKpiColumn,
  renderSalesAlertWeatherCompact,
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
      last_year_rain_mm: 0.5,
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
      last_year_rain_mm: 1.5,
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
// 週別の降水量: 今年合計 1+2=3、昨年合計 0.5+1.5=2、前年差 +1
assert.strictEqual(hokkaido.rain_mm, 3);
assert.strictEqual(hokkaido.last_year_rain_mm, 2);
assert.strictEqual(hokkaido.rain_vs_last_year_same_weekday, 1);

const weeklyWeather = {
  avg_temp: 22.2,
  max_temp: 30,
  min_temp: 10,
  last_year_avg_temp: 21.1,
  last_year_max_temp: 28,
  last_year_min_temp: 8,
  temp_vs_last_week: -1.2,
  temp_vs_last_year_same_weekday: 1.1,
  rain_mm: 3,
  rain_vs_last_week: -0.5,
  rain_vs_last_year_same_weekday: 1,
  humidity_avg: 72,
  humidity_vs_last_year_same_weekday: -2
};
const weeklyKpiHtml = context.window.__dashboardTest.renderWeatherKpiColumn(weeklyWeather);
assert(
  weeklyKpiHtml.includes('22.2'),
  'weekly sales weather KPI should display average temperature when avg_temp is available'
);
assert(
  !weeklyKpiHtml.includes('30.0'),
  'weekly sales weather KPI should not use the one-day high as the primary temperature'
);

const weeklyCompactHtml = context.window.__dashboardTest.renderSalesAlertWeatherCompact(weeklyWeather);
assert(
  weeklyCompactHtml.includes('22.2'),
  'compact weekly alert weather should display average temperature when avg_temp is available'
);
assert(
  !weeklyCompactHtml.includes('30.0/10.0'),
  'compact weekly alert weather should not display the max/min pair as the primary temperature'
);

console.log('sales weather weekly ok');
