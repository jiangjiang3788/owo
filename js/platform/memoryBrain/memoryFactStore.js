// --- Memory Brain fact store owner (v0.3.5) ---
// 负责原子事实和 fact-extraction batch 写入/撤回；不扫描旧系统、不渲染 UI。
(function registerMemoryBrainFactStore(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    if (!platform || !platform.memoryBrainStore) throw new Error('[memoryFactStore] memoryBrainStore 尚未加载');

    function nowIso() { return new Date().toISOString(); }
    function nextId(prefix) { return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`; }
    function normalizeArray(value) { return Array.isArray(value) ? value : []; }
    function safeClone(value) {
        if (value === undefined) return undefined;
        if (value === null) return null;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
        try { return JSON.parse(JSON.stringify(value)); } catch (error) { return String(value); }
    }
    function clipText(value, max) {
        const text = String(value == null ? '' : value);
        return text.length > max ? text.slice(0, max) + `\n… truncated ${text.length - max} chars` : text;
    }
    function ensureState(options) { return platform.memoryBrainStore.ensureState(options || {}); }
    function saveRootState() {
        if (typeof platform.memoryBrainStore.saveRootState === 'function') return platform.memoryBrainStore.saveRootState();
        return Promise.resolve(false);
    }
    function listFacts(options = {}) {
        return normalizeArray(ensureState(options).facts).slice().sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
    }
    function factKey(fact) {
        const source = fact && fact.source || {};
        return `${source.eventId || ''}::${String(fact && fact.content || '').replace(/\s+/g, ' ').trim().toLowerCase()}`;
    }
    function normalizeStoredFact(raw, batchId, event, createdAt, state) {
        const source = raw && raw.source || {};
        const eventSource = event && event.source || {};
        const fact = Object.assign({
            id: raw && raw.id || nextId('memory-fact'),
            layer: 'fact', kind: 'atomic', status: 'active', reviewStatus: 'auto-applied-candidate',
            mode: state.settings && state.settings.mode || 'shadow',
            createdAt, updatedAt: createdAt, batchId
        }, safeClone(raw || {}));
        fact.batchId = batchId;
        fact.layer = 'fact';
        fact.kind = 'atomic';
        fact.status = fact.status === 'retired' ? 'retired' : 'active';
        fact.reviewStatus = fact.reviewStatus || 'auto-applied-candidate';
        fact.mode = state.settings && state.settings.mode || 'shadow';
        fact.createdAt = fact.createdAt || createdAt;
        fact.updatedAt = createdAt;
        fact.source = Object.assign({}, source, {
            eventId: source.eventId || event && event.id || '',
            eventTitle: source.eventTitle || event && event.title || '',
            eventBatchId: source.eventBatchId || event && event.batchId || '',
            chatId: source.chatId || eventSource.chatId || '',
            chatType: source.chatType || eventSource.chatType || '',
            chatName: source.chatName || eventSource.chatName || '',
            startIndex: source.startIndex || eventSource.startIndex || null,
            endIndex: source.endIndex || eventSource.endIndex || null,
            messageCount: source.messageCount || eventSource.messageCount || 0,
            startTimestamp: source.startTimestamp || eventSource.startTimestamp || null,
            endTimestamp: source.endTimestamp || eventSource.endTimestamp || null
        });
        return fact;
    }
    function appendFactExtractionBatch(payload = {}, options = {}) {
        const state = ensureState(options);
        const createdAt = nowIso();
        const batchId = payload.batchId || nextId('memory-brain-batch');
        const event = payload.event || null;
        const diagnostics = normalizeArray(payload.parserDiagnostics);
        const existingKeys = new Set(normalizeArray(state.facts).filter(item => item && item.status !== 'retired').map(factKey));
        const newKeys = new Set();
        const facts = [];
        normalizeArray(payload.facts).forEach(rawFact => {
            const fact = normalizeStoredFact(rawFact, batchId, event, createdAt, state);
            const key = factKey(fact);
            if (!fact.content) return;
            if (existingKeys.has(key) || newKeys.has(key)) {
                diagnostics.push('duplicate_fact_skipped: ' + fact.content.slice(0, 80));
                return;
            }
            newKeys.add(key);
            facts.push(fact);
        });
        if (facts.length) {
            const ids = new Set(facts.map(fact => fact.id));
            state.facts = facts.concat(normalizeArray(state.facts).filter(item => item && !ids.has(item.id)));
        }
        const batch = {
            id: batchId,
            kind: 'fact-extraction',
            status: facts.length ? 'applied' : (payload.errorMessage ? 'error' : 'skipped'),
            createdAt,
            updatedAt: createdAt,
            mode: state.settings && state.settings.mode || 'shadow',
            input: safeClone(payload.input || {}),
            rawOutput: clipText(payload.rawOutput, 16000),
            parsedDrafts: safeClone(payload.parsedDrafts || []),
            parserDiagnostics: diagnostics,
            eventIds: event && event.id ? [event.id] : [],
            factIds: facts.map(fact => fact.id),
            errorMessage: payload.errorMessage || ''
        };
        state.batches = normalizeArray(state.batches).filter(item => item && item.id !== batch.id);
        state.batches.unshift(batch);
        state.updatedAt = createdAt;
        saveRootState();
        return safeClone({ batch, facts });
    }
    function retireFact(factId, reason = 'user-retired', options = {}) {
        const state = ensureState(options);
        const fact = normalizeArray(state.facts).find(item => item && item.id === factId);
        if (!fact) return null;
        const updatedAt = nowIso();
        fact.status = 'retired';
        fact.reviewStatus = reason;
        fact.retiredAt = updatedAt;
        fact.updatedAt = updatedAt;
        state.batches.unshift({ id: nextId('memory-brain-batch'), kind: 'fact-retire', status: 'applied', createdAt: updatedAt, updatedAt, mode: state.settings && state.settings.mode || 'shadow', factIds: [fact.id], reason });
        state.updatedAt = updatedAt;
        saveRootState();
        return safeClone(fact);
    }
    function rollbackBatch(batchId, options = {}) {
        const state = ensureState(options);
        const batch = normalizeArray(state.batches).find(item => item && item.id === batchId);
        if (!batch || batch.kind !== 'fact-extraction') return { ok: false, rolledBackFacts: 0, reason: 'batch_not_found_or_not_fact_extraction' };
        const ids = new Set(normalizeArray(batch.factIds));
        let rolledBackFacts = 0;
        const updatedAt = nowIso();
        normalizeArray(state.facts).forEach(fact => {
            if (fact && ids.has(fact.id) && fact.status !== 'retired') {
                fact.status = 'retired';
                fact.reviewStatus = 'batch-rolled-back';
                fact.retiredAt = updatedAt;
                fact.updatedAt = updatedAt;
                rolledBackFacts += 1;
            }
        });
        batch.status = 'rolled-back';
        batch.rollbackAt = updatedAt;
        batch.updatedAt = updatedAt;
        state.updatedAt = updatedAt;
        saveRootState();
        return { ok: true, batchId, rolledBackFacts };
    }
    function getRoutingReport() {
        return {
            owner: 'platform/memoryBrain/memoryFactStore',
            release: 'v0.3.7',
            factWrite: 'memoryBrain.facts + memoryBrain.batches only',
            legacyMode: 'read-only-source',
            noDualWrite: true
        };
    }

    platform.memoryFactStore = { listFacts, appendFactExtractionBatch, retireFact, rollbackBatch, getRoutingReport };
})(window);
