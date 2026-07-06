// --- World book public facade (V26) ---
// 只导出稳定 API，不写业务逻辑。
(function registerWorldBookPublicApi(app) {
    app.features = app.features || {};
    app.features.worldBook = app.features.worldBook || {};

    const contextService = app.features.worldBook.contextService;
    const semantics = app.core.memory.worldBookSemantics;

    function getRoutingReport() {
        return {
            semanticsOwner: 'OwoApp.core.memory.worldBookSemantics',
            contextServiceOwner: 'OwoApp.features.worldBook.contextService',
            legacyShell: 'js/modules/worldbook.js',
            chatPromptBridge: 'OwoApp.core.chat.promptContext.getActiveWorldBooksContents'
        };
    }

    app.features.worldBook.publicApi = {
        getRoutingReport,
        semantics,
        contextService,
        getActiveWorldBooksContents: contextService.getActiveWorldBooksContents,
        getWorldBookContextReport: contextService.getWorldBookContextReport
    };
})(OwoApp);
