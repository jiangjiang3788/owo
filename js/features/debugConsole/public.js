// --- Debug console public facade (v0.2.8) ---
// 稳定出口：请求控制台入口交给 quickDock；本模块只提供数据和嵌入式面板渲染能力。
(function registerDebugConsolePublic(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.debugConsole;

    function getQuickDockPublic() {
        return OwoApp.features && OwoApp.features.quickDock ? OwoApp.features.quickDock.publicApi : null;
    }

    function openInsideQuickDock() {
        const quickDockPublic = getQuickDockPublic();
        if (quickDockPublic && quickDockPublic.openRequestPanel) return quickDockPublic.openRequestPanel();
        return feature.view.open();
    }

    const publicApi = {
        openRequestConsole: openInsideQuickDock,
        closeRequestConsole: () => feature.view.close(),
        toggleRequestConsole: openInsideQuickDock,
        renderEmbeddedRequestConsole: (container, options) => feature.view.renderEmbedded(container, options),
        destroyEmbeddedRequestConsole: container => feature.view.destroyEmbedded(container),
        getRecentRequestTraces: () => feature.service.listTraces(),
        clearRequestTraces: () => feature.service.clearTraces(),
        getPublicContract: () => ({
            owner: 'features/debugConsole',
            version: 'v0.2.8',
            methods: [
                'openRequestConsole',
                'closeRequestConsole',
                'toggleRequestConsole',
                'renderEmbeddedRequestConsole',
                'destroyEmbeddedRequestConsole',
                'getRecentRequestTraces',
                'clearRequestTraces'
            ]
        }),
        getRoutingReport: () => ({
            owner: 'features/debugConsole',
            traceOwner: 'platform/ai/requestTraceStore',
            uiOwner: 'features/debugConsole/view',
            entryOwner: 'features/quickDock',
            standaloneEntry: false
        })
    };

    feature.publicApi = publicApi;
})(window);
