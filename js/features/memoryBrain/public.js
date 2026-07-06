// --- Memory Brain public facade (v0.3.0) ---
// public facade 只导出稳定 API，不写业务逻辑。
(function registerMemoryBrainPublic(global) {
    const app = global.OwoApp;
    const feature = app.features.memoryBrain;

    feature.publicApi = {
        render: function render() { return feature.view.render(); },
        scanLegacySources: function scanLegacySources(options) { return feature.service.scanLegacySources(options || {}); },
        getDashboard: function getDashboard(options) { return feature.service.getDashboard(options || {}); },
        copyPlanningText: function copyPlanningText() { return feature.service.copyPlanningText(); },
        openConsole: function openConsole() { return feature.service.openConsole(); },
        getRoutingReport: function getRoutingReport() { return feature.service.getRoutingReport(); },
        getPublicContract: function getPublicContract() {
            return {
                feature: 'memoryBrain',
                ready: true,
                release: 'v0.3.0',
                stableApis: ['render', 'scanLegacySources', 'getDashboard', 'copyPlanningText', 'openConsole'],
                note: 'v0.3.0 只做新记忆脑骨架和旧来源扫描，不替换旧注入路径。'
            };
        }
    };
})(window);
