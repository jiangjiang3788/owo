// --- Vector memory public facade (V24) ---
// 只导出稳定 API，不写业务逻辑。
(function registerVectorMemoryPublicFacade(global) {
    const OwoApp = global.OwoApp;
    const vectorMemory = OwoApp.features.vectorMemory;

    function getRoutingReport() {
        return {
            modelOwner: 'OwoApp.features.vectorMemory.model',
            contextOwner: 'OwoApp.features.vectorMemory.contextService',
            embeddingOwner: 'OwoApp.platform.ai.embeddingAdapter',
            legacyShell: 'js/modules/vector_memory.js',
            promptMainComposerChanged: false
        };
    }

    vectorMemory.publicApi = {
        getRoutingReport,
        model: vectorMemory.model,
        contextService: vectorMemory.contextService
    };
})(window);
