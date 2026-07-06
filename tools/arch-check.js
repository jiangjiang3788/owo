#!/usr/bin/env node
/*
 * OWO V1/V2/V3/V4/V5/V6/V7/V8/V9/V10/V11/V12/V13/V14/V15/V16/V17/V18/V19/V20/V21/V22/V23/V24/V25/V26/V27/V28/V29/V30/V31/V32/V33/V34/V35/V36/V37/V38/V38.1 architecture check.
 * 用法：node tools/arch-check.js
 * 只依赖 Node 内置模块，适合当前无 package.json 的项目。
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const MAX_SOFT_LINES = 300;
const MAX_HARD_LINES = 380;

const ignoreDirs = new Set(['.git', 'node_modules', 'dist']);
const jsFiles = [];

function walk(dir) {
  if (!fs.existsSync(dir)) return;
  for (const name of fs.readdirSync(dir)) {
    if (ignoreDirs.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (full.endsWith('.js')) jsFiles.push(full);
  }
}

walk(path.join(root, 'js'));

const ownershipMapPath = path.join(root, 'tools', 'ownership-map.json');
const ownershipMap = fs.existsSync(ownershipMapPath)
  ? JSON.parse(fs.readFileSync(ownershipMapPath, 'utf8'))
  : { canonicalSymbols: [] };

let hasError = false;
function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}
function error(msg) {
  hasError = true;
  console.error('❌ ' + msg);
}
function warn(msg) {
  console.warn('⚠️  ' + msg);
}
function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}
function posInIndex(indexText, script) {
  return indexText.indexOf(`src="${script}"`);
}
function requireScriptBefore(indexText, beforeScript, afterScript, reason) {
  const beforePos = posInIndex(indexText, beforeScript);
  const afterPos = posInIndex(indexText, afterScript);
  if (beforePos === -1) error(`index.html 未加载：${beforeScript}`);
  if (afterPos === -1) error(`index.html 未加载：${afterScript}`);
  if (beforePos !== -1 && afterPos !== -1 && beforePos > afterPos) {
    error(`${beforeScript} 必须在 ${afterScript} 之前加载${reason ? '，' + reason : ''}`);
  }
}

console.log('OWO V1/V2/V3/V4/V5/V6/V7/V8/V9/V10/V11/V12/V13/V14/V15/V16/V17/V18/V19/V20/V21/V22/V23/V24/V25/V26/V27/V28/V29/V30/V31/V32/V33/V34/V35/V36/V37/V38/V38.1 architecture check\n');

// 1. 行数 gate
for (const file of jsFiles) {
  const lines = read(file).split(/\r?\n/).length;
  const r = rel(file);
  const isNewStructure = /^js\/(app|core|features|platform|shared|compat)\//.test(r);
  if (lines > MAX_HARD_LINES && isNewStructure) {
    error(`${r} ${lines} 行，超过 ${MAX_HARD_LINES}，新结构文件必须拆分`);
  } else if (lines > MAX_SOFT_LINES && isNewStructure) {
    warn(`${r} ${lines} 行，超过 ${MAX_SOFT_LINES}，需要解释或拆分`);
  } else if (lines > MAX_HARD_LINES && !r.startsWith('js/modules/')) {
    warn(`${r} ${lines} 行是 legacy 大文件，V1/V2/V3/V4/V5/V6/V7/V8/V9/V10/V11/V12/V13/V14/V15/V16/V17/V18/V19/V20/V21/V22/V23/V24/V25/V26/V27/V28/V29/V30/V31/V32/V33/V34/V35/V36/V37/V38 暂不阻断，但后续必须拆分`);
  }
}

// 2. core/shared 禁止词 gate
const forbiddenInCore = [/\bwindow\b/, /\bdocument\b/, /\bfetch\s*\(/, /\blocalStorage\b/, /\bDexie\b/, /\bdb\b/];
const businessWordsInShared = [/chat/i, /character/i, /memory/i, /worldbook/i, /forum/i, /wallet/i, /prompt/i];
for (const file of jsFiles) {
  const r = rel(file);
  const text = read(file);
  if (r.startsWith('js/core/')) {
    for (const rule of forbiddenInCore) {
      if (rule.test(text)) error(`${r} 在 core 中出现禁止依赖：${rule}`);
    }
  }
  if (r.startsWith('js/shared/')) {
    for (const rule of businessWordsInShared) {
      if (rule.test(text)) error(`${r} 在 shared 中疑似出现业务语义：${rule}`);
    }
  }
}

// 3. 新目录禁止直接调用旧全局 API
const legacyGlobalUse = /window\.(showToast|saveData|saveCharacter|saveGlobalSettings|normalizeMessagesForProvider|retryImageGen)\b/g;
for (const file of jsFiles) {
  const r = rel(file);
  if (!/^js\/(app|core|features|platform|shared)\//.test(r)) continue;
  if (r === 'js/app/namespace.js' || r === 'js/app/legacyDeprecation.js') continue;
  const text = read(file);
  const matches = [...text.matchAll(legacyGlobalUse)].map(m => m[0]);
  if (matches.length) {
    error(`${r} 新结构文件直接引用旧全局 API：${[...new Set(matches)].join(', ')}`);
  }
}

// 4. window 赋值索引，用于发现可能的全局覆盖
const assigns = new Map();
const assignRe = /window\.([A-Za-z_$][\w$]*)\s*=\s*(?![=>])/g;
for (const file of jsFiles) {
  const lines = read(file).split(/\r?\n/);
  lines.forEach((line, index) => {
    let m;
    while ((m = assignRe.exec(line))) {
      const name = m[1];
      if (!assigns.has(name)) assigns.set(name, []);
      assigns.get(name).push(`${rel(file)}:${index + 1}`);
    }
  });
}
for (const [name, sites] of [...assigns.entries()].sort()) {
  const uniqueFiles = new Set(sites.map(s => s.split(':')[0]));
  if (uniqueFiles.size > 1) {
    warn(`window.${name} 在多个文件赋值：${sites.join(', ')}`);
  }
}

// 5. canonical owner gate：防止迁移后 legacy 文件保留第二套实现
const indexPath = path.join(root, 'index.html');
const indexText = read(indexPath);
function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
for (const item of ownershipMap.canonicalSymbols || []) {
  if (item.state !== 'canonical') continue;
  const legacyPath = path.join(root, item.legacyFile);
  if (!fs.existsSync(legacyPath)) {
    error(`${item.symbol} 的 legacyFile 不存在：${item.legacyFile}`);
    continue;
  }
  const legacyText = read(legacyPath);
  const escaped = escapeRegExp(item.symbol);
  const legacyImplRe = new RegExp(`(?:async\\s+)?function\\s+${escaped}\\s*\\(`);
  if (legacyImplRe.test(legacyText)) {
    error(`${item.legacyFile} 仍保留 ${item.symbol} 的函数实现；canonical owner 应为 ${item.owner}`);
  }
  const directWindowAssignRe = new RegExp(`window\\.${escaped}\\s*=`);
  if (directWindowAssignRe.test(legacyText)) {
    error(`${item.legacyFile} 对 ${item.legacyAlias} 使用直接赋值；canonical 符号必须通过 OwoApp.compat.expose 暴露`);
  }
  if (!legacyText.includes(`@compat canonical: ${item.owner}`)) {
    error(`${item.legacyFile} 缺少 ${item.symbol} 的 @compat canonical 标记：${item.owner}`);
  }
  if (indexText && item.ownerFile && item.legacyFile) {
    const ownerPos = posInIndex(indexText, item.ownerFile);
    const legacyPos = posInIndex(indexText, item.legacyFile);
    if (ownerPos === -1) error(`index.html 未加载 canonical owner：${item.ownerFile}`);
    if (legacyPos === -1) error(`index.html 未加载 legacy file：${item.legacyFile}`);
    if (ownerPos !== -1 && legacyPos !== -1 && ownerPos > legacyPos) {
      error(`${item.ownerFile} 必须在 ${item.legacyFile} 之前加载，避免兼容入口拿不到 canonical 实现`);
    }
  }
}

// 6. V3 storage single-writer gate：db.js 只能注册一次 legacy writer，main.js 不再包装 window.saveData
const dbPath = path.join(root, 'js', 'db.js');
const mainPath = path.join(root, 'js', 'main.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/platform/storage/dexieWriter.js', 'js/db.js', '避免 db.js 无法注册唯一 writer');
  requireScriptBefore(indexText, 'js/platform/storage/dexieReader.js', 'js/db.js', '避免 db.js 无法注册 loadData');
  requireScriptBefore(indexText, 'js/platform/storage/repository.js', 'js/db.js', '避免 db.js 无法注册 writer');
}
if (fs.existsSync(dbPath)) {
  const dbText = read(dbPath);
  const registerCount = (dbText.match(/setWriters\s*\(/g) || []).length;
  if (registerCount !== 1) {
    error(`js/db.js 必须且只能调用一次 setWriters，目前为 ${registerCount} 次`);
  }
  if (/setLegacyWriters\s*\(/.test(dbText)) {
    error('js/db.js V10 后不应再调用 setLegacyWriters；请使用 setWriters 注册 dexieWriter');
  }
  for (const legacyImplName of ['legacySaveDataImpl', 'legacySaveCharacterImpl', 'legacySaveGroupImpl', 'legacySaveGlobalSettingsImpl']) {
    if (new RegExp(legacyImplName + '\b').test(dbText)) {
      error(`js/db.js 不应再保留 ${legacyImplName}；写入实现归 dexieWriter`);
    }
  }
  for (const name of ['saveData', 'saveCharacter', 'saveGroup', 'saveGlobalSettings']) {
    if (new RegExp('window\\.' + name + '\\s*=').test(dbText)) {
      error(`js/db.js 不允许直接 window.${name} = ...；必须通过 OwoApp.compat.expose`);
    }
  }
}
if (fs.existsSync(mainPath)) {
  const mainText = read(mainPath);
  if (/window\.saveData\s*=/.test(mainText) || /_origSaveData/.test(mainText)) {
    error('js/main.js 不允许再包装 window.saveData；保存状态必须由 storage repository 追踪');
  }
}

// 7. V4 state defaults gate：默认状态 owner 必须先于 db.js 加载，db.js 不再保留第二套默认值实现
const stateScripts = [
  'js/app/state/constants.js',
  'js/app/state/initialState.js',
  'js/app/state/globalSettingsDefaults.js',
  'js/app/state/staticConfigBase.js',
  'js/app/state/updateLogRecent.js',
  'js/app/state/updateLogArchive.js',
  'js/app/state/staticConfig.js',
  'js/app/state/runtimeGlobals.js'
];
if (indexText) {
  for (const script of stateScripts) {
    requireScriptBefore(indexText, script, 'js/db.js', '避免 db.js 创建第二套默认状态');
  }
}
if (fs.existsSync(dbPath)) {
  const dbText = read(dbPath);
  const forbiddenDbDefaultOwners = [
    /const\s+defaultWidgetSettings\s*=/,
    /const\s+DEFAULT_COT_PRESETS\s*=/,
    /const\s+globalSettingKeys\s*=/,
    /var\s+db\s*=\s*\{/,
    /const\s+defaultValue\s*=\s*\{/
  ];
  for (const rule of forbiddenDbDefaultOwners) {
    if (rule.test(dbText)) {
      error(`js/db.js 仍保留 V4 已迁移的默认状态实现：${rule}`);
    }
  }
  const runtimeGlobalsText = read(path.join(root, 'js/app/state/runtimeGlobals.js'));
  const dexieReaderText = read(path.join(root, 'js/platform/storage/dexieReader.js'));
  if (!runtimeGlobalsText.includes('createInitialDbState()')) {
    error('js/app/state/runtimeGlobals.js 应通过 createInitialDbState() 创建 legacy db');
  }
  if (!dexieReaderText.includes('createDefaultGlobalSettings')) {
    error('js/platform/storage/dexieReader.js 应通过 globalSettingsDefaults 读取全局设置默认值');
  }
}

// 8. V5 Dexie adapter gate：schema/migration owner 从 db.js 迁到 platform/storage，保存 writer 仍不复制
const dexieAdapterPath = path.join(root, 'js/platform/storage/dexieAdapter.js');
const dexieMigrationsPath = path.join(root, 'js/platform/storage/dexieMigrations.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/platform/storage/dexieMigrations.js', 'js/platform/storage/dexieAdapter.js', '保证 adapter 能挂载 migration');
  requireScriptBefore(indexText, 'js/platform/storage/dexieAdapter.js', 'js/db.js', '避免 db.js 自行声明 Dexie schema');
}
if (!fs.existsSync(dexieAdapterPath)) error('缺少 V5 Dexie adapter：js/platform/storage/dexieAdapter.js');
if (!fs.existsSync(dexieMigrationsPath)) error('缺少 V5 Dexie migrations：js/platform/storage/dexieMigrations.js');
if (fs.existsSync(dexieAdapterPath)) {
  const adapterText = read(dexieAdapterPath);
  if (!/createDatabase\s*\(/.test(adapterText)) error('dexieAdapter.js 必须导出 createDatabase');
  if (!/initDatabase\s*\(/.test(adapterText)) error('dexieAdapter.js 必须导出 initDatabase 兼容入口');
  if (!/version\(3\)/.test(adapterText)) error('dexieAdapter.js 必须声明 Dexie version(3) schema');
  if (/saveData\s*[:=]/.test(adapterText)) error('dexieAdapter.js 不允许实现 saveData，保存 writer 仍由 repository 单写路径管理');
}
if (fs.existsSync(dexieMigrationsPath)) {
  const migrationsText = read(dexieMigrationsPath);
  if (!/migrateLegacyStorageRecordToVersion2/.test(migrationsText)) {
    error('dexieMigrations.js 必须包含 migrateLegacyStorageRecordToVersion2');
  }
}
if (fs.existsSync(dbPath)) {
  const dbText = read(dbPath);
  if (/new\s+Dexie\s*\(/.test(dbText)) error('js/db.js 不应再 new Dexie；应通过 dexieAdapter.initDatabase');
  if (/dexieDB\.version\s*\(/.test(dbText)) error('js/db.js 不应再声明 dexieDB.version schema；应迁移到 dexieAdapter');
  if (!/OwoApp\.platform\.storage\.dexieAdapter/.test(dbText)) {
    error('js/db.js 应通过 OwoApp.platform.storage.dexieAdapter 初始化 Dexie');
  }
}



// 8.5. V6 load repair gate：loadData 只编排读表，字段补齐和旧 localStorage 迁移归 loadRepair
const loadRepairPath = path.join(root, 'js/platform/storage/loadRepair.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/platform/storage/loadRepair.js', 'js/db.js', '避免 db.js 继续持有 loadData 修复逻辑');
}
if (!fs.existsSync(loadRepairPath)) error('缺少 V6 load repair shell：js/platform/storage/loadRepair.js');
if (fs.existsSync(loadRepairPath)) {
  const loadRepairText = read(loadRepairPath);
  for (const required of ['applyLoadedTables', 'hydrateGlobalSettings', 'repairLoadedData', 'migrateLegacyLocalStorage']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(loadRepairText)) {
      error(`loadRepair.js 必须提供 ${required}`);
    }
  }
  if (/saveData\s*[:=]/.test(loadRepairText) || /window\.saveData\b/.test(loadRepairText)) {
    error('loadRepair.js 不允许实现或直接调用 saveData；只能返回修复结果，由 db.js 决定兼容保存');
  }
}
if (fs.existsSync(dbPath)) {
  const dbText = read(dbPath);
  const dexieReaderText = read(path.join(root, 'js/platform/storage/dexieReader.js'));
  if (!/OwoApp\.platform\.storage\.dexieReader/.test(dbText)) {
    error('js/db.js loadData 应通过 OwoApp.platform.storage.dexieReader 创建兼容 alias');
  }
  if (!/loadRepair/.test(dexieReaderText)) {
    error('dexieReader.js loadData 应通过 OwoApp.platform.storage.loadRepair 执行字段修复');
  }
  const forbiddenLoadRepairResidue = [
    /\/\/ Data integrity checks/,
    /localStorage\.getItem\('gemini-chat-app-db'\)/,
    /c\.vectorMemory\s*=\s*\{/,
    /c\.memoryTables\s*=\s*\{/,
    /db\.piggyBank\s*=\s*\{\s*balance:\s*520/
  ];
  for (const rule of forbiddenLoadRepairResidue) {
    if (rule.test(dbText)) error(`js/db.js 仍保留 V6 已迁移的 load repair 逻辑：${rule}`);
  }
}


// 8.7. V7 storage analysis gate：dataStorage 占用统计归 storageAnalysis，db.js 只保留旧 lexical alias
const storageAnalysisPath = path.join(root, 'js/platform/storage/storageAnalysis.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/platform/storage/storageAnalysis.js', 'js/db.js', '避免 db.js 继续持有 dataStorage 分析实现');
}
if (!fs.existsSync(storageAnalysisPath)) error('缺少 V7 storage analysis owner：js/platform/storage/storageAnalysis.js');
if (fs.existsSync(storageAnalysisPath)) {
  const storageAnalysisText = read(storageAnalysisPath);
  for (const required of ['computeStorageInfo', 'createDataStorage', 'bindDataStorage']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(storageAnalysisText)) {
      error(`storageAnalysis.js 必须提供 ${required}`);
    }
  }
  if (/saveData\s*[:=]/.test(storageAnalysisText) || /window\.saveData\b/.test(storageAnalysisText)) {
    error('storageAnalysis.js 不允许实现或直接调用 saveData；存储分析只能读内存快照');
  }
  if (/dexieDB\b|\.put\s*\(|\.bulkPut\s*\(/.test(storageAnalysisText)) {
    error('storageAnalysis.js 不允许直接读写 Dexie；只分析 db 快照');
  }
}
if (fs.existsSync(dbPath)) {
  const dbText = read(dbPath);
  if (!/OwoApp\.platform\.storage\.storageAnalysis\.bindDataStorage/.test(dbText)) {
    error('js/db.js 应通过 OwoApp.platform.storage.storageAnalysis.bindDataStorage 绑定旧 dataStorage');
  }
  const forbiddenStorageAnalysisResidue = [
    /const\s+dataStorage\s*=\s*\{/,
    /getStorageInfo:\s*async\s+function/,
    /categorizedSizes\s*=\s*\{\s*messages:/,
    /charactersAndGroups:\s*0,\s*worldAndForum:/
  ];
  for (const rule of forbiddenStorageAnalysisResidue) {
    if (rule.test(dbText)) error(`js/db.js 仍保留 V7 已迁移的 storage analysis 实现：${rule}`);
  }
  if (/window\.dataStorage\s*=/.test(dbText)) {
    error('js/db.js 不允许直接 window.dataStorage = ...；旧 dataStorage 只保留 lexical alias');
  }
}

// 8.8. V8 backup adapter gate：备份数据格式归 backupAdapter，gzip/下载/读取归 browser fileAdapter
const fileAdapterPath = path.join(root, 'js/platform/browser/fileAdapter.js');
const backupAdapterPath = path.join(root, 'js/platform/storage/backupAdapter.js');
const tutorialPath = path.join(root, 'js/modules/tutorial.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/platform/browser/fileAdapter.js', 'js/modules/tutorial.js', '避免教程页继续持有 gzip/file 实现');
  requireScriptBefore(indexText, 'js/platform/storage/backupAdapter.js', 'js/modules/tutorial.js', '避免教程页继续持有备份数据格式实现');
}
if (!fs.existsSync(fileAdapterPath)) error('缺少 V8 browser file adapter：js/platform/browser/fileAdapter.js');
if (!fs.existsSync(backupAdapterPath)) error('缺少 V8 backup adapter：js/platform/storage/backupAdapter.js');
if (fs.existsSync(fileAdapterPath)) {
  const fileAdapterText = read(fileAdapterPath);
  for (const required of ['createGzipJsonBlob', 'parseGzipJsonBlob', 'downloadCompressedJson', 'readCompressedJsonFile', 'blobToBase64', 'base64ToBlob']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(fileAdapterText)) {
      error(`fileAdapter.js 必须提供 ${required}`);
    }
  }
  if (/saveData\s*[:=]|window\.saveData\b|dexieDB\b|\bdb\b/.test(fileAdapterText)) {
    error('fileAdapter.js 只能封装浏览器文件能力，不能接触 db/Dexie/saveData');
  }
}
if (fs.existsSync(backupAdapterPath)) {
  const backupAdapterText = read(backupAdapterPath);
  for (const required of ['createFullBackupData', 'createPartialBackupData', 'importPartialBackupData', 'importBackupData', 'bindLegacyBackup']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(backupAdapterText)) {
      error(`backupAdapter.js 必须提供 ${required}`);
    }
  }
  if (/window\.saveData\b/.test(backupAdapterText)) {
    error('backupAdapter.js 不允许直接调用 window.saveData；必须通过注入的 repository saveData');
  }
}
if (fs.existsSync(tutorialPath)) {
  const tutorialText = read(tutorialPath);
  const forbiddenTutorialBackupResidue = [
    /function\s+createFullBackupData\s*\(/,
    /function\s+createPartialBackupData\s*\(/,
    /function\s+importPartialBackupData\s*\(/,
    /function\s+importBackupData\s*\(/,
    /new\s+CompressionStream\s*\(/,
    /new\s+DecompressionStream\s*\(/,
    /new\s+FileReader\s*\(/
  ];
  for (const rule of forbiddenTutorialBackupResidue) {
    if (rule.test(tutorialText)) error(`js/modules/tutorial.js 仍保留 V8 已迁移的备份/文件实现：${rule}`);
  }
  if (!/OwoApp\.platform\.storage\.backupAdapter/.test(tutorialText)) {
    error('js/modules/tutorial.js 应通过 OwoApp.platform.storage.backupAdapter 绑定备份 compatibility API');
  }
  if (!/OwoApp\.platform\.browser\.fileAdapter/.test(tutorialText)) {
    error('js/modules/tutorial.js 应通过 OwoApp.platform.browser.fileAdapter 处理 .ee 文件压缩/读取/下载');
  }
}


// 8.9. V9/V10 storage writer/reader owner gate：writer/read orchestration 已从 db.js 迁到 platform/storage
const dexieWriterPath = path.join(root, 'js/platform/storage/dexieWriter.js');
const dexieReaderPath = path.join(root, 'js/platform/storage/dexieReader.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/platform/storage/dexieWriter.js', 'js/db.js', '避免 db.js 注册不到 canonical writer');
  requireScriptBefore(indexText, 'js/platform/storage/dexieReader.js', 'js/db.js', '避免 db.js 注册不到 canonical loadData');
  requireScriptBefore(indexText, 'js/app/state/runtimeGlobals.js', 'js/db.js', '避免 db.js 重新声明 legacy globals');
}
if (!fs.existsSync(dexieWriterPath)) error('缺少 V9 storage writer owner：js/platform/storage/dexieWriter.js');
if (!fs.existsSync(dexieReaderPath)) error('缺少 V10 storage reader owner：js/platform/storage/dexieReader.js');
if (fs.existsSync(dexieWriterPath)) {
  const writerText = read(dexieWriterPath);
  for (const required of ['createWriters', 'saveData', 'saveCharacter', 'saveGroup', 'saveGlobalSettings']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(writerText)) {
      error(`dexieWriter.js 必须提供 ${required}`);
    }
  }
  if (/window\.saveData\b|OwoApp\.compat\.expose/.test(writerText)) {
    error('dexieWriter.js 不允许暴露旧 window API；旧入口只能在 db.js compatibility shell 中处理');
  }
}
if (fs.existsSync(dexieReaderPath)) {
  const readerText = read(dexieReaderPath);
  if (!/createLoadData/.test(readerText)) error('dexieReader.js 必须提供 createLoadData');
  if (/window\.saveData\b|OwoApp\.compat\.expose/.test(readerText)) {
    error('dexieReader.js 不允许直接调用 window.saveData 或暴露旧 API');
  }
}
if (fs.existsSync(dbPath)) {
  const dbText = read(dbPath);
  const forbiddenDbV10Residue = [
    /const\s+BLOCKED_API_DOMAINS\s*=/,
    /const\s+colorThemes\s*=/,
    /const\s+defaultIcons\s*=/,
    /const\s+peekScreenApps\s*=/,
    /const\s+updateLog\s*=/,
    /var\s+currentChatId\s*=/,
    /var\s+dexieDB\b/,
    /bulkPut\s*\(/,
    /globalSettings\.put\s*\(/,
    /toArray\s*\(\)/
  ];
  for (const rule of forbiddenDbV10Residue) {
    if (rule.test(dbText)) error(`js/db.js 仍保留 V9/V10 已迁移实现或静态数据：${rule}`);
  }
}


// 8.95. V11 utils UI/platform split gate：Toast、错误弹窗、触感、电池状态已迁出 utils.js
const toastPath = path.join(root, 'js/shared/ui/toast.js');
const errorModalPath = path.join(root, 'js/shared/ui/errorModal.js');
const hapticAdapterPath = path.join(root, 'js/platform/browser/hapticAdapter.js');
const batteryAdapterPath = path.join(root, 'js/platform/browser/batteryAdapter.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/shared/ui/toast.js', 'js/utils.js', '避免 utils.js 继续持有 Toast 实现');
  requireScriptBefore(indexText, 'js/shared/ui/errorModal.js', 'js/utils.js', '避免 utils.js 继续持有错误弹窗实现');
  requireScriptBefore(indexText, 'js/platform/browser/hapticAdapter.js', 'js/utils.js', '避免 utils.js 继续持有 navigator.vibrate 实现');
  requireScriptBefore(indexText, 'js/platform/browser/batteryAdapter.js', 'js/utils.js', '避免 utils.js 继续持有 Battery Status 实现');
}
if (!fs.existsSync(toastPath)) error('缺少 V11 shared toast owner：js/shared/ui/toast.js');
if (!fs.existsSync(errorModalPath)) error('缺少 V11 shared error modal owner：js/shared/ui/errorModal.js');
if (!fs.existsSync(hapticAdapterPath)) error('缺少 V11 browser haptic adapter：js/platform/browser/hapticAdapter.js');
if (!fs.existsSync(batteryAdapterPath)) error('缺少 V11 browser battery adapter：js/platform/browser/batteryAdapter.js');
if (fs.existsSync(toastPath)) {
  const toastText = read(toastPath);
  for (const required of ['showToast', 'processToastQueue']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(toastText)) {
      error(`toast.js 必须提供 ${required}`);
    }
  }
}
if (fs.existsSync(errorModalPath)) {
  const errorText = read(errorModalPath);
  for (const required of ['getFriendlyErrorMessage', 'showErrorModal', 'showApiError']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(errorText)) {
      error(`errorModal.js 必须提供 ${required}`);
    }
  }
}
if (fs.existsSync(hapticAdapterPath)) {
  const hapticText = read(hapticAdapterPath);
  if (!/createHapticFeedback/.test(hapticText) || !/navigator\.vibrate|\.vibrate/.test(hapticText)) {
    error('hapticAdapter.js 必须封装 createHapticFeedback 和 navigator.vibrate');
  }
  if (/\bdb\b|window\.saveData\b/.test(hapticText)) {
    error('hapticAdapter.js 不允许直接读取 db 或保存数据；业务开关必须通过依赖注入');
  }
}
if (fs.existsSync(batteryAdapterPath)) {
  const batteryText = read(batteryAdapterPath);
  if (!/updateBatteryStatus/.test(batteryText) || !/getBattery/.test(batteryText)) {
    error('batteryAdapter.js 必须提供 updateBatteryStatus 并封装 Battery Status API');
  }
}
const utilsPath = path.join(root, 'js', 'utils.js');
if (fs.existsSync(utilsPath)) {
  const utilsText = read(utilsPath);
  const forbiddenUtilsV11Residue = [
    /let\s+notificationQueue\s*=\s*\[/,
    /function\s+processToastQueue\s*\(/,
    /function\s+getFriendlyErrorMessage\s*\(/,
    /function\s+showErrorModal\s*\(/,
    /function\s+showApiError\s*\(/,
    /function\s+triggerHapticFeedback\s*\(/,
    /async\s+function\s+updateBatteryStatus\s*\(/
  ];
  for (const rule of forbiddenUtilsV11Residue) {
    if (rule.test(utilsText)) error(`js/utils.js 仍保留 V11 已迁移的 UI/platform 实现：${rule}`);
  }
  for (const marker of [
    '@compat canonical: OwoApp.shared.ui.showToast',
    '@compat canonical: OwoApp.shared.ui.showErrorModal',
    '@compat canonical: OwoApp.shared.ui.showApiError',
    '@compat canonical: OwoApp.platform.browser.hapticAdapter.createHapticFeedback',
    '@compat canonical: OwoApp.platform.browser.updateBatteryStatus'
  ]) {
    if (!utilsText.includes(marker)) error(`js/utils.js 缺少 V11 compatibility 标记：${marker}`);
  }
}

// 8.97. V12 AI provider config gate：只收口配置读取，不迁移 fetch/stream 请求实现
const aiProviderConfigPath = path.join(root, 'js/platform/ai/providerConfig.js');
const chatAiPath = path.join(root, 'js/modules/chat_ai.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/platform/ai/providerConfig.js', 'js/modules/chat_ai.js', '避免 chat_ai.js 继续自行选择 provider 配置');
}
if (!fs.existsSync(aiProviderConfigPath)) error('缺少 V12 AI provider config owner：js/platform/ai/providerConfig.js');
if (fs.existsSync(aiProviderConfigPath)) {
  const providerConfigText = read(aiProviderConfigPath);
  for (const required of [
    'normalizeProviderSettings',
    'isProviderConfigured',
    'selectMainProviderConfig',
    'selectChatProviderConfig',
    'selectImageRecognitionProviderConfig',
    'selectSummaryProviderConfig',
    'getMainTemperature'
  ]) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(providerConfigText)) {
      error(`providerConfig.js 必须提供 ${required}`);
    }
  }
  if (/fetch\s*\(|XMLHttpRequest|EventSource|processStream|readStreamResponse/.test(providerConfigText)) {
    error('providerConfig.js 只允许做配置读取/归一化，不允许实现 fetch 或 stream 处理');
  }
  if (/window\.saveData\b|OwoApp\.compat\.expose/.test(providerConfigText)) {
    error('providerConfig.js 不允许保存数据或暴露旧 window API');
  }
}
if (fs.existsSync(chatAiPath)) {
  const chatAiText = read(chatAiPath);
  if (!/chatAiProviderConfig\s*=\s*window\.OwoApp\.platform\.ai\.providerConfig/.test(chatAiText)) {
    error('chat_ai.js 应通过 OwoApp.platform.ai.providerConfig 读取 provider 配置');
  }
  const forbiddenChatAiConfigResidue = [
    /db\.summaryApiSettings\s*&&\s*db\.summaryApiSettings\.url/,
    /db\.backgroundApiSettings\s*&&\s*db\.backgroundApiSettings\.url/,
    /db\.imageRecognitionApiSettings\s*&&\s*db\.imageRecognitionApiSettings\.url/,
    /\{\s*url\s*,\s*key\s*,\s*model\s*,\s*provider\s*,\s*streamEnabled\s*\}\s*=\s*db\.apiSettings/,
    /db\.apiSettings\.streamEnabled/,
    /db\.apiSettings\.temperature/,
    /db\.apiSettings\.quickReplyEnabled/,
    /db\.apiSettings\.onlineRoleEnabled/
  ];
  for (const rule of forbiddenChatAiConfigResidue) {
    if (rule.test(chatAiText)) error(`chat_ai.js 仍保留 V12 已迁移的 provider 配置读取逻辑：${rule}`);
  }
}


// 8.98. V13 AI provider request adapter gate：endpoint/header/request body 组装归 platform/ai，fetch/stream 仍留在 chat_ai.js
const aiProviderRequestAdapterPath = path.join(root, 'js/platform/ai/providerRequestAdapter.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/platform/ai/providerConfig.js', 'js/platform/ai/providerRequestAdapter.js', '保证 request adapter 能复用 provider config');
  requireScriptBefore(indexText, 'js/platform/ai/providerRequestAdapter.js', 'js/modules/chat_ai.js', '避免 chat_ai.js 继续自行组装 provider request');
}
if (!fs.existsSync(aiProviderRequestAdapterPath)) error('缺少 V13 AI provider request adapter：js/platform/ai/providerRequestAdapter.js');
if (fs.existsSync(aiProviderRequestAdapterPath)) {
  const requestAdapterText = read(aiProviderRequestAdapterPath);
  for (const required of [
    'buildEndpoint',
    'buildHeaders',
    'buildJsonPostRequest',
    'buildOpenAiChatRequest',
    'buildGeminiContentRequest',
    'buildMessageCompletionRequest',
    'buildPromptCompletionRequest',
    'buildImageDescriptionRequest',
    'applyWebSearchPayload'
  ]) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(requestAdapterText)) {
      error(`providerRequestAdapter.js 必须提供 ${required}`);
    }
  }
  if (/fetch\s*\(|XMLHttpRequest|EventSource|processStream|body\.getReader|TextDecoder/.test(requestAdapterText)) {
    error('providerRequestAdapter.js 只允许组装 request，不允许发起 fetch 或处理 stream');
  }
  if (/window\.saveData\b|OwoApp\.compat\.expose/.test(requestAdapterText)) {
    error('providerRequestAdapter.js 不允许保存数据或暴露旧 window API');
  }
}
if (fs.existsSync(chatAiPath)) {
  const chatAiText = read(chatAiPath);
  if (!/chatAiProviderRequestAdapter\s*=\s*window\.OwoApp\.platform\.ai\.providerRequestAdapter/.test(chatAiText)) {
    error('chat_ai.js 应通过 OwoApp.platform.ai.providerRequestAdapter 组装 endpoint/header/request');
  }
  const forbiddenChatAiRequestResidue = [
    /const\s+endpoint\s*=/,
    /const\s+headers\s*=/,
    /\/v1\/chat\/completions/,
    /streamGenerateContent\?key/,
    /generateContent\?key/,
    /Authorization:\s*`Bearer/
  ];
  for (const rule of forbiddenChatAiRequestResidue) {
    if (rule.test(chatAiText)) error(`chat_ai.js 仍保留 V13 已迁移的 request 组装逻辑：${rule}`);
  }
}



// 8.99. V14 chat message semantics/model gate：role/content/parts 归一化归 core/chat，暂不迁移 prompt builder/stream
const chatMessageSemanticsPath = path.join(root, 'js/core/chat/messageSemantics.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/core/chat/messageSemantics.js', 'js/utils.js', '避免 utils.js 继续持有 provider message 归一化实现');
  requireScriptBefore(indexText, 'js/core/chat/messageSemantics.js', 'js/platform/ai/providerRequestAdapter.js', '保证 request adapter 复用 message semantics');
  requireScriptBefore(indexText, 'js/core/chat/messageSemantics.js', 'js/modules/chat_ai.js', '避免 chat_ai.js 继续直接依赖旧 normalizeMessagesForProvider');
}
if (!fs.existsSync(chatMessageSemanticsPath)) error('缺少 V14 chat message semantics owner：js/core/chat/messageSemantics.js');
if (fs.existsSync(chatMessageSemanticsPath)) {
  const semanticsText = read(chatMessageSemanticsPath);
  for (const required of [
    'normalizeMessageRole',
    'aiMessageContentToText',
    'wrapSystemMessageForCompat',
    'mergeAdjacentCompatMessages',
    'normalizeMessagesForProvider',
    'openAiPartToGeminiPart',
    'openAiMessageContentToGeminiParts',
    'openAiMessagesToGeminiContents',
    'collectSystemInstruction'
  ]) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(semanticsText)) {
      error(`messageSemantics.js 必须提供 ${required}`);
    }
  }
  if (/fetch\s*\(|XMLHttpRequest|EventSource|processStream|body\.getReader|TextDecoder/.test(semanticsText)) {
    error('messageSemantics.js 只允许做 message role/content/parts 纯归一化，不允许 fetch 或 stream 处理');
  }
  if (/document\b|localStorage\b|Dexie\b|window\b|\bdb\b|OwoApp\.compat\.expose/.test(semanticsText)) {
    error('messageSemantics.js 不允许接触 DOM/storage/global compat；core 只能保留纯语义');
  }
}
if (fs.existsSync(utilsPath)) {
  const utilsText = read(utilsPath);
  const forbiddenUtilsV14Residue = [
    /function\s+aiMessageContentToText\s*\(/,
    /function\s+wrapSystemMessageForCompat\s*\(/,
    /function\s+mergeAdjacentCompatMessages\s*\(/,
    /function\s+normalizeMessagesForProvider\s*\(/
  ];
  for (const rule of forbiddenUtilsV14Residue) {
    if (rule.test(utilsText)) error(`js/utils.js 仍保留 V14 已迁移的 message 归一化实现：${rule}`);
  }
  for (const marker of [
    '@compat canonical: OwoApp.core.chat.messageSemantics.aiMessageContentToText',
    '@compat canonical: OwoApp.core.chat.messageSemantics.wrapSystemMessageForCompat',
    '@compat canonical: OwoApp.core.chat.messageSemantics.mergeAdjacentCompatMessages',
    '@compat canonical: OwoApp.core.chat.messageSemantics.normalizeMessagesForProvider'
  ]) {
    if (!utilsText.includes(marker)) error(`js/utils.js 缺少 V14 compatibility 标记：${marker}`);
  }
}
if (fs.existsSync(aiProviderRequestAdapterPath)) {
  const requestAdapterText = read(aiProviderRequestAdapterPath);
  if (!/messageSemantics\.openAiMessagesToGeminiContents/.test(requestAdapterText)) {
    error('providerRequestAdapter.js 应复用 core/chat/messageSemantics 做 OpenAI message 到 Gemini contents 的映射');
  }
  for (const rule of [/function\s+openAiPartToGeminiPart\s*\(/, /function\s+openAiMessagesToGeminiContents\s*\(/, /function\s+collectSystemInstruction\s*\(/]) {
    if (rule.test(requestAdapterText)) error(`providerRequestAdapter.js 仍保留 V14 已迁移的 message 映射实现：${rule}`);
  }
}
if (fs.existsSync(chatAiPath)) {
  const chatAiText = read(chatAiPath);
  if (!/chatAiMessageSemantics\s*=\s*window\.OwoApp\.core\.chat\.messageSemantics/.test(chatAiText)) {
    error('chat_ai.js 应通过 OwoApp.core.chat.messageSemantics 读取 message 归一化 owner');
  }
  if (/[^\.]\bnormalizeMessagesForProvider\s*\(/.test(chatAiText)) {
    error('chat_ai.js 不应再直接调用旧全局 normalizeMessagesForProvider；请使用 chatAiMessageSemantics.normalizeMessagesForProvider');
  }
}

// 8.995. V15 prompt builder pieces/context gate：prompt 片段和上下文归 core/chat，fetch/stream 仍留在 chat_ai.js
const chatPromptContextPath = path.join(root, 'js/core/chat/promptContext.js');
const chatPromptPiecesPath = path.join(root, 'js/core/chat/promptPieces.js');
const chatPromptSemanticsPath = path.join(root, 'js/core/chat/promptSemantics.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/core/chat/promptContext.js', 'js/core/chat/promptSemantics.js', '保证 prompt semantics 能聚合 context owner');
  requireScriptBefore(indexText, 'js/core/chat/promptPieces.js', 'js/core/chat/promptSemantics.js', '保证 prompt semantics 能聚合 pieces owner');
  requireScriptBefore(indexText, 'js/core/chat/promptSemantics.js', 'js/modules/chat_ai.js', '避免 chat_ai.js 继续持有 prompt pieces/context 实现');
}
if (!fs.existsSync(chatPromptContextPath)) error('缺少 V15 prompt context owner：js/core/chat/promptContext.js');
if (!fs.existsSync(chatPromptPiecesPath)) error('缺少 V15 prompt pieces owner：js/core/chat/promptPieces.js');
if (!fs.existsSync(chatPromptSemanticsPath)) error('缺少 V15 prompt semantics facade：js/core/chat/promptSemantics.js');
if (fs.existsSync(chatPromptContextPath)) {
  const contextText = read(chatPromptContextPath);
  for (const required of ['resolveLinkedCharacter', 'getActiveNode', 'isOfflineNode', 'getActiveWorldBooksContents', 'formatPeekContentForPrompt', 'buildUserPhoneStatePrompt']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(contextText)) {
      error(`promptContext.js 必须提供 ${required}`);
    }
  }
  if (/fetch\s*\(|XMLHttpRequest|EventSource|processStream|body\.getReader|TextDecoder|document\b|localStorage\b|Dexie\b|window\b|\bdb\b|OwoApp\.compat\.expose/.test(contextText)) {
    error('promptContext.js 只允许做 prompt 上下文纯组装，不允许接触 DOM/storage/fetch/stream/global compat');
  }
}
if (fs.existsSync(chatPromptPiecesPath)) {
  const piecesText = read(chatPromptPiecesPath);
  for (const required of ['HUMAN_RUN_PROMPT', 'getEffectivePersona', 'getStickerNames', 'getOnlineLogicRules', 'getOnlineOutputFormats', 'getOfflineOutputFormats', 'getInjectedFormatsPrompt', 'estimateTokenFromText']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(piecesText)) {
      error(`promptPieces.js 必须提供 ${required}`);
    }
  }
  if (/fetch\s*\(|XMLHttpRequest|EventSource|processStream|body\.getReader|TextDecoder|document\b|localStorage\b|Dexie\b|window\b|\bdb\b|OwoApp\.compat\.expose/.test(piecesText)) {
    error('promptPieces.js 只允许做 prompt pieces 纯语义，不允许接触 DOM/storage/fetch/stream/global compat');
  }
}
if (fs.existsSync(chatPromptSemanticsPath)) {
  const semanticsText = read(chatPromptSemanticsPath);
  if (!/core\.chat\.promptSemantics\s*=\s*Object\.assign/.test(semanticsText)) {
    error('promptSemantics.js 应只聚合 promptContext/promptPieces，作为 facade 暴露稳定 API');
  }
  if (/fetch\s*\(|XMLHttpRequest|EventSource|processStream|body\.getReader|TextDecoder|document\b|localStorage\b|Dexie\b|window\b|\bdb\b|OwoApp\.compat\.expose/.test(semanticsText)) {
    error('promptSemantics.js facade 不允许接触 DOM/storage/fetch/stream/global compat');
  }
}
if (fs.existsSync(chatAiPath)) {
  const chatAiText = read(chatAiPath);
  if (!/chatAiPromptSemantics\s*=\s*window\.OwoApp\.core\.chat\.promptSemantics/.test(chatAiText)) {
    error('chat_ai.js 应通过 OwoApp.core.chat.promptSemantics 读取 prompt pieces/context owner');
  }
  const requiredPromptCalls = [
    'getActiveWorldBooksContents',
    'getEffectivePersona',
    'formatPeekContentForPrompt',
    'buildUserPhoneStatePrompt',
    'getOnlineLogicRules',
    'getOnlineOutputFormats',
    'getOfflineOutputFormats',
    'getInjectedFormatsPrompt',
    'estimateTokenFromText'
  ];
  for (const required of requiredPromptCalls) {
    if (!chatAiText.includes('chatAiPromptSemantics.' + required)) {
      error(`chat_ai.js 应通过 chatAiPromptSemantics.${required} 复用 V15 prompt owner`);
    }
  }
  const forbiddenPromptResidue = [
    /const\s+HUMAN_RUN_PROMPT\s*=\s*`/,
    /switch\s*\(entry\.appId\)/,
    /const\s+maxLen\s*=\s*600/,
    /return\s+p\s*\|\|\s*['"]一个友好、乐于助人的伙伴。['"]/,
    /const\s+globalBooks\s*=\s*typeof\s+db/,
    /function\s+getOnlineOutputFormats\s*\([^)]*\)\s*\{[\s\S]{0,800}photoVideoFormat\s*=/
  ];
  for (const rule of forbiddenPromptResidue) {
    if (rule.test(chatAiText)) error(`chat_ai.js 仍保留 V15 已迁移的 prompt pieces/context 实现：${rule}`);
  }
}


// 8.996. V16 chat render/view split gate：renderMessageBubble 入口和消息 view model 归 features/chat；保存/AI/stream 不动
const chatMessageViewModelPath = path.join(root, 'js/features/chat/messageViewModel.js');
const chatRenderMessageBubblePath = path.join(root, 'js/features/chat/renderMessageBubble.js');
const walletChatRenderPath = path.join(root, 'js/modules/chat_render.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/features/chat/messageViewModel.js', 'js/features/chat/renderMessageBubble.js', '保证 render facade 能创建 view model');
  requireScriptBefore(indexText, 'js/features/chat/renderMessageBubble.js', 'js/modules/chat_render.js', '避免 chat_render.js 继续直接拥有 renderMessageBubble 入口');
}
if (!fs.existsSync(chatMessageViewModelPath)) error('缺少 V16 chat message view model owner：js/features/chat/messageViewModel.js');
if (!fs.existsSync(chatRenderMessageBubblePath)) error('缺少 V16 renderMessageBubble owner：js/features/chat/renderMessageBubble.js');
if (fs.existsSync(chatMessageViewModelPath)) {
  const viewModelText = read(chatMessageViewModelPath);
  for (const required of ['createMessageViewModel', 'normalizeMessageForView', 'getAvatarClass', 'parseBilingualContent', 'formatTimestampByFormat']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(viewModelText)) {
      error(`messageViewModel.js 必须提供 ${required}`);
    }
  }
  if (/fetch\s*\(|XMLHttpRequest|EventSource|processStream|body\.getReader|TextDecoder|window\.saveData\b|OwoApp\.compat\.expose/.test(viewModelText)) {
    error('messageViewModel.js 只允许做消息渲染 view model 归一化，不允许 fetch/stream/saveData/compat 暴露');
  }
}
if (fs.existsSync(chatRenderMessageBubblePath)) {
  const renderFacadeText = read(chatRenderMessageBubblePath);
  for (const required of ['setLegacyRenderer', 'createRenderContext', 'renderMessageBubble', 'getLegacyRendererMeta']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(renderFacadeText)) {
      error(`renderMessageBubble.js 必须提供 ${required}`);
    }
  }
  if (/fetch\s*\(|XMLHttpRequest|EventSource|processStream|body\.getReader|TextDecoder|window\.saveData\b|OwoApp\.compat\.expose/.test(renderFacadeText)) {
    error('renderMessageBubble.js 只允许提供渲染入口/facade，不允许 fetch/stream/saveData/compat 暴露');
  }
}
if (fs.existsSync(walletChatRenderPath)) {
  const renderText = read(walletChatRenderPath);
  if (!/chatMessageViewModel\s*=\s*window\.OwoApp\.features\.chat\.messageViewModel/.test(renderText)) {
    error('chat_render.js 应通过 OwoApp.features.chat.messageViewModel 创建消息 view model');
  }
  if (!/chatRenderMessageBubble\s*=\s*window\.OwoApp\.features\.chat\.renderMessageBubble/.test(renderText)) {
    error('chat_render.js 应通过 OwoApp.features.chat.renderMessageBubble 统一渲染入口');
  }
  if (!/setLegacyRenderer\s*\(\(message, renderContext\)/.test(renderText)) {
    error('chat_render.js 必须向 V16 renderMessageBubble owner 注册 legacy DOM renderer');
  }
  if (!/function\s+createMessageBubbleElement\s*\([^)]*\)\s*\{\s*return\s+renderMessageBubble\(/.test(renderText)) {
    error('createMessageBubbleElement 旧入口必须只转发到 renderMessageBubble，不允许继续承载 DOM 逻辑');
  }
  if (/const\s+bubble(?:Element)?\s*=\s*createMessageBubbleElement\(/.test(renderText)) {
    error('chat_render.js 内部新增渲染调用应走 renderMessageBubble，createMessageBubbleElement 只保留给外部 legacy 调用');
  }
}

// 8.997. V17 settings shell + public facade gate：先建立 settings feature 出口，不拆 API 设置细节
const settingsShellPath = path.join(root, 'js/features/settings/settingsShell.js');
const settingsServicePath = path.join(root, 'js/features/settings/settingsService.js');
const settingsPublicPath = path.join(root, 'js/features/settings/public.js');
const settingsLegacyPath = path.join(root, 'js/settings.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/features/settings/settingsShell.js', 'js/features/settings/settingsService.js', '保证 settings service 能读取 shell');
  requireScriptBefore(indexText, 'js/features/settings/settingsService.js', 'js/features/settings/public.js', '保证 public facade 只转发 service');
  requireScriptBefore(indexText, 'js/features/settings/public.js', 'js/settings.js', '避免 settings.js 无法注册 legacy 实现');
  requireScriptBefore(indexText, 'js/settings.js', 'js/main.js', '保证 main.js 调用 settings public facade 时 legacy 实现已注册');
}
if (!fs.existsSync(settingsShellPath)) error('缺少 V17 settings shell：js/features/settings/settingsShell.js');
if (!fs.existsSync(settingsServicePath)) error('缺少 V17 settings service：js/features/settings/settingsService.js');
if (!fs.existsSync(settingsPublicPath)) error('缺少 V17 settings public facade：js/features/settings/public.js');
if (fs.existsSync(settingsShellPath)) {
  const shellText = read(settingsShellPath);
  for (const required of ['registerLegacyApi', 'listRegisteredApiNames', 'getMeta', 'call']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(shellText)) {
      error(`settingsShell.js 必须提供 ${required}`);
    }
  }
  if (/document\b|fetch\s*\(|XMLHttpRequest|EventSource|localStorage\b|Dexie\b|saveData\s*\(/.test(shellText)) {
    error('settingsShell.js 只允许注册/转发 legacy settings API，不允许 DOM/storage/fetch/saveData');
  }
}
if (fs.existsSync(settingsServicePath)) {
  const serviceText = read(settingsServicePath);
  for (const required of ['setupChatSettings', 'setupApiSettingsApp', 'setupWallpaperApp', 'setupPresetFeatures', 'setupCustomizeApp']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(serviceText)) {
      error(`settingsService.js 必须提供 ${required}`);
    }
  }
  if (/document\b|fetch\s*\(|XMLHttpRequest|EventSource|localStorage\b|Dexie\b|saveData\s*\(/.test(serviceText)) {
    error('settingsService.js V17 只允许 setup 入口转发，不允许 settings 业务细节或平台请求');
  }
}
if (fs.existsSync(settingsPublicPath)) {
  const publicText = read(settingsPublicPath);
  if (!/settingsFeature\.publicApi\s*=\s*publicApi/.test(publicText)) {
    error('settings public.js 必须只暴露 settingsFeature.publicApi 稳定出口');
  }
  if (/document\b|fetch\s*\(|XMLHttpRequest|EventSource|localStorage\b|Dexie\b|saveData\s*\(|OwoApp\.compat\.expose/.test(publicText)) {
    error('settings public.js 只允许转发稳定 API，不允许业务逻辑、平台请求、compat 暴露');
  }
}
if (fs.existsSync(settingsLegacyPath)) {
  const settingsText = read(settingsLegacyPath);
  if (!/registerLegacySettingsFacade/.test(settingsText) || !/settingsShell\.registerLegacyApi/.test(settingsText)) {
    error('settings.js 必须在 V17 末尾把 legacy setup 实现注册到 settingsShell');
  }
  if (!/@compat canonical-entry: OwoApp\.features\.settings\.publicApi/.test(settingsText)) {
    error('settings.js 缺少 V17 settings public facade 兼容标记');
  }
  if (!/OwoApp\.compat\.expose\(name, settingsFeature\.publicApi\[name\]/.test(settingsText)) {
    error('settings.js 旧全局 settings setup 入口必须通过 OwoApp.compat.expose 转发到 publicApi');
  }
}
if (fs.existsSync(mainPath)) {
  const mainText = read(mainPath);
  if (!/settingsFeature\s*=\s*window\.OwoApp\.features\.settings\.publicApi/.test(mainText)) {
    error('main.js 应通过 OwoApp.features.settings.publicApi 调用 settings 初始化入口');
  }
  for (const direct of ['setupChatSettings', 'setupApiSettingsApp', 'setupWallpaperApp', 'setupPresetFeatures']) {
    const directCallRe = new RegExp('(^|\\n)\\s*' + direct + '\\s*\\(\\s*\\)\\s*;', 'm');
    if (directCallRe.test(mainText)) error(`main.js 不应再直接调用 legacy settings 入口：${direct}()`);
  }
  if (/(^|\n)\s*try \{\s*setupCustomizeApp\(\);/.test(mainText)) {
    error('main.js 不应再直接调用 legacy setupCustomizeApp；请走 settingsFeature.setupCustomizeApp()');
  }
}


// 8.998. V18 API settings module gate：API 设置 UI / preset service 迁入 features/settings/apiSettings，不碰 chat_ai fetch/stream
const apiSettingsDir = path.join(root, 'js/features/settings/apiSettings');
const apiSettingsScripts = [
  'js/features/settings/apiSettings/apiSettingsModel.js',
  'js/features/settings/apiSettings/apiPresetService.js',
  'js/features/settings/apiSettings/apiModelListService.js',
  'js/features/settings/apiSettings/mainApiSettingsView.js',
  'js/features/settings/apiSettings/subApiSettingsView.js',
  'js/features/settings/apiSettings/weatherApiSettingsView.js',
  'js/features/settings/apiSettings/public.js'
];
for (const script of apiSettingsScripts) {
  const full = path.join(root, script);
  if (!fs.existsSync(full)) error(`缺少 V18 API settings 文件：${script}`);
}
if (indexText) {
  requireScriptBefore(indexText, 'js/features/settings/settingsShell.js', 'js/features/settings/apiSettings/apiSettingsModel.js', '保证 apiSettings 挂载在 settings namespace 下');
  requireScriptBefore(indexText, 'js/features/settings/apiSettings/apiSettingsModel.js', 'js/features/settings/apiSettings/apiPresetService.js', '保证 preset service 可依赖 model namespace');
  requireScriptBefore(indexText, 'js/features/settings/apiSettings/apiPresetService.js', 'js/features/settings/apiSettings/apiModelListService.js', '保证 model list service 之后再挂载 view');
  requireScriptBefore(indexText, 'js/features/settings/apiSettings/apiModelListService.js', 'js/features/settings/apiSettings/mainApiSettingsView.js', '保证主 API view 可以拉取模型');
  requireScriptBefore(indexText, 'js/features/settings/apiSettings/mainApiSettingsView.js', 'js/features/settings/apiSettings/subApiSettingsView.js', '保证 public facade 加载前 view 已挂载');
  requireScriptBefore(indexText, 'js/features/settings/apiSettings/subApiSettingsView.js', 'js/features/settings/apiSettings/weatherApiSettingsView.js', '保证 public facade 加载前天气 view 已挂载');
  requireScriptBefore(indexText, 'js/features/settings/apiSettings/weatherApiSettingsView.js', 'js/features/settings/apiSettings/public.js', '保证 public facade 可以聚合所有 apiSettings view');
  requireScriptBefore(indexText, 'js/features/settings/apiSettings/public.js', 'js/features/settings/settingsService.js', '保证 settingsService 优先使用 API settings canonical owner');
  requireScriptBefore(indexText, 'js/features/settings/apiSettings/public.js', 'js/settings.js', '避免 settings.js wrapper 找不到 API settings owner');
}
if (fs.existsSync(apiSettingsDir)) {
  for (const file of fs.readdirSync(apiSettingsDir).filter(name => name.endsWith('.js'))) {
    const full = path.join(apiSettingsDir, file);
    const text = read(full);
    if (/chat_ai|fetchAiResponse|processStream|EventSource|streamGenerateContent/.test(text)) {
      error(`V18 API settings 文件不允许触碰聊天 provider fetch/stream 主链路：js/features/settings/apiSettings/${file}`);
    }
    if (/(^|[^.\w$])saveData\s*\(/.test(text)) {
      error(`V18 API settings 新文件不应直接调用 legacy saveData()：js/features/settings/apiSettings/${file}`);
    }
    if (/innerHTML\s*=\s*`<option/.test(text)) {
      error(`V18 API settings 不应使用模板字符串拼接 option innerHTML：js/features/settings/apiSettings/${file}`);
    }
  }
}
if (fs.existsSync(settingsLegacyPath)) {
  const settingsText = read(settingsLegacyPath);
  if (!/@compat canonical: OwoApp\.features\.settings\.apiSettings\.publicApi\.setupApiSettingsApp/.test(settingsText)) {
    error('settings.js 缺少 V18 setupApiSettingsApp 兼容 wrapper 标记');
  }
  if (/function\s+setupApiSettingsApp\s*\([^)]*\)\s*\{[\s\S]{0,800}document\.getElementById\('api-form'\)/.test(settingsText)) {
    error('settings.js 不应继续保留 setupApiSettingsApp 的 API 设置 UI 实现；请只保留 wrapper');
  }
  if (/function\s+setupSubApiSettings\s*\([^)]*\)\s*\{[\s\S]{0,600}const\s+providerEl\s*=\s*document\.getElementById/.test(settingsText)) {
    error('settings.js 不应继续保留 setupSubApiSettings 实现；副 API 设置应归 features/settings/apiSettings');
  }
}




// 8.999. V19 appearance/theme/wallpaper/font gate：外观/主题/壁纸/字体 UI 迁入 features/settings/appearance，不碰 API 设置和 chat_ai
const appearanceDir = path.join(root, 'js/features/settings/appearance');
const appearanceScripts = [
  'js/features/settings/appearance/appearanceModel.js',
  'js/features/settings/appearance/appearanceRuntime.js',
  'js/features/settings/appearance/wallpaperSettingsView.js',
  'js/features/settings/appearance/fontPresetView.js',
  'js/features/settings/appearance/widgetWallpaperPresetView.js',
  'js/features/settings/appearance/themeStatusView.js',
  'js/features/settings/appearance/appearanceService.js',
  'js/features/settings/appearance/public.js'
];
for (const script of appearanceScripts) {
  if (!fs.existsSync(path.join(root, script))) error(`缺少 V19 appearance settings 文件：${script}`);
}
if (indexText) {
  requireScriptBefore(indexText, 'js/features/settings/appearance/appearanceModel.js', 'js/features/settings/appearance/appearanceRuntime.js', '保证 runtime 可读取 appearance model namespace');
  requireScriptBefore(indexText, 'js/features/settings/appearance/appearanceRuntime.js', 'js/features/settings/appearance/wallpaperSettingsView.js', '保证壁纸 view 可复用 runtime');
  requireScriptBefore(indexText, 'js/features/settings/appearance/wallpaperSettingsView.js', 'js/features/settings/appearance/fontPresetView.js', '保证 public facade 加载前 wallpaper/font view 已挂载');
  requireScriptBefore(indexText, 'js/features/settings/appearance/fontPresetView.js', 'js/features/settings/appearance/widgetWallpaperPresetView.js', '保证 public facade 加载前字体和方案 view 已挂载');
  requireScriptBefore(indexText, 'js/features/settings/appearance/widgetWallpaperPresetView.js', 'js/features/settings/appearance/themeStatusView.js', '保证 public facade 加载前方案和主题 view 已挂载');
  requireScriptBefore(indexText, 'js/features/settings/appearance/themeStatusView.js', 'js/features/settings/appearance/appearanceService.js', '保证 appearance service 可以聚合所有 view');
  requireScriptBefore(indexText, 'js/features/settings/appearance/appearanceService.js', 'js/features/settings/appearance/public.js', '保证 public facade 只转发 service');
  requireScriptBefore(indexText, 'js/features/settings/appearance/public.js', 'js/features/settings/settingsService.js', '保证 settingsService 优先使用 appearance canonical owner');
  requireScriptBefore(indexText, 'js/features/settings/appearance/public.js', 'js/settings.js', '避免 settings.js wrapper 找不到 appearance owner');
}
if (fs.existsSync(appearanceDir)) {
  for (const file of fs.readdirSync(appearanceDir).filter(name => name.endsWith('.js'))) {
    const full = path.join(appearanceDir, file);
    const text = read(full);
    if (/chat_ai|fetchAiResponse|processStream|streamGenerateContent|providerRequestAdapter/.test(text)) {
      error(`V19 appearance 文件不允许触碰 API provider fetch/stream 或 chat_ai：js/features/settings/appearance/${file}`);
    }
    if (/window\.saveData\b|window\.showToast\b|OwoApp\.compat\.expose/.test(text)) {
      error(`V19 appearance 文件不应直接调用旧 window API 或暴露 compat：js/features/settings/appearance/${file}`);
    }
  }
}
if (fs.existsSync(settingsLegacyPath)) {
  const settingsText = read(settingsLegacyPath);
  for (const marker of [
    '@compat canonical: OwoApp.features.settings.appearance.publicApi',
    'V19: 字体预设 UI 已迁入',
    'V19: 壁纸设置 UI 已迁入',
    'V19: 主屏幕壁纸/小组件方案 UI 已迁入',
    'V19: 主题/状态栏 UI 绑定已迁入'
  ]) {
    if (!settingsText.includes(marker)) error(`settings.js 缺少 V19 appearance compatibility 标记：${marker}`);
  }
  const forbiddenAppearanceResidue = [
    /db\.fontPresets\s*=\s*arr\s*\|\|\s*\[\]/,
    /const\s+GLOBAL_CHAT_BG_KEY\s*=/,
    /db\.widgetWallpaperPresets\s*=\s*arr\s*\|\|\s*\[\]/,
    /function\s+setupWallpaperApp\s*\([^)]*\)\s*\{\s*const\s+e\s*=/,
    /function\s+applyNightMode\s*\([^)]*\)\s*\{\s*const\s+settings\s*=\s*db\.nightModeSettings/,
    /function\s+applyHomeStatusBar\s*\([^)]*\)\s*\{\s*const\s+phoneScreen\s*=/
  ];
  for (const rule of forbiddenAppearanceResidue) {
    if (rule.test(settingsText)) error(`settings.js 仍保留 V19 已迁移的 appearance 实现：${rule}`);
  }
}



// 8.9995. V20 preset engine + auth gate pause：API/font/widget-wallpaper 预设 CRUD 归 presetEngine；账号密码登录门禁暂停
const authGatePath = path.join(root, 'js/app/authGate.js');
const presetEngineDir = path.join(root, 'js/features/settings/presetEngine');
const presetEngineScripts = [
  'js/features/settings/presetEngine/presetEngineModel.js',
  'js/features/settings/presetEngine/presetEngineService.js',
  'js/features/settings/presetEngine/public.js'
];
if (indexText) {
  requireScriptBefore(indexText, 'js/app/namespace.js', 'js/app/authGate.js', '保证 authGate 能挂载到 OwoApp.app');
  requireScriptBefore(indexText, 'js/app/authGate.js', 'js/main.js', '保证 main.js 启动时登录门禁已接管');
  requireScriptBefore(indexText, 'js/features/settings/presetEngine/presetEngineModel.js', 'js/features/settings/presetEngine/presetEngineService.js', '保证 service 可复用 preset model');
  requireScriptBefore(indexText, 'js/features/settings/presetEngine/presetEngineService.js', 'js/features/settings/presetEngine/public.js', '保证 public facade 只转发 service');
  requireScriptBefore(indexText, 'js/features/settings/presetEngine/public.js', 'js/features/settings/apiSettings/apiPresetService.js', '保证 API preset service 复用统一 preset engine');
  requireScriptBefore(indexText, 'js/features/settings/presetEngine/public.js', 'js/features/settings/appearance/fontPresetView.js', '保证字体预设复用统一 preset engine');
  requireScriptBefore(indexText, 'js/features/settings/presetEngine/public.js', 'js/features/settings/appearance/widgetWallpaperPresetView.js', '保证主屏幕方案复用统一 preset engine');
}
if (!fs.existsSync(authGatePath)) error('缺少 V20 auth gate：js/app/authGate.js');
if (fs.existsSync(authGatePath)) {
  const authText = read(authGatePath);
  if (!/AUTH_GATE_ENABLED\s*=\s*false/.test(authText)) {
    error('V20 要求账号密码登录门禁暂停：authGate.js 中 AUTH_GATE_ENABLED 必须为 false');
  }
  if (/puppy-subscription-api|\/api\/verify|fetch\s*\(/.test(authText)) {
    error('authGate.js 暂停登录门禁时不应调用远端账号密码验证 API');
  }
  for (const required of ['isEnabled', 'isPaused', 'start', 'startDirectly']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(authText)) {
      error(`authGate.js 必须提供 ${required}`);
    }
  }
}
if (fs.existsSync(mainPath)) {
  const mainText = read(mainPath);
  if (!/OwoApp\.app\.authGate/.test(mainText) || !/authGate\.start\(\{ initDatabase, init, renderLoginOverlay \}\)/.test(mainText)) {
    error('main.js DOMContentLoaded 必须通过 OwoApp.app.authGate.start 接管账号密码登录门禁');
  }
  if (!/authGate\.isPaused\(\)/.test(mainText) || mainText.indexOf('authGate.isPaused()') > mainText.indexOf('puppy-subscription-api')) {
    error('tryLogin 必须在调用远端验证 API 前检查 authGate.isPaused()，确保暂停状态不会请求账号密码 API');
  }
}
for (const script of presetEngineScripts) {
  if (!fs.existsSync(path.join(root, script))) error(`缺少 V20 preset engine 文件：${script}`);
}
const presetEngineModelPath = path.join(root, 'js/features/settings/presetEngine/presetEngineModel.js');
const presetEngineServicePath = path.join(root, 'js/features/settings/presetEngine/presetEngineService.js');
const presetEnginePublicPath = path.join(root, 'js/features/settings/presetEngine/public.js');
if (fs.existsSync(presetEngineModelPath)) {
  const modelText = read(presetEngineModelPath);
  for (const required of ['normalizeName', 'normalizeCollection', 'upsertByName', 'renameAt', 'removeAt', 'mergeByName', 'createPreset']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(modelText)) {
      error(`presetEngineModel.js 必须提供 ${required}`);
    }
  }
  if (/document\b|fetch\s*\(|localStorage\b|Dexie\b|saveData\b|chat_ai|processStream/.test(modelText)) {
    error('presetEngineModel.js 只允许做预设数组纯语义，不允许触碰 DOM/storage/fetch/chat');
  }
}
if (fs.existsSync(presetEngineServicePath)) {
  const serviceText = read(presetEngineServicePath);
  for (const required of ['getPresets', 'savePresets', 'upsertPreset', 'renamePreset', 'removePresetAt', 'mergeImportedPresets', 'createStateStore']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(serviceText)) {
      error(`presetEngineService.js 必须提供 ${required}`);
    }
  }
  if (/document\b|fetch\s*\(|localStorage\b|Dexie\b|window\.saveData\b|chat_ai|processStream/.test(serviceText)) {
    error('presetEngineService.js 只允许绑定 state/key，不允许触碰 DOM/storage adapter/fetch/chat');
  }
}
if (fs.existsSync(presetEnginePublicPath)) {
  const publicText = read(presetEnginePublicPath);
  if (!/presetEngine\.publicApi\s*=/.test(publicText)) error('presetEngine/public.js 必须暴露 presetEngine.publicApi');
  if (/function\s+(?!registerSettingsPresetEnginePublic)/.test(publicText)) {
    error('presetEngine/public.js 只能做 public facade，不应写业务函数');
  }
}
const apiPresetServicePath = path.join(root, 'js/features/settings/apiSettings/apiPresetService.js');
const fontPresetViewPath = path.join(root, 'js/features/settings/appearance/fontPresetView.js');
const widgetPresetViewPath = path.join(root, 'js/features/settings/appearance/widgetWallpaperPresetView.js');
if (fs.existsSync(apiPresetServicePath)) {
  const apiPresetText = read(apiPresetServicePath);
  if (!/presetEngine\.(getPresets|upsertPreset|createPreset)/.test(apiPresetText)) {
    error('apiPresetService.js 应复用 V20 presetEngine 处理通用 API preset CRUD');
  }
  for (const rule of [/function\s+ensureArray\s*\(/, /findIndex\s*\(/, /\.splice\s*\(/, /presets\.push\s*\(/]) {
    if (rule.test(apiPresetText)) error(`apiPresetService.js 仍保留 V20 已统一的通用 CRUD 实现：${rule}`);
  }
}
if (fs.existsSync(fontPresetViewPath)) {
  const fontText = read(fontPresetViewPath);
  if (!/presetEngine\.createStateStore/.test(fontText)) error('fontPresetView.js 应通过 presetEngine.createStateStore 管理 fontPresets');
  if (/db\.fontPresets\s*=|\.splice\s*\(|\.push\s*\(/.test(fontText)) {
    error('fontPresetView.js 不应再直接维护 fontPresets 数组 CRUD；应复用 presetEngine');
  }
}
if (fs.existsSync(widgetPresetViewPath)) {
  const widgetText = read(widgetPresetViewPath);
  if (!/presetEngine\.createStateStore/.test(widgetText)) error('widgetWallpaperPresetView.js 应通过 presetEngine.createStateStore 管理 widgetWallpaperPresets');
  if (/db\.widgetWallpaperPresets\s*=|\.splice\s*\(|\.push\s*\(/.test(widgetText)) {
    error('widgetWallpaperPresetView.js 不应再直接维护 widgetWallpaperPresets 数组 CRUD；应复用 presetEngine');
  }
}

// 9. V5/V6/V7/V8/V9/V10/V11/V12/V13/V14/V15/V16/V17/V18/V19/V20/V21/V22 Netlify deploy gate：当前默认直接发布；dist 构建只作为显式可选模式
const netlifyTomlPath = path.join(root, 'netlify.toml');
const netlifyBuildPath = path.join(root, 'tools', 'netlify-build.js');
const redirectsPath = path.join(root, '_redirects');
if (!fs.existsSync(netlifyTomlPath)) {
  error('缺少 netlify.toml，无法用文件配置方式稳定发布到 Netlify');
} else {
  const netlifyToml = read(netlifyTomlPath);
  const isDirectPublish = /publish\s*=\s*"\."/.test(netlifyToml);
  const isDistPublish = /publish\s*=\s*"dist"/.test(netlifyToml);
  const hasCommand = /(^|\n)\s*command\s*=/.test(netlifyToml);

  if (isDirectPublish) {
    if (hasCommand) error('direct publish 模式下 netlify.toml 不应设置 command；避免覆盖 UI 空构建命令');
    for (const required of ['index.html', 'js', 'css']) {
      if (!fs.existsSync(path.join(root, required))) error(`direct publish 模式缺少根目录资源：${required}`);
    }
  } else if (isDistPublish) {
    if (!/tools\/arch-check\.js/.test(netlifyToml)) error('dist 模式 build command 应先运行 tools/arch-check.js');
    if (!/tools\/netlify-build\.js/.test(netlifyToml)) error('dist 模式 build command 应运行 tools/netlify-build.js 生成 dist');
    if (!fs.existsSync(netlifyBuildPath)) error('dist 模式缺少 tools/netlify-build.js');
  } else {
    error('netlify.toml 必须明确 publish = "." 或 publish = "dist"');
  }
}
if (!fs.existsSync(redirectsPath)) warn('缺少 _redirects；SPA 深链刷新可能不能回退到 index.html');


// 21. V21 voice/TTS/CoT settings gate：入口归 features/settings/voiceCot，不能把 TTS/音色预设实现写回 settings.js
const voiceCotScripts = [
  'js/features/settings/voiceCot/voiceCotRuntime.js',
  'js/features/settings/voiceCot/ttsPresetView.js',
  'js/features/settings/voiceCot/voicePresetView.js',
  'js/features/settings/voiceCot/cotCharacterSettingsView.js',
  'js/features/settings/voiceCot/cotSettingsEntry.js',
  'js/features/settings/voiceCot/public.js'
];
if (indexText) {
  for (const script of voiceCotScripts) {
    requireScriptBefore(indexText, script, 'js/settings.js', '避免 settings.js 重新拥有 TTS/音色/CoT 设置实现');
  }
  requireScriptBefore(indexText, 'js/features/settings/voiceCot/public.js', 'js/modules/cot_settings.js', 'CoT legacy 实现需要注册到 voiceCot public facade');
}
const voiceCotDir = path.join(root, 'js/features/settings/voiceCot');
for (const script of voiceCotScripts) {
  const file = path.join(root, script);
  if (!fs.existsSync(file)) error(`缺少 V21 voiceCot 文件：${script}`);
}
const settingsTextForV21 = read(path.join(root, 'js/settings.js'));
const forbiddenV21SettingsPatterns = [
  /function\s+saveCurrentTTSAsPreset\s*\([^)]*\)\s*\{(?!\s*return\s+window\.OwoApp\.features\.settings\.voiceCot\.publicApi)/,
  /function\s+openTTSManageModal\s*\([^)]*\)\s*\{(?!\s*return\s+window\.OwoApp\.features\.settings\.voiceCot\.publicApi)/,
  /function\s+saveCurrentVoiceAsPreset\s*\([^)]*\)\s*\{(?!\s*return\s+window\.OwoApp\.features\.settings\.voiceCot\.publicApi)/,
  /function\s+openVoicePresetManageModal\s*\([^)]*\)\s*\{(?!\s*return\s+window\.OwoApp\.features\.settings\.voiceCot\.publicApi)/,
  /const\s+charCotEnabledEl\s*=\s*document\.getElementById\('setting-char-cot-enabled'\)/
];
for (const rule of forbiddenV21SettingsPatterns) {
  if (rule.test(settingsTextForV21)) {
    error(`js/settings.js 仍疑似保留 V21 已迁移的 TTS/音色/CoT 设置实现：${rule}`);
  }
}
for (const file of ['ttsPresetView.js', 'voicePresetView.js']) {
  const text = read(path.join(voiceCotDir, file));
  if (/window\.saveData\b/.test(text) || /\bsaveData\s*\(/.test(text)) {
    error(`js/features/settings/voiceCot/${file} 不允许直接调用 legacy saveData；必须走 voiceCotRuntime.save()`);
  }
  if (/window\.showToast\b/.test(text)) {
    error(`js/features/settings/voiceCot/${file} 不允许直接调用 legacy showToast；必须走 voiceCotRuntime.showToast()`);
  }
}


// 22. V22 settings legacy shell close gate：已迁移入口不再注册到 settingsShell，只能走对应 public facade
const settingsShellTextForV22 = read(path.join(root, 'js/features/settings/settingsShell.js'));
const settingsServiceTextForV22 = read(path.join(root, 'js/features/settings/settingsService.js'));
const settingsPublicTextForV22 = read(path.join(root, 'js/features/settings/public.js'));
const settingsTextForV22 = read(path.join(root, 'js/settings.js'));
const migratedSettingsRoutesV22 = [
  'setupApiSettingsApp',
  'setupWallpaperApp',
  'setupNightModeBindings',
  'setupStatusBarBindings',
  'initCotSettings'
];

if (!/MIGRATED_CANONICAL_API_NAMES/.test(settingsShellTextForV22)) {
  error('settingsShell.js 必须显式登记 V22 已迁移 canonical API，阻止它们重新注册为 legacy 实现');
}
if (!/assertNotMigrated/.test(settingsShellTextForV22)) {
  error('settingsShell.js 必须在 registerLegacyApi 时阻断已迁移 settings API');
}
if (!/getLegacyApiReport/.test(settingsShellTextForV22)) {
  error('settingsShell.js 必须提供 getLegacyApiReport，方便 V22 后检查 legacy shell 剩余入口');
}
for (const name of migratedSettingsRoutesV22) {
  const routeLiteral = new RegExp("['\"]" + name + "['\"]");
  if (!routeLiteral.test(settingsShellTextForV22)) {
    error(`settingsShell.js 的 MIGRATED_CANONICAL_API_NAMES 缺少 ${name}`);
  }
}
if (!/CANONICAL_ROUTE_META/.test(settingsServiceTextForV22) || !/callCanonical/.test(settingsServiceTextForV22)) {
  error('settingsService.js 必须通过 CANONICAL_ROUTE_META/callCanonical 统一转发已迁移 settings 入口');
}
for (const name of ['setupApiSettingsApp', 'setupWallpaperApp', 'setupNightModeBindings', 'setupStatusBarBindings', 'initCotSettings']) {
  const fnRe = new RegExp('function\\s+' + name + '\\s*\\([^)]*\\)\\s*\\{[\\s\\S]{0,220}?return\\s+callCanonical\\(\\s*[\'\"]' + name + '[\'\"]');
  if (!fnRe.test(settingsServiceTextForV22)) {
    error(`settingsService.js 中 ${name} 必须强制走 callCanonical，不允许 fallback 到 legacy shell`);
  }
}
if (!/getSettingsRoutingReport/.test(settingsServiceTextForV22) || !/getSettingsRoutingReport/.test(settingsPublicTextForV22)) {
  error('settings public/service 必须暴露 getSettingsRoutingReport，便于阶段 4 收口验收');
}
const legacyApiBlockMatch = settingsTextForV22.match(/const\s+legacyApi\s*=\s*\{([\s\S]*?)\};\s*\n\s*settingsFeature\.settingsShell\.registerLegacyApi/);
if (!legacyApiBlockMatch) {
  error('settings.js 必须保留一个明确的 legacyApi 注册块');
} else {
  const legacyApiBlock = legacyApiBlockMatch[1];
  for (const name of ['setupWallpaperApp', 'setupNightModeBindings', 'setupStatusBarBindings', 'setupApiSettingsApp', 'initCotSettings']) {
    if (new RegExp('\\b' + name + '\\b').test(legacyApiBlock)) {
      error(`settings.js V22 后不允许把已迁移入口 ${name} 注册到 settingsShell legacyApi`);
    }
  }
  for (const name of ['setupChatSettings', 'loadSettingsToSidebar', 'setupMagicRoomApp', 'setupPresetFeatures', 'setupCustomizeApp']) {
    if (!new RegExp('\\b' + name + '\\b').test(legacyApiBlock)) {
      error(`settings.js legacyApi 注册块缺少尚未迁移入口 ${name}`);
    }
  }
}
for (const marker of [
  'V22: settings.js 只注册尚未迁移的 legacy setup',
  'V22: settings legacy shell 收口；壁纸 setup 入口不再注册到 settingsShell',
  'V22: settings legacy shell 收口；夜间模式绑定入口只转发 appearance public facade',
  'V22: settings legacy shell 收口；顶栏状态栏绑定入口只转发 appearance public facade'
]) {
  if (!settingsTextForV22.includes(marker)) error(`settings.js 缺少 V22 收口标记：${marker}`);
}


// 23. V23 memory table vertical slice gate：结构化记忆的语义/model/service/view 已从 legacy 大文件中抽出
const memoryTableLegacyPath = path.join(root, 'js/modules/memory_table.js');
const memoryTableSemanticsPath = path.join(root, 'js/core/memory/tableSemantics.js');
const memoryTableModelPath = path.join(root, 'js/features/memoryTable/model.js');
const memoryTableServicePath = path.join(root, 'js/features/memoryTable/service.js');
const memoryTableViewPath = path.join(root, 'js/features/memoryTable/view.js');
const memoryTablePublicPath = path.join(root, 'js/features/memoryTable/public.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/core/memory/tableSemantics.js', 'js/modules/memory_table.js', '避免 memory_table.js 继续持有模板/字段纯语义实现');
  requireScriptBefore(indexText, 'js/features/memoryTable/model.js', 'js/modules/memory_table.js', '避免 memory_table.js 继续持有 chat.memoryTables 状态模型');
  requireScriptBefore(indexText, 'js/features/memoryTable/service.js', 'js/modules/memory_table.js', '避免 memory_table.js 继续持有运行时 state 绑定');
  requireScriptBefore(indexText, 'js/features/memoryTable/view.js', 'js/modules/memory_table.js', '避免 memory_table.js 继续持有列表 view model');
  requireScriptBefore(indexText, 'js/features/memoryTable/public.js', 'js/modules/memory_table.js', '保证结构化记忆 public facade 先于 legacy shell');
}
for (const [file, label] of [
  [memoryTableSemanticsPath, 'V23 memory table semantics owner'],
  [memoryTableModelPath, 'V23 memory table model owner'],
  [memoryTableServicePath, 'V23 memory table service owner'],
  [memoryTableViewPath, 'V23 memory table view owner'],
  [memoryTablePublicPath, 'V23 memory table public facade']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (fs.existsSync(memoryTableSemanticsPath)) {
  const text = read(memoryTableSemanticsPath);
  for (const required of ['normalizeTemplate', 'normalizeFieldType', 'normalizeFieldValue', 'createStarterTemplate', 'getFieldDisplayValue']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`tableSemantics.js 必须提供 ${required}`);
    }
  }
}
if (fs.existsSync(memoryTableModelPath)) {
  const text = read(memoryTableModelPath);
  for (const required of ['ensureMemoryTableState', 'ensureTemplateDataForChat', 'setFieldValue', 'addRow', 'getMemoryTableAutoUpdateCursorInfo']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`memoryTable/model.js 必须提供 ${required}`);
    }
  }
  if (/document\.|fetch\s*\(|window\.saveData\b/.test(text)) {
    error('memoryTable/model.js 不允许操作 DOM、fetch 或旧保存全局');
  }
}
if (fs.existsSync(memoryTableServicePath)) {
  const text = read(memoryTableServicePath);
  for (const required of ['ensureMemoryTemplateStore', 'getCurrentMemoryTableChat', 'getBoundTemplates']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`memoryTable/service.js 必须提供 ${required}`);
    }
  }
}
if (fs.existsSync(memoryTableViewPath)) {
  const text = read(memoryTableViewPath);
  for (const required of ['getVisibleFieldItems', 'formatDateTime', 'escapeHtml']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`memoryTable/view.js 必须提供 ${required}`);
    }
  }
  if (/document\.|fetch\s*\(|window\.saveData\b/.test(text)) {
    error('memoryTable/view.js 只允许 view model 和安全文本格式化，不允许 DOM/fetch/旧保存全局');
  }
}
if (fs.existsSync(memoryTableLegacyPath)) {
  const text = read(memoryTableLegacyPath);
  for (const marker of [
    '@compat canonical: OwoApp.core.memory.tableSemantics',
    '@compat canonical: OwoApp.features.memoryTable.model',
    '@compat canonical: OwoApp.features.memoryTable.service',
    '@compat canonical: OwoApp.features.memoryTable.view'
  ]) {
    if (!text.includes(marker)) error(`memory_table.js 缺少 V23 compatibility 标记：${marker}`);
  }
  for (const rule of [
    /function\s+normalizeTemplate\s*\(/,
    /function\s+ensureMemoryTableState\s*\(/,
    /function\s+ensureTemplateDataForChat\s*\(/,
    /function\s+normalizeFieldValue\s*\(/
  ]) {
    if (rule.test(text)) error(`memory_table.js 仍保留 V23 已迁移实现：${rule}`);
  }
}


// 24. V24 vector memory vertical slice gate：embedding adapter / model / context service 已从 legacy 向量记忆文件抽出
const vectorMemoryLegacyPath = path.join(root, 'js/modules/vector_memory.js');
const embeddingAdapterPath = path.join(root, 'js/platform/ai/embeddingAdapter.js');
const vectorMemoryModelPath = path.join(root, 'js/features/vectorMemory/model.js');
const vectorMemoryContextPath = path.join(root, 'js/features/vectorMemory/contextService.js');
const vectorMemoryPublicPath = path.join(root, 'js/features/vectorMemory/public.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/platform/ai/providerConfig.js', 'js/platform/ai/embeddingAdapter.js', '保证 embedding adapter 可复用 provider config');
  requireScriptBefore(indexText, 'js/platform/ai/embeddingAdapter.js', 'js/features/vectorMemory/contextService.js', '避免 context service 自己发起 embedding 请求组装');
  requireScriptBefore(indexText, 'js/features/vectorMemory/model.js', 'js/features/vectorMemory/contextService.js', '保证 context service 可复用 vector memory model');
  requireScriptBefore(indexText, 'js/features/vectorMemory/contextService.js', 'js/features/vectorMemory/public.js', '保证 public facade 只转发 context/model');
  requireScriptBefore(indexText, 'js/features/vectorMemory/public.js', 'js/modules/vector_memory.js', '保证 vector_memory.js 只做 legacy DOM shell 和兼容 wrapper');
}
for (const [file, label] of [
  [embeddingAdapterPath, 'V24 embedding adapter owner'],
  [vectorMemoryModelPath, 'V24 vector memory model owner'],
  [vectorMemoryContextPath, 'V24 vector memory context service owner'],
  [vectorMemoryPublicPath, 'V24 vector memory public facade']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (fs.existsSync(embeddingAdapterPath)) {
  const text = read(embeddingAdapterPath);
  for (const required of ['selectEmbeddingProviderConfig', 'buildGeminiEmbeddingRequest', 'buildOpenAiEmbeddingRequest', 'fetchEmbeddingBatch', 'fetchEmbeddings', 'cosineSimilarity']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`embeddingAdapter.js 必须提供 ${required}`);
    }
  }
  if (/processStream|fetchAiResponse|promptSemantics|chat_ai/.test(text)) {
    error('embeddingAdapter.js 只允许处理 embedding 请求，不允许处理聊天 stream、prompt 或 chat_ai 主链路');
  }
}
if (fs.existsSync(vectorMemoryModelPath)) {
  const text = read(vectorMemoryModelPath);
  for (const required of ['ensureVectorTemplateStore', 'ensureVectorMemoryState', 'getActiveVectorTemplate', 'clearVectorContextCache', 'getAutoVectorCursorInfo', 'resetVectorCursorToLatest']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`features/vectorMemory/model.js 必须提供 ${required}`);
    }
  }
  if (/document\.|fetch\s*\(|window\.saveData\b|window\.fetchAiResponse\b/.test(text)) {
    error('features/vectorMemory/model.js 不允许操作 DOM、fetch 或旧保存/AI 全局');
  }
}
if (fs.existsSync(vectorMemoryContextPath)) {
  const text = read(vectorMemoryContextPath);
  for (const required of ['buildVectorQueryText', 'selectFallbackEntries', 'getVectorMemoryContextBlock', 'prepareVectorMemoryContext', 'embedEntriesIfNeeded', 'addVectorEntry']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`features/vectorMemory/contextService.js 必须提供 ${required}`);
    }
  }
  if (/document\.|fetch\s*\(|processStream|fetchAiResponse|window\.saveData\b/.test(text)) {
    error('features/vectorMemory/contextService.js 不能直接操作 DOM、fetch、stream 或旧保存全局；embedding 必须走 platform/ai/embeddingAdapter');
  }
}
if (fs.existsSync(vectorMemoryLegacyPath)) {
  const text = read(vectorMemoryLegacyPath);
  for (const marker of [
    '@compat canonical: OwoApp.features.vectorMemory.model',
    '@compat canonical: OwoApp.features.vectorMemory.contextService',
    '@compat canonical: OwoApp.platform.ai.embeddingAdapter'
  ]) {
    if (!text.includes(marker)) error(`vector_memory.js 缺少 V24 compatibility 标记：${marker}`);
  }
  for (const rule of [
    /async\s+function\s+fetchEmbeddingBatch\s*\(/,
    /async\s+function\s+fetchEmbeddings\s*\(/,
    /function\s+cosineSimilarity\s*\(/,
    /function\s+ensureVectorMemoryState\s*\([^)]*\)\s*\{\s*if\s*\(!chat\.vectorMemory/,
    /function\s+prepareVectorMemoryContext\s*\([^)]*\)\s*\{\s*ensureVectorMemoryState\(chat\);/
  ]) {
    if (rule.test(text)) error(`vector_memory.js 仍保留 V24 已迁移实现：${rule}`);
  }
}


// 25. V25 journal memory surrounding slice gate：只迁移 journal 纯语义和 service，不改 chat_ai prompt / vector memory
const journalLegacyPath = path.join(root, 'js/modules/journal.js');
const journalSemanticsPath = path.join(root, 'js/core/memory/journalSemantics.js');
const journalServicePath = path.join(root, 'js/features/journal/service.js');
const journalPublicPath = path.join(root, 'js/features/journal/public.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/core/memory/journalSemantics.js', 'js/modules/journal.js', '避免 journal.js 继续持有导入/排序/prompt pieces 纯语义');
  requireScriptBefore(indexText, 'js/features/journal/service.js', 'js/modules/journal.js', '避免 journal.js 继续持有日记状态服务实现');
  requireScriptBefore(indexText, 'js/features/journal/public.js', 'js/modules/journal.js', '保证 journal public facade 先于 legacy shell');
}
for (const [file, label] of [
  [journalSemanticsPath, 'V25 journal semantics owner'],
  [journalServicePath, 'V25 journal service owner'],
  [journalPublicPath, 'V25 journal public facade']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (fs.existsSync(journalSemanticsPath)) {
  const text = read(journalSemanticsPath);
  for (const required of ['normalizeJournal', 'normalizeImportedJournals', 'getJournalsForDisplay', 'buildFavoritedJournalsPrompt', 'buildMergeJournalPrompt', 'parseJournalXml']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`journalSemantics.js 必须提供 ${required}`);
    }
  }
  if (/document\.|fetch\s*\(|window\.|localStorage|Dexie|\bdb\b/.test(text)) {
    error('journalSemantics.js 是 core 纯语义 owner，不允许 DOM/fetch/window/storage/db');
  }
}
if (fs.existsSync(journalServicePath)) {
  const text = read(journalServicePath);
  for (const required of ['getChatByContext', 'addManualJournal', 'importJournals', 'deleteJournal', 'toggleJournalFavorite', 'migrateJournalSettings', 'getAutoJournalCursorInfo', 'resetAutoJournalCursorToLatest']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`features/journal/service.js 必须提供 ${required}`);
    }
  }
  if (/document\.|fetch\s*\(|window\.saveData\b|window\.fetchAiResponse\b|chat_ai|vectorMemory/.test(text)) {
    error('features/journal/service.js 不允许操作 DOM、fetch、旧保存/AI 全局，也不能引用 chat_ai/vector memory');
  }
}
if (fs.existsSync(journalLegacyPath)) {
  const text = read(journalLegacyPath);
  for (const marker of [
    '@compat canonical: OwoApp.core.memory.journalSemantics',
    '@compat canonical: OwoApp.features.journal.service'
  ]) {
    if (!text.includes(marker)) error(`journal.js 缺少 V25 compatibility 标记：${marker}`);
  }
  for (const rule of [
    /function\s+migrateJournalSettings\s*\([^)]*\)\s*\{\s*if\s*\(!chat\.journalStyleSettings/,
    /function\s+ensureAutoJournalState\s*\([^)]*\)\s*\{\s*if\s*\(!chat\)\s*return;/,
    /function\s+getAutoJournalCursorInfo\s*\([^)]*\)\s*\{\s*ensureAutoJournalState\(chat\);/,
    /function\s+getAutoJournalChatType\s*\([^)]*\)\s*\{\s*return\s+db\.characters\.some/
  ]) {
    if (rule.test(text)) error(`journal.js 仍保留 V25 已迁移实现：${rule}`);
  }
}



// 26. V26 worldbook context builder gate：只迁移世界书触发/注入语义和 context service，不改 chat_ai 主 prompt 输出顺序
const worldBookSemanticsPath = path.join(root, 'js/core/memory/worldBookSemantics.js');
const worldBookContextServicePath = path.join(root, 'js/features/worldBook/contextService.js');
const worldBookPublicPath = path.join(root, 'js/features/worldBook/public.js');
const promptContextPath = path.join(root, 'js/core/chat/promptContext.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/core/memory/worldBookSemantics.js', 'js/features/worldBook/contextService.js', '保证 context service 复用 core worldbook semantics');
  requireScriptBefore(indexText, 'js/features/worldBook/contextService.js', 'js/core/chat/promptContext.js', '避免 promptContext 继续持有世界书 context builder 实现');
  requireScriptBefore(indexText, 'js/features/worldBook/public.js', 'js/core/chat/promptContext.js', '保证 worldbook public facade 先于 promptContext 桥接');
  requireScriptBefore(indexText, 'js/core/chat/promptContext.js', 'js/modules/chat_ai.js', '保持 chat_ai prompt 调用路径不变');
}
for (const [file, label] of [
  [worldBookSemanticsPath, 'V26 worldbook semantics owner'],
  [worldBookContextServicePath, 'V26 worldbook context service owner'],
  [worldBookPublicPath, 'V26 worldbook public facade']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (fs.existsSync(worldBookSemanticsPath)) {
  const text = read(worldBookSemanticsPath);
  for (const required of ['resolveLinkedCharacter', 'isOfflineNode', 'getAssociatedWorldBookIds', 'buildRecentTriggerText', 'shouldActivateWorldBook', 'collectActiveWorldBooks', 'splitWorldBookContentsByPosition']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`worldBookSemantics.js 必须提供 ${required}`);
    }
  }
  if (/document\.|fetch\s*\(|window\.|localStorage|Dexie|\bdb\b|saveData|chat_ai|vectorMemory/.test(text)) {
    error('worldBookSemantics.js 是 core 纯语义 owner，不允许 DOM/fetch/window/storage/db/chat_ai/vector memory');
  }
}
if (fs.existsSync(worldBookContextServicePath)) {
  const text = read(worldBookContextServicePath);
  for (const required of ['getActiveWorldBooks', 'getActiveWorldBooksContents', 'getWorldBookContextReport']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`features/worldBook/contextService.js 必须提供 ${required}`);
    }
  }
  if (/document\.|fetch\s*\(|window\.saveData\b|window\.fetchAiResponse\b|processStream|chat_ai|vectorMemory/.test(text)) {
    error('features/worldBook/contextService.js 不允许操作 DOM、fetch、旧保存/AI 全局、stream、chat_ai 或 vector memory');
  }
}
if (fs.existsSync(promptContextPath)) {
  const text = read(promptContextPath);
  if (!text.includes('@compat canonical: OwoApp.features.worldBook.contextService.getActiveWorldBooksContents')) {
    error('promptContext.js 缺少 V26 worldbook context compatibility 标记');
  }
  for (const rule of [
    /const\s+globalBooks\s*=\s*asArray\(state\.worldBooks\)/,
    /const\s+allBookIds\s*=\s*\[\.\.\.new Set\(\[\.\.\.associatedIds/,
    /function\s+getActiveWorldBooksContents\s*\([^)]*\)\s*\{[\s\S]{0,800}?alwaysOn/,
    /function\s+getActiveWorldBooksContents\s*\([^)]*\)\s*\{[\s\S]{0,800}?keywords/
  ]) {
    if (rule.test(text)) error(`promptContext.js 仍保留 V26 已迁移的 worldbook context builder 实现：${rule}`);
  }
}


// 27. V27 memory regression gate：只补 memory smoke 文档和静态 gate，不拆新业务
const memorySmokeDocPath = path.join(root, 'docs/smoke-memory.md');
const memoryV27PlanPath = path.join(root, 'docs/v27-memory-regression-gate-plan.md');
const memoryGatePath = path.join(root, 'tools/memory-regression-gate.js');
if (!fs.existsSync(memorySmokeDocPath)) error('缺少 V27 memory smoke 文档：docs/smoke-memory.md');
if (!fs.existsSync(memoryV27PlanPath)) error('缺少 V27 计划文档：docs/v27-memory-regression-gate-plan.md');
if (!fs.existsSync(memoryGatePath)) error('缺少 V27 memory regression gate：tools/memory-regression-gate.js');
if (fs.existsSync(memorySmokeDocPath)) {
  const smokeText = read(memorySmokeDocPath);
  const requiredSmokeTokens = [
    'MEM-TABLE-01', 'MEM-TABLE-08',
    'MEM-VECTOR-01', 'MEM-VECTOR-09',
    'MEM-JOURNAL-01', 'MEM-JOURNAL-08',
    'MEM-WORLDBOOK-01', 'MEM-WORLDBOOK-08',
    'MEM-CROSS-01', 'MEM-CROSS-07',
    'node tools/memory-regression-gate.js',
    'window.OwoApp.features.memoryTable.publicApi',
    'window.OwoApp.features.vectorMemory.publicApi',
    'window.OwoApp.features.journal.publicApi',
    'window.OwoApp.features.worldBook.publicApi'
  ];
  for (const token of requiredSmokeTokens) {
    if (!smokeText.includes(token)) error(`docs/smoke-memory.md 缺少 V27 smoke token：${token}`);
  }
}
if (fs.existsSync(memoryGatePath)) {
  const gateText = read(memoryGatePath);
  for (const token of ['OWO V27 memory regression gate', 'MEM-TABLE-01', 'MEM-VECTOR-09', 'MEM-JOURNAL-08', 'MEM-WORLDBOOK-08', 'MEM-CROSS-07']) {
    if (!gateText.includes(token)) error(`tools/memory-regression-gate.js 缺少必要检查 token：${token}`);
  }
  if (/fetch\s*\(|window\.saveData\s*\(|window\.fetchAiResponse\s*\(|processStream\s*\(/.test(gateText)) {
    error('tools/memory-regression-gate.js 只能做静态文件检查，不允许调用 fetch/saveData/fetchAiResponse/processStream');
  }
}


// 28. V28 forum vertical slice gate：只迁移 profile/post/dm semantics 和 service，不改 chat_ai prompt / 消息发送
const forumLegacyPath = path.join(root, 'js/modules/forum.js');
const forumSemanticsPath = path.join(root, 'js/core/forum/forumSemantics.js');
const forumProfileServicePath = path.join(root, 'js/features/forum/profileService.js');
const forumPostServicePath = path.join(root, 'js/features/forum/postService.js');
const forumDmServicePath = path.join(root, 'js/features/forum/dmService.js');
const forumPublicPath = path.join(root, 'js/features/forum/public.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/core/forum/forumSemantics.js', 'js/features/forum/profileService.js', '保证论坛 profile service 复用 core forum semantics');
  requireScriptBefore(indexText, 'js/core/forum/forumSemantics.js', 'js/features/forum/postService.js', '保证论坛 post service 复用 core forum semantics');
  requireScriptBefore(indexText, 'js/core/forum/forumSemantics.js', 'js/features/forum/dmService.js', '保证论坛 dm service 复用 core forum semantics');
  requireScriptBefore(indexText, 'js/features/forum/profileService.js', 'js/features/forum/public.js', '保证 forum public facade 只转发已注册 service');
  requireScriptBefore(indexText, 'js/features/forum/postService.js', 'js/features/forum/public.js', '保证 forum public facade 只转发已注册 service');
  requireScriptBefore(indexText, 'js/features/forum/dmService.js', 'js/features/forum/public.js', '保证 forum public facade 只转发已注册 service');
  requireScriptBefore(indexText, 'js/features/forum/public.js', 'js/modules/forum.js', '保证 forum.js 只做 legacy DOM/AI 编排 shell 和兼容 wrapper');
}
for (const [file, label] of [
  [forumSemanticsPath, 'V28 forum semantics owner'],
  [forumProfileServicePath, 'V28 forum profile service owner'],
  [forumPostServicePath, 'V28 forum post service owner'],
  [forumDmServicePath, 'V28 forum dm service owner'],
  [forumPublicPath, 'V28 forum public facade']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (fs.existsSync(forumSemanticsPath)) {
  const text = read(forumSemanticsPath);
  for (const required of ['normalizeUserProfile', 'createAltAccount', 'resolveActiveAccount', 'createUserPost', 'createUserComment', 'filterPosts', 'getUserStats', 'getDmUserList', 'getConversationMessages', 'createDmMessage']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`forumSemantics.js 必须提供 ${required}`);
    }
  }
  if (/document\.|fetch\s*\(|window\.|localStorage|Dexie|\bdb\b|saveData|chat_ai|processStream|fetchAiResponse/.test(text)) {
    error('forumSemantics.js 是 core/forum 纯语义 owner，不允许 DOM/fetch/window/storage/db/saveData/chat_ai/stream');
  }
}
for (const [file, label, requiredFns] of [
  [forumProfileServicePath, 'features/forum/profileService.js', ['ensureUserProfile', 'getActiveAccount', 'switchAccount', 'createAltAccount', 'updateAltAccount', 'deleteAltAccount', 'updateUserProfile']],
  [forumPostServicePath, 'features/forum/postService.js', ['ensurePostList', 'findPost', 'createUserPost', 'togglePostLike', 'togglePostFavorite', 'addUserComment', 'deletePost', 'deletePosts', 'getUserStats']],
  [forumDmServicePath, 'features/forum/dmService.js', ['getStrangerProfile', 'getDMUserList', 'getConversationMessages', 'markDMRead', 'countUnread', 'addUserMessage', 'addCommentContextIfNeeded', 'deleteConversations', 'isFriend']]
]) {
  if (!fs.existsSync(file)) continue;
  const text = read(file);
  for (const required of requiredFns) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) error(`${label} 必须提供 ${required}`);
  }
  if (/document\.|fetch\s*\(|window\.saveData\b|window\.fetchAiResponse\b|processStream|chat_ai|providerRequestAdapter/.test(text)) {
    error(`${label} 不允许操作 DOM、fetch、旧保存/AI 全局、stream、chat_ai 或 provider request 主链路`);
  }
}
if (fs.existsSync(forumLegacyPath)) {
  const text = read(forumLegacyPath);
  for (const marker of [
    '@compat canonical: OwoApp.core.forum.forumSemantics',
    '@compat canonical: OwoApp.features.forum.profileService',
    '@compat canonical: OwoApp.features.forum.postService',
    '@compat canonical: OwoApp.features.forum.dmService'
  ]) {
    if (!text.includes(marker)) error(`forum.js 缺少 V28 compatibility 标记：${marker}`);
  }
  for (const rule of [
    /function\s+forumGetActiveAccount\s*\([^)]*\)\s*\{[\s\S]{0,500}?db\.forumActiveAccountId\s*\|\|\s*'main'/,
    /function\s+forumCreateAltAccount\s*\([^)]*\)\s*\{[\s\S]{0,500}?db\.forumAltAccounts\.push/,
    /function\s+forumPublishPost\s*\([^)]*\)\s*\{[\s\S]{0,900}?db\.forumPosts\.unshift/,
    /function\s+forumPublishComment\s*\([^)]*\)\s*\{[\s\S]{0,800}?post\.comments\.push/,
    /function\s+forumGetDMUserList\s*\([^)]*\)\s*\{[\s\S]{0,500}?new Map\(\)/,
    /function\s+forumSendDM\s*\([^)]*\)\s*\{[\s\S]{0,500}?db\.forumMessages\.push/
  ]) {
    if (rule.test(text)) error(`forum.js 仍保留 V28 已迁移实现：${rule}`);
  }
}

// 29. V29 theater vertical slice gate：只拆 scene/model/prompt semantics 和 service，不改 chat_ai / forum / 消息发送
const theaterLegacyPath = path.join(root, 'js/modules/theater.js');
const theaterSceneSemanticsPath = path.join(root, 'js/core/theater/sceneSemantics.js');
const theaterPromptSemanticsPath = path.join(root, 'js/core/theater/promptSemantics.js');
const theaterModelPath = path.join(root, 'js/features/theater/model.js');
const theaterPromptServicePath = path.join(root, 'js/features/theater/promptService.js');
const theaterPublicPath = path.join(root, 'js/features/theater/public.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/core/theater/sceneSemantics.js', 'js/modules/theater.js', '避免 theater.js 继续持有 scene/model 纯语义实现');
  requireScriptBefore(indexText, 'js/core/theater/promptSemantics.js', 'js/modules/theater.js', '避免 theater.js 继续持有 prompt pieces');
  requireScriptBefore(indexText, 'js/features/theater/model.js', 'js/modules/theater.js', '避免 theater.js 继续持有场景列表状态模型');
  requireScriptBefore(indexText, 'js/features/theater/promptService.js', 'js/modules/theater.js', '避免 theater.js 继续持有 prompt context service');
  requireScriptBefore(indexText, 'js/features/theater/public.js', 'js/modules/theater.js', '保证小剧场 public facade 先于 legacy shell');
}
for (const [file, label] of [
  [theaterSceneSemanticsPath, 'V29 theater scene semantics owner'],
  [theaterPromptSemanticsPath, 'V29 theater prompt semantics owner'],
  [theaterModelPath, 'V29 theater model owner'],
  [theaterPromptServicePath, 'V29 theater prompt service owner'],
  [theaterPublicPath, 'V29 theater public facade']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (fs.existsSync(theaterSceneSemanticsPath)) {
  const text = read(theaterSceneSemanticsPath);
  for (const required of ['normalizeMode', 'getScenarioListKey', 'normalizeScenario', 'createScenario', 'filterScenariosByCategory', 'normalizeGeneratedContent']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`theater sceneSemantics.js 必须提供 ${required}`);
    }
  }
  if (/\bwindow\b|\bdocument\b|\bfetch\s*\(|\blocalStorage\b|\bDexie\b|\bdb\b/.test(text)) {
    error('core/theater/sceneSemantics.js 不允许触碰 window/document/fetch/storage/legacy state');
  }
}
if (fs.existsSync(theaterPromptSemanticsPath)) {
  const text = read(theaterPromptSemanticsPath);
  for (const required of ['getManualSystemPrompt', 'buildManualPrompt', 'decideCharacterMode', 'buildCharacterSystemPrompt', 'buildCharacterPrompt']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`theater promptSemantics.js 必须提供 ${required}`);
    }
  }
  if (/\bwindow\b|\bdocument\b|\bfetch\s*\(|\blocalStorage\b|\bDexie\b|\bdb\b/.test(text)) {
    error('core/theater/promptSemantics.js 不允许触碰 window/document/fetch/storage/legacy state');
  }
}
if (fs.existsSync(theaterModelPath)) {
  const text = read(theaterModelPath);
  for (const required of ['getScenarioList', 'setScenarioList', 'getPromptPresetList', 'addScenario', 'deleteScenariosByIds', 'getScenarioListForView']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`features/theater/model.js 必须提供 ${required}`);
    }
  }
  if (/document\.|fetch\s*\(|window\.saveData\b|processStream|fetchAiResponse/.test(text)) {
    error('features/theater/model.js 不允许操作 DOM、发请求、处理流或调用旧保存全局');
  }
}
if (fs.existsSync(theaterPromptServicePath)) {
  const text = read(theaterPromptServicePath);
  for (const required of ['buildManualGenerationRequest', 'buildCharacterGenerationRequest', 'normalizeGeneratedContent']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) {
      error(`features/theater/promptService.js 必须提供 ${required}`);
    }
  }
  if (/document\.|fetch\s*\(|processStream|fetchAiResponse|window\.saveData\b/.test(text)) {
    error('features/theater/promptService.js 只允许组装 prompt context，不允许 DOM/fetch/stream/保存');
  }
}
if (fs.existsSync(theaterLegacyPath)) {
  const text = read(theaterLegacyPath);
  for (const marker of [
    '@compat canonical: OwoApp.core.theater.sceneSemantics / OwoApp.features.theater.model / OwoApp.features.theater.promptService',
    'theaterPromptService.buildManualGenerationRequest',
    'theaterPromptService.buildCharacterGenerationRequest',
    'theaterModel.addScenario',
    'theaterSceneSemantics.createScenario'
  ]) {
    if (!text.includes(marker)) error(`theater.js 缺少 V29 compatibility / routing 标记：${marker}`);
  }
  const chatAiTextForV29 = read(path.join(root, 'js/modules/chat_ai.js'));
  const forumTextForV29 = read(path.join(root, 'js/modules/forum.js'));
  if (!chatAiTextForV29.includes('chatAiProviderConfig') || !chatAiTextForV29.includes('generatePrivateSystemPrompt')) {
    error('V29 不应改动 chat_ai 主 prompt / provider 主线；chat_ai 关键锚点缺失');
  }
  if (!forumTextForV29.includes('forumSemantics') || !forumTextForV29.includes('forumProfileService')) {
    error('V29 不应改动 forum 垂直切片锚点；forum V28 owner 缺失');
  }
}


// 30. V30 peek vertical slice gate：只拆 XML parse / conversation normalize / phone app model，不改 chat_ai / theater / 消息发送
const peekLegacyPath = path.join(root, 'js/modules/peek.js');
const peekXmlSemanticsPath = path.join(root, 'js/core/peek/xmlSemantics.js');
const peekConversationSemanticsPath = path.join(root, 'js/core/peek/conversationSemantics.js');
const peekPhoneAppModelPath = path.join(root, 'js/features/peek/phoneAppModel.js');
const peekPublicPath = path.join(root, 'js/features/peek/public.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/core/peek/xmlSemantics.js', 'js/modules/peek.js', '避免 peek.js 继续持有 XML parse 实现');
  requireScriptBefore(indexText, 'js/core/peek/conversationSemantics.js', 'js/modules/peek.js', '避免 peek.js 继续持有会话归一化实现');
  requireScriptBefore(indexText, 'js/core/peek/conversationSemantics.js', 'js/features/peek/phoneAppModel.js', '保证 phone app model 能复用会话语义');
  requireScriptBefore(indexText, 'js/features/peek/phoneAppModel.js', 'js/features/peek/public.js', '保证 peek public facade 只转发已注册 model');
  requireScriptBefore(indexText, 'js/features/peek/public.js', 'js/modules/peek.js', '保证 peek.js 只做 legacy DOM/AI 编排 shell 和兼容 wrapper');
}
for (const [file, label] of [
  [peekXmlSemanticsPath, 'V30 peek XML semantics owner'],
  [peekConversationSemanticsPath, 'V30 peek conversation semantics owner'],
  [peekPhoneAppModelPath, 'V30 peek phone app model owner'],
  [peekPublicPath, 'V30 peek public facade']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (fs.existsSync(peekXmlSemanticsPath)) {
  const text = read(peekXmlSemanticsPath);
  for (const required of ['parseXmlToJson', 'unwrapResultXml', 'coerceTextValue']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) error(`core/peek/xmlSemantics.js 必须提供 ${required}`);
  }
  if (/\bwindow\b|\bdocument\b|\bfetch\s*\(|\blocalStorage\b|\bDexie\b|\bdb\b|saveData|fetchAiResponse|processStream/.test(text)) {
    error('core/peek/xmlSemantics.js 只允许 XML 解析纯语义，不允许 window/document/fetch/storage/legacy state/save/AI/stream');
  }
}
if (fs.existsSync(peekConversationSemanticsPath)) {
  const text = read(peekConversationSemanticsPath);
  for (const required of ['normalizePeekConversation', 'normalizePeekConversations', 'getLastMessageText', 'getPartnerDisplayName']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) error(`core/peek/conversationSemantics.js 必须提供 ${required}`);
  }
  if (/\bwindow\b|\bdocument\b|\bfetch\s*\(|\blocalStorage\b|\bDexie\b|\bdb\b|saveData|fetchAiResponse|processStream/.test(text)) {
    error('core/peek/conversationSemantics.js 只允许会话归一化纯语义，不允许 window/document/fetch/storage/legacy state/save/AI/stream');
  }
}
if (fs.existsSync(peekPhoneAppModelPath)) {
  const text = read(peekPhoneAppModelPath);
  for (const required of ['ensurePeekScreenSettings', 'getPeekAppIds', 'getPeekAppName', 'getRefreshRange', 'recordPeekViewedByUser', 'isGeneratedAppDataValid', 'normalizeGeneratedAppData']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) error(`features/peek/phoneAppModel.js 必须提供 ${required}`);
  }
  if (/document\.|fetch\s*\(|window\.saveData\b|window\.fetchAiResponse\b|processStream|providerRequestAdapter|chat_ai/.test(text)) {
    error('features/peek/phoneAppModel.js 不允许操作 DOM、发请求、调用旧保存/AI 全局、stream 或 chat_ai 主线');
  }
}
if (fs.existsSync(peekLegacyPath)) {
  const text = read(peekLegacyPath);
  for (const marker of [
    '@compat canonical: OwoApp.core.peek.xmlSemantics.parseXmlToJson',
    '@compat canonical: OwoApp.core.peek.conversationSemantics.normalizePeekConversation',
    '@compat canonical: OwoApp.features.peek.phoneAppModel.recordPeekViewedByUser',
    'peekPhoneAppModel.isGeneratedAppDataValid',
    'peekPhoneAppModel.normalizeGeneratedAppData'
  ]) {
    if (!text.includes(marker)) error(`peek.js 缺少 V30 compatibility / routing 标记：${marker}`);
  }
  for (const rule of [
    /new\s+DOMParser\s*\(/,
    /nodeType\s*===\s*Node\.TEXT_NODE/,
    /if\s*\(!conv\.partnerId\)\s*conv\.partnerId\s*=\s*'peek_npc_/, 
    /let\s+isValid\s*=\s*false;[\s\S]{0,900}?switch\s*\(appType\)/,
    /const\s+defaultRefreshCounts\s*=\s*\{\s*messages:/,
    /const\s+appNameMapping\s*=\s*\{/
  ]) {
    if (rule.test(text)) error(`peek.js 仍保留 V30 已迁移实现：${rule}`);
  }
  const chatAiTextForV30 = read(path.join(root, 'js/modules/chat_ai.js'));
  const theaterTextForV30 = read(path.join(root, 'js/modules/theater.js'));
  if (!chatAiTextForV30.includes('generatePrivateSystemPrompt') || !chatAiTextForV30.includes('chatAiProviderConfig')) {
    error('V30 不应改动 chat_ai 主 prompt / provider 主线；chat_ai 关键锚点缺失');
  }
  if (!theaterTextForV30.includes('theaterPromptService') || !theaterTextForV30.includes('theaterSceneSemantics')) {
    error('V30 不应改动 theater V29 切片锚点；theater owner 缺失');
  }
}


// 31. V31 video call / audio / TTS media slice gate：只抽 media/audio adapter 和通话状态 model，不改 chat_ai/provider fetch/消息发送
const audioAdapterPath = path.join(root, 'js/platform/browser/audioAdapter.js');
const mediaAdapterPath = path.join(root, 'js/platform/browser/mediaAdapter.js');
const videoCallModelPath = path.join(root, 'js/features/videoCall/model.js');
const videoCallPublicPath = path.join(root, 'js/features/videoCall/public.js');
const videoCallLegacyPath = path.join(root, 'js/modules/video_call.js');
const ttsServicePath = path.join(root, 'js/modules/tts_service.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/platform/browser/audioAdapter.js', 'js/modules/tts_service.js', '保证 TTS 只复用浏览器音频 adapter，不自己创建第二套播放基础能力');
  requireScriptBefore(indexText, 'js/platform/browser/audioAdapter.js', 'js/modules/video_call.js', '保证视频通话铃声复用音频 adapter');
  requireScriptBefore(indexText, 'js/platform/browser/mediaAdapter.js', 'js/modules/video_call.js', '保证视频通话摄像头/震动复用 media adapter');
  requireScriptBefore(indexText, 'js/features/videoCall/model.js', 'js/modules/video_call.js', '保证 video_call.js 使用通话状态 model');
  requireScriptBefore(indexText, 'js/features/videoCall/public.js', 'js/modules/video_call.js', '保证视频通话 public facade 先于 legacy shell');
}
for (const [file, label] of [
  [audioAdapterPath, 'V31 browser audio adapter'],
  [mediaAdapterPath, 'V31 browser media adapter'],
  [videoCallModelPath, 'V31 videoCall model'],
  [videoCallPublicPath, 'V31 videoCall public facade']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (fs.existsSync(audioAdapterPath)) {
  const text = read(audioAdapterPath);
  for (const required of ['createAudioElement', 'stopAudio', 'playAudio', 'activateSilentAudio', 'createLoopingAudio', 'playUrl']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) error(`platform/browser/audioAdapter.js 必须提供 ${required}`);
  }
  if (/fetch\s*\(|saveData|chat_ai|providerRequestAdapter|processStream/.test(text)) {
    error('platform/browser/audioAdapter.js 只允许浏览器 Audio 基础能力，不允许 fetch/save/chat/provider/stream');
  }
}
if (fs.existsSync(mediaAdapterPath)) {
  const text = read(mediaAdapterPath);
  for (const required of ['startUserCamera', 'stopStream', 'attachStreamToVideo', 'captureVideoFrame', 'nextFacingMode', 'applyFacingClass', 'vibrate']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) error(`platform/browser/mediaAdapter.js 必须提供 ${required}`);
  }
  if (/fetch\s*\(|saveData|chat_ai|providerRequestAdapter|processStream/.test(text)) {
    error('platform/browser/mediaAdapter.js 只允许浏览器 media 基础能力，不允许 fetch/save/chat/provider/stream');
  }
}
if (fs.existsSync(videoCallModelPath)) {
  const text = read(videoCallModelPath);
  for (const required of ['createInitialState', 'normalizeCallType', 'setCameraStream', 'resetCameraState', 'toggleFacingMode', 'formatDuration']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) error(`features/videoCall/model.js 必须提供 ${required}`);
  }
  if (/document\.|fetch\s*\(|window\.saveData\b|window\.fetchAiResponse\b|processStream|providerRequestAdapter|chat_ai|new Audio\(|getUserMedia|navigator\.vibrate/.test(text)) {
    error('features/videoCall/model.js 只允许通话状态纯模型，不允许 DOM/fetch/旧保存/AI/stream/Audio/media API');
  }
}
if (fs.existsSync(videoCallLegacyPath)) {
  const text = read(videoCallLegacyPath);
  for (const marker of [
    '@compat canonical: OwoApp.features.videoCall.model.createInitialState',
    '@compat canonical: OwoApp.platform.browser.audioAdapter.stopAudio',
    '@compat canonical: OwoApp.platform.browser.mediaAdapter.startUserCamera',
    '@compat canonical: OwoApp.platform.browser.mediaAdapter.stopStream',
    '@compat canonical: OwoApp.features.videoCall.model.formatDuration'
  ]) {
    if (!text.includes(marker)) error(`video_call.js 缺少 V31 compatibility / routing 标记：${marker}`);
  }
  for (const rule of [/navigator\.mediaDevices\.getUserMedia/, /new\s+Audio\s*\(/, /navigator\.vibrate/]) {
    if (rule.test(text)) error(`video_call.js 仍保留 V31 已迁移浏览器 media/audio 基础能力：${rule}`);
  }
  const chatAiTextForV31 = read(path.join(root, 'js/modules/chat_ai.js'));
  if (!chatAiTextForV31.includes('generatePrivateSystemPrompt') || !chatAiTextForV31.includes('chatAiProviderConfig')) {
    error('V31 不应改动 chat_ai 主 prompt / provider 主线；chat_ai 关键锚点缺失');
  }
}
if (fs.existsSync(ttsServicePath)) {
  const text = read(ttsServicePath);
  if (!text.includes('ttsAudioAdapter')) error('tts_service.js 应通过 ttsAudioAdapter 复用 browser audio adapter');
  if (/new\s+Audio\s*\(/.test(text)) error('tts_service.js 不应直接 new Audio；请通过 platform/browser/audioAdapter 创建音频');
}


// 32. V32 wallet / shop / payment card slice gate：只抽钱包/商城/代付/亲属卡语义和 view model，不改消息保存、AI 请求和 chat_render 主入口
const walletPaymentSemanticsPath = path.join(root, 'js/core/wallet/paymentSemantics.js');
const walletPaymentCardViewModelPath = path.join(root, 'js/features/wallet/paymentCardViewModel.js');
const walletPublicPath = path.join(root, 'js/features/wallet/public.js');
const walletV32ChatRenderPath = path.join(root, 'js/modules/chat_render.js');
const shopLegacyPath = path.join(root, 'js/modules/shop.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/core/wallet/paymentSemantics.js', 'js/features/wallet/paymentCardViewModel.js', '保证钱包/商城卡片 view model 复用唯一语义 owner');
  requireScriptBefore(indexText, 'js/features/wallet/paymentCardViewModel.js', 'js/features/wallet/public.js', '保证 wallet public facade 只转发已注册 view model');
  requireScriptBefore(indexText, 'js/features/wallet/public.js', 'js/modules/chat_render.js', '保证 chat_render.js 拿到支付卡片 view model，但不改主渲染入口');
  requireScriptBefore(indexText, 'js/core/wallet/paymentSemantics.js', 'js/modules/shop.js', '保证 shop.js 复用订单/代付消息格式构建语义');
}
for (const [file, label] of [
  [walletPaymentSemanticsPath, 'V32 wallet payment semantics owner'],
  [walletPaymentCardViewModelPath, 'V32 wallet payment card view model owner'],
  [walletPublicPath, 'V32 wallet public facade']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (fs.existsSync(walletPaymentSemanticsPath)) {
  const text = read(walletPaymentSemanticsPath);
  for (const required of [
    'parseShopOrderContent',
    'parsePayRequestContent',
    'parseTransferContent',
    'parseFamilyCardGiftContent',
    'buildShopOrderContent',
    'buildPayRequestContent',
    'buildPayResponseText',
    'createPayExpenseRecord'
  ]) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) error(`core/wallet/paymentSemantics.js 必须提供 ${required}`);
  }
  if (/\bwindow\b|\bdocument\b|\bfetch\s*\(|\blocalStorage\b|\bDexie\b|\bdb\b|saveData|fetchAiResponse|processStream/.test(text)) {
    error('core/wallet/paymentSemantics.js 只允许钱包/商城支付纯语义，不允许 window/document/fetch/storage/legacy state/save/AI/stream');
  }
}
if (fs.existsSync(walletPaymentCardViewModelPath)) {
  const text = read(walletPaymentCardViewModelPath);
  for (const required of ['createShopOrderViewModel', 'createPayRequestViewModel', 'createTransferCardViewModel', 'createFamilyCardViewModel', 'getRoutingReport']) {
    if (!new RegExp(required + '\\s*[,:=]|function\\s+' + required + '\\s*\\(').test(text)) error(`features/wallet/paymentCardViewModel.js 必须提供 ${required}`);
  }
  if (/document\.|fetch\s*\(|window\.saveData\b|window\.fetchAiResponse\b|processStream|providerRequestAdapter|chat_ai|innerHTML|createElement/.test(text)) {
    error('features/wallet/paymentCardViewModel.js 只允许支付卡片 view model，不允许 DOM/fetch/旧保存/AI/stream/HTML 渲染');
  }
}
if (fs.existsSync(walletV32ChatRenderPath)) {
  const text = read(walletV32ChatRenderPath);
  for (const marker of [
    'walletPaymentCardViewModel.createShopOrderViewModel',
    'walletPaymentCardViewModel.createPayRequestViewModel',
    'walletPaymentCardViewModel.createTransferCardViewModel',
    'walletPaymentCardViewModel.createFamilyCardViewModel',
    'walletPaymentSemantics.buildPayResponseText'
  ]) {
    if (!text.includes(marker)) error(`chat_render.js 缺少 V32 wallet/payment routing 标记：${marker}`);
  }
  for (const rule of [
    /const\s+shopOrderRegexNew\s*=/,
    /const\s+shopPayRequestRegex\s*=/,
    /const\s+privateSentTransferRegex\s*=/,
    /const\s+familyCardGiftRegex\s*=/,
    /发起了代付请求\[：:\]\(\[\\d\.\]\+\)/
  ]) {
    if (rule.test(text)) error(`chat_render.js 仍保留 V32 已迁移支付卡片解析实现：${rule}`);
  }
}
if (fs.existsSync(shopLegacyPath)) {
  const text = read(shopLegacyPath);
  for (const marker of [
    'shopPaymentSemantics.calculateCartTotal',
    'shopPaymentSemantics.serializeCartItems',
    'shopPaymentSemantics.buildPayRequestContent',
    'shopPaymentSemantics.buildShopOrderContent'
  ]) {
    if (!text.includes(marker)) error(`shop.js 缺少 V32 shop/payment routing 标记：${marker}`);
  }
  if (/shopState\.cart\.reduce\(\(sum, i\) => sum \+ \(parseFloat\(i\.item\.price\)/.test(text)) {
    error('shop.js 仍保留购物车总价计算实现；V32 后应复用 core.wallet.paymentSemantics.calculateCartTotal');
  }
}


// 33. V33 feature integration cleanup gate：大 feature 只能通过 public facade 跨模块访问，触感反馈关闭必须可持久化
const featureIntegrationRegistryPath = path.join(root, 'js/app/featureIntegrationRegistry.js');
const v33FeaturePublicFacades = [
  'js/features/forum/public.js',
  'js/features/theater/public.js',
  'js/features/peek/public.js',
  'js/features/videoCall/public.js',
  'js/features/wallet/public.js'
];
if (indexText) {
  requireScriptBefore(indexText, 'js/features/theater/public.js', 'js/modules/chat_render.js', '保证 chat_render 跨 feature 只走 theater public facade');
  requireScriptBefore(indexText, 'js/features/wallet/public.js', 'js/modules/chat_render.js', '保证 chat_render 跨 feature 只走 wallet public facade');
  requireScriptBefore(indexText, 'js/app/featureIntegrationRegistry.js', 'js/main.js', '保证 app 启动前可检查大 feature public facade 状态');
}
if (!fs.existsSync(featureIntegrationRegistryPath)) error('缺少 V33 feature integration registry：js/app/featureIntegrationRegistry.js');
if (fs.existsSync(featureIntegrationRegistryPath)) {
  const text = read(featureIntegrationRegistryPath);
  for (const marker of ['getIntegrationReport', 'assertReady', 'getPublicContract']) {
    if (!text.includes(marker)) error(`featureIntegrationRegistry.js 缺少 ${marker}`);
  }
}
for (const facadeRel of v33FeaturePublicFacades) {
  const facadePath = path.join(root, facadeRel);
  if (!fs.existsSync(facadePath)) {
    error(`缺少大 feature public facade：${facadeRel}`);
    continue;
  }
  const text = read(facadePath);
  if (!text.includes('getRoutingReport')) error(`${facadeRel} 必须导出 getRoutingReport`);
  if (!text.includes('getPublicContract')) error(`${facadeRel} 必须导出 getPublicContract，明确跨 feature 稳定 API`);
}
if (fs.existsSync(walletV32ChatRenderPath)) {
  const text = read(walletV32ChatRenderPath);
  if (/OwoApp\.features\.wallet\.paymentCardViewModel/.test(text)) error('chat_render.js 不应直接访问 wallet 私有 view model；请走 OwoApp.features.wallet.publicApi');
  if (/OwoApp\.core\.wallet\.paymentSemantics/.test(text)) error('chat_render.js 不应直接访问 wallet core 私有 owner；请走 OwoApp.features.wallet.publicApi');
  if (/db\.theaterScenarios|db\.theaterHtmlScenarios/.test(text)) error('chat_render.js 不应直接读取 theater 私有状态；请走 OwoApp.features.theater.publicApi');
  for (const marker of ['walletPublicApi.paymentSemantics', 'theaterPublicApi.createScenarioShareViewModel', 'theaterPublicApi.openScenarioFromChat']) {
    if (!text.includes(marker)) error(`chat_render.js 缺少 V33 public facade routing 标记：${marker}`);
  }
}
if (fs.existsSync(shopLegacyPath)) {
  const text = read(shopLegacyPath);
  if (/OwoApp\.core\.wallet\.paymentSemantics/.test(text)) error('shop.js 不应直接访问 wallet core private owner；请走 OwoApp.features.wallet.publicApi');
  if (!text.includes('shopWalletPublicApi.paymentSemantics')) error('shop.js 缺少 V33 wallet public facade routing 标记：shopWalletPublicApi.paymentSemantics');
}
const constantsTextForV33 = read(path.join(root, 'js/app/state/constants.js'));
const defaultsTextForV33 = read(path.join(root, 'js/app/state/globalSettingsDefaults.js'));
const hapticAdapterTextForV33 = read(path.join(root, 'js/platform/browser/hapticAdapter.js'));
const utilsTextForV33 = read(path.join(root, 'js/utils.js'));
if (!constantsTextForV33.includes("'hapticEnabled'")) error('globalSettingKeys 必须包含 hapticEnabled，避免触感反馈关闭后无法持久化');
if (!defaultsTextForV33.includes('hapticEnabled: true')) error('globalSettingsDefaults 必须包含 hapticEnabled: true，保持旧数据默认开启');
if (!hapticAdapterTextForV33.includes('isHapticEnabled')) error('hapticAdapter 必须提供 isHapticEnabled，统一触感开关语义');
if (!utilsTextForV33.includes('isHapticEnabled')) error('utils.js 的 triggerHapticFeedback 必须通过 hapticAdapter.isHapticEnabled 判断开关');


// 34. V34 screen registry gate：只建立 screen id/init/mount/unmount 注册表，不拆 index.html DOM
const screenManifestPath = path.join(root, 'js/app/screenManifest.js');
const screenRegistryPath = path.join(root, 'js/app/screenRegistry.js');
const screenRegistryGatePath = path.join(root, 'tools/screen-registry-gate.js');
if (indexText) {
  requireScriptBefore(indexText, 'js/app/screenManifest.js', 'js/app/screenRegistry.js', '保证 registry 能读取 manifest');
  requireScriptBefore(indexText, 'js/app/screenRegistry.js', 'js/ui.js', '保证 switchScreen 能触发 registry transition');
  requireScriptBefore(indexText, 'js/app/screenRegistry.js', 'js/main.js', '保证 main.js 能做 screen DOM/manifest 验收');
}
for (const [file, label] of [
  [screenManifestPath, 'V34 screen manifest'],
  [screenRegistryPath, 'V34 screen registry'],
  [screenRegistryGatePath, 'V34 screen registry gate']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (fs.existsSync(screenManifestPath)) {
  const manifestText = read(screenManifestPath);
  const manifestIds = [...new Set([...manifestText.matchAll(/id:\s*'([^']+-screen)'/g)].map(m => m[1]))];
  const htmlIds = [...new Set([
    ...indexText.matchAll(/<[^>]*\bclass=["'][^"']*\bscreen\b[^"']*["'][^>]*\bid=["']([^"']+)["']/g),
    ...indexText.matchAll(/<[^>]*\bid=["']([^"']+)["'][^>]*\bclass=["'][^"']*\bscreen\b[^"']*["']/g)
  ].map(m => m[1]))];
  if (htmlIds.length !== 69) error(`index.html 当前 screen 数量应为 69，实际为 ${htmlIds.length}`);
  if (manifestIds.length !== htmlIds.length) error(`screenManifest 登记数量 ${manifestIds.length} 与 DOM screen 数量 ${htmlIds.length} 不一致`);
  for (const id of htmlIds) {
    if (!manifestIds.includes(id)) error(`screenManifest 缺少 DOM screen：${id}`);
  }
  for (const id of manifestIds) {
    if (!htmlIds.includes(id)) error(`screenManifest 登记了 DOM 不存在的 screen：${id}`);
  }
}
if (fs.existsSync(screenRegistryPath)) {
  const registryText = read(screenRegistryPath);
  for (const required of ['registerScreen', 'registerManifest', 'initScreen', 'mountScreen', 'unmountScreen', 'transitionTo', 'getRoutingReport', 'assertDomScreens', 'markLegacyInitComplete']) {
    if (!registryText.includes(required)) error(`screenRegistry.js 必须提供 ${required}`);
  }
  if (/classList\.(add|remove)\([^\n]*active/.test(registryText)) {
    error('screenRegistry.js 不允许接管 .screen.active 切换；V34 只建立 lifecycle registry');
  }
  if (/innerHTML|createElement|appendChild|fetch\s*\(|saveData\s*\(/.test(registryText)) {
    error('screenRegistry.js 不允许写业务 DOM、fetch 或保存；只能做 registry / lifecycle routing');
  }
}
if (fs.existsSync(path.join(root, 'js/ui.js'))) {
  const uiTextForV34 = read(path.join(root, 'js/ui.js'));
  if (!uiTextForV34.includes('screenRegistry.transitionTo')) error('ui.js switchScreen 必须调用 screenRegistry.transitionTo()');
  if (!uiTextForV34.includes('screenRegistryHandledMount')) error('ui.js 必须避免 registry mount hook 和 legacy mount fallback 重复执行');
}
if (fs.existsSync(mainPath)) {
  const mainTextForV34 = read(mainPath);
  if (!mainTextForV34.includes('screenRegistry.assertDomScreens')) error('main.js 必须在启动时检查 screen manifest 与 DOM');
  if (!mainTextForV34.includes('screenRegistry.markLegacyInitComplete')) error('main.js 必须标记 legacy init 完成，方便 registry routing report 验收');
}



// 35/36. V35/V36 screen template gate：静态模板拆分只 hydrate HTML，不拆业务逻辑
const screenTemplateRegistryPath = path.join(root, 'js/app/screenTemplateRegistry.js');
const screenTemplateGatePath = path.join(root, 'tools/screen-template-gate.js');
const screenTemplateFiles = [
  ['archive-screen', 'js/features/archive/archiveScreenTemplate.js', ['archive-list-container', 'create-archive-btn']],
  ['favorites-screen', 'js/features/favorites/favoritesScreenTemplate.js', ['favorites-list-container', 'favorites-empty-placeholder']],
  ['storage-analysis-screen', 'js/platform/storage/storageAnalysisScreenTemplate.js', ['storage-chart-container', 'storage-details-list']],
  ['chat-room-screen', 'js/features/chat/chatRoomScreenTemplate.js', ['chat-room-header-default', 'message-area']],
  ['api-settings-screen', 'js/features/settings/settingsScreenTemplates.js', ['api-form', 'api-presets-modal']],
  ['chat-settings-screen', 'js/features/settings/settingsScreenTemplates.js', ['setting-char-avatar-preview', 'setting-char-persona']],
  ['forum-screen', 'js/features/forum/forumScreenTemplates.js', ['forum-search-input', 'forum-posts-container']],
  ['forum-post-detail-screen', 'js/features/forum/forumScreenTemplates.js', ['forum-post-detail-screen']],
  ['forum-profile-screen', 'js/features/forum/forumScreenTemplates.js', ['save-forum-profile-btn', 'forum-username-input']],
  ['forum-alt-accounts-screen', 'js/features/forum/forumScreenTemplates.js', ['forum-create-alt-btn', 'forum-alt-accounts-list']],
  ['forum-settings-screen', 'js/features/forum/forumScreenTemplates.js', ['forum-api-config-section', 'save-forum-settings-btn']],
  ['forum-dm-list-screen', 'js/features/forum/forumScreenTemplates.js', ['forum-dm-list-container', 'forum-dm-list-refresh-btn']],
  ['forum-dm-conversation-screen', 'js/features/forum/forumScreenTemplates.js', ['forum-dm-message-area', 'send-forum-dm-btn']]
];
const uniqueTemplateFiles = [...new Set(screenTemplateFiles.map(item => item[1]))];
for (const [file, label] of [
  [screenTemplateRegistryPath, 'V35/V36 screen template registry'],
  [screenTemplateGatePath, 'V35/V36 screen template gate']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (indexText) {
  for (const relPath of uniqueTemplateFiles) {
    requireScriptBefore(indexText, 'js/app/screenTemplateRegistry.js', relPath, '保证 template 能注册');
    requireScriptBefore(indexText, relPath, 'js/ui.js', '保证 switchScreen 前 screen 已 hydrate');
  }
}
if (fs.existsSync(screenTemplateRegistryPath)) {
  const screenTemplateRegistryText = read(screenTemplateRegistryPath);
  for (const required of ['registerTemplate', 'hydrateTemplate', 'hydrateAll', 'getRoutingReport', 'assertHydrated']) {
    if (!screenTemplateRegistryText.includes(required)) error(`screenTemplateRegistry.js 必须提供 ${required}`);
  }
  if (/fetch\s*\(|saveData\s*\(|fetchAiResponse|processStream|classList\.(add|remove)\([^\n]*active/.test(screenTemplateRegistryText)) {
    error('screenTemplateRegistry.js 不允许业务逻辑、AI、保存或 screen active 切换；只能 hydrate 静态模板');
  }
}
if (indexText) {
  const manifestTextForTemplates = fs.existsSync(screenManifestPath) ? read(screenManifestPath) : '';
  for (const [screenId, relPath, markers] of screenTemplateFiles) {
    const templatePath = path.join(root, relPath);
    if (!fs.existsSync(templatePath)) {
      error(`缺少 V35/V36 screen template：${relPath}`);
      continue;
    }
    if (!new RegExp(`<div[^>]+id=["']${screenId}["'][^>]+data-screen-template=["']${screenId}["']`).test(indexText)) {
      error(`index.html 必须保留 ${screenId} placeholder 且带 data-screen-template`);
    }
    const templateText = read(templatePath);
    if (!templateText.includes(`registerTemplate('${screenId}'`)) error(`${relPath} 必须注册 ${screenId}`);
    if (/fetch\s*\(|saveData\s*\(|fetchAiResponse|processStream|addEventListener\s*\(/.test(templateText)) {
      error(`${relPath} 只能保存静态 HTML 模板，不允许业务逻辑、AI、保存或事件绑定`);
    }
    for (const marker of markers) {
      if (!templateText.includes(marker)) error(`${relPath} 缺少关键 DOM id：${marker}`);
    }
    if (!manifestTextForTemplates.includes(`template: '${relPath}'`)) error(`screenManifest.js 必须为 ${screenId} 标记 template: '${relPath}'`);
  }
}
if (fs.existsSync(mainPath)) {
  const mainTextForTemplates = read(mainPath);
  if (!mainTextForTemplates.includes('screenTemplates.assertHydrated')) error('main.js 必须验收 screen 模板 hydration');
  for (const id of ['chat-room-screen', 'api-settings-screen', 'chat-settings-screen', 'forum-screen']) {
    if (!mainTextForTemplates.includes(id)) error(`main.js assertHydrated 必须包含 V36 screen：${id}`);
  }
}



// 37. V37 CSS ownership gate：只建立 CSS owner 表、公共变量和 gate，不大改选择器
const cssOwnershipMapPath = path.join(root, 'tools/css-ownership-map.json');
const cssOwnershipGatePath = path.join(root, 'tools/css-ownership-gate.js');
const cssOwnershipDocPath = path.join(root, 'docs/css-ownership.md');
const cssV37PlanPath = path.join(root, 'docs/v37-css-ownership-plan.md');
const themeTokensPath = path.join(root, 'css/shared/theme-tokens.css');
for (const [file, label] of [
  [cssOwnershipMapPath, 'V37 CSS ownership map'],
  [cssOwnershipGatePath, 'V37 CSS ownership gate'],
  [cssOwnershipDocPath, 'V37 CSS ownership doc'],
  [cssV37PlanPath, 'V37 CSS plan'],
  [themeTokensPath, 'V37 shared theme tokens']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (indexText) {
  const tokenLinkPos = indexText.indexOf('href="css/shared/theme-tokens.css"');
  const baseLinkPos = indexText.indexOf('href="css/base.css"');
  if (tokenLinkPos === -1) error('index.html 必须加载 css/shared/theme-tokens.css');
  if (baseLinkPos === -1) error('index.html 必须加载 css/base.css');
  if (tokenLinkPos !== -1 && baseLinkPos !== -1 && tokenLinkPos > baseLinkPos) {
    error('css/shared/theme-tokens.css 必须在 css/base.css 前加载');
  }
}
if (fs.existsSync(themeTokensPath)) {
  const tokenText = read(themeTokensPath);
  for (const token of ['--bg-color', '--primary-color', '--font-family', '--app-font-scale', '--func-icon-color']) {
    if (!tokenText.includes(token)) error(`css/shared/theme-tokens.css 缺少公共 token：${token}`);
  }
  if (/\.(chat|forum|peek|theater|wallet|shop|settings|screen)\b/i.test(tokenText.replace(/\/\*[\s\S]*?\*\//g, ''))) {
    error('css/shared/theme-tokens.css 不允许写业务选择器，只能定义公共 :root token');
  }
}
const baseCssPath = path.join(root, 'css/base.css');
if (fs.existsSync(baseCssPath) && /:root\s*\{[\s\S]*--primary-color\s*:/.test(read(baseCssPath))) {
  error('css/base.css 不应再拥有公共 :root token 初始定义；owner 是 css/shared/theme-tokens.css');
}
if (fs.existsSync(cssOwnershipMapPath)) {
  const cssMap = JSON.parse(read(cssOwnershipMapPath));
  if (cssMap.version !== 'V37') error('tools/css-ownership-map.json version 必须是 V37');
  const cssMapText = read(cssOwnershipMapPath);
  for (const cssPath of ['css/shared/theme-tokens.css', 'css/base.css', 'css/chat.css', 'css/settings.css', 'css/modules/forum.css', 'css/modules/theater.css', 'contacts.css', 'more_menu.css']) {
    if (!cssMapText.includes(`"path": "${cssPath}"`)) error(`CSS ownership map 缺少 ${cssPath}`);
  }
}
if (fs.existsSync(cssOwnershipGatePath)) {
  const gateText = read(cssOwnershipGatePath);
  for (const token of ['OWO V37 CSS ownership gate', 'css/shared/theme-tokens.css', 'loadedCssMustHaveOwner', 'CSS ownership gate passed']) {
    if (!gateText.includes(token)) error(`tools/css-ownership-gate.js 缺少必要检查 token：${token}`);
  }
  if (/fetch\s*\(|saveData\s*\(|fetchAiResponse|processStream/.test(gateText)) {
    error('tools/css-ownership-gate.js 只能做静态 CSS 检查，不允许触发业务、保存或 AI 请求');
  }
}


// 38. V38 legacy globals deprecation gate：旧 window.* 兼容入口保留但 deprecated，新代码禁止继续调用旧全局
const legacyGlobalsGatePath = path.join(root, 'tools/legacy-globals-gate.js');
const legacyDeprecationPath = path.join(root, 'js/app/legacyDeprecation.js');
const legacyV38DocPath = path.join(root, 'docs/v38-legacy-globals-deprecation-plan.md');
for (const [file, label] of [
  [legacyGlobalsGatePath, 'V38 legacy globals gate'],
  [legacyDeprecationPath, 'V38 legacy deprecation registry'],
  [legacyV38DocPath, 'V38 legacy deprecation plan']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (indexText) {
  requireScriptBefore(indexText, 'js/app/namespace.js', 'js/app/legacyDeprecation.js', '保证 deprecation registry 依赖 namespace');
  requireScriptBefore(indexText, 'js/app/legacyDeprecation.js', 'js/utils.js', '保证 legacy expose 之前已能标记 deprecated');
}
if (fs.existsSync(legacyDeprecationPath)) {
  const legacyDeprecationText = read(legacyDeprecationPath);
  for (const token of ['getDeprecationReport', 'getDeprecatedGlobalNames', 'markDeprecated', 'V38', '旧 window.* 兼容入口']) {
    if (!legacyDeprecationText.includes(token)) error(`legacyDeprecation.js 缺少必要 token：${token}`);
  }
  if (/fetch\s*\(|saveData\s*\(|fetchAiResponse|processStream/.test(legacyDeprecationText)) {
    error('legacyDeprecation.js 只能登记 deprecation metadata，不允许业务、保存或 AI 请求');
  }
}
if (fs.existsSync(legacyGlobalsGatePath)) {
  const legacyGateText = read(legacyGlobalsGatePath);
  for (const token of ['OWO V38 legacy globals deprecation gate', 'getDeprecationReport', 'deprecated globals tracked', 'directLegacyPattern']) {
    if (!legacyGateText.includes(token)) error(`tools/legacy-globals-gate.js 缺少必要检查 token：${token}`);
  }
  if (/fetch\s*\(|saveData\s*\(/.test(legacyGateText)) {
    error('legacy-globals-gate.js 只能做静态检查，不允许业务或保存请求');
  }
}


// 39. V38.1 placeholder feature gate：移除用户可见的占位功能入口，防止再出现“开发中”按钮
const placeholderFeatureGatePath = path.join(root, 'tools/placeholder-feature-gate.js');
const placeholderFeatureDocPath = path.join(root, 'docs/v38-1-remove-placeholder-features.md');
for (const [file, label] of [
  [placeholderFeatureGatePath, 'V38.1 placeholder feature gate'],
  [placeholderFeatureDocPath, 'V38.1 placeholder feature cleanup plan']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}
if (fs.existsSync(placeholderFeatureGatePath)) {
  const placeholderGateText = read(placeholderFeatureGatePath);
  for (const token of ['OWO V38.1 placeholder feature gate', 'Placeholder feature gate passed', 'music-screen', 'biekan-app', 'xiaowu-app']) {
    if (!placeholderGateText.includes(token)) error(`tools/placeholder-feature-gate.js 缺少必要检查 token：${token}`);
  }
  if (/fetch\s*\(|saveData\s*\(|fetchAiResponse|processStream/.test(placeholderGateText)) {
    error('placeholder-feature-gate.js 只能做静态检查，不允许业务、保存或 AI 请求');
  }
}
if (indexText) {
  for (const marker of ['data-action="calendar"', 'data-action="small-account"', 'data-action="moments"', 'data-action="online"', 'data-action="biekan-app"', 'data-action="xiaowu-app"', 'data-target="music-screen"']) {
    if (indexText.includes(marker)) error(`index.html 不应再包含占位功能入口：${marker}`);
  }
}


if (hasError) {
  console.error('\n架构检查未通过。');
  process.exit(1);
}
console.log('\n✅ 架构检查通过，但请处理 warning 中的潜在全局覆盖。');
