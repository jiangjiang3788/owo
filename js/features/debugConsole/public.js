// --- Debug console public facade (v0.2.2) ---
// 稳定出口：供后续 quickDock 或设置页入口调用，不写业务逻辑。
(function registerDebugConsolePublic(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.debugConsole;

    const publicApi = {
        openRequestConsole: () => feature.view.open(),
        closeRequestConsole: () => feature.view.close(),
        toggleRequestConsole: () => feature.view.toggle(),
        getRecentRequestTraces: () => feature.service.listTraces(),
        clearRequestTraces: () => feature.service.clearTraces(),
        getPublicContract: () => ({
            owner: 'features/debugConsole',
            version: 'v0.2.2',
            methods: [
                'openRequestConsole',
                'closeRequestConsole',
                'toggleRequestConsole',
                'getRecentRequestTraces',
                'clearRequestTraces'
            ]
        }),
        getRoutingReport: () => ({
            owner: 'features/debugConsole',
            traceOwner: 'platform/ai/requestTraceStore',
            uiOwner: 'features/debugConsole/view'
        })
    };

    feature.publicApi = publicApi;
})(window);
