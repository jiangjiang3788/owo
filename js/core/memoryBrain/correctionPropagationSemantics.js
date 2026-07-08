// --- Memory Brain correction propagation semantics owner (v0.5.5) ---
// 纯计算：根据事实/冲突/家族/模型修正生成影响传播计划；不访问 DOM、网络、platform 或 features。
(function registerMemoryBrainCorrectionPropagationSemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function asArray(value) {
        if (Array.isArray(value)) return value;
        return asText(value).split(/[，,、;；\n]+/).map(asText).filter(Boolean);
    }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function unique(list, max) {
        const seen = new Set();
        return asArray(list).map(asText).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key); return true;
        }).slice(0, max || 5000);
    }
    function clampText(value, max) { const text = asText(value); return text.length > max ? text.slice(0, max - 1) + '…' : text; }
    function isApplied(item) { return item && asText(item.status || 'applied') === 'applied' && !item.propagatedAt; }
    function isActive(item) { return item && !['retired', 'obsolete', 'duplicate'].includes(asText(item.status).toLowerCase()); }
    function idSet(list) { return new Set(unique(list)); }
    function byId(list) { return new Map(asArray(list).filter(item => item && item.id).map(item => [item.id, item])); }

    function parseIds(value) { return unique(asArray(value).concat(asText(value).split(/[，,、;；\n]+/)), 1000); }

    function collectPendingSources(snapshot, input = {}) {
        const factCorrections = asArray(snapshot && snapshot.factCorrections).filter(isApplied);
        const conflictResolutions = asArray(snapshot && snapshot.factConflictResolutions).filter(isApplied);
        const familyAdjustments = asArray(snapshot && snapshot.familyAdjustments).filter(isApplied);
        const modelCorrections = asArray(snapshot && snapshot.modelCorrections).filter(isApplied);
        const manual = {
            factIds: parseIds(input.factIds),
            familyIds: parseIds(input.familyIds),
            edgeIds: parseIds(input.edgeIds),
            modelIds: parseIds(input.modelIds),
            reviewItemIds: parseIds(input.reviewItemIds)
        };
        return { factCorrections, conflictResolutions, familyAdjustments, modelCorrections, manual };
    }

    function collectImpact(snapshot, sources, input = {}) {
        const facts = asArray(snapshot && snapshot.facts);
        const families = asArray(snapshot && snapshot.families);
        const edges = asArray(snapshot && snapshot.edges);
        const models = asArray(snapshot && snapshot.models);
        const reviewItems = asArray(snapshot && snapshot.reviewInboxItems);
        const factMap = byId(facts), familyMap = byId(families), edgeMap = byId(edges), modelMap = byId(models);
        let factIds = [];
        let familyIds = [];
        let edgeIds = [];
        let modelIds = [];
        let reviewItemIds = [];

        sources.factCorrections.forEach(item => { factIds.push(item.factId); reviewItemIds.push(item.reviewItemId); });
        sources.conflictResolutions.forEach(item => { factIds = factIds.concat(item.factIds); });
        sources.familyAdjustments.forEach(item => { familyIds = familyIds.concat(item.familyIds); factIds = factIds.concat(item.factIds); });
        sources.modelCorrections.forEach(item => { modelIds.push(item.modelId, item.newModelId); reviewItemIds.push(item.reviewItemId); });
        factIds = factIds.concat(sources.manual.factIds);
        familyIds = familyIds.concat(sources.manual.familyIds);
        edgeIds = edgeIds.concat(sources.manual.edgeIds);
        modelIds = modelIds.concat(sources.manual.modelIds);
        reviewItemIds = reviewItemIds.concat(sources.manual.reviewItemIds);

        unique(factIds).forEach(factId => {
            const fact = factMap.get(factId);
            if (fact) familyIds = familyIds.concat(asArray(fact.familyIds));
        });
        const factIdSet = idSet(factIds);
        const familyIdSet = idSet(familyIds);
        edges.forEach(edge => {
            if (!edge || asText(edge.status) === 'retired') return;
            const relatedFactIds = unique([edge.factId, edge.sourceFactId, edge.targetFactId].concat(edge.factIds, edge.evidenceFactIds));
            const relatedFamilyIds = unique([edge.familyId, edge.sourceFamilyId, edge.targetFamilyId].concat(edge.familyIds));
            if (relatedFactIds.some(id => factIdSet.has(id)) || relatedFamilyIds.some(id => familyIdSet.has(id))) edgeIds.push(edge.id);
        });
        familyIds = familyIds.concat(edges.filter(edge => edge && edgeIds.includes(edge.id)).flatMap(edge => [edge.familyId, edge.sourceFamilyId, edge.targetFamilyId].concat(edge.familyIds)));
        const affectedFamilyIdSet = idSet(familyIds);
        models.forEach(model => {
            if (!model || asText(model.status) !== 'active') return;
            const evidenceFactIds = unique(asArray(model.factIds).concat(asArray(model.evidenceFactIds), asArray(model.sourceFactIds)));
            const evidenceFamilyIds = unique(asArray(model.familyIds).concat(asArray(model.evidenceFamilyIds), asArray(model.sourceFamilyIds)));
            const evidenceEdgeIds = unique(asArray(model.edgeIds).concat(asArray(model.evidenceEdgeIds), asArray(model.sourceEdgeIds)));
            const linked = evidenceFactIds.some(id => factIdSet.has(id)) || evidenceFamilyIds.some(id => affectedFamilyIdSet.has(id)) || evidenceEdgeIds.some(id => edgeIds.includes(id));
            if (linked || (input.touchActiveModels && (factIdSet.size || affectedFamilyIdSet.size))) modelIds.push(model.id);
        });
        reviewItems.forEach(item => {
            if (!item || ['dismissed', 'confirmed', 'propagated'].includes(asText(item.status))) return;
            const targetId = asText(item.targetId);
            if (factIdSet.has(targetId) || affectedFamilyIdSet.has(targetId) || edgeIds.includes(targetId) || modelIds.includes(targetId)) reviewItemIds.push(item.id);
        });
        return {
            factIds: unique(factIds).filter(id => factMap.has(id)),
            familyIds: unique(familyIds).filter(id => familyMap.has(id)),
            edgeIds: unique(edgeIds).filter(id => edgeMap.has(id)),
            modelIds: unique(modelIds).filter(id => modelMap.has(id)),
            reviewItemIds: unique(reviewItemIds).filter(Boolean),
            sourceIds: {
                factCorrectionIds: sources.factCorrections.map(item => item.id),
                conflictResolutionIds: sources.conflictResolutions.map(item => item.id),
                familyAdjustmentIds: sources.familyAdjustments.map(item => item.id),
                modelCorrectionIds: sources.modelCorrections.map(item => item.id)
            }
        };
    }

    function makeUpdates(snapshot, impact, reason) {
        const facts = byId(snapshot && snapshot.facts);
        const families = byId(snapshot && snapshot.families);
        const edges = byId(snapshot && snapshot.edges);
        const models = byId(snapshot && snapshot.models);
        const reviewItems = byId(snapshot && snapshot.reviewInboxItems);
        const factUpdates = impact.factIds.map(id => ({ id, propagationStatus: 'propagated', propagationNeedsReview: false, propagationReason: reason }));
        const familyUpdates = impact.familyIds.map(id => {
            const family = families.get(id) || {};
            const affectedFactIds = unique(asArray(family.factIds).filter(factId => impact.factIds.includes(factId)), 500);
            return { id, propagationStatus: affectedFactIds.length ? 'summary-stale-after-correction' : 'structure-reviewed', needsSummaryRefresh: !!affectedFactIds.length, affectedFactIds, propagationReason: reason };
        });
        const edgeUpdates = impact.edgeIds.map(id => ({ id, propagationStatus: 'needs-review-after-correction', validationStatus: 'needs-review', affectedFactIds: impact.factIds.slice(0, 80), affectedFamilyIds: impact.familyIds.slice(0, 80), propagationReason: reason }));
        const modelUpdates = impact.modelIds.map(id => {
            const model = models.get(id) || {};
            return { id, propagationStatus: 'stale-after-memory-correction', reviewStatus: 'needs-rebuild-after-correction', needsRebuildReason: reason, sourceStale: true, modelType: model.type || '' };
        });
        const reviewItemUpdates = impact.reviewItemIds.map(id => {
            const item = reviewItems.get(id) || {};
            return { id, status: asText(item.status) === 'needs-edit' ? 'needs-edit' : 'propagated', propagationStatus: 'downstream-updated', propagationReason: reason };
        });
        return { factUpdates, familyUpdates, edgeUpdates, modelUpdates, reviewItemUpdates };
    }

    function buildCorrectionPropagationPlan(snapshot, input = {}) {
        const sources = collectPendingSources(snapshot, input);
        const impact = collectImpact(snapshot, sources, input);
        const hasSources = Object.values(impact.sourceIds).some(list => list.length);
        const hasManual = impact.factIds.length || impact.familyIds.length || impact.edgeIds.length || impact.modelIds.length || impact.reviewItemIds.length;
        if (!hasSources && !hasManual) return { ok: false, status: 'nothing-to-propagate', errorMessage: '没有找到需要传播的纠错影响', plan: null };
        const reason = clampText(input.reason || '纠错影响传播：刷新受影响 family / graph / model / review 状态', 420);
        const updates = makeUpdates(snapshot || {}, impact, reason);
        return Object.assign({ ok: true, status: 'ready', reason, impact, sources, formalPromptInjection: false, writesLegacyMemory: false }, updates);
    }

    function compactPropagationRunForList(run) {
        return { id: run && run.id || '', status: run && run.status || '', impactText: `${run && run.factCount || 0} facts / ${run && run.familyCount || 0} families / ${run && run.edgeCount || 0} edges / ${run && run.modelCount || 0} models`, reason: clampText(run && run.reason || '', 130), createdAt: run && run.createdAt || '' };
    }
    function compactPropagationForList(item) {
        return { id: item && item.id || '', status: item && item.status || '', impactText: `${item && item.factCount || 0} facts / ${item && item.familyCount || 0} families / ${item && item.edgeCount || 0} edges / ${item && item.modelCount || 0} models`, sourceText: `${(item && item.sourceIds && item.sourceIds.factCorrectionIds || []).length} fact edits · ${(item && item.sourceIds && item.sourceIds.conflictResolutionIds || []).length} conflicts · ${(item && item.sourceIds && item.sourceIds.familyAdjustmentIds || []).length} family adjusts · ${(item && item.sourceIds && item.sourceIds.modelCorrectionIds || []).length} model edits`, reason: clampText(item && item.reason || '', 160), createdAt: item && item.createdAt || '' };
    }
    core.memoryBrain.correctionPropagationSemantics = { collectPendingSources, buildCorrectionPropagationPlan, compactPropagationRunForList, compactPropagationForList };
})(OwoApp);
