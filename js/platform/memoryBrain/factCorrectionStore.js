// --- Memory Brain fact correction store owner (v0.5.1) ---
// 负责 fact 人工改写、版本记录和回滚；只写 memoryBrain，不写旧记忆，不接正式 prompt。
(function registerMemoryBrainFactCorrectionStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function ensure(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function save() { if (platform.memoryBrainStore.saveRootState) return platform.memoryBrainStore.saveRootState(); return Promise.resolve(false); }
    function core() { return app.core.memoryBrain.factCorrectionSemantics; }

    function buildFactCorrectionPlan(options = {}) {
        const state = ensure(options);
        return core().buildFactCorrectionPlan(state, options || {});
    }

    function applyFactCorrectionPlan(plan, options = {}) {
        const state = ensure(options);
        if (!plan || !plan.ok) throw new Error(plan && plan.errorMessage || '事实改写计划不可应用');
        const beforeFact = clone(plan.beforeFact || null);
        const afterFact = clone(plan.afterFact || null);
        if (!beforeFact || !afterFact || !afterFact.id) throw new Error('事实改写计划缺少 before/after fact');
        const now = nowIso();
        const batchId = options.batchId || nextId('memory-brain-batch');
        const runId = options.runId || nextId('fact-correction-run');
        const correctionId = options.correctionId || nextId('fact-correction');
        const reviewItemId = plan.reviewItemId || options.reviewItemId || '';
        const reviewItemBefore = reviewItemId ? clone(asArray(state.reviewInboxItems).find(item => item && item.id === reviewItemId) || null) : null;
        const changedFields = asArray(plan.changedFields);
        afterFact.updatedAt = now;
        afterFact.correctedAt = now;
        afterFact.correctionBatchId = batchId;
        afterFact.correctionRunId = runId;
        afterFact.correctionId = correctionId;
        afterFact.correctionHistory = asArray(beforeFact.correctionHistory).concat([{ correctionId, batchId, runId, version: plan.version || afterFact.correctionVersion || 1, correctedAt: now, changedFields, reason: plan.correctionReason || '人工改写事实' }]).slice(-20);
        let replaced = false;
        state.facts = asArray(state.facts).map(fact => {
            if (!fact || fact.id !== afterFact.id) return fact;
            replaced = true;
            return afterFact;
        });
        if (!replaced) state.facts.unshift(afterFact);
        if (reviewItemId) {
            state.reviewInboxItems = asArray(state.reviewInboxItems).map(item => {
                if (!item || item.id !== reviewItemId) return item;
                return Object.assign({}, item, { status: 'corrected', action: 'fact-corrected', resolvedAt: now, updatedAt: now, correctionId, correctionBatchId: batchId, reviewNote: plan.reviewNote || item.reviewNote || '' });
            });
        }
        const correction = { id: correctionId, kind: 'fact-correction', status: 'applied', factId: afterFact.id, reviewItemId, version: plan.version || afterFact.correctionVersion || 1, createdAt: now, updatedAt: now, changedFields, reason: plan.correctionReason || '人工改写事实', beforeContent: beforeFact.content || '', afterContent: afterFact.content || '', batchId, runId, formalPromptInjection: false, writesLegacyMemory: false };
        const run = { id: runId, kind: 'fact-correction', status: 'applied', factId: afterFact.id, reviewItemId, correctionId, batchId, version: correction.version, createdAt: now, updatedAt: now, changedFields, formalPromptInjection: false, writesLegacyMemory: false };
        const batch = { id: batchId, kind: 'fact-correction', status: 'applied', createdAt: now, updatedAt: now, factId: afterFact.id, reviewItemId, correctionId, runId, version: correction.version, changedFields, beforeFact, afterFact: clone(afterFact), reviewItemBefore, formalPromptInjection: false, writesLegacyMemory: false };
        state.factCorrections = [correction].concat(asArray(state.factCorrections).filter(item => item && item.id !== correction.id));
        state.factCorrectionRuns = [run].concat(asArray(state.factCorrectionRuns).filter(item => item && item.id !== run.id));
        state.lastFactCorrectionRun = run;
        state.batches = [batch].concat(asArray(state.batches).filter(item => item && item.id !== batch.id));
        state.updatedAt = now;
        save();
        return clone({ correction, run, batch, fact: afterFact, reviewItemBefore });
    }

    function rollbackFactCorrectionBatch(batchId, options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'fact-correction');
        if (!batch) throw new Error('找不到可撤回的事实改写批次');
        const now = nowIso();
        const beforeFact = clone(batch.beforeFact || null);
        if (beforeFact && beforeFact.id) {
            let restored = false;
            state.facts = asArray(state.facts).map(fact => {
                if (!fact || fact.id !== beforeFact.id) return fact;
                restored = true;
                return Object.assign({}, beforeFact, { updatedAt: now });
            });
            if (!restored) state.facts.unshift(Object.assign({}, beforeFact, { updatedAt: now }));
        }
        if (batch.reviewItemId) {
            const before = batch.reviewItemBefore;
            state.reviewInboxItems = asArray(state.reviewInboxItems).map(item => item && item.id === batch.reviewItemId ? (before || Object.assign({}, item, { status: 'needs-edit', updatedAt: now, resolvedAt: '' })) : item);
        }
        state.factCorrections = asArray(state.factCorrections).map(item => item && item.id === batch.correctionId ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.factCorrectionRuns = asArray(state.factCorrectionRuns).map(item => item && item.id === batch.runId ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.lastFactCorrectionRun = state.factCorrectionRuns[0] || null;
        state.updatedAt = now;
        save();
        return clone({ ok: true, batchId: batch.id, factId: batch.factId, correctionId: batch.correctionId });
    }

    function getFactCorrectionSnapshot(options = {}) {
        const state = ensure(options);
        return clone({
            facts: asArray(state.facts),
            reviewInboxItems: asArray(state.reviewInboxItems),
            factCorrections: asArray(state.factCorrections),
            factCorrectionRuns: asArray(state.factCorrectionRuns).slice(0, 20),
            batches: asArray(state.batches).filter(batch => batch && batch.kind === 'fact-correction').slice(0, 20),
            lastFactCorrectionRun: state.lastFactCorrectionRun || null
        });
    }

    function getRoutingReport() {
        return { owner: 'platform/memoryBrain/factCorrectionStore', release: 'v0.5.1', writes: ['memoryBrain.facts corrected fields', 'memoryBrain.factCorrections', 'memoryBrain.factCorrectionRuns', 'memoryBrain.batches(kind=fact-correction)', 'memoryBrain.reviewInboxItems status'], formalPromptInjection: false, writesLegacyMemory: false };
    }

    platform.factCorrectionStore = { buildFactCorrectionPlan, applyFactCorrectionPlan, rollbackFactCorrectionBatch, getFactCorrectionSnapshot, getRoutingReport };
})(window);
