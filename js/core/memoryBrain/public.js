// --- Memory Brain core public facade (v0.3.0) ---
// 只导出纯语义能力，不承载运行时流程。
(function registerMemoryBrainCorePublic(app) {
    const core = app.core;
    core.memoryBrain = core.memoryBrain || {};

    core.memoryBrain.publicApi = {
        getLayers: function getLayers() { return core.memoryBrain.types.LAYERS.slice(); },
        getMigrationStages: function getMigrationStages() { return core.memoryBrain.types.MIGRATION_STAGES.slice(); },
        createDefaultState: function createDefaultState() { return core.memoryBrain.types.createDefaultMemoryBrainState(); },
        normalizeState: function normalizeState(state) { return core.memoryBrain.types.normalizeMemoryBrainState(state); },
        getPublicContract: function getPublicContract() {
            return {
                owner: 'core/memoryBrain',
                release: 'v0.3.0',
                role: 'types/semantics',
                stableApis: ['getLayers', 'getMigrationStages', 'createDefaultState', 'normalizeState']
            };
        }
    };
})(OwoApp);
