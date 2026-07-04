#!/usr/bin/env node
/*
 * OWO V1/V2/V3/V4 architecture check.
 * 用法：node tools/arch-check.js
 * 只依赖 Node 内置模块，适合当前无 package.json 的项目。
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const MAX_SOFT_LINES = 300;
const MAX_HARD_LINES = 380;

const ignoreDirs = new Set(['.git', 'node_modules']);
const jsFiles = [];

function walk(dir) {
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

console.log('OWO V1/V2/V3/V4 architecture check\n');

// 1. 行数 gate
for (const file of jsFiles) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
  const r = rel(file);
  const isNewStructure = /^js\/(app|core|features|platform|shared|compat)\//.test(r);
  if (lines > MAX_HARD_LINES && isNewStructure) {
    error(`${r} ${lines} 行，超过 ${MAX_HARD_LINES}，新结构文件必须拆分`);
  } else if (lines > MAX_SOFT_LINES && isNewStructure) {
    warn(`${r} ${lines} 行，超过 ${MAX_SOFT_LINES}，需要解释或拆分`);
  } else if (lines > MAX_HARD_LINES && !r.startsWith('js/modules/')) {
    warn(`${r} ${lines} 行是 legacy 大文件，V1/V2/V3/V4 暂不阻断，但后续必须拆分`);
  }
}

// 2. core/shared 禁止词 gate
const forbiddenInCore = [/\bwindow\b/, /\bdocument\b/, /\bfetch\s*\(/, /\blocalStorage\b/, /\bDexie\b/, /\bdb\b/];
const businessWordsInShared = [/chat/i, /character/i, /memory/i, /worldbook/i, /forum/i, /wallet/i, /prompt/i];
for (const file of jsFiles) {
  const r = rel(file);
  const text = fs.readFileSync(file, 'utf8');
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
  if (r === 'js/app/namespace.js') continue;
  const text = fs.readFileSync(file, 'utf8');
  const matches = [...text.matchAll(legacyGlobalUse)].map(m => m[0]);
  if (matches.length) {
    error(`${r} 新结构文件直接引用旧全局 API：${[...new Set(matches)].join(', ')}`);
  }
}

// 4. window 赋值索引，用于发现可能的全局覆盖
const assigns = new Map();
const assignRe = /window\.([A-Za-z_$][\w$]*)\s*=\s*(?![=>])/g;
for (const file of jsFiles) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
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
const indexText = fs.existsSync(indexPath) ? fs.readFileSync(indexPath, 'utf8') : '';
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
  const legacyText = fs.readFileSync(legacyPath, 'utf8');
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
    const ownerScript = `src="${item.ownerFile}"`;
    const legacyScript = `src="${item.legacyFile}"`;
    const ownerPos = indexText.indexOf(ownerScript);
    const legacyPos = indexText.indexOf(legacyScript);
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
const repositoryScript = 'src="js/platform/storage/repository.js"';
const dbScript = 'src="js/db.js"';
if (indexText) {
  const repositoryPos = indexText.indexOf(repositoryScript);
  const dbPos = indexText.indexOf(dbScript);
  if (repositoryPos === -1) error('index.html 未加载 V3 storage repository：js/platform/storage/repository.js');
  if (dbPos !== -1 && repositoryPos !== -1 && repositoryPos > dbPos) {
    error('js/platform/storage/repository.js 必须在 js/db.js 之前加载，避免 db.js 无法注册 writer');
  }
}
if (fs.existsSync(dbPath)) {
  const dbText = fs.readFileSync(dbPath, 'utf8');
  const registerCount = (dbText.match(/setLegacyWriters\s*\(/g) || []).length;
  if (registerCount !== 1) {
    error(`js/db.js 必须且只能调用一次 setLegacyWriters，目前为 ${registerCount} 次`);
  }
  for (const name of ['saveData', 'saveCharacter', 'saveGroup', 'saveGlobalSettings']) {
    if (new RegExp('window\\.' + name + '\\s*=').test(dbText)) {
      error(`js/db.js 不允许直接 window.${name} = ...；必须通过 OwoApp.compat.expose`);
    }
  }
}
if (fs.existsSync(mainPath)) {
  const mainText = fs.readFileSync(mainPath, 'utf8');
  if (/window\.saveData\s*=/.test(mainText) || /_origSaveData/.test(mainText)) {
    error('js/main.js 不允许再包装 window.saveData；保存状态必须由 storage repository 追踪');
  }
}



// 7. V4 state defaults gate：默认状态 owner 必须先于 db.js 加载，db.js 不再保留第二套默认值实现
const stateScripts = [
  'js/app/state/constants.js',
  'js/app/state/initialState.js',
  'js/app/state/globalSettingsDefaults.js'
];
if (indexText) {
  const dbPos = indexText.indexOf('src="js/db.js"');
  for (const script of stateScripts) {
    const pos = indexText.indexOf(`src="${script}"`);
    if (pos === -1) error(`index.html 未加载 V4 state owner：${script}`);
    if (dbPos !== -1 && pos !== -1 && pos > dbPos) {
      error(`${script} 必须在 js/db.js 之前加载，避免 db.js 创建第二套默认状态`);
    }
  }
}
if (fs.existsSync(dbPath)) {
  const dbText = fs.readFileSync(dbPath, 'utf8');
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
  if (!dbText.includes('createInitialDbState()')) {
    error('js/db.js 应通过 OwoApp.app.state.initialState.createInitialDbState() 创建初始 db');
  }
  if (!dbText.includes('createDefaultGlobalSettings()')) {
    error('js/db.js 应通过 OwoApp.app.state.globalSettingsDefaults.createDefaultGlobalSettings() 读取全局设置默认值');
  }
}

// 8. V4 Netlify deploy gate：Netlify 只做静态复制和架构 gate，不引入第二套构建产物语义
const netlifyTomlPath = path.join(root, 'netlify.toml');
const netlifyBuildPath = path.join(root, 'tools', 'netlify-build.js');
const redirectsPath = path.join(root, '_redirects');
if (!fs.existsSync(netlifyTomlPath)) error('缺少 netlify.toml，无法用文件配置方式发布到 Netlify');
else {
  const netlifyToml = fs.readFileSync(netlifyTomlPath, 'utf8');
  if (!/publish\s*=\s*"dist"/.test(netlifyToml)) error('netlify.toml 应设置 publish = "dist"，避免把 docs/tools 一起发布');
  if (!/tools\/arch-check\.js/.test(netlifyToml)) error('netlify.toml build command 应先运行 tools/arch-check.js');
  if (!/tools\/netlify-build\.js/.test(netlifyToml)) error('netlify.toml build command 应运行 tools/netlify-build.js 生成 dist');
}
if (!fs.existsSync(netlifyBuildPath)) error('缺少 tools/netlify-build.js，Netlify 无法生成 dist');
if (!fs.existsSync(redirectsPath)) warn('缺少 _redirects；SPA 深链刷新可能不能回退到 index.html');

if (hasError) {
  console.error('\n架构检查未通过。');
  process.exit(1);
}
console.log('\n✅ 架构检查通过，但请处理 warning 中的潜在全局覆盖。');
