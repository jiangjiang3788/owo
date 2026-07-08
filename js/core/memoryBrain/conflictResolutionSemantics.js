// --- Memory Brain conflict resolution semantics owner (v0.5.2) ---
// 纯计算：把 disputed facts 组成冲突组，并生成保留 / 条件保留 / 标记过时等处理计划。
(function registerMemoryBrainConflictResolutionSemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function clampText(value, max) { const text = asText(value); return text.length > max ? text.slice(0, max - 1) + '…' : text; }
    function nowish(value) { const parsed = Date.parse(value || ''); return Number.isFinite(parsed) ? parsed : 0; }
    function confidence(fact) { const value = Number(fact && fact.confidence); return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0.5; }
    function factScore(fact) { return confidence(fact) * 1000 + nowish(fact && (fact.updatedAt || fact.createdAt)) / 100000000000; }
    function isRetired(fact) { return asText(fact && fact.status).toLowerCase() === 'retired'; }
    function isOpenConflict(conflict) { return conflict && asText(conflict.status || 'open') !== 'resolved' && asText(conflict.status) !== 'dismissed' && asText(conflict.status) !== 'rolled-back'; }

    function factsById(snapshot) {
        return new Map(asArray(snapshot && snapshot.facts).map(fact => [fact && fact.id, fact]).filter(pair => pair[0]));
    }
    function collectConflictGroups(snapshot) {
        const byId = factsById(snapshot);
        const groups = [];
        const seen = new Set();
        asArray(snapshot && snapshot.conflicts).filter(isOpenConflict).forEach(conflict => {
            const factIds = asArray(conflict.factIds).filter(id => byId.has(id));
            if (factIds.length < 2) return;
            groups.push({ id: conflict.id || conflict.disputeGroupId || `conflict-${factIds.join('-')}`, conflict, factIds, facts: factIds.map(id => byId.get(id)).filter(Boolean), source: 'conflicts' });
            factIds.forEach(id => seen.add(id));
        });
        const byDispute = new Map();
        asArray(snapshot && snapshot.facts).forEach(fact => {
            if (!fact || isRetired(fact)) return;
            const status = asText(fact.lifecycleStatus || fact.status || '').toLowerCase();
            const groupId = asText(fact.disputeGroupId || fact.conflictGroupId);
            if (status !== 'disputed' || !groupId || seen.has(fact.id)) return;
            if (!byDispute.has(groupId)) byDispute.set(groupId, []);
            byDispute.get(groupId).push(fact);
        });
        byDispute.forEach((facts, groupId) => {
            if (facts.length < 2) return;
            groups.push({ id: groupId, conflict: { id: groupId, status: 'open', factIds: facts.map(fact => fact.id), reason: 'facts disputeGroupId 自动形成的冲突组' }, factIds: facts.map(fact => fact.id), facts, source: 'facts' });
        });
        return groups;
    }
    function normalizeAction(value) {
        const action = asText(value).toLowerCase();
        if (['prefer', 'prefer-fact', 'choose', 'choose-one', 'keep-one'].includes(action)) return 'prefer-fact';
        if (['keep-both', 'both', 'resolve-both'].includes(action)) return 'keep-both';
        if (['conditional', 'condition', 'keep-conditional'].includes(action)) return 'conditional';
        if (['obsolete', 'mark-obsolete', 'supersede'].includes(action)) return 'mark-obsolete';
        if (['dismiss', 'ignore'].includes(action)) return 'dismiss';
        return 'prefer-fact';
    }
    function pickGroup(snapshot, input = {}) {
        const conflictId = asText(input.conflictId || input.disputeGroupId);
        const requestedFacts = asArray(input.factIds).concat(asText(input.factIds).split(/[，,、;；\n]+/)).map(asText).filter(Boolean);
        const groups = collectConflictGroups(snapshot);
        if (conflictId) {
            const found = groups.find(group => group.id === conflictId || group.conflict && group.conflict.id === conflictId);
            if (found) return found;
        }
        if (requestedFacts.length) {
            const set = new Set(requestedFacts);
            const found = groups.find(group => group.factIds.some(id => set.has(id)));
            if (found) return found;
        }
        return groups[0] || null;
    }
    function buildUpdates(group, input = {}) {
        const action = normalizeAction(input.action);
        const reason = clampText(input.resolutionReason || input.reason || '', 420) || '人工处理冲突事实';
        const conditionNote = clampText(input.conditionNote || input.note || '', 420);
        const preferredFactId = asText(input.preferredFactId) || (group.facts.slice().sort((a, b) => factScore(b) - factScore(a))[0] || {}).id || '';
        const obsoleteInput = asArray(input.obsoleteFactIds).concat(asText(input.obsoleteFactIds).split(/[，,、;；\n]+/)).map(asText).filter(Boolean);
        const obsoleteSet = new Set(obsoleteInput.length ? obsoleteInput : group.factIds.filter(id => id !== preferredFactId));
        const updates = [];
        if (action === 'dismiss') return group.facts.map(fact => ({ id: fact.id, status: fact.status || 'active', lifecycleStatus: 'dispute-dismissed', reviewStatus: 'conflict-dismissed', conflictResolutionStatus: 'dismissed', conflictResolutionReason: reason }));
        if (action === 'keep-both') {
            return group.facts.map(fact => ({ id: fact.id, status: 'active', lifecycleStatus: 'active', reviewStatus: 'conflict-resolved', conflictResolutionStatus: 'keep-both', conflictResolutionReason: reason, conditionNote: conditionNote || fact.conditionNote || '' }));
        }
        if (action === 'conditional') {
            return group.facts.map(fact => ({ id: fact.id, status: 'active', lifecycleStatus: 'conditional', reviewStatus: 'conflict-resolved', conflictResolutionStatus: 'conditional', conflictResolutionReason: reason, conditionNote: conditionNote || '条件保留：请在事实内容或后续模型里解释适用场景' }));
        }
        if (action === 'mark-obsolete') {
            return group.facts.map(fact => obsoleteSet.has(fact.id)
                ? { id: fact.id, status: 'obsolete', lifecycleStatus: 'obsolete', reviewStatus: 'conflict-resolved', conflictResolutionStatus: 'marked-obsolete', conflictResolutionReason: reason, supersededByFactId: preferredFactId || '' }
                : { id: fact.id, status: 'active', lifecycleStatus: 'active', reviewStatus: 'conflict-resolved', conflictResolutionStatus: 'survived-conflict', conflictResolutionReason: reason });
        }
        group.facts.forEach(fact => {
            if (fact.id === preferredFactId) {
                updates.push({ id: fact.id, status: 'active', lifecycleStatus: 'active', reviewStatus: 'conflict-resolved', conflictResolutionStatus: 'preferred', conflictResolutionReason: reason });
            } else {
                updates.push({ id: fact.id, status: 'obsolete', lifecycleStatus: 'obsolete', reviewStatus: 'conflict-resolved', conflictResolutionStatus: 'superseded-by-preferred', conflictResolutionReason: reason, supersededByFactId: preferredFactId });
            }
        });
        return updates;
    }
    function buildConflictResolutionPlan(snapshot, input = {}) {
        const group = pickGroup(snapshot, input);
        if (!group) return { ok: false, status: 'missing-conflict', errorMessage: '没有找到可处理的冲突事实组', plan: null };
        const action = normalizeAction(input.action);
        const updates = buildUpdates(group, input);
        const beforeFacts = clone(group.facts);
        const updateById = new Map(updates.map(update => [update.id, update]));
        const afterFacts = group.facts.map(fact => Object.assign({}, clone(fact), updateById.get(fact.id), { conflictResolvedAt: '', conflictResolutionBatchId: '' }));
        const conflictBefore = clone(group.conflict || null);
        const conflictAfter = Object.assign({}, clone(group.conflict || {}), {
            id: group.id,
            factIds: group.factIds.slice(),
            status: action === 'dismiss' ? 'dismissed' : 'resolved',
            resolutionAction: action,
            preferredFactId: asText(input.preferredFactId) || (updates.find(item => item.conflictResolutionStatus === 'preferred') || {}).id || '',
            conditionNote: clampText(input.conditionNote || '', 420),
            resolutionReason: clampText(input.resolutionReason || input.reason || '', 420) || '人工处理冲突事实',
            resolvedAt: ''
        });
        return {
            ok: true,
            status: 'ready',
            conflictId: group.id,
            action,
            factIds: group.factIds.slice(),
            beforeFacts,
            afterFacts,
            updates,
            conflictBefore,
            conflictAfter,
            resolutionReason: conflictAfter.resolutionReason,
            formalPromptInjection: false,
            writesLegacyMemory: false
        };
    }
    function compactConflictGroupForList(group) {
        const facts = asArray(group && group.facts);
        return {
            id: group && group.id || '',
            status: group && group.conflict && group.conflict.status || 'open',
            reason: clampText(group && group.conflict && group.conflict.reason || '', 160),
            factIds: asArray(group && group.factIds),
            factCount: asArray(group && group.factIds).length,
            preferredFactId: facts.slice().sort((a, b) => factScore(b) - factScore(a))[0] && facts.slice().sort((a, b) => factScore(b) - factScore(a))[0].id || '',
            factSummaries: facts.map(fact => ({ id: fact.id, content: clampText(fact.content || '', 170), confidence: confidence(fact), status: fact.status || 'active', lifecycleStatus: fact.lifecycleStatus || '' }))
        };
    }
    function compactConflictResolutionForList(item) {
        return {
            id: item && item.id || '',
            conflictId: item && item.conflictId || '',
            action: item && item.action || '',
            status: item && item.status || '',
            factIds: asArray(item && item.factIds),
            reason: clampText(item && item.reason || '', 160),
            createdAt: item && item.createdAt || ''
        };
    }
    function compactConflictRunForList(run) {
        return { id: run && run.id || '', status: run && run.status || '', conflictId: run && run.conflictId || '', action: run && run.action || '', factCount: run && run.factCount || 0, createdAt: run && run.createdAt || '' };
    }

    core.memoryBrain.conflictResolutionSemantics = { collectConflictGroups, buildConflictResolutionPlan, compactConflictGroupForList, compactConflictResolutionForList, compactConflictRunForList, normalizeAction };
})(OwoApp);
