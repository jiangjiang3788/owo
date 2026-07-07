// --- Memory Brain history fact backfill service owner (v0.4.4) ---
// 编排历史事件 → AI 原子事实回填；仍是 shadow，只写 memoryBrain.facts，不接正式 prompt。
(function registerHistoryFactBackfillService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function getCoreApi() { return app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function formatNumber(value) { return (Number(value) || 0).toLocaleString('zh-CN'); }
    function recordOperation(label, data, level) {
        const trace = app.platform.observability && app.platform.observability.operationTraceService;
        if (trace && typeof trace.recordOperation === 'function') return trace.recordOperation({ source: 'features/memoryBrain', sourceModule: 'features/memoryBrain/historyFactBackfillService', label, level: level || 'event', data: data || {} });
        return null;
    }
    async function requestFactBackfillText(prompt, options = {}) {
        const router = app.platform.ai && app.platform.ai.aiRouter;
        if (!router || typeof router.chat !== 'function') throw new Error('AI Router 尚未加载，无法运行历史事实回填。');
        const result = await router.chat({
            task: 'memory-fact',
            messages: [{ role: 'user', content: prompt }],
            temperature: options.temperature === undefined ? 0.15 : options.temperature,
            source: 'features/memoryBrain/historyFactBackfillService',
            label: '记忆脑历史事实回填 AI 请求',
            state: options.state
        });
        return result && result.content || '';
    }
    async function runHistoryFactBackfill(options = {}) {
        const limit = Math.max(1, Math.min(20, Number(options.limit) || 3));
        const maxFacts = Math.max(1, Math.min(24, Number(options.maxFacts) || 8));
        recordOperation('历史事实回填输入', { limit, maxFacts, taskKind: 'fact-backfill', formalPromptInjection: false, writesLegacyMemory: false });
        const prepared = getPlatformApi().prepareBackfillQueue({ taskKind: 'fact-backfill', jobLimit: options.jobLimit || 500, maxAttempts: options.maxAttempts || 3, state: options.state });
        const started = getPlatformApi().applyBackfillAction('start', { limit, taskKind: 'fact-backfill', state: options.state });
        const work = getPlatformApi().selectHistoryFactBackfillWork({ limit, maxFacts, state: options.state });
        if (!work.items || !work.items.length) throw new Error('没有 running 状态的历史事实回填任务。请先完成历史事件回填，或建立 fact-backfill 队列。');
        const results = [];
        for (const item of work.items) {
            recordOperation('历史事实回填事件输入', { jobId: item.job && item.job.id, eventId: item.event && item.event.id, title: item.event && item.event.title, alreadyHasFact: item.alreadyHasFact });
            try {
                const rawOutput = await requestFactBackfillText(item.prompt, options);
                recordOperation('历史事实回填模型输出', { jobId: item.job && item.job.id, eventId: item.event && item.event.id, rawOutput }, 'success');
                const parsed = getCoreApi().parseHistoricalFactBackfillResponse(rawOutput);
                recordOperation('历史事实回填解析结果', { jobId: item.job && item.job.id, ok: parsed.ok, factCount: asArray(parsed.drafts).length, diagnostics: parsed.diagnostics }, parsed.ok ? 'success' : 'error');
                results.push(Object.assign({}, item, { ok: parsed.ok, rawOutput, drafts: parsed.drafts, diagnostics: parsed.diagnostics, errorMessage: parsed.ok ? '' : '历史事实 JSON 解析失败' }));
            } catch (error) {
                recordOperation('历史事实回填错误', { jobId: item.job && item.job.id, eventId: item.event && item.event.id, message: error.message }, 'error');
                results.push(Object.assign({}, item, { ok: false, rawOutput: '', drafts: [], diagnostics: ['request_failed'], errorMessage: error.message }));
            }
        }
        const stored = getPlatformApi().appendHistoryFactBackfillBatch({ input: { limit, maxFacts, preparedRunId: prepared.run && prepared.run.id, startedRunId: started.run && started.run.id }, results }, { state: options.state });
        recordOperation('历史事实回填应用结果', { runId: stored.run && stored.run.id, batchId: stored.batch && stored.batch.id, factCount: stored.facts && stored.facts.length || 0, failedCount: stored.run && stored.run.failedCount || 0 }, stored.run && stored.run.status === 'failed' ? 'error' : 'success');
        return stored;
    }
    function getHistoryFactBackfillCards(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const api = getCoreApi();
        const runs = asArray(snapshot.historyFactBackfillRuns).slice(0, 12).map(run => api.compactHistoryFactBackfillRunForList(run));
        const batches = asArray(snapshot.batches).filter(batch => batch && batch.kind === 'history-fact-backfill').slice(0, 8).map(batch => ({ id: batch.id, status: batch.status, createdAt: batch.createdAt, factCount: asArray(batch.factIds).length, eventCount: asArray(batch.eventIds).length, failedCount: asArray(batch.failedJobIds).length, jobCount: asArray(batch.jobIds).length }));
        const historyFacts = asArray(snapshot.facts).filter(fact => fact && fact.historical && fact.status !== 'retired');
        const runningJobs = asArray(snapshot.backfillJobs).filter(job => job && job.kind === 'fact-backfill' && job.status === 'running').length;
        const pendingJobs = asArray(snapshot.backfillJobs).filter(job => job && job.kind === 'fact-backfill' && job.status === 'pending').length;
        return {
            totalText: { runs: formatNumber(runs.length), facts: formatNumber(historyFacts.length), batches: formatNumber(batches.length), pending: formatNumber(pendingJobs), running: formatNumber(runningJobs) },
            runs,
            batches,
            recentFacts: historyFacts.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 8).map(fact => api.compactFactForList(fact)),
            nextVersion: 'v0.4.5：去重 / 冲突 / 过时事实'
        };
    }
    function rollbackLatestHistoryFactBatch(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'history-fact-backfill' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的历史事实回填批次');
        const result = getPlatformApi().rollbackHistoryFactBackfillBatch(batch.id, options);
        recordOperation('历史事实回填批次回滚', { batchId: batch.id, factCount: result.factCount || 0, eventCount: result.eventCount || 0, jobCount: result.jobCount || 0 });
        return result;
    }
    function getRoutingReport() {
        return { owner: 'features/memoryBrain/historyFactBackfillService', release: 'v0.4.4', writes: ['memoryBrain.facts', 'memoryBrain.backfillJobs', 'memoryBrain.events', 'memoryBrain.backfillRuns', 'memoryBrain.batches(kind=history-fact-backfill)'], aiTask: 'memory-fact', formalPromptInjection: false, writesLegacyMemory: false };
    }

    feature.historyFactBackfillService = { runHistoryFactBackfill, getHistoryFactBackfillCards, rollbackLatestHistoryFactBatch, recordOperation, getRoutingReport };
})(window);
