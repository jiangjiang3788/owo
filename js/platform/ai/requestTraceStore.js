// --- Unified console trace store (v0.2.17 canonical backing store) ---
// 平台层只记录请求 / 发送 / 回复 / 操作 / 诊断 / 错误；不渲染 UI、不处理业务语义。
(function registerAiRequestTraceStore(global) {
    const OwoApp = global.OwoApp;
    const ai = OwoApp.platform.ai;
    const MAX_TRACE_COUNT = 160;
    const MAX_CAPTURE_CHARS = 2000000;
    let sequence = 0;
    const traces = [];
    const listeners = [];

    function nowIso() { return new Date().toISOString(); }
    function nextTraceId(prefix) {
        sequence += 1;
        return (prefix || 'console') + '-' + Date.now().toString(36) + '-' + sequence.toString(36);
    }
    function safeJsonClone(value) {
        if (value === undefined) return undefined;
        if (value === null) return null;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
        try { return JSON.parse(JSON.stringify(value)); } catch (error) { return String(value); }
    }
    function redactSecret(value) {
        const text = String(value || '');
        if (!text) return text;
        if (/^bearer\s+/i.test(text)) return 'Bearer ***redacted***';
        if (text.length <= 8) return '***redacted***';
        return text.slice(0, 4) + '***redacted***' + text.slice(-4);
    }
    function sanitizeEndpoint(endpoint) {
        return String(endpoint || '').replace(/([?&](?:key|api_key|apikey|token|access_token)=)([^&#]+)/gi, '$1***redacted***');
    }
    function sanitizeHeaders(headers) {
        if (!headers) return {};
        const output = {};
        const assign = (key, value) => {
            const name = String(key || '');
            if (!name) return;
            output[name] = /authorization|api-key|apikey|token|secret/i.test(name) ? redactSecret(value) : String(value);
        };
        if (typeof Headers !== 'undefined' && headers instanceof Headers) {
            headers.forEach((value, key) => assign(key, value));
        } else if (Array.isArray(headers)) {
            headers.forEach(item => Array.isArray(item) && assign(item[0], item[1]));
        } else if (typeof headers === 'object') {
            Object.keys(headers).forEach(key => assign(key, headers[key]));
        }
        return output;
    }
    function extractRequestBody(fetchOptions, explicitBody) {
        if (explicitBody !== undefined) return safeJsonClone(explicitBody);
        const body = fetchOptions && fetchOptions.body;
        if (body === undefined || body === null) return undefined;
        if (typeof body !== 'string') return '[non-string body]';
        try { return JSON.parse(body); } catch (error) { return body; }
    }
    function createFetchOptionsSnapshot(fetchOptions) {
        const options = fetchOptions && typeof fetchOptions === 'object' ? fetchOptions : {};
        return { method: options.method || 'GET', headers: sanitizeHeaders(options.headers), hasSignal: Boolean(options.signal), credentials: options.credentials, mode: options.mode };
    }
    function limitText(text) {
        const value = String(text || '');
        if (value.length <= MAX_CAPTURE_CHARS) return { text: value, truncated: false, originalLength: value.length };
        return { text: value.slice(0, MAX_CAPTURE_CHARS), truncated: true, originalLength: value.length };
    }
    function parseJsonMaybe(text) {
        if (!text || typeof text !== 'string') return undefined;
        const trimmed = text.trim();
        if (!trimmed || !/^[\[{]/.test(trimmed)) return undefined;
        try { return JSON.parse(trimmed); } catch (error) { return undefined; }
    }
    function redactProviderPrivateFields(value) {
        if (value === undefined || value === null) return value;
        if (typeof value !== 'object') return value;
        if (Array.isArray(value)) return value.map(redactProviderPrivateFields);
        const output = {};
        Object.keys(value).forEach(key => {
            if (/reasoning|chain_of_thought|thoughts/i.test(key)) {
                const raw = value[key] == null ? '' : String(value[key]);
                output[key] = raw ? `[redacted:${raw.length} chars]` : '';
                return;
            }
            output[key] = redactProviderPrivateFields(value[key]);
        });
        return output;
    }
    function compactBatchMetadata(metadata) {
        if (!metadata || typeof metadata !== 'object') return metadata || {};
        const output = safeJsonClone(metadata) || {};
        if (output.strippedProviderJson) output.strippedProviderJson = '[omitted: provider raw payload is kept only in the AI Request trace]';
        if (output.rawResponse) output.rawResponse = '[omitted: raw response is kept only in the AI Request trace]';
        if (output.responseJson) output.responseJson = '[omitted: response JSON is kept only in the AI Request trace]';
        return output;
    }
    function previewBatchContent(batch) {
        const text = String(batch && batch.content || '');
        const lines = text.split(/\n+/).map(line => line.trim()).filter(Boolean);
        const preview = lines.slice(0, 12).join('\n');
        return lines.length > 12 ? preview + `\n... [omitted ${lines.length - 12} more lines in console preview]` : preview;
    }
    function compactBatchForTrace(batch) {
        const source = batch || {};
        return {
            id: source.id || '', kind: 'ai-response-batch', status: source.status || 'success', source: source.source || 'ai.responseBatch',
            label: source.label || 'AI 回复批次', provider: source.provider || '', model: source.model || '', requestTraceId: source.requestTraceId || '',
            chatId: source.chatId || '', chatType: source.chatType || '', startedAt: source.startedAt, completedAt: source.completedAt, durationMs: source.durationMs,
            messageCount: source.messageCount || 0, usage: safeJsonClone(source.usage), metadata: compactBatchMetadata(source.metadata), childConsolePolicy: 'single-batch-card'
        };
    }
    function findAiResponseBatchTrace(batchId) {
        const id = String(batchId || '');
        if (!id) return null;
        return traces.find(trace => (trace.responseBatch && trace.responseBatch.id === id) || (trace.event && trace.event.id === id) || trace.id === id) || null;
    }
    function findConversationTrace(messageId, category) {
        const id = String(messageId || '');
        if (!id) return null;
        return traces.find(trace => (trace.category === category || trace.kind === category) && ((trace.message && trace.message.id === id) || trace.messageId === id)) || null;
    }
    function notify() {
        const snapshot = getRecentTraces();
        listeners.slice().forEach(listener => {
            try { listener(snapshot); } catch (error) { console.warn('[requestTraceStore] listener failed:', error); }
        });
    }
    function upsertTrace(trace) {
        traces.unshift(trace);
        while (traces.length > MAX_TRACE_COUNT) traces.pop();
        notify();
        return trace;
    }
    function findTrace(traceId) { return traces.find(trace => trace.id === traceId) || null; }
    function baseTrace(meta, kind, category, prefix) {
        const createdAt = Number(meta.startedAt || meta.timestamp) || Date.now();
        return {
            id: nextTraceId(prefix || category || kind),
            kind: kind || category || 'event',
            category: category || kind || 'event',
            status: meta.status || category || kind || 'event',
            label: meta.label || '控制台记录',
            source: meta.source || 'unknown',
            provider: meta.provider || '',
            model: meta.model || '',
            endpoint: sanitizeEndpoint(meta.endpoint || ''),
            startedAt: createdAt,
            startedAtIso: meta.startedAtIso || new Date(createdAt).toISOString(),
            completedAt: Number(meta.completedAt) || createdAt,
            completedAtIso: meta.completedAtIso || new Date(Number(meta.completedAt) || createdAt).toISOString(),
            durationMs: Number.isFinite(meta.durationMs) ? meta.durationMs : 0
        };
    }

    function recordRequestStart(meta = {}) {
        const fetchOptions = meta.fetchOptions || {};
        const startedAt = Date.now();
        return upsertTrace({
            id: nextTraceId('request'), kind: 'request', category: 'request', status: 'pending',
            label: meta.label || meta.source || 'AI/API 请求', source: meta.source || 'unknown',
            provider: meta.provider || '', model: meta.model || '', stream: Boolean(meta.stream), endpoint: sanitizeEndpoint(meta.endpoint),
            fetchOptions: createFetchOptionsSnapshot(fetchOptions), requestBody: extractRequestBody(fetchOptions, meta.requestBody),
            startedAt, startedAtIso: nowIso()
        });
    }
    function recordRequestSuccess(traceId, payload = {}) {
        const trace = findTrace(traceId);
        if (!trace) return null;
        const completedAt = Date.now();
        trace.status = payload.responseOk === false ? 'http_error' : 'success';
        trace.completedAt = completedAt;
        trace.completedAtIso = nowIso();
        trace.durationMs = completedAt - trace.startedAt;
        trace.responseStatus = payload.responseStatus;
        trace.responseOk = payload.responseOk;
        trace.responseHeaders = sanitizeHeaders(payload.responseHeaders);
        if (payload.responseText !== undefined) {
            const limited = limitText(payload.responseText);
            const parsed = parseJsonMaybe(limited.text);
            const redactedJson = redactProviderPrivateFields(parsed);
            trace.responseBodyText = redactedJson ? JSON.stringify(redactedJson) : limited.text;
            trace.responseBodyTruncated = limited.truncated;
            trace.responseBodyOriginalLength = limited.originalLength;
            trace.responseJson = redactedJson;
            trace.providerPrivateFieldsRedacted = !!(parsed && JSON.stringify(parsed) !== JSON.stringify(redactedJson));
        }
        if (payload.captureError) trace.captureError = String(payload.captureError.message || payload.captureError);
        notify();
        return safeJsonClone(trace);
    }
    function recordRequestFailure(traceId, error) {
        const trace = findTrace(traceId);
        if (!trace) return null;
        const completedAt = Date.now();
        trace.kind = 'request';
        trace.category = 'error';
        trace.status = 'error';
        trace.completedAt = completedAt;
        trace.completedAtIso = nowIso();
        trace.durationMs = completedAt - trace.startedAt;
        trace.errorMessage = error && error.message ? error.message : String(error || 'Unknown error');
        trace.errorStack = error && error.stack ? String(error.stack) : '';
        notify();
        return safeJsonClone(trace);
    }
    function recordDiagnostic(meta = {}) {
        const trace = baseTrace(meta, meta.kind || 'diagnostic', meta.category || 'diagnostic', 'diagnostic');
        Object.assign(trace, {
            label: meta.label || '诊断记录',
            fetchOptions: { method: 'DIAGNOSTIC', headers: {} },
            requestBody: safeJsonClone(meta.requestBody), diagnostic: safeJsonClone(meta.diagnostic), responseJson: safeJsonClone(meta.responseJson),
            responseBodyText: meta.responseBody !== undefined ? limitText(meta.responseBody).text : meta.responseBodyText,
            errorMessage: meta.errorMessage || ''
        });
        return safeJsonClone(upsertTrace(trace));
    }
    function recordConsoleEvent(meta = {}) {
        const category = meta.category || meta.eventType || meta.kind || 'event';
        const trace = baseTrace(meta, meta.kind || category, category, category);
        Object.assign(trace, {
            fetchOptions: meta.fetchOptions ? createFetchOptionsSnapshot(meta.fetchOptions) : { method: meta.method || 'EVENT', headers: sanitizeHeaders(meta.headers) },
            requestBody: safeJsonClone(meta.requestBody), responseJson: safeJsonClone(meta.responseJson),
            responseBodyText: meta.responseBodyText !== undefined ? String(meta.responseBodyText) : (meta.responseBody !== undefined ? limitText(meta.responseBody).text : undefined),
            diagnostic: safeJsonClone(meta.diagnostic), event: safeJsonClone(meta.event), message: safeJsonClone(meta.message), content: meta.content !== undefined ? String(meta.content) : undefined,
            parts: safeJsonClone(meta.parts), extra: safeJsonClone(meta.extra), errorMessage: meta.errorMessage || '', errorStack: meta.errorStack || '',
            role: meta.role || '', chatId: meta.chatId || '', chatType: meta.chatType || '', messageId: meta.messageId || '', senderId: meta.senderId || ''
        });
        return safeJsonClone(upsertTrace(trace));
    }
    function recordConversationEvent(meta = {}) {
        if (meta.suppressConsoleTrace || (meta.message && meta.message.suppressConsoleTrace)) return null;
        const role = String(meta.role || (meta.message && meta.message.role) || '').toLowerCase();
        const category = role === 'assistant' || role === 'char' || role === 'ai' ? 'reply' : role === 'user' ? 'message' : 'event';
        const messageId = meta.messageId || (meta.message && meta.message.id) || '';
        const existing = findConversationTrace(messageId, category);
        if (existing) return safeJsonClone(existing);
        return recordConsoleEvent(Object.assign({}, meta, {
            kind: category,
            category,
            status: category,
            label: meta.label || (category === 'reply' ? 'AI 回复消息' : category === 'message' ? '用户发送消息' : '聊天事件'),
            source: meta.source || 'conversation',
            content: meta.content !== undefined ? meta.content : (meta.message && meta.message.content),
            message: meta.message || { id: meta.messageId || '', role, senderId: meta.senderId || '', chatId: meta.chatId || '', chatType: meta.chatType || '', timestamp: meta.timestamp || Date.now() }
        }));
    }
    function recordAiResponseBatch(meta = {}) {
        const batch = meta.batch || meta;
        const batchId = batch.id || meta.id || '';
        const existing = findAiResponseBatchTrace(batchId);
        if (existing) return safeJsonClone(existing);
        const compactMetadata = compactBatchMetadata(batch.metadata);
        const trace = recordConsoleEvent({
            kind: 'response',
            category: 'response',
            status: batch.status || 'success',
            label: batch.label || 'AI 回复批次',
            source: batch.source || 'ai.responseBatch',
            provider: batch.provider || meta.provider || '',
            model: batch.model || meta.model || '',
            chatId: batch.chatId || meta.chatId || '',
            chatType: batch.chatType || meta.chatType || '',
            startedAt: batch.startedAt || meta.startedAt,
            completedAt: batch.completedAt || meta.completedAt,
            durationMs: Number(batch.durationMs || meta.durationMs || 0),
            content: previewBatchContent(batch),
            message: {
                id: batchId, role: 'assistant', chatId: batch.chatId || meta.chatId || '', chatType: batch.chatType || meta.chatType || '', timestamp: batch.completedAt || Date.now()
            },
            event: {
                kind: 'ai-response-batch', id: batchId, requestTraceId: batch.requestTraceId || '', messageCount: batch.messageCount || 0, childConsolePolicy: 'single-batch-card'
            },
            responseJson: redactProviderPrivateFields({
                usage: batch.usage,
                messages: batch.messages,
                metadata: compactMetadata,
                requestTraceId: batch.requestTraceId
            }),
            diagnostic: {
                hasReasoning: !!(batch.metadata && batch.metadata.hasReasoning),
                reasoningLength: batch.metadata && batch.metadata.reasoningLength || 0,
                reasoningRedacted: !!(batch.metadata && batch.metadata.reasoningRedacted),
                messageCount: batch.messageCount || 0,
                policy: '多条 AI 回复合并为一个控制台批次；子消息不再单独生成控制台记录'
            }
        });
        trace.responseBatch = compactBatchForTrace(batch);
        return trace;
    }
    function recordOperation(meta = {}) { return recordConsoleEvent(Object.assign({ kind: 'operation', category: 'operation', status: 'operation', label: '操作记录' }, meta)); }
    function recordErrorEvent(meta = {}) {
        const error = meta.error || {};
        return recordConsoleEvent(Object.assign({ kind: 'error', category: 'error', status: 'error', label: '运行错误', source: 'window.error' }, meta, {
            errorMessage: meta.errorMessage || error.message || String(error || 'Unknown error'), errorStack: meta.errorStack || error.stack || ''
        }));
    }

    async function captureResponse(traceId, response, basePayload) {
        if (!response) { recordRequestSuccess(traceId, basePayload); return; }
        try { recordRequestSuccess(traceId, Object.assign({}, basePayload, { responseText: await response.text() })); }
        catch (error) { recordRequestSuccess(traceId, Object.assign({}, basePayload, { captureError: error })); }
    }
    async function trackedFetch(request, meta = {}) {
        const req = request || {};
        const endpoint = req.endpoint || meta.endpoint;
        const fetchOptions = req.fetchOptions || meta.fetchOptions || {};
        const trace = recordRequestStart({ label: meta.label, source: meta.source, provider: meta.provider, model: meta.model, stream: meta.stream, endpoint, fetchOptions, requestBody: meta.requestBody !== undefined ? meta.requestBody : req.requestBody });
        try {
            const response = await global.fetch(endpoint, fetchOptions);
            const basePayload = { responseStatus: response.status, responseOk: response.ok, responseHeaders: response.headers };
            try { captureResponse(trace.id, response.clone(), basePayload); }
            catch (cloneError) { recordRequestSuccess(trace.id, Object.assign({}, basePayload, { captureError: cloneError })); }
            return response;
        } catch (error) {
            recordRequestFailure(trace.id, error);
            throw error;
        }
    }

    function getRecentTraces() { return traces.map(trace => safeJsonClone(trace)); }
    function clearTraces() { traces.length = 0; notify(); }
    function subscribe(listener) {
        if (typeof listener !== 'function') return function noop() {};
        listeners.push(listener);
        return function unsubscribe() { const index = listeners.indexOf(listener); if (index >= 0) listeners.splice(index, 1); };
    }
    function formatTraceForCopy(trace) { return JSON.stringify(safeJsonClone(trace), null, 2); }

    ai.requestTraceStore = { trackedFetch, recordRequestStart, recordRequestSuccess, recordRequestFailure, recordDiagnostic, recordConsoleEvent, recordConversationEvent, recordAiResponseBatch, recordOperation, recordErrorEvent, getRecentTraces, clearTraces, subscribe, formatTraceForCopy, getMaxTraceCount: () => MAX_TRACE_COUNT };

    if (!global.__owoUnifiedConsoleErrorHookInstalled && global.addEventListener) {
        global.__owoUnifiedConsoleErrorHookInstalled = true;
        global.addEventListener('error', event => recordErrorEvent({ source: 'window.error', errorMessage: event && event.message, error: event && event.error, extra: { filename: event && event.filename, lineno: event && event.lineno, colno: event && event.colno } }));
        global.addEventListener('unhandledrejection', event => { const reason = event && event.reason; recordErrorEvent({ source: 'window.unhandledrejection', errorMessage: reason && reason.message ? reason.message : String(reason || 'Unhandled rejection'), error: reason, extra: { type: 'unhandledrejection' } }); });
    }
})(window);
