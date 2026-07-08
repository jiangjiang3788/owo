// --- Memory Brain trust score semantics owner (v0.5.6) ---
// 纯计算：为 facts / families / graph edges / models 生成可解释信任分；不访问 DOM、网络或平台存储。
(function registerMemoryBrainTrustScoreSemantics(app) {
    const core = app.core = app.core || {};
    core.memoryBrain = core.memoryBrain || {};

    function asText(value) { return String(value == null ? '' : value).trim(); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function number(value, fallback) { const n = Number(value); return Number.isFinite(n) ? n : (fallback || 0); }
    function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
    function unique(list, max) {
        const seen = new Set();
        return asArray(list).concat(asText(list).split(/[，,、;；\n]+/)).map(asText).filter(Boolean).filter(item => {
            const key = item.toLowerCase();
            if (seen.has(key)) return false;
            seen.add(key); return true;
        }).slice(0, max || 9999);
    }
    function byId(list) { return new Map(asArray(list).filter(item => item && item.id).map(item => [item.id, item])); }
    function lower(value) { return asText(value).toLowerCase(); }
    function level(score) {
        if (score >= 82) return 'high';
        if (score >= 62) return 'medium';
        if (score >= 42) return 'low';
        return 'critical';
    }
    function add(reasons, text, points) { reasons.push({ text, points: Math.round(points) }); return points; }
    function confidencePoints(value, reasons) {
        const raw = number(value, NaN);
        if (!Number.isFinite(raw)) return add(reasons, '未提供置信度，使用中性起点', 2);
        const conf = raw > 1 ? raw / 100 : raw;
        return add(reasons, `置信度 ${Math.round(clamp(conf, 0, 1) * 100)}%`, clamp(conf, 0, 1) * 24 - 4);
    }
    function statusPenalty(item, reasons) {
        const status = lower(item && (item.lifecycleStatus || item.status));
        const reviewStatus = lower(item && item.reviewStatus);
        let points = 0;
        if (['duplicate', 'obsolete', 'retired'].includes(status)) points += add(reasons, `状态为 ${status}，不适合作为高可信注入来源`, -55);
        else if (['disputed'].includes(status)) points += add(reasons, '事实处于 disputed 冲突状态', -38);
        else if (['merged'].includes(status)) points += add(reasons, '事实已合并，可信度降级等待下游刷新', -18);
        else points += add(reasons, '状态可用', 6);
        if (reviewStatus.includes('needs') || reviewStatus.includes('pending')) points += add(reasons, `审查状态 ${reviewStatus}`, -16);
        return points;
    }
    function propagationPoints(item, reasons) {
        const status = lower(item && item.propagationStatus);
        if (!status) return 0;
        if (status.includes('stale') || status.includes('needs')) return add(reasons, `传播状态 ${status}，下游可能过期`, -12);
        if (status.includes('propagated') || status.includes('reviewed')) return add(reasons, `传播状态 ${status}，已刷新下游`, 5);
        return 0;
    }
    function sourceFreshnessPoints(item, reasons) {
        const at = item && (item.updatedAt || item.createdAt || item.sourceCreatedAt || item.createdAtIso);
        if (!at) return 0;
        const time = Date.parse(at);
        if (!Number.isFinite(time)) return 0;
        const days = (Date.now() - time) / 86400000;
        if (days < 30) return add(reasons, '来源较新', 5);
        if (days > 365) return add(reasons, '来源很久未更新', -5);
        return 0;
    }
    function evidenceCount(item) {
        return unique([].concat(item && item.evidence, item && item.evidenceIds, item && item.eventIds, item && item.factIds, item && item.sourceFactIds, item && item.evidenceFactIds, item && item.familyIds, item && item.edgeIds), 200).length;
    }
    function scoreFact(fact, context) {
        const reasons = [];
        let score = 50;
        score += confidencePoints(fact.confidence, reasons);
        const ev = evidenceCount(fact) + (fact.evidenceQuote ? 1 : 0) + (fact.source && (fact.source.eventId || fact.source.chatId) ? 1 : 0);
        score += add(reasons, `${ev} 个证据 / 来源线索`, Math.min(14, ev * 3));
        const familyCount = unique(fact.familyIds).length;
        const edgeCount = unique(fact.edgeIds).length;
        if (familyCount) score += add(reasons, `连接 ${familyCount} 个记忆家族`, Math.min(8, familyCount * 2));
        if (edgeCount) score += add(reasons, `连接 ${edgeCount} 条 graph 关系`, Math.min(8, edgeCount * 1.5));
        score += statusPenalty(fact, reasons);
        score += propagationPoints(fact, reasons);
        score += sourceFreshnessPoints(fact, reasons);
        const correctionCount = asArray(context.factCorrections).filter(item => item && item.factId === fact.id && lower(item.status) === 'applied').length;
        if (correctionCount) score += add(reasons, `经过 ${correctionCount} 次人工事实修正`, Math.min(8, 3 + correctionCount));
        const conflictCount = asArray(context.conflictResolutions).filter(item => item && unique(item.factIds).includes(fact.id) && lower(item.status) === 'applied').length;
        if (conflictCount) score += add(reasons, `经过 ${conflictCount} 次冲突处理`, 5);
        return makeRecord('fact', fact, score, reasons);
    }
    function scoreFamily(family, context) {
        const reasons = [];
        let score = 52;
        score += confidencePoints(family.confidence, reasons);
        const memberIds = unique(family.factIds, 1000);
        score += add(reasons, `${memberIds.length} 条成员事实`, Math.min(18, memberIds.length * 2));
        const memberScores = memberIds.map(id => context.factScoreMap.get(id)).filter(Number.isFinite);
        if (memberScores.length) {
            const avg = memberScores.reduce((sum, item) => sum + item, 0) / memberScores.length;
            score += add(reasons, `成员事实平均信任分 ${Math.round(avg)}`, (avg - 60) / 3);
        }
        if (family.needsSummaryRefresh) score += add(reasons, '家族摘要受纠错影响，需要刷新', -15);
        score += statusPenalty(family, reasons);
        score += propagationPoints(family, reasons);
        const adjustCount = asArray(context.familyAdjustments).filter(item => item && unique(item.familyIds).includes(family.id) && lower(item.status) === 'applied').length;
        if (adjustCount) score += add(reasons, `经过 ${adjustCount} 次家族调整`, 4);
        return makeRecord('family', family, score, reasons);
    }
    function scoreEdge(edge, context) {
        const reasons = [];
        let score = 48;
        const ev = evidenceCount(edge);
        score += add(reasons, `${ev} 个事实 / 家族证据`, Math.min(18, ev * 3));
        const validation = lower(edge.validationStatus || edge.status);
        if (validation.includes('needs') || validation.includes('stale')) score += add(reasons, `关系验证状态 ${validation}`, -20);
        else if (validation.includes('active') || validation.includes('valid')) score += add(reasons, '关系状态可用', 8);
        score += propagationPoints(edge, reasons);
        score += sourceFreshnessPoints(edge, reasons);
        return makeRecord('edge', edge, score, reasons);
    }
    function scoreModel(model, context) {
        const reasons = [];
        let score = 54;
        score += confidencePoints(model.confidence, reasons);
        const ev = evidenceCount(model);
        score += add(reasons, `${ev} 个事实 / 家族 / graph 证据`, Math.min(18, ev * 2));
        if (lower(model.status) === 'active') score += add(reasons, '当前 active 模型版本', 8);
        else score += add(reasons, `模型状态 ${model.status || 'unknown'}`, -20);
        if (model.sourceStale || lower(model.reviewStatus).includes('needs')) score += add(reasons, '模型来源已被纠错影响，需要重建或复核', -22);
        score += propagationPoints(model, reasons);
        const correctionCount = asArray(context.modelCorrections).filter(item => (item.modelId === model.id || item.newModelId === model.id) && lower(item.status) === 'applied').length;
        if (correctionCount) score += add(reasons, `经过 ${correctionCount} 次模型人工修正`, 8);
        return makeRecord('model', model, score, reasons);
    }
    function makeRecord(targetType, item, rawScore, reasons) {
        const score = Math.round(clamp(rawScore, 0, 100));
        return {
            targetType,
            targetId: item && item.id || '',
            title: asText(item && (item.title || item.content || item.summary || item.type)).slice(0, 120),
            score,
            level: level(score),
            reasons: reasons.slice(0, 8),
            confidence: number(item && item.confidence, 0),
            status: item && (item.lifecycleStatus || item.status || '') || '',
            formalPromptInjection: false,
            writesLegacyMemory: false
        };
    }
    function buildMemoryTrustScorePlan(snapshot, options = {}) {
        const factLimit = number(options.factLimit, 1000) || 1000;
        const familyLimit = number(options.familyLimit, 500) || 500;
        const edgeLimit = number(options.edgeLimit, 800) || 800;
        const modelLimit = number(options.modelLimit, 120) || 120;
        const includeRetired = !!options.includeRetired;
        const context = {
            factCorrections: asArray(snapshot && snapshot.factCorrections),
            conflictResolutions: asArray(snapshot && snapshot.factConflictResolutions),
            familyAdjustments: asArray(snapshot && snapshot.familyAdjustments),
            modelCorrections: asArray(snapshot && snapshot.modelCorrections),
            factScoreMap: new Map()
        };
        const active = item => item && (includeRetired || !['retired'].includes(lower(item.status)));
        const facts = asArray(snapshot && snapshot.facts).filter(active).slice(0, factLimit);
        const factRecords = facts.map(fact => scoreFact(fact, context));
        factRecords.forEach(record => context.factScoreMap.set(record.targetId, record.score));
        const familyRecords = asArray(snapshot && snapshot.families).filter(active).slice(0, familyLimit).map(item => scoreFamily(item, context));
        const edgeRecords = asArray(snapshot && snapshot.edges).filter(active).slice(0, edgeLimit).map(item => scoreEdge(item, context));
        const modelRecords = asArray(snapshot && snapshot.models).filter(active).slice(0, modelLimit).map(item => scoreModel(item, context));
        const records = factRecords.concat(familyRecords, edgeRecords, modelRecords);
        if (!records.length) return { ok: false, status: 'nothing-to-score', errorMessage: '没有可计算信任分的记忆对象', records: [] };
        const stats = summarizeTrustRecords(records);
        return { ok: true, status: 'ready', records, stats, generatedAt: new Date().toISOString(), formalPromptInjection: false, writesLegacyMemory: false };
    }
    function summarizeTrustRecords(records) {
        const stats = { total: records.length, byType: {}, byLevel: {}, averageScore: 0, lowCount: 0 };
        let sum = 0;
        records.forEach(record => {
            sum += record.score;
            stats.byType[record.targetType] = (stats.byType[record.targetType] || 0) + 1;
            stats.byLevel[record.level] = (stats.byLevel[record.level] || 0) + 1;
            if (record.score < 62) stats.lowCount += 1;
        });
        stats.averageScore = records.length ? Math.round(sum / records.length) : 0;
        return stats;
    }
    function compactTrustRecordForList(record) {
        return {
            id: record && record.id || '',
            targetType: record && record.targetType || '',
            targetId: record && record.targetId || '',
            title: record && record.title || '',
            score: record && record.score || 0,
            level: record && record.level || '',
            reasons: asArray(record && record.reasons).slice(0, 4),
            createdAt: record && record.createdAt || ''
        };
    }
    function compactTrustRunForList(run) {
        return { id: run && run.id || '', status: run && run.status || '', averageScore: run && run.averageScore || 0, totalCount: run && run.totalCount || 0, lowCount: run && run.lowCount || 0, createdAt: run && run.createdAt || '' };
    }
    core.memoryBrain.trustScoreSemantics = { buildMemoryTrustScorePlan, summarizeTrustRecords, compactTrustRecordForList, compactTrustRunForList };
})(OwoApp);
