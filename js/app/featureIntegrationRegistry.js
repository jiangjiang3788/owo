// --- App feature integration registry (V33) ---
// 只汇总大 feature 的 public facade 状态，不写业务逻辑。
(function registerFeatureIntegrationRegistry(global) {
    const app = global.OwoApp;
    if (!app || !app.app || !app.features) {
        throw new Error('[featureIntegrationRegistry] OwoApp namespace 尚未初始化');
    }

    const FEATURE_KEYS = ['forum', 'theater', 'peek', 'videoCall', 'wallet', 'memoryBrain'];

    function getFeaturePublicApi(name) {
        const feature = app.features && app.features[name];
        return feature && feature.publicApi ? feature.publicApi : null;
    }

    function getRoutingReport(name) {
        const publicApi = getFeaturePublicApi(name);
        if (!publicApi) return { feature: name, ready: false, reason: 'missing publicApi' };
        if (typeof publicApi.getRoutingReport === 'function') {
            return Object.assign({ feature: name, ready: true }, publicApi.getRoutingReport());
        }
        return { feature: name, ready: true, reason: 'missing getRoutingReport' };
    }

    function getPublicContract(name) {
        const publicApi = getFeaturePublicApi(name);
        if (!publicApi) return { feature: name, ready: false, stableApis: [] };
        if (typeof publicApi.getPublicContract === 'function') {
            return publicApi.getPublicContract();
        }
        return {
            feature: name,
            ready: true,
            stableApis: Object.keys(publicApi).filter(key => key !== 'getRoutingReport')
        };
    }

    function getIntegrationReport() {
        return FEATURE_KEYS.map(name => ({
            feature: name,
            routing: getRoutingReport(name),
            contract: getPublicContract(name)
        }));
    }

    function assertReady() {
        const missing = FEATURE_KEYS.filter(name => !getFeaturePublicApi(name));
        if (missing.length) {
            throw new Error('[featureIntegrationRegistry] 缺少 public facade：' + missing.join(', '));
        }
        return true;
    }

    app.app.featureIntegration = {
        getFeaturePublicApi,
        getRoutingReport,
        getPublicContract,
        getIntegrationReport,
        assertReady
    };
})(window);
