// --- Wallet feature public facade (V32/V33) ---
// 只导出稳定 API，不写业务逻辑。
(function registerWalletPublicApi(app) {
    const features = app.features = app.features || {};
    features.wallet = features.wallet || {};

    function getRoutingReport() {
        return {
            owner: 'OwoApp.features.wallet.publicApi',
            paymentSemantics: 'OwoApp.core.wallet.paymentSemantics',
            paymentCardViewModel: 'OwoApp.features.wallet.paymentCardViewModel',
            legacyDomOwners: ['js/modules/chat_render.js', 'js/modules/shop.js', 'js/modules/piggy_bank.js'],
            chatRenderUsesPublicFacade: true,
            shopUsesPublicFacade: true
        };
    }

    function getPublicContract() {
        return {
            feature: 'wallet',
            stableApis: [
                'getRoutingReport',
                'getPublicContract',
                'paymentSemantics',
                'paymentCardViewModel'
            ],
            privateOwners: ['OwoApp.features.wallet.paymentCardViewModel'],
            crossFeatureRule: 'chat_render/shop 只能通过 OwoApp.features.wallet.publicApi 获取 wallet 语义和 view model'
        };
    }

    features.wallet.publicApi = {
        paymentSemantics: app.core.wallet.paymentSemantics,
        paymentCardViewModel: features.wallet.paymentCardViewModel,
        getRoutingReport,
        getPublicContract
    };
})(OwoApp);
