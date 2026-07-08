// --- Memory Brain review inbox store owner (v0.5.0) ---
// 负责 reviewInboxItems / reviewInboxRuns / memory-review-inbox batch 写入和回滚；不跑 AI，不改旧记忆。
(function registerMemoryReviewInboxStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryReviewInboxStore] memoryBrainStore 尚未加载');

    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function ensure(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function save() { return platform.memoryBrainStore.saveRootState ? platform.memoryBrainStore.saveRootState() : Promise.resolve(false); }
    function semantics() {
        const api = app.core && app.core.memoryBrain && app.core.memoryBrain.reviewInboxSemantics;
        if (!api || typeof api.buildReviewInboxPlan !== 'function') throw new Error('[memoryReviewInboxStore] reviewInboxSemantics 尚未加载');
        return api;
    }

    function buildReviewInboxPlan(options = {}) {
        const state = ensure(options);
        return semantics().buildReviewInboxPlan(state, options || {});
    }

    function applyReviewInboxPlan(plan = {}, options = {}) {
        const state = ensure(options);
        const createdAt = nowIso();
        const runId = options.runId || nextId('review-inbox-run');
        const batchId = options.batchId || nextId('review-inbox-batch');
        const plannedItems = asArray(plan.items).map(item => Object.assign({
            id: item.id || nextId('review-item'),
            kind: 'review-inbox-item',
            status: item.status || 'open',
            createdAt,
            updatedAt: createdAt,
            batchId,
            runId,
            mode: state.settings && state.settings.mode || 'shadow'
        }, clone(item), { batchId, runId, updatedAt: createdAt }));
        const beforeItems = asArray(state.reviewInboxItems).filter(existing => plannedItems.some(item => item && existing && item.id === existing.id));
        const plannedIds = new Set(plannedItems.map(item => item && item.id));
        state.reviewInboxItems = plannedItems.concat(asArray(state.reviewInboxItems).filter(item => item && !plannedIds.has(item.id)));
        const counts = plannedItems.reduce((acc, item) => {
            if (item.status === 'dismissed') acc.dismissed += 1;
            else if (item.status === 'confirmed') acc.confirmed += 1;
            else acc.open += 1;
            if (item.severity === 'high') acc.high += 1;
            else if (item.severity === 'low') acc.low += 1;
            else acc.medium += 1;
            return acc;
        }, { open: 0, dismissed: 0, confirmed: 0, high: 0, medium: 0, low: 0 });
        const run = {
            id: runId,
            kind: 'memory-review-inbox',
            status: 'applied',
            createdAt,
            updatedAt: createdAt,
            itemCount: plannedItems.length,
            openCount: counts.open,
            highCount: counts.high,
            mediumCount: counts.medium,
            lowCount: counts.low,
            thresholds: clone(plan.thresholds || {}),
            formalPromptInjection: false,
            writesLegacyMemory: false
        };
        const batch = {
            id: batchId,
            kind: 'memory-review-inbox',
            status: 'applied',
            createdAt,
            updatedAt: createdAt,
            runId,
            itemIds: plannedItems.map(item => item.id),
            beforeItems: clone(beforeItems),
            planSummary: { itemCount: plannedItems.length, openCount: counts.open, highCount: counts.high, mediumCount: counts.medium, lowCount: counts.low },
            formalPromptInjection: false,
            writesLegacyMemory: false
        };
        state.reviewInboxRuns = [run].concat(asArray(state.reviewInboxRuns).filter(item => item && item.id !== run.id));
        state.lastReviewInboxRun = run;
        state.batches = [batch].concat(asArray(state.batches).filter(item => item && item.id !== batch.id));
        state.updatedAt = createdAt;
        save();
        return clone({ run, batch, items: plannedItems, counts });
    }

    function rollbackReviewInboxBatch(batchId, options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'memory-review-inbox');
        if (!batch) throw new Error('找不到可撤回的记忆审查收件箱批次');
        const now = nowIso();
        const itemIds = new Set(asArray(batch.itemIds));
        const beforeById = new Map(asArray(batch.beforeItems).map(item => [item && item.id, item]).filter(pair => pair[0]));
        const restored = [];
        state.reviewInboxItems = asArray(state.reviewInboxItems).filter(item => {
            if (!item || !itemIds.has(item.id)) return true;
            const before = beforeById.get(item.id);
            if (before) restored.push(before);
            return false;
        }).concat(restored);
        state.reviewInboxRuns = asArray(state.reviewInboxRuns).map(run => run && run.id === batch.runId ? Object.assign({}, run, { status: 'rolled-back', updatedAt: now }) : run);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.lastReviewInboxRun = state.reviewInboxRuns[0] || null;
        state.updatedAt = now;
        save();
        return clone({ ok: true, batchId: batch.id, removedItemCount: itemIds.size, restoredItemCount: restored.length });
    }

    function updateReviewItemStatus(itemId, status, options = {}) {
        const state = ensure(options);
        const allowed = ['open', 'confirmed', 'dismissed', 'needs-edit'];
        if (!allowed.includes(status)) throw new Error('不支持的审查状态：' + status);
        let changed = null;
        const now = nowIso();
        state.reviewInboxItems = asArray(state.reviewInboxItems).map(item => {
            if (!item || item.id !== itemId) return item;
            changed = Object.assign({}, item, { status, updatedAt: now, resolvedAt: status === 'open' ? '' : now, action: options.action || status, reviewNote: options.reviewNote || item.reviewNote || '' });
            return changed;
        });
        if (!changed) throw new Error('找不到审查项：' + itemId);
        state.updatedAt = now;
        save();
        return clone(changed);
    }

    function getReviewInboxSnapshot(options = {}) {
        const state = ensure(options);
        return clone({
            reviewInboxItems: asArray(state.reviewInboxItems),
            reviewInboxRuns: asArray(state.reviewInboxRuns).slice(0, 20),
            batches: asArray(state.batches).filter(batch => batch && batch.kind === 'memory-review-inbox').slice(0, 20),
            lastReviewInboxRun: state.lastReviewInboxRun || null
        });
    }

    function getRoutingReport() {
        return { owner: 'platform/memoryBrain/memoryReviewInboxStore', release: 'v0.5.0', writes: ['memoryBrain.reviewInboxItems', 'memoryBrain.reviewInboxRuns', 'memoryBrain.lastReviewInboxRun', 'memoryBrain.batches(kind=memory-review-inbox)'], formalPromptInjection: false, writesLegacyMemory: false };
    }

    platform.memoryReviewInboxStore = { buildReviewInboxPlan, applyReviewInboxPlan, rollbackReviewInboxBatch, updateReviewItemStatus, getReviewInboxSnapshot, getRoutingReport };
})(window);
