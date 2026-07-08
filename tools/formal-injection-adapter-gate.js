#!/usr/bin/env node
/* Memory Brain v0.6.0 gate: formal injection adapter exists, but prompt remains blocked until v0.9. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = process.cwd();
let hasError = false;
function read(rel) { return fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : ''; }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function error(msg) { hasError = true; console.error('❌ ' + msg); }
function ok(msg) { console.log('✅ ' + msg); }
function requireFile(rel) { exists(rel) ? ok('存在：' + rel) : error('缺少文件：' + rel); }
function requireContains(rel, token) { if (!read(rel).includes(token)) error(`${rel} 缺少 ${token}`); else ok(`${rel} 包含 ${token}`); }
function forbidContains(rel, tokens) { const text = read(rel); tokens.forEach(token => { if (text.includes(token)) error(`${rel} 不应包含 ${token}`); }); }
function indexOf(script) { return read('index.html').indexOf(`src="${script}"`); }
function requireBefore(a, b) { const ia = indexOf(a), ib = indexOf(b); if (ia < 0) error('index.html 未加载 ' + a); if (ib < 0) error('index.html 未加载 ' + b); if (ia >= 0 && ib >= 0 && ia > ib) error(`${a} 必须在 ${b} 前加载`); else if (ia >= 0 && ib >= 0) ok(`${a} 在 ${b} 前加载`); }
function load(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }
console.log('OWO Memory Brain gate · v0.6.0 formal injection adapter\n');
[
  'js/core/memoryBrain/formalInjectionAdapterSemantics.js',
  'js/platform/memoryBrain/memoryFormalInjectionStore.js',
  'js/features/memoryBrain/formalInjectionAdapterService.js',
  'js/features/memoryBrain/formalInjectionAdapterView.js',
  'css/modules/memory_brain_formal_adapter.css',
  'docs/0.6/release-v0.6.0-plan.md'
].forEach(requireFile);
requireContains('index.html', 'css/modules/memory_brain_formal_adapter.css');
requireBefore('js/core/memoryBrain/formalInjectionAdapterSemantics.js', 'js/core/memoryBrain/public.js');
requireBefore('js/platform/memoryBrain/memoryFormalInjectionStore.js', 'js/platform/memoryBrain/public.js');
requireBefore('js/features/memoryBrain/formalInjectionAdapterService.js', 'js/features/memoryBrain/view.js');
requireBefore('js/features/memoryBrain/formalInjectionAdapterView.js', 'js/features/memoryBrain/view.js');
forbidContains('js/core/memoryBrain/formalInjectionAdapterSemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features']);
forbidContains('js/features/memoryBrain/formalInjectionAdapterService.js', ['getAiReply(', 'sendMessage(', 'promptSemantics']);
forbidContains('js/platform/memoryBrain/memoryFormalInjectionStore.js', ['getAiReply(', 'sendMessage(', 'promptSemantics', 'memoryTables =', 'vectorMemory =', 'memoryJournals =']);
requireContains('js/features/memoryBrain/view.js', 'memory-brain-run-formal-adapter-btn');
requireContains('js/features/memoryBrain/groupedUiView.js', 'memory-brain-formal-adapter-section');
requireContains('js/platform/memoryBrain/public.js', 'appendFormalInjectionAdapterRun');
requireContains('js/features/memoryBrain/public.js', 'runFormalInjectionAdapter');
requireContains('js/core/memoryBrain/types.js', 'formalInjectionAdapterReports');
requireContains('docs/0.6/release-v0.6.0-plan.md', '不正式注入 prompt');
const app = { core: { memoryBrain: {}, memory: {} }, platform: { memoryBrain: {}, storage: { repository: { saveGlobalSettings: () => Promise.resolve(true) } } }, features: { memoryBrain: {} } };
const context = vm.createContext({ console, OwoApp: app, db: {}, window: null, setTimeout, clearTimeout });
context.window = context;
context.window.OwoApp = app;
context.window.db = context.db;
['js/core/memoryBrain/types.js', 'js/core/memoryBrain/injectionSemantics.js', 'js/core/memoryBrain/ownerSwitchSemantics.js', 'js/core/memoryBrain/formalInjectionAdapterSemantics.js', 'js/platform/memoryBrain/memoryBrainStore.js', 'js/platform/memoryBrain/memoryFormalInjectionStore.js'].forEach(rel => load(context, rel));
context.db.memoryBrain = app.core.memoryBrain.types.createDefaultMemoryBrainState();
const state = context.db.memoryBrain;
state.ownerState = app.core.memoryBrain.ownerSwitchSemantics.evaluateOwnerSwitch({}, 'memoryBrain', { now: '2026-01-01T00:00:00.000Z' });
state.facts = [{ id: 'fact-1', status: 'active', content: '用户希望 AI 长期记住项目计划', confidence: 0.92, keywords: ['长期记忆', '项目计划'] }];
state.models = [{ id: 'model-1', status: 'active', type: 'user-profile', title: '用户画像', summary: '用户重视长期陪伴式记忆。', confidence: 0.9 }];
const report = app.core.memoryBrain.formalInjectionAdapterSemantics.buildFormalInjectionAdapterPackage({ query: '你记得我的长期计划吗', snapshot: state, ownerState: state.ownerState, legacyBlock: '【结构化长期记忆】旧档案记忆仍是正式来源。', legacyOwner: 'table' });
if (report.final.owner !== 'legacy' || report.policy.formalPromptInjection !== false || report.owner.cutoverGate !== 'blocked-until-v0.9') error('formal adapter 未保持 legacy final owner / blocked gate'); else ok('formal adapter 生成候选但保持 legacy final owner');
const stored = app.platform.memoryBrain.memoryFormalInjectionStore.appendFormalInjectionAdapterRun({ report }, { state: context.db });
if (!stored.batch || stored.batch.kind !== 'formal-injection-adapter' || !context.db.memoryBrain.formalInjectionAdapterReports.length) error('formal adapter store 未写入 report/run/batch'); else ok('formal adapter store 写入 report/run/batch');
const rollback = app.platform.memoryBrain.memoryFormalInjectionStore.rollbackFormalInjectionAdapterBatch(stored.batch.id, { state: context.db });
if (!rollback.ok || context.db.memoryBrain.formalInjectionAdapterReports[0].status !== 'rolled-back') error('formal adapter rollback 未标记 report'); else ok('formal adapter rollback 标记 report/run/batch');
if (hasError) { console.error('\nformal-injection-adapter gate failed.'); process.exit(1); }
console.log('\nformal-injection-adapter gate passed.');
