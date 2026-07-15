const assert = require('assert');
const fs = require('fs');
const path = require('path');

const source = fs.readFileSync(path.join(__dirname, '..', 'dashboard.js'), 'utf8');

assert(
  source.includes("./data/legwear_category_daily.json?t="),
  'dashboard should load the split category mirror'
);
assert(
  /data\.legwearCategory\s*=\s*categoryRows/.test(source),
  'dashboard should merge category mirror rows into dashboard data'
);
assert(
  source.includes('categoryRes.ok'),
  'dashboard should only use a successful category response'
);

console.log('category mirror loader regression test passed');
