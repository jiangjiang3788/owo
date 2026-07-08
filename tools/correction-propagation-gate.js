#!/usr/bin/env node
/* OWO v0.5.5 gate: correction propagation remains Memory Brain shadow-only. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = process.cwd();
let hasError = false;
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function error(msg) { hasError = true; console.error('❌ ' + msg); }
function ok(msg) { console.log('✅ ' + msg); }
function requireFile(rel) { exists(rel) ? ok(`存在：${rel}`) : error(`缺少文件：${rel}`); }
function requireContains(rel, token, reason) { if (!read(rel).includes(token)) error(`${rel} 缺少：${reason || token}`); }
function forbidContains(rel, tokens, reason) { const text = read(rel); tokens.forEach(token => { if (text.includes(token)) error(`${rel} 不应包含 ${token}${reason ? '：' + reason : ''}`); }); }
function indexOf(script) { return read('index.html').indexOf(`src="${script}"`); }
function cssOf(href) { return read('index.html').indexOf(`href="${href}"`); }
function requireBefore(a,b) { const ai=indexOf(a), bi=indexOf(b); if (ai<0) error(`index.html 未加载：${a}`); if (bi<0) error(`index.html 未加载：${b}`); if (ai>=0 && bi>=0 && ai>bi) error(`${a} 必须在 ${b} 之前加载`); }
function load(ctx, rel) { vm.runInContext(read(rel), ctx, { filename: rel }); }
console.log('OWO Memory Brain gate · v0.5.5 correction propagation\n');
[
 'js/core/memoryBrain/correctionPropagationSemantics.js',
 'js/platform/memoryBrain/correctionPropagationStore.js',
 'js/features/memoryBrain/correctionPropagationService.js',
 'js/features/memoryBrain/correctionPropagationView.js',
 'css/modules/memory_brain_propagation.css',
 'docs/0.5/release-v0.5.5-plan.md'
].forEach(requireFile);
requireBefore('js/core/memoryBrain/correctionPropagationSemantics.js','js/core/memoryBrain/public.js');
requireBefore('js/platform/memoryBrain/correctionPropagationStore.js','js/platform/memoryBrain/public.js');
requireBefore('js/features/memoryBrain/correctionPropagationService.js','js/features/memoryBrain/memorySchedulerService.js');
requireBefore('js/features/memoryBrain/correctionPropagationView.js','js/features/memoryBrain/groupedUiView.js');
if (cssOf('css/modules/memory_brain_propagation.css') < 0) error('index.html 未加载 memory_brain_propagation.css');
requireContains('tools/css-ownership-map.json','memory_brain_propagation.css','CSS owner map 必须登记传播 UI');
requireContains('js/core/memoryBrain/types.js','correctionPropagations','types 必须声明 correctionPropagations');
requireContains('js/platform/memoryBrain/public.js','buildCorrectionPropagationPlan','platform public 暴露传播计划');
requireContains('js/features/memoryBrain/service.js','correctionPropagationOwner','service routing report 声明传播 owner');
requireContains('js/features/memoryBrain/view.js','memory-brain-propagation-section','记忆脑 UI 必须有传播区域');
requireContains('js/features/memoryBrain/groupedUiView.js','memory-brain-propagation-section','分组折叠必须收纳传播区域');
forbidContains('js/features/memoryBrain/correctionPropagationService.js',['getAiReply(','sendMessage(','promptSemantics','memory_table','vector_memory','journal'],'传播 service 不得跑 AI、接正式 prompt 或写旧记忆');
forbidContains('js/platform/memoryBrain/correctionPropagationStore.js',['getAiReply(','sendMessage(','promptSemantics','memoryTables =','vectorMemory =','memoryJournals ='],'传播 store 只能写 memoryBrain');
forbidContains('js/core/memoryBrain/correctionPropagationSemantics.js',['window','document','fetch(','app.platform','app.features'],'core 传播语义必须纯计算');
const app = { core: { memoryBrain: {} }, platform: { memoryBrain: {}, storage: { repository: { saveGlobalSettings: () => Promise.resolve(true) } } }, features: { memoryBrain: {} } };
const context = vm.createContext({ console, OwoApp: app, window: null, db: {}, setTimeout, clearTimeout });
context.window = context; context.window.OwoApp = app; context.window.db = context.db;
[
 'js/core/memoryBrain/types.js',
 'js/core/memoryBrain/correctionPropagationSemantics.js',
 'js/core/memoryBrain/public.js',
 'js/platform/memoryBrain/memoryBrainStore.js',
 'js/platform/memoryBrain/correctionPropagationStore.js',
 'js/platform/memoryBrain/public.js'
].forEach(rel => load(context, rel));
context.db.memoryBrain = app.core.memoryBrain.types.createDefaultMemoryBrainState();
Object.assign(context.db.memoryBrain, {
 facts: [{ id:'fact-1', content:'用户喜欢长期陪伴记忆脑', status:'active', familyIds:['family-1'], edgeIds:['edge-1'], confidence:.8 }],
 families: [{ id:'family-1', title:'长期陪伴记忆脑', status:'active', factIds:['fact-1'], summary:'旧摘要' }],
 edges: [{ id:'edge-1', status:'active', factId:'fact-1', familyId:'family-1', relationType:'fact-family' }],
 models: [{ id:'model-1', type:'user-profile', status:'active', title:'用户画像', factIds:['fact-1'], familyIds:['family-1'], edgeIds:['edge-1'], version:1 }],
 reviewInboxItems: [{ id:'review-1', targetType:'fact', targetId:'fact-1', status:'corrected', issueType:'low-confidence' }],
 factCorrections: [{ id:'fc-1', status:'applied', factId:'fact-1', reviewItemId:'review-1' }],
 factConflictResolutions: [], familyAdjustments: [], modelCorrections: [], batches: []
});
const plan = app.platform.memoryBrain.publicApi.buildCorrectionPropagationPlan({ state: context.db });
if (!plan.ok || plan.impact.factIds[0] !== 'fact-1' || !plan.impact.familyIds.includes('family-1') || !plan.impact.edgeIds.includes('edge-1') || !plan.impact.modelIds.includes('model-1')) error('传播计划没有正确覆盖 fact/family/edge/model'); else ok('传播计划覆盖 fact/family/edge/model');
const stored = app.platform.memoryBrain.publicApi.applyCorrectionPropagationPlan(plan, { state: context.db });
const mb = context.db.memoryBrain;
if (!stored.batch || stored.batch.kind !== 'correction-propagation') error('未写入 correction-propagation batch'); else ok('写入 correction-propagation batch');
if (mb.families[0].needsSummaryRefresh !== true || mb.edges[0].validationStatus !== 'needs-review' || mb.models[0].sourceStale !== true) error('下游 family / edge / model 没有写入传播标记'); else ok('下游 family / edge / model 写入传播标记');
if (!mb.factCorrections[0].propagatedAt) error('源 factCorrection 未标记 propagatedAt'); else ok('源修正记录标记 propagatedAt');
const rollback = app.platform.memoryBrain.publicApi.rollbackCorrectionPropagationBatch(stored.batch.id, { state: context.db });
if (!rollback.ok || context.db.memoryBrain.families[0].needsSummaryRefresh) error('传播回滚失败'); else ok('传播回滚恢复下游状态');
if (hasError) { console.error('\ncorrection propagation gate failed.'); process.exit(1); }
console.log('\ncorrection propagation gate passed.');
