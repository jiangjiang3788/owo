// --- Unified AI Task Runtime public facade (v0.9.0) ---
(function registerAiRuntimePublic(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.aiRuntime;
    const service = feature.service;

    feature.publicApi = {
        invokeTask: service.invokeTask,
        resolveTask: service.resolveTask,
        executeTask: service.executeTask,
        preflightPreparedTask: service.preflightPreparedTask,
        executePreparedTask: service.executePreparedTask,
        executeProviderRequest: service.executeProviderRequest,
        getRoutingReport: service.getRoutingReport
    };
})(window);
