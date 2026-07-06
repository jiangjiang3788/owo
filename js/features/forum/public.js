// --- Forum public facade (V28/V33) ---
// 只导出稳定 API，不写业务逻辑。
(function registerForumPublicFacade(global) {
    const OwoApp = global.OwoApp;
    const forum = OwoApp.features.forum = OwoApp.features.forum || {};

    function getRoutingReport() {
        return {
            publicOwner: 'OwoApp.features.forum.publicApi',
            semanticsOwner: 'OwoApp.core.forum.forumSemantics',
            profileOwner: 'OwoApp.features.forum.profileService',
            postOwner: 'OwoApp.features.forum.postService',
            dmOwner: 'OwoApp.features.forum.dmService',
            legacyShell: 'js/modules/forum.js',
            chatAiPromptChanged: false,
            messageSendChanged: false
        };
    }

    function getPublicContract() {
        return {
            feature: 'forum',
            stableApis: [
                'getRoutingReport',
                'getPublicContract',
                'semantics',
                'profileService',
                'postService',
                'dmService'
            ],
            privateOwners: [
                'OwoApp.features.forum.profileService',
                'OwoApp.features.forum.postService',
                'OwoApp.features.forum.dmService'
            ],
            crossFeatureRule: '其他 feature 只能通过 OwoApp.features.forum.publicApi 访问 forum 能力'
        };
    }

    forum.publicApi = {
        getRoutingReport,
        getPublicContract,
        semantics: OwoApp.core.forum.forumSemantics,
        profileService: forum.profileService,
        postService: forum.postService,
        dmService: forum.dmService
    };
})(window);
