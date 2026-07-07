// --- Memory Brain history model rebuild semantics owner (v0.4.7) ---
// 纯语义：筛选全历史证据、生成长期模型重建 prompt、压缩运行卡片；不访问 DOM / fetch / store。
(function registerHistoryModelRebuildSemantics(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function asText(value) { return String(value == null ? '' : value).trim(); }
    function clip(value, max) { const text = asText(value).replace(/\r\n/g, '\n').replace(/\r/g, '\n'); return text.length > max ? text.slice(0, max - 1) + '…' : text; }
    function isEligibleFact(fact) {
        if (!fact || fact.status === 'retired') return false;
        const status = String(fact.lifecycleStatus || fact.status || 'active');
        return !['duplicate', 'obsolete', 'disputed', 'merged', 'retired'].includes(status);
    }
    function scoreFact(fact) {
        const confidence = Number(fact && fact.confidence) || 0.5;
        const weight = Number(fact && fact.weight) || 0;
        const activation = Number(fact && fact.activation) || 0;
        const evidence = asArray(fact && fact.evidence).length + asArray(fact && fact.source && fact.source.eventIds).length;
        return confidence * 4 + weight + activation + Math.min(evidence, 8) * 0.2;
    }
    function summarizeFacts(facts) {
        const activeFacts = asArray(facts).filter(fact => fact && fact.status !== 'retired');
        const eligibleFacts = activeFacts.filter(isEligibleFact);
        return {
            activeFactCount: activeFacts.length,
            eligibleFactCount: eligibleFacts.length,
            excludedFactCount: activeFacts.length - eligibleFacts.length,
            duplicateCount: activeFacts.filter(fact => fact && fact.lifecycleStatus === 'duplicate').length,
            obsoleteCount: activeFacts.filter(fact => fact && fact.lifecycleStatus === 'obsolete').length,
            disputedCount: activeFacts.filter(fact => fact && fact.lifecycleStatus === 'disputed').length
        };
    }
    function sortFacts(list) {
        return asArray(list).slice().sort((a, b) => scoreFact(b) - scoreFact(a) || String(b.updatedAt || b.createdAt || '').localeCompare(String(a.updatedAt || a.createdAt || '')));
    }
    function buildHistoryModelEvidence(snapshot, options = {}) {
        const factLimit = Math.max(12, Math.min(320, Number(options.maxFacts) || 160));
        const familyLimit = Math.max(6, Math.min(80, Number(options.maxFamilies) || 42));
        const edgeLimit = Math.max(12, Math.min(220, Number(options.maxEdges) || 120));
        const eligibleFacts = sortFacts(asArray(snapshot && snapshot.facts).filter(isEligibleFact));
        const eligibleIds = new Set(eligibleFacts.map(fact => fact && fact.id).filter(Boolean));
        const families = asArray(snapshot && snapshot.families).filter(family => family && family.status !== 'retired')
            .filter(family => asArray(family.factIds).some(id => eligibleIds.has(id)))
            .sort((a, b) => asArray(b.factIds).length - asArray(a.factIds).length || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
        const edges = asArray(snapshot && snapshot.edges).filter(edge => edge && edge.status !== 'retired')
            .filter(edge => asArray(edge.evidenceFactIds).some(id => eligibleIds.has(id)) || eligibleIds.has(edge.sourceId) || eligibleIds.has(edge.targetId))
            .sort((a, b) => (Number(b.weight) || 0) - (Number(a.weight) || 0) || String(b.updatedAt || '').localeCompare(String(a.updatedAt || '')));
        const selectedFacts = eligibleFacts.slice(0, factLimit);
        const selectedFamilies = families.slice(0, familyLimit);
        const selectedEdges = edges.slice(0, edgeLimit);
        return {
            snapshot: { facts: selectedFacts, families: selectedFamilies, edges: selectedEdges, models: asArray(snapshot && snapshot.models) },
            summary: Object.assign(summarizeFacts(snapshot && snapshot.facts), {
                selectedFactCount: selectedFacts.length,
                selectedFamilyCount: selectedFamilies.length,
                selectedEdgeCount: selectedEdges.length,
                totalFamilyCount: families.length,
                totalEdgeCount: edges.length,
                maxFacts: factLimit,
                maxFamilies: familyLimit,
                maxEdges: edgeLimit
            })
        };
    }
    function joinKeywords(item, limit) { return asArray(item && item.keywords).concat(asArray(item && item.labels)).filter(Boolean).slice(0, limit || 6).join('/'); }
    function evidenceLines(evidence) {
        const snapshot = evidence && evidence.snapshot || {};
        return {
            facts: asArray(snapshot.facts).map(fact => `FACT ${fact.id}: ${clip(fact.content, 190)}｜type=${asText(fact.factType)}｜spo=${clip([fact.subject, fact.predicate, fact.object].filter(Boolean).join(' / '), 120)}｜keywords=${joinKeywords(fact, 5)}`),
            families: asArray(snapshot.families).map(family => `FAMILY ${family.id}: ${clip(family.title, 80)}｜${clip(family.summary, 220)}｜facts=${asArray(family.factIds).slice(0, 10).join(',')}`),
            edges: asArray(snapshot.edges).map(edge => `EDGE ${edge.id}: ${clip(edge.sourceLabel || edge.sourceId, 70)} --${clip(edge.relationLabel || edge.relation, 40)}--> ${clip(edge.targetLabel || edge.targetId, 70)}｜facts=${asArray(edge.evidenceFactIds).slice(0, 8).join(',')}`)
        };
    }
    function buildHistoryModelRebuildPrompt(evidence) {
        const lines = evidenceLines(evidence || {});
        const types = 'user-profile、ai-self、world-model、project-brain、interaction-preferences、relationship-continuity';
        return [
            '你是 OWO 小手机 App 的 Memory Brain 全历史长期模型重建器。',
            '任务：基于已清理的全历史 facts、families、graph 关系，重建长期模型。不要写正式 prompt 注入，不要修改旧档案记忆。',
            `必须输出 6 个模型：${types}。`,
            '原则：只依据证据；不要把一次情绪永久化；历史更晚且更明确的事实优先；冲突和不确定性写入 openQuestions / sourceReason。',
            'interaction-preferences 用来记录用户喜欢/不喜欢怎样被回应；relationship-continuity 用来记录双方长期关系节点、相处公约和连续性。',
            '',
            '只输出 JSON，不要 markdown。JSON schema：',
            '{ "models": [{ "type": "user-profile|ai-self|world-model|project-brain|interaction-preferences|relationship-continuity", "title": "标题", "summary": "长期理解摘要", "stableTraits": [], "preferences": [], "boundaries": [], "relationshipNotes": [], "projectDecisions": [], "openQuestions": [], "keywords": [], "labels": [], "evidenceFactIds": [], "familyIds": [], "edgeIds": [], "confidence": 0.8, "sourceReason": "证据和不确定性" }] }',
            '', 'EVIDENCE SUMMARY:', JSON.stringify(evidence && evidence.summary || {}),
            '', 'FACTS:', lines.facts.join('\n') || '无',
            '', 'FAMILIES:', lines.families.join('\n') || '无',
            '', 'GRAPH EDGES:', lines.edges.join('\n') || '无'
        ].join('\n');
    }
    function compactHistoryModelRebuildRunForList(run) {
        const summary = run && run.evidenceSummary || {};
        return {
            id: run && run.id,
            status: run && run.status || 'unknown',
            createdAt: run && run.createdAt || '',
            modelBatchId: run && run.modelBatchId || '',
            modelCount: asArray(run && run.modelIds).length,
            modelTypes: asArray(run && run.modelTypes).slice(0, 8),
            diagnostics: asArray(run && run.diagnostics).slice(0, 6),
            evidenceSummary: summary
        };
    }
    core.memoryBrain.historyModelRebuildSemantics = { isEligibleFact, buildHistoryModelEvidence, buildHistoryModelRebuildPrompt, compactHistoryModelRebuildRunForList };
})(OwoApp);
