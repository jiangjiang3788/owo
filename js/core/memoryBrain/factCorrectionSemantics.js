// --- Memory Brain fact correction semantics owner (v0.5.1) ---
// 纯计算：基于已有 fact / review item 生成事实改写计划；不写状态、不访问 DOM、不跑 AI。
(function registerMemoryBrainFactCorrectionSemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function asArray(value, max) {
        const list = Array.isArray(value) ? value : asText(value).split(/[，,、;；\n]+/);
        const seen = new Set();
        return list.map(item => asText(item).slice(0, 80)).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
        }).slice(0, max || 12);
    }
    function clone(value) { try { return JSON.parse(JSON.stringify(value)); } catch (error) { return value; } }
    function clampText(value, max) { const text = asText(value); return text.length > max ? text.slice(0, max - 1) + '…' : text; }
    function clampConfidence(value, fallback) {
        const n = Number(value);
        const raw = Number.isFinite(n) ? (n > 1 ? n / 100 : n) : fallback;
        return Math.max(0.05, Math.min(1, Math.round((raw || 0.8) * 100) / 100));
    }
    function normalizePolarity(value, fallback) {
        const text = asText(value || fallback).toLowerCase();
        if (['negative', 'avoid', 'dislike', 'no', '反感', '避免', '不喜欢'].includes(text)) return 'negative';
        if (['positive', 'like', 'want', 'yes', '喜欢', '希望', '偏好'].includes(text)) return 'positive';
        if (['disputed', 'conflict', '冲突', '矛盾'].includes(text)) return 'disputed';
        return text || 'neutral';
    }
    function findFact(snapshot, input) {
        const factId = asText(input && input.factId);
        const reviewItemId = asText(input && input.reviewItemId);
        const items = Array.isArray(snapshot && snapshot.reviewInboxItems) ? snapshot.reviewInboxItems : [];
        const item = reviewItemId ? items.find(entry => entry && entry.id === reviewItemId) : null;
        const targetId = factId || (item && item.targetType === 'fact' ? item.targetId : '');
        const facts = Array.isArray(snapshot && snapshot.facts) ? snapshot.facts : [];
        return { fact: facts.find(entry => entry && entry.id === targetId) || null, reviewItem: item || null };
    }
    function normalizeCorrectionDraft(raw, fact) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const base = fact || {};
        return {
            content: clampText(source.content || base.content || '', 360),
            subject: clampText(source.subject || base.subject || 'user', 80),
            predicate: clampText(source.predicate || base.predicate || 'relates_to', 100),
            object: clampText(source.object || base.object || '', 220),
            factType: clampText(source.factType || base.factType || 'natural', 100),
            labels: asArray(source.labels && source.labels.length ? source.labels : base.labels, 12),
            keywords: asArray(source.keywords && source.keywords.length ? source.keywords : base.keywords, 16),
            polarity: normalizePolarity(source.polarity, base.polarity),
            confidence: clampConfidence(source.confidence, base.confidence || 0.82),
            correctionReason: clampText(source.correctionReason || source.reason || '', 420),
            reviewNote: clampText(source.reviewNote || '', 420)
        };
    }
    function diffFields(before, draft) {
        const changed = [];
        ['content', 'subject', 'predicate', 'object', 'factType', 'polarity'].forEach(key => {
            if (asText(before && before[key]) !== asText(draft && draft[key])) changed.push(key);
        });
        if (Math.abs(clampConfidence(before && before.confidence, 0.8) - clampConfidence(draft && draft.confidence, 0.8)) > 0.001) changed.push('confidence');
        if (asArray(before && before.labels).join('|') !== asArray(draft && draft.labels).join('|')) changed.push('labels');
        if (asArray(before && before.keywords).join('|') !== asArray(draft && draft.keywords).join('|')) changed.push('keywords');
        return changed;
    }
    function buildFactCorrectionPlan(snapshot, input = {}) {
        const found = findFact(snapshot, input);
        const fact = found.fact;
        if (!fact) return { ok: false, status: 'missing-fact', errorMessage: '找不到要改写的事实', plan: null };
        if (asText(fact.status) === 'retired') return { ok: false, status: 'retired-fact', errorMessage: '已撤回的事实不能改写', plan: null };
        const draft = normalizeCorrectionDraft(input.draft || input, fact);
        if (!draft.content) return { ok: false, status: 'empty-content', errorMessage: '改写后的事实内容不能为空', plan: null };
        const changedFields = diffFields(fact, draft);
        const nextVersion = (Number(fact.correctionVersion) || Number(fact.version) || 1) + 1;
        const afterFact = Object.assign({}, clone(fact), draft, {
            status: 'active',
            lifecycleStatus: 'corrected',
            reviewStatus: 'user-corrected',
            correctionVersion: nextVersion,
            correctionReason: draft.correctionReason || '人工改写事实',
            correctedFromReviewItemId: found.reviewItem && found.reviewItem.id || asText(input.reviewItemId),
            correctedAt: ''
        });
        afterFact.source = clone(fact.source || {});
        afterFact.evidence = clone(fact.evidence || []);
        afterFact.familyIds = clone(fact.familyIds || []);
        afterFact.edgeIds = clone(fact.edgeIds || []);
        return {
            ok: true,
            status: changedFields.length ? 'ready' : 'no-change',
            factId: fact.id,
            reviewItemId: found.reviewItem && found.reviewItem.id || asText(input.reviewItemId),
            beforeFact: clone(fact),
            afterFact,
            changedFields,
            correctionReason: draft.correctionReason || '人工改写事实',
            reviewNote: draft.reviewNote,
            version: nextVersion,
            formalPromptInjection: false,
            writesLegacyMemory: false
        };
    }
    function compactFactCorrectionForList(correction) {
        return {
            id: correction && correction.id || '',
            factId: correction && correction.factId || '',
            reviewItemId: correction && correction.reviewItemId || '',
            status: correction && correction.status || 'applied',
            version: correction && correction.version || 1,
            beforeText: clampText(correction && correction.beforeContent, 140),
            afterText: clampText(correction && correction.afterContent, 180),
            reason: clampText(correction && correction.reason, 140),
            changedText: asArray(correction && correction.changedFields, 8).join(' / '),
            createdAt: correction && correction.createdAt || ''
        };
    }
    function compactFactCorrectionRunForList(run) {
        return {
            id: run && run.id || '',
            status: run && run.status || '',
            factId: run && run.factId || '',
            reviewItemId: run && run.reviewItemId || '',
            version: run && run.version || 1,
            changedText: asArray(run && run.changedFields, 8).join(' / '),
            createdAt: run && run.createdAt || ''
        };
    }

    core.memoryBrain.factCorrectionSemantics = { normalizeCorrectionDraft, buildFactCorrectionPlan, compactFactCorrectionForList, compactFactCorrectionRunForList };
})(OwoApp);
