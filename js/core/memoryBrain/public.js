// --- Memory Brain core public facade (v0.4.2) ---
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
    function archives() { return core.memoryBrain.archiveSourceSemantics; }
    function chunks() { return core.memoryBrain.archiveChunkSemantics; }
    function backfills() { return core.memoryBrain.backfillQueueSemantics; }

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
        buildCutoverSafetyReport: function buildCutoverSafetyReport(snapshot) { return products().buildCutoverSafetyReport(snapshot || {}); },
        buildMemoryExportManifest: function buildMemoryExportManifest(snapshot, options) { return products().buildMemoryExportManifest(snapshot || {}, options || {}); },
        getPublicContract: function getPublicContract() {
            return {
                owner: 'core/memoryBrain',
                release: 'v0.4.2',
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
                    'buildMemoryPalace', 'buildArchiveSourceFromChat', 'buildArchiveScanReport', 'compactArchiveSourceForList', 'buildArchiveChunks', 'buildArchiveCursors', 'buildArchiveChunkRunReport', 'compactArchiveChunkForList', 'compactArchiveCursorForList', 'buildBackfillJobs', 'applyBackfillJobAction', 'buildBackfillRunReport', 'compactBackfillJobForList', 'compactBackfillRunForList', 'buildCutoverSafetyReport', 'buildMemoryExportManifest'
                ]
            };
        }
    };
})(OwoApp);
