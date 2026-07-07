// --- Memory Brain service owner (v0.4.7) ---
// 编排记忆脑 App 的扫描、状态读取、事件/事实/家族入口和控制台记录；不直接渲染 DOM。
(function registerMemoryBrainService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    const model = feature.model;

    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }

    function recordOperation(label, data, level) {
        const service = app.platform.observability && app.platform.observability.operationTraceService;
        if (service && typeof service.recordOperation === 'function') {
            return service.recordOperation({ source: 'features/memoryBrain', sourceModule: 'features/memoryBrain/service', label, level: level || 'event', data: data || {} });
        }
        return null;
    }

    function getDashboard(options = {}) {
        const platformApi = getPlatformApi();
        const snapshot = platformApi.getSnapshot(options);
        const replacementPlan = platformApi.getReplacementPlan();
        const legacyScan = options.forceScan ? platformApi.scanLegacySources(options) : null;
        const archiveCards = feature.historyArchiveService && feature.historyArchiveService.getArchiveCards ? feature.historyArchiveService.getArchiveCards(options) : null;
        const chunkCards = feature.historyChunkService && feature.historyChunkService.getArchiveChunkCards ? feature.historyChunkService.getArchiveChunkCards(options) : null;
        const backfillCards = feature.historyBackfillService && feature.historyBackfillService.getBackfillCards ? feature.historyBackfillService.getBackfillCards(options) : null;
        const eventBackfillCards = feature.historyEventBackfillService && feature.historyEventBackfillService.getHistoryEventBackfillCards ? feature.historyEventBackfillService.getHistoryEventBackfillCards(options) : null;
        const factBackfillCards = feature.historyFactBackfillService && feature.historyFactBackfillService.getHistoryFactBackfillCards ? feature.historyFactBackfillService.getHistoryFactBackfillCards(options) : null;
        const factLifecycleCards = feature.factLifecycleService && feature.factLifecycleService.getFactLifecycleCards ? feature.factLifecycleService.getFactLifecycleCards(options) : null;
        const familyGraphRebuildCards = feature.familyGraphRebuildService && feature.familyGraphRebuildService.getFamilyGraphRebuildCards ? feature.familyGraphRebuildService.getFamilyGraphRebuildCards(options) : null;
        const historyModelRebuildCards = feature.historyModelRebuildService && feature.historyModelRebuildService.getHistoryModelRebuildCards ? feature.historyModelRebuildService.getHistoryModelRebuildCards(options) : null;
        return model.buildDashboard(snapshot, legacyScan, replacementPlan, archiveCards, chunkCards, backfillCards, eventBackfillCards, factBackfillCards, factLifecycleCards, familyGraphRebuildCards, historyModelRebuildCards);
    }

    function scanHistoryArchive(options = {}) {
        return feature.historyArchiveService.scanHistoryArchive(options);
    }
    function prepareArchiveChunks(options = {}) {
        return feature.historyChunkService.prepareArchiveChunks(options);
    }
    function prepareBackfillQueue(options = {}) { return feature.historyBackfillService.prepareBackfillQueue(options); }
    function startBackfillQueue(options = {}) { return feature.historyBackfillService.startBackfillQueue(options); }
    function pauseBackfillQueue(options = {}) { return feature.historyBackfillService.pauseBackfillQueue(options); }
    function resumeBackfillQueue(options = {}) { return feature.historyBackfillService.resumeBackfillQueue(options); }
    function retryFailedBackfillJobs(options = {}) { return feature.historyBackfillService.retryFailedBackfillJobs(options); }
    function runHistoryEventBackfill(options = {}) { return feature.historyEventBackfillService.runHistoryEventBackfill(options); }
    function runHistoryFactBackfill(options = {}) { return feature.historyFactBackfillService.runHistoryFactBackfill(options); }
    function runFactLifecycleReview(options = {}) { return feature.factLifecycleService.runFactLifecycleReview(options); }
    function rollbackLatestFactLifecycleBatch(options = {}) { return feature.factLifecycleService.rollbackLatestFactLifecycleBatch(options); }
    function rebuildFamilyGraph(options = {}) { return feature.familyGraphRebuildService.rebuildFamilyGraph(options); }
    function rollbackLatestFamilyGraphRebuildBatch(options = {}) { return feature.familyGraphRebuildService.rollbackLatestFamilyGraphRebuildBatch(options); }
    function rebuildFullHistoryModels(options = {}) { return feature.historyModelRebuildService.rebuildFullHistoryModels(options); }
    function rollbackLatestHistoryModelBatch(options = {}) { return feature.historyModelRebuildService.rollbackLatestHistoryModelBatch(options); }

    function scanLegacySources(options = {}) {
        const report = getPlatformApi().rememberLegacyScan(options);
        recordOperation('记忆脑扫描旧记忆来源', { chatCount: report.chatCount, totals: report.totals, sources: report.sources });
        return report;
    }

    function getReplacementAnswer() {
        return [
            '新记忆脑不是立刻替换旧系统。v0.3 到 v0.8 都属于影子整理、读取、对照和自我维护阶段。',
            'v0.3 完成新脑能力，v0.4 吃完整个过去，v0.5 做可信纠错，v0.6 才做正式注入准备，v0.7 做长期陪伴人格，v0.8 做梦境消化。',
            '到 v0.9 完成之前，Memory Brain 仍是可读取记忆脑；正式 prompt 继续由当前选择的旧记忆 owner 执行。',
            '切换前旧记忆表格、向量记忆、回忆日记互斥守门，不双写、不双注入。'
        ].join('\n');
    }

    function getHistorySortingAnswer() {
        return [
            '历史整理分批进行，不一次性全吞。v0.4.0 先扫描全部聊天来源，v0.4.1 按聊天、角色、时间范围切成带 overlap 的可续跑 archiveChunks，v0.4.2 再把 chunks 编入可暂停、可继续、可重试的 backfillJobs，v0.4.3 开始把 running 的 event-backfill 任务真正整理成历史事件，v0.4.4 再把历史事件拆成原子事实。',
            '每批先生成事件摘要，保留来源消息范围；再拆原子事实；再做向量和关键词索引。',
            '事实可以进入多个记忆家族，家族超过阈值后更新摘要；graph 负责连接人、事、主题、目的、情绪和项目。',
            '所有批次都写入控制台，能看到原始输出、解析错误、应用结果，也能回滚。'
        ].join('\n');
    }

    function getFullPlanText() {
        return [
            '【OWO Memory Brain v0.3.x 完整路线】',
            'v0.3.0：架构骨架。memoryBrain 独立 store、App 壳、旧来源扫描、替换路线。',
            'v0.3.1：事件时间线。最近聊天 → 事件摘要 → 时间线卡片。',
            'v0.3.2：原子事实。事件 → 多条事实候选，保留证据、来源、置信度和批次回滚。',
            'v0.3.3：记忆家族。事实通过向量/关键词自动成团，AI 命名家族并生成摘要。',
            'v0.3.4：Graph 关系。事实连接人物、主题、目的、情绪、项目，形成轻量关系卡片。',
            'v0.3.5：长期模型。生成用户画像、AI 自我、世界观、项目脑，并保留版本历史和回滚。',
            'v0.3.6：注入预览。新记忆脑生成影子注入包，控制台对照旧系统，不正式替换。',
            'v0.3.7：调度和成本。省钱/均衡/深度模式，整理队列，浮现/衰减维护。',
            'v0.3.8：产品化收口。记忆小屋 UI、今日浮现、切换前安全门、导出包、fixture gate 和稳定收口。',
            'v0.3.9：AI Pipeline。统一 provider / task route / response batch / 控制台分类。',
            'v0.3.10：旧记忆 owner 守门。Memory Brain 到 v0.9 前只读，正式注入仍由当前旧档案记忆 owner 负责。',
            'v0.4.0：历史大整理入口。扫描全部聊天来源、消息数量、时间范围和预计切片数，建立 archiveSources。',
            'v0.4.1：历史切片 / 游标。把几万条消息切成 archiveChunks，建立 archiveCursors，支持后续断点续跑。',
            'v0.4.2：回填队列 / 断点续跑。把 archiveChunks 编入 backfillJobs / runs，支持暂停、继续、失败重试和回滚。',
            'v0.4.3：历史事件回填。对 running 的 event-backfill 任务调用 memory-event 模型，生成 0～多条历史事件并推进断点状态。',
            'v0.4.4：历史事实回填。对历史事件建立 fact-backfill 任务，调用 memory-fact 模型拆出原子事实。',
            'v0.4.5：事实生命周期。标记重复、冲突、过时事实，所有变更 batch 化可回滚。',
            'v0.4.6：全量家族 / graph 重建。基于清理后的 active facts 重建 family 与 graph，批次可回滚。'
        ].join('\n');
    }

    function copyPlanningText() {
        const text = [
            getFullPlanText(),
            '',
            '【什么时候替换旧记忆系统】',
            getReplacementAnswer(),
            '',
            '【如何避免双系统】',
            '只允许一个正式注入 owner。v0.3.1 起旧系统是 read-only source，新系统先是 shadow brain；切换前不双写、不双注入。',
            '',
            '【历史记录怎么整理】',
            getHistorySortingAnswer()
        ].join('\n');
        if (global.navigator && global.navigator.clipboard && global.navigator.clipboard.writeText) global.navigator.clipboard.writeText(text);
        recordOperation('复制记忆脑完整计划', { textLength: text.length });
        return text;
    }

    function summarizeRecentChat(options = {}) { return feature.eventTimelineService.generateEventFromRecentMessages(options); }
    function extractFactsFromLatestEvent(options = {}) { return feature.factExtractionService.extractFactsFromLatestEvent(options); }
    function organizeFamilies(options = {}) { return feature.familyService.organizeFamilies(options); }
    function buildGraph(options = {}) { return feature.graphService.buildGraph(options); }
    function buildLongTermModels(options = {}) { return feature.longTermModelService.buildLongTermModels(options); }
    function buildShadowInjectionPreview(options = {}) { return feature.injectionPreviewService.buildShadowInjectionPreview(options); }
    function updateCostProfile(profileId, options = {}) { return feature.memorySchedulerService.updateCostProfile(profileId, options); }
    function buildMaintenancePlan(options = {}) { return feature.memorySchedulerService.buildMaintenancePlan(options); }
    function runMaintenanceCycle(options = {}) { return feature.memorySchedulerService.runMaintenanceCycle(options); }
    function rollbackLatestMaintenanceBatch(options = {}) { return feature.memorySchedulerService.rollbackLatestMaintenanceBatch(options); }
    function getMemoryPalace(options = {}) { return feature.productizationService.getMemoryPalace(options); }
    function copyExportBundle(options = {}) { return feature.productizationService.copyExportBundle(options); }
    function getExportCards(options = {}) { return feature.productizationService.getExportCards(options); }
    function rollbackLatestExportBatch(options = {}) { return feature.productizationService.rollbackLatestExportBatch(options); }
    function getTimelineEvents(options = {}) { return feature.eventTimelineService.getTimelineEvents(options); }
    function getEventById(id, options = {}) { return feature.eventTimelineService.getEventById(id, options); }
    function getFactCards(options = {}) { return feature.factExtractionService.getFactCards(options); }
    function getFamilyCards(options = {}) { return feature.familyService.getFamilyCards(options); }
    function getGraphCards(options = {}) { return feature.graphService.getGraphCards(options); }
    function getModelCards(options = {}) { return feature.longTermModelService.getModelCards(options); }
    function getInjectionPreviewCards(options = {}) { return feature.injectionPreviewService.getInjectionPreviewCards(options); }
    function getSchedulerCards(options = {}) { return feature.memorySchedulerService.getSchedulerCards(options); }
    function getArchiveCards(options = {}) { return feature.historyArchiveService.getArchiveCards(options); }
    function getArchiveChunkCards(options = {}) { return feature.historyChunkService.getArchiveChunkCards(options); }
    function getBackfillCards(options = {}) { return feature.historyBackfillService.getBackfillCards(options); }
    function getHistoryEventBackfillCards(options = {}) { return feature.historyEventBackfillService.getHistoryEventBackfillCards(options); }
    function getHistoryFactBackfillCards(options = {}) { return feature.historyFactBackfillService.getHistoryFactBackfillCards(options); }
    function getFactLifecycleCards(options = {}) { return feature.factLifecycleService.getFactLifecycleCards(options); }
    function getFamilyGraphRebuildCards(options = {}) { return feature.familyGraphRebuildService.getFamilyGraphRebuildCards(options); }
    function getHistoryModelRebuildCards(options = {}) { return feature.historyModelRebuildService.getHistoryModelRebuildCards(options); }
    function retireFact(factId, options = {}) { return feature.factExtractionService.retireFact(factId, options); }
    function retireFamily(familyId, options = {}) { return feature.familyService.retireFamily(familyId, options); }
    function retireEdge(edgeId, options = {}) { return feature.graphService.retireEdge(edgeId, options); }
    function retireModel(modelId, options = {}) { return feature.longTermModelService.retireModel(modelId, options); }
    function retireInjectionPreview(previewId, options = {}) { return feature.injectionPreviewService.retireInjectionPreview(previewId, options); }
    function rollbackLatestFactBatch(options = {}) { return feature.factExtractionService.rollbackLatestFactBatch(options); }
    function rollbackLatestFamilyBatch(options = {}) { return feature.familyService.rollbackLatestFamilyBatch(options); }
    function rollbackLatestGraphBatch(options = {}) { return feature.graphService.rollbackLatestGraphBatch(options); }
    function rollbackLatestModelBatch(options = {}) { return feature.longTermModelService.rollbackLatestModelBatch(options); }
    function rollbackLatestInjectionPreviewBatch(options = {}) { return feature.injectionPreviewService.rollbackLatestInjectionPreviewBatch(options); }
    function rollbackLatestArchiveChunkBatch(options = {}) { return feature.historyChunkService.rollbackLatestArchiveChunkBatch(options); }
    function rollbackLatestBackfillBatch(options = {}) { return feature.historyBackfillService.rollbackLatestBackfillBatch(options); }
    function rollbackLatestHistoryEventBatch(options = {}) { return feature.historyEventBackfillService.rollbackLatestHistoryEventBatch(options); }
    function rollbackLatestHistoryFactBatch(options = {}) { return feature.historyFactBackfillService.rollbackLatestHistoryFactBatch(options); }

    function openConsole() {
        const quickDock = app.features.quickDock && app.features.quickDock.publicApi;
        const opener = quickDock && (quickDock.openConsolePanel || quickDock.openConsole || quickDock.openRequestPanel);
        if (typeof opener === 'function') return opener.call(quickDock, { source: 'memoryBrain' });
        return false;
    }

    function getRoutingReport() {
        return {
            owner: 'features/memoryBrain/service',
            release: 'v0.4.7',
            platformOwner: 'platform/memoryBrain.publicApi',
            consoleOwner: 'platform/observability.operationTraceService',
            legacyMode: 'read-only-source',
            replacementPolicy: 'single injection owner after shadow comparison',
            timelineOwner: 'features/memoryBrain/eventTimelineService',
            factOwner: 'features/memoryBrain/factExtractionService',
            familyOwner: 'features/memoryBrain/familyService',
            graphOwner: 'features/memoryBrain/graphService',
            longTermModelOwner: 'features/memoryBrain/longTermModelService',
            injectionPreviewOwner: 'features/memoryBrain/injectionPreviewService',
            schedulerOwner: 'features/memoryBrain/memorySchedulerService',
            productizationOwner: 'features/memoryBrain/productizationService',
            archiveOwner: 'features/memoryBrain/historyArchiveService',
            chunkOwner: 'features/memoryBrain/historyChunkService',
            backfillOwner: 'features/memoryBrain/historyBackfillService',
            historyEventBackfillOwner: 'features/memoryBrain/historyEventBackfillService',
            historyFactBackfillOwner: 'features/memoryBrain/historyFactBackfillService',
            factLifecycleOwner: 'features/memoryBrain/factLifecycleService',
            familyGraphRebuildOwner: 'features/memoryBrain/familyGraphRebuildService',
            historyModelRebuildOwner: 'features/memoryBrain/historyModelRebuildService',
            shadowMode: true,
            activeWrites: ['memoryBrain.events', 'memoryBrain.facts', 'memoryBrain.families', 'memoryBrain.edges', 'memoryBrain.models', 'memoryBrain.injectionPreviews', 'memoryBrain.scheduleQueue', 'memoryBrain.schedulerRuns', 'memoryBrain.exports', 'memoryBrain.archiveSources', 'memoryBrain.archiveScanRuns', 'memoryBrain.archiveChunks', 'memoryBrain.archiveCursors', 'memoryBrain.archiveChunkRuns', 'memoryBrain.backfillJobs', 'memoryBrain.backfillRuns', 'memoryBrain.historyEventBackfillRuns', 'memoryBrain.historyFactBackfillRuns', 'memoryBrain.factLifecycleRuns', 'memoryBrain.factMerges', 'memoryBrain.conflicts', 'memoryBrain.obsoleteFacts', 'memoryBrain.familyGraphRebuildRuns', 'memoryBrain.historyModelRebuildRuns', 'memoryBrain.batches']
        };
    }

    feature.service = {
        getDashboard, scanHistoryArchive, prepareArchiveChunks, prepareBackfillQueue, startBackfillQueue, pauseBackfillQueue, resumeBackfillQueue, retryFailedBackfillJobs, runHistoryEventBackfill, runHistoryFactBackfill, runFactLifecycleReview, rebuildFamilyGraph, rebuildFullHistoryModels, scanLegacySources, getReplacementAnswer, getHistorySortingAnswer, getFullPlanText, copyPlanningText,
        summarizeRecentChat, extractFactsFromLatestEvent, organizeFamilies, buildGraph, buildLongTermModels, buildShadowInjectionPreview, updateCostProfile, buildMaintenancePlan, runMaintenanceCycle, getMemoryPalace, copyExportBundle, getTimelineEvents, getEventById, getFactCards, getFamilyCards, getGraphCards, getModelCards, getInjectionPreviewCards, getSchedulerCards, getArchiveCards, getArchiveChunkCards, getBackfillCards, getHistoryEventBackfillCards, getHistoryFactBackfillCards, getFactLifecycleCards, getFamilyGraphRebuildCards, getHistoryModelRebuildCards, getExportCards,
        retireFact, retireFamily, retireEdge, retireModel, retireInjectionPreview, rollbackLatestFactBatch, rollbackLatestFamilyBatch, rollbackLatestGraphBatch, rollbackLatestModelBatch, rollbackLatestInjectionPreviewBatch, rollbackLatestMaintenanceBatch, rollbackLatestExportBatch, rollbackLatestArchiveChunkBatch, rollbackLatestBackfillBatch, rollbackLatestHistoryEventBatch, rollbackLatestHistoryFactBatch, rollbackLatestFactLifecycleBatch, rollbackLatestFamilyGraphRebuildBatch, rollbackLatestHistoryModelBatch, openConsole, recordOperation, getRoutingReport
    };
})(window);
