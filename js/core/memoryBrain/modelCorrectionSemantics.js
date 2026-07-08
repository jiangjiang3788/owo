// --- Memory Brain model correction semantics owner (v0.5.4) ---
// 纯计算：基于已有长期模型 / 审查项生成人工修正计划；不写状态、不访问 DOM、不跑 AI。
(function registerMemoryBrainModelCorrectionSemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};

    const MODEL_TYPE_LABELS = Object.freeze({
        'user-profile': '用户画像',
        'ai-self': 'AI 自我',
        'world-model': '世界观',
        'project-brain': '项目脑',
        'interaction-preferences': '互动偏好',
        'relationship-continuity': '关系连续性'
    });
    const ARRAY_FIELDS = Object.freeze(['stableTraits', 'preferences', 'boundaries', 'relationshipNotes', 'projectDecisions', 'openQuestions', 'keywords', 'labels']);
    function asText(value) { return String(value == null ? '' : value).trim(); }
    function asArray(value, max) {
        const source = Array.isArray(value) ? value : asText(value).split(/[，,、;；\n]+/);
        const seen = new Set();
        return source.map(item => asText(item).slice(0, 180)).filter(Boolean).filter(item => {
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
    function typeLabel(type) { return MODEL_TYPE_LABELS[type] || type || '长期模型'; }
    function activeModels(snapshot) { return (Array.isArray(snapshot && snapshot.models) ? snapshot.models : []).filter(model => model && model.status === 'active'); }
    function findReviewItem(snapshot, reviewItemId) {
        return (Array.isArray(snapshot && snapshot.reviewInboxItems) ? snapshot.reviewInboxItems : []).find(item => item && item.id === reviewItemId) || null;
    }
    function findModel(snapshot, input) {
        const modelId = asText(input && input.modelId);
        const reviewItemId = asText(input && input.reviewItemId);
        const reviewItem = reviewItemId ? findReviewItem(snapshot, reviewItemId) : null;
        const targetId = modelId || (reviewItem && reviewItem.targetType === 'model' ? reviewItem.targetId : '');
        return { model: activeModels(snapshot).find(item => item && item.id === targetId) || null, reviewItem };
    }
    function normalizeModelCorrectionDraft(raw, model) {
        const source = raw && typeof raw === 'object' ? raw : {};
        const base = model || {};
        return {
            title: clampText(source.title || base.title || typeLabel(base.type), 120),
            summary: clampText(source.summary || base.summary || '', 1200),
            stableTraits: asArray(source.stableTraits && source.stableTraits.length ? source.stableTraits : base.stableTraits, 16),
            preferences: asArray(source.preferences && source.preferences.length ? source.preferences : base.preferences, 18),
            boundaries: asArray(source.boundaries && source.boundaries.length ? source.boundaries : base.boundaries, 18),
            relationshipNotes: asArray(source.relationshipNotes && source.relationshipNotes.length ? source.relationshipNotes : base.relationshipNotes, 18),
            projectDecisions: asArray(source.projectDecisions && source.projectDecisions.length ? source.projectDecisions : base.projectDecisions, 18),
            openQuestions: asArray(source.openQuestions && source.openQuestions.length ? source.openQuestions : base.openQuestions, 18),
            keywords: asArray(source.keywords && source.keywords.length ? source.keywords : base.keywords, 20),
            labels: asArray(source.labels && source.labels.length ? source.labels : base.labels, 14),
            confidence: clampConfidence(source.confidence, base.confidence || 0.82),
            correctionReason: clampText(source.correctionReason || source.reason || '', 520),
            reviewNote: clampText(source.reviewNote || '', 520)
        };
    }
    function changedFields(before, draft) {
        const changed = [];
        ['title', 'summary', 'confidence'].forEach(key => {
            if (key === 'confidence') {
                if (Math.abs(clampConfidence(before && before.confidence, 0.8) - clampConfidence(draft && draft.confidence, 0.8)) > 0.001) changed.push(key);
            } else if (asText(before && before[key]) !== asText(draft && draft[key])) changed.push(key);
        });
        ARRAY_FIELDS.forEach(key => {
            if (asArray(before && before[key], 50).join('|') !== asArray(draft && draft[key], 50).join('|')) changed.push(key);
        });
        return changed;
    }
    function buildModelCorrectionPlan(snapshot, input = {}) {
        const found = findModel(snapshot, input);
        const model = found.model;
        if (!model) return { ok: false, status: 'missing-model', errorMessage: '找不到要修正的长期模型', plan: null };
        if (asText(model.status) !== 'active') return { ok: false, status: 'inactive-model', errorMessage: '只有 active 长期模型可以人工修正', plan: null };
        const draft = normalizeModelCorrectionDraft(input.draft || input, model);
        if (!draft.summary) return { ok: false, status: 'empty-summary', errorMessage: '修正后的长期模型摘要不能为空', plan: null };
        const nextVersion = (Number(model.version) || 1) + 1;
        const nextCorrectionVersion = (Number(model.correctionVersion) || 0) + 1;
        const afterModel = Object.assign({}, clone(model), draft, {
            id: asText(input.newModelId) || '',
            status: 'active',
            version: nextVersion,
            previousModelId: model.id,
            reviewStatus: 'user-corrected',
            correctionVersion: nextCorrectionVersion,
            correctionReason: draft.correctionReason || '人工修正长期模型',
            correctedFromReviewItemId: found.reviewItem && found.reviewItem.id || asText(input.reviewItemId),
            correctedAt: '',
            updatedAt: ''
        });
        afterModel.type = model.type;
        afterModel.evidenceFactIds = clone(model.evidenceFactIds || []);
        afterModel.familyIds = clone(model.familyIds || []);
        afterModel.edgeIds = clone(model.edgeIds || []);
        afterModel.batchId = '';
        const changed = changedFields(model, draft);
        return {
            ok: true,
            status: changed.length ? 'ready' : 'no-change',
            modelId: model.id,
            modelType: model.type,
            reviewItemId: found.reviewItem && found.reviewItem.id || asText(input.reviewItemId),
            beforeModel: clone(model),
            afterModel,
            changedFields: changed,
            version: nextVersion,
            correctionVersion: nextCorrectionVersion,
            correctionReason: draft.correctionReason || '人工修正长期模型',
            reviewNote: draft.reviewNote || '',
            formalPromptInjection: false,
            writesLegacyMemory: false
        };
    }
    function compactModelCorrectionForList(item) {
        return {
            id: item && item.id || '',
            modelId: item && item.modelId || '',
            newModelId: item && item.newModelId || '',
            modelType: item && item.modelType || '',
            modelTypeLabel: typeLabel(item && item.modelType),
            status: item && item.status || 'applied',
            version: item && item.version || 1,
            beforeTitle: clampText(item && item.beforeTitle, 120),
            afterTitle: clampText(item && item.afterTitle, 120),
            reason: clampText(item && item.reason, 160),
            changedText: asArray(item && item.changedFields, 10).join(' / '),
            createdAt: item && item.createdAt || ''
        };
    }
    function compactModelCorrectionRunForList(run) {
        return {
            id: run && run.id || '',
            status: run && run.status || '',
            modelId: run && run.modelId || '',
            newModelId: run && run.newModelId || '',
            modelType: run && run.modelType || '',
            version: run && run.version || 1,
            changedText: asArray(run && run.changedFields, 10).join(' / '),
            createdAt: run && run.createdAt || ''
        };
    }
    function compactModelOption(model) {
        return {
            id: model && model.id || '',
            type: model && model.type || '',
            typeLabel: typeLabel(model && model.type),
            title: model && model.title || typeLabel(model && model.type),
            summary: clampText(model && model.summary, 280),
            version: model && model.version || 1,
            confidence: Math.round(clampConfidence(model && model.confidence, 0.8) * 100),
            stableTraitsText: asArray(model && model.stableTraits, 16).join('，'),
            preferencesText: asArray(model && model.preferences, 18).join('，'),
            boundariesText: asArray(model && model.boundaries, 18).join('，'),
            relationshipNotesText: asArray(model && model.relationshipNotes, 18).join('，'),
            projectDecisionsText: asArray(model && model.projectDecisions, 18).join('，'),
            openQuestionsText: asArray(model && model.openQuestions, 18).join('，'),
            labelsText: asArray(model && model.labels, 14).join('，'),
            keywordsText: asArray(model && model.keywords, 20).join('，')
        };
    }
    core.memoryBrain.modelCorrectionSemantics = { normalizeModelCorrectionDraft, buildModelCorrectionPlan, compactModelCorrectionForList, compactModelCorrectionRunForList, compactModelOption, typeLabel };
})(OwoApp);
