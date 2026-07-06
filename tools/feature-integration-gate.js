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
  'js/features/wallet/public.js'
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

if (hasError) process.exit(1);
console.log('✅ V33 feature integration gate passed');
