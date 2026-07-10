// --- platform/storage/repository.js ---
// V10 存储公开入口。
// repository 只拥有公开 API 和保存状态；实际 IndexedDB writer 归 dexieWriter，writer 仍只能注册一次。
(function registerStorageRepository(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.storage) {
        throw new Error('js/app/namespace.js 必须在 platform/storage/repository.js 之前加载');
    }

    let writers = null;
    let writerMeta = null;
    let savingCount = 0;

    function assertFunctionMap(nextWriters) {
        const required = ['saveData', 'saveCharacter', 'saveGroup', 'saveGlobalSettings', 'loadData'];
        required.forEach((name) => {
            if (!nextWriters || typeof nextWriters[name] !== 'function') {
                throw new Error('[OwoApp.storage] writer 缺少函数：' + name);
            }
        });
    }

    function getWriters() {
        if (!writers) {
            throw new Error('[OwoApp.storage] writers 尚未注册；请确认 db.js 已加载并完成 setWriters');
        }
        return writers;
    }

    function setWriters(nextWriters, meta) {
        if (writers) {
            throw new Error('[OwoApp.storage] writers 只能注册一次，避免双写路径');
        }
        assertFunctionMap(nextWriters);
        writers = Object.freeze(Object.assign({}, nextWriters));
        writerMeta = Object.freeze(Object.assign({
            state: 'canonical',
            owner: 'OwoApp.platform.storage.dexieWriter',
            note: 'V10: repository 是公开入口，dexieWriter 是唯一写入实现'
        }, meta || {}));
    }

    function setLegacyWriters(nextWriters, meta) {
        return setWriters(nextWriters, Object.assign({
            state: 'compat',
            note: 'compat alias: 请使用 setWriters 注册唯一 writer'
        }, meta || {}));
    }

    async function withSavingFlag(task) {
        savingCount += 1;
        try {
            return await task();
        } finally {
            savingCount = Math.max(0, savingCount - 1);
        }
    }

    function saveData() {
        const args = arguments;
        return withSavingFlag(() => getWriters().saveData.apply(null, args));
    }

    function saveCharacter(characterId) {
        return withSavingFlag(() => getWriters().saveCharacter(characterId));
    }

    function saveGroup(groupId) {
        return withSavingFlag(() => getWriters().saveGroup(groupId));
    }

    function saveGlobalSettings() {
        return withSavingFlag(() => getWriters().saveGlobalSettings());
    }

    function loadData() {
        const args = arguments;
        return getWriters().loadData.apply(null, args);
    }

    function isSaving() {
        return savingCount > 0;
    }

    function getWriterMeta() {
        return writerMeta ? Object.assign({}, writerMeta) : null;
    }

    app.platform.storage.repository = {
        setWriters,
        setLegacyWriters,
        saveData,
        saveCharacter,
        saveGroup,
        saveGlobalSettings,
        loadData,
        isSaving,
        getWriterMeta
    };
})(window);
