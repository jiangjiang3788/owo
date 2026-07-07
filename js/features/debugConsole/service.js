// --- Unified console service (v0.2.17) ---
// 聚合唯一 trace store：消息、回复、请求、诊断和错误都走同一个控制台数据源。
(function registerDebugConsoleService(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.debugConsole;

    function getTraceStore() {
        return (OwoApp.platform.observability && OwoApp.platform.observability.traceStore)
            || OwoApp.platform.ai.requestTraceStore;
    }

    function listTraces() { return getTraceStore().getRecentTraces(); }
    function findTrace(traceId) { return listTraces().find(trace => trace.id === traceId) || null; }

    function normalizeTextForDisplay(value) {
        let text = String(value == null ? '' : value)
            .replace(/\r\n/g, '\n')
            .replace(/\r/g, '\n');
        for (let i = 0; i < 3; i += 1) {
            const next = text
                .replace(/\\{1,3}r\\{1,3}n/g, '\n')
                .replace(/\\{1,3}n/g, '\n')
                .replace(/\\{1,3}r/g, '\n');
            if (next === text) break;
            text = next;
        }
        return text;
    }

    function getDiagnosticEvent(trace) {
        const diagnostic = trace && trace.diagnostic;
        if (!diagnostic || typeof diagnostic !== 'object') return null;
        return diagnostic.event || diagnostic;
    }

    function getTraceCategory(trace) {
        if (!trace) return 'event';
        const event = getDiagnosticEvent(trace);
        const status = String(trace.status || '').toLowerCase();
        const category = String(trace.category || trace.kind || trace.eventType || status || '').toLowerCase();
        if (category === 'message' || status === 'message' || status === 'user_message') return 'message';
        if (category === 'reply' || status === 'reply' || status === 'assistant_reply') return 'reply';
        if (category === 'response' || status === 'response' || category === 'ai-response-batch') return 'response';
        if (category === 'memory' || String(trace.source || '').indexOf('memoryBrain') !== -1 || String(trace.label || '').indexOf('记忆脑') !== -1) return 'memory';
        if (category === 'scheduler' || String(trace.source || '').indexOf('Scheduler') !== -1 || String(trace.label || '').indexOf('调度') !== -1) return 'scheduler';
        if (category === 'operation' || status === 'operation') return 'operation';
        if (category === 'event' || status === 'event') return 'event';
        if (category === 'error' || status === 'error' || status === 'http_error') return 'error';
        if (category === 'diagnostic' || status === 'diagnostic' || status === 'warning') return 'diagnostic';
        if (status === 'system_message' || status === 'message_event') return 'message';
        if (event && event.kind === 'conversation') {
            if (event.role === 'assistant') return 'reply';
            return 'message';
        }
        if (event && event.kind === 'operation') return 'operation';
        if (category === 'request' || status === 'success' || status === 'pending') return 'request';
        return 'request';
    }

    function getCategoryLabel(category) {
        return ({ message: 'Chat', reply: 'Chat', response: 'AI Response', request: 'AI Request', memory: 'Memory Brain', scheduler: 'Scheduler', error: 'Error', diagnostic: '诊断', operation: '操作', event: '事件' })[category] || '记录';
    }

    function formatScalar(value) {
        if (typeof value === 'string') return normalizeTextForDisplay(value);
        if (value === null) return 'null';
        if (value === undefined) return 'undefined';
        return String(value);
    }

    function formatValue(value, level) {
        const depth = level || 0;
        const nextIndent = '  '.repeat(depth + 1);
        if (Array.isArray(value)) {
            if (!value.length) return '[]';
            return value.map((item, index) => `${nextIndent}[${index}] ${formatValue(item, depth + 1)}`).join('\n');
        }
        if (value && typeof value === 'object') {
            const keys = Object.keys(value);
            if (!keys.length) return '{}';
            return keys.map(key => {
                const formatted = formatValue(value[key], depth + 1);
                return String(formatted).includes('\n') ? `${nextIndent}${key}:\n${formatted}` : `${nextIndent}${key}: ${formatted}`;
            }).join('\n');
        }
        const text = formatScalar(value);
        return text.includes('\n') ? '|\n' + text.split('\n').map(line => `${nextIndent}${line}`).join('\n') : text;
    }

    function formatTraceForDisplay(traceOrId) {
        const trace = typeof traceOrId === 'string' ? findTrace(traceOrId) : traceOrId;
        if (!trace) return '';
        const category = getTraceCategory(trace);
        const event = getDiagnosticEvent(trace);
        const sections = [];
        const add = (title, value) => { if (value !== undefined && value !== null && value !== '') sections.push(`## ${title}\n${formatValue(value, 0)}`); };
        add('基本信息', {
            category: getCategoryLabel(category),
            id: trace.id,
            source: trace.source,
            label: trace.label,
            status: trace.status,
            provider: trace.provider,
            model: trace.model,
            endpoint: trace.endpoint,
            method: trace.method || (trace.fetchOptions && trace.fetchOptions.method),
            startedAt: trace.startedAtIso || trace.startedAt,
            completedAt: trace.completedAtIso || trace.completedAt,
            durationMs: trace.durationMs,
            httpStatus: trace.responseStatus || trace.httpStatus,
            errorMessage: trace.errorMessage
        });
        add('发送 / 回复内容', event && event.content ? event.content : (trace.content || (trace.message && trace.message.content)));
        if (category === 'response') add('AI 回复批次', {
            messageCount: event && event.messageCount,
            requestTraceId: event && event.requestTraceId,
            childConsolePolicy: event && event.childConsolePolicy,
            messages: trace.responseJson && trace.responseJson.messages,
            usage: trace.responseJson && trace.responseJson.usage,
            metadata: trace.responseJson && trace.responseJson.metadata
        });
        add('消息元数据', event && event.kind === 'conversation' ? event : trace.message);
        add('操作数据', trace.event || trace.extra || (event && event.kind === 'operation' ? event : null));
        add('请求 Header', trace.requestHeaders || trace.headers || (trace.fetchOptions && trace.fetchOptions.headers));
        add('请求体', trace.requestBody);
        add('响应 JSON', trace.responseJson);
        add('响应正文', trace.responseBodyText || trace.responseBody);
        add('诊断数据', trace.diagnostic || trace.diagnostics || trace.issues || trace.warnings);
        add('错误堆栈', trace.errorStack);
        add('原始记录', trace);
        return sections.join('\n\n');
    }

    function formatTraceForCopy(traceOrId) { return formatTraceForDisplay(traceOrId); }
    function formatAllTracesForCopy() { return listTraces().map(formatTraceForDisplay).join('\n\n---\n\n'); }
    function clearTraces() { getTraceStore().clearTraces(); }
    function subscribe(listener) { return getTraceStore().subscribe(listener); }
    function getStatusLabel(status) {
        return ({ success: '成功', http_error: 'HTTP错误', error: '失败', diagnostic: '诊断', warning: '警告', message: '发送', reply: '回复', response: '批次', operation: '操作', user_message: '发送', assistant_reply: '回复', system_message: '系统', message_event: '消息', event: '事件', pending: '进行中' })[status] || '记录';
    }
    function getMaxTraceCount() { return getTraceStore().getMaxTraceCount ? getTraceStore().getMaxTraceCount() : 80; }

    feature.service = { listTraces, findTrace, formatTraceForCopy, formatTraceForDisplay, formatAllTracesForCopy, clearTraces, subscribe, getStatusLabel, getTraceCategory, getCategoryLabel, getMaxTraceCount };
})(window);
