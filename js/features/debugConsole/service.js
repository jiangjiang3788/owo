// --- Debug console service (v0.2.8) ---
// 只聚合请求追踪数据供 UI/快捷入口消费；不发起 AI 请求、不直接改业务状态。
(function registerDebugConsoleService(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.debugConsole;
    const traceStore = OwoApp.platform.ai.requestTraceStore;

    function listTraces() {
        return traceStore.getRecentTraces();
    }

    function findTrace(traceId) {
        return listTraces().find(trace => trace.id === traceId) || null;
    }

    function formatTraceForCopy(traceOrId) {
        const trace = typeof traceOrId === 'string' ? findTrace(traceOrId) : traceOrId;
        return trace ? traceStore.formatTraceForCopy(trace) : '';
    }

    function formatAllTracesForCopy() {
        return JSON.stringify(listTraces(), null, 2);
    }

    function clearTraces() {
        traceStore.clearTraces();
    }

    function subscribe(listener) {
        return traceStore.subscribe(listener);
    }

    function getStatusLabel(status) {
        if (status === 'success') return '成功';
        if (status === 'http_error') return 'HTTP错误';
        if (status === 'error') return '失败';
        if (status === 'diagnostic') return '诊断';
        if (status === 'warning') return '警告';
        return '请求中';
    }

    feature.service = {
        listTraces,
        findTrace,
        formatTraceForCopy,
        formatAllTracesForCopy,
        clearTraces,
        subscribe,
        getStatusLabel
    };
})(window);
