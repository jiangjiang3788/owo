// --- Memory Brain backfill queue semantics owner (v0.4.2) ---
// 纯计算：把 archiveChunks 转成可暂停、继续、重试的 backfillJobs / backfillRuns；不访问存储、网络或界面。
(function registerBackfillQueueSemantics(app) {
    const core = app.core.memoryBrain;

    const TASK_KINDS = Object.freeze([
        Object.freeze({ id: 'event-backfill', name: '历史事件回填', source: 'archiveChunks', nextVersion: 'v0.4.3' }),
        Object.freeze({ id: 'fact-backfill', name: '历史事实回填', source: 'events', nextVersion: 'v0.4.4' }),
        Object.freeze({ id: 'family-rebuild', name: '全量家族重建', source: 'facts', nextVersion: 'v0.4.6' }),
        Object.freeze({ id: 'graph-rebuild', name: '全量 graph 重建', source: 'facts/families', nextVersion: 'v0.4.6' }),
        Object.freeze({ id: 'model-rebuild', name: '全历史长期模型重建', source: 'facts/families/graph', nextVersion: 'v0.4.7' })
    ]);
    const QUEUE_STATUS = Object.freeze(['pending', 'running', 'paused', 'failed', 'done', 'skipped', 'canceled']);
    const OWNER_MODE = Object.freeze({ mode: 'shadow', formalInjection: false, writesLegacyMemory: false });

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function cleanText(value, max) {
        const text = String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
        if (!max || text.length <= max) return text;
        return text.slice(0, Math.max(0, max - 1)) + '…';
    }
    function safeNumber(value, fallback) {
        const number = Number(value);
        return Number.isFinite(number) ? number : fallback;
    }
    function hashText(value) {
        const text = String(value == null ? '' : value);
        let hash = 2166136261;
        for (let index = 0; index < text.length; index += 1) {
            hash ^= text.charCodeAt(index);
            hash = Math.imul(hash, 16777619);
        }
        return (hash >>> 0).toString(36);
    }
    function getTaskKind(taskKind) {
        const id = String(taskKind || 'event-backfill');
        return TASK_KINDS.find(kind => kind.id === id) || TASK_KINDS[0];
    }
    function normalizeBackfillPolicy(options) {
        const source = options || {};
        const costProfileId = String(source.costProfileId || source.profileId || 'balanced');
        return {
            taskKind: getTaskKind(source.taskKind).id,
            costProfileId,
            jobLimit: Math.max(1, Math.min(5000, safeNumber(source.jobLimit || source.limit, 200))),
            maxAttempts: Math.max(1, Math.min(8, safeNumber(source.maxAttempts, costProfileId === 'deep' ? 4 : 3))),
            concurrency: Math.max(1, Math.min(8, safeNumber(source.concurrency, costProfileId === 'deep' ? 2 : 1))),
            priority: String(source.priority || 'source-order'),
            includeFailed: source.includeFailed === true,
            includeDone: source.includeDone === true,
            dryRun: source.dryRun === true
        };
    }
    function chunkIsEligible(chunk, policy) {
        if (!chunk || chunk.status === 'retired') return false;
        if (chunk.status === 'done' && !policy.includeDone) return false;
        if (chunk.status === 'failed' && !policy.includeFailed) return false;
        return true;
    }
    function makeJobId(taskKind, chunk) {
        return `backfill-job-${taskKind}-${chunk.id || hashText(JSON.stringify(chunk))}`;
    }
    function buildBackfillJob(chunk, options) {
        const policy = normalizeBackfillPolicy(options || {});
        const task = getTaskKind(policy.taskKind);
        return {
            id: makeJobId(task.id, chunk),
            kind: task.id,
            layer: 'archive-backfill',
            status: 'pending',
            phase: task.id,
            archiveChunkId: chunk.id,
            archiveSourceId: chunk.archiveSourceId,
            sourceChatId: chunk.sourceChatId,
            sourceType: chunk.sourceType,
            sourceName: chunk.sourceName,
            chunkOrdinal: chunk.ordinal,
            chunkRangeText: `#${chunk.messageStartNo || (chunk.messageStartIndex + 1)}-#${chunk.messageEndNo || (chunk.messageEndIndex + 1)}`,
            messageStartIndex: chunk.messageStartIndex,
            messageEndIndex: chunk.messageEndIndex,
            messageCount: chunk.messageCount || 0,
            rangeHash: chunk.rangeHash || '',
            previewText: cleanText(asArray(chunk.preview).map(row => `${row.role || 'unknown'}:${row.text || ''}`).join(' / '), 180),
            attemptCount: 0,
            maxAttempts: policy.maxAttempts,
            priority: chunk.index || 0,
            costProfileId: policy.costProfileId,
            concurrencyGroup: `${task.id}:${chunk.archiveSourceId || 'unknown'}`,
            nextAction: task.nextVersion,
            errorMessage: '',
            runIds: [],
            mode: OWNER_MODE.mode,
            formalInjection: OWNER_MODE.formalInjection,
            writesLegacyMemory: OWNER_MODE.writesLegacyMemory
        };
    }
    function buildBackfillJobs(chunks, existingJobs, options) {
        const policy = normalizeBackfillPolicy(options || {});
        const existing = new Map(asArray(existingJobs).filter(job => job && job.id).map(job => [job.id, job]));
        const sorted = asArray(chunks).filter(chunk => chunkIsEligible(chunk, policy))
            .sort((a, b) => String(a.sourceName || '').localeCompare(String(b.sourceName || '')) || (a.index || 0) - (b.index || 0))
            .slice(0, policy.jobLimit);
        const jobs = [];
        sorted.forEach(chunk => {
            const draft = buildBackfillJob(chunk, policy);
            if (existing.has(draft.id) && options && options.resetExisting !== true) return;
            jobs.push(draft);
        });
        return jobs;
    }
    function summarizeBackfillJobs(jobs) {
        return asArray(jobs).reduce((acc, job) => {
            acc.total += 1;
            const status = QUEUE_STATUS.includes(job && job.status) ? job.status : 'pending';
            acc[status] = (acc[status] || 0) + 1;
            acc.messages += job && job.messageCount || 0;
            return acc;
        }, { total: 0, pending: 0, running: 0, paused: 0, failed: 0, done: 0, skipped: 0, canceled: 0, messages: 0 });
    }
    function applyJobAction(job, action, options) {
        const now = options && options.now || new Date().toISOString();
        const runId = options && options.runId || null;
        const next = Object.assign({}, job, { updatedAt: now });
        const runs = asArray(next.runIds);
        if (runId && !runs.includes(runId)) next.runIds = runs.concat(runId).slice(-20);
        if (action === 'start') {
            if (['pending', 'paused', 'failed'].includes(next.status)) next.status = 'running';
            next.startedAt = next.startedAt || now;
            next.lastRunId = runId;
            next.attemptCount = (next.attemptCount || 0) + 1;
        } else if (action === 'pause') {
            if (['pending', 'running', 'failed'].includes(next.status)) next.status = 'paused';
            next.pausedAt = now;
        } else if (action === 'resume') {
            if (next.status === 'paused') next.status = 'pending';
            next.resumedAt = now;
        } else if (action === 'retry') {
            if (next.status === 'failed') next.status = 'pending';
            next.errorMessage = '';
            next.retryQueuedAt = now;
        } else if (action === 'fail') {
            next.status = 'failed';
            next.errorMessage = options && options.errorMessage || next.errorMessage || 'manual-failed';
            next.failedAt = now;
        } else if (action === 'skip') {
            next.status = 'skipped';
            next.skippedAt = now;
        } else if (action === 'complete') {
            next.status = 'done';
            next.completedAt = now;
            next.errorMessage = '';
        } else if (action === 'cancel') {
            if (next.status !== 'done') next.status = 'canceled';
            next.canceledAt = now;
        }
        return next;
    }
    function buildBackfillRunReport(jobs, options) {
        const policy = normalizeBackfillPolicy(options || {});
        const summary = summarizeBackfillJobs(jobs);
        return {
            id: options && options.id || null,
            kind: 'history-backfill-queue',
            action: options && options.action || 'prepare',
            status: 'completed',
            taskKind: policy.taskKind,
            costProfileId: policy.costProfileId,
            jobCount: summary.total,
            pendingCount: summary.pending,
            runningCount: summary.running,
            pausedCount: summary.paused,
            failedCount: summary.failed,
            doneCount: summary.done,
            messageCount: summary.messages,
            policy,
            nextVersion: 'v0.4.3 history event backfill',
            mode: OWNER_MODE.mode,
            formalInjection: OWNER_MODE.formalInjection,
            writesLegacyMemory: OWNER_MODE.writesLegacyMemory
        };
    }
    function compactBackfillJobForList(job) {
        return {
            id: job.id,
            kind: job.kind,
            status: job.status,
            sourceName: job.sourceName,
            chunkRangeText: job.chunkRangeText,
            messageCount: job.messageCount || 0,
            attemptCount: job.attemptCount || 0,
            maxAttempts: job.maxAttempts || 0,
            priority: job.priority || 0,
            previewText: job.previewText || '',
            errorMessage: job.errorMessage || '',
            nextAction: job.nextAction || 'v0.4.3'
        };
    }
    function compactBackfillRunForList(run) {
        return {
            id: run.id,
            action: run.action || 'prepare',
            taskKind: run.taskKind || 'event-backfill',
            status: run.status || 'completed',
            createdAt: run.createdAt || null,
            jobCount: run.jobCount || 0,
            pendingCount: run.pendingCount || 0,
            runningCount: run.runningCount || 0,
            pausedCount: run.pausedCount || 0,
            failedCount: run.failedCount || 0,
            doneCount: run.doneCount || 0,
            costProfileId: run.costProfileId || 'balanced'
        };
    }

    core.backfillQueueSemantics = {
        TASK_KINDS,
        QUEUE_STATUS,
        normalizeBackfillPolicy,
        buildBackfillJob,
        buildBackfillJobs,
        summarizeBackfillJobs,
        applyJobAction,
        buildBackfillRunReport,
        compactBackfillJobForList,
        compactBackfillRunForList
    };
})(OwoApp);
