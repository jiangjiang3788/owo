// --- Voice / TTS / CoT settings public facade (V21) ---
// 只导出稳定 API，不写业务逻辑。
(function registerVoiceCotSettingsPublic(global) {
    const OwoApp = global.OwoApp;
    const voiceCot = OwoApp.features.settings.voiceCot;
    const tts = voiceCot.ttsPresetView;
    const voice = voiceCot.voicePresetView;
    const cotCharacter = voiceCot.cotCharacterSettingsView;
    const cotEntry = voiceCot.cotSettingsEntry;

    const publicApi = {
        setupVoiceCotPresetFeatures: function setupVoiceCotPresetFeatures() {
            tts.setupTTSPresetBindings();
            voice.setupVoicePresetDelegates();
            voice.populateVoicePresetSelect();
        },

        getTTSPresets: tts.getPresets,
        saveTTSPresets: tts.savePresets,
        populateTTSPresetSelect: tts.populateTTSPresetSelect,
        saveCurrentTTSAsPreset: tts.saveCurrentTTSAsPreset,
        applyTTSPreset: tts.applyTTSPreset,
        openTTSManageModal: tts.openTTSManageModal,
        importTTSPresets: tts.importTTSPresets,
        exportTTSPresets: tts.exportTTSPresets,

        getVoicePresets: voice.getPresets,
        saveVoicePresets: voice.savePresets,
        populateVoicePresetSelect: voice.populateVoicePresetSelect,
        saveCurrentVoiceAsPreset: voice.saveCurrentVoiceAsPreset,
        applyVoicePreset: voice.applyVoicePreset,
        openVoicePresetManageModal: voice.openVoicePresetManageModal,

        loadCharacterCotSettings: cotCharacter.loadCharacterCotSettings,
        saveCharacterCotSettings: cotCharacter.saveCharacterCotSettings,
        populateCotPreset: cotCharacter.populateCotPreset,

        registerCotSettingsImplementation: cotEntry.registerCotSettingsImplementation,
        initCotSettings: cotEntry.initCotSettings,
        getRegisteredCotSettingsMeta: cotEntry.getRegisteredCotSettingsMeta
    };

    voiceCot.publicApi = publicApi;
})(window);
