// --- Memory Brain schedule store owner (v0.3.7) ---
// 保存调度/成本设置、维护计划、浮现衰减运行和回滚快照；只写 memoryBrain.scheduleQueue / schedulerRuns / batches。
(function registerMemoryBrainScheduleStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryScheduleStore] memoryBrainStore 尚未加载');

    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() { return typeof platform.memoryBrainStore.saveRootState === 'function' ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function safeClone(value) {
        if (value === undefined) return undefined;
        if (value === null) return null;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
        try { return JSON.parse(JSON.stringify(value)); } catch (error) { return String(value); }
    }
    function getCoreWeights() {
        const api = app.core && app.core.memoryBrain && app.core.memoryBrain.publicApi;
        if (!api || typeof api.normalizeSchedulerSettings !== 'function') throw new Error('[memoryScheduleStore] weightSemantics public API 尚未加载');
        return api;
    }
    function collectionByType(state, type) {
        const map = { event: 'events', fact: 'facts', family: 'families', edge: 'edges', model: 'models', injectionPreview: 'injectionPreviews' };
        return asArray(state[map[type]]);
    }
    function findItem(state, type, id) { return collectionByType(state, type).find(item => item && item.id === id) || null; }
    function normalizeQueueItems(items, runId, createdAt) {
        return asArray(items).map((item, index) => Object.assign({}, safeClone(item), {
            id: item.id || nextId('memory-schedule-item'),
            status: item.runnable === false ? 'queued-over-budget' : 'queued',
            runId,
            createdAt,
            updatedAt: createdAt,
            mode: 'shadow-queue'
        }));
    }
    function ensureSchedulerFields(state) {
        state.scheduleQueue = asArray(state.scheduleQueue);
        state.schedulerRuns = asArray(state.schedulerRuns);
        state.settings = Object.assign({}, state.settings || {}, { scheduler: getCoreWeights().normalizeSchedulerSettings(state.settings && state.settings.scheduler || {}) });
        return state.settings.scheduler;
    }
    function getSchedulerSnapshot(options = {}) {
        const state = ensureState(options);
        const scheduler = ensureSchedulerFields(state);
        return safeClone({ settings: scheduler, queue: state.scheduleQueue, runs: state.schedulerRuns });
    }
    function updateSchedulerSettings(settings = {}, options = {}) {
        const state = ensureState(options);
        const previous = safeClone(state.settings && state.settings.scheduler || {});
        const scheduler = getCoreWeights().normalizeSchedulerSettings(Object.assign({}, previous, settings));
        scheduler.lastUpdatedAt = nowIso();
        state.settings = Object.assign({}, state.settings || {}, { scheduler, costProfileId: scheduler.costProfileId, processingMode: scheduler.costProfileId });
        state.updatedAt = scheduler.lastUpdatedAt;
        saveRootState();
        return safeClone({ previous, settings: scheduler });
    }
    function appendMaintenancePlanBatch(payload = {}, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const runId = payload.runId || nextId('memory-schedule-run');
        const batchId = payload.batchId || nextId('memory-brain-batch');
        const scheduler = ensureSchedulerFields(state);
        const plan = safeClone(payload.plan || {});
        const queueItems = normalizeQueueItems(plan.queueItems || payload.queueItems, runId, createdAt);
        state.scheduleQueue = queueItems.concat(asArray(state.scheduleQueue).filter(item => item && item.status !== 'queued' && item.status !== 'queued-over-budget')).slice(0, 80);
        scheduler.lastPlanAt = createdAt;
        scheduler.nextSuggestedAt = payload.nextSuggestedAt || createdAt;
        const run = {
            id: runId,
            kind: 'memory-schedule-plan',
            status: 'applied',
            batchId,
            createdAt,
            updatedAt: createdAt,
            profileId: plan.profile && plan.profile.id || scheduler.costProfileId,
            estimatedCostUnits: Number(plan.estimatedCostUnits) || 0,
            dailyBudgetUnits: Number(plan.dailyBudgetUnits) || scheduler.dailyBudgetUnits,
            queueItemIds: queueItems.map(item => item.id),
            stats: safeClone(plan.stats || {}),
            policy: safeClone(plan.policy || {})
        };
        const batch = {
            id: batchId,
            kind: 'memory-schedule-plan',
            status: 'applied',
            createdAt,
            updatedAt: createdAt,
            mode: 'shadow',
            profileId: run.profileId,
            input: safeClone(payload.input || {}),
            plan: safeClone(plan),
            queueItemIds: run.queueItemIds,
            schedulerRunId: runId
        };
        state.schedulerRuns.unshift(run);
        state.schedulerRuns = state.schedulerRuns.slice(0, 80);
        state.batches = asArray(state.batches).filter(item => item && item.id !== batch.id);
        state.batches.unshift(batch);
        state.updatedAt = createdAt;
        saveRootState();
        return safeClone({ batch, run, queueItems, settings: scheduler });
    }
    function rememberBeforeItems(state, updates) {
        const before = {};
        asArray(updates).forEach(update => {
            const item = findItem(state, update.type, update.id);
            if (item) before[`${update.type}:${update.id}`] = {
                type: update.type,
                id: update.id,
                weight: item.weight,
                activation: item.activation,
                decay: item.decay,
                freshness: item.freshness,
                lastWeightAt: item.lastWeightAt,
                weightProfileId: item.weightProfileId,
                weightReason: safeClone(item.weightReason)
            };
        });
        return before;
    }
    function applyUpdates(state, updates) {
        let changed = 0;
        asArray(updates).forEach(update => {
            const item = findItem(state, update.type, update.id);
            if (!item) return;
            Object.assign(item, safeClone(update.after || {}));
            item.updatedAt = item.updatedAt || update.after && update.after.lastWeightAt;
            changed += 1;
        });
        return changed;
    }
    function appendMaintenanceCycleBatch(payload = {}, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const runId = payload.runId || nextId('memory-schedule-run');
        const batchId = payload.batchId || nextId('memory-brain-batch');
        const scheduler = ensureSchedulerFields(state);
        const pass = safeClone(payload.pass || {});
        const updates = asArray(pass.updates || payload.updates);
        const beforeItems = rememberBeforeItems(state, updates);
        const changedCount = applyUpdates(state, updates);
        scheduler.lastMaintenanceAt = createdAt;
        const run = {
            id: runId,
            kind: 'memory-maintenance',
            status: changedCount ? 'applied' : 'skipped',
            batchId,
            createdAt,
            updatedAt: createdAt,
            profileId: pass.profileId || scheduler.costProfileId,
            updateCount: changedCount,
            floating: safeClone(pass.floating || []),
            costUnits: 0,
            policy: { previewOnly: true, formalPromptInjection: false, noLegacyWrite: true }
        };
        const batch = {
            id: batchId,
            kind: 'memory-maintenance',
            status: changedCount ? 'applied' : 'skipped',
            createdAt,
            updatedAt: createdAt,
            mode: 'shadow',
            profileId: run.profileId,
            input: safeClone(payload.input || {}),
            updateCount: changedCount,
            updates: safeClone(updates.slice(0, 500)),
            floating: safeClone(pass.floating || []),
            beforeItems,
            schedulerRunId: runId,
            policy: run.policy
        };
        state.schedulerRuns.unshift(run);
        state.schedulerRuns = state.schedulerRuns.slice(0, 80);
        state.batches = asArray(state.batches).filter(item => item && item.id !== batch.id);
        state.batches.unshift(batch);
        asArray(state.scheduleQueue).forEach(item => { if (item && item.kind === 'weight-maintenance' && item.status === 'queued') { item.status = 'applied'; item.updatedAt = createdAt; item.appliedRunId = runId; } });
        state.updatedAt = createdAt;
        saveRootState();
        return safeClone({ batch, run, changedCount, floating: pass.floating || [] });
    }
    function rollbackMaintenanceBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId);
        if (!batch || batch.kind !== 'memory-maintenance') return { ok: false, reason: 'batch_not_found_or_not_memory_maintenance' };
        const updatedAt = nowIso();
        Object.keys(batch.beforeItems || {}).forEach(key => {
            const before = batch.beforeItems[key];
            const item = before && findItem(state, before.type, before.id);
            if (!item) return;
            ['weight', 'activation', 'decay', 'freshness', 'lastWeightAt', 'weightProfileId', 'weightReason'].forEach(field => {
                if (Object.prototype.hasOwnProperty.call(before, field)) item[field] = safeClone(before[field]);
                else delete item[field];
            });
            item.updatedAt = updatedAt;
        });
        const run = asArray(state.schedulerRuns).find(item => item && item.id === batch.schedulerRunId);
        if (run) { run.status = 'rolled-back'; run.rollbackAt = updatedAt; run.updatedAt = updatedAt; }
        batch.status = 'rolled-back';
        batch.rollbackAt = updatedAt;
        batch.updatedAt = updatedAt;
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: true, batchId, restoredCount: Object.keys(batch.beforeItems || {}).length };
    }
    function listSchedulerRuns(options = {}) {
        const state = ensureState(options);
        ensureSchedulerFields(state);
        return asArray(state.schedulerRuns).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }
    function listScheduleQueue(options = {}) {
        const state = ensureState(options);
        ensureSchedulerFields(state);
        return asArray(state.scheduleQueue).slice();
    }
    function getRoutingReport() {
        return {
            owner: 'platform/memoryBrain/memoryScheduleStore',
            release: 'v0.3.7',
            scheduleWrite: 'memoryBrain.scheduleQueue + memoryBrain.schedulerRuns + memoryBrain.batches only',
            maintenanceWrite: 'weight/activation/decay fields on memoryBrain items only',
            formalPromptInjection: false,
            legacyMode: 'read-only-source',
            noDualWrite: true,
            noBackgroundPromise: true
        };
    }

    platform.memoryScheduleStore = { getSchedulerSnapshot, updateSchedulerSettings, appendMaintenancePlanBatch, appendMaintenanceCycleBatch, rollbackMaintenanceBatch, listSchedulerRuns, listScheduleQueue, getRoutingReport };
})(window);
