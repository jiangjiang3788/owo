// --- Quick dock public facade (v0.2.8) ---
// 稳定出口：只暴露悬浮球可调用 API，不写业务逻辑。
(function registerQuickDockPublic(global) {
    const OwoApp = global.OwoApp;
    const quickDock = OwoApp.features.quickDock;

    const publicApi = {
        open: panel => quickDock.view.open(panel),
        close: () => quickDock.view.close(),
        openPromptPanel: () => quickDock.view.open('prompt'),
        openRequestPanel: () => quickDock.view.open('requests'),
        getPromptState: () => quickDock.service.getPromptState(),
        savePromptState: state => quickDock.service.savePromptState(state),
        getPublicContract: () => ({
            owner: 'features/quickDock',
            version: 'v0.2.8',
            methods: ['open', 'close', 'openPromptPanel', 'openRequestPanel', 'getPromptState', 'savePromptState']
        }),
        getRoutingReport: () => ({
            owner: 'features/quickDock',
            modelSwitch: 'features/settings/apiSettings.publicApi',
            cloudBackup: 'features/cloudBackup.publicApi',
            debugConsole: 'features/debugConsole.publicApi embedded panel',
            promptOwner: 'features/quickDock.service -> db.magicRoom compatibility state'
        })
    };

    quickDock.publicApi = publicApi;
})(window);
