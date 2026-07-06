// --- platform/storage/dexieReader.js ---
// V10 loadData canonical owner.
// 只负责 IndexedDB 读取编排；字段修复仍归 loadRepair，写入仍归 repository/dexieWriter。
(function registerDexieReader(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.storage) {
        throw new Error('js/app/namespace.js 必须在 platform/storage/dexieReader.js 之前加载');
    }

    function requireContextFunction(ctx, name) {
        if (!ctx || typeof ctx[name] !== 'function') {
            throw new Error('[OwoApp.storage.dexieReader] 缺少 context 函数：' + name);
        }
        return ctx[name];
    }

    function getDexieDB(ctx) {
        const database = requireContextFunction(ctx, 'getDexieDB')();
        if (!database) {
            throw new Error('[OwoApp.storage.dexieReader] Dexie 数据库尚未初始化');
        }
        return database;
    }

    function getLoadRepair() {
        const loadRepair = app.platform.storage.loadRepair;
        if (!loadRepair || typeof loadRepair.applyLoadedTables !== 'function') {
            throw new Error('[OwoApp.storage.dexieReader] loadRepair 尚未加载');
        }
        return loadRepair;
    }

    function getDefaultSettingsFactory() {
        const defaults = app.app.state.globalSettingsDefaults;
        if (!defaults || typeof defaults.createDefaultGlobalSettings !== 'function') {
            throw new Error('[OwoApp.storage.dexieReader] globalSettingsDefaults 尚未加载');
        }
        return defaults.createDefaultGlobalSettings;
    }

    function createLoadData(ctx) {
        requireContextFunction(ctx, 'getDb');
        requireContextFunction(ctx, 'getDexieDB');
        requireContextFunction(ctx, 'getGlobalSettingKeys');

        async function loadData() {
            const currentDb = ctx.getDb();
            const database = getDexieDB(ctx);
            const loadRepair = getLoadRepair();

            const tables = [
                database.characters.toArray(),
                database.groups.toArray(),
                database.worldBooks.toArray(),
                database.myStickers.toArray(),
                database.globalSettings.toArray()
            ];
            if (database.archives) tables.push(database.archives.toArray());

            const results = await Promise.all(tables);
            loadRepair.applyLoadedTables(currentDb, {
                characters: results[0],
                groups: results[1],
                worldBooks: results[2],
                myStickers: results[3],
                archives: results[5]
            });

            const defaultValue = getDefaultSettingsFactory()();
            loadRepair.hydrateGlobalSettings(currentDb, results[4], ctx.getGlobalSettingKeys(), defaultValue);

            const repairResult = loadRepair.repairLoadedData(currentDb);
            if (repairResult.migratedGlobalUserAvatarLibrary && typeof ctx.getSaveData === 'function') {
                const saveData = ctx.getSaveData();
                if (typeof saveData === 'function') saveData();
            }

            const migratedLegacyLocalStorage = await loadRepair.migrateLegacyLocalStorage({ dexieDB: database });
            if (migratedLegacyLocalStorage) {
                await loadData();
            }
        }

        app.platform.storage.dexieReader.loadData = loadData;
        return loadData;
    }

    app.platform.storage.dexieReader = {
        createLoadData,
        loadData: null
    };
})(window);
