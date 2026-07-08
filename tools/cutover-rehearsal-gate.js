#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error('[cutover-rehearsal-gate] ' + message); process.exit(1); } }
const required = [
  'js/core/memoryBrain/cutoverComparisonSemantics.js',
  'js/platform/memoryBrain/memoryCutoverReportStore.js',
  'js/features/memoryBrain/cutoverRehearsalService.js',
  'js/features/memoryBrain/cutoverRehearsalView.js',
  'css/modules/memory_brain_cutover.css',
  'docs/0.4/release-v0.4.8-plan.md'
];
required.forEach(file => assert(fs.existsSync(path.join(root, file)), `missing ${file}`));
const index = read('index.html');
required.slice(0, 5).forEach(file => assert(index.includes(file), `index missing ${file}`));
assert(index.indexOf('cutoverComparisonSemantics.js') < index.indexOf('js/core/memoryBrain/public.js'), 'cutover semantics must load before core public');
assert(index.indexOf('memoryCutoverReportStore.js') < index.indexOf('js/platform/memoryBrain/public.js'), 'cutover store must load before platform public');
assert(index.indexOf('cutoverRehearsalService.js') < index.indexOf('js/features/memoryBrain/view.js'), 'cutover service must load before view');
assert(index.indexOf('cutoverRehearsalView.js') < index.indexOf('js/features/memoryBrain/view.js'), 'cutover view must load before view');
const semantics = read('js/core/memoryBrain/cutoverComparisonSemantics.js');
assert(semantics.includes('readyForFormalCutover: false') && semantics.includes('blocked-until-v0.9'), 'semantics must keep formal cutover blocked');
const store = read('js/platform/memoryBrain/memoryCutoverReportStore.js');
assert(store.includes('cutoverReports') && store.includes('cutoverRehearsalRuns') && store.includes("kind: 'cutover-rehearsal'"), 'store must write cutover reports/runs/batches');
assert(store.includes('formalPromptInjection: false') && store.includes('noDualInjection'), 'store must forbid formal injection and dual injection');
const service = read('js/features/memoryBrain/cutoverRehearsalService.js');
assert(service.includes('buildActiveLegacyMemoryContextBlock'), 'service must compare official legacy memory block when available');
assert(service.includes('buildMemoryInjectionPackage'), 'service must build Memory Brain shadow package');
assert(service.includes('writesLegacyMemory: false') && service.includes('formalPromptInjection: false'), 'service must declare shadow-only boundary');
assert(!service.includes('promptSemantics') && !service.includes('sendMessage(') && !service.includes('getAiReply('), 'service must not touch formal chat pipeline');
const publicApi = read('js/platform/memoryBrain/public.js');
assert(publicApi.includes('appendCutoverRehearsalBatch') && publicApi.includes('rollbackCutoverRehearsalBatch'), 'platform public must expose cutover APIs');
const featurePublic = read('js/features/memoryBrain/public.js');
assert(featurePublic.includes('runCutoverRehearsal') && featurePublic.includes('getCutoverRehearsalCards'), 'feature public must expose cutover rehearsal APIs');
const view = read('js/features/memoryBrain/view.js');
assert(view.includes('memory-brain-run-cutover-btn') && view.includes('memory-brain-rollback-cutover-btn'), 'view must expose cutover run and rollback buttons');
console.log('[cutover-rehearsal-gate] ok');
