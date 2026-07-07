// --- Memory Brain full-history long-term model rebuild service owner (v0.4.7) ---
// 编排全历史 active facts / families / graph → 6 个长期模型；仍是 shadow，不接正式 prompt。
(function registerHistoryModelRebuildService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function getCoreApi() { return app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi; }
    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function record(label, data, level) { if (feature.service && typeof feature.service.recordOperation === 'function') return feature.service.recordOperation(label, data || {}, level || 'event'); return null; }
    async function requestModelText(prompt, options = {}) {
        const router = app.platform.ai && app.platform.ai.aiRouter;
        if (!router || typeof router.chat !== 'function') throw new Error('AI Router 尚未加载，无法运行全历史长期模型重建。');
        const result = await router.chat({ task: 'memory-persona', messages: [{ role: 'user', content: prompt }], temperature: options.temperature === undefined ? 0.18 : options.temperature, source: 'features/memoryBrain/historyModelRebuildService', label: '记忆脑全历史长期模型 AI 请求', state: options.state });
        return result && result.content || '';
    }
    function getSemantics() { return app.core.memoryBrain.historyModelRebuildSemantics; }
    function buildInput(evidence, prompt, options) {
        return { rebuildScope: 'full-history-cleaned-facts', requestedTypes: ['user-profile', 'ai-self', 'world-model', 'project-brain', 'interaction-preferences', 'relationship-continuity'], evidenceSummary: evidence.summary || {}, promptPreview: String(prompt || '').slice(0, 12000), formalPromptInjection: false, writesLegacyMemory: false, maxFacts: Number(options.maxFacts) || 160, maxFamilies: Number(options.maxFamilies) || 42, maxEdges: Number(options.maxEdges) || 120 };
    }
    async function rebuildFullHistoryModels(options = {}) {
        const state = (options && options.state) || global.db || {};
        const platformApi = getPlatformApi();
        const coreApi = getCoreApi();
        const snapshot = platformApi.getSnapshot({ state });
        const evidence = getSemantics().buildHistoryModelEvidence(snapshot, options);
        if (!evidence.summary || !evidence.summary.eligibleFactCount) throw new Error('没有可用于全历史模型重建的 active facts。请先完成历史事实回填和事实生命周期清理。');
        const prompt = getSemantics().buildHistoryModelRebuildPrompt(evidence, options);
        const input = buildInput(evidence, prompt, options);
        record('全历史长期模型重建输入', input, 'event');
        let rawOutput = '';
        let diagnostics = [];
        let drafts = [];
        let fallbackApplied = false;
        try {
            rawOutput = await requestModelText(prompt, options);
            record('全历史长期模型输出', { rawOutput }, 'success');
            const parsed = coreApi.parseLongTermModelResponse(rawOutput);
            diagnostics = diagnostics.concat(parsed.diagnostics || []);
            drafts = parsed.ok ? parsed.models : [];
            record('全历史长期模型解析结果', { ok: parsed.ok, modelCount: drafts.length, diagnostics }, parsed.ok ? 'success' : 'error');
        } catch (error) {
            diagnostics.push('history_model_request_failed: ' + error.message);
            record('全历史长期模型错误', { message: error.message }, 'error');
        }
        if (!drafts.length) { fallbackApplied = true; drafts = coreApi.buildFallbackLongTermModels(evidence.snapshot || snapshot); diagnostics.push('history_model_fallback_applied'); }
        const stored = platformApi.appendLongTermModelBatch({ batchKind: 'history-long-term-model', rebuildScope: 'full-history-cleaned-facts', aiTask: 'memory-persona', input, rawOutput, parsedDrafts: drafts, parserDiagnostics: diagnostics, models: drafts, evidenceSummary: evidence.summary }, { state });
        const run = platformApi.appendHistoryModelRebuildRun({ modelBatchId: stored.batch && stored.batch.id, modelIds: asArray(stored.models).map(model => model.id), modelTypes: asArray(stored.models).map(model => model.type), evidenceSummary: evidence.summary, input, diagnostics, rawOutputLength: rawOutput.length, fallbackApplied }, { state });
        record('全历史长期模型应用结果', { batchId: stored.batch && stored.batch.id, runId: run.run && run.run.id, modelCount: asArray(stored.models).length, modelTypes: stored.batch && stored.batch.modelTypes, fallbackApplied, diagnostics }, stored.models && stored.models.length ? 'success' : 'event');
        return Object.assign({ evidenceSummary: evidence.summary, diagnostics, fallbackApplied, run: run.run }, stored);
    }
    function getHistoryModelRebuildCards(options = {}) {
        const snapshot = getPlatformApi().getHistoryModelRebuildSnapshot(options);
        const core = getCoreApi();
        const runs = asArray(snapshot.runs).slice(0, 8).map(run => core.compactHistoryModelRebuildRunForList(run));
        const batches = asArray(snapshot.batches).slice(0, 8).map(batch => ({ id: batch.id, status: batch.status, createdAt: batch.createdAt, modelCount: asArray(batch.modelIds).length, modelTypes: asArray(batch.modelTypes), evidenceSummary: batch.evidenceSummary || {} }));
        return { totalText: snapshot.evidenceSummary || {}, runs, batches, activeModelCount: snapshot.activeModelCount || 0 };
    }
    function rollbackLatestHistoryModelBatch(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'history-long-term-model' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的全历史长期模型批次。');
        const run = asArray(snapshot.historyModelRebuildRuns).find(item => item && item.modelBatchId === batch.id);
        const result = run && getPlatformApi().rollbackHistoryModelRebuildRun ? getPlatformApi().rollbackHistoryModelRebuildRun(run.id, options).modelRollback : getPlatformApi().rollbackModelBatch(batch.id, options);
        record('全历史长期模型批次回滚', { batchId: batch.id, modelCount: result.modelCount || 0, ok: result.ok }, result.ok ? 'success' : 'error');
        return result;
    }
    feature.historyModelRebuildService = { rebuildFullHistoryModels, getHistoryModelRebuildCards, rollbackLatestHistoryModelBatch };
})(window);
