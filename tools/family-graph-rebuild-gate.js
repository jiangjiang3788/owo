#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error('[family-graph-rebuild-gate] ' + message); process.exit(1); } }
const required = [
  'js/platform/memoryBrain/familyGraphRebuildStore.js',
  'js/features/memoryBrain/familyGraphRebuildService.js',
  'js/features/memoryBrain/familyGraphRebuildView.js',
  'css/modules/memory_brain_rebuild.css',
  'docs/0.4/release-v0.4.6-plan.md'
];
required.forEach(file => assert(fs.existsSync(path.join(root, file)), `missing ${file}`));
const index = read('index.html');
required.slice(0, 4).forEach(file => assert(index.includes(file), `index missing ${file}`));
assert(index.indexOf('familyGraphRebuildStore.js') < index.indexOf('js/platform/memoryBrain/public.js'), 'rebuild store must load before platform public');
assert(index.indexOf('familyGraphRebuildService.js') < index.indexOf('js/features/memoryBrain/view.js'), 'rebuild service must load before memory brain view');
assert(index.indexOf('familyGraphRebuildView.js') < index.indexOf('js/features/memoryBrain/view.js'), 'rebuild view must load before memory brain view');
const store = read('js/platform/memoryBrain/familyGraphRebuildStore.js');
assert(store.includes("family-graph-rebuild-reset"), 'store must create reset batch');
assert(store.includes("family-graph-rebuild"), 'store must create meta rebuild batch');
assert(store.includes('formalPromptInjection: false'), 'store routing report must forbid formal prompt injection');
const service = read('js/features/memoryBrain/familyGraphRebuildService.js');
assert(service.includes('excludeLifecycle: true'), 'service must exclude duplicate / obsolete / disputed facts');
assert(service.includes('eligibleFactIds'), 'service must pass eligible fact ids to family and graph owners');
assert(service.includes('writesLegacyMemory') && service.includes('false'), 'service input must declare no legacy write');
const familyService = read('js/features/memoryBrain/familyService.js');
const graphService = read('js/features/memoryBrain/graphService.js');
assert(familyService.includes('isEligibleFactForFamily'), 'familyService must support eligible fact filtering');
assert(graphService.includes('isEligibleFactForGraph'), 'graphService must support eligible fact filtering');
console.log('[family-graph-rebuild-gate] ok');
