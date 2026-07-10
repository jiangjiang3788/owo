// --- TTS preset settings view (V21) ---
// 只处理设置页 TTS 预设 UI，不改 TTS 合成、播放或聊天逻辑。
(function registerTTSPresetView(global) {
    const OwoApp = global.OwoApp;
    const voiceCot = OwoApp.features.settings.voiceCot;
    const runtime = voiceCot.runtime;

    function store() {
        return runtime.getPresetEngine().createStateStore({ key: 'ttsPresets', getState: runtime.getState });
    }

    function getPresets() {
        return store().get();
    }

    function savePresets(presets) {
        store().replace(presets || []);
        return runtime.save();
    }

    function readCurrentPreset() {
        return {
            enabled: document.getElementById('minimax-tts-enabled')?.checked || false,
            groupId: document.getElementById('minimax-group-id')?.value || '',
            apiKey: document.getElementById('minimax-api-key')?.value || '',
            domain: document.getElementById('minimax-domain')?.value || 'api.minimaxi.com',
            model: document.getElementById('minimax-tts-model')?.value || 'speech-2.8-hd'
        };
    }

    function applyPresetToForm(preset) {
        const enabled = document.getElementById('minimax-tts-enabled');
        const groupId = document.getElementById('minimax-group-id');
        const apiKey = document.getElementById('minimax-api-key');
        const domain = document.getElementById('minimax-domain');
        const model = document.getElementById('minimax-tts-model');
        if (enabled) enabled.checked = preset.enabled || false;
        if (groupId) groupId.value = preset.groupId || '';
        if (apiKey) apiKey.value = preset.apiKey || '';
        if (domain) domain.value = preset.domain || 'api.minimaxi.com';
        if (model) model.value = preset.model || 'speech-2.8-hd';
    }

    function populateTTSPresetSelect() {
        const select = document.getElementById('tts-preset-select');
        if (!select) return;
        select.textContent = '';
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = '— 选择 —';
        select.appendChild(empty);
        getPresets().forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.name;
            option.textContent = preset.name;
            select.appendChild(option);
        });
    }

    function saveCurrentTTSAsPreset() {
        const name = prompt('请输入 TTS 预设名称：');
        if (!name || !name.trim()) return;
        store().upsert(Object.assign({ name: name.trim() }, readCurrentPreset()));
        runtime.save();
        runtime.showToast('TTS 预设已保存');
        populateTTSPresetSelect();
    }

    function applyTTSPreset(name) {
        const preset = getPresets().find(item => item.name === name);
        if (!preset) return runtime.showToast('预设不存在');
        applyPresetToForm(preset);
        runtime.showToast(`已应用 TTS 预设：${name}`);
    }

    function createButton(text, className, onClick) {
        const button = document.createElement('button');
        button.className = className || 'btn';
        button.style.padding = '6px 8px';
        button.textContent = text;
        button.onclick = onClick;
        return button;
    }

    function openTTSManageModal() {
        const modal = document.getElementById('tts-presets-modal');
        const list = document.getElementById('tts-presets-list');
        if (!modal || !list) return;
        list.textContent = '';
        const presets = getPresets();
        if (!presets.length) {
            const empty = document.createElement('p');
            empty.style.cssText = 'color:#888;margin:6px 0;';
            empty.textContent = '暂无预设';
            list.appendChild(empty);
        }
        presets.forEach((preset, index) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid #f0f0f0;';
            const name = document.createElement('div');
            name.style.flex = '1';
            name.textContent = preset.name;
            const buttons = document.createElement('div');
            buttons.style.cssText = 'display:flex;gap:6px;';
            buttons.appendChild(createButton('重命名', 'btn', function () {
                const newName = prompt('输入新名称：', preset.name);
                if (!newName || newName === preset.name) return;
                store().renameAt(index, newName);
                runtime.save();
                openTTSManageModal();
                populateTTSPresetSelect();
            }));
            buttons.appendChild(createButton('删除', 'btn btn-danger', function () {
                if (!runtime.confirmDialog('确定删除预设 "' + preset.name + '" ?')) return;
                store().removeAt(index);
                runtime.save();
                openTTSManageModal();
                populateTTSPresetSelect();
            }));
            row.appendChild(name);
            row.appendChild(buttons);
            list.appendChild(row);
        });
        modal.style.display = 'flex';
    }

    function importTTSPresets() {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async event => {
            const file = event.target.files && event.target.files[0];
            if (!file) return;
            try {
                const text = await runtime.getFileAdapter().readTextFile(file);
                const imported = JSON.parse(text);
                if (!Array.isArray(imported)) throw new Error('格式错误');
                const merged = store().mergeImported(imported);
                await runtime.save();
                populateTTSPresetSelect();
                runtime.showToast(`已导入 ${merged.length} 个 TTS 预设`);
            } catch (err) {
                runtime.showToast('导入失败: ' + err.message);
            }
        };
        input.click();
    }

    function exportTTSPresets() {
        const presets = getPresets();
        if (!presets.length) return runtime.showToast('没有可导出的 TTS 预设');
        runtime.getFileAdapter().downloadJson(presets, 'tts_presets_' + Date.now() + '.json');
        runtime.showToast('TTS 预设已导出');
    }

    function setupTTSPresetBindings() {
        const saveBtn = document.getElementById('tts-save-preset');
        const manageBtn = document.getElementById('tts-manage-presets');
        const applyBtn = document.getElementById('tts-apply-preset');
        const select = document.getElementById('tts-preset-select');
        const modalClose = document.getElementById('tts-close-modal');
        const importBtn = document.getElementById('tts-import-presets');
        const exportBtn = document.getElementById('tts-export-presets');
        if (saveBtn) saveBtn.addEventListener('click', saveCurrentTTSAsPreset);
        if (manageBtn) manageBtn.addEventListener('click', openTTSManageModal);
        if (applyBtn) applyBtn.addEventListener('click', function () {
            const value = select && select.value;
            if (!value) return runtime.showToast('请选择预设');
            applyTTSPreset(value);
        });
        if (modalClose) modalClose.addEventListener('click', function () {
            const modal = document.getElementById('tts-presets-modal');
            if (modal) modal.style.display = 'none';
        });
        if (importBtn) importBtn.addEventListener('click', importTTSPresets);
        if (exportBtn) exportBtn.addEventListener('click', exportTTSPresets);
        populateTTSPresetSelect();
    }

    voiceCot.ttsPresetView = {
        getPresets,
        savePresets,
        populateTTSPresetSelect,
        saveCurrentTTSAsPreset,
        applyTTSPreset,
        openTTSManageModal,
        importTTSPresets,
        exportTTSPresets,
        setupTTSPresetBindings
    };
})(window);
