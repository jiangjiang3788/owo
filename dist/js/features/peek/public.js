// --- Peek public facade (V30/V33) ---
// 只导出稳定 API，不写业务逻辑。
(function registerPeekPublicFacade(global) {
    const OwoApp = global.OwoApp;
    const feature = OwoApp.features.peek = OwoApp.features.peek || {};

    function getRoutingReport() {
        return {
            publicOwner: 'OwoApp.features.peek.publicApi',
            xmlSemanticsOwner: 'OwoApp.core.peek.xmlSemantics',
            conversationSemanticsOwner: 'OwoApp.core.peek.conversationSemantics',
            phoneAppModelOwner: 'OwoApp.features.peek.phoneAppModel',
            legacyShell: 'js/modules/peek.js',
            chatAiChanged: false,
            theaterChanged: false,
            messageSendChanged: false
        };
    }

    function getPublicContract() {
        return {
            feature: 'peek',
            stableApis: [
                'getRoutingReport',
                'getPublicContract',
                'xmlSemantics',
                'conversationSemantics',
                'phoneAppModel'
            ],
            privateOwners: ['OwoApp.features.peek.phoneAppModel'],
            crossFeatureRule: '其他 feature 只能通过 OwoApp.features.peek.publicApi 访问 peek 能力'
        };
    }

    feature.publicApi = {
        getRoutingReport,
        getPublicContract,
        xmlSemantics: OwoApp.core.peek.xmlSemantics,
        conversationSemantics: OwoApp.core.peek.conversationSemantics,
        phoneAppModel: feature.phoneAppModel
    };
})(window);
