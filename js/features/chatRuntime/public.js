// --- Private conversation runtime public facade (v0.9.2) ---
(function registerChatRuntimePublic(global) {
    const feature = global.OwoApp.features.chatRuntime;
    const service = feature.service;
    feature.publicApi = {
        executePreparedRequest: service.executePreparedRequest,
        getMode: service.getMode,
        setMode: service.setMode,
        getStatus: service.getStatus
    };
})(window);
