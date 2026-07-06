#!/usr/bin/env node
// OWO V38 legacy globals deprecation gate
// 只做静态检查：旧 window.* 兼容入口可以保留，但新结构代码不能继续直接调用旧全局。
const fs = require('fs');
const path = require('path');

const root = process.cwd();
let hasError = false;
function rel(file) { return path.relative(root, file).replace(/\\/g, '/'); }
function read(file) { return fs.readFileSync(file, 'utf8'); }
function error(message) { console.error('❌ ' + message); hasError = true; }
function warn(message) { console.warn('⚠️ ' + message); }

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (entry.isFile() && entry.name.endsWith('.js')) files.push(full);
  }
  return files;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const ownershipPath = path.join(root, 'tools/ownership-map.json');
const namespacePath = path.join(root, 'js/app/namespace.js');
const deprecationPath = path.join(root, 'js/app/legacyDeprecation.js');
const docPath = path.join(root, 'docs/v38-legacy-globals-deprecation-plan.md');
const indexPath = path.join(root, 'index.html');

for (const [file, label] of [
  [ownershipPath, 'ownership-map'],
  [namespacePath, 'namespace.js'],
  [deprecationPath, 'legacyDeprecation.js'],
  [docPath, 'V38 deprecation plan'],
  [indexPath, 'index.html']
]) {
  if (!fs.existsSync(file)) error(`缺少 ${label}：${rel(file)}`);
}

const ownership = fs.existsSync(ownershipPath) ? JSON.parse(read(ownershipPath)) : { canonicalSymbols: [] };
const canonicalSymbols = Array.isArray(ownership.canonicalSymbols) ? ownership.canonicalSymbols : [];
const deprecated = canonicalSymbols
  .filter(item => item && typeof item.legacyAlias === 'string' && item.legacyAlias.startsWith('window.'))
  .map(item => item.symbol)
  .filter(Boolean);
const deprecatedSet = new Set(deprecated);

if (!deprecatedSet.has('saveData')) error('ownership-map.json 必须登记 saveData 旧全局 deprecated');
if (!deprecatedSet.has('showToast')) error('ownership-map.json 必须登记 showToast 旧全局 deprecated');
if (!deprecatedSet.has('normalizeMessagesForProvider')) error('ownership-map.json 必须登记 normalizeMessagesForProvider 旧全局 deprecated');

if (fs.existsSync(namespacePath)) {
  const namespaceText = read(namespacePath);
  for (const token of ['legacyDeprecation', 'deprecated:', 'markDeprecated', 'since: meta.since || \'V38\'']) {
    if (!namespaceText.includes(token)) error(`namespace.js 缺少 V38 compat deprecation token：${token}`);
  }
}

if (fs.existsSync(indexPath)) {
  const indexText = read(indexPath);
  const namespacePos = indexText.indexOf('js/app/namespace.js');
  const depPos = indexText.indexOf('js/app/legacyDeprecation.js');
  const utilsPos = indexText.indexOf('js/utils.js');
  if (depPos === -1) error('index.html 必须加载 js/app/legacyDeprecation.js');
  if (namespacePos !== -1 && depPos !== -1 && namespacePos > depPos) {
    error('legacyDeprecation.js 必须在 namespace.js 之后加载');
  }
  if (depPos !== -1 && utilsPos !== -1 && depPos > utilsPos) {
    error('legacyDeprecation.js 必须在 legacy compatibility 文件 utils.js 之前加载');
  }
}

if (fs.existsSync(deprecationPath)) {
  const depText = read(deprecationPath);
  for (const token of ['getDeprecationReport', 'getDeprecatedGlobalNames', 'markDeprecated', 'V38', '旧 window.* 兼容入口']) {
    if (!depText.includes(token)) error(`legacyDeprecation.js 缺少必要 token：${token}`);
  }
  for (const symbol of ['saveData', 'showToast', 'setupApiSettingsApp', 'normalizeMessagesForProvider']) {
    if (!depText.includes(`"name":"${symbol}"`) && !depText.includes(`"name": "${symbol}"`) && !depText.includes(`name: '${symbol}'`)) {
      error(`legacyDeprecation.js 必须登记 deprecated legacy global：${symbol}`);
    }
  }
  if (/fetch\s*\(|saveData\s*\(|fetchAiResponse|processStream/.test(depText)) {
    error('legacyDeprecation.js 只能登记 deprecation metadata，不允许业务、保存或 AI 请求');
  }
}

// 新结构代码不应继续通过 global/window 调用已经 canonical 的 legacy 全局。
const scannedRoots = ['js/app', 'js/core', 'js/features', 'js/platform'];
const allowFiles = new Set([
  'js/app/namespace.js',
  'js/app/legacyDeprecation.js'
]);
const symbols = Array.from(deprecatedSet).sort((a, b) => b.length - a.length).map(escapeRegExp);
const directLegacyPattern = symbols.length
  ? new RegExp(`\\b(?:window|global)\\.(${symbols.join('|')})\\b`, 'g')
  : null;
for (const dir of scannedRoots) {
  for (const file of walk(path.join(root, dir))) {
    const relative = rel(file);
    if (allowFiles.has(relative)) continue;
    const text = read(file);
    if (!directLegacyPattern) continue;
    let match;
    while ((match = directLegacyPattern.exec(text))) {
      error(`${relative} 直接引用 deprecated 旧全局 ${match[0]}；新结构代码必须走 canonical owner 或 module runtime bridge`);
    }
  }
}

// legacy 文件可以暴露旧 window API，但必须通过 OwoApp.compat.expose 或登记 deprecated。禁止新 direct assignment。
for (const legacyFile of ['js/utils.js', 'js/db.js', 'js/settings.js']) {
  const file = path.join(root, legacyFile);
  if (!fs.existsSync(file)) continue;
  const text = read(file);
  const forbidden = Array.from(deprecatedSet).filter(symbol => new RegExp(`window\\.${escapeRegExp(symbol)}\\s*=`).test(text));
  if (forbidden.length) {
    error(`${legacyFile} 仍有直接 window.xxx = 赋值：${forbidden.join(', ')}；必须通过 OwoApp.compat.expose 记录 deprecated owner`);
  }
}

if (hasError) {
  console.error('\nLegacy globals deprecation gate failed.');
  process.exit(1);
}

console.log(`✅ Legacy globals deprecation gate passed (${deprecatedSet.size} deprecated globals tracked).`);
if (deprecatedSet.size < 20) warn('deprecated globals 数量较少，请确认 ownership-map 是否完整。');
