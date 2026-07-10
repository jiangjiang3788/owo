// --- platform/storage/dexieWriter.js ---
// V9/V10 canonical storage writer owner.
// 只负责 IndexedDB 写入；公开保存入口仍由 repository.js 暴露，db.js 只做 compatibility shell。
(function registerDexieWriter(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.storage) {
        throw new Error('js/app/namespace.js 必须在 platform/storage/dexieWriter.js 之前加载');
    }

    function requireContextFunction(ctx, name) {
        if (!ctx || typeof ctx[name] !== 'function') {
            throw new Error('[OwoApp.storage.dexieWriter] 缺少 context 函数：' + name);
        }
        return ctx[name];
    }

    function getDb(ctx) {
        return requireContextFunction(ctx, 'getDb')();
    }

    function getDexieDB(ctx) {
        const database = requireContextFunction(ctx, 'getDexieDB')();
        if (!database) {
            throw new Error('[OwoApp.storage.dexieWriter] Dexie 数据库尚未初始化');
        }
        return database;
    }

    function getGlobalSettingKeys(ctx) {
        const getter = requireContextFunction(ctx, 'getGlobalSettingKeys');
        const keys = getter();
        return Array.isArray(keys) ? keys : [];
    }

    function getShowToast(ctx) {
        if (ctx && typeof ctx.getShowToast === 'function') {
            const showToast = ctx.getShowToast();
            if (typeof showToast === 'function') return showToast;
        }
        return null;
    }

    async function warnIfStorageQuotaIsHigh(ctx) {
        const storage = global.navigator && global.navigator.storage;
        if (!storage || typeof storage.estimate !== 'function') return;
        try {
            const estimate = await storage.estimate();
            const usage = estimate && estimate.usage;
            const quota = estimate && estimate.quota;
            if (!usage || !quota) return;
            const pct = (usage / quota) * 100;
            if (pct > 95) {
                const showToast = getShowToast(ctx);
                if (showToast) showToast(`⚠️ 存储空间已使用 ${pct.toFixed(0)}%，请立即导出备份！`, 6000);
            }
        } catch (_) {
            // 存储估算失败不应阻断保存主流程。
        }
    }

    function createWriters(ctx) {
        requireContextFunction(ctx, 'getDb');
        requireContextFunction(ctx, 'getDexieDB');
        requireContextFunction(ctx, 'getGlobalSettingKeys');

        async function saveData() {
            await warnIfStorageQuotaIsHigh(ctx);
            const currentDb = getDb(ctx);
            const database = getDexieDB(ctx);

            try {
                await database.characters.bulkPut(currentDb.characters || []);
                await database.groups.bulkPut(currentDb.groups || []);
                await database.worldBooks.bulkPut(currentDb.worldBooks || []);
                await database.myStickers.bulkPut(currentDb.myStickers || []);
                if (database.archives) await database.archives.bulkPut(currentDb.archives || []);

                const allSettingKeys = [...getGlobalSettingKeys(ctx), 'worldBookCategoryOrder'];
                const settingsPromises = allSettingKeys
                    .filter(key => currentDb[key] !== undefined)
                    .map(key => database.globalSettings.put({ key, value: currentDb[key] }));
                await Promise.all(settingsPromises);
            } catch (e) {
                console.error('saveData failed:', e);
                const showToast = getShowToast(ctx);
                if (showToast) {
                    const isQuota = e.name === 'QuotaExceededError'
                        || (e.message && (e.message.includes('quota') || e.message.includes('delete record')));
                    const msg = isQuota
                        ? '存储空间不足，保存失败！请到「存储管理」导出备份后清理数据。'
                        : '保存数据失败: ' + e.message;
                    showToast(msg, 6000);
                }
            }
        }

        async function saveCharacter(characterId) {
            const currentDb = getDb(ctx);
            const database = getDexieDB(ctx);
            const character = (currentDb.characters || []).find(c => c.id === characterId);
            if (!character) return;
            try {
                await database.characters.put(character);
            } catch (e) {
                console.error('saveCharacter failed:', e);
            }
        }

        async function saveGroup(groupId) {
            const currentDb = getDb(ctx);
            const database = getDexieDB(ctx);
            const group = (currentDb.groups || []).find(g => g.id === groupId);
            if (!group) return;
            try {
                await database.groups.put(group);
            } catch (e) {
                console.error('saveGroup failed:', e);
            }
        }

        async function saveGlobalSettings() {
            const currentDb = getDb(ctx);
            const database = getDexieDB(ctx);
            try {
                const allSettingKeys = [...getGlobalSettingKeys(ctx), 'worldBookCategoryOrder'];
                const promises = allSettingKeys
                    .filter(key => currentDb[key] !== undefined)
                    .map(key => database.globalSettings.put({ key, value: currentDb[key] }));
                await Promise.all(promises);
            } catch (e) {
                console.error('saveGlobalSettings failed:', e);
                const showToast = getShowToast(ctx);
                if (showToast) showToast('保存设置失败: ' + e.message);
            }
        }

        return Object.freeze({
            saveData,
            saveCharacter,
            saveGroup,
            saveGlobalSettings
        });
    }

    app.platform.storage.dexieWriter = {
        createWriters,
        warnIfStorageQuotaIsHigh
    };
})(window);
