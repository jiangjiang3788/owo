#!/usr/bin/env node
// V33 feature integration gate: public facade + cross-feature private reference cleanup.
const fs = require('fs');
const path = require('path');

const root = process.cwd();
let hasError = false;
function read(rel) {
  const p = path.join(root, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
}
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function error(msg) { hasError = true; console.error('❌ ' + msg); }
function requireContains(rel, marker) {
  const text = read(rel);
  if (!text.includes(marker)) error(`${rel} 缺少标记：${marker}`);
}

const publicFacades = [
  'js/features/forum/public.js',
  'js/features/theater/public.js',
  'js/features/peek/public.js',
  'js/features/videoCall/public.js',
  'js/features/wallet/public.js',
  'js/features/debugConsole/public.js',
  'js/features/cloudBackup/public.js',
  'js/features/quickDock/public.js',
  'js/features/dataManagement/public.js',
  'js/features/promptCenter/public.js'
];
for (const rel of publicFacades) {
  if (!exists(rel)) error(`缺少 public facade：${rel}`);
  requireContains(rel, 'getRoutingReport');
  requireContains(rel, 'getPublicContract');
}
if (!exists('js/app/featureIntegrationRegistry.js')) error('缺少 V33 feature integration registry');
requireContains('js/app/featureIntegrationRegistry.js', 'getIntegrationReport');
requireContains('js/app/featureIntegrationRegistry.js', 'assertReady');

const chatRender = read('js/modules/chat_render.js');
if (/OwoApp\.features\.wallet\.paymentCardViewModel/.test(chatRender)) {
  error('chat_render.js 不应直接访问 OwoApp.features.wallet.paymentCardViewModel；请走 wallet publicApi');
}
if (/OwoApp\.core\.wallet\.paymentSemantics/.test(chatRender)) {
  error('chat_render.js 不应直接访问 OwoApp.core.wallet.paymentSemantics；请走 wallet publicApi');
}
if (/db\.theaterScenarios|db\.theaterHtmlScenarios/.test(chatRender)) {
  error('chat_render.js 不应直接读取 theater 私有状态；请走 theater publicApi');
}
requireContains('js/modules/chat_render.js', 'theaterPublicApi.createScenarioShareViewModel');
requireContains('js/modules/chat_render.js', 'theaterPublicApi.openScenarioFromChat');
requireContains('js/modules/chat_render.js', 'walletPublicApi.paymentSemantics');

const shop = read('js/modules/shop.js');
if (/OwoApp\.core\.wallet\.paymentSemantics/.test(shop)) {
  error('shop.js 不应直接访问 OwoApp.core.wallet.paymentSemantics；请走 wallet publicApi');
}
requireContains('js/modules/shop.js', 'shopWalletPublicApi.paymentSemantics');

const constants = read('js/app/state/constants.js');
const defaults = read('js/app/state/globalSettingsDefaults.js');
const hapticAdapter = read('js/platform/browser/hapticAdapter.js');
const utils = read('js/utils.js');
if (!constants.includes("'hapticEnabled'")) error('globalSettingKeys 必须包含 hapticEnabled，确保关闭后可持久化');
if (!defaults.includes('hapticEnabled: true')) error('globalSettingsDefaults 必须包含 hapticEnabled: true');
if (!hapticAdapter.includes('isHapticEnabled')) error('hapticAdapter 必须提供 isHapticEnabled');
if (!utils.includes('isHapticEnabled')) error('utils.js 的 triggerHapticFeedback 应通过 hapticAdapter.isHapticEnabled 判断开关');

const index = read('index.html');
function pos(script) { return index.indexOf(`src="${script}"`); }
function requireBefore(a, b) {
  const pa = pos(a), pb = pos(b);
  if (pa === -1) error(`index.html 未加载 ${a}`);
  if (pb === -1) error(`index.html 未加载 ${b}`);
  if (pa !== -1 && pb !== -1 && pa > pb) error(`${a} 必须在 ${b} 之前加载`);
}
requireBefore('js/features/theater/public.js', 'js/modules/chat_render.js');
requireBefore('js/features/wallet/public.js', 'js/modules/chat_render.js');
requireBefore('js/app/featureIntegrationRegistry.js', 'js/main.js');
requireBefore('js/features/settings/apiSettings/public.js', 'js/features/quickDock/service.js');
requireBefore('js/features/cloudBackup/public.js', 'js/features/quickDock/service.js');
requireBefore('js/features/debugConsole/public.js', 'js/features/quickDock/service.js');
requireBefore('js/features/quickDock/model.js', 'js/features/quickDock/service.js');
requireBefore('js/features/quickDock/service.js', 'js/features/quickDock/view.js');
requireBefore('js/features/quickDock/view.js', 'js/features/quickDock/public.js');
requireBefore('js/platform/ai/requestTraceStore.js', 'js/platform/observability/traceStore.js');
requireBefore('js/platform/observability/traceStore.js', 'js/platform/observability/operationTraceService.js');
requireBefore('js/platform/observability/operationTraceService.js', 'js/features/debugConsole/service.js');
requireBefore('js/platform/observability/traceStore.js', 'js/platform/observability/operationTraceService.js');
requireBefore('js/platform/observability/operationTraceService.js', 'js/features/settings/apiSettings/apiModelSwitchService.js');
requireBefore('js/platform/observability/operationTraceService.js', 'js/features/cloudBackup/service.js');
requireBefore('js/platform/observability/operationTraceService.js', 'js/features/dataManagement/service.js');
requireContains('js/platform/observability/operationTraceService.js', 'recordOperation');
requireBefore('js/features/debugConsole/public.js', 'js/features/dataManagement/service.js');
requireBefore('js/features/debugConsole/public.js', 'js/features/quickDock/service.js');
requireBefore('js/features/dataManagement/storagePanel.js', 'js/features/dataManagement/service.js');
requireBefore('js/features/dataManagement/service.js', 'js/features/dataManagement/view.js');
requireBefore('js/features/dataManagement/view.js', 'js/features/dataManagement/public.js');
requireContains('js/features/debugConsole/view.js', 'renderEmbedded');
requireContains('js/features/debugConsole/public.js', 'renderEmbeddedConsole');
requireContains('js/features/dataManagement/public.js', 'openConsole');
requireContains('js/features/quickDock/public.js', 'openRequestPanel');
requireContains('js/features/dataManagement/service.js', 'noSecondaryNavigation');
requireContains('js/features/dataManagement/service.js', 'singleConsoleRenderer');
requireContains('js/features/dataManagement/service.js', 'quickDockOnlyConsole');
requireContains('js/features/dataManagement/service.js', 'recordControlAction');
requireContains('js/features/dataManagement/view.js', 'data-management-tutorial-content-area');
if (/DOMContentLoaded[^\n]+mount/.test(read('js/features/debugConsole/view.js')) || /request-console-entry/.test(read('js/features/debugConsole/view.js'))) {
  error('debugConsole/view.js 不应自动挂载独立控制台按钮；控制台只能被 dataManagement / quickDock 宿主复用。');
}

const quickDockView = read('js/features/quickDock/view.js');
if (/state\.activePanel === ['"]requests['"]|renderRequestPanel|quick-dock-panel--request/.test(quickDockView)) {
  error('quickDock/view.js 不应再渲染旧 requests 面板；如需控制台必须使用 console 面板并复用统一 renderer。');
}
requireContains('js/features/quickDock/view.js', 'quick-dock-console-mount');
requireContains('js/features/quickDock/service.js', 'renderConsole');
const quickDockService = read('js/features/quickDock/service.js');
if (/GitHubMgr|tutorial\.js/.test(quickDockService)) {
  error('quickDock/service.js 不应直接调用 GitHubMgr 或教程页旧对象；请走 cloudBackup publicApi');
}
if (/document\.getElementById\(['"]api-|querySelector\(['"]#api-/.test(quickDockService)) {
  error('quickDock/service.js 不应直接读取 API 设置页 DOM；请走 apiSettings publicApi');
}
if (/activePanel === ['"]requests['"]|renderRequestPanel/.test(read('js/features/quickDock/view.js'))) {
  error('quickDock/view.js 不应再承载旧 requests 面板；控制台需通过统一 renderer 渲染。');
}
requireContains('js/features/quickDock/service.js', 'OwoApp.features.settings.apiSettings.publicApi');
requireContains('js/features/quickDock/service.js', 'OwoApp.features.cloudBackup.publicApi');
requireContains('js/features/quickDock/service.js', 'OwoApp.features.debugConsole.publicApi');


const homeCatalog = read('js/features/home/homeAppCatalog.js');
if (!/const dockApps = Object\.freeze\(\[\s*Object\.freeze\(\{ target: 'api-settings-screen'/.test(homeCatalog)) {
  error('homeAppCatalog 的 Dock 栏第一个入口必须是 api-settings-screen');
}
for (const dockOnlyHomeEntry of ['data-management-screen', 'magic-room-screen', 'appearance-settings-screen']) {
  const primaryBlock = homeCatalog.split('const dockApps')[0] || '';
  if (primaryBlock.includes(`target: '${dockOnlyHomeEntry}'`)) error(`${dockOnlyHomeEntry} 不应放在首页第一页，只保留 Dock 入口`);
}
for (const dockOnlyHomeEntry of ['data-management-screen', 'magic-room-screen', 'appearance-settings-screen']) {
  if (/const primaryApps[\s\S]*?const secondaryApps/.test(homeCatalog) && homeCatalog.match(/const primaryApps[\s\S]*?const secondaryApps/)[0].includes(`target: '${dockOnlyHomeEntry}'`)) {
    error(`${dockOnlyHomeEntry} 只能在 Dock 栏出现，不应放在首页第一页`);
  }
}
for (const legacyHomeEntry of ['wallpaper-screen', 'customize-screen', 'storage-analysis-screen', 'tutorial-screen', 'day-mode-btn', 'night-mode-btn']) {
  if (homeCatalog.includes(`target: '${legacyHomeEntry}'`) || homeCatalog.includes(`id: '${legacyHomeEntry}'`)) {
    error(`旧入口 ${legacyHomeEntry} 不应再作为 Home/Dock 独立 app 出现`);
  }
}
requireContains('js/platform/observability/traceStore.js', 'withOperation');
requireContains('js/platform/observability/traceStore.js', 'recordOperationSuccess');
requireContains('js/platform/observability/operationTraceService.js', 'sanitizeData');
requireContains('js/platform/observability/operationTraceService.js', 'recordOperation');
requireBefore('js/platform/observability/traceStore.js', 'js/platform/observability/operationTraceService.js');
requireBefore('js/platform/observability/operationTraceService.js', 'js/features/debugConsole/service.js');
const traceStore = read('js/platform/ai/requestTraceStore.js');
requireContains('js/platform/ai/requestTraceStore.js', 'recordConversationEvent');
requireContains('js/platform/ai/requestTraceStore.js', 'recordOperation');
requireContains('js/platform/observability/traceStore.js', 'function recordOperation');
requireContains('js/modules/chat_render.js', 'recordChatMessageConsoleTrace');
const dataManagementService = read('js/features/dataManagement/service.js');
if (/openStorageAnalysis|openTutorial|switchScreen\(['"](?:storage-analysis-screen|tutorial-screen)/.test(dataManagementService)) {
  error('dataManagement/service.js 不应二次跳转到旧 storage/tutorial 页面，必须直接嵌入旧内容');
}
requireContains('js/features/dataManagement/service.js', 'features/quickDock.publicApi.openConsolePanel');
requireContains('js/features/dataManagement/service.js', 'singleConsoleHost');
requireContains('js/features/dataManagement/service.js', 'renderTutorialContent');
requireContains('js/features/dataManagement/service.js', 'renderStorageAnalysis');
requireContains('js/features/dataManagement/service.js', 'recordControlAction');
requireContains('js/features/dataManagement/public.js', 'recordOperation');
requireContains('js/features/dataManagement/view.js', 'data-management-tutorial-content-area');
requireContains('js/features/dataManagement/view.js', 'data-dm-action="open-console"');
requireContains('js/features/dataManagement/view.js', 'data-management-storage-mount');
if (/dm-console-mount--inline|request-console-host|renderConsoleInline/.test(read('js/features/dataManagement/view.js'))) {
  error('dataManagement/view.js 不应再内嵌控制台 renderer；只能保留打开悬浮球控制台的入口。');
}
const observabilityTraceStore = read('js/platform/observability/traceStore.js');
if (/recordOperation:\s*recordAppEvent/.test(observabilityTraceStore)) {
  error('traceStore.recordOperation 不应再映射到 recordAppEvent；操作记录必须是 operation 分类。');
}
requireContains('js/features/settings/apiSettings/apiModelSwitchService.js', 'recordApiOperation');
requireContains('js/features/cloudBackup/service.js', 'recordCloudOperation');
requireContains('js/platform/storage/backupAdapter.js', 'recordStorageOperation');
requireContains('js/modules/memory_table.js', 'recordMemoryTableOperation');
requireContains('js/modules/avatar_recognition.js', 'recordAvatarOperation');
requireContains('js/modules/sticker.js', 'recordStickerOperation');
requireContains('js/features/dataManagement/storagePanel.js', '存储分析刷新');

if (hasError) process.exit(1);
console.log('✅ V33 feature integration gate passed');
