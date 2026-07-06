// --- Sub API settings view (V18) ---
// 总结/后台/向量/补齐/偷看/识图等副 API 设置 UI；不处理聊天请求。
(function registerSubApiSettingsView(global) {
    const OwoApp = global.OwoApp;
    const apiSettings = OwoApp.features.settings.apiSettings;
    const model = apiSettings.model;
    const modelListService = apiSettings.apiModelListService;
    const presetService = apiSettings.apiPresetService;
    const storageRepository = OwoApp.platform.storage.repository;
    const sharedUi = OwoApp.shared.ui;

    function byId(id) { return document.getElementById(id); }
    function getBlockedApiDomains() {
        return global.BLOCKED_API_DOMAINS
            || global.OwoApp?.app?.state?.staticConfig?.BLOCKED_API_DOMAINS
            || [];
    }
    function notify(message, duration) {
        const showToast = sharedUi.showToast;
        if (typeof showToast === 'function') showToast(message, duration);
    }
    function notifyApiError(error) {
        const showApiError = sharedUi.showApiError;
        if (typeof showApiError === 'function') showApiError(error);
        else notify(error && error.message ? error.message : '请求失败');
    }
    function saveAppData() {
        return storageRepository.saveData();
    }
    function setSingleOption(selectEl, value) {
        if (!selectEl) return;
        selectEl.innerHTML = '';
        if (!value) return;
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = value;
        selectEl.appendChild(opt);
        selectEl.value = value;
    }

    function setupSubApiSettings(prefix, dbKey, presetsKey) {
        const config = model.getSubApiConfig(prefix) || { displayName: prefix };
        const providerEl = byId(`${prefix}-api-provider`);
        const urlEl = byId(`${prefix}-api-url`);
        const keyEl = byId(`${prefix}-api-key`);
        const modelEl = byId(`${prefix}-api-model`);
        const fetchBtn = byId(`${prefix}-fetch-models-btn`);
        const saveBtn = byId(`${prefix}-api-save-btn`);
        if (!providerEl || !urlEl || !keyEl || !modelEl) return;

        loadSubApiForm(dbKey, providerEl, urlEl, keyEl, modelEl);
        providerEl.addEventListener('change', () => { urlEl.value = model.getProviderUrl(providerEl.value); });
        fetchBtn?.addEventListener('click', () => fetchSubApiModels(prefix));
        saveBtn?.addEventListener('click', () => saveSubApiSettings(prefix, dbKey, config.displayName));
        setupSubApiPresets(prefix, dbKey, presetsKey);
    }

    function loadSubApiForm(dbKey, providerEl, urlEl, keyEl, modelEl) {
        const saved = global.db[dbKey] || {};
        providerEl.value = saved.provider || 'newapi';
        urlEl.value = saved.url || '';
        keyEl.value = saved.key || '';
        if (saved.model) setSingleOption(modelEl, saved.model);
    }

    async function fetchSubApiModels(prefix) {
        const providerEl = byId(`${prefix}-api-provider`);
        const urlEl = byId(`${prefix}-api-url`);
        const keyEl = byId(`${prefix}-api-key`);
        const modelEl = byId(`${prefix}-api-model`);
        const fetchBtn = byId(`${prefix}-fetch-models-btn`);
        if (fetchBtn) { fetchBtn.classList.add('loading'); fetchBtn.disabled = true; }
        try {
            const models = await modelListService.fetchModelList({
                provider: providerEl?.value || 'newapi',
                url: urlEl?.value || '',
                key: keyEl?.value || '',
                model: modelEl?.value || ''
            }, { blockedDomains: getBlockedApiDomains(), getRandomValue: OwoApp.shared.utils.getRandomValue });
            modelListService.populateModelSelect(modelEl, models, { currentValue: modelEl ? modelEl.value : '' });
            notify(models.length ? '模型列表拉取成功！' : '未找到任何模型');
        } catch (err) {
            console.error(err);
            if (err.code === 'BLOCKED_API_DOMAIN') notify(err.message);
            else notifyApiError(err);
            if (modelEl) modelEl.innerHTML = '<option value="">拉取失败</option>';
        } finally {
            if (fetchBtn) { fetchBtn.classList.remove('loading'); fetchBtn.disabled = false; }
        }
    }

    async function saveSubApiSettings(prefix, dbKey, displayName) {
        const providerEl = byId(`${prefix}-api-provider`);
        const urlEl = byId(`${prefix}-api-url`);
        const keyEl = byId(`${prefix}-api-key`);
        const modelEl = byId(`${prefix}-api-model`);
        if (!modelEl?.value && ((urlEl?.value || '').trim() || (keyEl?.value || '').trim())) {
            notify('请选择模型后保存！'); return;
        }
        if (model.isBlockedBaseUrl(urlEl?.value || '', getBlockedApiDomains())) {
            notify('该 API 站点已被屏蔽，无法保存！'); return;
        }
        if (!(urlEl?.value || '').trim() && !(keyEl?.value || '').trim() && !modelEl?.value) {
            global.db[dbKey] = {}; await saveAppData(); notify(displayName + 'API设置已清空！'); return;
        }
        global.db[dbKey] = {
            provider: providerEl?.value || 'newapi',
            url: urlEl?.value || '',
            key: keyEl?.value || '',
            model: modelEl?.value || ''
        };
        await saveAppData(); notify(displayName + 'API设置已保存！');
    }

    function setupSubApiPresets(prefix, dbKey, presetsKey) {
        const presetSelect = byId(`${prefix}-api-preset-select`);
        const applyBtn = byId(`${prefix}-api-apply-preset`);
        const savePresetBtn = byId(`${prefix}-api-save-preset`);
        const manageBtn = byId(`${prefix}-api-manage-presets`);
        const importBtn = byId(`${prefix}-api-import-presets`);
        const exportBtn = byId(`${prefix}-api-export-presets`);
        const modal = byId(`${prefix}-api-presets-modal`);
        const closeModalBtn = byId(`${prefix}-api-close-modal`);
        const presetsList = byId(`${prefix}-api-presets-list`);

        function populatePresets() {
            const presets = presetService.getPresets(global.db, presetsKey);
            if (presetSelect) presetSelect.innerHTML = '<option value="">— 选择 —</option>';
            presets.forEach(p => {
                const opt = document.createElement('option');
                opt.value = p.name; opt.textContent = p.name;
                if (presetSelect) presetSelect.appendChild(opt);
            });
        }
        populatePresets();
        applyBtn?.addEventListener('click', () => applySubPreset(prefix, presetsKey, presetSelect));
        savePresetBtn?.addEventListener('click', () => saveSubPreset(prefix, presetsKey, populatePresets));
        manageBtn?.addEventListener('click', () => { renderPresetList(prefix, presetsKey, presetsList, populatePresets); if (modal) modal.style.display = 'flex'; });
        closeModalBtn?.addEventListener('click', () => { if (modal) modal.style.display = 'none'; });
        importBtn?.addEventListener('click', () => importSubPresets(presetsKey, populatePresets));
        exportBtn?.addEventListener('click', () => exportSubPresets(prefix, presetsKey));
    }

    function applySubPreset(prefix, presetsKey, presetSelect) {
        const name = presetSelect ? presetSelect.value : '';
        if (!name) return notify('请选择预设');
        const preset = presetService.getPresets(global.db, presetsKey).find(p => p.name === name);
        if (!preset) return notify('未找到该预设');
        presetService.applyPresetToForm(preset, {
            provider: `${prefix}-api-provider`, url: `${prefix}-api-url`, key: `${prefix}-api-key`, model: `${prefix}-api-model`
        }, byId);
        notify('预设已应用到表单！');
    }

    function saveSubPreset(prefix, presetsKey, populatePresets) {
        const name = prompt('为该预设填写名称（会覆盖同名预设）：');
        if (!name) return;
        const data = presetService.createSubPresetFromForm(prefix, byId);
        presetService.upsertPreset(global.db, presetsKey, presetService.createPreset(name, data));
        void saveAppData(); populatePresets(); notify('预设已保存');
    }

    function renderPresetList(prefix, presetsKey, container, populatePresets) {
        if (!container) return;
        const presets = presetService.getPresets(global.db, presetsKey);
        container.innerHTML = presets.length ? '' : '<p style="text-align:center;color:#999;">暂无预设</p>';
        presets.forEach((preset, idx) => {
            const div = document.createElement('div');
            div.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px;margin-bottom:6px;border:1px solid #e0e0e0;border-radius:6px;background:#fafafa;';
            const nameSpan = document.createElement('span');
            nameSpan.textContent = preset.name; nameSpan.style.cssText = 'flex:1;font-weight:500;';
            const delBtn = document.createElement('button');
            delBtn.textContent = '删除'; delBtn.className = 'btn btn-small'; delBtn.style.cssText = 'background:#ff4444;color:white;padding:4px 12px;';
            delBtn.onclick = () => {
                if (!confirm(`确定删除预设"${preset.name}"吗？`)) return;
                presetService.removePresetAt(global.db, presetsKey, idx);
                void saveAppData(); renderPresetList(prefix, presetsKey, container, populatePresets); populatePresets(); notify('预设已删除');
            };
            div.appendChild(nameSpan); div.appendChild(delBtn); container.appendChild(div);
        });
    }

    function importSubPresets(presetsKey, populatePresets) {
        const input = document.createElement('input');
        input.type = 'file'; input.accept = '.json';
        input.onchange = async event => {
            const file = event.target.files[0]; if (!file) return;
            try {
                presetService.mergeImportedPresets(global.db, presetsKey, JSON.parse(await file.text()));
                await saveAppData(); populatePresets(); notify('预设已导入');
            } catch (err) { console.error(err); notify('导入失败，请检查文件格式'); }
        };
        input.click();
    }

    function exportSubPresets(prefix, presetsKey) {
        const presets = presetService.getPresets(global.db, presetsKey);
        if (!presets.length) return notify('暂无预设可导出');
        const blob = new Blob([JSON.stringify(presets, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = `${prefix}_api_presets_${Date.now()}.json`; a.click();
        URL.revokeObjectURL(url); notify('预设已导出');
    }

    function setupAllSubApiSettings() {
        model.SUB_API_CONFIGS.forEach(config => setupSubApiSettings(config.prefix, config.dbKey, config.presetsKey));
        const irSwitch = byId('imageRecognition-enabled-switch');
        if (irSwitch) irSwitch.checked = global.db.imageRecognitionEnabled !== undefined ? global.db.imageRecognitionEnabled : false;
    }

    apiSettings.subApiSettingsView = { setupSubApiSettings, setupSubApiPresets, setupAllSubApiSettings };
})(window);
