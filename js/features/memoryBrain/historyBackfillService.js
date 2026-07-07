// --- Memory Brain history backfill service owner (v0.4.2) ---
// 编排回填队列、断点续跑和状态操作；不跑 AI、不生成事件、不接正式 prompt。
(function registerHistoryBackfillService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function getCoreApi() { return app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function formatNumber(value) { return (Number(value) || 0).toLocaleString('zh-CN'); }
    function recordOperation(label, data, level) {
        const trace = app.platform.observability && app.platform.observability.operationTraceService;
        if (trace && typeof trace.recordOperation === 'function') return trace.recordOperation({ source: 'features/memoryBrain', sourceModule: 'features/memoryBrain/historyBackfillService', label, level: level || 'event', data: data || {} });
        return null;
    }
    function compactJob(job) {
        const api = getCoreApi();
        return api && typeof api.compactBackfillJobForList === 'function' ? api.compactBackfillJobForList(job) : job;
    }
    function compactRun(run) {
        const api = getCoreApi();
        return api && typeof api.compactBackfillRunForList === 'function' ? api.compactBackfillRunForList(run) : run;
    }
    function summarize(jobs) {
        const api = getCoreApi();
        return api && typeof api.summarizeBackfillJobs === 'function' ? api.summarizeBackfillJobs(jobs || []) : { total: asArray(jobs).length };
    }

    function prepareBackfillQueue(options = {}) {
        recordOperation('历史回填队列准备输入', { taskKind: options.taskKind || 'event-backfill', jobLimit: options.jobLimit || options.limit || 200, costProfileId: options.costProfileId || 'balanced' });
        const result = getPlatformApi().prepareBackfillQueue(options);
        recordOperation('历史回填队列准备应用结果', {
            backfillRunId: result.run && result.run.id,
            taskKind: result.run && result.run.taskKind,
            jobCount: result.jobs && result.jobs.length || 0,
            pendingCount: result.run && result.run.pendingCount || 0,
            formalPromptInjection: false,
            writesLegacyMemory: false
        });
        return result;
    }
    function applyBackfillAction(action, options = {}) {
        recordOperation('历史回填队列操作输入', { action, limit: options.limit || 200, jobIds: options.jobIds || [] });
        const result = getPlatformApi().applyBackfillAction(action, options);
        recordOperation('历史回填队列操作应用结果', { action, backfillRunId: result.run && result.run.id, jobCount: result.jobs && result.jobs.length || 0, status: result.run && result.run.status || 'completed' });
        return result;
    }
    function pauseBackfillQueue(options = {}) { return applyBackfillAction('pause', options); }
    function resumeBackfillQueue(options = {}) { return applyBackfillAction('resume', options); }
    function retryFailedBackfillJobs(options = {}) { return applyBackfillAction('retry', options); }
    function startBackfillQueue(options = {}) { return applyBackfillAction('start', options); }

    function getBackfillCards(options = {}) {
        const snapshot = getPlatformApi().getBackfillSnapshot(options);
        const jobs = asArray(snapshot.jobs).filter(job => job && job.status !== 'retired');
        const totals = summarize(jobs);
        return {
            lastRun: snapshot.lastRun || null,
            totals,
            totalText: {
                jobs: formatNumber(totals.total),
                pending: formatNumber(totals.pending),
                running: formatNumber(totals.running),
                paused: formatNumber(totals.paused),
                failed: formatNumber(totals.failed),
                done: formatNumber(totals.done),
                messages: formatNumber(totals.messages)
            },
            jobs: jobs.slice().sort((a, b) => String(a.sourceName || '').localeCompare(String(b.sourceName || '')) || (a.priority || 0) - (b.priority || 0)).slice(0, options.jobCardLimit || 32).map(compactJob),
            runs: asArray(snapshot.runs).slice(0, 12).map(compactRun),
            nextVersion: 'v0.4.3：历史事件回填'
        };
    }
    function rollbackLatestBackfillBatch(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'history-backfill-queue' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的回填队列批次');
        const result = getPlatformApi().rollbackBackfillBatch(batch.id, options);
        recordOperation('历史回填队列批次回滚', { batchId: batch.id, jobCount: result.jobCount || 0, chunkCount: result.chunkCount || 0 });
        return result;
    }
    function getRoutingReport() {
        return {
            owner: 'features/memoryBrain/historyBackfillService',
            release: 'v0.4.2',
            writes: ['memoryBrain.backfillJobs', 'memoryBrain.backfillRuns', 'memoryBrain.batches(kind=history-backfill-queue)'],
            noAiCall: true,
            noLegacyMutation: true,
            formalPromptInjection: false
        };
    }

    feature.historyBackfillService = { prepareBackfillQueue, startBackfillQueue, pauseBackfillQueue, resumeBackfillQueue, retryFailedBackfillJobs, applyBackfillAction, getBackfillCards, rollbackLatestBackfillBatch, recordOperation, getRoutingReport };
})(window);
