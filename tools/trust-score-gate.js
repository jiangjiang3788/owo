#!/usr/bin/env node
/* Memory Brain v0.5.6 gate: trust score is explainable, rollbackable and shadow-only. */
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
console.log('OWO Memory Brain gate · v0.5.6 trust score\n');
[
  'js/core/memoryBrain/trustScoreSemantics.js',
  'js/platform/memoryBrain/memoryTrustScoreStore.js',
  'js/features/memoryBrain/trustScoreService.js',
  'js/features/memoryBrain/trustScoreView.js',
  'css/modules/memory_brain_trust.css',
  'docs/0.5/release-v0.5.6-plan.md'
].forEach(requireFile);
requireContains('index.html', 'css/modules/memory_brain_trust.css');
requireBefore('js/core/memoryBrain/trustScoreSemantics.js', 'js/core/memoryBrain/public.js');
requireBefore('js/platform/memoryBrain/memoryTrustScoreStore.js', 'js/platform/memoryBrain/public.js');
requireBefore('js/features/memoryBrain/trustScoreService.js', 'js/features/memoryBrain/view.js');
requireBefore('js/features/memoryBrain/trustScoreView.js', 'js/features/memoryBrain/view.js');
forbidContains('js/core/memoryBrain/trustScoreSemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features']);
forbidContains('js/features/memoryBrain/trustScoreService.js', ['getAiReply(', 'sendMessage(', 'promptSemantics']);
requireContains('js/features/memoryBrain/view.js', 'memory-brain-run-trust-btn');
requireContains('js/features/memoryBrain/groupedUiView.js', 'memory-brain-trust-section');
requireContains('js/platform/memoryBrain/public.js', 'buildMemoryTrustScorePlan');
requireContains('js/features/memoryBrain/public.js', 'runMemoryTrustScore');
requireContains('js/core/memoryBrain/types.js', 'trustScoreRecords');
requireContains('docs/0.5/release-v0.5.6-plan.md', '不正式注入 prompt');
const app = { core: { memoryBrain: {} }, platform: { memoryBrain: {}, storage: { repository: { saveGlobalSettings: () => Promise.resolve(true) } } }, features: { memoryBrain: {} } };
const context = vm.createContext({ console, OwoApp: app, db: {}, window: null, setTimeout, clearTimeout });
context.window = context;
context.window.OwoApp = app;
context.window.db = context.db;
['js/core/memoryBrain/types.js', 'js/core/memoryBrain/trustScoreSemantics.js', 'js/platform/memoryBrain/memoryBrainStore.js', 'js/platform/memoryBrain/memoryTrustScoreStore.js'].forEach(rel => load(context, rel));
context.db.memoryBrain = app.core.memoryBrain.types.createDefaultMemoryBrainState();
context.db.memoryBrain.facts = [
  { id: 'fact-high', status: 'active', content: '用户喜欢长期陪伴式外置大脑', confidence: 0.92, evidence: ['event-1'], source: { eventId: 'event-1' }, familyIds: ['fam-1'], edgeIds: ['edge-1'], updatedAt: new Date().toISOString() },
  { id: 'fact-low', status: 'active', lifecycleStatus: 'disputed', content: '用户喜欢企业知识库', confidence: 0.32, evidence: [], familyIds: [], edgeIds: [] }
];
context.db.memoryBrain.families = [{ id: 'fam-1', status: 'active', title: '长期记忆脑', confidence: 0.8, factIds: ['fact-high'] }];
context.db.memoryBrain.edges = [{ id: 'edge-1', status: 'active', validationStatus: 'valid', sourceFactId: 'fact-high', targetFamilyId: 'fam-1', evidenceFactIds: ['fact-high'] }];
context.db.memoryBrain.models = [{ id: 'model-1', status: 'active', type: 'user-profile', title: '用户画像', confidence: 0.75, factIds: ['fact-high'], familyIds: ['fam-1'], edgeIds: ['edge-1'] }];
const store = app.platform.memoryBrain.memoryTrustScoreStore;
const plan = store.buildMemoryTrustScorePlan({ state: context.db });
if (!plan.ok || plan.records.length < 4) error('trust score plan 未生成全部类型记录'); else ok('trust score plan 生成全部类型记录');
const high = plan.records.find(item => item.targetId === 'fact-high');
const low = plan.records.find(item => item.targetId === 'fact-low');
if (!high || !low || high.score <= low.score) error('高可信事实分数没有高于 disputed 低可信事实'); else ok('信任分能区分高可信和冲突事实');
const applied = store.applyMemoryTrustScorePlan(plan, { state: context.db });
if (!applied.batch || applied.batch.kind !== 'memory-trust-score' || !context.db.memoryBrain.facts[0].trustScore) error('memoryTrustScoreStore 未写入 trust score batch / fields'); else ok('memoryTrustScoreStore 写入 trust score batch / fields');
const rollback = store.rollbackMemoryTrustScoreBatch(applied.batch.id, { state: context.db });
if (!rollback.ok || context.db.memoryBrain.facts.some(fact => fact.trustRunId === applied.run.id)) error('trust score rollback 未恢复对象'); else ok('trust score rollback 恢复对象');
if (hasError) { console.error('\ntrust-score gate failed.'); process.exit(1); }
console.log('\ntrust-score gate passed.');
