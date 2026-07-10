// --- Quick dock public facade (v0.2.17) ---
// 稳定出口：悬浮球承载控制台宿主，但控制台内容仍走 debugConsole renderer。
(function registerQuickDockPublic(global) {
    const OwoApp = global.OwoApp;
    const quickDock = OwoApp.features.quickDock;

    function openConsolePanel(options) {
        if (quickDock.service && typeof quickDock.service.openConsolePanel === 'function') quickDock.service.openConsolePanel(options || {});
        return quickDock.view.open('console');
    }

    const publicApi = {
        open: panel => quickDock.view.open(panel),
        close: () => quickDock.view.close(),
        openPromptPanel: () => quickDock.view.open('prompt'),
        openConsolePanel,
        openConsole: openConsolePanel,
        openRequestPanel: openConsolePanel,
        backupNow: () => quickDock.service.backupNow(),
        restoreLatest: () => quickDock.service.restoreLatest(),
        getPromptState: () => quickDock.service.getPromptState(),
        savePromptState: state => quickDock.service.savePromptState(state),
        getPublicContract: () => ({
            owner: 'features/quickDock',
            version: 'v0.2.17',
            methods: ['open', 'close', 'openPromptPanel', 'openConsolePanel', 'openConsole', 'openRequestPanel', 'backupNow', 'restoreLatest', 'getPromptState', 'savePromptState']
        }),
        getRoutingReport: () => ({
            owner: 'features/quickDock',
            modelSwitch: 'features/settings/apiSettings.publicApi',
            cloudBackup: 'features/cloudBackup.publicApi',
            consoleRenderer: 'features/debugConsole.publicApi.renderEmbeddedConsole',
            consoleHost: 'features/quickDock/view',
            dataManagementConsoleEntry: 'features/dataManagement.publicApi.openConsole -> quickDock.openConsolePanel',
            promptOwner: 'features/quickDock.service -> db.magicRoom compatibility state',
            note: 'v0.2.17: quickDock hosts the unified console panel; debugConsole remains the only renderer.'
        })
    };

    quickDock.publicApi = publicApi;
})(window);
