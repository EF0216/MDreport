const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = path.resolve(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');

const context = {
  console,
  document: {
    readyState: 'loading',
    addEventListener() {},
    querySelectorAll() { return []; },
    getElementById() { return null; }
  },
  window: {}
};

vm.createContext(context);
vm.runInContext(
  source + `
window.__overviewCardTest = {
  state,
  overviewTemperatureContext,
  sparklineSvg,
  temperatureSparklineSvg,
  buildOverviewTrendCards
};`,
  context,
  { filename: 'dashboard.js' }
);

const api = context.window.__overviewCardTest;

api.state.dateMode = 'daily';

const weatherData = {
  weatherLatest: [{ date: '2026-06-03' }],
  weatherTrend: [
    { date: '2026-05-23', zone: 'A', max_temp: 23, min_temp: 13, last_year_max_temp: 21, last_year_min_temp: 11, source: 'actual' },
    { date: '2026-05-24', zone: 'A', max_temp: 25, min_temp: 14, last_year_max_temp: 22, last_year_min_temp: 12, source: 'actual' },
    { date: '2026-06-03', zone: 'A', max_temp: 30, min_temp: 16, last_year_max_temp: 28, last_year_min_temp: 13, source: 'actual' },
    { date: '2026-06-04', zone: 'A', max_temp: 31, min_temp: 17, last_year_max_temp: 0, last_year_min_temp: 0, source: 'forecast' },
    { date: '2026-06-05', zone: 'A', max_temp: 32, min_temp: 18, last_year_max_temp: 0, last_year_min_temp: 0, source: 'forecast' }
  ]
};

const temperature = api.overviewTemperatureContext(weatherData);
assert(
  temperature.series.some((item) => item.date === '2026-05-23'),
  'daily temperature card should keep observed history before the forecast window so last-year lines have context'
);
assert(
  Number.isNaN(temperature.series.find((item) => item.date === '2026-06-04').lastYearHigh),
  'forecast placeholder 0 should not be plotted as a real last-year high temperature'
);
assert.match(
  api.temperatureSparklineSvg(temperature.series),
  /stroke-dasharray/,
  'temperature chart should render visible dashed last-year lines when history has last-year values'
);

const cards = api.buildOverviewTrendCards({
  weatherLatest: weatherData.weatherLatest,
  weatherTrend: weatherData.weatherTrend,
  legwearBumon: [
    { date: '2026-06-05', zone_code: 0, zone_name: '全社計', '部門CD': 187, '部門名': 'レディースレッグウェア', '売上予算': 2977200, '売上実績': 2848355, '前年同週同曜日実績': 2773970, '販売荒利高': 937805, '前年荒利高': 956978 },
    { date: '2026-06-05', zone_code: 0, zone_name: '全社計', '部門CD': 75, '部門名': 'メンズレッグウェア', '売上予算': 2955100, '売上実績': 2959998, '前年同週同曜日実績': 2636840, '販売荒利高': 980080, '前年荒利高': 862878 },
    { date: '2026-06-05', zone_code: 1, zone_name: 'A', '部門CD': 187, '部門名': 'レディースレッグウェア', '売上予算': 2977200, '売上実績': 2848355, '前年同週同曜日実績': 2773970, '販売荒利高': 937805, '前年荒利高': 956978 },
    { date: '2026-06-05', zone_code: 1, zone_name: 'A', '部門CD': 75, '部門名': 'メンズレッグウェア', '売上予算': 2955100, '売上実績': 2959998, '前年同週同曜日実績': 2636840, '販売荒利高': 980080, '前年荒利高': 862878 },
    { date: '2026-05-29', zone_code: 1, zone_name: 'A', '部門CD': 187, '部門名': 'レディースレッグウェア', '売上予算': 100, '売上実績': 500, '前年同週同曜日実績': 480, '販売荒利高': 180, '前年荒利高': 170 }
  ]
});

assert.strictEqual(cards[0].label, 'レッグウェア売上(最新)');
assert.strictEqual(cards[0].value, '581万');
assert.match(cards[0].foot, /6\/5 合計/);
assert.match(cards[0].foot, /レディース285万/);
assert.match(cards[0].foot, /メンズ296万/);
assert(
  cards[4].dates.length >= 5,
  'wide temperature card should show more date labels than compact sales cards'
);

const salesScaleSvg = api.sparklineSvg([5000000, 5808353, 6100000], 'down', { type: 'yen' });
assert.match(salesScaleSvg, /overview-scale-grid/, 'compact trend charts should include horizontal scale gridlines');
assert.match(salesScaleSvg, /万/, 'sales trend scale should use compact yen labels');
assert.match(salesScaleSvg, /font-size="9"/, 'compact trend scale labels should be large enough to read');
assert.match(salesScaleSvg, /fill="#334e68"/, 'compact trend scale labels should use a readable light-theme color');
assert.match(salesScaleSvg, /stroke="#ffffff"/, 'compact trend scale labels should keep a light outline for contrast');
assert.match(salesScaleSvg, /stroke="#d8e2ec"/, 'compact trend gridlines should use the page border color');
assert.match(salesScaleSvg, /paint-order="stroke"/, 'compact trend scale labels should preserve an outline for contrast');

const pctScaleSvg = api.sparklineSvg([95.2, 97.9, 107.3], 'good', { type: 'pct' });
assert.match(pctScaleSvg, /%/, 'rate trend scale should include percent labels');
assert.match(api.temperatureSparklineSvg(temperature.series), /font-size="9"/, 'temperature trend scale labels should also be large enough to read');
