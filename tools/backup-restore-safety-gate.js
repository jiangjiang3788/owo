#!/usr/bin/env node
/* v0.9.1 backup validation, atomic commit and rollback integration gate. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const crypto = require('crypto');
const root = process.cwd();
let failed = false;
function fail(message) { failed = true; console.error('❌ ' + message); }
function pass(message) { console.log('✅ ' + message); }
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function clone(value) { return JSON.parse(JSON.stringify(value)); }

class FakeTable {
  constructor(name, rows) { this.name = name; this.rows = clone(rows || []); this.failNextBulkPut = false; this.corruptNextRead = false; }
  async clear() { this.rows = []; }
  async bulkPut(rows) {
    if (this.failNextBulkPut) { this.failNextBulkPut = false; throw new Error(`injected bulkPut failure:${this.name}`); }
    this.rows = clone(rows || []);
  }
  async toArray() {
    const output = clone(this.rows);
    if (this.corruptNextRead) {
      this.corruptNextRead = false;
      if (output[0]) output[0] = Object.assign({}, output[0], { __verificationCorruption: true });
      else output.push({ id: '__verificationCorruption' });
    }
    return output;
  }
}
class FakeDexie {
  constructor(state) {
    this.characters = new FakeTable('characters', state.characters);
    this.groups = new FakeTable('groups', state.groups);
    this.worldBooks = new FakeTable('worldBooks', state.worldBooks);
    this.myStickers = new FakeTable('myStickers', state.myStickers);
    this.archives = new FakeTable('archives', state.archives);
    this.globalSettings = new FakeTable('globalSettings', []);
  }
  async transaction() {
    const args = Array.from(arguments);
    const runner = args[args.length - 1];
    const tables = args.slice(1, -1);
    const snapshots = tables.map(table => clone(table.rows));
    try { return await runner(); }
    catch (error) {
      tables.forEach((table, index) => { table.rows = snapshots[index]; });
      throw error;
    }
  }
}

const app = {
  app: { state: { initialState: { createInitialDbState: () => ({
    characters: [], groups: [], worldBooks: [], myStickers: [], archives: [],
    apiSettings: {}, themePresets: [], iconPresets: [], homeWidgetPresets: [], widgetWallpaperPresets: []
  }) } } },
  platform: { storage: {}, observability: { operationTraceService: { recordOperation: () => null } } }
};
const context = vm.createContext({
  console,
  window: null,
  OwoApp: app,
  Date, Math, JSON, String, Number, Boolean, Object, Array, Set, Map, Error, Uint8Array,
  TextEncoder,
  crypto: crypto.webcrypto
});
context.window = context;
context.window.OwoApp = app;
[
  'js/platform/storage/backupIntegrity.js',
  'js/platform/storage/restoreTransaction.js',
  'js/platform/storage/backupAdapter.js'
].forEach(rel => vm.runInContext(read(rel), context, { filename: rel }));

function makeState(name) {
  return {
    characters: [{ id: 'char-1', realName: name, history: [] }],
    groups: [{ id: 'group-1', name: 'G', history: [] }],
    worldBooks: [{ id: 'wb-1', name: 'W' }],
    myStickers: [{ id: 'sticker-1', name: 'S' }],
    archives: [{ id: 'archive-1', characterId: 'char-1', timestamp: 1 }],
    apiSettings: { provider: 'newapi', model: 'model-a' },
    themePresets: [], iconPresets: [], homeWidgetPresets: [], widgetWallpaperPresets: []
  };
}
function createContext(runtime, database) {
  return {
    getDb: () => runtime,
    getDexieDB: () => database,
    getGlobalSettingKeys: () => ['apiSettings', 'themePresets', 'iconPresets', 'homeWidgetPresets', 'widgetWallpaperPresets'],
    getDefaultWidgetSettings: () => ({ widgets: [] }),
    showToast: () => null
  };
}
function equal(a, b) { return JSON.stringify(a) === JSON.stringify(b); }

(async () => {
  const sourceRuntime = makeState('Imported');
  const sourceDexie = new FakeDexie(sourceRuntime);
  const backup = await app.platform.storage.backupAdapter.createFullBackupData(createContext(sourceRuntime, sourceDexie));
  if (!backup._integrity || !backup._integrity.checksum) fail('完整备份没有 checksum');
  else pass('完整备份包含 checksum');

  const currentRuntime = makeState('Original');
  const database = new FakeDexie(currentRuntime);
  const restoreContext = createContext(currentRuntime, database);
  const beforeCorrupt = clone(currentRuntime);
  const corrupt = clone(backup);
  corrupt.characters[0].realName = 'Tampered';
  const corruptResult = await app.platform.storage.backupAdapter.importBackupData(corrupt, restoreContext);
  if (corruptResult.success || corruptResult.stage !== 'checksum') fail('checksum 损坏未在提交前阻断');
  else pass('checksum 损坏在提交前阻断');
  if (!equal(currentRuntime, beforeCorrupt) || database.characters.rows[0].realName !== 'Original') fail('校验失败仍修改了数据');
  else pass('校验失败不修改运行时和 IndexedDB');

  const validResult = await app.platform.storage.backupAdapter.importBackupData(backup, restoreContext);
  if (!validResult.success || currentRuntime.characters[0].realName !== 'Imported') fail('有效备份未成功恢复');
  else pass('有效备份通过原子事务恢复');
  if (!validResult.verification || !validResult.verification.ok) fail('提交后未完成持久化校验');
  else pass('提交后持久化 checksum 校验通过');
  if (!validResult.preImportSnapshotChecksum) fail('未生成导入前快照 checksum');
  else pass('生成导入前快照 checksum');

  const beforeFailure = clone(currentRuntime);
  const nextRuntime = makeState('ShouldNotCommit');
  const nextBackup = await app.platform.storage.backupAdapter.createFullBackupData(createContext(nextRuntime, new FakeDexie(nextRuntime)));
  database.characters.failNextBulkPut = true;
  const failureResult = await app.platform.storage.backupAdapter.importBackupData(nextBackup, restoreContext);
  if (failureResult.success) fail('注入写入失败后仍报告成功');
  else pass('写入失败被正确报告');
  if (!equal(currentRuntime, beforeFailure) || database.characters.rows[0].realName !== 'Imported') fail('事务失败后未保持原数据');
  else pass('事务失败后自动保留原数据');

  const beforeVerificationFailure = clone(currentRuntime);
  const verifyFailState = makeState('VerificationShouldRollback');
  const verifyFailBackup = await app.platform.storage.backupAdapter.createFullBackupData(createContext(verifyFailState, new FakeDexie(verifyFailState)));
  database.characters.corruptNextRead = true;
  const verifyFailResult = await app.platform.storage.backupAdapter.importBackupData(verifyFailBackup, restoreContext);
  if (verifyFailResult.success) fail('提交后校验不一致仍报告成功');
  else pass('提交后校验不一致会报告失败');
  if (!equal(currentRuntime, beforeVerificationFailure) || database.characters.rows[0].realName !== 'Imported') fail('提交后校验失败未写回导入前快照');
  else pass('提交后校验失败自动写回导入前快照');

  const partial = await app.platform.storage.backupAdapter.createPartialBackupData(['globalSettings'], createContext(sourceRuntime, sourceDexie));
  partial.globalSettings.apiSettings.model = 'tampered-after-sign';
  const partialBad = await app.platform.storage.backupAdapter.importPartialBackupData(partial, restoreContext);
  if (partialBad.success) fail('分类备份 checksum 损坏未被阻断');
  else pass('分类备份同样执行 checksum 校验');

  const unknown = clone(backup);
  delete unknown._integrity;
  unknown.characters[0].realName = 'LegacyCompatible';
  const legacyResult = await app.platform.storage.backupAdapter.importBackupData(unknown, restoreContext);
  if (!legacyResult.success || currentRuntime.characters[0].realName !== 'LegacyCompatible') fail('无 checksum 的旧备份未按兼容模式恢复');
  else pass('旧备份可兼容恢复并给出校验警告');
  if (!Array.isArray(legacyResult.warnings) || !legacyResult.warnings.length) fail('旧备份没有 checksum 警告');
  else pass('旧备份缺少 checksum 时提供明确警告');

  if (failed) process.exit(1);
  console.log('\nBackup/restore safety gate passed.');
})().catch(error => { console.error(error); process.exit(1); });
