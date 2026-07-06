#!/usr/bin/env node
/*
 * OWO V38.1 placeholder feature gate.
 * 只检查被移除的占位入口是否又被加回；不修改业务、不执行运行时逻辑。
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
let hasError = false;
function read(relPath) {
  const full = path.join(root, relPath);
  return fs.existsSync(full) ? fs.readFileSync(full, 'utf8') : '';
}
function exists(relPath) {
  return fs.existsSync(path.join(root, relPath));
}
function error(message) {
  hasError = true;
  console.error('❌ ' + message);
}

console.log('OWO V38.1 placeholder feature gate\n');

const indexHtml = read('index.html');
const uiJs = read('js/ui.js');
const mainJs = read('js/main.js');
const moreMenuJs = read('js/modules/more_menu.js');
const staticConfig = read('js/app/state/staticConfigBase.js');
const settingsJs = read('js/settings.js');
const appearanceSettingsJs = read('js/modules/appearance_settings.js');

const removedSelectors = [
  'data-action="calendar"',
  'data-action="small-account"',
  'data-action="moments"',
  'data-action="online"',
  'data-action="biekan-app"',
  'data-action="xiaowu-app"',
  'data-target="music-screen"'
];
for (const selector of removedSelectors) {
  if (indexHtml.includes(selector)) error(`index.html 仍存在占位功能入口：${selector}`);
  if (uiJs.includes(selector)) error(`js/ui.js 仍存在占位功能入口：${selector}`);
}

const devToastPatterns = [
  /功能开发中/,
  /正在开发中/,
  /该应用正在开发中/,
  /敬请期待/
];
for (const [relPath, content] of [
  ['index.html', indexHtml],
  ['js/ui.js', uiJs],
  ['js/main.js', mainJs],
  ['js/modules/more_menu.js', moreMenuJs],
  ['js/modules/appearance_settings.js', appearanceSettingsJs]
]) {
  for (const pattern of devToastPatterns) {
    if (pattern.test(content)) error(`${relPath} 仍存在用户可见的占位提示：${pattern}`);
  }
}

for (const key of ['music-screen', 'diary-screen', 'biekan-app', 'xiaowu-app']) {
  if (staticConfig.includes(`'${key}'`)) error(`defaultIcons 仍登记占位入口：${key}`);
  if (settingsJs.includes(`'${key}'`)) error(`自定义图标列表仍包含占位入口：${key}`);
}

for (const relPath of ['js/modules/music_player.js', 'css/modules/music_player.css']) {
  if (exists(relPath)) error(`未加载的占位音乐功能文件仍存在：${relPath}`);
}

if (hasError) {
  console.error('\nPlaceholder feature gate failed.');
  process.exit(1);
}
console.log('✅ Placeholder feature gate passed');
