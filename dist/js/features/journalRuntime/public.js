// --- Journal Runtime public facade (v0.9.3) ---
(function registerJournalRuntimePublic(global) {
    const feature = global.OwoApp.features.journalRuntime;
    const service = feature.service;
    feature.publicApi = {
        executeJournalTask: service.executeJournalTask,
        getMode: service.getMode,
        setMode: service.setMode,
        getStatus: service.getStatus
    };
})(window);
