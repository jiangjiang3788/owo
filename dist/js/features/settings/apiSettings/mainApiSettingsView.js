// --- Main API settings view (V18) ---
// 主 API 设置页 UI 绑定；不处理聊天 fetch / stream。
(function registerMainApiSettingsView(global) {
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

    function readMainForm() {
        return {
            provider: byId('api-provider')?.value || 'newapi',
            url: byId('api-url')?.value || '',
            key: byId('api-key')?.value || '',
            model: byId('api-model')?.value || ''
        };
    }

    async function fetchAndPopulateModels(showToastFlag = true) {
        const modelSelect = byId('api-model');
        const fetchBtn = byId('fetch-models-btn');
        const formData = readMainForm();
        if (fetchBtn) {
            fetchBtn.classList.add('loading');
            fetchBtn.disabled = true;
        }
        try {
            const models = await modelListService.fetchModelList(formData, {
                blockedDomains: getBlockedApiDomains(),
                getRandomValue: OwoApp.shared.utils.getRandomValue
            });
            modelListService.populateModelSelect(modelSelect, models, {
                currentValue: modelSelect ? modelSelect.value : '',
                fallbackValue: global.db?.apiSettings?.model || ''
            });
            if (showToastFlag) notify(models.length ? '模型列表拉取成功！' : '未找到任何模型');
        } catch (err) {
            console.error(err);
            if (showToastFlag) {
                if (err.code === 'BLOCKED_API_DOMAIN') notify(err.message);
                else notifyApiError(err);
                if (modelSelect) modelSelect.innerHTML = '<option value="">拉取失败</option>';
            }
        } finally {
            if (fetchBtn) {
                fetchBtn.classList.remove('loading');
                fetchBtn.disabled = false;
            }
        }
    }

    function populateApiSelect() {
        const sel = byId('api-preset-select');
        if (!sel) return;
        const presets = presetService.getPresets(global.db, 'apiPresets');
        sel.innerHTML = '<option value="">— 选择 API 预设 —</option>';
        presets.forEach(p => {
            const opt = document.createElement('option');
            opt.value = p.name;
            opt.textContent = p.name;
            sel.appendChild(opt);
        });
    }

    function saveCurrentApiAsPreset() {
        const data = presetService.createMainPresetFromForm(byId);
        const name = prompt('为该 API 预设填写名称（会覆盖同名预设）：');
        if (!name) return;
        presetService.upsertPreset(global.db, 'apiPresets', presetService.createPreset(name, data));
        void saveAppData();
        populateApiSelect();
        notify('API 预设已保存');
    }

    async function applyApiPreset(name) {
        const preset = presetService.getPresets(global.db, 'apiPresets').find(item => item.name === name);
        if (!preset) return notify('未找到该预设');
        try {
            presetService.applyPresetToForm(preset, {
                provider: 'api-provider',
                url: 'api-url',
                key: 'api-key',
                model: 'api-model'
            }, byId);
            notify('已应用 API 预设');
        } catch (err) {
            console.error('applyApiPreset error', err);
        }
    }

    function openApiManageModal() {
        const modal = byId('api-presets-modal');
        const list = byId('api-presets-list');
        if (!modal || !list) return;
        list.innerHTML = '';
        const presets = presetService.getPresets(global.db, 'apiPresets');
        if (!presets.length) list.innerHTML = '<p style="color:#888;margin:6px 0;">暂无预设</p>';
        presets.forEach((p, idx) => renderMainPresetRow(list, modal, p, idx));
        modal.style.display = 'flex';
    }

    function renderMainPresetRow(list, modal, preset, index) {
        const row = document.createElement('div');
        row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 6px;border-bottom:1px solid #f6f6f6;';
        const left = document.createElement('div');
        left.style.cssText = 'flex:1;min-width:0;';
        const title = document.createElement('div');
        title.style.fontWeight = '600';
        title.textContent = preset.name || '';
        const meta = document.createElement('div');
        meta.style.cssText = 'font-size:12px;color:#666;margin-top:4px;';
        meta.textContent = preset.data?.provider ? ('提供者：' + preset.data.provider) : '';
        left.appendChild(title);
        left.appendChild(meta);
        const btns = document.createElement('div');
        btns.style.cssText = 'display:flex;gap:6px;';
        btns.appendChild(createButton('应用', () => { applyApiPreset(preset.name); modal.style.display = 'none'; }));
        btns.appendChild(createButton('重命名', () => {
            const newName = prompt('输入新名称：', preset.name);
            if (!newName) return;
            presetService.renamePreset(global.db, 'apiPresets', index, newName);
            void saveAppData(); openApiManageModal(); populateApiSelect();
        }));
        btns.appendChild(createButton('删除', () => {
            if (!confirm('确定删除 "' + preset.name + '" ?')) return;
            presetService.removePresetAt(global.db, 'apiPresets', index);
            void saveAppData(); openApiManageModal(); populateApiSelect();
        }));
        row.appendChild(left); row.appendChild(btns); list.appendChild(row);
    }

    function createButton(text, onClick) {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = text;
        btn.onclick = onClick;
        return btn;
    }

    function exportApiPresets() {
        const blob = new Blob([JSON.stringify(presetService.getPresets(global.db, 'apiPresets'), null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'api_presets.json'; document.body.appendChild(a); a.click(); a.remove();
        URL.revokeObjectURL(url);
    }

    function importApiPresets() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'application/json';
        input.onchange = async event => {
            const file = event.target.files[0];
            if (!file) return;
            try {
                presetService.mergeImportedPresets(global.db, 'apiPresets', JSON.parse(await file.text()));
                await saveAppData(); populateApiSelect(); openApiManageModal();
            } catch (err) { alert('导入失败：' + err.message); }
        };
        input.click();
    }

    function bindMainApiSettings() {
        const form = byId('api-form');
        const providerEl = byId('api-provider');
        const urlEl = byId('api-url');
        const keyEl = byId('api-key');
        const modelEl = byId('api-model');
        const fetchBtn = byId('fetch-models-btn');
        if (global.db.apiSettings) {
            providerEl && (providerEl.value = global.db.apiSettings.provider || 'newapi');
            urlEl && (urlEl.value = global.db.apiSettings.url || '');
            keyEl && (keyEl.value = global.db.apiSettings.key || '');
            if (modelEl && global.db.apiSettings.model) setSingleOption(modelEl, global.db.apiSettings.model);
        }
        setChecked('online-role-switch', global.db.apiSettings?.onlineRoleEnabled, true);
        setChecked('time-perception-switch', global.db.apiSettings?.timePerceptionEnabled, false);
        setChecked('stream-switch', global.db.apiSettings?.streamEnabled, true);
        setChecked('quick-reply-switch', global.db.apiSettings?.quickReplyEnabled, false);
        bindTemperature(); populateApiSelect();
        providerEl?.addEventListener('change', () => { if (urlEl) urlEl.value = model.getProviderUrl(providerEl.value); });
        fetchBtn?.addEventListener('click', () => fetchAndPopulateModels(true));
        form?.addEventListener('submit', saveMainApiSettings);
    }

    function bindTemperature() {
        const slider = byId('temperature-slider');
        const value = byId('temperature-value');
        if (!slider || !value) return;
        const saved = global.db.apiSettings?.temperature !== undefined ? global.db.apiSettings.temperature : 1.0;
        slider.value = saved; value.textContent = saved;
        slider.addEventListener('input', event => { value.textContent = event.target.value; });
    }

    async function saveMainApiSettings(event) {
        event.preventDefault();
        const data = model.normalizeApiFormData(readMainForm());
        if (!data.model) return notify('请选择模型后保存！');
        if (model.isBlockedBaseUrl(data.url, getBlockedApiDomains())) return notify('该 API 站点已被屏蔽，无法保存！');
        global.db.apiSettings = Object.assign({}, data, {
            onlineRoleEnabled: !!byId('online-role-switch')?.checked,
            timePerceptionEnabled: !!byId('time-perception-switch')?.checked,
            streamEnabled: !!byId('stream-switch')?.checked,
            quickReplyEnabled: !!byId('quick-reply-switch')?.checked,
            temperature: parseFloat(byId('temperature-slider')?.value || '1')
        });
        const irSwitch = byId('imageRecognition-enabled-switch');
        if (irSwitch) global.db.imageRecognitionEnabled = irSwitch.checked;
        await saveAppData(); notify('API设置已保存！');
    }

    function setChecked(id, value, fallback) {
        const el = byId(id);
        if (el) el.checked = typeof value !== 'undefined' ? value : fallback;
    }

    apiSettings.mainApiSettingsView = {
        bindMainApiSettings,
        fetchAndPopulateModels,
        populateApiSelect,
        saveCurrentApiAsPreset,
        applyApiPreset,
        openApiManageModal,
        exportApiPresets,
        importApiPresets
    };
})(window);
