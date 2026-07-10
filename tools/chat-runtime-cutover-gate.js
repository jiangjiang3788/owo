#!/usr/bin/env node
/* OWO v0.9.2 private-chat runtime cutover gate. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = process.cwd();
let failed = false;
function read(rel) { return fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : ''; }
function fail(message) { failed = true; console.error('❌ ' + message); }
function pass(message) { console.log('✅ ' + message); }
function requireFile(rel) { fs.existsSync(path.join(root, rel)) ? pass(`存在：${rel}`) : fail(`缺少：${rel}`); }
function requireBefore(a, b) {
  const index = read('index.html');
  const pa = index.indexOf(`src="${a}"`), pb = index.indexOf(`src="${b}"`);
  if (pa === -1) fail(`index.html 未加载：${a}`);
  if (pb === -1) fail(`index.html 未加载：${b}`);
  if (pa !== -1 && pb !== -1 && pa > pb) fail(`${a} 必须在 ${b} 前加载`);
}

console.log('OWO v0.9.2 private chat runtime cutover gate\n');
[
  'js/core/ai/cutoverSemantics.js',
  'js/core/chat/runtimeModeSemantics.js',
  'js/core/chat/preparedRequestSemantics.js',
  'js/features/chatRuntime/service.js',
  'js/features/chatRuntime/public.js',
  'docs/architecture/decisions/ADR-001-single-chat-builder.md',
  'docs/architecture/decisions/ADR-002-chat-runtime-cutover.md'
].forEach(requireFile);
requireBefore('js/core/ai/cutoverSemantics.js', 'js/core/chat/runtimeModeSemantics.js');
requireBefore('js/core/chat/runtimeModeSemantics.js', 'js/features/chatRuntime/service.js');
requireBefore('js/core/chat/preparedRequestSemantics.js', 'js/features/chatRuntime/service.js');
requireBefore('js/features/aiRuntime/public.js', 'js/features/chatRuntime/service.js');
requireBefore('js/features/chatRuntime/public.js', 'js/modules/chat_ai.js');

const chatText = read('js/modules/chat_ai.js');
if (!chatText.includes('chatAiConversationRuntime.executePreparedRequest')) fail('chat_ai 私聊请求尚未接入 Chat Runtime');
if (!chatText.includes("requestBuiltBy: 'chat_ai.single-builder'")) fail('chat_ai 缺少单一 builder 诊断标记');
if ((chatText.match(/systemPrompt\s*=\s*generatePrivateSystemPrompt\(chat, \{ isPhoneControlRevokeAttempt, weatherText \}\)/g) || []).length !== 1) fail('主私聊请求必须只有一个 canonical Prompt 构建调用点');
for (const forbidden of ['generateUnifiedPrivateSystemPrompt', 'buildUnifiedPrivatePrompt', 'buildShadowPrivatePrompt']) {
  if (chatText.includes(forbidden)) fail(`禁止出现第二套 Prompt builder：${forbidden}`);
}

const app = {
  core: { ai: {}, chat: {} },
  features: { aiRuntime: { publicApi: {} }, chatRuntime: {} },
  platform: { ai: { requestTraceStore: { recordDiagnostic() {} } } }
};
const calls = { legacy: 0, preflight: 0, unified: 0 };
const response = { ok: true, marker: 'same-response' };
app.features.aiRuntime.publicApi = {
  async executeProviderRequest(request) { calls.legacy += 1; return response; },
  async preflightPreparedTask(request) { calls.preflight += 1; return { ok: true, taskType: request.taskType }; },
  async executePreparedTask(request) { calls.unified += 1; return response; }
};
const context = { OwoApp: app, console, setTimeout, clearTimeout, db: {} };
context.window = context;
vm.createContext(context);
for (const rel of [
  'js/core/ai/cutoverSemantics.js',
  'js/core/chat/runtimeModeSemantics.js',
  'js/core/chat/preparedRequestSemantics.js',
  'js/features/chatRuntime/service.js',
  'js/features/chatRuntime/public.js'
]) vm.runInContext(read(rel), context, { filename: rel });

const base = {
  taskType: 'conversation.reply',
  schemaVersion: 1,
  providerRequest: { endpoint: 'https://example.invalid/v1/chat/completions', fetchOptions: { method: 'POST' }, requestBody: { messages: [{ role: 'user', content: 'hi' }] } },
  requestBody: { messages: [{ role: 'user', content: 'hi' }] },
  settings: { provider: 'openai', model: 'test' },
  provider: 'openai', model: 'test', chatType: 'private'
};

(async () => {
  let result = await app.features.chatRuntime.publicApi.executePreparedRequest({ ...base, state: { chatRuntimeMode: 'legacy' } });
  if (result !== response || calls.legacy !== 1 || calls.preflight !== 0 || calls.unified !== 0) fail('legacy 模式必须只执行一次 legacy executor');
  else pass('legacy 模式单次执行通过');

  calls.legacy = calls.preflight = calls.unified = 0;
  result = await app.features.chatRuntime.publicApi.executePreparedRequest({ ...base, state: { chatRuntimeMode: 'shadow' } });
  if (result !== response || calls.legacy !== 1 || calls.preflight !== 1 || calls.unified !== 0) fail('shadow 模式必须一次 preflight + 一次网络执行，不能双请求');
  else pass('shadow 模式无双请求通过');

  calls.legacy = calls.preflight = calls.unified = 0;
  result = await app.features.chatRuntime.publicApi.executePreparedRequest({ ...base, state: { chatRuntimeMode: 'unified' } });
  if (result !== response || calls.legacy !== 0 || calls.preflight !== 0 || calls.unified !== 1) fail('unified 模式必须只由统一 executor 执行一次');
  else pass('unified 模式单次执行通过');

  const signatureA = app.core.chat.preparedRequestSemantics.createSignature(base);
  const signatureB = app.core.chat.preparedRequestSemantics.createSignature({ ...base });
  if (signatureA !== signatureB) fail('相同 Prepared Request 的 signature 必须稳定');
  else pass('Prepared Request signature 稳定');

  if (failed) process.exit(1);
  console.log('\n✅ v0.9.2 chat runtime cutover gate passed');
})().catch(error => { console.error(error); process.exit(1); });
