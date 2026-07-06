// --- Unified console public facade (v0.2.17) ---
// 稳定控制台 facade：只导出同一套 renderer / trace 查询 API，入口由宿主决定。
(function registerDebugConsolePublic(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.debugConsole;

    function openUnifiedConsole() {
        const quickDock = OwoApp.features && OwoApp.features.quickDock ? OwoApp.features.quickDock.publicApi : null;
        const opener = quickDock && (quickDock.openConsolePanel || quickDock.openConsole || quickDock.openRequestPanel);
        return typeof opener === 'function' ? opener.call(quickDock, { source: 'debugConsoleCompat' }) : false;
    }

    const publicApi = {
        openConsole: openUnifiedConsole,
        openRequestConsole: openUnifiedConsole,
        closeRequestConsole: function closeRequestConsole() {},
        toggleRequestConsole: openUnifiedConsole,
        renderConsole: (container, options) => feature.view.renderEmbedded(container, options),
        renderEmbeddedConsole: (container, options) => feature.view.renderEmbedded(container, options),
        renderEmbeddedRequestConsole: (container, options) => feature.view.renderEmbedded(container, options),
        destroyConsole: container => feature.view.destroyEmbedded(container),
        destroyEmbeddedConsole: container => feature.view.destroyEmbedded(container),
        destroyEmbeddedRequestConsole: container => feature.view.destroyEmbedded(container),
        getRecentConsoleTraces: () => feature.service.listTraces(),
        getRecentRequestTraces: () => feature.service.listTraces(),
        clearConsoleTraces: () => feature.service.clearTraces(),
        clearRequestTraces: () => feature.service.clearTraces(),
        getPublicContract: () => ({
            owner: 'features/debugConsole',
            version: 'v0.2.17',
            methods: ['renderConsole', 'renderEmbeddedConsole', 'destroyConsole', 'getRecentConsoleTraces', 'clearConsoleTraces'],
            note: 'debugConsole 是唯一控制台 renderer；quickDock 是控制台宿主，dataManagement 只保留入口。'
        }),
        getRoutingReport: () => ({
            owner: 'features/debugConsole',
            traceOwner: 'platform/ai/requestTraceStore + platform/observability/traceStore',
            uiOwner: 'features/debugConsole/view',
            hosts: ['features/quickDock'],
            entries: ['features/quickDock', 'features/dataManagement'],
            entryOwner: 'features/quickDock',
            standaloneEntry: false,
            singleRenderer: true
        })
    };

    feature.publicApi = publicApi;
})(window);
