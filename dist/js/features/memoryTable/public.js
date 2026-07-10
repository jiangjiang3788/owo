// --- Memory table public facade (V23) ---
// facade 只导出稳定 API，不写业务逻辑。
(function registerMemoryTablePublicApi(app) {
    const feature = app.features.memoryTable = app.features.memoryTable || {};

    feature.publicApi = {
        semantics: app.core.memory.tableSemantics,
        updateXmlSemantics: app.core.memory.tableUpdateXmlSemantics,
        updateDiagnosticsService: feature.updateDiagnosticsService,
        model: feature.model,
        service: feature.service,
        view: feature.view,
        getRoutingReport() {
            return {
                semanticsOwner: 'OwoApp.core.memory.tableSemantics',
                modelOwner: 'OwoApp.features.memoryTable.model',
                serviceOwner: 'OwoApp.features.memoryTable.service',
                viewOwner: 'OwoApp.features.memoryTable.view',
                updateXmlSemanticsOwner: 'OwoApp.core.memory.tableUpdateXmlSemantics',
                updateDiagnosticsOwner: 'OwoApp.features.memoryTable.updateDiagnosticsService',
                legacyShell: 'js/modules/memory_table.js'
            };
        }
    };
})(OwoApp);
