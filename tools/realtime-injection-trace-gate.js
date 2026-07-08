#!/usr/bin/env node
/* Memory Brain v0.6.2 gate: realtime injection trace explains hits/misses/clipping/blockers and remains shadow-only. */
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
console.log('OWO Memory Brain gate · v0.6.2 realtime injection trace\n');
[
  'js/core/memoryBrain/realtimeInjectionTraceSemantics.js',
  'js/platform/memoryBrain/memoryRealtimeTraceStore.js',
  'js/features/memoryBrain/realtimeInjectionTraceService.js',
  'js/features/memoryBrain/realtimeInjectionTraceView.js',
  'css/modules/memory_brain_realtime_trace.css',
  'docs/0.6/release-v0.6.2-plan.md'
].forEach(requireFile);
requireContains('index.html', 'css/modules/memory_brain_realtime_trace.css');
requireBefore('js/core/memoryBrain/realtimeInjectionTraceSemantics.js', 'js/core/memoryBrain/public.js');
requireBefore('js/platform/memoryBrain/memoryRealtimeTraceStore.js', 'js/platform/memoryBrain/public.js');
requireBefore('js/features/memoryBrain/realtimeInjectionTraceService.js', 'js/features/memoryBrain/view.js');
requireBefore('js/features/memoryBrain/realtimeInjectionTraceView.js', 'js/features/memoryBrain/view.js');
forbidContains('js/core/memoryBrain/realtimeInjectionTraceSemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features']);
forbidContains('js/features/memoryBrain/realtimeInjectionTraceService.js', ['getAiReply(', 'sendMessage(', 'promptSemantics']);
forbidContains('js/platform/memoryBrain/memoryRealtimeTraceStore.js', ['getAiReply(', 'sendMessage(', 'promptSemantics', 'memoryTables =', 'vectorMemory =', 'memoryJournals =']);
requireContains('js/features/memoryBrain/view.js', 'memory-brain-run-realtime-trace-btn');
requireContains('js/features/memoryBrain/groupedUiView.js', 'memory-brain-realtime-trace-section');
requireContains('js/platform/memoryBrain/public.js', 'appendRealtimeTraceRun');
requireContains('js/features/memoryBrain/public.js', 'runRealtimeInjectionTrace');
requireContains('js/core/memoryBrain/types.js', 'realtimeInjectionTraceReports');
requireContains('docs/0.6/release-v0.6.2-plan.md', '不正式注入 prompt');
const app = { core: { memoryBrain: {}, memory: {} }, platform: { memoryBrain: {}, storage: { repository: { saveGlobalSettings: () => Promise.resolve(true) } } }, features: { memoryBrain: {} } };
const context = vm.createContext({ console, OwoApp: app, db: {}, window: null, setTimeout, clearTimeout });
context.window = context;
context.window.OwoApp = app;
context.window.db = context.db;
['js/core/memoryBrain/types.js', 'js/core/memoryBrain/injectionSemantics.js', 'js/core/memoryBrain/ownerSwitchSemantics.js', 'js/core/memoryBrain/formalInjectionAdapterSemantics.js', 'js/core/memoryBrain/realtimeInjectionTraceSemantics.js', 'js/platform/memoryBrain/memoryBrainStore.js', 'js/platform/memoryBrain/memoryRealtimeTraceStore.js'].forEach(rel => load(context, rel));
context.db.memoryBrain = app.core.memoryBrain.types.createDefaultMemoryBrainState();
const state = context.db.memoryBrain;
state.ownerState = app.core.memoryBrain.ownerSwitchSemantics.evaluateOwnerSwitch({}, 'memoryBrain', { now: '2026-01-01T00:00:00.000Z' });
state.facts = [
  { id: 'fact-1', status: 'active', content: '用户希望 AI 长期记住项目计划', confidence: 0.92, keywords: ['长期记忆', '项目计划'], trustLevel: 'high', familyIds: ['fam-1'], edgeIds: ['edge-1'] },
  { id: 'fact-2', status: 'active', lifecycleStatus: 'obsolete', content: '用户只想做企业知识库', confidence: 0.3, keywords: ['企业知识库'] }
];
state.families = [{ id: 'fam-1', status: 'active', title: '长期记忆脑', summary: '围绕长期陪伴和外置大脑项目。', factIds: ['fact-1'], trustLevel: 'high' }];
state.edges = [{ id: 'edge-1', status: 'active', sourceLabel: '用户', relationLabel: '推进', targetLabel: 'OWO 长期记忆脑', reason: '用户持续推进长期记忆脑项目。' }];
state.models = [{ id: 'model-1', status: 'active', type: 'project-brain', title: '项目脑', summary: 'OWO 正在推进长期记忆脑。', confidence: 0.9 }];
const report = app.core.memoryBrain.realtimeInjectionTraceSemantics.buildRealtimeInjectionTraceReport({ query: '你记得我的长期记忆脑项目计划吗', snapshot: state, ownerState: state.ownerState, legacyBlock: '旧档案：用户重视长期记忆。', legacyOwner: 'table' });
if (!report.trace || !report.trace.whyHit.length) error('realtime trace 未生成命中解释'); else ok('realtime trace 生成命中解释');
if (!report.trace.blockers.some(item => item.code === 'blocked-until-v0.9')) error('realtime trace 未记录 blocked-until-v0.9'); else ok('realtime trace 记录 blocked-until-v0.9');
if (report.final.formalPromptInjection !== false || report.final.owner !== 'legacy') error('realtime trace 未保持 legacy / no formal injection'); else ok('realtime trace 保持 legacy final owner / no formal injection');
const stored = app.platform.memoryBrain.memoryRealtimeTraceStore.appendRealtimeTraceRun({ report }, { state: context.db });
if (!stored.batch || stored.batch.kind !== 'realtime-injection-trace' || !context.db.memoryBrain.realtimeInjectionTraceReports.length) error('realtime trace store 未写入 report/run/batch'); else ok('realtime trace store 写入 report/run/batch');
const rollback = app.platform.memoryBrain.memoryRealtimeTraceStore.rollbackRealtimeTraceBatch(stored.batch.id, { state: context.db });
if (!rollback.ok || context.db.memoryBrain.realtimeInjectionTraceReports[0].status !== 'rolled-back') error('realtime trace rollback 未标记 report'); else ok('realtime trace rollback 标记 report/run/batch');
if (hasError) { console.error('\nrealtime-injection-trace gate failed.'); process.exit(1); }
console.log('\nrealtime-injection-trace gate passed.');
