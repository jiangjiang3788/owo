// js/features/videoCall/public.js
// V31/V33 video call public facade. Only exports stable APIs.
(function registerVideoCallPublicApi(global) {
    const app = global.OwoApp;
    if (!app || !app.features || !app.features.videoCall) {
        throw new Error('[videoCall/public] OwoApp.features.videoCall namespace is required');
    }

    function getRoutingReport() {
        return {
            owner: 'OwoApp.features.videoCall.publicApi',
            model: app.features.videoCall.model && app.features.videoCall.model.getRoutingReport
                ? app.features.videoCall.model.getRoutingReport()
                : null,
            mediaAdapter: !!(app.platform && app.platform.browser && app.platform.browser.mediaAdapter),
            audioAdapter: !!(app.platform && app.platform.browser && app.platform.browser.audioAdapter),
            legacyShell: 'js/modules/video_call.js'
        };
    }

    function getPublicContract() {
        return {
            feature: 'videoCall',
            stableApis: ['getRoutingReport', 'getPublicContract', 'model'],
            privateOwners: ['OwoApp.features.videoCall.model'],
            crossFeatureRule: '其他 feature 只能通过 OwoApp.features.videoCall.publicApi 访问 videoCall 能力'
        };
    }

    app.features.videoCall.publicApi = {
        getRoutingReport,
        getPublicContract,
        model: app.features.videoCall.model
    };
})(window);
