// --- Memory Brain public facade (v0.4.7) ---
// public facade 只导出稳定 API，不写业务逻辑。
(function registerMemoryBrainPublic(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    feature.publicApi = {
        render: function render() { return feature.view.render(); },
        scanLegacySources: function scanLegacySources(options) { return feature.service.scanLegacySources(options || {}); },
        scanHistoryArchive: function scanHistoryArchive(options) { return feature.service.scanHistoryArchive(options || {}); },
        prepareArchiveChunks: function prepareArchiveChunks(options) { return feature.service.prepareArchiveChunks(options || {}); },
        prepareBackfillQueue: function prepareBackfillQueue(options) { return feature.service.prepareBackfillQueue(options || {}); },
        startBackfillQueue: function startBackfillQueue(options) { return feature.service.startBackfillQueue(options || {}); },
        pauseBackfillQueue: function pauseBackfillQueue(options) { return feature.service.pauseBackfillQueue(options || {}); },
        resumeBackfillQueue: function resumeBackfillQueue(options) { return feature.service.resumeBackfillQueue(options || {}); },
        retryFailedBackfillJobs: function retryFailedBackfillJobs(options) { return feature.service.retryFailedBackfillJobs(options || {}); },
        runHistoryEventBackfill: function runHistoryEventBackfill(options) { return feature.service.runHistoryEventBackfill(options || {}); },
        runHistoryFactBackfill: function runHistoryFactBackfill(options) { return feature.service.runHistoryFactBackfill(options || {}); },
        runFactLifecycleReview: function runFactLifecycleReview(options) { return feature.service.runFactLifecycleReview(options || {}); },
        rebuildFamilyGraph: function rebuildFamilyGraph(options) { return feature.service.rebuildFamilyGraph(options || {}); },
        rebuildFullHistoryModels: function rebuildFullHistoryModels(options) { return feature.service.rebuildFullHistoryModels(options || {}); },
        summarizeRecentChat: function summarizeRecentChat(options) { return feature.service.summarizeRecentChat(options || {}); },
        extractFactsFromLatestEvent: function extractFactsFromLatestEvent(options) { return feature.service.extractFactsFromLatestEvent(options || {}); },
        organizeFamilies: function organizeFamilies(options) { return feature.service.organizeFamilies(options || {}); },
        buildGraph: function buildGraph(options) { return feature.service.buildGraph(options || {}); },
        buildLongTermModels: function buildLongTermModels(options) { return feature.service.buildLongTermModels(options || {}); },
        buildShadowInjectionPreview: function buildShadowInjectionPreview(options) { return feature.service.buildShadowInjectionPreview(options || {}); },
        updateCostProfile: function updateCostProfile(profileId, options) { return feature.service.updateCostProfile(profileId || 'balanced', options || {}); },
        buildMaintenancePlan: function buildMaintenancePlan(options) { return feature.service.buildMaintenancePlan(options || {}); },
        runMaintenanceCycle: function runMaintenanceCycle(options) { return feature.service.runMaintenanceCycle(options || {}); },
        rollbackLatestMaintenanceBatch: function rollbackLatestMaintenanceBatch(options) { return feature.service.rollbackLatestMaintenanceBatch(options || {}); },
        getMemoryPalace: function getMemoryPalace(options) { return feature.service.getMemoryPalace(options || {}); },
        copyExportBundle: function copyExportBundle(options) { return feature.service.copyExportBundle(options || {}); },
        getExportCards: function getExportCards(options) { return feature.service.getExportCards(options || {}); },
        rollbackLatestExportBatch: function rollbackLatestExportBatch(options) { return feature.service.rollbackLatestExportBatch(options || {}); },
        rollbackLatestArchiveChunkBatch: function rollbackLatestArchiveChunkBatch(options) { return feature.service.rollbackLatestArchiveChunkBatch(options || {}); },
        rollbackLatestBackfillBatch: function rollbackLatestBackfillBatch(options) { return feature.service.rollbackLatestBackfillBatch(options || {}); },
        rollbackLatestHistoryEventBatch: function rollbackLatestHistoryEventBatch(options) { return feature.service.rollbackLatestHistoryEventBatch(options || {}); },
        rollbackLatestHistoryFactBatch: function rollbackLatestHistoryFactBatch(options) { return feature.service.rollbackLatestHistoryFactBatch(options || {}); },
        rollbackLatestFactLifecycleBatch: function rollbackLatestFactLifecycleBatch(options) { return feature.service.rollbackLatestFactLifecycleBatch(options || {}); },
        rollbackLatestFamilyGraphRebuildBatch: function rollbackLatestFamilyGraphRebuildBatch(options) { return feature.service.rollbackLatestFamilyGraphRebuildBatch(options || {}); },
        rollbackLatestHistoryModelBatch: function rollbackLatestHistoryModelBatch(options) { return feature.service.rollbackLatestHistoryModelBatch(options || {}); },
        getTimelineEvents: function getTimelineEvents(options) { return feature.service.getTimelineEvents(options || {}); },
        getFactCards: function getFactCards(options) { return feature.service.getFactCards(options || {}); },
        getFamilyCards: function getFamilyCards(options) { return feature.service.getFamilyCards(options || {}); },
        getGraphCards: function getGraphCards(options) { return feature.service.getGraphCards(options || {}); },
        getModelCards: function getModelCards(options) { return feature.service.getModelCards(options || {}); },
        getInjectionPreviewCards: function getInjectionPreviewCards(options) { return feature.service.getInjectionPreviewCards(options || {}); },
        getSchedulerCards: function getSchedulerCards(options) { return feature.service.getSchedulerCards(options || {}); },
        getArchiveCards: function getArchiveCards(options) { return feature.service.getArchiveCards(options || {}); },
        getArchiveChunkCards: function getArchiveChunkCards(options) { return feature.service.getArchiveChunkCards(options || {}); },
        getBackfillCards: function getBackfillCards(options) { return feature.service.getBackfillCards(options || {}); },
        getHistoryEventBackfillCards: function getHistoryEventBackfillCards(options) { return feature.service.getHistoryEventBackfillCards(options || {}); },
        getHistoryFactBackfillCards: function getHistoryFactBackfillCards(options) { return feature.service.getHistoryFactBackfillCards(options || {}); },
        getFactLifecycleCards: function getFactLifecycleCards(options) { return feature.service.getFactLifecycleCards(options || {}); },
        getFamilyGraphRebuildCards: function getFamilyGraphRebuildCards(options) { return feature.service.getFamilyGraphRebuildCards(options || {}); },
        getHistoryModelRebuildCards: function getHistoryModelRebuildCards(options) { return feature.service.getHistoryModelRebuildCards(options || {}); },
        getDashboard: function getDashboard(options) { return feature.service.getDashboard(options || {}); },
        copyPlanningText: function copyPlanningText() { return feature.service.copyPlanningText(); },
        openConsole: function openConsole() { return feature.service.openConsole(); },
        getRoutingReport: function getRoutingReport() { return feature.service.getRoutingReport(); },
        getPublicContract: function getPublicContract() {
            return {
                feature: 'memoryBrain',
                ready: true,
                release: 'v0.4.7',
                stableApis: ['render', 'scanLegacySources', 'scanHistoryArchive', 'prepareArchiveChunks', 'prepareBackfillQueue', 'startBackfillQueue', 'pauseBackfillQueue', 'resumeBackfillQueue', 'retryFailedBackfillJobs', 'runHistoryEventBackfill', 'runHistoryFactBackfill', 'runFactLifecycleReview', 'rebuildFamilyGraph', 'rebuildFullHistoryModels', 'summarizeRecentChat', 'extractFactsFromLatestEvent', 'organizeFamilies', 'buildGraph', 'buildLongTermModels', 'buildShadowInjectionPreview', 'updateCostProfile', 'buildMaintenancePlan', 'runMaintenanceCycle', 'rollbackLatestMaintenanceBatch', 'getMemoryPalace', 'copyExportBundle', 'getExportCards', 'rollbackLatestExportBatch', 'rollbackLatestArchiveChunkBatch', 'rollbackLatestBackfillBatch', 'rollbackLatestHistoryEventBatch', 'rollbackLatestHistoryFactBatch', 'rollbackLatestFactLifecycleBatch', 'rollbackLatestFamilyGraphRebuildBatch', 'rollbackLatestHistoryModelBatch', 'getTimelineEvents', 'getFactCards', 'getFamilyCards', 'getGraphCards', 'getModelCards', 'getInjectionPreviewCards', 'getSchedulerCards', 'getArchiveCards', 'getArchiveChunkCards', 'getBackfillCards', 'getHistoryEventBackfillCards', 'getHistoryFactBackfillCards', 'getFactLifecycleCards', 'getFamilyGraphRebuildCards', 'getHistoryModelRebuildCards', 'getDashboard', 'copyPlanningText', 'openConsole'],
                note: 'v0.4.7 增加全历史长期模型重建；继续影子模式，不改旧记忆、不正式注入。'
            };
        }
    };
})(window);
