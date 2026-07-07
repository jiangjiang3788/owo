// --- Memory Brain platform public facade (v0.4.2) ---
// 只导出存储、embedding、事件/事实/家族/graph 批次与旧来源扫描能力，不写 UI 逻辑。
(function registerMemoryBrainPlatformPublic(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    const store = platform.memoryBrainStore;
    const factStore = platform.memoryFactStore;
    const embeddingService = platform.memoryEmbeddingService;
    const familyStore = platform.memoryFamilyStore;
    const graphStore = platform.memoryGraphStore;
    const modelStore = platform.memoryModelStore;
    const injectionStore = platform.memoryInjectionStore;
    const scheduleStore = platform.memoryScheduleStore;
    const exportAdapter = platform.memoryExportAdapter;
    const archiveScanner = platform.historyArchiveScanner;
    const chunkStore = platform.historyChunkStore;
    const backfillStore = platform.backfillQueueStore;

    platform.publicApi = {
        ensureState: function ensureState(options) { return store.ensureState(options || {}); },
        getSnapshot: function getSnapshot(options) { return store.getSnapshot(options || {}); },
        scanLegacySources: function scanLegacySources(options) { return store.scanLegacySources(options || {}); },
        rememberLegacyScan: function rememberLegacyScan(options) { return store.rememberLegacyScan(options || {}); },
        scanArchiveSources: function scanArchiveSources(options) { return archiveScanner.scanArchiveSources(options || {}); },
        rememberArchiveSources: function rememberArchiveSources(options) { return archiveScanner.rememberArchiveSources(options || {}); },
        listArchiveSources: function listArchiveSources(options) { return archiveScanner.listArchiveSources(options || {}); },
        listArchiveScanRuns: function listArchiveScanRuns(options) { return archiveScanner.listArchiveScanRuns(options || {}); },
        getArchiveSnapshot: function getArchiveSnapshot(options) { return archiveScanner.getArchiveSnapshot(options || {}); },
        prepareArchiveChunks: function prepareArchiveChunks(options) { return chunkStore.prepareArchiveChunks(options || {}); },
        listArchiveChunks: function listArchiveChunks(options) { return chunkStore.listArchiveChunks(options || {}); },
        listArchiveCursors: function listArchiveCursors(options) { return chunkStore.listArchiveCursors(options || {}); },
        listArchiveChunkRuns: function listArchiveChunkRuns(options) { return chunkStore.listArchiveChunkRuns(options || {}); },
        getArchiveChunkSnapshot: function getArchiveChunkSnapshot(options) { return chunkStore.getArchiveChunkSnapshot(options || {}); },
        prepareBackfillQueue: function prepareBackfillQueue(options) { return backfillStore.prepareBackfillQueue(options || {}); },
        applyBackfillAction: function applyBackfillAction(action, options) { return backfillStore.applyBackfillAction(action || 'start', options || {}); },
        listBackfillJobs: function listBackfillJobs(options) { return backfillStore.listBackfillJobs(options || {}); },
        listBackfillRuns: function listBackfillRuns(options) { return backfillStore.listBackfillRuns(options || {}); },
        getBackfillSnapshot: function getBackfillSnapshot(options) { return backfillStore.getBackfillSnapshot(options || {}); },
        getReplacementPlan: function getReplacementPlan() { return store.getReplacementPlan(); },
        listEvents: function listEvents(options) { return store.listEvents(options || {}); },
        listFacts: function listFacts(options) { return factStore.listFacts(options || {}); },
        listFamilies: function listFamilies(options) { return familyStore.listFamilies(options || {}); },
        listEdges: function listEdges(options) { return graphStore.listEdges(options || {}); },
        listModels: function listModels(options) { return modelStore.listModels(options || {}); },
        listInjectionPreviews: function listInjectionPreviews(options) { return injectionStore.listInjectionPreviews(options || {}); },
        getSchedulerSnapshot: function getSchedulerSnapshot(options) { return scheduleStore.getSchedulerSnapshot(options || {}); },
        listSchedulerRuns: function listSchedulerRuns(options) { return scheduleStore.listSchedulerRuns(options || {}); },
        listScheduleQueue: function listScheduleQueue(options) { return scheduleStore.listScheduleQueue(options || {}); },
        listExports: function listExports(options) { return exportAdapter.listExports(options || {}); },
        createExportBundle: function createExportBundle(options) { return exportAdapter.createExportBundle(options || {}); },
        appendEventSummaryBatch: function appendEventSummaryBatch(payload, options) { return store.appendEventSummaryBatch(payload || {}, options || {}); },
        appendFactExtractionBatch: function appendFactExtractionBatch(payload, options) { return factStore.appendFactExtractionBatch(payload || {}, options || {}); },
        appendFamilyClusteringBatch: function appendFamilyClusteringBatch(payload, options) { return familyStore.appendFamilyClusteringBatch(payload || {}, options || {}); },
        appendGraphLinkingBatch: function appendGraphLinkingBatch(payload, options) { return graphStore.appendGraphLinkingBatch(payload || {}, options || {}); },
        appendLongTermModelBatch: function appendLongTermModelBatch(payload, options) { return modelStore.appendLongTermModelBatch(payload || {}, options || {}); },
        appendInjectionPreviewBatch: function appendInjectionPreviewBatch(payload, options) { return injectionStore.appendInjectionPreviewBatch(payload || {}, options || {}); },
        updateSchedulerSettings: function updateSchedulerSettings(settings, options) { return scheduleStore.updateSchedulerSettings(settings || {}, options || {}); },
        appendMaintenancePlanBatch: function appendMaintenancePlanBatch(payload, options) { return scheduleStore.appendMaintenancePlanBatch(payload || {}, options || {}); },
        appendMaintenanceCycleBatch: function appendMaintenanceCycleBatch(payload, options) { return scheduleStore.appendMaintenanceCycleBatch(payload || {}, options || {}); },
        appendExportPreviewBatch: function appendExportPreviewBatch(payload, options) { return exportAdapter.appendExportPreviewBatch(payload || {}, options || {}); },
        ensureFactEmbeddings: function ensureFactEmbeddings(options) { return embeddingService.ensureFactEmbeddings(options || {}); },
        refreshFamilyVectors: function refreshFamilyVectors(familyIds, options) { return embeddingService.refreshFamilyVectors(familyIds || [], options || {}); },
        retireFact: function retireFact(factId, reason, options) { return factStore.retireFact(factId, reason || 'user-retired', options || {}); },
        retireFamily: function retireFamily(familyId, reason, options) { return familyStore.retireFamily(familyId, reason || 'user-retired-family', options || {}); },
        retireEdge: function retireEdge(edgeId, reason, options) { return graphStore.retireEdge(edgeId, reason || 'user-retired-edge', options || {}); },
        retireModel: function retireModel(modelId, reason, options) { return modelStore.retireModel(modelId, reason || 'user-retired-model', options || {}); },
        retireInjectionPreview: function retireInjectionPreview(previewId, reason, options) { return injectionStore.retireInjectionPreview(previewId, reason || 'user-retired-injection-preview', options || {}); },
        rollbackBatch: function rollbackBatch(batchId, options) { return factStore.rollbackBatch(batchId, options || {}); },
        rollbackFamilyBatch: function rollbackFamilyBatch(batchId, options) { return familyStore.rollbackFamilyBatch(batchId, options || {}); },
        rollbackGraphBatch: function rollbackGraphBatch(batchId, options) { return graphStore.rollbackGraphBatch(batchId, options || {}); },
        rollbackModelBatch: function rollbackModelBatch(batchId, options) { return modelStore.rollbackModelBatch(batchId, options || {}); },
        rollbackInjectionPreviewBatch: function rollbackInjectionPreviewBatch(batchId, options) { return injectionStore.rollbackInjectionPreviewBatch(batchId, options || {}); },
        rollbackMaintenanceBatch: function rollbackMaintenanceBatch(batchId, options) { return scheduleStore.rollbackMaintenanceBatch(batchId, options || {}); },
        rollbackExportBatch: function rollbackExportBatch(batchId, options) { return exportAdapter.rollbackExportBatch(batchId, options || {}); },
        rollbackArchiveChunkBatch: function rollbackArchiveChunkBatch(batchId, options) { return chunkStore.rollbackArchiveChunkBatch(batchId, options || {}); },
        rollbackBackfillBatch: function rollbackBackfillBatch(batchId, options) { return backfillStore.rollbackBackfillBatch(batchId, options || {}); },
        getRoutingReport: function getRoutingReport() {
            return Object.assign({}, store.getRoutingReport(), archiveScanner.getRoutingReport(), chunkStore.getRoutingReport(), backfillStore.getRoutingReport(), factStore.getRoutingReport(), embeddingService.getRoutingReport(), familyStore.getRoutingReport(), graphStore.getRoutingReport(), modelStore.getRoutingReport(), injectionStore.getRoutingReport(), scheduleStore.getRoutingReport(), exportAdapter.getRoutingReport());
        },
        getPublicContract: function getPublicContract() {
            return {
                owner: 'platform/memoryBrain',
                release: 'v0.4.2',
                stableApis: [
                    'ensureState', 'getSnapshot', 'scanLegacySources', 'rememberLegacyScan',
                    'scanArchiveSources', 'rememberArchiveSources', 'listArchiveSources', 'listArchiveScanRuns', 'getArchiveSnapshot', 'prepareArchiveChunks', 'listArchiveChunks', 'listArchiveCursors', 'listArchiveChunkRuns', 'getArchiveChunkSnapshot', 'prepareBackfillQueue', 'applyBackfillAction', 'listBackfillJobs', 'listBackfillRuns', 'getBackfillSnapshot',
                    'getReplacementPlan', 'listEvents', 'listFacts', 'listFamilies', 'listEdges', 'listModels', 'listInjectionPreviews', 'getSchedulerSnapshot', 'listSchedulerRuns', 'listScheduleQueue', 'listExports', 'createExportBundle',
                    'appendEventSummaryBatch', 'appendFactExtractionBatch', 'appendFamilyClusteringBatch', 'appendGraphLinkingBatch', 'appendLongTermModelBatch', 'appendInjectionPreviewBatch', 'updateSchedulerSettings', 'appendMaintenancePlanBatch', 'appendMaintenanceCycleBatch', 'appendExportPreviewBatch',
                    'ensureFactEmbeddings', 'retireFact', 'retireFamily', 'retireEdge', 'retireModel', 'retireInjectionPreview', 'rollbackBatch', 'rollbackFamilyBatch', 'rollbackGraphBatch', 'rollbackModelBatch', 'rollbackInjectionPreviewBatch', 'rollbackMaintenanceBatch', 'rollbackExportBatch', 'rollbackArchiveChunkBatch', 'rollbackBackfillBatch'
                ]
            };
        }
    };
})(window);
