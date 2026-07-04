// --- platform/storage/repository.js ---
// V3 存储单写路径桥接层。
// 注意：这一版不把 db.js 的 Dexie 写入实现复制到这里；repository 只拥有公开入口和保存状态，实际 writer 只能注册一次。
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
            throw new Error('[OwoApp.storage] writers 尚未注册；请确认 db.js 已加载并完成 setLegacyWriters');
        }
        return writers;
    }

    function setLegacyWriters(nextWriters, meta) {
        if (writers) {
            throw new Error('[OwoApp.storage] writers 只能注册一次，避免双写路径');
        }
        assertFunctionMap(nextWriters);
        writers = Object.freeze(Object.assign({}, nextWriters));
        writerMeta = Object.freeze(Object.assign({
            state: 'legacy-owner',
            owner: 'js/db.js',
            note: 'V3 bridge: repository 是公开入口，db.js private writer 是唯一写入实现'
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
