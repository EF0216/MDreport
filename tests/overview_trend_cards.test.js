const assert = require('assert');
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'dashboard.html'), 'utf8');
const js = fs.readFileSync(path.join(root, 'dashboard.js'), 'utf8');

assert.match(html, /id="overviewTrendCards"/, 'important tab should include a trend-card mount point');
assert.match(html, /overview-trend-grid/, 'important tab trend cards should have responsive grid CSS');
assert.match(html, /overview-trend-card/, 'important tab trend cards should have card styling');
assert.match(html, /overview-trend-axis/, 'trend cards should have date labels below each sparkline');
assert.doesNotMatch(html, /background:\s*#111827/, 'overview trend cards should not use a floating dark panel background');
assert.doesNotMatch(html, /border:\s*1px solid #273448/, 'overview trend cards should not use dark-panel borders');
assert.match(html, /overview-trend-card[^}]*background:\s*#fff/, 'overview trend cards should use a light surface that fits the page');

assert.match(js, /function\s+renderOverviewTrendCards/, 'dashboard.js should render important-tab trend cards');
assert.match(js, /function\s+buildOverviewTrendCards/, 'dashboard.js should build trend card metrics');
assert.match(js, /function\s+sparklineSvg/, 'dashboard.js should render compact sparklines');
assert.match(js, /function\s+sparklineDateLabels/, 'dashboard.js should build compact date labels for sparklines');
assert.match(js, /function\s+formatSparklineDate/, 'dashboard.js should format dates for trend card axes');
assert.match(js, /function\s+overviewTemperatureContext/, 'dashboard.js should build national temperature forecast metrics');
assert.match(js, /function\s+temperatureRangeLabel/, 'dashboard.js should render national high and low temperatures');
assert.match(js, /function\s+temperatureSparklineSvg/, 'temperature KPI should render a multi-series temperature chart');
assert.match(js, /function\s+temperatureTrendLegend/, 'temperature KPI should render a legend for the multi-series chart');
assert.match(js, /全国気温予報/, 'overview trend cards should show forecast temperature, not alert count');
assert.match(js, /最高/, 'temperature forecast card should include national high temperature');
assert.match(js, /最低/, 'temperature forecast card should include national low temperature');
assert.match(js, /最高気温/, 'temperature chart legend should include high temperature');
assert.match(js, /最低気温/, 'temperature chart legend should include low temperature');
assert.match(js, /昨年最高/, 'temperature chart legend should include last-year high temperature');
assert.match(js, /昨年最低/, 'temperature chart legend should include last-year low temperature');
assert.match(js, /isForecast/, 'temperature chart should mark forecast dates');
assert.match(js, /lastYearHigh/, 'temperature chart should plot last-year high temperature');
assert.match(js, /lastYearLow/, 'temperature chart should plot last-year low temperature');
assert.doesNotMatch(js, /label:\s*'気温アラート'/, 'overview trend cards should not use weather alert count as the weather KPI');
assert.match(js, /overview-trend-axis/, 'renderer should output date labels below the line graph');
assert.match(js, /renderOverviewTrendCards\(data\)/, 'renderDashboard should add trend cards to the original important tab');
assert.match(js, /overviewTrendCards/, 'renderer should target the important-tab mount point');
