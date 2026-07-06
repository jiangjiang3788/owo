// --- Settings preset engine service (V20) ---
// 提供 state/key 绑定的通用预设 store；不绑定 DOM，不保存数据，不处理 TTS/COT/聊天逻辑。
(function registerSettingsPresetEngineService(global) {
    const OwoApp = global.OwoApp;
    const settings = OwoApp.features.settings;
    const presetEngine = settings.presetEngine;
    const model = presetEngine.model;

    function getPresets(state, key, options) {
        return model.normalizeCollection(state && state[key], options);
    }

    function savePresets(state, key, presets, options) {
        if (!state) throw new Error('[presetEngine] 缺少 state');
        state[key] = model.normalizeCollection(presets, options);
        return state[key];
    }

    function upsertPreset(state, key, preset, options) {
        return savePresets(state, key, model.upsertByName(getPresets(state, key, options), preset, options), options);
    }

    function renamePreset(state, key, index, newName, options) {
        return savePresets(state, key, model.renameAt(getPresets(state, key, options), index, newName, options), options);
    }

    function removePresetAt(state, key, index, options) {
        return savePresets(state, key, model.removeAt(getPresets(state, key, options), index, options), options);
    }

    function mergeImportedPresets(state, key, imported, options) {
        return savePresets(state, key, model.mergeByName(getPresets(state, key, options), imported, options), options);
    }

    function createStateStore(config) {
        const options = (config && config.options) || {};
        const key = config && config.key;
        const getState = config && config.getState;
        if (!key || typeof getState !== 'function') {
            throw new Error('[presetEngine] createStateStore 需要 key 和 getState');
        }
        function state() { return getState(); }
        return {
            key,
            get: function get() { return getPresets(state(), key, options); },
            replace: function replace(presets) { return savePresets(state(), key, presets, options); },
            upsert: function upsert(preset) { return upsertPreset(state(), key, preset, options); },
            renameAt: function renameAtStore(index, newName) { return renamePreset(state(), key, index, newName, options); },
            removeAt: function removeAtStore(index) { return removePresetAt(state(), key, index, options); },
            mergeImported: function mergeImported(imported) { return mergeImportedPresets(state(), key, imported, options); }
        };
    }

    presetEngine.presetEngineService = {
        getPresets,
        savePresets,
        upsertPreset,
        renamePreset,
        removePresetAt,
        mergeImportedPresets,
        createStateStore,
        createPreset: model.createPreset,
        normalizeName: model.normalizeName,
        cloneJson: model.cloneJson
    };
})(window);
