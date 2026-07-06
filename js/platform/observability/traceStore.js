// --- Observability trace store (v0.2.17) ---
// 统一控制台写入口：请求、发送、回复、操作、错误、诊断都先进入这里，再复用 backing requestTraceStore。
(function registerObservabilityTraceStore(global) {
    const OwoApp = global.OwoApp;
    OwoApp.platform = OwoApp.platform || {};
    OwoApp.platform.observability = OwoApp.platform.observability || {};

    const seenEventKeys = new Set();

    function baseStore() {
        return OwoApp.platform && OwoApp.platform.ai ? OwoApp.platform.ai.requestTraceStore : null;
    }

    function safeClone(value) {
        if (value === undefined) return undefined;
        if (value === null) return null;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
        try { return JSON.parse(JSON.stringify(value)); }
        catch (error) { return String(value); }
    }

    function normalizeText(value) {
        return String(value == null ? '' : value)
            .replace(/\\r\\n/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\n')
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
    }

    function compactSeenKeys() {
        if (seenEventKeys.size <= 240) return;
        const keep = Array.from(seenEventKeys).slice(-160);
        seenEventKeys.clear();
        keep.forEach(key => seenEventKeys.add(key));
    }

    function shouldSkipEvent(key) {
        if (!key) return false;
        if (seenEventKeys.has(key)) return true;
        seenEventKeys.add(key);
        compactSeenKeys();
        return false;
    }

    function errorPayload(error) {
        if (!error) return {};
        return {
            errorMessage: error.message ? String(error.message) : String(error),
            errorStack: error.stack ? String(error.stack) : ''
        };
    }

    function recordDiagnostic(meta) {
        const store = baseStore();
        if (!store || typeof store.recordDiagnostic !== 'function') return null;
        return store.recordDiagnostic(meta || {});
    }

    function recordConversationEvent(meta = {}) {
        const message = meta.message || {};
        const role = meta.role || message.role || 'event';
        const messageId = meta.messageId || message.id || '';
        const chatId = meta.chatId || '';
        const chatType = meta.chatType || '';
        const key = meta.eventKey || ['conversation', chatType, chatId, messageId, role].filter(Boolean).join(':');
        if (shouldSkipEvent(key)) return null;
        const store = baseStore();
        if (!store || typeof store.recordConversationEvent !== 'function') return recordDiagnostic({
            kind: 'conversation', status: role === 'assistant' ? 'reply' : 'message', label: meta.label || '聊天事件',
            source: meta.source || 'conversation', diagnostic: { kind: 'conversation', content: normalizeText(meta.content || message.content), event: safeClone(meta) }
        });
        return store.recordConversationEvent(Object.assign({}, meta, {
            role,
            content: normalizeText(meta.content !== undefined ? meta.content : message.content),
            messageId,
            chatId,
            chatType
        }));
    }

    function recordAppEvent(meta = {}) {
        const store = baseStore();
        const payload = Object.assign({
            kind: meta.kind || 'event',
            category: meta.category || 'event',
            status: meta.status || 'event',
            label: meta.label || '应用事件',
            source: meta.source || 'app',
            provider: meta.provider || '',
            model: meta.model || '',
            endpoint: meta.endpoint || '',
            requestBody: safeClone(meta.requestBody),
            responseJson: safeClone(meta.responseJson),
            responseBodyText: meta.responseBodyText !== undefined ? normalizeText(meta.responseBodyText) : undefined,
            errorMessage: meta.errorMessage || '',
            diagnostic: meta.diagnostic || {
                kind: meta.kind || 'app',
                sourceModule: meta.sourceModule || meta.source || 'unknown',
                event: safeClone(meta.event || meta.data || {})
            }
        }, meta);
        if (store && typeof store.recordConsoleEvent === 'function') return store.recordConsoleEvent(payload);
        return recordDiagnostic(payload);
    }

    function recordOperation(meta = {}) {
        const store = baseStore();
        const payload = Object.assign({}, meta, {
            kind: 'operation',
            category: 'operation',
            status: meta.status || 'operation',
            label: meta.label || '操作记录',
            source: meta.source || 'operation',
            event: safeClone(meta.event || meta.data || {}),
            extra: safeClone(meta.extra || {})
        });
        if (store && typeof store.recordOperation === 'function') return store.recordOperation(payload);
        return recordAppEvent(payload);
    }

    function recordOperationStart(meta = {}) {
        return recordOperation(Object.assign({}, meta, {
            status: meta.status || 'pending',
            label: meta.label || '操作开始',
            event: Object.assign({}, meta.event || meta.data || {}, { phase: 'start' })
        }));
    }

    function recordOperationSuccess(meta = {}) {
        return recordOperation(Object.assign({}, meta, {
            status: meta.status || 'success',
            label: meta.label || '操作完成',
            event: Object.assign({}, meta.event || meta.data || {}, { phase: 'success' })
        }));
    }

    function recordOperationFailure(meta = {}) {
        const err = errorPayload(meta.error);
        return recordOperation(Object.assign({}, meta, err, {
            status: 'error',
            label: meta.label || '操作失败',
            event: Object.assign({}, meta.event || meta.data || {}, { phase: 'error', errorMessage: meta.errorMessage || err.errorMessage || '' })
        }));
    }

    async function withOperation(meta, runner) {
        const startedAt = Date.now();
        recordOperationStart(Object.assign({}, meta, { startedAt }));
        try {
            const result = await runner();
            recordOperationSuccess(Object.assign({}, meta, { startedAt, completedAt: Date.now(), durationMs: Date.now() - startedAt, event: Object.assign({}, meta && (meta.event || meta.data) || {}, { result: safeClone(result) }) }));
            return result;
        } catch (error) {
            recordOperationFailure(Object.assign({}, meta, { startedAt, completedAt: Date.now(), durationMs: Date.now() - startedAt, error }));
            throw error;
        }
    }

    function normalizeTrace(raw) {
        const trace = safeClone(raw) || {};
        if (trace.kind && /^(message|reply|operation|event|request|diagnostic|error)$/.test(String(trace.kind))) {
            if (trace.content) trace.content = normalizeText(trace.content);
            if (trace.responseBodyText) trace.responseBodyText = normalizeText(trace.responseBodyText);
            return trace;
        }
        if (trace.category === 'message' || trace.category === 'reply' || trace.category === 'error' || trace.category === 'operation') {
            trace.kind = trace.category;
            if (trace.content) trace.content = normalizeText(trace.content);
            if (trace.responseBodyText) trace.responseBodyText = normalizeText(trace.responseBodyText);
            return trace;
        }
        const diagnostic = trace.diagnostic && typeof trace.diagnostic === 'object' ? trace.diagnostic : {};
        if (diagnostic.kind === 'conversation') {
            const conversation = diagnostic.conversation || {};
            const role = conversation.role || trace.role || trace.status || '';
            trace.kind = role === 'assistant' || role === 'char' || trace.status === 'reply' ? 'reply' : 'message';
            trace.chatId = conversation.chatId || trace.chatId || '';
            trace.chatType = conversation.chatType || trace.chatType || '';
            trace.chatName = conversation.chatName || trace.chatName || '';
            trace.role = role;
            trace.messageId = conversation.messageId || trace.messageId || '';
            trace.senderId = conversation.senderId || trace.senderId || '';
            trace.content = normalizeText(conversation.content !== undefined ? conversation.content : trace.content);
            trace.parts = safeClone(conversation.parts || trace.parts);
            trace.quote = safeClone(conversation.quote || trace.quote);
            trace.extra = Object.assign({}, trace.extra || {}, { sourceModule: diagnostic.sourceModule || '' });
            return trace;
        }
        if (diagnostic.kind) {
            trace.kind = diagnostic.kind === 'app' ? 'event' : diagnostic.kind;
            if (diagnostic.event && !trace.content) trace.content = normalizeText(diagnostic.event.message || diagnostic.event.content || '');
            trace.extra = Object.assign({}, trace.extra || {}, diagnostic.event ? { event: diagnostic.event } : {});
            return trace;
        }
        trace.kind = trace.fetchOptions && trace.fetchOptions.method === 'DIAGNOSTIC' ? 'diagnostic' : 'request';
        if (trace.responseBodyText) trace.responseBodyText = normalizeText(trace.responseBodyText);
        return trace;
    }

    function getRecentTraces() {
        const store = baseStore();
        const list = store && typeof store.getRecentTraces === 'function' ? store.getRecentTraces() : [];
        return list.map(normalizeTrace);
    }

    function clearTraces() {
        const store = baseStore();
        if (store && typeof store.clearTraces === 'function') store.clearTraces();
        seenEventKeys.clear();
    }

    function subscribe(listener) {
        const store = baseStore();
        return store && typeof store.subscribe === 'function' ? store.subscribe(listener) : function noop() {};
    }

    function callBase(name, args) {
        const store = baseStore();
        return store && typeof store[name] === 'function' ? store[name].apply(store, args) : null;
    }

    const traceStore = {
        trackedFetch: function trackedFetch() { return callBase('trackedFetch', arguments); },
        recordRequestStart: function recordRequestStart() { return callBase('recordRequestStart', arguments); },
        recordRequestSuccess: function recordRequestSuccess() { return callBase('recordRequestSuccess', arguments); },
        recordRequestFailure: function recordRequestFailure() { return callBase('recordRequestFailure', arguments); },
        recordDiagnostic,
        recordConversationEvent,
        recordAppEvent,
        recordOperation,
        recordOperationStart,
        recordOperationSuccess,
        recordOperationFailure,
        withOperation,
        getRecentTraces,
        clearTraces,
        subscribe,
        formatTraceForCopy: function formatTraceForCopy(trace) { return callBase('formatTraceForCopy', [trace]); },
        getMaxTraceCount: function getMaxTraceCount() { const store = baseStore(); return store && store.getMaxTraceCount ? store.getMaxTraceCount() : 160; },
        getRoutingReport: function getRoutingReport() {
            return {
                owner: 'platform/observability/traceStore',
                baseOwner: 'platform/ai/requestTraceStore',
                records: ['request', 'message', 'reply', 'operation', 'diagnostic', 'event', 'error'],
                // gate compatibility: records: ['request', 'message', 'reply', 'diagnostic', 'operation', 'event']
                operationHelpers: ['recordOperation', 'recordOperationStart', 'recordOperationSuccess', 'recordOperationFailure', 'withOperation'],
                uiOwner: 'features/quickDock -> features/debugConsole renderer'
            };
        }
    };

    OwoApp.platform.observability.traceStore = traceStore;
})(window);
