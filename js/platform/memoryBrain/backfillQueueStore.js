// --- Memory Brain backfill queue store owner (v0.4.2) ---
// 写入 backfillJobs / backfillRuns，支持暂停、继续、重试和回滚；不跑 AI、不改旧记忆、不接正式 prompt。
(function registerBackfillQueueStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[backfillQueueStore] memoryBrainStore 尚未加载');

    function getCoreApi() { return app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi; }
    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() { return typeof platform.memoryBrainStore.saveRootState === 'function' ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }

    function getSemantics() {
        const api = getCoreApi();
        if (!api || typeof api.buildBackfillJobs !== 'function') throw new Error('[backfillQueueStore] backfillQueueSemantics 尚未加载');
        return api;
    }
    function summarizeRun(run, jobs) {
        return Object.assign({}, run, {
            jobIds: asArray(jobs).map(job => job.id),
            chunkIds: asArray(jobs).map(job => job.archiveChunkId).filter(Boolean),
            sourceIds: Array.from(new Set(asArray(jobs).map(job => job.archiveSourceId).filter(Boolean)))
        });
    }
    function markChunksForJobs(chunks, jobs, meta) {
        const jobByChunk = new Map(asArray(jobs).filter(job => job && job.archiveChunkId).map(job => [job.archiveChunkId, job]));
        return asArray(chunks).map(chunk => {
            const job = jobByChunk.get(chunk && chunk.id);
            if (!job) return chunk;
            return Object.assign({}, chunk, {
                backfillJobId: job.id,
                backfillStatus: job.status,
                backfillTaskKind: job.kind,
                backfillRunId: meta && meta.runId || job.lastRunId || chunk.backfillRunId || null,
                updatedAt: meta && meta.updatedAt || chunk.updatedAt
            });
        });
    }
    function updateCursorsForJobs(cursors, chunks) {
        const chunksBySource = new Map();
        asArray(chunks).forEach(chunk => {
            if (!chunk || chunk.status === 'retired') return;
            const list = chunksBySource.get(chunk.archiveSourceId) || [];
            list.push(chunk);
            chunksBySource.set(chunk.archiveSourceId, list);
        });
        return asArray(cursors).map(cursor => {
            const list = chunksBySource.get(cursor && cursor.archiveSourceId) || [];
            const pending = list.filter(chunk => (chunk.backfillStatus || chunk.status) === 'pending').length;
            const running = list.filter(chunk => chunk.backfillStatus === 'running').length;
            const paused = list.filter(chunk => chunk.backfillStatus === 'paused').length;
            const failed = list.filter(chunk => chunk.backfillStatus === 'failed' || chunk.status === 'failed').length;
            const done = list.filter(chunk => chunk.backfillStatus === 'done' || chunk.status === 'done').length;
            const next = list.filter(chunk => (chunk.backfillStatus || chunk.status) === 'pending').sort((a, b) => (a.index || 0) - (b.index || 0))[0] || null;
            return Object.assign({}, cursor, {
                backfillStatus: running ? 'running' : paused ? 'paused' : failed ? 'needs-review' : pending ? 'queued' : done && list.length === done ? 'done' : cursor.status,
                backfillPendingChunks: pending,
                backfillRunningChunks: running,
                backfillPausedChunks: paused,
                backfillFailedChunks: failed,
                backfillDoneChunks: done,
                nextBackfillChunkId: next ? next.id : null,
                updatedAt: nowIso()
            });
        });
    }
    function selectJobsForAction(jobs, action, options) {
        const ids = new Set(asArray(options && options.jobIds).map(String));
        const limit = Number(options && options.limit) || 200;
        let selected = asArray(jobs).filter(job => job && job.status !== 'retired');
        if (ids.size) selected = selected.filter(job => ids.has(String(job.id)));
        else if (action === 'start') selected = selected.filter(job => ['pending', 'paused'].includes(job.status)).slice(0, limit);
        else if (action === 'pause') selected = selected.filter(job => ['pending', 'running', 'failed'].includes(job.status)).slice(0, limit);
        else if (action === 'resume') selected = selected.filter(job => job.status === 'paused').slice(0, limit);
        else if (action === 'retry') selected = selected.filter(job => job.status === 'failed').slice(0, limit);
        else if (action === 'fail') selected = selected.filter(job => job.status === 'running').slice(0, limit);
        else selected = selected.slice(0, limit);
        return selected;
    }
    function appendBatch(state, run, changedJobs, beforeJobs, beforeChunks, beforeCursors, input) {
        const createdAt = run.createdAt || nowIso();
        const batch = {
            id: nextId('memory-brain-batch'),
            kind: 'history-backfill-queue',
            status: 'applied',
            createdAt,
            updatedAt: createdAt,
            mode: state.settings && state.settings.mode || 'shadow',
            backfillRunId: run.id,
            action: run.action || 'prepare',
            taskKind: run.taskKind || 'event-backfill',
            jobIds: asArray(changedJobs).map(job => job.id),
            chunkIds: asArray(changedJobs).map(job => job.archiveChunkId).filter(Boolean),
            sourceIds: Array.from(new Set(asArray(changedJobs).map(job => job.archiveSourceId).filter(Boolean))),
            input: clone(input || {}),
            beforeJobs: clone(beforeJobs),
            beforeChunks: clone(beforeChunks),
            beforeCursors: clone(beforeCursors),
            writesLegacyMemory: false,
            formalPromptInjection: false
        };
        state.batches = [batch].concat(asArray(state.batches));
        return batch;
    }

    function prepareBackfillQueue(options = {}) {
        const state = ensureState(options);
        const api = getSemantics();
        const createdAt = nowIso();
        const runId = options.runId || nextId('backfill-run');
        const chunks = asArray(state.archiveChunks).filter(chunk => chunk && chunk.status !== 'retired');
        const beforeJobs = asArray(state.backfillJobs);
        const beforeChunks = asArray(state.archiveChunks);
        const beforeCursors = asArray(state.archiveCursors);
        const newJobs = api.buildBackfillJobs(chunks, beforeJobs, options).map(job => Object.assign({}, job, { createdAt, updatedAt: createdAt, runIds: [runId] }));
        const existing = beforeJobs.filter(job => !newJobs.some(next => next.id === job.id));
        const allJobs = existing.concat(newJobs);
        const run = summarizeRun(Object.assign(api.buildBackfillRunReport(newJobs, Object.assign({}, options, { id: runId, action: 'prepare' })), { id: runId, createdAt, updatedAt: createdAt }), newJobs);
        state.backfillJobs = allJobs;
        state.archiveChunks = markChunksForJobs(state.archiveChunks, newJobs, { runId, updatedAt: createdAt });
        state.archiveCursors = updateCursorsForJobs(state.archiveCursors, state.archiveChunks);
        state.backfillRuns = [run].concat(asArray(state.backfillRuns)).slice(0, 80);
        state.lastBackfillRun = run;
        const batch = appendBatch(state, run, newJobs, beforeJobs, beforeChunks, beforeCursors, options);
        state.updatedAt = createdAt;
        saveRootState();
        return clone({ run, jobs: newJobs, batch });
    }

    function applyBackfillAction(action, options = {}) {
        const state = ensureState(options);
        const api = getSemantics();
        const createdAt = nowIso();
        const runId = options.runId || nextId('backfill-run');
        const beforeJobs = asArray(state.backfillJobs);
        const beforeChunks = asArray(state.archiveChunks);
        const beforeCursors = asArray(state.archiveCursors);
        const selected = selectJobsForAction(beforeJobs, action, options);
        const selectedIds = new Set(selected.map(job => job.id));
        const changedJobs = beforeJobs.map(job => selectedIds.has(job.id) ? api.applyBackfillJobAction(job, action, { now: createdAt, runId, errorMessage: options.errorMessage }) : job)
            .filter(job => selectedIds.has(job.id));
        const changedById = new Map(changedJobs.map(job => [job.id, job]));
        state.backfillJobs = beforeJobs.map(job => changedById.get(job.id) || job);
        state.archiveChunks = markChunksForJobs(state.archiveChunks, changedJobs, { runId, updatedAt: createdAt });
        state.archiveCursors = updateCursorsForJobs(state.archiveCursors, state.archiveChunks);
        const run = summarizeRun(Object.assign(api.buildBackfillRunReport(changedJobs, Object.assign({}, options, { id: runId, action })), { id: runId, action, createdAt, updatedAt: createdAt }), changedJobs);
        state.backfillRuns = [run].concat(asArray(state.backfillRuns)).slice(0, 80);
        state.lastBackfillRun = run;
        const batch = appendBatch(state, run, changedJobs, beforeJobs, beforeChunks, beforeCursors, Object.assign({}, options, { action }));
        state.updatedAt = createdAt;
        saveRootState();
        return clone({ run, jobs: changedJobs, batch });
    }

    function listBackfillJobs(options = {}) {
        return asArray(ensureState(options).backfillJobs).filter(job => !options.status || job.status === options.status)
            .slice().sort((a, b) => String(a.sourceName || '').localeCompare(String(b.sourceName || '')) || (a.priority || 0) - (b.priority || 0)).map(clone);
    }
    function listBackfillRuns(options = {}) {
        return asArray(ensureState(options).backfillRuns).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).map(clone);
    }
    function getBackfillSnapshot(options = {}) {
        const state = ensureState(options);
        return clone({ jobs: asArray(state.backfillJobs), runs: asArray(state.backfillRuns), lastRun: state.lastBackfillRun || null, chunks: asArray(state.archiveChunks), cursors: asArray(state.archiveCursors) });
    }
    function rollbackBackfillBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'history-backfill-queue');
        if (!batch) throw new Error('找不到回填队列批次');
        state.backfillJobs = clone(asArray(batch.beforeJobs));
        state.archiveChunks = clone(asArray(batch.beforeChunks));
        state.archiveCursors = clone(asArray(batch.beforeCursors));
        state.backfillRuns = asArray(state.backfillRuns).map(run => run && run.id === batch.backfillRunId ? Object.assign({}, run, { status: 'rolled-back', rolledBackAt: nowIso() }) : run);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', rolledBackAt: nowIso() }) : item);
        state.lastBackfillRun = asArray(state.backfillRuns).find(run => run && run.status === 'completed') || null;
        state.updatedAt = nowIso();
        saveRootState();
        return clone({ ok: true, jobCount: asArray(batch.jobIds).length, chunkCount: asArray(batch.chunkIds).length, batchId: batch.id });
    }
    function getRoutingReport() {
        return {
            owner: 'platform/memoryBrain/backfillQueueStore',
            release: 'v0.4.2',
            queueWrite: 'memoryBrain.backfillJobs + memoryBrain.backfillRuns + memoryBrain.batches only',
            noAiCall: true,
            noLegacyMutation: true,
            formalPromptInjection: false
        };
    }

    platform.backfillQueueStore = { prepareBackfillQueue, applyBackfillAction, listBackfillJobs, listBackfillRuns, getBackfillSnapshot, rollbackBackfillBatch, getRoutingReport };
})(window);
