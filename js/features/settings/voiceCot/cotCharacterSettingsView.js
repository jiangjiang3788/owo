// --- Character CoT settings view helpers (V21) ---
// 只迁移聊天设置页中的单角色 CoT UI 读写，不改 CoT prompt 生成逻辑。
(function registerCotCharacterSettingsView(global) {
    const OwoApp = global.OwoApp;
    const voiceCot = OwoApp.features.settings.voiceCot;

    function setVisible(element, visible, displayValue) {
        if (element) element.style.display = visible ? (displayValue || 'block') : 'none';
    }

    function bindSwitch(checkbox, container, displayValue) {
        if (!checkbox) return;
        setVisible(container, checkbox.checked, displayValue);
        checkbox.onchange = function onChange() {
            setVisible(container, this.checked, displayValue);
        };
    }

    function populateCotPreset(selectEl, defaultText, activeId, state) {
        if (!selectEl) return;
        selectEl.textContent = '';
        const empty = document.createElement('option');
        empty.value = '';
        empty.textContent = defaultText;
        selectEl.appendChild(empty);
        ((state && state.cotPresets) || []).forEach(preset => {
            const option = document.createElement('option');
            option.value = preset.id;
            option.textContent = preset.name;
            selectEl.appendChild(option);
        });
        if (activeId) selectEl.value = activeId;
    }

    function loadCharacterCotSettings(character, state) {
        const settings = (character && character.cotSettings) || {};
        const enabled = document.getElementById('setting-char-cot-enabled');
        const options = document.getElementById('setting-char-cot-options');
        const chatEnabled = document.getElementById('setting-char-cot-chat-enabled');
        const chatPreset = document.getElementById('setting-char-cot-chat-preset');
        const chatPresetContainer = document.getElementById('setting-char-cot-chat-preset-container');
        const callEnabled = document.getElementById('setting-char-cot-call-enabled');
        const callPreset = document.getElementById('setting-char-cot-call-preset');
        const callPresetContainer = document.getElementById('setting-char-cot-call-preset-container');
        const offlineEnabled = document.getElementById('setting-char-cot-offline-enabled');
        const offlinePreset = document.getElementById('setting-char-cot-offline-preset');
        const offlinePresetContainer = document.getElementById('setting-char-cot-offline-preset-container');
        if (enabled) {
            enabled.checked = !!settings.enabled;
            bindSwitch(enabled, options, 'block');
        }
        if (chatEnabled) {
            chatEnabled.checked = !!settings.chatEnabled;
            bindSwitch(chatEnabled, chatPresetContainer, 'block');
        }
        if (callEnabled) {
            callEnabled.checked = !!settings.callEnabled;
            bindSwitch(callEnabled, callPresetContainer, 'block');
        }
        if (offlineEnabled) {
            offlineEnabled.checked = !!settings.offlineEnabled;
            bindSwitch(offlineEnabled, offlinePresetContainer, 'block');
        }
        populateCotPreset(chatPreset, '默认预设', settings.activePresetId, state);
        populateCotPreset(callPreset, '默认通话预设', settings.activeCallPresetId, state);
        populateCotPreset(offlinePreset, '默认线下预设', settings.activeOfflinePresetId, state);
    }

    function saveCharacterCotSettings(character) {
        if (!character) return;
        const enabled = document.getElementById('setting-char-cot-enabled');
        const chatEnabled = document.getElementById('setting-char-cot-chat-enabled');
        const chatPreset = document.getElementById('setting-char-cot-chat-preset');
        const callEnabled = document.getElementById('setting-char-cot-call-enabled');
        const callPreset = document.getElementById('setting-char-cot-call-preset');
        const offlineEnabled = document.getElementById('setting-char-cot-offline-enabled');
        const offlinePreset = document.getElementById('setting-char-cot-offline-preset');
        if (!character.cotSettings) character.cotSettings = {};
        character.cotSettings.enabled = enabled ? enabled.checked : false;
        character.cotSettings.chatEnabled = chatEnabled ? chatEnabled.checked : false;
        character.cotSettings.activePresetId = chatPreset ? chatPreset.value : '';
        character.cotSettings.callEnabled = callEnabled ? callEnabled.checked : false;
        character.cotSettings.activeCallPresetId = callPreset ? callPreset.value : '';
        character.cotSettings.offlineEnabled = offlineEnabled ? offlineEnabled.checked : false;
        character.cotSettings.activeOfflinePresetId = offlinePreset ? offlinePreset.value : '';
    }

    voiceCot.cotCharacterSettingsView = {
        populateCotPreset,
        loadCharacterCotSettings,
        saveCharacterCotSettings
    };
})(window);
