// --- Memory Brain platform public facade (v0.3.0) ---
// 只导出存储与旧来源扫描能力，不写 UI 逻辑。
(function registerMemoryBrainPlatformPublic(global) {
    const app = global.OwoApp;
    const platform = app.platform.memoryBrain;
    const store = platform.memoryBrainStore;

    platform.publicApi = {
        ensureState: function ensureState(options) { return store.ensureState(options || {}); },
        getSnapshot: function getSnapshot(options) { return store.getSnapshot(options || {}); },
        scanLegacySources: function scanLegacySources(options) { return store.scanLegacySources(options || {}); },
        rememberLegacyScan: function rememberLegacyScan(options) { return store.rememberLegacyScan(options || {}); },
        getReplacementPlan: function getReplacementPlan() { return store.getReplacementPlan(); },
        getRoutingReport: function getRoutingReport() { return store.getRoutingReport(); },
        getPublicContract: function getPublicContract() {
            return {
                owner: 'platform/memoryBrain',
                release: 'v0.3.0',
                stableApis: ['ensureState', 'getSnapshot', 'scanLegacySources', 'rememberLegacyScan', 'getReplacementPlan']
            };
        }
    };
})(window);
