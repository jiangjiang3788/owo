// --- Memory Brain review inbox semantics owner (v0.5.0) ---
// 纯计算：把低置信、冲突、重复、过时、待确认模型整理成审查收件箱；不写状态、不跑 AI、不渲染 UI。
(function registerMemoryBrainReviewInboxSemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};

    const ISSUE_DEFS = Object.freeze({
        'low-confidence': { title: '低置信事实', severity: 'medium', action: '确认 / 改写 / 删除' },
        duplicate: { title: '疑似重复事实', severity: 'low', action: '保留主事实或合并证据' },
        disputed: { title: '冲突事实', severity: 'high', action: '选择真实版本或标注条件' },
        obsolete: { title: '过时事实', severity: 'medium', action: '确认是否作废旧事实' },
        'model-low-confidence': { title: '长期模型低置信', severity: 'medium', action: '后续人工修正或重建' },
        'model-pending': { title: '长期模型待确认', severity: 'low', action: '检查模型摘要和证据' },
        'cutover-risk': { title: '接管演练风险', severity: 'high', action: '正式接管前先处理风险' }
    });

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function text(value) { return String(value == null ? '' : value).trim(); }
    function num(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
    function clamp01(value, fallback) { return Math.max(0, Math.min(1, num(value, fallback))); }
    function slug(value) { return text(value).toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5_-]+/g, '-').replace(/^-+|-+$/g, '') || 'item'; }
    function clip(value, max) { const raw = text(value); return raw.length > max ? raw.slice(0, max) + '…' : raw; }
    function confidenceOf(item, fallback) { return clamp01(item && item.confidence, fallback == null ? 0.5 : fallback); }
    function issueDef(type) { return ISSUE_DEFS[type] || { title: '待审查记忆', severity: 'medium', action: '人工查看' }; }
    function isOpenStatus(status) { return ['open', 'pending', 'needs-review', 'auto-disputed', 'auto-duplicate', 'auto-obsolete'].includes(text(status || 'open')); }

    function factIssueType(fact, options) {
        const status = text(fact && fact.status || 'active');
        const lifecycleStatus = text(fact && fact.lifecycleStatus || '');
        if (status === 'duplicate' || lifecycleStatus === 'duplicate') return 'duplicate';
        if (status === 'obsolete' || lifecycleStatus === 'obsolete') return 'obsolete';
        if (status === 'disputed' || lifecycleStatus === 'disputed') return 'disputed';
        const threshold = clamp01(options && options.lowConfidenceThreshold, 0.58);
        if (status === 'active' && confidenceOf(fact, 0.75) < threshold) return 'low-confidence';
        return '';
    }

    function buildFactItem(fact, issueType, options) {
        const def = issueDef(issueType);
        const confidence = confidenceOf(fact, 0.5);
        const severity = issueType === 'disputed' ? 'high' : issueType === 'duplicate' ? 'low' : def.severity;
        const reason = text(fact.lifecycleReason) || (issueType === 'low-confidence' ? `置信度 ${Math.round(confidence * 100)}%，低于审查阈值` : def.title);
        const source = fact.source || {};
        return {
            id: `review-fact-${slug(issueType)}-${slug(fact.id)}`,
            kind: 'review-inbox-item',
            targetType: 'fact',
            targetId: fact.id,
            issueType,
            severity,
            status: 'open',
            title: `${def.title} · ${clip(fact.content || fact.object || fact.id, 32)}`,
            summary: clip(fact.content || fact.object || '未命名事实', 260),
            reason,
            suggestedAction: def.action,
            confidence,
            source: {
                eventId: source.eventId || fact.eventId || '',
                eventTitle: source.eventTitle || '',
                archiveSourceId: source.archiveSourceId || '',
                archiveChunkId: source.archiveChunkId || '',
                startIndex: source.startIndex,
                endIndex: source.endIndex
            },
            relatedIds: [fact.duplicateOfFactId, fact.supersededByFactId, fact.disputeGroupId].filter(Boolean),
            createdFrom: 'fact-lifecycle',
            sortScore: severity === 'high' ? 300 : severity === 'medium' ? 200 : 100
        };
    }

    function modelIssueType(model, options) {
        const status = text(model && model.status || 'active');
        if (status !== 'active') return '';
        const confidence = confidenceOf(model, 0.72);
        if (confidence < clamp01(options && options.lowModelConfidenceThreshold, 0.64)) return 'model-low-confidence';
        const reviewStatus = text(model && model.reviewStatus || '');
        if (reviewStatus === 'pending' || reviewStatus === 'needs-review') return 'model-pending';
        const evidenceCount = asArray(model && model.evidence).length + asArray(model && model.evidenceIds).length;
        if (evidenceCount > 0 && evidenceCount < (num(options && options.minModelEvidence, 3))) return 'model-pending';
        return '';
    }

    function buildModelItem(model, issueType) {
        const def = issueDef(issueType);
        const confidence = confidenceOf(model, 0.6);
        return {
            id: `review-model-${slug(issueType)}-${slug(model.id)}`,
            kind: 'review-inbox-item',
            targetType: 'model',
            targetId: model.id,
            issueType,
            severity: def.severity,
            status: 'open',
            title: `${def.title} · ${clip(model.title || model.type || model.id, 32)}`,
            summary: clip(model.summary || asArray(model.stableUnderstanding).join('；') || model.type || '长期模型', 260),
            reason: issueType === 'model-low-confidence' ? `模型置信度 ${Math.round(confidence * 100)}%，建议确认` : '长期模型证据或状态仍待确认',
            suggestedAction: def.action,
            confidence,
            source: { modelType: model.type || '', version: model.version || 1 },
            relatedIds: asArray(model.sourceIds).concat(asArray(model.evidenceIds)).slice(0, 8),
            createdFrom: 'history-model-rebuild',
            sortScore: issueType === 'model-low-confidence' ? 220 : 120
        };
    }

    function buildCutoverItem(report) {
        const risks = asArray(report && (report.risks || report.riskFlags || report.flags)).filter(Boolean);
        if (!risks.length) return null;
        return {
            id: `review-cutover-risk-${slug(report.id)}`,
            kind: 'review-inbox-item',
            targetType: 'cutover-report',
            targetId: report.id,
            issueType: 'cutover-risk',
            severity: 'high',
            status: 'open',
            title: `接管演练风险 · ${clip(report.query || report.title || report.id, 32)}`,
            summary: clip(`风险：${risks.join(' / ')}`, 260),
            reason: '正式切换 owner 前需要处理接管演练风险',
            suggestedAction: issueDef('cutover-risk').action,
            confidence: 0.8,
            source: { cutoverGate: report.cutoverGate || 'blocked-until-v0.9' },
            relatedIds: asArray(report.factIds).concat(asArray(report.modelIds)).slice(0, 8),
            createdFrom: 'cutover-rehearsal',
            sortScore: 320
        };
    }

    function mergeWithExisting(items, existingItems) {
        const existingById = new Map(asArray(existingItems).map(item => [item && item.id, item]).filter(pair => pair[0]));
        return items.map(item => {
            const existing = existingById.get(item.id);
            if (!existing) return item;
            if (!isOpenStatus(existing.status)) return Object.assign({}, item, { status: existing.status, resolvedAt: existing.resolvedAt || '', reviewNote: existing.reviewNote || '', action: existing.action || '' });
            return Object.assign({}, existing, item, { status: existing.status || item.status, reviewNote: existing.reviewNote || '' });
        });
    }

    function buildReviewInboxPlan(snapshot, options = {}) {
        const items = [];
        asArray(snapshot && snapshot.facts).forEach(fact => {
            if (!fact || text(fact.status) === 'retired') return;
            const issueType = factIssueType(fact, options);
            if (issueType) items.push(buildFactItem(fact, issueType, options));
        });
        asArray(snapshot && snapshot.models).forEach(model => {
            if (!model) return;
            const issueType = modelIssueType(model, options);
            if (issueType) items.push(buildModelItem(model, issueType));
        });
        asArray(snapshot && snapshot.cutoverReports).forEach(report => {
            const item = buildCutoverItem(report);
            if (item) items.push(item);
        });
        const merged = mergeWithExisting(items, snapshot && snapshot.reviewInboxItems);
        merged.sort((a, b) => (Number(b.sortScore) || 0) - (Number(a.sortScore) || 0) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
        const counts = merged.reduce((acc, item) => {
            if (item.status === 'dismissed') acc.dismissed += 1;
            else if (item.status === 'confirmed' || item.status === 'corrected') acc.confirmed += 1;
            else acc.open += 1;
            acc.byIssue[item.issueType] = (acc.byIssue[item.issueType] || 0) + 1;
            acc.bySeverity[item.severity] = (acc.bySeverity[item.severity] || 0) + 1;
            return acc;
        }, { open: 0, dismissed: 0, confirmed: 0, byIssue: {}, bySeverity: {} });
        return {
            kind: 'memory-review-inbox-plan',
            status: merged.length ? 'ready' : 'clean',
            itemCount: merged.length,
            openCount: counts.open,
            items: merged,
            counts,
            thresholds: {
                lowConfidenceThreshold: clamp01(options.lowConfidenceThreshold, 0.58),
                lowModelConfidenceThreshold: clamp01(options.lowModelConfidenceThreshold, 0.64)
            }
        };
    }

    function compactReviewInboxItemForList(item) {
        const def = issueDef(item && item.issueType);
        return {
            id: item && item.id || '',
            targetType: item && item.targetType || '',
            targetId: item && item.targetId || '',
            issueType: item && item.issueType || 'unknown',
            issueLabel: def.title,
            severity: item && item.severity || def.severity,
            status: item && item.status || 'open',
            title: item && item.title || def.title,
            summary: item && item.summary || '',
            reason: item && item.reason || '',
            suggestedAction: item && item.suggestedAction || def.action,
            confidencePercent: Math.round(confidenceOf(item, 0.5) * 100),
            relatedIds: asArray(item && item.relatedIds).slice(0, 4),
            createdAt: item && item.createdAt || '',
            updatedAt: item && item.updatedAt || ''
        };
    }

    function compactReviewInboxRunForList(run) {
        return {
            id: run && run.id || '',
            status: run && run.status || 'unknown',
            createdAt: run && run.createdAt || '',
            itemCount: run && run.itemCount || 0,
            openCount: run && run.openCount || 0,
            highCount: run && run.highCount || 0,
            mediumCount: run && run.mediumCount || 0,
            lowCount: run && run.lowCount || 0
        };
    }

    core.memoryBrain.reviewInboxSemantics = {
        ISSUE_DEFS,
        buildReviewInboxPlan,
        compactReviewInboxItemForList,
        compactReviewInboxRunForList
    };
})(OwoApp);
