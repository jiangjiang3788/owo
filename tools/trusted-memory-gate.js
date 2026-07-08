#!/usr/bin/env node
/* Memory Brain v0.5.7 gate: trusted memory review/correction/conflict/propagation/trust score are unified and shadow-only. */
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
console.log('OWO Memory Brain gate · v0.5.7 trusted memory gate\n');
[
  'js/core/memoryBrain/trustedGateSemantics.js',
  'js/platform/memoryBrain/trustedGateStore.js',
  'js/features/memoryBrain/trustedGateService.js',
  'js/features/memoryBrain/trustedGateView.js',
  'css/modules/memory_brain_trusted_gate.css',
  'docs/0.5/release-v0.5.7-plan.md'
].forEach(requireFile);
requireContains('index.html', 'css/modules/memory_brain_trusted_gate.css');
requireBefore('js/core/memoryBrain/trustedGateSemantics.js', 'js/core/memoryBrain/public.js');
requireBefore('js/platform/memoryBrain/trustedGateStore.js', 'js/platform/memoryBrain/public.js');
requireBefore('js/features/memoryBrain/trustedGateService.js', 'js/features/memoryBrain/view.js');
requireBefore('js/features/memoryBrain/trustedGateView.js', 'js/features/memoryBrain/view.js');
forbidContains('js/core/memoryBrain/trustedGateSemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features']);
forbidContains('js/features/memoryBrain/trustedGateService.js', ['getAiReply(', 'sendMessage(', 'promptSemantics']);
requireContains('js/features/memoryBrain/view.js', 'memory-brain-run-trusted-gate-btn');
requireContains('js/features/memoryBrain/groupedUiView.js', 'memory-brain-trusted-section');
requireContains('js/platform/memoryBrain/public.js', 'runTrustedMemoryGate');
requireContains('js/features/memoryBrain/public.js', 'runTrustedMemoryGate');
requireContains('js/core/memoryBrain/types.js', 'trustedMemoryGateReports');
requireContains('docs/0.5/release-v0.5.7-plan.md', '不正式注入 prompt');
const app = { core: { memoryBrain: {} }, platform: { memoryBrain: {}, storage: { repository: { saveGlobalSettings: () => Promise.resolve(true) } } }, features: { memoryBrain: {} } };
const context = vm.createContext({ console, OwoApp: app, db: {}, window: null, setTimeout, clearTimeout });
context.window = context;
context.window.OwoApp = app;
context.window.db = context.db;
['js/core/memoryBrain/types.js', 'js/core/memoryBrain/trustedGateSemantics.js', 'js/platform/memoryBrain/memoryBrainStore.js', 'js/platform/memoryBrain/trustedGateStore.js'].forEach(rel => load(context, rel));
context.db.memoryBrain = app.core.memoryBrain.types.createDefaultMemoryBrainState();
const state = context.db.memoryBrain;
state.facts = [
  { id: 'fact-ok', status: 'active', lifecycleStatus: 'active', content: '用户喜欢长期陪伴式外置大脑', confidence: 0.9, familyIds: ['fam-ok'], edgeIds: ['edge-ok'] },
  { id: 'fact-bad', status: 'active', lifecycleStatus: 'disputed', content: '用户喜欢企业知识库', confidence: 0.25 }
];
state.families = [{ id: 'fam-ok', status: 'active', title: '长期记忆脑', factIds: ['fact-ok'] }];
state.edges = [{ id: 'edge-ok', status: 'active', validationStatus: 'valid', evidenceFactIds: ['fact-ok'] }];
state.models = [{ id: 'model-ok', status: 'active', type: 'user-profile', title: '用户画像', confidence: 0.8, factIds: ['fact-ok'] }];
state.reviewInboxItems = [{ id: 'review-1', status: 'needs-edit', targetType: 'fact', targetId: 'fact-bad', severity: 'high' }];
state.conflicts = [{ id: 'conflict-1', status: 'open', factIds: ['fact-ok', 'fact-bad'] }];
state.trustScoreRecords = [{ id: 'trust-1', status: 'active', targetType: 'fact', targetId: 'fact-bad', score: 22, level: 'critical' }];
state.trustScoreRuns = [{ id: 'trust-run-1', status: 'applied', createdAt: '2026-01-01T00:00:00.000Z' }];
const store = app.platform.memoryBrain.trustedGateStore;
const blocked = store.buildTrustedMemoryGateReport({ state: context.db });
if (blocked.trustedReady || !blocked.blockers.includes('review-inbox') || !blocked.blockers.includes('fact-conflicts')) error('trusted gate 未阻断未处理审查 / 冲突事实'); else ok('trusted gate 阻断未处理审查 / 冲突事实');
const cleanState = context.db.memoryBrain;
cleanState.reviewInboxItems = [{ id: 'review-1', status: 'corrected', targetType: 'fact', targetId: 'fact-bad' }];
cleanState.conflicts = [{ id: 'conflict-1', status: 'resolved', factIds: ['fact-ok', 'fact-bad'] }];
cleanState.facts = [{ id: 'fact-ok', status: 'active', lifecycleStatus: 'active', content: '用户喜欢长期陪伴式外置大脑', confidence: 0.92, familyIds: ['fam-ok'], edgeIds: ['edge-ok'] }];
cleanState.factCorrections = [{ id: 'correction-1', status: 'applied', factId: 'fact-ok' }];
cleanState.factConflictResolutions = [{ id: 'resolution-1', status: 'applied', factIds: ['fact-ok'] }];
cleanState.familyAdjustments = [{ id: 'family-adjust-1', status: 'applied', familyIds: ['fam-ok'] }];
cleanState.modelCorrections = [{ id: 'model-correction-1', status: 'applied', modelId: 'model-ok' }];
cleanState.correctionPropagations = [{ id: 'propagation-1', status: 'applied', runId: 'prop-run-1', createdAt: '2026-01-02T00:00:00.000Z' }];
cleanState.trustScoreRecords = [
  { id: 'trust-2', status: 'active', targetType: 'fact', targetId: 'fact-ok', score: 91, level: 'high' },
  { id: 'trust-3', status: 'active', targetType: 'family', targetId: 'fam-ok', score: 86, level: 'high' },
  { id: 'trust-4', status: 'active', targetType: 'edge', targetId: 'edge-ok', score: 78, level: 'medium' },
  { id: 'trust-5', status: 'active', targetType: 'model', targetId: 'model-ok', score: 84, level: 'high' }
];
cleanState.trustScoreRuns = [{ id: 'trust-run-2', status: 'applied', createdAt: '2026-01-03T00:00:00.000Z' }];
const clean = store.buildTrustedMemoryGateReport({ state: context.db });
if (!clean.trustedReady || clean.readyForFormalCutover !== false || clean.cutoverGate !== 'blocked-until-v0.9') error('trusted gate 干净状态未通过可信阶段或错误打开正式接管'); else ok('trusted gate 干净状态通过可信阶段但仍阻断正式接管');
const applied = store.runTrustedMemoryGate({ state: context.db });
if (!applied.batch || applied.batch.kind !== 'trusted-memory-gate' || !context.db.memoryBrain.trustedMemoryGateReports.length) error('trustedGateStore 未写入 report/run/batch'); else ok('trustedGateStore 写入 report/run/batch');
const rollback = store.rollbackTrustedMemoryGateBatch(applied.batch.id, { state: context.db });
if (!rollback.ok || context.db.memoryBrain.trustedMemoryGateReports[0].status !== 'rolled-back') error('trusted gate rollback 未回滚报告'); else ok('trusted gate rollback 标记报告和运行记录');
if (hasError) { console.error('\ntrusted-memory gate failed.'); process.exit(1); }
console.log('\ntrusted-memory gate passed.');
