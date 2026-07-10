// --- platform/storage/loadRepair.js ---
// V6 loaded-data repair shell。
// 只负责把 IndexedDB / legacy localStorage 读出的数据补齐到当前 schema；不提供保存 writer，不复制 saveData。
(function registerStorageLoadRepair(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.storage) {
        throw new Error('js/app/namespace.js 必须在 platform/storage/loadRepair.js 之前加载');
    }

    const LEGACY_LOCAL_STORAGE_KEY = 'gemini-chat-app-db';

    function cloneValue(value) {
        return value === undefined ? undefined : JSON.parse(JSON.stringify(value));
    }

    function settingsArrayToObject(settingsArray) {
        return (settingsArray || []).reduce((acc, item) => {
            if (item && item.key !== undefined) acc[item.key] = item.value;
            return acc;
        }, {});
    }

    function applyLoadedTables(targetDb, loadedTables) {
        targetDb.characters = loadedTables.characters || [];
        targetDb.groups = loadedTables.groups || [];
        targetDb.worldBooks = loadedTables.worldBooks || [];
        targetDb.myStickers = loadedTables.myStickers || [];
        targetDb.archives = loadedTables.archives || [];
    }

    function hydrateGlobalSettings(targetDb, settingsArray, globalSettingKeys, defaultValue) {
        const settings = settingsArrayToObject(settingsArray);
        targetDb.worldBookCategoryOrder = settings.worldBookCategoryOrder || null;
        (globalSettingKeys || []).forEach((key) => {
            targetDb[key] = settings[key] !== undefined
                ? settings[key]
                : cloneValue(defaultValue ? defaultValue[key] : undefined);
        });
        // v0.8.13 retires the unused Memory Brain runtime. Keep any existing payload
        // in a temporary slot so repairLoadedData can preserve it in legacySnapshots.
        if (settings.memoryBrain !== undefined) {
            targetDb.__retiredMemoryBrainPayload = cloneValue(settings.memoryBrain);
        }
        return settings;
    }

    function retireMemoryBrainState(targetDb) {
        if (!targetDb.legacySnapshots || typeof targetDb.legacySnapshots !== 'object' || Array.isArray(targetDb.legacySnapshots)) {
            targetDb.legacySnapshots = {};
        }
        const payload = targetDb.__retiredMemoryBrainPayload !== undefined
            ? targetDb.__retiredMemoryBrainPayload
            : targetDb.memoryBrain;
        if (payload && typeof payload === 'object' && !targetDb.legacySnapshots.memoryBrain) {
            targetDb.legacySnapshots.memoryBrain = {
                feature: 'memoryBrain',
                sourceVersion: '<=0.8.12',
                retiredAt: new Date().toISOString(),
                reason: 'retired-unused-shadow-runtime',
                data: cloneValue(payload)
            };
        }
        delete targetDb.__retiredMemoryBrainPayload;
        delete targetDb.memoryBrain;
    }

    function ensureRootCollections(targetDb) {
        if (!Array.isArray(targetDb.stickerCategories)) targetDb.stickerCategories = [];
        if (!Array.isArray(targetDb.vectorMemoryTemplates)) targetDb.vectorMemoryTemplates = [];
        if (!Array.isArray(targetDb.vectorApiPresets)) targetDb.vectorApiPresets = [];
        retireMemoryBrainState(targetDb);
        if (!targetDb.piggyBank) targetDb.piggyBank = { balance: 520, transactions: [], familyCards: [], receivedFamilyCards: [] };
        if (typeof targetDb.piggyBank.balance !== 'number') targetDb.piggyBank.balance = 520;
        if (!Array.isArray(targetDb.piggyBank.transactions)) targetDb.piggyBank.transactions = [];
        if (!Array.isArray(targetDb.piggyBank.familyCards)) targetDb.piggyBank.familyCards = [];
        if (!Array.isArray(targetDb.piggyBank.receivedFamilyCards)) targetDb.piggyBank.receivedFamilyCards = [];
        if (!targetDb.forumStrangerProfiles || typeof targetDb.forumStrangerProfiles !== 'object') targetDb.forumStrangerProfiles = {};
        if (!Array.isArray(targetDb.forumFriendRequests)) targetDb.forumFriendRequests = [];
        if (!targetDb.forumPendingRequestFromUser || typeof targetDb.forumPendingRequestFromUser !== 'object') targetDb.forumPendingRequestFromUser = {};
        if (targetDb.forumSettings && targetDb.forumSettings.generateDetailedStranger === undefined) targetDb.forumSettings.generateDetailedStranger = false;
        if (targetDb.forumSettings && targetDb.forumSettings.enableCharAltDm === undefined) targetDb.forumSettings.enableCharAltDm = false;
        if (targetDb.forumSettings && !Array.isArray(targetDb.forumSettings.charAltCharIds)) targetDb.forumSettings.charAltCharIds = [];
        if (targetDb.forumSettings && targetDb.forumSettings.charAltProbability === undefined) targetDb.forumSettings.charAltProbability = 25;
        if (targetDb.forumSettings && (targetDb.forumSettings.charAltNames === undefined || typeof targetDb.forumSettings.charAltNames !== 'object')) targetDb.forumSettings.charAltNames = {};
    }

    function ensureStatusPanel(character) {
        if (!character.statusPanel) {
            character.statusPanel = {
                enabled: false,
                promptSuffix: '',
                regexPattern: '',
                replacePattern: '',
                historyLimit: 3,
                currentStatusRaw: '',
                currentStatusHtml: '',
                history: []
            };
        }
    }

    function ensureMemoryTables(character) {
        if (!character.memoryTables || typeof character.memoryTables !== 'object') {
            character.memoryTables = {
                enabled: true,
                boundTemplateIds: [],
                data: {},
                lockedFields: {},
                history: [],
                lastChangedFieldPaths: []
            };
        }
        if (!Array.isArray(character.memoryTables.boundTemplateIds)) character.memoryTables.boundTemplateIds = [];
        if (!character.memoryTables.data || typeof character.memoryTables.data !== 'object') character.memoryTables.data = {};
        if (!character.memoryTables.lockedFields || typeof character.memoryTables.lockedFields !== 'object') character.memoryTables.lockedFields = {};
        if (!Array.isArray(character.memoryTables.history)) character.memoryTables.history = [];
        if (!Array.isArray(character.memoryTables.lastChangedFieldPaths)) character.memoryTables.lastChangedFieldPaths = [];
    }

    function ensureVectorMemory(character) {
        if (!character.vectorMemory || typeof character.vectorMemory !== 'object') {
            character.vectorMemory = {
                enabled: true,
                boundTemplateId: null,
                entries: [],
                history: [],
                topK: 5,
                threshold: 0.28,
                autoSummaryEnabled: false,
                autoSummaryInterval: 200,
                autoSummaryState: 'idle',
                autoSummaryPending: false,
                lastSummarizedMsgId: null,
                lastSummarizedMsgTimestamp: null,
                lastContextBlock: '',
                lastRetrievedEntryIds: [],
                lastQueryText: '',
                lastPreparedAt: null
            };
        }
        if (!Array.isArray(character.vectorMemory.entries)) character.vectorMemory.entries = [];
        if (!Array.isArray(character.vectorMemory.history)) character.vectorMemory.history = [];
        if (character.vectorMemory.topK === undefined) character.vectorMemory.topK = 5;
        if (character.vectorMemory.threshold === undefined) character.vectorMemory.threshold = 0.28;
        if (character.vectorMemory.autoSummaryEnabled === undefined) character.vectorMemory.autoSummaryEnabled = false;
        if (!Number.isFinite(parseInt(character.vectorMemory.autoSummaryInterval, 10))) character.vectorMemory.autoSummaryInterval = 200;
        if (!character.vectorMemory.autoSummaryState) character.vectorMemory.autoSummaryState = 'idle';
        if (character.vectorMemory.autoSummaryPending === undefined) character.vectorMemory.autoSummaryPending = false;
        if (!Array.isArray(character.vectorMemory.lastRetrievedEntryIds)) character.vectorMemory.lastRetrievedEntryIds = [];
    }

    function repairAvatarLibraryItems(items) {
        (items || []).forEach((item) => {
            if (item.description === undefined && item.name) {
                item.description = item.name;
                item.name = item.name.length > 12 ? item.name.slice(0, 12) + '…' : item.name;
            }
            if (item.name === undefined) {
                item.name = (item.description && item.description.length > 12)
                    ? item.description.slice(0, 12) + '…'
                    : (item.description || '未命名');
            }
        });
    }

    function repairCharacter(character) {
        if (!character.peekData) character.peekData = {};
        if (character.isPinned === undefined) character.isPinned = false;
        if (character.status === undefined) character.status = '在线';
        if (!character.worldBookIds) character.worldBookIds = [];
        if (character.callWallpaper === undefined) character.callWallpaper = '';
        if (character.customBubbleCss === undefined) character.customBubbleCss = '';
        if (character.useCustomBubbleCss === undefined) character.useCustomBubbleCss = false;
        if (character.allowCharSwitchBubbleCss === undefined) character.allowCharSwitchBubbleCss = false;
        if (!Array.isArray(character.bubbleCssThemeBindings)) character.bubbleCssThemeBindings = [];
        if (character.currentBubbleCssPresetName === undefined) character.currentBubbleCssPresetName = '';
        if (character.themeJustChangedByUser === undefined) character.themeJustChangedByUser = '';
        if (character.showTimestamp === undefined) character.showTimestamp = false;
        if (character.timestampPosition === undefined) character.timestampPosition = 'below_avatar';
        ensureStatusPanel(character);
        if (!['journal', 'table', 'vector'].includes(character.memoryMode)) character.memoryMode = 'journal';
        ensureMemoryTables(character);
        ensureVectorMemory(character);
        if (!character.regexFilter) character.regexFilter = { enabled: false, rules: [] };
        if (!character.autoReply) character.autoReply = { enabled: false, interval: 60, lastTriggerTime: 0 };
        if (!character.gallery) character.gallery = [];
        if (character.useRealGallery === undefined) character.useRealGallery = false;
        if (!character.callHistory) character.callHistory = [];
        if (!character.userAvatarLibrary || !Array.isArray(character.userAvatarLibrary)) character.userAvatarLibrary = [];
        if (!character.charAvatarLibrary || !Array.isArray(character.charAvatarLibrary)) character.charAvatarLibrary = [];
        if (character.charTimezone === undefined) character.charTimezone = '';
        if (character.myTimezone === undefined) character.myTimezone = '';
        if (character.enableDynamicTimezone === undefined) character.enableDynamicTimezone = false;
        if (character.myEnableDynamicTimezone === undefined) character.myEnableDynamicTimezone = false;
        if (character.isBlocked === undefined) character.isBlocked = false;
        if (!character.blockHistory || !Array.isArray(character.blockHistory)) character.blockHistory = [];
        if (!character.friendRequests || !Array.isArray(character.friendRequests)) character.friendRequests = [];
        if (!character.blockReapply || typeof character.blockReapply !== 'object') character.blockReapply = { mode: 'fixed', fixedInterval: 30, lastRequestTime: null, nextCheckTime: null, pendingRequestId: null };
        if (character.canBlockUser === undefined) character.canBlockUser = true;
        if (character.phoneControlEnabled === undefined) character.phoneControlEnabled = false;
        if (character.phoneControlViewLimit === undefined) character.phoneControlViewLimit = 10;
        if (!Array.isArray(character.phoneControlHistory)) character.phoneControlHistory = [];
        if (character.familyCardEnabled === undefined) character.familyCardEnabled = false;
        if (character.isBlockedByChar === undefined) character.isBlockedByChar = false;
        if (character.blockedByCharAt === undefined) character.blockedByCharAt = null;
        if (character.blockedByCharReason === undefined) character.blockedByCharReason = '';
        if (!character.charBlockHistory || !Array.isArray(character.charBlockHistory)) character.charBlockHistory = [];
        if (!character.userFriendRequests || !Array.isArray(character.userFriendRequests)) character.userFriendRequests = [];
        if (!character.nodes) character.nodes = [];
        if (character.activeNodeId === undefined) character.activeNodeId = null;
        repairAvatarLibraryItems(character.userAvatarLibrary);
    }

    function repairGroup(group) {
        if (group.isPinned === undefined) group.isPinned = false;
        if (!group.worldBookIds) group.worldBookIds = [];
        if (group.customBubbleCss === undefined) group.customBubbleCss = '';
        if (group.useCustomBubbleCss === undefined) group.useCustomBubbleCss = false;
        if (group.showTimestamp === undefined) group.showTimestamp = false;
        if (group.timestampPosition === undefined) group.timestampPosition = 'below_avatar';
        if (!group.callHistory) group.callHistory = [];
    }

    function migrateLegacyGlobalUserAvatarLibrary(targetDb) {
        if (!targetDb.userAvatarLibrary || !Array.isArray(targetDb.userAvatarLibrary) || targetDb.userAvatarLibrary.length === 0) {
            return false;
        }
        (targetDb.characters || []).forEach((character) => {
            if (!character.userAvatarLibrary) character.userAvatarLibrary = [];
            character.userAvatarLibrary.push(...targetDb.userAvatarLibrary);
        });
        delete targetDb.userAvatarLibrary;
        return true;
    }

    function repairLoadedData(targetDb) {
        ensureRootCollections(targetDb);
        (targetDb.characters || []).forEach(repairCharacter);
        const migratedGlobalUserAvatarLibrary = migrateLegacyGlobalUserAvatarLibrary(targetDb);
        (targetDb.groups || []).forEach(repairGroup);
        return { migratedGlobalUserAvatarLibrary };
    }

    async function migrateLegacyLocalStorage(options) {
        const dexieDB = options && options.dexieDB;
        const storage = (options && options.localStorage) || global.localStorage;
        if (!dexieDB || !storage) return false;
        const oldLocalStorageData = storage.getItem(LEGACY_LOCAL_STORAGE_KEY);
        if (!oldLocalStorageData) return false;
        console.log('Found old localStorage data, migrating...');
        const data = JSON.parse(oldLocalStorageData);
        await dexieDB.transaction('rw', dexieDB.tables, async () => {
            if (data.characters) await dexieDB.characters.bulkPut(data.characters);
            if (data.groups) await dexieDB.groups.bulkPut(data.groups);
        });
        storage.removeItem(LEGACY_LOCAL_STORAGE_KEY);
        return true;
    }

    app.platform.storage.loadRepair = {
        applyLoadedTables,
        hydrateGlobalSettings,
        repairLoadedData,
        migrateLegacyLocalStorage
    };
})(window);
