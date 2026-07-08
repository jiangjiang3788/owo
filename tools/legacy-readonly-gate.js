#!/usr/bin/env node
/* Memory Brain v0.6.3 gate: legacy memory read-only downgrade remains rehearsal-only and blocked until v0.9. */
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
console.log('OWO Memory Brain gate · v0.6.3 legacy read-only downgrade\n');
[
  'js/core/memoryBrain/legacyReadOnlySemantics.js',
  'js/platform/memoryBrain/memoryLegacyReadOnlyStore.js',
  'js/features/memoryBrain/legacyReadOnlyService.js',
  'js/features/memoryBrain/legacyReadOnlyView.js',
  'css/modules/memory_brain_legacy_readonly.css',
  'docs/0.6/release-v0.6.3-plan.md'
].forEach(requireFile);
requireContains('index.html', 'css/modules/memory_brain_legacy_readonly.css');
requireBefore('js/core/memoryBrain/legacyReadOnlySemantics.js', 'js/core/memoryBrain/public.js');
requireBefore('js/platform/memoryBrain/memoryLegacyReadOnlyStore.js', 'js/platform/memoryBrain/public.js');
requireBefore('js/features/memoryBrain/legacyReadOnlyService.js', 'js/features/memoryBrain/view.js');
requireBefore('js/features/memoryBrain/legacyReadOnlyView.js', 'js/features/memoryBrain/view.js');
forbidContains('js/core/memoryBrain/legacyReadOnlySemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features']);
forbidContains('js/features/memoryBrain/legacyReadOnlyService.js', ['getAiReply(', 'sendMessage(', 'promptSemantics', 'memoryTables =', 'vectorMemory =', 'memoryJournals =']);
forbidContains('js/platform/memoryBrain/memoryLegacyReadOnlyStore.js', ['getAiReply(', 'sendMessage(', 'promptSemantics', 'memoryTables =', 'vectorMemory =', 'memoryJournals =']);
requireContains('js/features/memoryBrain/view.js', 'memory-brain-run-legacy-readonly-btn');
requireContains('js/features/memoryBrain/groupedUiView.js', 'memory-brain-legacy-readonly-section');
requireContains('js/platform/memoryBrain/public.js', 'appendLegacyReadOnlyRun');
requireContains('js/features/memoryBrain/public.js', 'runLegacyReadOnlyDowngrade');
requireContains('js/core/memoryBrain/types.js', 'legacyReadOnlyReports');
requireContains('docs/0.6/release-v0.6.3-plan.md', '不改正式 prompt');
const app = { core: { memoryBrain: {}, memory: {} }, platform: { memoryBrain: {}, storage: { repository: { saveGlobalSettings: () => Promise.resolve(true) } } }, features: { memoryBrain: {} } };
const context = vm.createContext({ console, OwoApp: app, db: {}, window: null, setTimeout, clearTimeout });
context.window = context;
context.window.OwoApp = app;
context.window.db = context.db;
['js/core/memoryBrain/types.js', 'js/core/memoryBrain/legacyReadOnlySemantics.js', 'js/platform/memoryBrain/memoryBrainStore.js', 'js/platform/memoryBrain/memoryLegacyReadOnlyStore.js'].forEach(rel => load(context, rel));
context.db.characters = [{ id: 'c1', name: '测试角色', memoryMode: 'table', history: [{ role: 'user', content: '你好' }], memoryJournals: [{ id: 'j1' }], vectorMemory: { entries: [{ id: 'v1' }] }, memoryTables: { data: { t1: { rows: [{ a: 'b', c: 'd' }] } } } }];
context.db.groups = [];
context.db.memoryBrain = app.core.memoryBrain.types.createDefaultMemoryBrainState();
const legacyScan = app.platform.memoryBrain.memoryBrainStore.scanLegacySources({ state: context.db });
const report = app.core.memoryBrain.legacyReadOnlySemantics.buildLegacyReadOnlyPlan({ snapshot: context.db.memoryBrain, legacyScan, activeLegacyOwner: 'table' });
if (!report.issues.some(item => item.code === 'blocked-until-v0.9')) error('legacy read-only plan 未记录 blocked-until-v0.9'); else ok('legacy read-only plan 记录 blocked-until-v0.9');
if (report.downgradePlan.canApplyNow !== false || report.legacyOwner.finalOwner !== 'legacy') error('legacy read-only plan 未保持 legacy formal owner'); else ok('legacy read-only plan 保持 legacy formal owner');
if (report.guards.noDualInjection !== true || report.guards.promptHooked !== false) error('legacy read-only guards 不正确'); else ok('legacy read-only guards 正确');
const stored = app.platform.memoryBrain.memoryLegacyReadOnlyStore.appendLegacyReadOnlyRun({ report }, { state: context.db });
if (!stored.batch || stored.batch.kind !== 'legacy-readonly-downgrade' || !context.db.memoryBrain.legacyReadOnlyReports.length) error('legacy read-only store 未写入 report/run/batch'); else ok('legacy read-only store 写入 report/run/batch');
const rollback = app.platform.memoryBrain.memoryLegacyReadOnlyStore.rollbackLegacyReadOnlyBatch(stored.batch.id, { state: context.db });
if (rollback.status !== 'rolled-back' || context.db.memoryBrain.legacyReadOnlyReports[0].status !== 'rolled-back') error('legacy read-only rollback 未标记 report'); else ok('legacy read-only rollback 标记 report/run/batch');
if (hasError) { console.error('\nlegacy-readonly gate failed.'); process.exit(1); }
console.log('\nlegacy-readonly gate passed.');
