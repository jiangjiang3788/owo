// --- Data Management public facade (v0.2.17) ---
// public facade 只导出稳定 API，不写业务逻辑。
(function registerDataManagementPublic(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.dataManagement;

    feature.publicApi = {
        render: function render() { return feature.view.render.apply(global, arguments); },
        openConsole: function openConsole() { return feature.service.openConsole.apply(global, arguments); },
        backupNow: function backupNow() { return feature.service.backupNow.apply(global, arguments); },
        restoreLatest: function restoreLatest() { return feature.service.restoreLatest.apply(global, arguments); },
        renderConsole: function renderConsole() { return feature.service.renderConsole.apply(global, arguments); },
        destroyConsole: function destroyConsole() { return feature.service.destroyConsole.apply(global, arguments); },
        renderTutorialContent: function renderTutorialContent() { return feature.service.renderTutorialContent.apply(global, arguments); },
        renderTutorialPanel: function renderTutorialPanel() { return feature.service.renderTutorialContent.apply(global, arguments); },
        renderStorageAnalysis: function renderStorageAnalysis() { return feature.service.renderStorageAnalysis.apply(global, arguments); },
        recordOperation: function recordOperation() { return feature.service.recordOperation.apply(global, arguments); },
        renderStoragePanel: function renderStoragePanel() { return feature.service.renderStorageAnalysis.apply(global, arguments); },
        getRoutingReport: function getRoutingReport() { return feature.service.getRoutingReport(); },
        getPublicContract: function getPublicContract() {
            return {
                feature: 'dataManagement',
                ready: true,
                stableApis: ['render', 'openConsole', 'backupNow', 'restoreLatest', 'renderConsole', 'destroyConsole', 'renderTutorialContent', 'renderTutorialPanel', 'renderStorageAnalysis', 'renderStoragePanel', 'recordOperation']
            };
        }
    };
})(window);
