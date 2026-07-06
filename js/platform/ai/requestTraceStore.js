// --- AI request trace store (v0.2.2 canonical owner) ---
// 平台层只记录 AI/API 请求观测数据和 trackedFetch；不渲染 UI、不处理业务语义。
(function registerAiRequestTraceStore(global) {
    const OwoApp = global.OwoApp;
    const ai = OwoApp.platform.ai;
    const MAX_TRACE_COUNT = 80;
    const MAX_CAPTURE_CHARS = 2000000;
    let sequence = 0;
    const traces = [];
    const listeners = [];

    function nowIso() {
        return new Date().toISOString();
    }

    function nextTraceId() {
        sequence += 1;
        return 'ai-trace-' + Date.now().toString(36) + '-' + sequence.toString(36);
    }

    function safeJsonClone(value) {
        if (value === undefined) return undefined;
        if (value === null) return null;
        if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return value;
        try {
            return JSON.parse(JSON.stringify(value));
        } catch (error) {
            return String(value);
        }
    }

    function redactSecret(value) {
        const text = String(value || '');
        if (!text) return text;
        if (/^bearer\s+/i.test(text)) return 'Bearer ***redacted***';
        if (text.length <= 8) return '***redacted***';
        return text.slice(0, 4) + '***redacted***' + text.slice(-4);
    }

    function sanitizeEndpoint(endpoint) {
        const text = String(endpoint || '');
        if (!text) return '';
        return text.replace(/([?&](?:key|api_key|apikey|token|access_token)=)([^&#]+)/gi, '$1***redacted***');
    }

    function sanitizeHeaders(headers) {
        if (!headers) return {};
        const output = {};
        const assign = (key, value) => {
            const name = String(key || '');
            if (!name) return;
            if (/authorization|api-key|apikey|token|secret/i.test(name)) {
                output[name] = redactSecret(value);
            } else {
                output[name] = String(value);
            }
        };
        if (typeof Headers !== 'undefined' && headers instanceof Headers) {
            headers.forEach((value, key) => assign(key, value));
            return output;
        }
        if (Array.isArray(headers)) {
            headers.forEach(item => Array.isArray(item) && assign(item[0], item[1]));
            return output;
        }
        if (typeof headers === 'object') {
            Object.keys(headers).forEach(key => assign(key, headers[key]));
        }
        return output;
    }

    function extractRequestBody(fetchOptions, explicitBody) {
        if (explicitBody !== undefined) return safeJsonClone(explicitBody);
        const body = fetchOptions && fetchOptions.body;
        if (body === undefined || body === null) return undefined;
        if (typeof body !== 'string') return '[non-string body]';
        try {
            return JSON.parse(body);
        } catch (error) {
            return body;
        }
    }

    function createFetchOptionsSnapshot(fetchOptions) {
        const options = fetchOptions && typeof fetchOptions === 'object' ? fetchOptions : {};
        return {
            method: options.method || 'GET',
            headers: sanitizeHeaders(options.headers),
            hasSignal: Boolean(options.signal),
            credentials: options.credentials,
            mode: options.mode
        };
    }

    function limitText(text) {
        const value = String(text || '');
        if (value.length <= MAX_CAPTURE_CHARS) {
            return { text: value, truncated: false, originalLength: value.length };
        }
        return {
            text: value.slice(0, MAX_CAPTURE_CHARS),
            truncated: true,
            originalLength: value.length
        };
    }

    function parseJsonMaybe(text) {
        if (!text || typeof text !== 'string') return undefined;
        const trimmed = text.trim();
        if (!trimmed || !/^[\[{]/.test(trimmed)) return undefined;
        try {
            return JSON.parse(trimmed);
        } catch (error) {
            return undefined;
        }
    }

    function notify() {
        const snapshot = getRecentTraces();
        listeners.slice().forEach(listener => {
            try {
                listener(snapshot);
            } catch (error) {
                console.warn('[requestTraceStore] listener failed:', error);
            }
        });
    }

    function upsertTrace(trace) {
        traces.unshift(trace);
        while (traces.length > MAX_TRACE_COUNT) traces.pop();
        notify();
        return trace;
    }

    function findTrace(traceId) {
        return traces.find(trace => trace.id === traceId) || null;
    }

    function recordRequestStart(meta = {}) {
        const fetchOptions = meta.fetchOptions || {};
        const startedAt = Date.now();
        const trace = {
            id: nextTraceId(),
            status: 'pending',
            label: meta.label || meta.source || 'AI 请求',
            source: meta.source || 'unknown',
            provider: meta.provider || '',
            model: meta.model || '',
            stream: Boolean(meta.stream),
            endpoint: sanitizeEndpoint(meta.endpoint),
            fetchOptions: createFetchOptionsSnapshot(fetchOptions),
            requestBody: extractRequestBody(fetchOptions, meta.requestBody),
            startedAt,
            startedAtIso: nowIso()
        };
        return upsertTrace(trace);
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
            trace.responseBodyText = limited.text;
            trace.responseBodyTruncated = limited.truncated;
            trace.responseBodyOriginalLength = limited.originalLength;
            trace.responseJson = parseJsonMaybe(limited.text);
        }
        if (payload.captureError) trace.captureError = String(payload.captureError.message || payload.captureError);
        notify();
        return safeJsonClone(trace);
    }

    function recordRequestFailure(traceId, error) {
        const trace = findTrace(traceId);
        if (!trace) return null;
        const completedAt = Date.now();
        trace.status = 'error';
        trace.completedAt = completedAt;
        trace.completedAtIso = nowIso();
        trace.durationMs = completedAt - trace.startedAt;
        trace.errorMessage = error && error.message ? error.message : String(error || 'Unknown error');
        trace.errorStack = error && error.stack ? String(error.stack) : '';
        notify();
        return safeJsonClone(trace);
    }

    async function captureResponse(traceId, response, basePayload) {
        if (!response) {
            recordRequestSuccess(traceId, basePayload);
            return;
        }
        try {
            const text = await response.text();
            recordRequestSuccess(traceId, Object.assign({}, basePayload, { responseText: text }));
        } catch (error) {
            recordRequestSuccess(traceId, Object.assign({}, basePayload, { captureError: error }));
        }
    }

    async function trackedFetch(request, meta = {}) {
        const req = request || {};
        const endpoint = req.endpoint || meta.endpoint;
        const fetchOptions = req.fetchOptions || meta.fetchOptions || {};
        const trace = recordRequestStart({
            label: meta.label,
            source: meta.source,
            provider: meta.provider,
            model: meta.model,
            stream: meta.stream,
            endpoint,
            fetchOptions,
            requestBody: meta.requestBody !== undefined ? meta.requestBody : req.requestBody
        });
        try {
            const response = await global.fetch(endpoint, fetchOptions);
            const basePayload = {
                responseStatus: response.status,
                responseOk: response.ok,
                responseHeaders: response.headers
            };
            let clonedResponse = null;
            try {
                clonedResponse = response.clone();
            } catch (cloneError) {
                recordRequestSuccess(trace.id, Object.assign({}, basePayload, { captureError: cloneError }));
                return response;
            }
            captureResponse(trace.id, clonedResponse, basePayload);
            return response;
        } catch (error) {
            recordRequestFailure(trace.id, error);
            throw error;
        }
    }

    function getRecentTraces() {
        return traces.map(trace => safeJsonClone(trace));
    }

    function clearTraces() {
        traces.length = 0;
        notify();
    }

    function subscribe(listener) {
        if (typeof listener !== 'function') return function noop() {};
        listeners.push(listener);
        return function unsubscribe() {
            const index = listeners.indexOf(listener);
            if (index >= 0) listeners.splice(index, 1);
        };
    }

    function formatTraceForCopy(trace) {
        return JSON.stringify(safeJsonClone(trace), null, 2);
    }

    ai.requestTraceStore = {
        trackedFetch,
        recordRequestStart,
        recordRequestSuccess,
        recordRequestFailure,
        getRecentTraces,
        clearTraces,
        subscribe,
        formatTraceForCopy,
        getMaxTraceCount: () => MAX_TRACE_COUNT
    };
})(window);
