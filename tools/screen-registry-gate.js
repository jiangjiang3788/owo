#!/usr/bin/env node
/* V34/V35/V36 screen registry gate: static checks only, no DOM split / no browser execution. */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
let hasError = false;

function read(relPath) {
  const full = path.join(root, relPath);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}
function error(message) {
  hasError = true;
  console.error('❌ ' + message);
}
function requireFile(relPath) {
  if (!fs.existsSync(path.join(root, relPath))) error('缺少文件：' + relPath);
}
function posInIndex(indexText, script) {
  return indexText.indexOf(`src="${script}"`);
}
function requireBefore(indexText, before, after) {
  const bp = posInIndex(indexText, before);
  const ap = posInIndex(indexText, after);
  if (bp === -1) error('index.html 未加载：' + before);
  if (ap === -1) error('index.html 未加载：' + after);
  if (bp !== -1 && ap !== -1 && bp > ap) error(`${before} 必须在 ${after} 之前加载`);
}

console.log('OWO V34/V35/V36 screen registry gate\n');

requireFile('js/app/screenManifest.js');
requireFile('js/app/screenRegistry.js');

const indexText = read('index.html');
const manifestText = read('js/app/screenManifest.js');
const registryText = read('js/app/screenRegistry.js');
const uiText = read('js/ui.js');
const mainText = read('js/main.js');
const namespaceText = read('js/app/namespace.js');

requireBefore(indexText, 'js/app/screenManifest.js', 'js/app/screenRegistry.js');
requireBefore(indexText, 'js/app/screenRegistry.js', 'js/ui.js');
requireBefore(indexText, 'js/app/screenRegistry.js', 'js/main.js');

if (!namespaceText.includes('app.app.screenManifest') || !namespaceText.includes('app.app.screenRegistry')) {
  error('namespace.js 必须预留 app.app.screenManifest 和 app.app.screenRegistry');
}

const htmlScreenIds = Array.from(indexText.matchAll(/<[^>]*\bclass=["'][^"']*\bscreen\b[^"']*["'][^>]*\bid=["']([^"']+)["']/g)).map(m => m[1])
  .concat(Array.from(indexText.matchAll(/<[^>]*\bid=["']([^"']+)["'][^>]*\bclass=["'][^"']*\bscreen\b[^"']*["']/g)).map(m => m[1]));
const uniqueHtmlScreenIds = [...new Set(htmlScreenIds)];
const manifestIds = [...new Set(Array.from(manifestText.matchAll(/id:\s*'([^']+-screen)'/g)).map(m => m[1]))];

if (uniqueHtmlScreenIds.length !== 69) error(`index.html screen 数量应为 69，当前为 ${uniqueHtmlScreenIds.length}`);
if (manifestIds.length !== uniqueHtmlScreenIds.length) error(`screenManifest 登记数量 ${manifestIds.length} 与 DOM screen 数量 ${uniqueHtmlScreenIds.length} 不一致`);

for (const id of uniqueHtmlScreenIds) {
  if (!manifestIds.includes(id)) error(`screenManifest 缺少 DOM screen：${id}`);
}
for (const id of manifestIds) {
  if (!uniqueHtmlScreenIds.includes(id)) error(`screenManifest 登记了 DOM 不存在的 screen：${id}`);
}

for (const required of [
  'registerScreen',
  'registerManifest',
  'initScreen',
  'mountScreen',
  'unmountScreen',
  'transitionTo',
  'getRoutingReport',
  'assertDomScreens',
  'markLegacyInitComplete'
]) {
  if (!registryText.includes(required)) error(`screenRegistry.js 必须提供 ${required}`);
}

if (!uiText.includes('screenRegistry.transitionTo')) error('ui.js 的 switchScreen 必须调用 screenRegistry.transitionTo() 触发 mount/unmount 生命周期');
if (!mainText.includes('screenRegistry.assertDomScreens')) error('main.js 启动时必须调用 screenRegistry.assertDomScreens({ warnOnly: true })');
if (!mainText.includes('screenRegistry.markLegacyInitComplete')) error('main.js 必须标记 legacy 初始化完成，便于 registry report 验收');

if (/classList\.(add|remove)\([^\n]*active/.test(registryText)) {
  error('screenRegistry.js 不允许切换 .screen.active；V34 只登记生命周期，不接管 DOM 切换');
}
if (/innerHTML|createElement|appendChild|fetch\s*\(|saveData\s*\(/.test(registryText)) {
  error('screenRegistry.js 不允许写 DOM 业务、fetch 或保存；只能做 registry / lifecycle routing');
}

if (hasError) {
  console.error('\nScreen registry gate failed.');
  process.exit(1);
}
console.log('✅ Screen registry gate passed');
