// --- Memory Brain graph service owner (v0.3.5) ---
// 编排 facts / families → graph edges；不渲染 DOM、不生成长期模型、不改正式注入路径。
(function registerMemoryBrainGraphService(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    function asArray(value) { return Array.isArray(value) ? value : []; }
    function rootState(options) { return (options && options.state) || global.db || {}; }
    function getCoreApi() { return app.core.memoryBrain.publicApi; }
    function getPlatformApi() { return app.platform.memoryBrain.publicApi; }
    function record(label, data, level) {
        if (feature.service && typeof feature.service.recordOperation === 'function') return feature.service.recordOperation(label, data || {}, level || 'event');
        return null;
    }
    function clip(value, max) {
        const text = String(value == null ? '' : value);
        return text.length > max ? text.slice(0, max - 1) + '…' : text;
    }
    function buildInput(snapshot, drafts, options) {
        return {
            factCount: asArray(snapshot.facts).filter(fact => fact && fact.status !== 'retired').length,
            familyCount: asArray(snapshot.families).filter(family => family && family.status !== 'retired').length,
            existingEdgeCount: asArray(snapshot.edges).filter(edge => edge && edge.status !== 'retired').length,
            draftCount: drafts.length,
            maxEdges: Number(options.maxEdges) || 160,
            rebuild: Boolean(options.rebuild),
            sampleDrafts: drafts.slice(0, 10).map(edge => ({ relation: edge.relation, source: clip(edge.sourceLabel, 60), target: clip(edge.targetLabel, 60), weight: edge.weight }))
        };
    }
    async function buildGraph(options = {}) {
        const state = rootState(options);
        const platformApi = getPlatformApi();
        const coreApi = getCoreApi();
        const snapshot = platformApi.getSnapshot({ state });
        const activeFacts = asArray(snapshot.facts).filter(fact => fact && fact.status !== 'retired' && fact.content);
        const activeFamilies = asArray(snapshot.families).filter(family => family && family.status !== 'retired');
        if (!activeFacts.length) throw new Error('还没有原子事实。请先从事件提取事实。');
        if (!activeFamilies.length) throw new Error('还没有记忆家族。请先整理记忆家族，再建立 graph。');
        const drafts = coreApi.buildGraphEdges(activeFacts, activeFamilies, asArray(snapshot.edges), {
            maxEdges: Number(options.maxEdges) || 160,
            rebuild: Boolean(options.rebuild)
        });
        const input = buildInput(snapshot, drafts, options);
        record('记忆脑 graph 整理输入', input);
        if (!drafts.length) {
            const stored = platformApi.appendGraphLinkingBatch({ input, parserDiagnostics: ['no_graph_edges'], errorMessage: '没有新的 graph 关系候选' }, { state });
            record('记忆脑 graph 整理应用结果', { batchId: stored.batch && stored.batch.id, edgeCount: 0, diagnostics: ['no_graph_edges'] }, 'event');
            return Object.assign({ diagnostics: ['no_graph_edges'] }, stored);
        }
        const normalized = drafts.map(edge => coreApi.normalizeGraphEdgeDraft(edge));
        const stored = platformApi.appendGraphLinkingBatch({ input, parsedDrafts: normalized, edges: normalized }, { state });
        record('记忆脑 graph 整理应用结果', {
            batchId: stored.batch && stored.batch.id,
            edgeCount: stored.edges && stored.edges.length || 0,
            changedNodes: stored.changedNodes || 0,
            relationTypes: Array.from(new Set(normalized.map(edge => edge.relation))).slice(0, 12)
        }, stored.edges && stored.edges.length ? 'success' : 'event');
        return stored;
    }
    function getGraphCards(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        return getCoreApi().compactGraphForList(asArray(snapshot.edges), asArray(snapshot.facts), asArray(snapshot.families), options);
    }
    function retireEdge(edgeId, options = {}) {
        const edge = getPlatformApi().retireEdge(edgeId, 'user-retired-from-memory-brain-graph', options);
        record('记忆脑 graph 关系撤回', { edgeId, ok: Boolean(edge) }, edge ? 'success' : 'error');
        return edge;
    }
    function rollbackLatestGraphBatch(options = {}) {
        const snapshot = getPlatformApi().getSnapshot(options);
        const batch = asArray(snapshot.batches).find(item => item && item.kind === 'graph-linking' && item.status === 'applied' && asArray(item.edgeIds).length);
        if (!batch) throw new Error('没有可撤回的 graph 整理批次。');
        const result = getPlatformApi().rollbackGraphBatch(batch.id, options);
        record('记忆脑 graph 批次回滚', result, result.ok ? 'success' : 'error');
        return result;
    }

    feature.graphService = { buildGraph, getGraphCards, retireEdge, rollbackLatestGraphBatch };
})(window);
