// --- legacy global deprecation registry (V38) ---
// 旧 window.* 兼容入口保留，但新代码必须走 canonical owner。
(function registerLegacyDeprecation(global) {
    const OwoApp = global.OwoApp;
    if (!OwoApp || !OwoApp.app) throw new Error('js/app/namespace.js 必须先加载');

    const deprecatedGlobals = new Map();
    const curatedGlobals = [
        {"name":"pad","legacy":"window.pad","owner":"OwoApp.shared.utils.pad","ownerFile":"js/shared/utils/number.js","state":"canonical","since":"V38"},
        {"name":"getRandomValue","legacy":"window.getRandomValue","owner":"OwoApp.shared.utils.getRandomValue","ownerFile":"js/shared/utils/text.js","state":"canonical","since":"V38"},
        {"name":"generateUUID","legacy":"window.generateUUID","owner":"OwoApp.shared.utils.generateUUID","ownerFile":"js/shared/utils/id.js","state":"canonical","since":"V38"},
        {"name":"getLocalTimeInTimezone","legacy":"window.getLocalTimeInTimezone","owner":"OwoApp.shared.utils.getLocalTimeInTimezone","ownerFile":"js/shared/utils/time.js","state":"canonical","since":"V38"},
        {"name":"formatTimeDivider","legacy":"window.formatTimeDivider","owner":"OwoApp.shared.utils.formatTimeDivider","ownerFile":"js/shared/utils/time.js","state":"canonical","since":"V38"},
        {"name":"getFormattedTimestamp","legacy":"window.getFormattedTimestamp","owner":"OwoApp.shared.utils.getFormattedTimestamp","ownerFile":"js/shared/utils/time.js","state":"canonical","since":"V38"},
        {"name":"formatTimeGap","legacy":"window.formatTimeGap","owner":"OwoApp.shared.utils.formatTimeGap","ownerFile":"js/shared/utils/time.js","state":"canonical","since":"V38"},
        {"name":"showAppConfirmDialog","legacy":"window.showAppConfirmDialog","owner":"OwoApp.shared.ui.showAppConfirmDialog","ownerFile":"js/shared/ui/confirmDialog.js","state":"canonical","since":"V38"},
        {"name":"compressImage","legacy":"window.compressImage","owner":"OwoApp.platform.browser.compressImage","ownerFile":"js/platform/browser/imageAdapter.js","state":"canonical","since":"V38"},
        {"name":"showSystemNotification","legacy":"window.showSystemNotification","owner":"OwoApp.platform.browser.showSystemNotification","ownerFile":"js/platform/browser/notificationAdapter.js","state":"canonical","since":"V38"},
        {"name":"saveData","legacy":"window.saveData","owner":"OwoApp.platform.storage.repository.saveData","ownerFile":"js/platform/storage/repository.js","state":"canonical","since":"V38"},
        {"name":"saveCharacter","legacy":"window.saveCharacter","owner":"OwoApp.platform.storage.repository.saveCharacter","ownerFile":"js/platform/storage/repository.js","state":"canonical","since":"V38"},
        {"name":"saveGroup","legacy":"window.saveGroup","owner":"OwoApp.platform.storage.repository.saveGroup","ownerFile":"js/platform/storage/repository.js","state":"canonical","since":"V38"},
        {"name":"saveGlobalSettings","legacy":"window.saveGlobalSettings","owner":"OwoApp.platform.storage.repository.saveGlobalSettings","ownerFile":"js/platform/storage/repository.js","state":"canonical","since":"V38"},
        {"name":"initDatabase","legacy":"window.initDatabase","owner":"OwoApp.platform.storage.dexieAdapter.initDatabase","ownerFile":"js/platform/storage/dexieAdapter.js","state":"canonical","since":"V38"},
        {"name":"createFullBackupData","legacy":"window.createFullBackupData","owner":"OwoApp.platform.storage.backupAdapter.legacyBackupApi.createFullBackupData","ownerFile":"js/platform/storage/backupAdapter.js","state":"canonical","since":"V38"},
        {"name":"createPartialBackupData","legacy":"window.createPartialBackupData","owner":"OwoApp.platform.storage.backupAdapter.legacyBackupApi.createPartialBackupData","ownerFile":"js/platform/storage/backupAdapter.js","state":"canonical","since":"V38"},
        {"name":"importPartialBackupData","legacy":"window.importPartialBackupData","owner":"OwoApp.platform.storage.backupAdapter.legacyBackupApi.importPartialBackupData","ownerFile":"js/platform/storage/backupAdapter.js","state":"canonical","since":"V38"},
        {"name":"importBackupData","legacy":"window.importBackupData","owner":"OwoApp.platform.storage.backupAdapter.legacyBackupApi.importBackupData","ownerFile":"js/platform/storage/backupAdapter.js","state":"canonical","since":"V38"},
        {"name":"updateBatteryStatus","legacy":"window.updateBatteryStatus","owner":"OwoApp.platform.browser.updateBatteryStatus","ownerFile":"js/platform/browser/batteryAdapter.js","state":"canonical","since":"V38"},
        {"name":"showToast","legacy":"window.showToast","owner":"OwoApp.shared.ui.showToast","ownerFile":"js/shared/ui/toast.js","state":"canonical","since":"V38"},
        {"name":"getFriendlyErrorMessage","legacy":"window.getFriendlyErrorMessage","owner":"OwoApp.shared.ui.getFriendlyErrorMessage","ownerFile":"js/shared/ui/errorModal.js","state":"canonical","since":"V38"},
        {"name":"showErrorModal","legacy":"window.showErrorModal","owner":"OwoApp.shared.ui.showErrorModal","ownerFile":"js/shared/ui/errorModal.js","state":"canonical","since":"V38"},
        {"name":"showApiError","legacy":"window.showApiError","owner":"OwoApp.shared.ui.showApiError","ownerFile":"js/shared/ui/errorModal.js","state":"canonical","since":"V38"},
        {"name":"triggerHapticFeedback","legacy":"window.triggerHapticFeedback","owner":"OwoApp.platform.browser.hapticAdapter.createHapticFeedback","ownerFile":"js/platform/browser/hapticAdapter.js","state":"canonical","since":"V38"},
        {"name":"aiMessageContentToText","legacy":"window.aiMessageContentToText","owner":"OwoApp.core.chat.messageSemantics.aiMessageContentToText","ownerFile":"js/core/chat/messageSemantics.js","state":"canonical","since":"V38"},
        {"name":"wrapSystemMessageForCompat","legacy":"window.wrapSystemMessageForCompat","owner":"OwoApp.core.chat.messageSemantics.wrapSystemMessageForCompat","ownerFile":"js/core/chat/messageSemantics.js","state":"canonical","since":"V38"},
        {"name":"mergeAdjacentCompatMessages","legacy":"window.mergeAdjacentCompatMessages","owner":"OwoApp.core.chat.messageSemantics.mergeAdjacentCompatMessages","ownerFile":"js/core/chat/messageSemantics.js","state":"canonical","since":"V38"},
        {"name":"normalizeMessagesForProvider","legacy":"window.normalizeMessagesForProvider","owner":"OwoApp.core.chat.messageSemantics.normalizeMessagesForProvider","ownerFile":"js/core/chat/messageSemantics.js","state":"canonical","since":"V38"},
        {"name":"setupChatSettings","legacy":"window.setupChatSettings","owner":"OwoApp.features.settings.publicApi.setupChatSettings","ownerFile":"js/features/settings/public.js","state":"canonical-entry","since":"V38"},
        {"name":"loadSettingsToSidebar","legacy":"window.loadSettingsToSidebar","owner":"OwoApp.features.settings.publicApi.loadSettingsToSidebar","ownerFile":"js/features/settings/public.js","state":"canonical-entry","since":"V38"},
        {"name":"setupMagicRoomApp","legacy":"window.setupMagicRoomApp","owner":"OwoApp.features.settings.publicApi.setupMagicRoomApp","ownerFile":"js/features/settings/public.js","state":"canonical-entry","since":"V38"},
        {"name":"setupApiSettingsApp","legacy":"window.setupApiSettingsApp","owner":"OwoApp.features.settings.apiSettings.publicApi.setupApiSettingsApp","ownerFile":"js/features/settings/apiSettings/public.js","state":"canonical-entry","since":"V38"},
        {"name":"setupWallpaperApp","legacy":"window.setupWallpaperApp","owner":"OwoApp.features.settings.appearance.publicApi.setupWallpaperApp","ownerFile":"js/features/settings/appearance/public.js","state":"canonical-entry","since":"V38"},
        {"name":"setupPresetFeatures","legacy":"window.setupPresetFeatures","owner":"OwoApp.features.settings.publicApi.setupPresetFeatures","ownerFile":"js/features/settings/public.js","state":"canonical-entry","since":"V38"},
        {"name":"setupCustomizeApp","legacy":"window.setupCustomizeApp","owner":"OwoApp.features.settings.publicApi.setupCustomizeApp","ownerFile":"js/features/settings/public.js","state":"canonical-entry","since":"V38"},
        {"name":"setupNightModeBindings","legacy":"window.setupNightModeBindings","owner":"OwoApp.features.settings.appearance.publicApi.setupNightModeBindings","ownerFile":"js/features/settings/appearance/public.js","state":"canonical-entry","since":"V38"},
        {"name":"setupStatusBarBindings","legacy":"window.setupStatusBarBindings","owner":"OwoApp.features.settings.appearance.publicApi.setupStatusBarBindings","ownerFile":"js/features/settings/appearance/public.js","state":"canonical-entry","since":"V38"},
        {"name":"applyNightMode","legacy":"window.applyNightMode","owner":"OwoApp.features.settings.appearance.publicApi.applyNightMode","ownerFile":"js/features/settings/appearance/public.js","state":"compat-wrapper","since":"V38"},
        {"name":"applyHomeStatusBar","legacy":"window.applyHomeStatusBar","owner":"OwoApp.features.settings.appearance.publicApi.applyHomeStatusBar","ownerFile":"js/features/settings/appearance/public.js","state":"compat-wrapper","since":"V38"},
        {"name":"initCotSettings","legacy":"window.initCotSettings","owner":"OwoApp.features.settings.voiceCot.publicApi.initCotSettings","ownerFile":"js/features/settings/voiceCot/public.js","state":"canonical-entry","since":"V38"},
        {"name":"ensureVectorMemoryState","legacy":"window.ensureVectorMemoryState","owner":"OwoApp.features.vectorMemory.model.ensureVectorMemoryState","ownerFile":"js/features/vectorMemory/model.js","state":"canonical","since":"V38"},
        {"name":"getVectorMemoryContextBlock","legacy":"window.getVectorMemoryContextBlock","owner":"OwoApp.features.vectorMemory.contextService.getVectorMemoryContextBlock","ownerFile":"js/features/vectorMemory/contextService.js","state":"canonical","since":"V38"},
        {"name":"prepareVectorMemoryContext","legacy":"window.prepareVectorMemoryContext","owner":"OwoApp.features.vectorMemory.contextService.prepareVectorMemoryContext","ownerFile":"js/features/vectorMemory/contextService.js","state":"canonical","since":"V38"},
        {"name":"resetVectorCursorToLatest","legacy":"window.resetVectorCursorToLatest","owner":"OwoApp.features.vectorMemory.model.resetVectorCursorToLatest","ownerFile":"js/features/vectorMemory/model.js","state":"canonical","since":"V38"},
        {"name":"legacyGlobalsGate","legacy":"window.* / global.* deprecated calls","owner":"tools/legacy-globals-gate.js","ownerFile":"tools/legacy-globals-gate.js","state":"canonical-gate","since":"V38"}
    ];

    function normalizeMeta(name, meta) {
        const source = meta || {};
        return Object.freeze({
            name,
            legacy: source.legacy || ('window.' + name),
            owner: source.owner || '',
            ownerFile: source.ownerFile || '',
            state: source.state || 'canonical',
            since: source.since || 'V38',
            deprecated: source.deprecated !== false,
            note: source.note || 'V38: 旧全局入口仅保留兼容，新代码必须走 canonical owner。'
        });
    }

    function markDeprecated(name, meta) {
        if (!name) return null;
        const normalized = normalizeMeta(name, meta);
        deprecatedGlobals.set(name, normalized);
        return normalized;
    }

    function registerDeprecatedGlobals(list) {
        (Array.isArray(list) ? list : []).forEach(item => markDeprecated(item.name, item));
    }

    function isDeprecatedGlobal(name) { return deprecatedGlobals.has(name); }
    function getDeprecatedGlobalMeta(name) { return deprecatedGlobals.get(name) || null; }
    function getDeprecatedGlobalNames() { return Array.from(deprecatedGlobals.keys()).sort(); }
    function getDeprecationReport() {
        const names = getDeprecatedGlobalNames();
        return Object.freeze({
            version: 'V38',
            deprecatedCount: names.length,
            deprecatedGlobals: names.map(name => deprecatedGlobals.get(name)),
            policy: '旧 window.* 兼容入口保留但 deprecated；新代码禁止直接调用旧全局。'
        });
    }

    registerDeprecatedGlobals(curatedGlobals);
    OwoApp.app.legacyDeprecation = {
        markDeprecated,
        registerDeprecatedGlobals,
        isDeprecatedGlobal,
        getDeprecatedGlobalMeta,
        getDeprecatedGlobalNames,
        getDeprecationReport
    };
})(window);
