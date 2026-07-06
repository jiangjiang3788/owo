// --- platform/storage/backupAdapter.js ---
// V8 备份/导入导出适配层：拥有 .ee 备份数据格式、分类导入导出和恢复写入编排。
// 注意：这里不复制 saveData writer，所有最终保存仍通过注入的 repository saveData 入口完成。
(function registerBackupAdapter(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.storage) {
        throw new Error('js/app/namespace.js 必须在 platform/storage/backupAdapter.js 之前加载');
    }

    const THEATER_DB_KEYS = [
        'theaterScenarios', 'theaterPromptPresets',
        'theaterHtmlScenarios', 'theaterHtmlPromptPresets',
        'theaterMode', 'theaterApiSettings', 'theaterFontSize', 'theaterFontPreset'
    ];

    function clone(value) {
        if (value === undefined) return undefined;
        return JSON.parse(JSON.stringify(value));
    }

    function createBackupFilename(prefix, ext) {
        const now = new Date();
        const date = now.toISOString().slice(0, 10);
        const time = now.toTimeString().slice(0, 8).replace(/:/g, '');
        return `${prefix}_${date}_${time}.${ext || 'ee'}`;
    }

    function getRequiredContext(context) {
        if (!context || typeof context.getDb !== 'function') {
            throw new Error('[backupAdapter] 缺少 getDb 上下文');
        }
        return context;
    }

    async function createFullBackupData(context) {
        const ctx = getRequiredContext(context);
        const db = ctx.getDb();
        const backupData = clone(db);
        const keys = typeof ctx.getGlobalSettingKeys === 'function' ? ctx.getGlobalSettingKeys() : [];
        keys.forEach((key) => {
            if (db[key] !== undefined && backupData[key] === undefined) {
                backupData[key] = clone(db[key]);
            }
        });
        backupData._exportVersion = '3.0';
        backupData._exportTimestamp = Date.now();
        return backupData;
    }

    async function createPartialBackupData(selectedKeys, context) {
        const ctx = getRequiredContext(context);
        const db = ctx.getDb();
        const keys = typeof ctx.getGlobalSettingKeys === 'function' ? ctx.getGlobalSettingKeys() : [];
        const result = {
            _exportVersion: '3.0_partial',
            _exportTimestamp: Date.now(),
            _exportTables: selectedKeys || []
        };

        for (const key of result._exportTables) {
            if (key === 'globalSettings') {
                result.globalSettings = {};
                keys.forEach((settingKey) => {
                    result.globalSettings[settingKey] = db[settingKey] !== undefined ? clone(db[settingKey]) : undefined;
                });
            } else if (key === 'theaterData') {
                result.theaterData = {};
                THEATER_DB_KEYS.forEach((theaterKey) => {
                    result.theaterData[theaterKey] = db[theaterKey] !== undefined ? clone(db[theaterKey]) : undefined;
                });
            } else if (db[key] !== undefined) {
                result[key] = clone(db[key]);
            }
        }
        return result;
    }

    async function importPartialBackupData(data, context) {
        const ctx = getRequiredContext(context);
        const db = ctx.getDb();
        const startTime = Date.now();
        const tables = data && data._exportTables ? data._exportTables : [];
        if (!Array.isArray(tables) || tables.length === 0) {
            return { success: false, error: '文件中没有可导入的分类' };
        }

        try {
            for (const key of tables) {
                if (key === 'globalSettings' && data.globalSettings) {
                    Object.keys(data.globalSettings).forEach((settingKey) => { db[settingKey] = data.globalSettings[settingKey]; });
                } else if (key === 'theaterData' && data.theaterData) {
                    Object.keys(data.theaterData).forEach((theaterKey) => { db[theaterKey] = data.theaterData[theaterKey]; });
                } else if (data[key] !== undefined) {
                    db[key] = data[key];
                }
            }
            if (typeof ctx.showToast === 'function') ctx.showToast('正在写入...');
            await ctx.saveData(db);
            return { success: true, message: `分类导入完成 (耗时${Date.now() - startTime}ms)` };
        } catch (error) {
            console.error('分类导入失败:', error);
            return { success: false, error: error.message };
        }
    }

    function reassembleLegacyHistory(chat, backupData) {
        if (!chat.history || !Array.isArray(chat.history) || chat.history.length === 0) return [];
        if (typeof chat.history[0] === 'object' && chat.history[0] !== null) return chat.history;
        if (!backupData.__chunks__ || typeof chat.history[0] !== 'string') return [];

        let fullHistory = [];
        chat.history.forEach((key) => {
            if (!backupData.__chunks__[key]) return;
            try {
                fullHistory = fullHistory.concat(JSON.parse(backupData.__chunks__[key]));
            } catch (error) {
                console.error(`Failed to parse history chunk ${key}`, error);
            }
        });
        return fullHistory;
    }

    function convertLegacyBackup(data) {
        if (!data || data._exportVersion === '3.0') return data;
        const newData = Object.assign({}, data);
        if (Array.isArray(newData.characters)) {
            newData.characters = newData.characters.map((char) => Object.assign({}, char, {
                history: reassembleLegacyHistory(char, data)
            }));
        }
        if (Array.isArray(newData.groups)) {
            newData.groups = newData.groups.map((group) => Object.assign({}, group, {
                history: reassembleLegacyHistory(group, data)
            }));
        }
        return newData;
    }

    function repairImportedRuntimeDb(db, context) {
        (db.characters || []).forEach((char) => {
            if (char.theme === undefined || char.theme === null || char.theme === '') char.theme = 'white_pink';
        });
        (db.groups || []).forEach((group) => {
            if (group.theme === undefined || group.theme === null || group.theme === '') group.theme = 'white_pink';
        });

        if (!db.pomodoroTasks) db.pomodoroTasks = [];
        if (!db.pomodoroSettings) db.pomodoroSettings = {
            boundCharId: null, userPersona: '', focusBackground: '', taskCardBackground: '',
            encouragementMinutes: 25, pokeLimit: 5, globalWorldBookIds: []
        };
        if (!db.insWidgetSettings) db.insWidgetSettings = {
            avatar1: 'https://i.postimg.cc/Y96LPskq/o-o-2.jpg', bubble1: 'love u.',
            avatar2: 'https://i.postimg.cc/GtbTnxhP/o-o-1.jpg', bubble2: 'miss u.'
        };
        if (!db.homeWidgetSettings) db.homeWidgetSettings = clone(context.getDefaultWidgetSettings());
        if (!Array.isArray(db.themePresets)) db.themePresets = [];
        if (!db.themeSettings || typeof db.themeSettings !== 'object') {
            db.themeSettings = { global: {}, wallpapers: {}, bottomNav: {}, chatScreen: {} };
        }
        if (!Array.isArray(db.iconPresets)) db.iconPresets = [];
        if (!Array.isArray(db.homeWidgetPresets)) db.homeWidgetPresets = [];
        if (!Array.isArray(db.widgetWallpaperPresets)) db.widgetWallpaperPresets = [];
    }

    async function clearRestoreTables(dexieDB) {
        const clearTasks = [
            dexieDB.characters.clear(),
            dexieDB.groups.clear(),
            dexieDB.worldBooks.clear(),
            dexieDB.myStickers.clear(),
            dexieDB.globalSettings.clear()
        ];
        if (dexieDB.archives) clearTasks.push(dexieDB.archives.clear());
        await Promise.all(clearTasks);
    }

    async function importBackupData(data, context) {
        const ctx = getRequiredContext(context);
        const db = ctx.getDb();
        const dexieDB = ctx.getDexieDB();
        const startTime = Date.now();

        try {
            await clearRestoreTables(dexieDB);
            if (typeof ctx.showToast === 'function') ctx.showToast('正在清空旧数据...');

            const convertedData = convertLegacyBackup(data);
            const metaKeys = ['_exportVersion', '_exportTimestamp', '_exportTables'];
            Object.keys(convertedData || {}).forEach((key) => {
                if (!metaKeys.includes(key) && convertedData[key] !== undefined) db[key] = convertedData[key];
            });

            repairImportedRuntimeDb(db, ctx);
            if (typeof ctx.showToast === 'function') ctx.showToast('正在写入新数据...');
            await ctx.saveData(db);

            return { success: true, message: `导入完成 (耗时${Date.now() - startTime}ms)` };
        } catch (error) {
            console.error('导入数据失败:', error);
            return { success: false, error: error.message, duration: Date.now() - startTime };
        }
    }

    function bindLegacyBackup(context) {
        if (app.platform.storage.backupAdapter.legacyBackupApi) {
            throw new Error('[backupAdapter] legacyBackupApi 只能绑定一次，避免两套导入导出上下文');
        }
        const api = Object.freeze({
            createFullBackupData: () => createFullBackupData(context),
            createPartialBackupData: (selectedKeys) => createPartialBackupData(selectedKeys, context),
            importPartialBackupData: (data) => importPartialBackupData(data, context),
            importBackupData: (data) => importBackupData(data, context)
        });
        app.platform.storage.backupAdapter.legacyBackupApi = api;
        return api;
    }

    app.platform.storage.backupAdapter = Object.assign(app.platform.storage.backupAdapter || {}, {
        THEATER_DB_KEYS,
        createBackupFilename,
        createFullBackupData,
        createPartialBackupData,
        importPartialBackupData,
        importBackupData,
        bindLegacyBackup
    });
})(window);
