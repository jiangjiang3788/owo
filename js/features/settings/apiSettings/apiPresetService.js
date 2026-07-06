// --- API preset service (V20) ---
// API preset 的通用 CRUD 统一走 settings presetEngine；本文件只保留 API 表单数据映射。
(function registerApiPresetService(global) {
    const OwoApp = global.OwoApp;
    const apiSettings = OwoApp.features.settings.apiSettings;
    const presetEngine = OwoApp.features.settings.presetEngine.publicApi;

    function getPresets(state, presetsKey) {
        return presetEngine.getPresets(state, presetsKey);
    }

    function savePresets(state, presetsKey, presets) {
        return presetEngine.savePresets(state, presetsKey, presets);
    }

    function upsertPreset(state, presetsKey, preset) {
        return presetEngine.upsertPreset(state, presetsKey, preset);
    }

    function renamePreset(state, presetsKey, index, newName) {
        return presetEngine.renamePreset(state, presetsKey, index, newName);
    }

    function removePresetAt(state, presetsKey, index) {
        return presetEngine.removePresetAt(state, presetsKey, index);
    }

    function mergeImportedPresets(state, presetsKey, imported) {
        return presetEngine.mergeImportedPresets(state, presetsKey, imported);
    }

    function createMainPresetFromForm(getEl) {
        const apiKeyEl = getEl('api-key');
        const apiUrlEl = getEl('api-url');
        const providerEl = getEl('api-provider');
        const modelEl = getEl('api-model');
        return {
            apiKey: apiKeyEl ? apiKeyEl.value : '',
            apiUrl: apiUrlEl ? apiUrlEl.value : '',
            provider: providerEl ? providerEl.value : '',
            model: modelEl ? modelEl.value : ''
        };
    }

    function createSubPresetFromForm(prefix, getEl) {
        const providerEl = getEl(`${prefix}-api-provider`);
        const urlEl = getEl(`${prefix}-api-url`);
        const keyEl = getEl(`${prefix}-api-key`);
        const modelEl = getEl(`${prefix}-api-model`);
        return {
            provider: providerEl ? providerEl.value : '',
            apiUrl: urlEl ? urlEl.value : '',
            apiKey: keyEl ? keyEl.value : '',
            model: modelEl ? modelEl.value : ''
        };
    }

    function setSingleOption(selectEl, value) {
        if (!selectEl) return;
        selectEl.innerHTML = '';
        if (typeof value === 'undefined' || value === null || value === '') return;
        const opt = document.createElement('option');
        opt.value = String(value);
        opt.textContent = String(value);
        selectEl.appendChild(opt);
        selectEl.value = String(value);
    }

    function applyPresetToForm(preset, ids, getEl) {
        if (!preset || !preset.data) return;
        const providerEl = getEl(ids.provider);
        const urlEl = getEl(ids.url);
        const keyEl = getEl(ids.key);
        const modelEl = getEl(ids.model);
        if (providerEl && typeof preset.data.provider !== 'undefined') providerEl.value = preset.data.provider;
        if (urlEl && typeof preset.data.apiUrl !== 'undefined') urlEl.value = preset.data.apiUrl;
        if (keyEl && typeof preset.data.apiKey !== 'undefined') keyEl.value = preset.data.apiKey;
        if (modelEl && typeof preset.data.model !== 'undefined') setSingleOption(modelEl, preset.data.model);
    }

    function createPreset(name, data) {
        return presetEngine.createPreset(name, data);
    }

    apiSettings.apiPresetService = {
        getPresets,
        savePresets,
        upsertPreset,
        renamePreset,
        removePresetAt,
        mergeImportedPresets,
        createMainPresetFromForm,
        createSubPresetFromForm,
        applyPresetToForm,
        createPreset
    };
})(window);
