// --- Memory Brain public facade (v0.4.2) ---
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
        getDashboard: function getDashboard(options) { return feature.service.getDashboard(options || {}); },
        copyPlanningText: function copyPlanningText() { return feature.service.copyPlanningText(); },
        openConsole: function openConsole() { return feature.service.openConsole(); },
        getRoutingReport: function getRoutingReport() { return feature.service.getRoutingReport(); },
        getPublicContract: function getPublicContract() {
            return {
                feature: 'memoryBrain',
                ready: true,
                release: 'v0.4.2',
                stableApis: ['render', 'scanLegacySources', 'scanHistoryArchive', 'prepareArchiveChunks', 'prepareBackfillQueue', 'startBackfillQueue', 'pauseBackfillQueue', 'resumeBackfillQueue', 'retryFailedBackfillJobs', 'summarizeRecentChat', 'extractFactsFromLatestEvent', 'organizeFamilies', 'buildGraph', 'buildLongTermModels', 'buildShadowInjectionPreview', 'updateCostProfile', 'buildMaintenancePlan', 'runMaintenanceCycle', 'rollbackLatestMaintenanceBatch', 'getMemoryPalace', 'copyExportBundle', 'getExportCards', 'rollbackLatestExportBatch', 'rollbackLatestArchiveChunkBatch', 'rollbackLatestBackfillBatch', 'getTimelineEvents', 'getFactCards', 'getFamilyCards', 'getGraphCards', 'getModelCards', 'getInjectionPreviewCards', 'getSchedulerCards', 'getArchiveCards', 'getArchiveChunkCards', 'getBackfillCards', 'getDashboard', 'copyPlanningText', 'openConsole'],
                note: 'v0.4.2 增加回填队列 / 断点续跑，建立 backfillJobs / backfillRuns；继续影子模式，不总结、不迁移、不正式注入。'
            };
        }
    };
})(window);
