#!/usr/bin/env node
/* V35/V36 screen template gate: static templates only; no business / AI / storage logic. */
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
function requireContains(text, marker, label) {
  if (!text.includes(marker)) error(`${label} 缺少标记：${marker}`);
}

console.log('OWO V35/V36 screen template gate\n');

const templates = [
  { id: 'archive-screen', file: 'js/features/archive/archiveScreenTemplate.js', required: ['archive-list-container', 'create-archive-btn', 'archive-multi-select-btn'] },
  { id: 'favorites-screen', file: 'js/features/favorites/favoritesScreenTemplate.js', required: ['favorites-list-container', 'favorites-empty-placeholder', 'favorites-delete-btn'] },
  { id: 'storage-analysis-screen', file: 'js/platform/storage/storageAnalysisScreenTemplate.js', required: ['storage-chart-container', 'storage-details-list', 'compress-all-images-btn'] },
  { id: 'chat-room-screen', file: 'js/features/chat/chatRoomScreenTemplate.js', required: ['chat-room-header-default', 'message-input-default', 'message-area'] },
  { id: 'api-settings-screen', file: 'js/features/settings/settingsScreenTemplates.js', required: ['api-form', 'api-provider', 'api-presets-modal'] },
  { id: 'chat-settings-screen', file: 'js/features/settings/settingsScreenTemplates.js', required: ['setting-char-avatar-preview', 'setting-char-persona', 'save-preset-btn'] },
  { id: 'forum-screen', file: 'js/features/forum/forumScreenTemplates.js', required: ['forum-search-input', 'forum-posts-container', 'forum-refresh-btn'] },
  { id: 'forum-post-detail-screen', file: 'js/features/forum/forumScreenTemplates.js', required: ['forum-post-detail-screen'] },
  { id: 'forum-profile-screen', file: 'js/features/forum/forumScreenTemplates.js', required: ['save-forum-profile-btn', 'forum-username-input'] },
  { id: 'forum-alt-accounts-screen', file: 'js/features/forum/forumScreenTemplates.js', required: ['forum-create-alt-btn', 'forum-alt-accounts-list'] },
  { id: 'forum-settings-screen', file: 'js/features/forum/forumScreenTemplates.js', required: ['forum-api-config-section', 'save-forum-settings-btn'] },
  { id: 'forum-dm-list-screen', file: 'js/features/forum/forumScreenTemplates.js', required: ['forum-dm-list-container', 'forum-dm-list-refresh-btn'] },
  { id: 'forum-dm-conversation-screen', file: 'js/features/forum/forumScreenTemplates.js', required: ['forum-dm-message-area', 'send-forum-dm-btn'] }
];

const templateFiles = [...new Set(templates.map(item => item.file))];
requireFile('js/app/screenTemplateRegistry.js');
for (const file of templateFiles) requireFile(file);

const indexText = read('index.html');
const registryText = read('js/app/screenTemplateRegistry.js');
const manifestText = read('js/app/screenManifest.js');
const mainText = read('js/main.js');
const namespaceText = read('js/app/namespace.js');

for (const file of templateFiles) {
  requireBefore(indexText, 'js/app/screenTemplateRegistry.js', file);
  requireBefore(indexText, file, 'js/ui.js');
}
requireBefore(indexText, 'js/app/screenTemplateRegistry.js', 'js/main.js');

requireContains(namespaceText, 'app.app.screenTemplates', 'namespace.js');
for (const required of ['registerTemplate', 'hydrateTemplate', 'hydrateAll', 'getRoutingReport', 'assertHydrated']) {
  requireContains(registryText, required, 'screenTemplateRegistry.js');
}
requireContains(mainText, 'screenTemplates.assertHydrated', 'main.js');

for (const item of templates) {
  const placeholderRe = new RegExp(`<div[^>]+id=["']${item.id}["'][^>]+data-screen-template=["']${item.id}["']`, 'm');
  if (!placeholderRe.test(indexText)) error(`index.html 必须保留 ${item.id} placeholder 且带 data-screen-template`);
  const fileText = read(item.file);
  requireContains(fileText, `registerTemplate('${item.id}'`, item.file);
  for (const marker of item.required) requireContains(fileText, marker, item.file);
  if (!manifestText.includes(`template: '${item.file}'`)) error(`screenManifest.js 必须为 ${item.id} 标记 template: '${item.file}'`);
}

for (const forbidden of [
  /fetch\s*\(/,
  /saveData\s*\(/,
  /processStream/,
  /fetchAiResponse/,
  /classList\.(add|remove)\([^\n]*active/
]) {
  if (forbidden.test(registryText)) error('screenTemplateRegistry.js 不允许业务逻辑、AI、保存或 screen active 切换；只能 hydrate 静态模板');
}

for (const file of templateFiles) {
  const text = read(file);
  if (/fetch\s*\(|saveData\s*\(|processStream|fetchAiResponse|addEventListener\s*\(/.test(text)) {
    error(`${file} 只能保存静态 HTML 模板，不允许业务逻辑、AI、保存或事件绑定`);
  }
}

if (hasError) {
  console.error('\nScreen template gate failed.');
  process.exit(1);
}
console.log('✅ Screen template gate passed');
