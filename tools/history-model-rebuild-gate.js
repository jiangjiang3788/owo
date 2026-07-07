#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error('[history-model-rebuild-gate] ' + message); process.exit(1); } }
const required = [
  'js/core/memoryBrain/historyModelRebuildSemantics.js',
  'js/platform/memoryBrain/historyModelRebuildStore.js',
  'js/features/memoryBrain/historyModelRebuildService.js',
  'js/features/memoryBrain/historyModelRebuildView.js',
  'css/modules/memory_brain_history_models.css',
  'docs/0.4/release-v0.4.7-plan.md'
];
required.forEach(file => assert(fs.existsSync(path.join(root, file)), `missing ${file}`));
const index = read('index.html');
required.slice(0, 5).forEach(file => assert(index.includes(file), `index missing ${file}`));
assert(index.indexOf('historyModelRebuildSemantics.js') < index.indexOf('js/core/memoryBrain/public.js'), 'history model semantics must load before core public');
assert(index.indexOf('historyModelRebuildStore.js') < index.indexOf('js/platform/memoryBrain/public.js'), 'history model store must load before platform public');
assert(index.indexOf('historyModelRebuildService.js') < index.indexOf('js/features/memoryBrain/view.js'), 'history model service must load before memory brain view');
assert(index.indexOf('historyModelRebuildView.js') < index.indexOf('js/features/memoryBrain/view.js'), 'history model view must load before memory brain view');
const semantics = read('js/core/memoryBrain/historyModelRebuildSemantics.js');
assert(semantics.includes('duplicate') && semantics.includes('obsolete') && semantics.includes('disputed'), 'semantics must exclude duplicate / obsolete / disputed facts');
assert(semantics.includes('interaction-preferences') && semantics.includes('relationship-continuity'), 'semantics must require new full-history model types');
const modelSemantics = read('js/core/memoryBrain/modelSemantics.js');
assert(modelSemantics.includes("id: 'interaction-preferences'") && modelSemantics.includes("id: 'relationship-continuity'"), 'model semantics must know 6 model types');
const store = read('js/platform/memoryBrain/historyModelRebuildStore.js');
assert(store.includes('historyModelRebuildRuns'), 'store must write historyModelRebuildRuns');
assert(store.includes('formalPromptInjection: false'), 'store must declare no formal prompt injection');
const modelStore = read('js/platform/memoryBrain/memoryModelStore.js');
assert(modelStore.includes('history-long-term-model'), 'memoryModelStore must support history-long-term-model batches');
const service = read('js/features/memoryBrain/historyModelRebuildService.js');
assert(service.includes("task: 'memory-persona'"), 'service must route through memory-persona task');
assert(service.includes('writesLegacyMemory: false') && service.includes('formalPromptInjection: false'), 'service must declare shadow-only boundary');
assert(!service.includes('promptSemantics') && !service.includes('sendMessage(') && !service.includes('getAiReply('), 'service must not touch formal chat prompt/send pipeline');
const publicApi = read('js/platform/memoryBrain/public.js');
assert(publicApi.includes('appendHistoryModelRebuildRun') && publicApi.includes('getHistoryModelRebuildSnapshot'), 'platform public must expose history model APIs');
const view = read('js/features/memoryBrain/view.js');
assert(view.includes('memory-brain-rebuild-history-models-btn'), 'view must expose rebuild button');
assert(view.includes('memory-brain-rollback-history-models-btn'), 'view must expose rollback button');
console.log('[history-model-rebuild-gate] ok');
