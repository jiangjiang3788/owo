// --- Memory Brain history fact backfill store owner (v0.4.4) ---
// 应用历史事件 → 原子事实回填结果；只写 memoryBrain.*，不改旧记忆、不接正式 prompt。
(function registerHistoryFactBackfillStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[historyFactBackfillStore] memoryBrainStore 尚未加载');

    function getCoreApi() { return app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi; }
    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() { return typeof platform.memoryBrainStore.saveRootState === 'function' ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function clip(value, max) { const text = String(value == null ? '' : value); return text.length > max ? text.slice(0, max - 1) + '…' : text; }
    function factKey(fact) { const source = fact && fact.source || {}; return `${source.eventId || ''}::${String(fact && fact.content || '').replace(/\s+/g, ' ').trim().toLowerCase()}`; }

    function selectHistoryFactBackfillWork(options = {}) {
        const state = ensureState(options);
        const api = getCoreApi();
        const limit = Math.max(1, Math.min(20, Number(options.limit) || 3));
        const eventsById = new Map(asArray(state.events).map(event => [event && event.id, event]));
        const activeKeys = new Set(asArray(state.facts).filter(fact => fact && fact.status !== 'retired').map(factKey));
        const jobs = asArray(state.backfillJobs).filter(job => job && job.kind === 'fact-backfill' && job.status === 'running').slice(0, limit);
        const items = jobs.map(job => {
            const event = eventsById.get(job.eventId) || null;
            if (!event) return null;
            const hasFact = asArray(state.facts).some(fact => fact && fact.status !== 'retired' && fact.source && fact.source.eventId === event.id);
            return {
                job: clone(job),
                event: clone(event),
                prompt: api.buildHistoricalFactBackfillPrompt(event, { maxFacts: options.maxFacts || 8 }),
                alreadyHasFact: hasFact,
                duplicateKeyPrefix: event.id,
                activeKeys: Array.from(activeKeys).filter(key => key.indexOf(event.id + '::') === 0).slice(0, 12)
            };
        }).filter(Boolean);
        return clone({ items, jobCount: items.length });
    }
    function normalizeStoredFact(raw, batchId, event, job, createdAt, state) {
        const fact = Object.assign({
            id: raw && raw.id || nextId('memory-fact'),
            layer: 'fact', kind: 'atomic', status: 'active', reviewStatus: 'auto-applied-history-backfill',
            mode: state.settings && state.settings.mode || 'shadow', historical: true,
            createdAt, updatedAt: createdAt, batchId
        }, clone(raw || {}));
        fact.batchId = batchId;
        fact.layer = 'fact';
        fact.kind = 'atomic';
        fact.status = fact.status === 'retired' ? 'retired' : 'active';
        fact.reviewStatus = fact.reviewStatus || 'auto-applied-history-backfill';
        fact.mode = state.settings && state.settings.mode || 'shadow';
        fact.historical = true;
        fact.createdAt = fact.createdAt || createdAt;
        fact.updatedAt = createdAt;
        fact.source = Object.assign({}, raw && raw.source || {}, {
            eventId: event && event.id || job && job.eventId || '',
            eventTitle: event && event.title || job && job.eventTitle || '',
            backfillJobId: job && job.id || raw && raw.source && raw.source.backfillJobId || ''
        });
        return fact;
    }
    function updateJob(job, ok, createdAt, result) {
        const next = Object.assign({}, job, { updatedAt: createdAt });
        if (ok) {
            next.status = 'done'; next.completedAt = createdAt; next.errorMessage = ''; next.factCount = result.factCount || 0;
        } else {
            next.status = 'failed'; next.failedAt = createdAt; next.errorMessage = result.errorMessage || '历史事实回填失败';
        }
        return next;
    }
    function appendHistoryFactBackfillBatch(payload = {}, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const batchId = payload.batchId || nextId('memory-brain-batch');
        const allJobsBefore = asArray(state.backfillJobs);
        const allEventsBefore = asArray(state.events);
        const beforeFacts = clone(asArray(state.facts));
        const eventById = new Map(allEventsBefore.map(event => [event && event.id, event]));
        const incomingJobIds = new Set(asArray(payload.results).map(result => result && result.job && result.job.id).filter(Boolean));
        const incomingEventIds = new Set(asArray(payload.results).map(result => result && (result.event && result.event.id || result.job && result.job.eventId)).filter(Boolean));
        const beforeJobs = clone(allJobsBefore.filter(job => incomingJobIds.has(job && job.id)));
        const beforeEvents = clone(allEventsBefore.filter(event => incomingEventIds.has(event && event.id)));
        const existingKeys = new Set(asArray(state.facts).filter(fact => fact && fact.status !== 'retired').map(factKey));
        const newKeys = new Set();
        const facts = [];
        const diagnostics = [];
        const results = asArray(payload.results);
        const resultByJob = new Map();
        const eventIds = [];
        const failedJobIds = [];
        results.forEach(result => {
            const job = result.job || {};
            const event = result.event || eventById.get(job.eventId) || {};
            if (event && event.id && !eventIds.includes(event.id)) eventIds.push(event.id);
            if (!result.ok) failedJobIds.push(job.id);
            asArray(result.diagnostics).forEach(item => diagnostics.push(`${job.id || 'job'}:${item}`));
            let factCount = 0;
            const sourcedFacts = getCoreApi().ensureHistoricalFactSources(result.drafts || [], event, job);
            sourcedFacts.forEach(rawFact => {
                const fact = normalizeStoredFact(rawFact, batchId, event, job, createdAt, state);
                if (!fact.content) return;
                const key = factKey(fact);
                if (existingKeys.has(key) || newKeys.has(key)) { diagnostics.push('duplicate_history_fact_skipped: ' + clip(fact.content, 80)); return; }
                existingKeys.add(key); newKeys.add(key); facts.push(fact); factCount += 1;
            });
            resultByJob.set(job.id, { ok: result.ok, factCount, errorMessage: result.errorMessage || '' });
        });
        if (facts.length) {
            const ids = new Set(facts.map(fact => fact.id));
            state.facts = facts.concat(asArray(state.facts).filter(fact => fact && !ids.has(fact.id)));
        }
        state.backfillJobs = asArray(state.backfillJobs).map(job => {
            const result = resultByJob.get(job && job.id);
            return result ? updateJob(job, result.ok, createdAt, result) : job;
        });
        const factCountByEvent = new Map();
        facts.forEach(fact => { const eventId = fact.source && fact.source.eventId || ''; factCountByEvent.set(eventId, (factCountByEvent.get(eventId) || 0) + 1); });
        state.events = asArray(state.events).map(event => eventIds.includes(event && event.id) ? Object.assign({}, event, { factBackfillStatus: failedJobIds.length && !factCountByEvent.get(event.id) ? 'failed' : 'done', historyFactCount: (event.historyFactCount || 0) + (factCountByEvent.get(event.id) || 0), updatedAt: createdAt }) : event);
        const run = {
            id: nextId('history-fact-run'),
            kind: 'history-fact-backfill',
            status: failedJobIds.length && !facts.length ? 'failed' : 'completed',
            createdAt, updatedAt: createdAt,
            jobCount: results.length,
            eventCount: eventIds.length,
            factCount: facts.length,
            failedCount: failedJobIds.length,
            eventIds,
            jobIds: results.map(result => result.job && result.job.id).filter(Boolean),
            failedJobIds,
            mode: state.settings && state.settings.mode || 'shadow',
            formalPromptInjection: false,
            writesLegacyMemory: false
        };
        const batch = {
            id: batchId,
            kind: 'history-fact-backfill',
            status: facts.length ? 'applied' : (failedJobIds.length ? 'error' : 'skipped'),
            createdAt, updatedAt: createdAt,
            mode: state.settings && state.settings.mode || 'shadow',
            historyFactRunId: run.id,
            eventIds,
            factIds: facts.map(fact => fact.id),
            jobIds: run.jobIds,
            failedJobIds,
            input: clone(payload.input || {}),
            rawOutputs: results.map(result => ({ jobId: result.job && result.job.id, eventId: result.event && result.event.id, rawOutput: clip(result.rawOutput || '', 12000), diagnostics: result.diagnostics || [], errorMessage: result.errorMessage || '' })),
            parserDiagnostics: diagnostics,
            beforeJobs,
            beforeEvents,
            beforeFactCount: beforeFacts.length,
            writesLegacyMemory: false,
            formalPromptInjection: false
        };
        state.historyFactBackfillRuns = [run].concat(asArray(state.historyFactBackfillRuns)).slice(0, 80);
        state.backfillRuns = [run].concat(asArray(state.backfillRuns)).slice(0, 120);
        state.lastBackfillRun = run;
        state.batches = [batch].concat(asArray(state.batches));
        state.updatedAt = createdAt;
        saveRootState();
        return clone({ run, facts, batch });
    }
    function rollbackHistoryFactBackfillBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'history-fact-backfill');
        if (!batch) throw new Error('找不到历史事实回填批次');
        const factIds = new Set(asArray(batch.factIds));
        state.facts = asArray(state.facts).filter(fact => !factIds.has(fact && fact.id));
        if (asArray(batch.beforeJobs).length) {
            const jobMap = new Map(asArray(batch.beforeJobs).map(job => [job.id, job]));
            state.backfillJobs = asArray(state.backfillJobs).map(job => jobMap.get(job && job.id) || job);
        }
        if (asArray(batch.beforeEvents).length) {
            const eventMap = new Map(asArray(batch.beforeEvents).map(event => [event.id, event]));
            state.events = asArray(state.events).map(event => eventMap.get(event && event.id) || event);
        }
        state.historyFactBackfillRuns = asArray(state.historyFactBackfillRuns).map(run => run && run.id === batch.historyFactRunId ? Object.assign({}, run, { status: 'rolled-back', rolledBackAt: nowIso() }) : run);
        state.backfillRuns = asArray(state.backfillRuns).map(run => run && run.id === batch.historyFactRunId ? Object.assign({}, run, { status: 'rolled-back', rolledBackAt: nowIso() }) : run);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', rolledBackAt: nowIso() }) : item);
        state.lastBackfillRun = asArray(state.backfillRuns).find(run => run && run.status === 'completed') || null;
        state.updatedAt = nowIso();
        saveRootState();
        return clone({ ok: true, factCount: factIds.size, eventCount: asArray(batch.eventIds).length, jobCount: asArray(batch.jobIds).length, batchId: batch.id });
    }
    function listHistoryFactRuns(options = {}) { return asArray(ensureState(options).historyFactBackfillRuns).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || ''))).map(clone); }
    function getRoutingReport() { return { owner: 'platform/memoryBrain/historyFactBackfillStore', release: 'v0.4.4', factBackfillWrite: 'memoryBrain.facts + backfillJobs + events + backfillRuns + batches(kind=history-fact-backfill)', noLegacyMutation: true, formalPromptInjection: false }; }

    platform.historyFactBackfillStore = { selectHistoryFactBackfillWork, appendHistoryFactBackfillBatch, rollbackHistoryFactBackfillBatch, listHistoryFactRuns, getRoutingReport };
})(window);
