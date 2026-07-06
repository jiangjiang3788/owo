// --- Cloud backup public facade (v0.2.5) ---
// 稳定出口：教程页、后续悬浮球只允许通过这里触发 GitHub 备份/恢复。
(function registerCloudBackupPublic(global) {
    const OwoApp = global.OwoApp;
    const cloudBackup = OwoApp.features.cloudBackup;
    const service = cloudBackup.service;

    const publicApi = {
        getConfig: service.getConfig,
        saveConfig: service.saveConfig,
        saveConfigFromForm: service.saveConfigFromForm,
        syncConfigToForm: service.syncConfigToForm,
        updateStatusText: service.updateStatusText,
        backupNow: service.backupNow,
        checkAndBackup: service.checkAndBackup,
        checkStatus: service.checkStatus,
        restoreLatest: service.restoreLatest,
        getPublicContract() {
            return {
                owner: 'OwoApp.features.cloudBackup.publicApi',
                version: 'v0.2.8',
                methods: ['getConfig', 'saveConfig', 'backupNow', 'restoreLatest', 'checkStatus', 'checkAndBackup']
            };
        },
        getRoutingReport() {
            return {
                owner: 'features/cloudBackup',
                serviceOwner: 'features/cloudBackup/service',
                adapterOwner: 'platform/storage/githubBackupAdapter',
                compatibilityCaller: 'modules/tutorial.js GitHubMgr shell',
                quickDockCaller: 'features/quickDock.service -> cloudBackup.publicApi'
            };
        }
    };

    cloudBackup.publicApi = publicApi;
})(window);
