// --- Memory Brain history event backfill service owner (v0.4.3) ---
// 编排 archiveChunks → AI 历史事件回填；仍是 shadow，写 memoryBrain.events，不接正式 prompt。
(function registerHistoryEventBackfillService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function getCoreApi() { return app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function formatNumber(value) { return (Number(value) || 0).toLocaleString('zh-CN'); }
    function recordOperation(label, data, level) {
        const trace = app.platform.observability && app.platform.observability.operationTraceService;
        if (trace && typeof trace.recordOperation === 'function') return trace.recordOperation({ source: 'features/memoryBrain', sourceModule: 'features/memoryBrain/historyEventBackfillService', label, level: level || 'event', data: data || {} });
        return null;
    }
    async function requestEventBackfillText(prompt, options = {}) {
        const router = app.platform.ai && app.platform.ai.aiRouter;
        if (!router || typeof router.chat !== 'function') throw new Error('AI Router 尚未加载，无法运行历史事件回填。');
        const result = await router.chat({
            task: 'memory-event',
            messages: [{ role: 'user', content: prompt }],
            temperature: options.temperature === undefined ? 0.2 : options.temperature,
            source: 'features/memoryBrain/historyEventBackfillService',
            label: '记忆脑历史事件回填 AI 请求',
            state: options.state
        });
        return result && result.content || '';
    }
    async function runHistoryEventBackfill(options = {}) {
        const limit = Math.max(1, Math.min(20, Number(options.limit) || 3));
        recordOperation('历史事件回填输入', { limit, taskKind: 'event-backfill', formalPromptInjection: false, writesLegacyMemory: false });
        const started = getPlatformApi().applyBackfillAction('start', { limit, taskKind: 'event-backfill', state: options.state });
        const work = getPlatformApi().selectHistoryEventBackfillWork({ limit, state: options.state });
        if (!work.items || !work.items.length) throw new Error('没有 running 状态的历史事件回填任务。请先建立回填队列，或确认任务未完成。');
        const results = [];
        for (const item of work.items) {
            recordOperation('历史事件回填 chunk 输入', { jobId: item.job && item.job.id, chunkId: item.chunk && item.chunk.id, sourceName: item.source && item.source.name, messageCount: asArray(item.messages).length });
            try {
                const rawOutput = await requestEventBackfillText(item.prompt, options);
                recordOperation('历史事件回填模型输出', { jobId: item.job && item.job.id, chunkId: item.chunk && item.chunk.id, rawOutput }, 'success');
                const parsed = getCoreApi().parseHistoricalEventBackfillResponse(rawOutput);
                recordOperation('历史事件回填解析结果', { jobId: item.job && item.job.id, ok: parsed.ok, eventCount: asArray(parsed.drafts).length, diagnostics: parsed.diagnostics }, parsed.ok ? 'success' : 'error');
                results.push(Object.assign({}, item, { ok: parsed.ok, rawOutput, drafts: parsed.drafts, diagnostics: parsed.diagnostics, errorMessage: parsed.ok ? '' : '历史事件 JSON 解析失败' }));
            } catch (error) {
                recordOperation('历史事件回填错误', { jobId: item.job && item.job.id, chunkId: item.chunk && item.chunk.id, message: error.message }, 'error');
                results.push(Object.assign({}, item, { ok: false, rawOutput: '', drafts: [], diagnostics: ['request_failed'], errorMessage: error.message }));
            }
        }
        const stored = getPlatformApi().appendHistoryEventBackfillBatch({ input: { limit, startedRunId: started.run && started.run.id }, results }, { state: options.state });
        recordOperation('历史事件回填应用结果', { runId: stored.run && stored.run.id, batchId: stored.batch && stored.batch.id, eventCount: stored.events && stored.events.length || 0, failedCount: stored.run && stored.run.failedCount || 0 }, stored.run && stored.run.status === 'failed' ? 'error' : 'success');
        return stored;
    }
    function getHistoryEventBackfillCards(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const api = getCoreApi();
        const runs = asArray(snapshot.historyEventBackfillRuns).slice(0, 12).map(run => api.compactHistoryEventBackfillRunForList(run));
        const batches = asArray(snapshot.batches).filter(batch => batch && batch.kind === 'history-event-backfill').slice(0, 8).map(batch => ({ id: batch.id, status: batch.status, createdAt: batch.createdAt, eventCount: asArray(batch.eventIds).length, failedCount: asArray(batch.failedJobIds).length, jobCount: asArray(batch.jobIds).length }));
        const historyEvents = asArray(snapshot.events).filter(event => event && event.kind === 'history-backfill' && event.status !== 'retired');
        return {
            totalText: { runs: formatNumber(runs.length), events: formatNumber(historyEvents.length), batches: formatNumber(batches.length) },
            runs,
            batches,
            recentEvents: historyEvents.slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).slice(0, 8).map(event => api.compactEventForTimeline(event)),
            nextVersion: 'v0.4.4：历史事实回填'
        };
    }
    function rollbackLatestHistoryEventBatch(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'history-event-backfill' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的历史事件回填批次');
        const result = getPlatformApi().rollbackHistoryEventBackfillBatch(batch.id, options);
        recordOperation('历史事件回填批次回滚', { batchId: batch.id, eventCount: result.eventCount || 0, jobCount: result.jobCount || 0 });
        return result;
    }
    function getRoutingReport() {
        return { owner: 'features/memoryBrain/historyEventBackfillService', release: 'v0.4.3', writes: ['memoryBrain.events', 'memoryBrain.backfillJobs', 'memoryBrain.archiveChunks', 'memoryBrain.archiveCursors', 'memoryBrain.backfillRuns', 'memoryBrain.batches(kind=history-event-backfill)'], aiTask: 'memory-event', formalPromptInjection: false, writesLegacyMemory: false };
    }

    feature.historyEventBackfillService = { runHistoryEventBackfill, getHistoryEventBackfillCards, rollbackLatestHistoryEventBatch, recordOperation, getRoutingReport };
})(window);
