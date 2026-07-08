// --- Memory Brain core public facade (v0.6.3) ---
// 只导出纯语义能力，不承载运行时流程。
(function registerMemoryBrainCorePublic(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    function events() { return core.memoryBrain.eventSemantics; }
    function facts() { return core.memoryBrain.factSemantics; }
    function families() { return core.memoryBrain.familySemantics; }
    function graphs() { return core.memoryBrain.graphSemantics; }
    function models() { return core.memoryBrain.modelSemantics; }
    function injections() { return core.memoryBrain.injectionSemantics; }
    function weights() { return core.memoryBrain.weightSemantics; }
    function products() { return core.memoryBrain.productSemantics; }
    function cutovers() { return core.memoryBrain.cutoverComparisonSemantics; }
    function archives() { return core.memoryBrain.archiveSourceSemantics; }
    function chunks() { return core.memoryBrain.archiveChunkSemantics; }
    function backfills() { return core.memoryBrain.backfillQueueSemantics; }
    function historyEvents() { return core.memoryBrain.historyEventBackfillSemantics; }
    function historyFacts() { return core.memoryBrain.historyFactBackfillSemantics; }
    function factLifecycle() { return core.memoryBrain.factLifecycleSemantics; }
    function historyModels() { return core.memoryBrain.historyModelRebuildSemantics; }
    function ownerSwitches() { return core.memoryBrain.ownerSwitchSemantics; }
    function uiGroups() { return core.memoryBrain.uiGroupSemantics; }
    function reviews() { return core.memoryBrain.reviewInboxSemantics; }
    function corrections() { return core.memoryBrain.factCorrectionSemantics; }
    function conflicts() { return core.memoryBrain.conflictResolutionSemantics; }
    function familyAdjustments() { return core.memoryBrain.familyAdjustmentSemantics; }
    function modelCorrections() { return core.memoryBrain.modelCorrectionSemantics; }
    function correctionPropagations() { return core.memoryBrain.correctionPropagationSemantics; }
    function trustScores() { return core.memoryBrain.trustScoreSemantics; }
    function trustedGates() { return core.memoryBrain.trustedGateSemantics; }
    function formalAdapters() { return core.memoryBrain.formalInjectionAdapterSemantics; }
    function realtimeTraces() { return core.memoryBrain.realtimeInjectionTraceSemantics; }
    function legacyReadOnly() { return core.memoryBrain.legacyReadOnlySemantics; }

    core.memoryBrain.publicApi = {
        getLayers: function getLayers() { return core.memoryBrain.types.LAYERS.slice(); },
        getMigrationStages: function getMigrationStages() { return core.memoryBrain.types.MIGRATION_STAGES.slice(); },
        createDefaultState: function createDefaultState() { return core.memoryBrain.types.createDefaultMemoryBrainState(); },
        normalizeState: function normalizeState(state) { return core.memoryBrain.types.normalizeMemoryBrainState(state); },
        buildEventSummaryPrompt: function buildEventSummaryPrompt(messages, options) { return events().buildEventSummaryPrompt(messages, options || {}); },
        parseEventSummaryResponse: function parseEventSummaryResponse(text) { return events().parseEventSummaryResponse(text); },
        normalizeEventDraft: function normalizeEventDraft(raw) { return events().normalizeEventDraft(raw); },
        ensureEventSourceRange: function ensureEventSourceRange(eventDraft, messages) { return events().ensureEventSourceRange(eventDraft, messages || []); },
        compactEventForTimeline: function compactEventForTimeline(event) { return events().compactEventForTimeline(event); },
        buildFactExtractionPrompt: function buildFactExtractionPrompt(event, options) { return facts().buildFactExtractionPrompt(event || {}, options || {}); },
        parseFactExtractionResponse: function parseFactExtractionResponse(text) { return facts().parseFactExtractionResponse(text); },
        normalizeFactDraft: function normalizeFactDraft(raw) { return facts().normalizeFactDraft(raw || {}); },
        ensureFactsSource: function ensureFactsSource(factDrafts, event) { return facts().ensureFactsSource(factDrafts || [], event || {}); },
        compactFactForList: function compactFactForList(fact) { return facts().compactFactForList(fact || {}); },
        buildFamilyDrafts: function buildFamilyDrafts(factList, familyList, options) { return families().buildFamilyDrafts(factList || [], familyList || [], options || {}); },
        buildFamilyNamingPrompt: function buildFamilyNamingPrompt(drafts, factList, options) { return families().buildFamilyNamingPrompt(drafts || [], factList || [], options || {}); },
        parseFamilyNamingResponse: function parseFamilyNamingResponse(text) { return families().parseFamilyNamingResponse(text); },
        applyFamilyNames: function applyFamilyNames(drafts, names) { return families().applyFamilyNames(drafts || [], names || []); },
        compactFamilyForList: function compactFamilyForList(family, factList) { return families().compactFamilyForList(family || {}, factList || []); },
        buildGraphEdges: function buildGraphEdges(factList, familyList, edgeList, options) { return graphs().buildGraphEdges(factList || [], familyList || [], edgeList || [], options || {}); },
        normalizeGraphEdgeDraft: function normalizeGraphEdgeDraft(raw) { return graphs().normalizeGraphEdgeDraft(raw || {}); },
        compactGraphForList: function compactGraphForList(edgeList, factList, familyList, options) { return graphs().compactGraphForList(edgeList || [], factList || [], familyList || [], options || {}); },
        buildLongTermModelPrompt: function buildLongTermModelPrompt(snapshot, options) { return models().buildLongTermModelPrompt(snapshot || {}, options || {}); },
        parseLongTermModelResponse: function parseLongTermModelResponse(text) { return models().parseLongTermModelResponse(text); },
        normalizeLongTermModelDraft: function normalizeLongTermModelDraft(raw) { return models().normalizeLongTermModelDraft(raw || {}); },
        buildFallbackLongTermModels: function buildFallbackLongTermModels(snapshot) { return models().buildFallbackLongTermModels(snapshot || {}); },
        compactModelForList: function compactModelForList(model) { return models().compactModelForList(model || {}); },
        buildMemoryInjectionPackage: function buildMemoryInjectionPackage(query, snapshot, options) { return injections().buildMemoryInjectionPackage(query || '', snapshot || {}, options || {}); },
        compactInjectionPreviewForList: function compactInjectionPreviewForList(preview) { return injections().compactInjectionPreviewForList(preview || {}); },
        normalizeSchedulerSettings: function normalizeSchedulerSettings(settings) { return weights().normalizeSchedulerSettings(settings || {}); },
        getCostProfile: function getCostProfile(profileId) { return weights().getCostProfile(profileId); },
        getCostProfiles: function getCostProfiles() { return weights().COST_PROFILES.map(profile => Object.assign({}, profile)); },
        computeMemoryWeight: function computeMemoryWeight(item, type, options) { return weights().computeMemoryWeight(item || {}, type || 'fact', options || {}); },
        collectWeightUpdates: function collectWeightUpdates(snapshot, options) { return weights().collectWeightUpdates(snapshot || {}, options || {}); },
        buildMaintenancePlan: function buildMaintenancePlan(snapshot, options) { return weights().buildMaintenancePlan(snapshot || {}, options || {}); },
        compactSchedulerForList: function compactSchedulerForList(settings, plan, runs, queue) { return weights().compactSchedulerForList(settings || {}, plan || null, runs || [], queue || []); },
        buildMemoryPalace: function buildMemoryPalace(snapshot, options) { return products().buildMemoryPalace(snapshot || {}, options || {}); },
        buildArchiveSourceFromChat: function buildArchiveSourceFromChat(chat, type, index, options) { return archives().buildArchiveSourceFromChat(chat || {}, type || 'character', Number(index) || 0, options || {}); },
        buildArchiveScanReport: function buildArchiveScanReport(sources, options) { return archives().buildArchiveScanReport(sources || [], options || {}); },
        compactArchiveSourceForList: function compactArchiveSourceForList(source) { return archives().compactArchiveSourceForList(source || {}); },
        normalizeChunkPolicy: function normalizeChunkPolicy(options) { return chunks().normalizeChunkPolicy(options || {}); },
        buildArchiveChunks: function buildArchiveChunks(source, messages, options) { return chunks().buildArchiveChunks(source || {}, messages || [], options || {}); },
        buildArchiveCursors: function buildArchiveCursors(sources, archiveChunks, options) { return chunks().buildArchiveCursors(sources || [], archiveChunks || [], options || {}); },
        buildArchiveChunkRunReport: function buildArchiveChunkRunReport(archiveChunks, cursors, options) { return chunks().buildArchiveChunkRunReport(archiveChunks || [], cursors || [], options || {}); },
        compactArchiveChunkForList: function compactArchiveChunkForList(chunk) { return chunks().compactArchiveChunkForList(chunk || {}); },
        compactArchiveCursorForList: function compactArchiveCursorForList(cursor) { return chunks().compactArchiveCursorForList(cursor || {}); },
        normalizeBackfillPolicy: function normalizeBackfillPolicy(options) { return backfills().normalizeBackfillPolicy(options || {}); },
        getBackfillTaskKinds: function getBackfillTaskKinds() { return backfills().TASK_KINDS.map(kind => Object.assign({}, kind)); },
        buildBackfillJobs: function buildBackfillJobs(chunksList, existingJobs, options) { return backfills().buildBackfillJobs(chunksList || [], existingJobs || [], options || {}); },
        summarizeBackfillJobs: function summarizeBackfillJobs(jobs) { return backfills().summarizeBackfillJobs(jobs || []); },
        applyBackfillJobAction: function applyBackfillJobAction(job, action, options) { return backfills().applyJobAction(job || {}, action || 'start', options || {}); },
        buildBackfillRunReport: function buildBackfillRunReport(jobs, options) { return backfills().buildBackfillRunReport(jobs || [], options || {}); },
        compactBackfillJobForList: function compactBackfillJobForList(job) { return backfills().compactBackfillJobForList(job || {}); },
        compactBackfillRunForList: function compactBackfillRunForList(run) { return backfills().compactBackfillRunForList(run || {}); },
        buildHistoricalEventBackfillPrompt: function buildHistoricalEventBackfillPrompt(chunk, messages, options) { return historyEvents().buildHistoricalEventBackfillPrompt(chunk || {}, messages || [], options || {}); },
        parseHistoricalEventBackfillResponse: function parseHistoricalEventBackfillResponse(text) { return historyEvents().parseHistoricalEventBackfillResponse(text || ''); },
        ensureHistoricalEventSources: function ensureHistoricalEventSources(drafts, messages, chunk, job, source) { return historyEvents().ensureHistoricalEventSources(drafts || [], messages || [], chunk || {}, job || {}, source || {}); },
        compactHistoryEventBackfillRunForList: function compactHistoryEventBackfillRunForList(run) { return historyEvents().compactHistoryEventBackfillRunForList(run || {}); },
        buildHistoricalFactBackfillPrompt: function buildHistoricalFactBackfillPrompt(event, options) { return historyFacts().buildHistoricalFactBackfillPrompt(event || {}, options || {}); },
        parseHistoricalFactBackfillResponse: function parseHistoricalFactBackfillResponse(text) { return historyFacts().parseHistoricalFactBackfillResponse(text || ''); },
        ensureHistoricalFactSources: function ensureHistoricalFactSources(drafts, event, job) { return historyFacts().ensureHistoricalFactSources(drafts || [], event || {}, job || {}); },
        compactHistoryFactBackfillRunForList: function compactHistoryFactBackfillRunForList(run) { return historyFacts().compactHistoryFactBackfillRunForList(run || {}); },
        buildFactLifecyclePlan: function buildFactLifecyclePlan(factsList, options) { return factLifecycle().buildFactLifecyclePlan(factsList || [], options || {}); },
        buildReviewInboxPlan: function buildReviewInboxPlan(snapshot, options) { return reviews().buildReviewInboxPlan(snapshot || {}, options || {}); },
        compactReviewInboxItemForList: function compactReviewInboxItemForList(item) { return reviews().compactReviewInboxItemForList(item || {}); },
        compactReviewInboxRunForList: function compactReviewInboxRunForList(run) { return reviews().compactReviewInboxRunForList(run || {}); },
        buildFactCorrectionPlan: function buildFactCorrectionPlan(snapshot, input) { return corrections().buildFactCorrectionPlan(snapshot || {}, input || {}); },
        normalizeFactCorrectionDraft: function normalizeFactCorrectionDraft(input, fact) { return corrections().normalizeCorrectionDraft(input || {}, fact || {}); },
        compactFactCorrectionForList: function compactFactCorrectionForList(item) { return corrections().compactFactCorrectionForList(item || {}); },
        compactFactCorrectionRunForList: function compactFactCorrectionRunForList(run) { return corrections().compactFactCorrectionRunForList(run || {}); },
        collectConflictGroups: function collectConflictGroups(snapshot) { return conflicts().collectConflictGroups(snapshot || {}); },
        buildConflictResolutionPlan: function buildConflictResolutionPlan(snapshot, input) { return conflicts().buildConflictResolutionPlan(snapshot || {}, input || {}); },
        compactConflictGroupForList: function compactConflictGroupForList(group) { return conflicts().compactConflictGroupForList(group || {}); },
        compactConflictResolutionForList: function compactConflictResolutionForList(item) { return conflicts().compactConflictResolutionForList(item || {}); },
        compactConflictRunForList: function compactConflictRunForList(run) { return conflicts().compactConflictRunForList(run || {}); },
        collectFamilyAdjustmentCandidates: function collectFamilyAdjustmentCandidates(snapshot, options) { return familyAdjustments().collectFamilyAdjustmentCandidates(snapshot || {}, options || {}); },
        buildFamilyAdjustmentPlan: function buildFamilyAdjustmentPlan(snapshot, input) { return familyAdjustments().buildFamilyAdjustmentPlan(snapshot || {}, input || {}); },
        compactFamilyAdjustmentCandidateForList: function compactFamilyAdjustmentCandidateForList(item) { return familyAdjustments().compactFamilyAdjustmentCandidateForList(item || {}); },
        compactFamilyAdjustmentForList: function compactFamilyAdjustmentForList(item) { return familyAdjustments().compactFamilyAdjustmentForList(item || {}); },
        compactFamilyAdjustmentRunForList: function compactFamilyAdjustmentRunForList(run) { return familyAdjustments().compactFamilyAdjustmentRunForList(run || {}); },
        buildModelCorrectionPlan: function buildModelCorrectionPlan(snapshot, input) { return modelCorrections().buildModelCorrectionPlan(snapshot || {}, input || {}); },
        normalizeModelCorrectionDraft: function normalizeModelCorrectionDraft(input, model) { return modelCorrections().normalizeModelCorrectionDraft(input || {}, model || {}); },
        compactModelCorrectionForList: function compactModelCorrectionForList(item) { return modelCorrections().compactModelCorrectionForList(item || {}); },
        compactModelCorrectionRunForList: function compactModelCorrectionRunForList(run) { return modelCorrections().compactModelCorrectionRunForList(run || {}); },
        compactModelCorrectionOption: function compactModelCorrectionOption(model) { return modelCorrections().compactModelOption(model || {}); },
        buildCorrectionPropagationPlan: function buildCorrectionPropagationPlan(snapshot, input) { return correctionPropagations().buildCorrectionPropagationPlan(snapshot || {}, input || {}); },
        compactPropagationForList: function compactPropagationForList(item) { return correctionPropagations().compactPropagationForList(item || {}); },
        compactPropagationRunForList: function compactPropagationRunForList(run) { return correctionPropagations().compactPropagationRunForList(run || {}); },
        buildMemoryTrustScorePlan: function buildMemoryTrustScorePlan(snapshot, input) { return trustScores().buildMemoryTrustScorePlan(snapshot || {}, input || {}); },
        compactTrustRecordForList: function compactTrustRecordForList(record) { return trustScores().compactTrustRecordForList(record || {}); },
        compactTrustRunForList: function compactTrustRunForList(run) { return trustScores().compactTrustRunForList(run || {}); },
        buildTrustedMemoryGateReport: function buildTrustedMemoryGateReport(snapshot, input) { return trustedGates().buildTrustedMemoryGateReport(snapshot || {}, input || {}); },
        compactTrustedGateCheckForList: function compactTrustedGateCheckForList(check) { return trustedGates().compactTrustedGateCheckForList(check || {}); },
        compactTrustedGateReportForList: function compactTrustedGateReportForList(report) { return trustedGates().compactTrustedGateReportForList(report || {}); },
        compactTrustedGateRunForList: function compactTrustedGateRunForList(run) { return trustedGates().compactTrustedGateRunForList(run || {}); },
        buildFormalInjectionAdapterPackage: function buildFormalInjectionAdapterPackage(input) { return formalAdapters().buildFormalInjectionAdapterPackage(input || {}); },
        compactFormalInjectionAdapterForList: function compactFormalInjectionAdapterForList(report) { return formalAdapters().compactFormalInjectionAdapterForList(report || {}); },
        buildRealtimeInjectionTraceReport: function buildRealtimeInjectionTraceReport(input) { return realtimeTraces().buildRealtimeInjectionTraceReport(input || {}); },
        compactRealtimeInjectionTraceForList: function compactRealtimeInjectionTraceForList(report) { return realtimeTraces().compactRealtimeInjectionTraceForList(report || {}); },
        buildLegacyReadOnlyPlan: function buildLegacyReadOnlyPlan(input) { return legacyReadOnly().buildLegacyReadOnlyPlan(input || {}); },
        compactLegacyReadOnlyPlanForList: function compactLegacyReadOnlyPlanForList(report) { return legacyReadOnly().compactLegacyReadOnlyPlanForList(report || {}); },
        compactFactLifecycleRunForList: function compactFactLifecycleRunForList(run) { return factLifecycle().compactFactLifecycleRunForList(run || {}); },
        compactFactLifecycleIssueForList: function compactFactLifecycleIssueForList(issue, factsById) { return factLifecycle().compactFactLifecycleIssueForList(issue || {}, factsById || new Map()); },
        buildHistoryModelEvidence: function buildHistoryModelEvidence(snapshot, options) { return historyModels().buildHistoryModelEvidence(snapshot || {}, options || {}); },
        buildHistoryModelRebuildPrompt: function buildHistoryModelRebuildPrompt(evidence, options) { return historyModels().buildHistoryModelRebuildPrompt(evidence || {}, options || {}); },
        compactHistoryModelRebuildRunForList: function compactHistoryModelRebuildRunForList(run) { return historyModels().compactHistoryModelRebuildRunForList(run || {}); },
        buildCutoverComparisonReport: function buildCutoverComparisonReport(input) { return cutovers().buildCutoverComparisonReport(input || {}); },
        compactCutoverReportForList: function compactCutoverReportForList(report) { return cutovers().compactCutoverReportForList(report || {}); },
        normalizeOwnerState: function normalizeOwnerState(state) { return ownerSwitches().normalizeOwnerState(state || {}); },
        evaluateOwnerSwitch: function evaluateOwnerSwitch(state, requestedOwner, options) { return ownerSwitches().evaluateOwnerSwitch(state || {}, requestedOwner || 'legacy', options || {}); },
        compactOwnerGateForList: function compactOwnerGateForList(ownerState, runs) { return ownerSwitches().compactOwnerGateForList(ownerState || {}, runs || []); },
        normalizeUiGroupPrefs: function normalizeUiGroupPrefs(prefs) { return uiGroups().normalizeGroupPrefs(prefs || {}); },
        buildUiGroupCards: function buildUiGroupCards(prefs) { return uiGroups().buildGroupCards(prefs || {}); },
        buildCutoverSafetyReport: function buildCutoverSafetyReport(snapshot) { return products().buildCutoverSafetyReport(snapshot || {}); },
        buildMemoryExportManifest: function buildMemoryExportManifest(snapshot, options) { return products().buildMemoryExportManifest(snapshot || {}, options || {}); },
        getPublicContract: function getPublicContract() {
            return {
                owner: 'core/memoryBrain',
                release: 'v0.6.3',
                role: 'types/semantics',
                stableApis: [
                    'getLayers', 'getMigrationStages', 'createDefaultState', 'normalizeState',
                    'buildEventSummaryPrompt', 'parseEventSummaryResponse', 'compactEventForTimeline',
                    'buildFactExtractionPrompt', 'parseFactExtractionResponse', 'compactFactForList',
                    'buildFamilyDrafts', 'buildFamilyNamingPrompt', 'parseFamilyNamingResponse', 'compactFamilyForList',
                    'buildGraphEdges', 'normalizeGraphEdgeDraft', 'compactGraphForList',
                    'buildLongTermModelPrompt', 'parseLongTermModelResponse', 'compactModelForList',
                    'buildMemoryInjectionPackage', 'compactInjectionPreviewForList',
                    'normalizeSchedulerSettings', 'getCostProfiles', 'collectWeightUpdates', 'buildMaintenancePlan', 'compactSchedulerForList',
                    'buildMemoryPalace', 'buildArchiveSourceFromChat', 'buildArchiveScanReport', 'compactArchiveSourceForList', 'buildArchiveChunks', 'buildArchiveCursors', 'buildArchiveChunkRunReport', 'compactArchiveChunkForList', 'compactArchiveCursorForList', 'buildBackfillJobs', 'applyBackfillJobAction', 'buildBackfillRunReport', 'compactBackfillJobForList', 'compactBackfillRunForList', 'buildHistoricalEventBackfillPrompt', 'parseHistoricalEventBackfillResponse', 'ensureHistoricalEventSources', 'compactHistoryEventBackfillRunForList', 'buildHistoricalFactBackfillPrompt', 'parseHistoricalFactBackfillResponse', 'ensureHistoricalFactSources', 'compactHistoryFactBackfillRunForList', 'buildFactLifecyclePlan', 'buildReviewInboxPlan', 'compactReviewInboxItemForList', 'compactReviewInboxRunForList', 'buildFactCorrectionPlan', 'normalizeFactCorrectionDraft', 'compactFactCorrectionForList', 'compactFactCorrectionRunForList', 'collectConflictGroups', 'buildConflictResolutionPlan', 'compactConflictGroupForList', 'compactConflictResolutionForList', 'compactConflictRunForList', 'collectFamilyAdjustmentCandidates', 'buildFamilyAdjustmentPlan', 'compactFamilyAdjustmentCandidateForList', 'compactFamilyAdjustmentForList', 'compactFamilyAdjustmentRunForList', 'buildModelCorrectionPlan', 'normalizeModelCorrectionDraft', 'compactModelCorrectionForList', 'compactModelCorrectionRunForList', 'compactModelCorrectionOption', 'buildCorrectionPropagationPlan', 'compactPropagationForList', 'compactPropagationRunForList', 'buildMemoryTrustScorePlan', 'compactTrustRecordForList', 'compactTrustRunForList', 'buildTrustedMemoryGateReport', 'compactTrustedGateCheckForList', 'compactTrustedGateReportForList', 'compactTrustedGateRunForList', 'buildFormalInjectionAdapterPackage', 'compactFormalInjectionAdapterForList', 'buildRealtimeInjectionTraceReport', 'compactRealtimeInjectionTraceForList', 'buildLegacyReadOnlyPlan', 'compactLegacyReadOnlyPlanForList', 'compactFactLifecycleRunForList', 'compactFactLifecycleIssueForList', 'buildHistoryModelEvidence', 'buildHistoryModelRebuildPrompt', 'compactHistoryModelRebuildRunForList', 'buildCutoverComparisonReport', 'compactCutoverReportForList', 'normalizeOwnerState', 'evaluateOwnerSwitch', 'compactOwnerGateForList', 'normalizeUiGroupPrefs', 'buildUiGroupCards', 'buildCutoverSafetyReport', 'buildMemoryExportManifest'
                ]
            };
        }
    };
})(OwoApp);
