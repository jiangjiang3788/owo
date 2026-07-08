// --- Memory Brain model correction store owner (v0.5.4) ---
// 负责长期模型人工修正、版本历史和回滚；只写 memoryBrain，不写旧记忆，不接正式 prompt。
(function registerMemoryBrainModelCorrectionStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function ensure(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function save() { if (platform.memoryBrainStore.saveRootState) return platform.memoryBrainStore.saveRootState(); return Promise.resolve(false); }
    function core() { return app.core.memoryBrain.modelCorrectionSemantics; }

    function buildModelCorrectionPlan(options = {}) {
        const state = ensure(options);
        return core().buildModelCorrectionPlan(state, options || {});
    }
    function applyModelCorrectionPlan(plan, options = {}) {
        const state = ensure(options);
        if (!plan || !plan.ok) throw new Error(plan && plan.errorMessage || '长期模型修正计划不可应用');
        const beforeModel = clone(plan.beforeModel || null);
        const afterModel = clone(plan.afterModel || null);
        if (!beforeModel || !beforeModel.id || !afterModel) throw new Error('长期模型修正计划缺少 before/after model');
        const now = nowIso();
        const batchId = options.batchId || nextId('memory-brain-batch');
        const runId = options.runId || nextId('model-correction-run');
        const correctionId = options.correctionId || nextId('model-correction');
        const newModelId = afterModel.id || options.newModelId || nextId('memory-model');
        const reviewItemId = plan.reviewItemId || options.reviewItemId || '';
        const reviewItemBefore = reviewItemId ? clone(asArray(state.reviewInboxItems).find(item => item && item.id === reviewItemId) || null) : null;
        const changedFields = asArray(plan.changedFields);
        afterModel.id = newModelId;
        afterModel.status = 'active';
        afterModel.updatedAt = now;
        afterModel.createdAt = now;
        afterModel.correctedAt = now;
        afterModel.batchId = batchId;
        afterModel.correctionBatchId = batchId;
        afterModel.correctionRunId = runId;
        afterModel.correctionId = correctionId;
        afterModel.correctionHistory = asArray(beforeModel.correctionHistory).concat([{ correctionId, batchId, runId, version: plan.version || afterModel.version || 1, reason: plan.correctionReason || '人工修正长期模型', changedFields, createdAt: now }]);
        let replaced = false;
        state.models = asArray(state.models).map(model => {
            if (!model || model.id !== beforeModel.id) return model;
            replaced = true;
            return Object.assign({}, model, { status: 'superseded', supersededAt: now, updatedAt: now, nextModelId: newModelId, nextModelBatchId: batchId, reviewStatus: 'superseded-by-manual-correction' });
        });
        if (!replaced) state.models.unshift(Object.assign({}, beforeModel, { status: 'superseded', supersededAt: now, updatedAt: now, nextModelId: newModelId, nextModelBatchId: batchId }));
        state.models.unshift(afterModel);
        if (reviewItemId) {
            state.reviewInboxItems = asArray(state.reviewInboxItems).map(item => {
                if (!item || item.id !== reviewItemId) return item;
                return Object.assign({}, item, { status: 'corrected', resolvedAt: now, updatedAt: now, resolvedBy: 'model-correction', correctionId, correctionBatchId: batchId, reviewNote: plan.reviewNote || item.reviewNote || '' });
            });
        }
        const correction = { id: correctionId, kind: 'model-correction', status: 'applied', modelId: beforeModel.id, newModelId, modelType: afterModel.type, reviewItemId, version: plan.version || afterModel.version || 1, createdAt: now, updatedAt: now, changedFields, reason: plan.correctionReason || '人工修正长期模型', beforeTitle: beforeModel.title || '', afterTitle: afterModel.title || '', batchId, runId, formalPromptInjection: false, writesLegacyMemory: false };
        const run = { id: runId, kind: 'model-correction', status: 'applied', modelId: beforeModel.id, newModelId, modelType: afterModel.type, reviewItemId, correctionId, batchId, version: correction.version, createdAt: now, updatedAt: now, changedFields, formalPromptInjection: false, writesLegacyMemory: false };
        const batch = { id: batchId, kind: 'model-correction', status: 'applied', createdAt: now, updatedAt: now, modelId: beforeModel.id, newModelId, modelType: afterModel.type, reviewItemId, correctionId, runId, version: correction.version, changedFields, beforeModel, afterModel: clone(afterModel), reviewItemBefore, formalPromptInjection: false, writesLegacyMemory: false };
        state.modelCorrections = [correction].concat(asArray(state.modelCorrections).filter(item => item && item.id !== correction.id));
        state.modelCorrectionRuns = [run].concat(asArray(state.modelCorrectionRuns).filter(item => item && item.id !== run.id));
        state.lastModelCorrectionRun = run;
        state.batches = [batch].concat(asArray(state.batches).filter(item => item && item.id !== batch.id));
        state.updatedAt = now;
        save();
        return clone({ correction, run, batch, model: afterModel, reviewItemBefore });
    }
    function rollbackModelCorrectionBatch(batchId, options = {}) {
        const state = ensure(options);
        const batch = asArray(state.batches).find(item => item && item.id === batchId && item.kind === 'model-correction');
        if (!batch) throw new Error('找不到可撤回的长期模型修正批次');
        const now = nowIso();
        const beforeModel = clone(batch.beforeModel || null);
        const newModelId = batch.newModelId;
        state.models = asArray(state.models).map(model => {
            if (!model) return model;
            if (model.id === newModelId) return Object.assign({}, model, { status: 'retired', retiredAt: now, updatedAt: now, reviewStatus: 'manual-correction-rolled-back' });
            if (beforeModel && model.id === beforeModel.id) return Object.assign({}, beforeModel, { status: 'active', restoredAt: now, updatedAt: now });
            return model;
        });
        if (beforeModel && !asArray(state.models).some(model => model && model.id === beforeModel.id)) state.models.unshift(Object.assign({}, beforeModel, { status: 'active', restoredAt: now, updatedAt: now }));
        if (batch.reviewItemId) {
            const before = batch.reviewItemBefore;
            state.reviewInboxItems = asArray(state.reviewInboxItems).map(item => item && item.id === batch.reviewItemId ? (before || Object.assign({}, item, { status: 'needs-edit', updatedAt: now, resolvedAt: '' })) : item);
        }
        state.modelCorrections = asArray(state.modelCorrections).map(item => item && item.id === batch.correctionId ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.modelCorrectionRuns = asArray(state.modelCorrectionRuns).map(item => item && item.id === batch.runId ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.batches = asArray(state.batches).map(item => item && item.id === batch.id ? Object.assign({}, item, { status: 'rolled-back', updatedAt: now }) : item);
        state.lastModelCorrectionRun = state.modelCorrectionRuns[0] || null;
        state.updatedAt = now;
        save();
        return clone({ ok: true, batchId: batch.id, modelId: batch.modelId, newModelId, correctionId: batch.correctionId });
    }
    function getModelCorrectionSnapshot(options = {}) {
        const state = ensure(options);
        return clone({
            models: asArray(state.models),
            reviewInboxItems: asArray(state.reviewInboxItems),
            modelCorrections: asArray(state.modelCorrections),
            modelCorrectionRuns: asArray(state.modelCorrectionRuns).slice(0, 20),
            batches: asArray(state.batches).filter(batch => batch && batch.kind === 'model-correction').slice(0, 20),
            lastModelCorrectionRun: state.lastModelCorrectionRun || null
        });
    }
    function getRoutingReport() {
        return { owner: 'platform/memoryBrain/modelCorrectionStore', release: 'v0.5.4', writes: ['memoryBrain.models versioned correction', 'memoryBrain.modelCorrections', 'memoryBrain.modelCorrectionRuns', 'memoryBrain.batches(kind=model-correction)', 'memoryBrain.reviewInboxItems status'], formalPromptInjection: false, writesLegacyMemory: false };
    }
    platform.modelCorrectionStore = { buildModelCorrectionPlan, applyModelCorrectionPlan, rollbackModelCorrectionBatch, getModelCorrectionSnapshot, getRoutingReport };
})(window);
