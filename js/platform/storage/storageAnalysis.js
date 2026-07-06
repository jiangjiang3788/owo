// --- Storage analysis owner (V7) ---
// 只负责存储占用估算，不读取 DOM、不写入 IndexedDB、不调用保存函数。
(function registerStorageAnalysis(global) {
    const storage = global.OwoApp.platform.storage;

    function stringifySize(obj) {
        try {
            return JSON.stringify(obj).length;
        } catch (e) {
            console.warn('Could not stringify object for size calculation:', obj, e);
            return 0;
        }
    }

    function computeStorageInfo(currentDb) {
        const sourceDb = currentDb || {};
        const categorizedSizes = {
            messages: 0,
            charactersAndGroups: 0,
            worldAndForum: 0,
            personalization: 0,
            apiAndCore: 0,
            other: 0
        };

        // 1. Messages (History)
        (sourceDb.characters || []).forEach(char => {
            categorizedSizes.messages += stringifySize(char.history);
        });
        (sourceDb.groups || []).forEach(group => {
            categorizedSizes.messages += stringifySize(group.history);
        });

        // 2. Characters and Groups (metadata)
        (sourceDb.characters || []).forEach(char => {
            const charWithoutHistory = { ...char, history: undefined };
            categorizedSizes.charactersAndGroups += stringifySize(charWithoutHistory);
        });
        (sourceDb.groups || []).forEach(group => {
            const groupWithoutHistory = { ...group, history: undefined };
            categorizedSizes.charactersAndGroups += stringifySize(groupWithoutHistory);
        });

        // 3. World and Forum
        categorizedSizes.worldAndForum += stringifySize(sourceDb.worldBooks);
        categorizedSizes.worldAndForum += stringifySize(sourceDb.forumPosts);
        categorizedSizes.worldAndForum += stringifySize(sourceDb.forumBindings);

        // 4. Personalization
        categorizedSizes.personalization += stringifySize(sourceDb.myStickers);
        categorizedSizes.personalization += stringifySize(sourceDb.wallpaper);
        categorizedSizes.personalization += stringifySize(sourceDb.globalChatWallpaper);
        categorizedSizes.personalization += stringifySize(sourceDb.globalCallWallpaper);
        categorizedSizes.personalization += stringifySize(sourceDb.homeScreenMode);
        categorizedSizes.personalization += stringifySize(sourceDb.fontUrl);
        categorizedSizes.personalization += stringifySize(sourceDb.localFontName);
        categorizedSizes.personalization += stringifySize(sourceDb.fontBuffer);
        categorizedSizes.personalization += stringifySize(sourceDb.customIcons);
        categorizedSizes.personalization += stringifySize(sourceDb.bubbleCssPresets);
        categorizedSizes.personalization += stringifySize(sourceDb.myPersonaPresets);
        categorizedSizes.personalization += stringifySize(sourceDb.globalCss);
        categorizedSizes.personalization += stringifySize(sourceDb.globalCssPresets);
        categorizedSizes.personalization += stringifySize(sourceDb.homeSignature);
        categorizedSizes.personalization += stringifySize(sourceDb.pomodoroTasks);
        categorizedSizes.personalization += stringifySize(sourceDb.pomodoroSettings);
        categorizedSizes.personalization += stringifySize(sourceDb.insWidgetSettings);
        categorizedSizes.personalization += stringifySize(sourceDb.homeWidgetSettings);
        categorizedSizes.personalization += stringifySize(sourceDb.moreProfileCardBg);
        categorizedSizes.personalization += stringifySize(sourceDb.soundPresets);
        categorizedSizes.personalization += stringifySize(sourceDb.iconPresets);

        // 5. API and Core
        categorizedSizes.apiAndCore += stringifySize(sourceDb.apiSettings);
        categorizedSizes.apiAndCore += stringifySize(sourceDb.apiPresets);
        categorizedSizes.apiAndCore += stringifySize(sourceDb.cotSettings);
        categorizedSizes.apiAndCore += stringifySize(sourceDb.cotPresets);
        categorizedSizes.apiAndCore += stringifySize(sourceDb.keepAliveAudioSrc);
        categorizedSizes.apiAndCore += stringifySize(sourceDb.keepAliveAudioLibrary);

        const totalSize = Object.values(categorizedSizes).reduce((sum, size) => sum + size, 0);
        return { totalSize, categorizedSizes };
    }

    function createDataStorage({ getDb, ensureLoaded } = {}) {
        if (typeof getDb !== 'function') {
            throw new Error('[storageAnalysis] createDataStorage 需要 getDb()');
        }

        return {
            getStorageInfo: async function getStorageInfo() {
                let currentDb = getDb();
                if ((!currentDb || !currentDb.characters) && typeof ensureLoaded === 'function') {
                    await ensureLoaded();
                    currentDb = getDb();
                }
                return computeStorageInfo(currentDb);
            }
        };
    }

    function bindDataStorage(deps) {
        const dataStorage = createDataStorage(deps);
        storage.storageAnalysis.dataStorage = dataStorage;
        return dataStorage;
    }

    storage.storageAnalysis = Object.assign(storage.storageAnalysis || {}, {
        stringifySize,
        computeStorageInfo,
        createDataStorage,
        bindDataStorage
    });
})(window);
