// --- 数据库 compatibility shell (V10) ---
// db.js 不再拥有静态配置、runtime globals、Dexie schema、load repair、storage analysis 或 writer 实现。
// 它只负责把 legacy 全局入口接到 platform/storage canonical owner。

const storageDexieAdapter = window.OwoApp.platform.storage.dexieAdapter;
const storageDexieWriter = window.OwoApp.platform.storage.dexieWriter;
const storageDexieReader = window.OwoApp.platform.storage.dexieReader;
const storageRepository = window.OwoApp.platform.storage.repository;

// @compat canonical: OwoApp.platform.storage.dexieAdapter.initDatabase
const initDatabase = () => storageDexieAdapter.initDatabase((nextDexieDB) => {
    dexieDB = nextDexieDB;
});

window.OwoApp.compat.expose('initDatabase', initDatabase, {
    state: 'canonical',
    owner: 'OwoApp.platform.storage.dexieAdapter.initDatabase',
    note: 'V10: 旧 initDatabase 只负责把 Dexie 实例回填到 legacy dexieDB 变量；schema/migration 实现归 dexieAdapter'
});

const storageRuntimeContext = {
    getDb: () => db,
    getDexieDB: () => dexieDB,
    getGlobalSettingKeys: () => globalSettingKeys,
    getShowToast: () => (typeof showToast === 'function' ? showToast : null),
    getSaveData: () => storageRepository.saveData
};

// @compat canonical: OwoApp.platform.storage.dexieReader.loadData
const loadData = storageDexieReader.createLoadData(storageRuntimeContext);

const storageWriters = storageDexieWriter.createWriters(storageRuntimeContext);
storageRepository.setWriters(Object.assign({}, storageWriters, { loadData }), {
    state: 'canonical',
    owner: 'OwoApp.platform.storage.dexieWriter',
    note: 'V10: platform/storage/dexieWriter 是唯一写入实现；db.js 只注册 writer 并保留旧入口'
});

// @compat canonical: OwoApp.platform.storage.repository.saveData
const saveData = storageRepository.saveData;
// @compat canonical: OwoApp.platform.storage.repository.saveCharacter
const saveCharacter = storageRepository.saveCharacter;
// @compat canonical: OwoApp.platform.storage.repository.saveGroup
const saveGroup = storageRepository.saveGroup;
// @compat canonical: OwoApp.platform.storage.repository.saveGlobalSettings
const saveGlobalSettings = storageRepository.saveGlobalSettings;

window.OwoApp.compat.expose('saveData', saveData, {
    state: 'canonical',
    owner: 'OwoApp.platform.storage.repository.saveData',
    note: 'V10: 旧 window.saveData 只保留兼容出口；实际 writer 归 dexieWriter'
});
window.OwoApp.compat.expose('saveCharacter', saveCharacter, {
    state: 'canonical',
    owner: 'OwoApp.platform.storage.repository.saveCharacter',
    note: 'V10: 旧 window.saveCharacter 只保留兼容出口；实际 writer 归 dexieWriter'
});
window.OwoApp.compat.expose('saveGroup', saveGroup, {
    state: 'canonical',
    owner: 'OwoApp.platform.storage.repository.saveGroup',
    note: 'V10: 旧 window.saveGroup 只保留兼容出口；实际 writer 归 dexieWriter'
});
window.OwoApp.compat.expose('saveGlobalSettings', saveGlobalSettings, {
    state: 'canonical',
    owner: 'OwoApp.platform.storage.repository.saveGlobalSettings',
    note: 'V10: 旧 window.saveGlobalSettings 只保留兼容出口；实际 writer 归 dexieWriter'
});

// @compat canonical: OwoApp.platform.storage.storageAnalysis.dataStorage
const dataStorage = window.OwoApp.platform.storage.storageAnalysis.bindDataStorage({
    getDb: () => db,
    ensureLoaded: loadData
});
