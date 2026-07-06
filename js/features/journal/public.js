// --- Journal public facade (V25) ---
// public facade 只导出稳定 API，不写业务逻辑。
(function registerJournalPublicFacade(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.journal = OwoApp.features.journal || {};

    function getRoutingReport() {
        return {
            semanticsOwner: 'OwoApp.core.memory.journalSemantics',
            serviceOwner: 'OwoApp.features.journal.service',
            legacyShell: 'js/modules/journal.js',
            archiveOwner: 'js/modules/archive.js legacy-owner',
            favoritesOwner: 'js/modules/favorites.js legacy-owner',
            chatAiPromptChanged: false,
            vectorMemoryChanged: false
        };
    }

    feature.publicApi = {
        getRoutingReport,
        semantics: OwoApp.core.memory.journalSemantics,
        service: feature.service
    };
})(window);
