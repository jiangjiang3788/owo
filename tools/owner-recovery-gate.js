#!/usr/bin/env node
/* Memory Brain v0.6.4 gate: one-click off / rollback must keep legacy table memory available and stay blocked until v0.9. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = process.cwd();
let hasError = false;
function read(rel) { return fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : ''; }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function ok(msg) { console.log('✅ ' + msg); }
function error(msg) { hasError = true; console.error('❌ ' + msg); }
function requireFile(rel) { exists(rel) ? ok('存在：' + rel) : error('缺少文件：' + rel); }
function requireContains(rel, token) { read(rel).includes(token) ? ok(`${rel} 包含 ${token}`) : error(`${rel} 缺少 ${token}`); }
function forbidContains(rel, tokens) { const text = read(rel); tokens.forEach(token => { if (text.includes(token)) error(`${rel} 不应包含 ${token}`); }); }
function indexOf(script) { return read('index.html').indexOf(`src="${script}"`); }
function requireBefore(a, b) { const ia = indexOf(a), ib = indexOf(b); if (ia < 0) error('index.html 未加载 ' + a); if (ib < 0) error('index.html 未加载 ' + b); if (ia >= 0 && ib >= 0 && ia > ib) error(`${a} 必须在 ${b} 前加载`); else if (ia >= 0 && ib >= 0) ok(`${a} 在 ${b} 前加载`); }
function load(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }
console.log('OWO Memory Brain gate · v0.6.4 owner recovery\n');
[
  'js/core/memoryBrain/ownerRecoverySemantics.js',
  'js/platform/memoryBrain/memoryOwnerRecoveryStore.js',
  'js/features/memoryBrain/ownerRecoveryService.js',
  'js/features/memoryBrain/ownerRecoveryView.js',
  'css/modules/memory_brain_owner_recovery.css',
  'docs/0.6/release-v0.6.4-plan.md'
].forEach(requireFile);
requireContains('index.html', 'css/modules/memory_brain_owner_recovery.css');
requireBefore('js/core/memoryBrain/ownerRecoverySemantics.js', 'js/core/memoryBrain/public.js');
requireBefore('js/platform/memoryBrain/memoryOwnerRecoveryStore.js', 'js/platform/memoryBrain/public.js');
requireBefore('js/features/memoryBrain/ownerRecoveryService.js', 'js/features/memoryBrain/view.js');
requireBefore('js/features/memoryBrain/ownerRecoveryView.js', 'js/features/memoryBrain/view.js');
forbidContains('js/core/memoryBrain/ownerRecoverySemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features']);
forbidContains('js/platform/memoryBrain/memoryOwnerRecoveryStore.js', ['getAiReply(', 'sendMessage(', 'promptSemantics', 'memoryTables =', 'vectorMemory =', 'memoryJournals =']);
forbidContains('js/features/memoryBrain/ownerRecoveryService.js', ['getAiReply(', 'sendMessage(', 'promptSemantics', 'memoryTables =', 'vectorMemory =', 'memoryJournals =']);
requireContains('js/core/memoryBrain/injectionSemantics.js', 'shadow_injection_disabled_by_owner_recovery');
requireContains('js/platform/memoryBrain/public.js', 'appendOwnerRecoveryRun');
requireContains('js/features/memoryBrain/public.js', 'runOwnerRecoveryAction');
requireContains('js/core/memoryBrain/types.js', 'ownerRecoveryReports');
requireContains('js/features/memoryBrain/view.js', 'memory-brain-owner-recovery-section');
requireContains('js/features/memoryBrain/groupedUiView.js', 'memory-brain-owner-recovery-section');
requireContains('docs/0.6/release-v0.6.4-plan.md', '表格记忆仍可自动总结');
const app = { core: { memoryBrain: {}, memory: {} }, platform: { memoryBrain: {}, storage: { repository: { saveGlobalSettings: () => Promise.resolve(true) } } }, features: { memoryBrain: {} } };
const context = vm.createContext({ console, OwoApp: app, db: {}, window: null, setTimeout, clearTimeout });
context.window = context; context.window.OwoApp = app; context.window.db = context.db;
['js/core/memoryBrain/types.js', 'js/core/memoryBrain/ownerSwitchSemantics.js', 'js/core/memoryBrain/ownerRecoverySemantics.js', 'js/platform/memoryBrain/memoryBrainStore.js', 'js/platform/memoryBrain/memoryOwnerRecoveryStore.js'].forEach(rel => load(context, rel));
context.db.memoryBrain = app.core.memoryBrain.types.createDefaultMemoryBrainState();
const plan = app.core.memoryBrain.ownerRecoverySemantics.buildOwnerRecoveryPlan({ action: 'disable-shadow', settings: context.db.memoryBrain.settings, ownerState: context.db.memoryBrain.ownerState, activeLegacyMemoryMode: 'table' });
if (plan.nextShadowInjectionEnabled !== false) error('disable-shadow 未关闭 Memory Brain 影子候选'); else ok('disable-shadow 关闭 Memory Brain 影子候选');
if (!plan.legacyRuntime || plan.legacyRuntime.tableAutoSummaryAllowed !== true) error('表格记忆总结未保持允许'); else ok('表格记忆总结保持允许');
if (plan.formalPromptInjection !== false || plan.effectiveOwner !== 'legacy') error('owner recovery 不应正式接管 prompt'); else ok('owner recovery 继续 legacy 正式 owner');
const stored = app.platform.memoryBrain.memoryOwnerRecoveryStore.appendOwnerRecoveryRun({ action: 'disable-shadow', activeLegacyMemoryMode: 'table' }, { state: context.db });
if (context.db.memoryBrain.settings.shadowInjectionEnabled !== false || !stored.batch || stored.batch.kind !== 'owner-recovery') error('owner recovery store 未写入 shadow flag/report/run/batch'); else ok('owner recovery store 写入 shadow flag/report/run/batch');
const rollback = app.platform.memoryBrain.memoryOwnerRecoveryStore.rollbackOwnerRecoveryBatch(stored.batch.id, { state: context.db });
if (!rollback.ok || context.db.memoryBrain.settings.shadowInjectionEnabled === false) error('owner recovery rollback 未恢复设置'); else ok('owner recovery rollback 恢复设置');
if (hasError) { console.error('\nowner-recovery gate failed.'); process.exit(1); }
console.log('\nowner-recovery gate passed.');
