#!/usr/bin/env node
/* Memory Brain v0.4.2 fixture gate: event → facts → families → graph → models → injection → scheduler → palace/export → archive/backfill smoke without browser. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const root = process.cwd();
let hasError = false;
function error(message) { hasError = true; console.error('❌ ' + message); }
function ok(message) { console.log('✅ ' + message); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function load(context, rel) { vm.runInContext(read(rel), context, { filename: rel }); }

console.log('OWO Memory Brain fixture gate · v0.4.2\n');

const app = {
  core: { memoryBrain: {} },
  platform: {
    memoryBrain: {},
    storage: { repository: { saveGlobalSettings: () => Promise.resolve(true) } },
    ai: {}
  },
  features: { memoryBrain: {} },
  shared: {}
};
const context = vm.createContext({ console, OwoApp: app, db: {}, window: null, setTimeout, clearTimeout });
context.window = context;
context.window.OwoApp = app;
context.window.db = context.db;

[
  'js/core/memoryBrain/types.js',
  'js/core/memoryBrain/factSemantics.js',
  'js/core/memoryBrain/familySemantics.js',
  'js/core/memoryBrain/graphSemantics.js',
  'js/core/memoryBrain/modelSemantics.js',
  'js/core/memoryBrain/injectionSemantics.js',
  'js/core/memoryBrain/weightSemantics.js',
  'js/core/memoryBrain/productSemantics.js',
  'js/core/memoryBrain/archiveSourceSemantics.js',
  'js/core/memoryBrain/archiveChunkSemantics.js',
  'js/core/memoryBrain/backfillQueueSemantics.js',
  'js/core/memoryBrain/public.js',
  'js/platform/memoryBrain/memoryBrainStore.js',
  'js/platform/memoryBrain/memoryFactStore.js',
  'js/platform/memoryBrain/memoryEmbeddingService.js',
  'js/platform/memoryBrain/memoryFamilyStore.js',
  'js/platform/memoryBrain/memoryGraphStore.js',
  'js/platform/memoryBrain/memoryModelStore.js',
  'js/platform/memoryBrain/memoryInjectionStore.js',
  'js/platform/memoryBrain/memoryScheduleStore.js',
  'js/platform/memoryBrain/memoryExportAdapter.js',
  'js/platform/memoryBrain/historyArchiveScanner.js',
  'js/platform/memoryBrain/historyChunkStore.js',
  'js/platform/memoryBrain/backfillQueueStore.js',
  'js/platform/memoryBrain/public.js'
].forEach(rel => load(context, rel));

const core = app.core.memoryBrain.publicApi;
const platform = app.platform.memoryBrain.publicApi;
const event = {
  id: 'event-memory-design',
  title: '长期记忆脑设计讨论',
  summary: '用户希望 OWO 成为小手机长期陪伴外置大脑，而不是企业知识库。',
  batchId: 'event-batch-1',
  source: { chatId: 'chat-1', chatName: '测试聊天', startIndex: 1, endIndex: 12, messageCount: 12 }
};
const factJson = JSON.stringify({ facts: [
  { content: '用户希望 OWO 拥有长期记忆脑。', subject: 'user', predicate: 'wants', object: 'OWO 长期记忆脑', factType: 'memory-brain', labels: ['长期记忆', 'OWO'], keywords: ['长期记忆', '记忆脑', 'OWO'], confidence: 0.94, evidenceQuote: '长期陪伴外置大脑' },
  { content: '用户不喜欢企业知识库式记忆系统。', subject: 'user', predicate: 'avoids', object: '企业知识库式记忆', factType: 'preference-boundary', labels: ['长期记忆', '非企业化'], keywords: ['长期记忆', '企业知识库', '边界'], polarity: 'negative', confidence: 0.9, evidenceQuote: '不是企业知识库' },
  { content: '用户希望 AI 能自动把事实聚成记忆家族。', subject: 'user', predicate: 'wants', object: '自动记忆家族', factType: 'memory-family', labels: ['记忆家族', '自动整理'], keywords: ['记忆家族', '长期记忆', '自动整理'], confidence: 0.91, evidenceQuote: 'AI 自动生成家族' }
] });
const parsed = core.parseFactExtractionResponse(factJson);
if (!parsed.ok || parsed.drafts.length !== 3) error('fact parser 未能解析 3 条 fixture facts');
else ok('fact parser 解析 3 条 fixture facts');
const facts = core.ensureFactsSource(parsed.drafts, event);
const storedFacts = platform.appendFactExtractionBatch({ event, input: { fixture: true }, rawOutput: factJson, parsedDrafts: parsed.drafts, facts }, { state: context.db });
if (!storedFacts.facts || storedFacts.facts.length !== 3) error('memoryFactStore 未写入 3 条 facts');
else ok('memoryFactStore 写入 facts');
const drafts = core.buildFamilyDrafts(platform.listFacts({ state: context.db }), platform.listFamilies({ state: context.db }), { minNewFacts: 2 });
if (!drafts.length || !drafts[0].factIds || drafts[0].factIds.length < 2) error('familySemantics 未能把相似 facts 聚成 family draft');
else ok('familySemantics 生成 family draft');
const named = core.applyFamilyNames(drafts, [{ draftKey: drafts[0].draftKey, title: '长期记忆脑', summary: '围绕 OWO 长期记忆脑、非企业化边界和自动记忆家族形成的主题。', keywords: ['长期记忆', '记忆脑', 'OWO'], labels: ['Memory Brain'], memoryTone: '认真 / 期待' }]);
const storedFamilies = platform.appendFamilyClusteringBatch({ input: { fixture: true }, parsedDrafts: named, families: named }, { state: context.db });
if (!storedFamilies.families || !storedFamilies.families.length) error('memoryFamilyStore 未写入 family');
else ok('memoryFamilyStore 写入 family');
const familyId = storedFamilies.families[0] && storedFamilies.families[0].id;
const familyFacts = platform.listFacts({ state: context.db }).filter(fact => Array.isArray(fact.familyIds) && fact.familyIds.includes(familyId));
if (familyFacts.length < 2) error('facts 未建立 familyIds 成员关系');
else ok('facts 建立 familyIds 成员关系');
const graphDrafts = core.buildGraphEdges(platform.listFacts({ state: context.db }), platform.listFamilies({ state: context.db }), platform.listEdges({ state: context.db }), { maxEdges: 80 });
if (!graphDrafts.length) error('graphSemantics 未生成 graph edge drafts');
else ok(`graphSemantics 生成 ${graphDrafts.length} 条 edge drafts`);
const storedGraph = platform.appendGraphLinkingBatch({ input: { fixture: true }, parsedDrafts: graphDrafts, edges: graphDrafts }, { state: context.db });
if (!storedGraph.edges || !storedGraph.edges.length) error('memoryGraphStore 未写入 graph edges');
else ok('memoryGraphStore 写入 graph edges');
const factWithEdges = platform.listFacts({ state: context.db }).filter(fact => Array.isArray(fact.edgeIds) && fact.edgeIds.length);
const familyWithEdges = platform.listFamilies({ state: context.db }).filter(family => Array.isArray(family.edgeIds) && family.edgeIds.length);
if (!factWithEdges.length || !familyWithEdges.length) error('graph edges 未建立 fact/family edgeIds 索引');
else ok('graph edges 建立 fact/family edgeIds 索引');
const compact = core.compactGraphForList(platform.listEdges({ state: context.db }), platform.listFacts({ state: context.db }), platform.listFamilies({ state: context.db }));
if (!compact.relationCards || !compact.relationCards.length || !compact.nodeCards || !compact.nodeCards.length) error('compactGraphForList 未生成关系卡片和节点卡片');
else ok('compactGraphForList 生成关系卡片和节点卡片');

const modelJson = JSON.stringify({ models: [
  { type: 'user-profile', title: '用户画像', summary: '用户希望 OWO 是小手机长期陪伴外置大脑，而不是企业知识库。', stableTraits: ['重视长期连续性'], preferences: ['自动整理记忆'], boundaries: ['不喜欢企业知识库'], evidenceFactIds: platform.listFacts({ state: context.db }).map(fact => fact.id), familyIds: platform.listFamilies({ state: context.db }).map(family => family.id), edgeIds: platform.listEdges({ state: context.db }).map(edge => edge.id).slice(0, 8), confidence: 0.9 },
  { type: 'ai-self', title: 'AI 自我', summary: 'AI 应保持长期陪伴、项目协作和可解释回滚的角色。', stableTraits: ['陪伴', '协作'], evidenceFactIds: platform.listFacts({ state: context.db }).map(fact => fact.id), confidence: 0.82 },
  { type: 'world-model', title: '世界观', summary: '双方更重视个人长期外置大脑和非企业化记忆方式。', stableTraits: ['非企业化', '长期关系'], confidence: 0.8 },
  { type: 'project-brain', title: '项目脑', summary: 'OWO Memory Brain 已形成事件、事实、家族和 graph 链路。', projectDecisions: ['v0.3.5 做长期模型'], confidence: 0.86 }
] });
const parsedModels = core.parseLongTermModelResponse(modelJson);
if (!parsedModels.ok || parsedModels.models.length !== 4) error('model parser 未能解析 4 个长期模型');
else ok('model parser 解析 4 个长期模型');
const storedModels = platform.appendLongTermModelBatch({ input: { fixture: true }, rawOutput: modelJson, parsedDrafts: parsedModels.models, models: parsedModels.models }, { state: context.db });
if (!storedModels.models || storedModels.models.length !== 4) error('memoryModelStore 未写入 4 个长期模型');
else ok('memoryModelStore 写入 4 个长期模型');
const activeModels = platform.listModels({ state: context.db }).filter(model => model.status === 'active');
if (activeModels.length !== 4 || !activeModels.some(model => model.type === 'project-brain')) error('长期模型 active 版本不完整');
else ok('长期模型 active 版本完整');
const compactModel = core.compactModelForList(activeModels[0]);
if (!compactModel || !compactModel.title || !compactModel.version) error('compactModelForList 未生成模型卡片');
else ok('compactModelForList 生成模型卡片');

const injectionPreview = core.buildMemoryInjectionPackage('我想继续做 OWO 长期记忆脑，避免企业知识库式方案', {
  events: [event],
  facts: platform.listFacts({ state: context.db }),
  families: platform.listFamilies({ state: context.db }),
  edges: platform.listEdges({ state: context.db }),
  models: platform.listModels({ state: context.db })
}, { maxFacts: 4, maxFamilies: 3, maxEdges: 6, maxModels: 4 });
if (!injectionPreview || !injectionPreview.memoryBlock || !injectionPreview.selected || !injectionPreview.selected.factIds.length) error('injectionSemantics 未生成有效 shadow injection package');
else ok('injectionSemantics 生成 shadow injection package');
injectionPreview.legacyComparison = { mode: 'read-only-comparison', totals: { journals: 1, vectorEntries: 1, tableCells: 1 }, snippets: ['旧系统只读对照片段'] };
const storedInjection = platform.appendInjectionPreviewBatch({ input: { fixture: true }, preview: injectionPreview, legacyComparison: injectionPreview.legacyComparison }, { state: context.db });
if (!storedInjection.preview || !storedInjection.batch || storedInjection.batch.kind !== 'injection-preview') error('memoryInjectionStore 未写入 injection preview batch');
else ok('memoryInjectionStore 写入 injection preview batch');
const compactInjection = core.compactInjectionPreviewForList(storedInjection.preview);
if (!compactInjection || !compactInjection.memoryBlock || !compactInjection.factCount) error('compactInjectionPreviewForList 未生成注入预览卡片');
else ok('compactInjectionPreviewForList 生成注入预览卡片');

const plan = core.buildMaintenancePlan(context.db.memoryBrain, { profileId: 'balanced' });
if (!plan.queueItems || !plan.queueItems.some(item => item.kind === 'weight-maintenance')) error('weightSemantics 未生成 weight-maintenance 调度任务');
else ok('weightSemantics 生成调度计划');
const storedPlan = platform.appendMaintenancePlanBatch({ input: { fixture: true }, plan }, { state: context.db });
if (!storedPlan.queueItems || !storedPlan.queueItems.length || storedPlan.batch.kind !== 'memory-schedule-plan') error('memoryScheduleStore 未写入调度计划 batch');
else ok('memoryScheduleStore 写入调度计划 batch');
const pass = core.collectWeightUpdates(context.db.memoryBrain, { profileId: 'balanced', maxUpdates: 80 });
if (!pass.updates || !pass.updates.length || !pass.floating) error('weightSemantics 未生成浮现/衰减更新');
else ok('weightSemantics 生成浮现/衰减更新');
const storedMaintenance = platform.appendMaintenanceCycleBatch({ input: { fixture: true }, pass }, { state: context.db });
if (!storedMaintenance.batch || storedMaintenance.batch.kind !== 'memory-maintenance' || !storedMaintenance.changedCount) error('memoryScheduleStore 未写入 memory-maintenance batch');
else ok('memoryScheduleStore 写入 memory-maintenance batch');
const weightedFacts = platform.listFacts({ state: context.db }).filter(fact => typeof fact.weight === 'number' && typeof fact.activation === 'number');
if (!weightedFacts.length) error('浮现/衰减维护未给 facts 写入 weight / activation');
else ok('浮现/衰减维护写入 fact weight / activation');
const schedulerCards = core.compactSchedulerForList(context.db.memoryBrain.settings.scheduler, plan, platform.listSchedulerRuns({ state: context.db }), platform.listScheduleQueue({ state: context.db }));
if (!schedulerCards.costProfiles || schedulerCards.costProfiles.length !== 3 || !schedulerCards.queueItems.length) error('compactSchedulerForList 未生成调度展示模型');
else ok('compactSchedulerForList 生成调度展示模型');
const palace = core.buildMemoryPalace(context.db.memoryBrain, { highlightLimit: 6 });
if (!palace.rooms || palace.rooms.length < 8 || !palace.highlights || !palace.safety) error('productSemantics 未生成记忆小屋展示模型');
else ok('productSemantics 生成记忆小屋展示模型');
if (palace.safety.readyForFormalCutover !== false) error('v0.3.8 safety gate 不应允许正式接管');
else ok('v0.3.8 safety gate 保持禁止正式接管');
const bundle = platform.createExportBundle({ state: context.db });
if (!bundle.manifest || !bundle.memoryBrain || bundle.policy.formalPromptInjection !== false) error('memoryExportAdapter 未生成安全导出包');
else ok('memoryExportAdapter 生成安全导出包');
const storedExport = platform.appendExportPreviewBatch({ input: { fixture: true }, bundle }, { state: context.db });
if (!storedExport.exportRecord || storedExport.batch.kind !== 'memory-export-preview') error('memoryExportAdapter 未写入导出预览 batch');
else ok('memoryExportAdapter 写入导出预览 batch');
const exportRecords = platform.listExports({ state: context.db }).filter(item => item.status === 'active');
if (exportRecords.length !== 1 || exportRecords[0].storedData !== 'manifest-only') error('导出记录不是 manifest-only active 记录');
else ok('导出记录保持 manifest-only');
const archiveSource = core.buildArchiveSourceFromChat({ id: 'chat-archive-1', name: '历史测试聊天', history: Array.from({ length: 72 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: `测试消息 ${index + 1}`, timestamp: 1780000000000 + index * 60000 })) }, 'character', 0, { messageLimit: 24, overlap: 4 });
context.db.characters = [{ id: 'chat-archive-1', name: '历史测试聊天', history: Array.from({ length: 72 }, (_, index) => ({ role: index % 2 ? 'assistant' : 'user', content: `测试消息 ${index + 1}`, timestamp: 1780000000000 + index * 60000 })) }];
context.db.memoryBrain.archiveSources = [archiveSource];
const chunksResult = platform.prepareArchiveChunks({ state: context.db, chunkSize: 24, overlap: 4 });
if (!chunksResult.chunks || chunksResult.chunks.length < 3 || !chunksResult.cursors.length) error('historyChunkStore 未生成历史切片和游标');
else ok('historyChunkStore 生成历史切片和游标');
const backfillResult = platform.prepareBackfillQueue({ state: context.db, jobLimit: 20, taskKind: 'event-backfill' });
if (!backfillResult.jobs || backfillResult.jobs.length !== chunksResult.chunks.length || backfillResult.batch.kind !== 'history-backfill-queue') error('backfillQueueStore 未生成回填队列');
else ok('backfillQueueStore 生成回填队列');
const startResult = platform.applyBackfillAction('start', { state: context.db, limit: 2 });
if (!startResult.jobs || startResult.jobs.length !== 2 || !startResult.jobs.every(job => job.status === 'running')) error('backfillQueueStore start 操作失败');
else ok('backfillQueueStore 支持 start 断点操作');
const pauseResult = platform.applyBackfillAction('pause', { state: context.db, limit: 20 });
if (!pauseResult.jobs || !pauseResult.jobs.length || !platform.listBackfillJobs({ state: context.db }).some(job => job.status === 'paused')) error('backfillQueueStore pause 操作失败');
else ok('backfillQueueStore 支持 pause 操作');
const backfillRollback = platform.rollbackBackfillBatch(pauseResult.batch.id, { state: context.db });
if (!backfillRollback.ok || !backfillRollback.jobCount) error('history-backfill-queue rollback 失败');
else ok('history-backfill-queue rollback 成功');
const exportRollback = platform.rollbackExportBatch(storedExport.batch.id, { state: context.db });
if (!exportRollback.ok || exportRollback.exportCount !== 1) error('memory-export-preview rollback 失败');
else ok('memory-export-preview rollback 成功');
const activeExports = platform.listExports({ state: context.db }).filter(item => item.status === 'active');
if (activeExports.length) error('export rollback 后仍残留 active export');
else ok('export rollback 清理 active export');
const maintenanceRollback = platform.rollbackMaintenanceBatch(storedMaintenance.batch.id, { state: context.db });
if (!maintenanceRollback.ok || !maintenanceRollback.restoredCount) error('memory-maintenance rollback 失败');
else ok('memory-maintenance rollback 成功');
const weightedAfterRollback = platform.listFacts({ state: context.db }).filter(fact => typeof fact.weight === 'number');
if (weightedAfterRollback.length) error('memory-maintenance rollback 后 facts 仍残留 weight');
else ok('memory-maintenance rollback 清理 fact weight');
const injectionRollback = platform.rollbackInjectionPreviewBatch(storedInjection.batch.id, { state: context.db });
if (!injectionRollback.ok || injectionRollback.previewCount !== 1) error('injection preview rollback 失败');
else ok('injection preview rollback 成功');
const activePreviews = platform.listInjectionPreviews({ state: context.db }).filter(preview => preview.status === 'active');
if (activePreviews.length) error('injection rollback 后仍残留 active preview');
else ok('injection rollback 清理 active preview');

const modelRollback = platform.rollbackModelBatch(storedModels.batch.id, { state: context.db });
if (!modelRollback.ok || modelRollback.modelCount !== 4) error('model batch rollback 失败');
else ok('model batch rollback 成功');
const activeAfterModelRollback = platform.listModels({ state: context.db }).filter(model => model.status === 'active');
if (activeAfterModelRollback.length) error('model rollback 后仍残留 active 模型');
else ok('model rollback 清理 active 模型');

const graphRollback = platform.rollbackGraphBatch(storedGraph.batch.id, { state: context.db });
if (!graphRollback.ok) error('graph batch rollback 失败');
else ok('graph batch rollback 成功');
const afterGraphRollbackFacts = platform.listFacts({ state: context.db }).filter(fact => Array.isArray(fact.edgeIds) && fact.edgeIds.length);
if (afterGraphRollbackFacts.length) error('graph rollback 后 facts 仍残留 edgeIds');
else ok('graph rollback 清理 fact.edgeIds');
const rollback = platform.rollbackFamilyBatch(storedFamilies.batch.id, { state: context.db });
if (!rollback.ok) error('family batch rollback 失败');
else ok('family batch rollback 成功');
const afterRollbackFacts = platform.listFacts({ state: context.db }).filter(fact => Array.isArray(fact.familyIds) && fact.familyIds.includes(familyId));
if (afterRollbackFacts.length) error('rollback 后 facts 仍残留 familyIds');
else ok('rollback 清理 familyIds');

if (hasError) {
  console.error('\nMemory Brain fixture gate failed.');
  process.exit(1);
}
console.log('\nMemory Brain fixture gate passed.');
