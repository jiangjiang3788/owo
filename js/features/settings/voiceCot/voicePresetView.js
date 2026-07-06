// --- Voice preset settings view (V21) ---
// 只处理角色音色预设 UI，不改 TTS 播放和聊天逻辑。
(function registerVoicePresetView(global) {
    const OwoApp = global.OwoApp;
    const voiceCot = OwoApp.features.settings.voiceCot;
    const runtime = voiceCot.runtime;

    function store() {
        return runtime.getPresetEngine().createStateStore({ key: 'voicePresets', getState: runtime.getState });
    }

    function getPresets() {
        return store().get();
    }

    function savePresets(presets) {
        store().replace(presets || []);
        return runtime.save();
    }

    function getCurrentChat() {
        const state = runtime.getState();
        const currentChatId = global.currentChatId;
        if (!currentChatId || !state || !Array.isArray(state.characters)) return null;
        return state.characters.find(character => character.id === currentChatId) || null;
    }

    function readCurrentVoicePreset(chat) {
        const ttsConfig = chat && chat.ttsConfig;
        if (!ttsConfig) return null;
        return {
            voiceId: ttsConfig.voiceId || '',
            customVoiceId: ttsConfig.customVoiceId || '',
            language: ttsConfig.language || 'auto',
            speed: ttsConfig.speed != null ? ttsConfig.speed : 1,
            userVoiceId: ttsConfig.userVoiceId || '',
            userCustomVoiceId: ttsConfig.userCustomVoiceId || '',
            userLanguage: ttsConfig.userLanguage || 'auto',
            userSpeed: ttsConfig.userSpeed != null ? ttsConfig.userSpeed : 1
        };
    }

    function populateVoicePresetSelect() {
        const select = document.getElementById('voice-preset-select');
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

    function saveCurrentVoiceAsPreset() {
        const chat = getCurrentChat();
        if (!chat) return runtime.showToast('请先打开一个角色');
        const preset = readCurrentVoicePreset(chat);
        if (!preset) return runtime.showToast('当前角色无语音配置');
        const name = prompt('请输入音色预设名称（将覆盖同名预设）：');
        if (!name) return;
        store().upsert(Object.assign({ name }, preset));
        runtime.save();
        populateVoicePresetSelect();
        runtime.showToast('音色预设已保存');
    }

    function applyVoicePreset(name) {
        const chat = getCurrentChat();
        if (!chat) return runtime.showToast('请先打开一个角色');
        const preset = getPresets().find(item => item.name === name);
        if (!preset) return runtime.showToast('未找到该预设');
        if (!chat.ttsConfig) chat.ttsConfig = {};
        chat.ttsConfig.voiceId = preset.voiceId || '';
        chat.ttsConfig.customVoiceId = preset.customVoiceId || '';
        chat.ttsConfig.language = preset.language || 'auto';
        chat.ttsConfig.speed = preset.speed != null ? preset.speed : 1;
        chat.ttsConfig.userVoiceId = preset.userVoiceId || '';
        chat.ttsConfig.userCustomVoiceId = preset.userCustomVoiceId || '';
        chat.ttsConfig.userLanguage = preset.userLanguage || 'auto';
        chat.ttsConfig.userSpeed = preset.userSpeed != null ? preset.userSpeed : 1;
        runtime.save();
        if (global.TTSSettings && typeof global.TTSSettings.loadChatTTSConfig === 'function') {
            global.TTSSettings.loadChatTTSConfig(global.currentChatId);
        }
        runtime.showToast('已应用音色预设：' + name);
    }

    function createButton(text, className, onClick) {
        const button = document.createElement('button');
        button.className = className || 'btn';
        button.style.cssText = 'padding:6px 8px;border-radius:8px';
        button.textContent = text;
        button.onclick = onClick;
        return button;
    }

    function openVoicePresetManageModal() {
        const modal = document.getElementById('voice-presets-modal');
        const list = document.getElementById('voice-presets-list');
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
            const nameWrap = document.createElement('div');
            nameWrap.style.cssText = 'flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;';
            const title = document.createElement('div');
            title.textContent = preset.name;
            const meta = document.createElement('div');
            meta.style.cssText = 'font-size:11px;color:#999;';
            meta.textContent = preset.customVoiceId || preset.voiceId || '未设置';
            nameWrap.appendChild(title);
            nameWrap.appendChild(meta);
            const buttons = document.createElement('div');
            buttons.style.cssText = 'display:flex;gap:6px;';
            buttons.appendChild(createButton('应用', 'btn btn-primary', function () {
                applyVoicePreset(preset.name);
                modal.style.display = 'none';
            }));
            buttons.appendChild(createButton('重命名', 'btn', function () {
                const newName = prompt('输入新名称：', preset.name);
                if (!newName) return;
                store().renameAt(index, newName);
                runtime.save();
                openVoicePresetManageModal();
                populateVoicePresetSelect();
            }));
            buttons.appendChild(createButton('删除', 'btn', function () {
                if (!runtime.confirmDialog('确认删除该预设？')) return;
                store().removeAt(index);
                runtime.save();
                openVoicePresetManageModal();
                populateVoicePresetSelect();
            }));
            row.appendChild(nameWrap);
            row.appendChild(buttons);
            list.appendChild(row);
        });
        modal.style.display = 'flex';
    }

    function setupVoicePresetDelegates() {
        if (setupVoicePresetDelegates._bound) return;
        setupVoicePresetDelegates._bound = true;
        document.addEventListener('click', event => {
            const target = event.target;
            if (!target || !target.matches) return;
            if (target.matches('#voice-apply-preset-btn')) {
                const select = document.getElementById('voice-preset-select');
                const presetName = select && select.value;
                if (!presetName) return runtime.showToast('请选择一个预设');
                applyVoicePreset(presetName);
            }
            if (target.matches('#voice-save-preset-btn')) saveCurrentVoiceAsPreset();
            if (target.matches('#voice-manage-presets-btn')) openVoicePresetManageModal();
        });
    }

    voiceCot.voicePresetView = {
        getPresets,
        savePresets,
        populateVoicePresetSelect,
        saveCurrentVoiceAsPreset,
        applyVoicePreset,
        openVoicePresetManageModal,
        setupVoicePresetDelegates
    };
})(window);
