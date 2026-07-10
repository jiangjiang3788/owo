// --- Prompt Center public facade (v0.2.17) ---
// 兼容旧 magic-room-screen，只把用户可见 owner 改为“提示词”。
(function registerPromptCenterPublic(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.promptCenter;

    function recordOperation(label, data) {
        const ops = OwoApp.platform && OwoApp.platform.observability
            ? OwoApp.platform.observability.operationTraceService
            : null;
        if (ops && typeof ops.recordOperation === 'function') {
            ops.recordOperation({ source: 'features/promptCenter', sourceModule: 'features/promptCenter/public', action: label, label, status: 'operation', data: data || {} });
        }
    }

    function open() {
        recordOperation('打开提示词中心', { legacyScreen: 'magic-room-screen' });
        if (typeof global.switchScreen === 'function') global.switchScreen('magic-room-screen');
    }

    feature.publicApi = {
        open,
        getRoutingReport: function getRoutingReport() {
            return { owner: 'features/promptCenter/public', legacyScreen: 'magic-room-screen', compatibility: true, operationTrace: 'platform/observability.operationTraceService.recordOperation' };
        },
        getPublicContract: function getPublicContract() {
            return { feature: 'promptCenter', ready: true, stableApis: ['open'] };
        }
    };
})(window);
