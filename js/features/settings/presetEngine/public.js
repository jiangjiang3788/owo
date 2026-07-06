// --- Settings preset engine public facade (V20) ---
// 只导出通用预设 model/service API，不写具体业务逻辑。
(function registerSettingsPresetEnginePublic(global) {
    const OwoApp = global.OwoApp;
    const presetEngine = OwoApp.features.settings.presetEngine;
    const service = presetEngine.presetEngineService;

    presetEngine.publicApi = {
        ensureArray: presetEngine.model.ensureArray,
        normalizeName: service.normalizeName,
        cloneJson: service.cloneJson,
        createPreset: service.createPreset,
        getPresets: service.getPresets,
        savePresets: service.savePresets,
        upsertPreset: service.upsertPreset,
        renamePreset: service.renamePreset,
        removePresetAt: service.removePresetAt,
        mergeImportedPresets: service.mergeImportedPresets,
        createStateStore: service.createStateStore
    };
})(window);
