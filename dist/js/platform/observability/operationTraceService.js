// --- Operation trace service (v0.2.17) ---
// 统一操作记录出口：主要功能只写操作摘要，详情展示仍由 debugConsole 负责。
(function registerOperationTraceService(global) {
    const OwoApp = global.OwoApp;
    OwoApp.platform = OwoApp.platform || {};
    OwoApp.platform.observability = OwoApp.platform.observability || {};

    const SECRET_KEY_RE = /(?:token|key|authorization|secret|password|credential)/i;
    const MAX_STRING_LENGTH = 4000;
    const MAX_ARRAY_ITEMS = 30;
    const MAX_OBJECT_KEYS = 60;

    function traceStore() {
        return (OwoApp.platform.observability && OwoApp.platform.observability.traceStore)
            || (OwoApp.platform.ai && OwoApp.platform.ai.requestTraceStore)
            || null;
    }

    function normalizeText(value) {
        return String(value == null ? '' : value)
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n')
            .replace(/\\r\\n/g, '\n')
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\n');
    }

    function maskSecret(value) {
        const text = String(value == null ? '' : value);
        if (!text) return '';
        if (text.length <= 8) return '***redacted***';
        return text.slice(0, 4) + '***redacted***' + text.slice(-4);
    }

    function sanitizeValue(value, depth, keyHint) {
        const level = Number(depth) || 0;
        if (SECRET_KEY_RE.test(String(keyHint || ''))) return maskSecret(value);
        if (value === null || value === undefined) return value;
        if (typeof value === 'string') {
            const normalized = normalizeText(value);
            return normalized.length > MAX_STRING_LENGTH
                ? normalized.slice(0, MAX_STRING_LENGTH) + `\n… truncated ${normalized.length - MAX_STRING_LENGTH} chars`
                : normalized;
        }
        if (typeof value === 'number' || typeof value === 'boolean') return value;
        if (typeof value === 'function') return '[function]';
        if (level >= 4) return '[depth-limited]';
        if (Array.isArray(value)) {
            const list = value.slice(0, MAX_ARRAY_ITEMS).map(item => sanitizeValue(item, level + 1, keyHint));
            if (value.length > MAX_ARRAY_ITEMS) list.push(`… ${value.length - MAX_ARRAY_ITEMS} more items`);
            return list;
        }
        if (typeof value === 'object') {
            const output = {};
            Object.keys(value).slice(0, MAX_OBJECT_KEYS).forEach(key => {
                output[key] = sanitizeValue(value[key], level + 1, key);
            });
            const extra = Object.keys(value).length - MAX_OBJECT_KEYS;
            if (extra > 0) output.__truncatedKeys = extra;
            return output;
        }
        return String(value);
    }

    function sanitizeData(data) {
        return sanitizeValue(data || {}, 0, '');
    }

    function normalizeError(error) {
        if (!error) return { message: '' };
        return {
            message: error.message || String(error),
            name: error.name || '',
            stack: error.stack || ''
        };
    }

    function recordOperation(meta = {}) {
        const store = traceStore();
        if (!store || typeof store.recordOperation !== 'function') return null;
        const sanitizedData = sanitizeData(meta.data || meta.event || {});
        const payload = Object.assign({}, meta, {
            kind: 'operation',
            category: 'operation',
            status: meta.status || 'operation',
            label: meta.label || '操作记录',
            source: meta.source || meta.sourceModule || 'unknown',
            provider: meta.provider || '',
            model: meta.model || '',
            endpoint: meta.endpoint || '',
            event: Object.assign({
                kind: 'operation',
                sourceModule: meta.sourceModule || meta.source || 'unknown',
                action: meta.action || '',
                status: meta.status || 'operation'
            }, sanitizedData),
            data: sanitizedData,
            errorMessage: meta.errorMessage || '',
            errorStack: meta.errorStack || ''
        });
        return store.recordOperation(payload);
    }

    function recordSuccess(label, meta = {}) {
        return recordOperation(Object.assign({}, meta, { label, status: 'success' }));
    }

    function recordFailure(label, error, meta = {}) {
        const normalized = normalizeError(error);
        return recordOperation(Object.assign({}, meta, {
            label,
            status: 'error',
            errorMessage: normalized.message,
            errorStack: normalized.stack,
            data: Object.assign({}, meta.data || meta.event || {}, { error: { name: normalized.name, message: normalized.message } })
        }));
    }

    async function wrapAsync(label, meta, task) {
        const startedAt = Date.now();
        try {
            const result = await task();
            recordSuccess(label, Object.assign({}, meta || {}, {
                durationMs: Date.now() - startedAt,
                data: Object.assign({}, (meta && (meta.data || meta.event)) || {}, { result: sanitizeData(result) })
            }));
            return result;
        } catch (error) {
            recordFailure(label, error, Object.assign({}, meta || {}, {
                durationMs: Date.now() - startedAt
            }));
            throw error;
        }
    }

    OwoApp.platform.observability.operationTraceService = Object.freeze({
        sanitizeData,
        recordOperation,
        recordSuccess,
        recordFailure,
        wrapAsync,
        getRoutingReport: () => ({
            owner: 'platform/observability/operationTraceService',
            traceOwner: 'platform/observability/traceStore',
            records: ['modelSwitch', 'cloudBackup', 'dataManagement', 'storageAnalysis', 'promptCenter']
        })
    });
})(window);
