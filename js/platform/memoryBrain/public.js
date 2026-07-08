// --- Memory Brain platform public facade (v0.6.4) ---
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
    const historyEventStore = platform.historyEventBackfillStore;
    const historyFactStore = platform.historyFactBackfillStore;
    const factLifecycleStore = platform.factLifecycleStore;
    const familyGraphRebuildStore = platform.familyGraphRebuildStore;
    const historyModelRebuildStore = platform.historyModelRebuildStore;
    const cutoverReportStore = platform.memoryCutoverReportStore;
    const ownerGateStore = platform.memoryOwnerGateStore;
    const reviewInboxStore = platform.memoryReviewInboxStore;
    const factCorrectionStore = platform.factCorrectionStore;
    const factConflictStore = platform.factConflictStore;
    const familyAdjustmentStore = platform.familyAdjustmentStore;
    const modelCorrectionStore = platform.modelCorrectionStore;
    const correctionPropagationStore = platform.correctionPropagationStore;
    const trustScoreStore = platform.memoryTrustScoreStore;
    const trustedGateStore = platform.trustedGateStore;
    const formalInjectionStore = platform.memoryFormalInjectionStore;
    const realtimeTraceStore = platform.memoryRealtimeTraceStore;
    const legacyReadOnlyStore = platform.memoryLegacyReadOnlyStore;
    const ownerRecoveryStore = platform.memoryOwnerRecoveryStore;

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
        selectHistoryEventBackfillWork: function selectHistoryEventBackfillWork(options) { return historyEventStore.selectHistoryEventBackfillWork(options || {}); },
        appendHistoryEventBackfillBatch: function appendHistoryEventBackfillBatch(payload, options) { return historyEventStore.appendHistoryEventBackfillBatch(payload || {}, options || {}); },
        listHistoryEventRuns: function listHistoryEventRuns(options) { return historyEventStore.listHistoryEventRuns(options || {}); },
        selectHistoryFactBackfillWork: function selectHistoryFactBackfillWork(options) { return historyFactStore.selectHistoryFactBackfillWork(options || {}); },
        appendHistoryFactBackfillBatch: function appendHistoryFactBackfillBatch(payload, options) { return historyFactStore.appendHistoryFactBackfillBatch(payload || {}, options || {}); },
        listHistoryFactRuns: function listHistoryFactRuns(options) { return historyFactStore.listHistoryFactRuns(options || {}); },
        buildFactLifecyclePlan: function buildFactLifecyclePlan(options) { return factLifecycleStore.buildFactLifecyclePlan(options || {}); },
        applyFactLifecyclePlan: function applyFactLifecyclePlan(plan, options) { return factLifecycleStore.applyFactLifecyclePlan(plan || {}, options || {}); },
        rollbackFactLifecycleBatch: function rollbackFactLifecycleBatch(batchId, options) { return factLifecycleStore.rollbackFactLifecycleBatch(batchId, options || {}); },
        resetFamilyGraphForRebuild: function resetFamilyGraphForRebuild(options) { return familyGraphRebuildStore.resetFamilyGraphForRebuild(options || {}); },
        appendFamilyGraphRebuildBatch: function appendFamilyGraphRebuildBatch(payload, options) { return familyGraphRebuildStore.appendFamilyGraphRebuildBatch(payload || {}, options || {}); },
        rollbackRebuildResetBatch: function rollbackRebuildResetBatch(batchId, options) { return familyGraphRebuildStore.rollbackRebuildResetBatch(batchId, options || {}); },
        rollbackFamilyGraphRebuildMetaBatch: function rollbackFamilyGraphRebuildMetaBatch(batchId, options) { return familyGraphRebuildStore.rollbackFamilyGraphRebuildMetaBatch(batchId, options || {}); },
        rollbackFamilyGraphRebuildBatch: function rollbackFamilyGraphRebuildBatch(batchId, payload, options) { return familyGraphRebuildStore.rollbackFamilyGraphRebuildBatch(batchId, payload || {}, options || payload || {}); },
        listFamilyGraphRebuildRuns: function listFamilyGraphRebuildRuns(options) { return familyGraphRebuildStore.listFamilyGraphRebuildRuns(options || {}); },
        getFamilyGraphRebuildSnapshot: function getFamilyGraphRebuildSnapshot(options) { return familyGraphRebuildStore.getFamilyGraphRebuildSnapshot(options || {}); },
        appendHistoryModelRebuildRun: function appendHistoryModelRebuildRun(payload, options) { return historyModelRebuildStore.appendHistoryModelRebuildRun(payload || {}, options || {}); },
        listHistoryModelRebuildRuns: function listHistoryModelRebuildRuns(options) { return historyModelRebuildStore.listHistoryModelRebuildRuns(options || {}); },
        getHistoryModelRebuildSnapshot: function getHistoryModelRebuildSnapshot(options) { return historyModelRebuildStore.getHistoryModelRebuildSnapshot(options || {}); },
        rollbackHistoryModelRebuildRun: function rollbackHistoryModelRebuildRun(runId, options) { return historyModelRebuildStore.rollbackHistoryModelRebuildRun(runId, options || {}); },
        appendCutoverRehearsalBatch: function appendCutoverRehearsalBatch(payload, options) { return cutoverReportStore.appendCutoverRehearsalBatch(payload || {}, options || {}); },
        rollbackCutoverRehearsalBatch: function rollbackCutoverRehearsalBatch(batchId, options) { return cutoverReportStore.rollbackCutoverRehearsalBatch(batchId, options || {}); },
        listCutoverReports: function listCutoverReports(options) { return cutoverReportStore.listCutoverReports(options || {}); },
        listCutoverRehearsalRuns: function listCutoverRehearsalRuns(options) { return cutoverReportStore.listCutoverRehearsalRuns(options || {}); },
        getCutoverRehearsalSnapshot: function getCutoverRehearsalSnapshot(options) { return cutoverReportStore.getCutoverRehearsalSnapshot(options || {}); },
        getOwnerGateSnapshot: function getOwnerGateSnapshot(options) { return ownerGateStore.getOwnerGateSnapshot(options || {}); },
        appendOwnerSwitchRun: function appendOwnerSwitchRun(payload, options) { return ownerGateStore.appendOwnerSwitchRun(payload || {}, options || {}); },
        rollbackOwnerSwitchBatch: function rollbackOwnerSwitchBatch(batchId, options) { return ownerGateStore.rollbackOwnerSwitchBatch(batchId, options || {}); },
        rollbackLatestOwnerSwitchBatch: function rollbackLatestOwnerSwitchBatch(options) { return ownerGateStore.rollbackLatestOwnerSwitchBatch(options || {}); },
        updateUiGroupOpen: function updateUiGroupOpen(groupId, open, options) { return ownerGateStore.updateUiGroupOpen(groupId, open, options || {}); },
        getUiGroupCards: function getUiGroupCards(options) { return ownerGateStore.getUiGroupCards(options || {}); },
        buildReviewInboxPlan: function buildReviewInboxPlan(options) { return reviewInboxStore.buildReviewInboxPlan(options || {}); },
        applyReviewInboxPlan: function applyReviewInboxPlan(plan, options) { return reviewInboxStore.applyReviewInboxPlan(plan || {}, options || {}); },
        rollbackReviewInboxBatch: function rollbackReviewInboxBatch(batchId, options) { return reviewInboxStore.rollbackReviewInboxBatch(batchId, options || {}); },
        updateReviewItemStatus: function updateReviewItemStatus(itemId, status, options) { return reviewInboxStore.updateReviewItemStatus(itemId, status || 'open', options || {}); },
        getReviewInboxSnapshot: function getReviewInboxSnapshot(options) { return reviewInboxStore.getReviewInboxSnapshot(options || {}); },
        buildFactCorrectionPlan: function buildFactCorrectionPlan(options) { return factCorrectionStore.buildFactCorrectionPlan(options || {}); },
        applyFactCorrectionPlan: function applyFactCorrectionPlan(plan, options) { return factCorrectionStore.applyFactCorrectionPlan(plan || {}, options || {}); },
        rollbackFactCorrectionBatch: function rollbackFactCorrectionBatch(batchId, options) { return factCorrectionStore.rollbackFactCorrectionBatch(batchId, options || {}); },
        getFactCorrectionSnapshot: function getFactCorrectionSnapshot(options) { return factCorrectionStore.getFactCorrectionSnapshot(options || {}); },
        buildConflictResolutionPlan: function buildConflictResolutionPlan(options) { return factConflictStore.buildConflictResolutionPlan(options || {}); },
        applyConflictResolutionPlan: function applyConflictResolutionPlan(plan, options) { return factConflictStore.applyConflictResolutionPlan(plan || {}, options || {}); },
        rollbackConflictResolutionBatch: function rollbackConflictResolutionBatch(batchId, options) { return factConflictStore.rollbackConflictResolutionBatch(batchId, options || {}); },
        getFactConflictSnapshot: function getFactConflictSnapshot(options) { return factConflictStore.getFactConflictSnapshot(options || {}); },
        buildFamilyAdjustmentPlan: function buildFamilyAdjustmentPlan(options) { return familyAdjustmentStore.buildFamilyAdjustmentPlan(options || {}); },
        applyFamilyAdjustmentPlan: function applyFamilyAdjustmentPlan(plan, options) { return familyAdjustmentStore.applyFamilyAdjustmentPlan(plan || {}, options || {}); },
        rollbackFamilyAdjustmentBatch: function rollbackFamilyAdjustmentBatch(batchId, options) { return familyAdjustmentStore.rollbackFamilyAdjustmentBatch(batchId, options || {}); },
        getFamilyAdjustmentSnapshot: function getFamilyAdjustmentSnapshot(options) { return familyAdjustmentStore.getFamilyAdjustmentSnapshot(options || {}); },
        buildModelCorrectionPlan: function buildModelCorrectionPlan(options) { return modelCorrectionStore.buildModelCorrectionPlan(options || {}); },
        applyModelCorrectionPlan: function applyModelCorrectionPlan(plan, options) { return modelCorrectionStore.applyModelCorrectionPlan(plan || {}, options || {}); },
        rollbackModelCorrectionBatch: function rollbackModelCorrectionBatch(batchId, options) { return modelCorrectionStore.rollbackModelCorrectionBatch(batchId, options || {}); },
        getModelCorrectionSnapshot: function getModelCorrectionSnapshot(options) { return modelCorrectionStore.getModelCorrectionSnapshot(options || {}); },
        buildCorrectionPropagationPlan: function buildCorrectionPropagationPlan(options) { return correctionPropagationStore.buildCorrectionPropagationPlan(options || {}); },
        applyCorrectionPropagationPlan: function applyCorrectionPropagationPlan(plan, options) { return correctionPropagationStore.applyCorrectionPropagationPlan(plan || {}, options || {}); },
        rollbackCorrectionPropagationBatch: function rollbackCorrectionPropagationBatch(batchId, options) { return correctionPropagationStore.rollbackCorrectionPropagationBatch(batchId, options || {}); },
        getCorrectionPropagationSnapshot: function getCorrectionPropagationSnapshot(options) { return correctionPropagationStore.getCorrectionPropagationSnapshot(options || {}); },
        buildMemoryTrustScorePlan: function buildMemoryTrustScorePlan(options) { return trustScoreStore.buildMemoryTrustScorePlan(options || {}); },
        applyMemoryTrustScorePlan: function applyMemoryTrustScorePlan(plan, options) { return trustScoreStore.applyMemoryTrustScorePlan(plan || {}, options || {}); },
        rollbackMemoryTrustScoreBatch: function rollbackMemoryTrustScoreBatch(batchId, options) { return trustScoreStore.rollbackMemoryTrustScoreBatch(batchId, options || {}); },
        getMemoryTrustScoreSnapshot: function getMemoryTrustScoreSnapshot(options) { return trustScoreStore.getMemoryTrustScoreSnapshot(options || {}); },
        buildTrustedMemoryGateReport: function buildTrustedMemoryGateReport(options) { return trustedGateStore.buildTrustedMemoryGateReport(options || {}); },
        applyTrustedMemoryGateReport: function applyTrustedMemoryGateReport(report, options) { return trustedGateStore.applyTrustedMemoryGateReport(report || {}, options || {}); },
        runTrustedMemoryGate: function runTrustedMemoryGate(options) { return trustedGateStore.runTrustedMemoryGate(options || {}); },
        getFormalInjectionAdapterSnapshot: function getFormalInjectionAdapterSnapshot(options) { return formalInjectionStore.getFormalInjectionAdapterSnapshot(options || {}); },
        appendFormalInjectionAdapterRun: function appendFormalInjectionAdapterRun(payload, options) { return formalInjectionStore.appendFormalInjectionAdapterRun(payload || {}, options || {}); },
        rollbackFormalInjectionAdapterBatch: function rollbackFormalInjectionAdapterBatch(batchId, options) { return formalInjectionStore.rollbackFormalInjectionAdapterBatch(batchId, options || {}); },
        rollbackLatestFormalInjectionAdapterBatch: function rollbackLatestFormalInjectionAdapterBatch(options) { return formalInjectionStore.rollbackLatestFormalInjectionAdapterBatch(options || {}); },
        getRealtimeTraceSnapshot: function getRealtimeTraceSnapshot(options) { return realtimeTraceStore.getRealtimeTraceSnapshot(options || {}); },
        appendRealtimeTraceRun: function appendRealtimeTraceRun(payload, options) { return realtimeTraceStore.appendRealtimeTraceRun(payload || {}, options || {}); },
        rollbackRealtimeTraceBatch: function rollbackRealtimeTraceBatch(batchId, options) { return realtimeTraceStore.rollbackRealtimeTraceBatch(batchId, options || {}); },
        rollbackLatestRealtimeTraceBatch: function rollbackLatestRealtimeTraceBatch(options) { return realtimeTraceStore.rollbackLatestRealtimeTraceBatch(options || {}); },
        getLegacyReadOnlySnapshot: function getLegacyReadOnlySnapshot(options) { return legacyReadOnlyStore.getLegacyReadOnlySnapshot(options || {}); },
        appendLegacyReadOnlyRun: function appendLegacyReadOnlyRun(payload, options) { return legacyReadOnlyStore.appendLegacyReadOnlyRun(payload || {}, options || {}); },
        rollbackLegacyReadOnlyBatch: function rollbackLegacyReadOnlyBatch(batchId, options) { return legacyReadOnlyStore.rollbackLegacyReadOnlyBatch(batchId, options || {}); },
        rollbackLatestLegacyReadOnlyBatch: function rollbackLatestLegacyReadOnlyBatch(options) { return legacyReadOnlyStore.rollbackLatestLegacyReadOnlyBatch(options || {}); },
        getOwnerRecoverySnapshot: function getOwnerRecoverySnapshot(options) { return ownerRecoveryStore.getOwnerRecoverySnapshot(options || {}); },
        appendOwnerRecoveryRun: function appendOwnerRecoveryRun(payload, options) { return ownerRecoveryStore.appendOwnerRecoveryRun(payload || {}, options || {}); },
        rollbackOwnerRecoveryBatch: function rollbackOwnerRecoveryBatch(batchId, options) { return ownerRecoveryStore.rollbackOwnerRecoveryBatch(batchId, options || {}); },
        rollbackLatestOwnerRecoveryBatch: function rollbackLatestOwnerRecoveryBatch(options) { return ownerRecoveryStore.rollbackLatestOwnerRecoveryBatch(options || {}); },
        rollbackTrustedMemoryGateBatch: function rollbackTrustedMemoryGateBatch(batchId, options) { return trustedGateStore.rollbackTrustedMemoryGateBatch(batchId, options || {}); },
        getTrustedMemoryGateSnapshot: function getTrustedMemoryGateSnapshot(options) { return trustedGateStore.getTrustedMemoryGateSnapshot(options || {}); },
        listFactLifecycleRuns: function listFactLifecycleRuns(options) { return factLifecycleStore.listFactLifecycleRuns(options || {}); },
        getFactLifecycleSnapshot: function getFactLifecycleSnapshot(options) { return factLifecycleStore.getFactLifecycleSnapshot(options || {}); },
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
        rollbackHistoryEventBackfillBatch: function rollbackHistoryEventBackfillBatch(batchId, options) { return historyEventStore.rollbackHistoryEventBackfillBatch(batchId, options || {}); },
        rollbackHistoryFactBackfillBatch: function rollbackHistoryFactBackfillBatch(batchId, options) { return historyFactStore.rollbackHistoryFactBackfillBatch(batchId, options || {}); },
        getRoutingReport: function getRoutingReport() {
            return Object.assign({}, store.getRoutingReport(), archiveScanner.getRoutingReport(), chunkStore.getRoutingReport(), backfillStore.getRoutingReport(), historyEventStore.getRoutingReport(), historyFactStore.getRoutingReport(), factLifecycleStore.getRoutingReport(), familyGraphRebuildStore.getRoutingReport(), historyModelRebuildStore.getRoutingReport(), cutoverReportStore.getRoutingReport(), ownerGateStore.getRoutingReport(), reviewInboxStore.getRoutingReport(), factCorrectionStore.getRoutingReport(), factConflictStore.getRoutingReport(), familyAdjustmentStore.getRoutingReport(), modelCorrectionStore.getRoutingReport(), correctionPropagationStore.getRoutingReport(), trustScoreStore.getRoutingReport(), trustedGateStore.getRoutingReport(), formalInjectionStore.getRoutingReport(), realtimeTraceStore.getRoutingReport(), legacyReadOnlyStore.getRoutingReport(), ownerRecoveryStore.getRoutingReport(), factStore.getRoutingReport(), embeddingService.getRoutingReport(), familyStore.getRoutingReport(), graphStore.getRoutingReport(), modelStore.getRoutingReport(), injectionStore.getRoutingReport(), scheduleStore.getRoutingReport(), exportAdapter.getRoutingReport());
        },
        getPublicContract: function getPublicContract() {
            return {
                owner: 'platform/memoryBrain',
                release: 'v0.6.4',
                stableApis: [
                    'ensureState', 'getSnapshot', 'scanLegacySources', 'rememberLegacyScan',
                    'scanArchiveSources', 'rememberArchiveSources', 'listArchiveSources', 'listArchiveScanRuns', 'getArchiveSnapshot', 'prepareArchiveChunks', 'listArchiveChunks', 'listArchiveCursors', 'listArchiveChunkRuns', 'getArchiveChunkSnapshot', 'prepareBackfillQueue', 'applyBackfillAction', 'listBackfillJobs', 'listBackfillRuns', 'getBackfillSnapshot', 'selectHistoryEventBackfillWork', 'appendHistoryEventBackfillBatch', 'listHistoryEventRuns', 'selectHistoryFactBackfillWork', 'appendHistoryFactBackfillBatch', 'listHistoryFactRuns', 'buildFactLifecyclePlan', 'applyFactLifecyclePlan', 'listFactLifecycleRuns', 'getFactLifecycleSnapshot',
                    'getReplacementPlan', 'listEvents', 'listFacts', 'listFamilies', 'listEdges', 'listModels', 'listInjectionPreviews', 'getSchedulerSnapshot', 'listSchedulerRuns', 'listScheduleQueue', 'listExports', 'createExportBundle',
                    'appendEventSummaryBatch', 'appendFactExtractionBatch', 'appendFamilyClusteringBatch', 'appendGraphLinkingBatch', 'appendLongTermModelBatch', 'appendInjectionPreviewBatch', 'updateSchedulerSettings', 'appendMaintenancePlanBatch', 'appendMaintenanceCycleBatch', 'appendExportPreviewBatch',
                    'ensureFactEmbeddings', 'retireFact', 'retireFamily', 'retireEdge', 'retireModel', 'retireInjectionPreview', 'rollbackBatch', 'rollbackFamilyBatch', 'rollbackGraphBatch', 'rollbackModelBatch', 'rollbackInjectionPreviewBatch', 'rollbackMaintenanceBatch', 'rollbackExportBatch', 'rollbackArchiveChunkBatch', 'rollbackBackfillBatch', 'rollbackHistoryEventBackfillBatch', 'rollbackHistoryFactBackfillBatch', 'rollbackFactLifecycleBatch', 'appendCutoverRehearsalBatch', 'rollbackCutoverRehearsalBatch', 'listCutoverReports', 'listCutoverRehearsalRuns', 'getCutoverRehearsalSnapshot', 'getOwnerGateSnapshot', 'appendOwnerSwitchRun', 'rollbackOwnerSwitchBatch', 'rollbackLatestOwnerSwitchBatch', 'updateUiGroupOpen', 'getUiGroupCards', 'buildReviewInboxPlan', 'applyReviewInboxPlan', 'rollbackReviewInboxBatch', 'updateReviewItemStatus', 'getReviewInboxSnapshot', 'buildFactCorrectionPlan', 'applyFactCorrectionPlan', 'rollbackFactCorrectionBatch', 'getFactCorrectionSnapshot', 'buildConflictResolutionPlan', 'applyConflictResolutionPlan', 'rollbackConflictResolutionBatch', 'getFactConflictSnapshot', 'buildFamilyAdjustmentPlan', 'applyFamilyAdjustmentPlan', 'rollbackFamilyAdjustmentBatch', 'getFamilyAdjustmentSnapshot', 'buildModelCorrectionPlan', 'applyModelCorrectionPlan', 'rollbackModelCorrectionBatch', 'getModelCorrectionSnapshot', 'buildMemoryTrustScorePlan', 'applyMemoryTrustScorePlan', 'rollbackMemoryTrustScoreBatch', 'getMemoryTrustScoreSnapshot', 'buildTrustedMemoryGateReport', 'applyTrustedMemoryGateReport', 'runTrustedMemoryGate', 'rollbackTrustedMemoryGateBatch', 'getTrustedMemoryGateSnapshot', 'getFormalInjectionAdapterSnapshot', 'appendFormalInjectionAdapterRun', 'rollbackFormalInjectionAdapterBatch', 'rollbackLatestFormalInjectionAdapterBatch', 'getRealtimeTraceSnapshot', 'appendRealtimeTraceRun', 'rollbackRealtimeTraceBatch', 'rollbackLatestRealtimeTraceBatch', 'getLegacyReadOnlySnapshot', 'appendLegacyReadOnlyRun', 'rollbackLegacyReadOnlyBatch', 'rollbackLatestLegacyReadOnlyBatch', 'getOwnerRecoverySnapshot', 'appendOwnerRecoveryRun', 'rollbackOwnerRecoveryBatch', 'rollbackLatestOwnerRecoveryBatch', 'resetFamilyGraphForRebuild', 'rollbackFamilyGraphRebuildBatch', 'appendFamilyGraphRebuildBatch', 'rollbackRebuildResetBatch', 'rollbackFamilyGraphRebuildMetaBatch', 'listFamilyGraphRebuildRuns', 'getFamilyGraphRebuildSnapshot', 'appendHistoryModelRebuildRun', 'listHistoryModelRebuildRuns', 'getHistoryModelRebuildSnapshot', 'rollbackHistoryModelRebuildRun'
                ]
            };
        }
    };
})(window);
