// --- Memory Brain embedding service owner (v0.3.5) ---
// 负责给 memoryBrain facts 补向量；失败时只返回诊断，由 familyService 继续关键词 fallback。
(function registerMemoryBrainEmbeddingService(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryEmbeddingService] memoryBrainStore 尚未加载');

    function nowIso() { return new Date().toISOString(); }
    function asArray(value) { return Array.isArray(value) ? value : []; }
    function asText(value) { return String(value == null ? '' : value).trim(); }
    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() {
        if (typeof platform.memoryBrainStore.saveRootState === 'function') return platform.memoryBrainStore.saveRootState();
        return Promise.resolve(false);
    }
    function getEmbeddingAdapter() {
        return app.platform && app.platform.ai && app.platform.ai.embeddingAdapter;
    }
    function buildFactVectorText(fact) {
        const labels = asArray(fact && fact.labels).join('、');
        const keywords = asArray(fact && fact.keywords).join('、');
        return [
            fact && fact.content,
            fact && fact.factType ? `类型：${fact.factType}` : '',
            labels ? `标签：${labels}` : '',
            keywords ? `关键词：${keywords}` : '',
            fact && fact.object ? `对象：${fact.object}` : ''
        ].map(asText).filter(Boolean).join('\n');
    }
    function factsNeedingVectors(state, limit) {
        return asArray(state.facts).filter(fact => fact && fact.status !== 'retired' && fact.content && (!Array.isArray(fact.vector) || !fact.vector.length)).slice(0, limit || 24);
    }
    async function ensureFactEmbeddings(options = {}) {
        const state = ensureState(options);
        const adapter = getEmbeddingAdapter();
        const targets = factsNeedingVectors(state, Math.max(1, Number(options.limit) || 24));
        if (!targets.length) return { ok: true, embedded: 0, skipped: 0, reason: 'no_missing_fact_vectors' };
        if (!adapter || typeof adapter.fetchEmbeddings !== 'function') return { ok: false, embedded: 0, skipped: targets.length, reason: 'embedding_adapter_missing' };
        try {
            const texts = targets.map(buildFactVectorText);
            const vectors = await adapter.fetchEmbeddings(texts, { state: options.state || global.db });
            const updatedAt = nowIso();
            let embedded = 0;
            targets.forEach((fact, index) => {
                const vector = vectors[index];
                if (Array.isArray(vector) && vector.length) {
                    fact.vector = vector;
                    fact.vectorText = texts[index];
                    fact.vectorUpdatedAt = updatedAt;
                    embedded += 1;
                }
            });
            state.updatedAt = updatedAt;
            saveRootState();
            return { ok: embedded > 0, embedded, skipped: targets.length - embedded, reason: embedded ? '' : 'empty_vectors' };
        } catch (error) {
            return { ok: false, embedded: 0, skipped: targets.length, reason: error.message || 'embedding_failed' };
        }
    }
    function computeCentroid(vectors) {
        const list = asArray(vectors).filter(vector => Array.isArray(vector) && vector.length);
        if (!list.length) return [];
        const length = list[0].length;
        if (!length || list.some(vector => vector.length !== length)) return [];
        const output = new Array(length).fill(0);
        list.forEach(vector => vector.forEach((value, index) => { output[index] += Number(value) || 0; }));
        return output.map(value => value / list.length);
    }
    function refreshFamilyVectors(familyIds, options = {}) {
        const state = ensureState(options);
        const ids = new Set(asArray(familyIds));
        const factsById = new Map(asArray(state.facts).map(fact => [fact && fact.id, fact]));
        let updated = 0;
        asArray(state.families).forEach(family => {
            if (!family || family.status === 'retired' || (ids.size && !ids.has(family.id))) return;
            const vectors = asArray(family.factIds).map(id => factsById.get(id)).map(fact => fact && fact.vector).filter(Boolean);
            const centroid = computeCentroid(vectors);
            if (centroid.length) { family.vector = centroid; family.vectorUpdatedAt = nowIso(); updated += 1; }
        });
        if (updated) { state.updatedAt = nowIso(); saveRootState(); }
        return { ok: true, updated };
    }
    function getRoutingReport() {
        return {
            owner: 'platform/memoryBrain/memoryEmbeddingService',
            release: 'v0.3.7',
            embeddingOwner: 'platform/ai/embeddingAdapter',
            fallback: 'familyService continues with keywords when embedding fails',
            noDualWrite: true
        };
    }

    platform.memoryEmbeddingService = { ensureFactEmbeddings, refreshFamilyVectors, buildFactVectorText, computeCentroid, getRoutingReport };
})(window);
