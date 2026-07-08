// --- Memory Brain trust score store owner (v0.5.6) ---
// 写入 trustScoreRecords / trustScoreRuns / memory-trust-score batch；不写旧记忆，不接正式 prompt。
(function registerMemoryTrustScoreStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    function store() { return platform.memoryBrainStore; }
    function core() { return app.core.memoryBrain.trustScoreSemantics; }
    function ensure(options) { return store().ensureState(options || {}); }
    function save() { return store().saveRootState(); }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function getList(state, type) { return type === 'fact' ? state.facts : type === 'family' ? state.families : type === 'edge' ? state.edges : type === 'model' ? state.models : []; }
    function setList(state, type, list) { if (type === 'fact') state.facts = list; else if (type === 'family') state.families = list; else if (type === 'edge') state.edges = list; else if (type === 'model') state.models = list; }
    function buildMemoryTrustScorePlan(options = {}) { return core().buildMemoryTrustScorePlan(ensure(options), options || {}); }
    function beforeFor(state, records) {
        const grouped = { facts: [], families: [], edges: [], models: [] };
        records.forEach(record => {
            const list = getList(state, record.targetType);
            const found = asArray(list).find(item => item && item.id === record.targetId);
            if (!found) return;
            if (record.targetType === 'fact') grouped.facts.push(clone(found));
            if (record.targetType === 'family') grouped.families.push(clone(found));
            if (record.targetType === 'edge') grouped.edges.push(clone(found));
            if (record.targetType === 'model') grouped.models.push(clone(found));
        });
        return grouped;
    }
    function applyMemoryTrustScorePlan(plan, options = {}) {
        if (!plan || !plan.ok) throw new Error(plan && plan.errorMessage || '信任分计划不可应用');
        const state = ensure(options);
        const now = nowIso();
        const runId = nextId('memory-trust-run');
        const batchId = nextId('memory-trust-batch');
        const before = beforeFor(state, plan.records || []);
        const records = asArray(plan.records).map((record, index) => Object.assign({}, clone(record), { id: nextId('memory-trust'), index, runId, batchId, status: 'active', createdAt: now, updatedAt: now }));
        records.forEach(record => {
            const list = asArray(getList(state, record.targetType)).map(item => item && item.id === record.targetId ? Object.assign({}, item, { trustScore: record.score, trustLevel: record.level, trustReasons: record.reasons, trustUpdatedAt: now, trustRunId: runId, trustBatchId: batchId }) : item);
            setList(state, record.targetType, list);
        });
        const stats = plan.stats || core().summarizeTrustRecords(records);
        const run = { id: runId, kind: 'memory-trust-score', status: 'applied', createdAt: now, updatedAt: now, totalCount: records.length, averageScore: stats.averageScore || 0, lowCount: stats.lowCount || 0, byType: stats.byType || {}, byLevel: stats.byLevel || {}, formalPromptInjection: false, writesLegacyMemory: false };
        const batch = { id: batchId, kind: 'memory-trust-score', status: 'applied', createdAt: now, updatedAt: now, runId, recordIds: records.map(record => record.id), totalCount: records.length, averageScore: run.averageScore, lowCount: run.lowCount, before, stats, formalPromptInjection: false, writesLegacyMemory: false };
        state.trustScoreRecords = records.concat(asArray(state.trustScoreRecords)).slice(0, 5000);
        state.trustScoreRuns = [run].concat(asArray(state.trustScoreRuns));
        state.lastTrustScoreRun = run;
        state.batches = [batch].concat(asArray(state.batches));
        state.updatedAt = now;
        save();
        return clone({ records, run, batch, stats });
    }
    function restoreList(list, beforeItems) {
        const beforeMap = new Map(asArray(beforeItems).map(item => [item && item.id, item]).filter(pair => pair[0]));
        const seen = new Set();
        const restored = asArray(list).map(item => {
            if (!item || !beforeMap.has(item.id)) return item;
            seen.add(item.id);
            return clone(beforeMap.get(item.id));
        });
        beforeMap.forEach((item, id) => { if (!seen.has(id)) restored.unshift(clone(item)); });
        return restored;
    }
    function rollbackMemoryTrustScoreBatch(batchId, options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'memory-trust-score');
        if (!batch) throw new Error('找不到可撤回的记忆信任分批次');
        const now = nowIso();
        const before = batch.before || {};
        state.facts = restoreList(state.facts, before.facts);
        state.families = restoreList(state.families, before.families);
        state.edges = restoreList(state.edges, before.edges);
        state.models = restoreList(state.models, before.models);
        const recordIdSet = new Set(asArray(batch.recordIds));
        state.trustScoreRecords = asArray(state.trustScoreRecords).map(item => item && recordIdSet.has(item.id) ? Object.assign({}, item, { status: 'rolled-back', rollbackAt: now, updatedAt: now }) : item);
        state.trustScoreRuns = asArray(state.trustScoreRuns).map(item => item && item.id === batch.runId ? Object.assign({}, item, { status: 'rolled-back', rollbackAt: now, updatedAt: now }) : item);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', rollbackAt: now, updatedAt: now }) : item);
        state.lastTrustScoreRun = asArray(state.trustScoreRuns).find(item => item && item.status === 'applied') || null;
        state.updatedAt = now;
        save();
        return clone({ ok: true, batchId, runId: batch.runId, recordCount: asArray(batch.recordIds).length, averageScore: batch.averageScore || 0, lowCount: batch.lowCount || 0 });
    }
    function getMemoryTrustScoreSnapshot(options = {}) {
        const state = ensure(options);
        const plan = buildMemoryTrustScorePlan(options);
        return clone({ plan, trustScoreRecords: asArray(state.trustScoreRecords), trustScoreRuns: asArray(state.trustScoreRuns).slice(0, 20), batches: asArray(state.batches).filter(batch => batch && batch.kind === 'memory-trust-score').slice(0, 20), lastTrustScoreRun: state.lastTrustScoreRun || null });
    }
    function getRoutingReport() { return { owner: 'platform/memoryBrain/memoryTrustScoreStore', release: 'v0.5.6', writes: ['memoryBrain.trustScoreRecords', 'memoryBrain.trustScoreRuns', 'memoryBrain.batches(kind=memory-trust-score)', 'trustScore fields on facts/families/edges/models'], formalPromptInjection: false, writesLegacyMemory: false }; }
    platform.memoryTrustScoreStore = { buildMemoryTrustScorePlan, applyMemoryTrustScorePlan, rollbackMemoryTrustScoreBatch, getMemoryTrustScoreSnapshot, getRoutingReport };
})(window);
