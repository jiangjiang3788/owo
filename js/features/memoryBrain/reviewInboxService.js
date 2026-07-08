// --- Memory Brain review inbox service owner (v0.5.0) ---
// 编排记忆审查收件箱生成、撤回和状态操作；不正式注入 prompt，不写旧记忆。
(function registerReviewInboxService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function api() { return app.platform.memoryBrain.publicApi; }
    function core() { return app.core && app.core.memoryBrain && app.core.memoryBrain.reviewInboxSemantics; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function formatNumber(value) { return (Number(value) || 0).toLocaleString('zh-CN'); }
    function recordOperation(label, data, level) {
        const trace = app.platform.observability && app.platform.observability.operationTraceService;
        if (trace && typeof trace.recordOperation === 'function') return trace.recordOperation({ source: 'features/memoryBrain/reviewInboxService', sourceModule: 'features/memoryBrain/reviewInboxService', label, level: level || 'event', data: data || {} });
        return null;
    }

    function buildReviewInbox(options = {}) {
        const lowConfidenceThreshold = Number(options.lowConfidenceThreshold) || 0.58;
        recordOperation('记忆审查收件箱输入', { lowConfidenceThreshold, formalPromptInjection: false, writesLegacyMemory: false });
        const plan = api().buildReviewInboxPlan({ lowConfidenceThreshold, lowModelConfidenceThreshold: options.lowModelConfidenceThreshold || 0.64, state: options.state });
        recordOperation('记忆审查收件箱计划', { itemCount: plan.itemCount, openCount: plan.openCount, counts: plan.counts, formalPromptInjection: false }, plan.itemCount ? 'success' : 'event');
        const stored = api().applyReviewInboxPlan(plan, { state: options.state });
        recordOperation('记忆审查收件箱应用结果', { runId: stored.run && stored.run.id, batchId: stored.batch && stored.batch.id, itemCount: asArray(stored.items).length, openCount: stored.counts && stored.counts.open, formalPromptInjection: false }, 'success');
        return stored;
    }

    function rollbackLatestReviewInboxBatch(options = {}) {
        const snapshot = api().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'memory-review-inbox' && item.status === 'applied');
        if (!batch) throw new Error('没有可撤回的记忆审查收件箱批次');
        const result = api().rollbackReviewInboxBatch(batch.id, options);
        recordOperation('记忆审查收件箱批次回滚', { batchId: batch.id, result });
        return result;
    }

    function updateReviewItemStatus(itemId, status, options = {}) {
        const result = api().updateReviewItemStatus(itemId, status, options);
        recordOperation('记忆审查项状态更新', { itemId, status, targetType: result.targetType, targetId: result.targetId, formalPromptInjection: false });
        return result;
    }

    function getReviewInboxCards(options = {}) {
        const snapshot = api().getReviewInboxSnapshot(options);
        const semantics = core();
        const items = asArray(snapshot.reviewInboxItems).map(item => semantics.compactReviewInboxItemForList(item));
        const openItems = items.filter(item => item.status === 'open' || item.status === 'pending' || item.status === 'needs-review' || item.status === 'needs-edit');
        const resolvedItems = items.filter(item => !openItems.includes(item)).slice(0, 12);
        const counts = items.reduce((acc, item) => {
            if (item.status === 'dismissed') acc.dismissed += 1;
            else if (item.status === 'confirmed' || item.status === 'corrected') acc.confirmed += 1;
            else acc.open += 1;
            if (item.severity === 'high') acc.high += 1;
            else if (item.severity === 'low') acc.low += 1;
            else acc.medium += 1;
            acc.byIssue[item.issueType] = (acc.byIssue[item.issueType] || 0) + 1;
            return acc;
        }, { open: 0, confirmed: 0, dismissed: 0, high: 0, medium: 0, low: 0, byIssue: {} });
        const runs = asArray(snapshot.reviewInboxRuns).slice(0, 10).map(run => semantics.compactReviewInboxRunForList(run));
        const batches = asArray(snapshot.batches).slice(0, 8).map(batch => ({ id: batch.id, status: batch.status, createdAt: batch.createdAt, itemCount: asArray(batch.itemIds).length, runId: batch.runId }));
        return {
            totalText: { open: formatNumber(counts.open), confirmed: formatNumber(counts.confirmed), dismissed: formatNumber(counts.dismissed), high: formatNumber(counts.high), medium: formatNumber(counts.medium), low: formatNumber(counts.low), all: formatNumber(items.length) },
            counts,
            openItems: openItems.slice(0, 40),
            resolvedItems,
            runs,
            batches,
            nextVersion: 'v0.5.1：事实纠错 / 改写'
        };
    }

    feature.reviewInboxService = { buildReviewInbox, rollbackLatestReviewInboxBatch, updateReviewItemStatus, getReviewInboxCards, recordOperation };
})(window);
