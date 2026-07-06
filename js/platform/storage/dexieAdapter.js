// --- platform/storage/dexieAdapter.js ---
// V5 Dexie adapter shell。
// 只负责 Dexie 实例创建、schema 注册、migration 挂载；不提供公开保存入口，不复制 writer 逻辑。
(function registerDexieAdapter(global) {
    const app = global.OwoApp;
    if (!app || !app.platform || !app.platform.storage) {
        throw new Error('js/app/namespace.js 必须在 platform/storage/dexieAdapter.js 之前加载');
    }

    const DATABASE_NAME = '章鱼喷墨机DB_ee';
    let currentDatabase = null;

    function assertDexieAvailable() {
        if (typeof global.Dexie !== 'function') {
            throw new Error('[OwoApp.storage] Dexie 尚未加载，无法初始化 IndexedDB');
        }
    }

    function getMigrations() {
        const migrations = app.platform.storage.dexieMigrations;
        if (!migrations || typeof migrations.migrateLegacyStorageRecordToVersion2 !== 'function') {
            throw new Error('[OwoApp.storage] Dexie migrations 尚未加载');
        }
        return migrations;
    }

    function createDatabase() {
        assertDexieAvailable();
        const database = new global.Dexie(DATABASE_NAME);
        const migrations = getMigrations();

        database.version(1).stores({
            storage: 'key, value'
        });
        database.version(2).stores({
            characters: '&id',
            groups: '&id',
            worldBooks: '&id',
            myStickers: '&id',
            globalSettings: 'key'
        }).upgrade(migrations.migrateLegacyStorageRecordToVersion2);
        database.version(3).stores({
            characters: '&id',
            groups: '&id',
            worldBooks: '&id',
            myStickers: '&id',
            globalSettings: 'key',
            archives: '&id,characterId,timestamp'
        });

        return database;
    }

    function initDatabase(assignDatabase) {
        currentDatabase = createDatabase();
        if (typeof assignDatabase === 'function') {
            assignDatabase(currentDatabase);
        }
        return currentDatabase;
    }

    function getCurrentDatabase() {
        return currentDatabase;
    }

    app.platform.storage.dexieAdapter = {
        databaseName: DATABASE_NAME,
        createDatabase,
        initDatabase,
        getCurrentDatabase
    };
})(window);
