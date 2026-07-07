#!/usr/bin/env node
/* AI Pipeline v0.3.9 gate: provider/task routing, sanitizer, response batch and console categories. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = process.cwd();
let hasError = false;
function read(rel) { return fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : ''; }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function error(msg) { hasError = true; console.error('❌ ' + msg); }
function ok(msg) { console.log('✅ ' + msg); }
function requireFile(rel) { exists(rel) ? ok(`存在：${rel}`) : error(`缺少文件：${rel}`); }
function requireContains(rel, token, why) { if (!read(rel).includes(token)) error(`${rel} 缺少标记：${why || token}`); }
function forbidContains(rel, token, why) { if (read(rel).includes(token)) error(`${rel} 不应包含 ${token}${why ? '：' + why : ''}`); }
function indexOfScript(script) { return read('index.html').indexOf(`src="${script}"`); }
function requireBefore(a, b) {
  const pa = indexOfScript(a), pb = indexOfScript(b);
  if (pa === -1) error(`index.html 未加载：${a}`);
  if (pb === -1) error(`index.html 未加载：${b}`);
  if (pa !== -1 && pb !== -1 && pa > pb) error(`${a} 必须在 ${b} 之前加载`);
}
console.log('OWO AI Pipeline gate · v0.3.9\n');
[
  'js/platform/ai/aiConfigStore.js',
  'js/platform/ai/modelRegistry.js',
  'js/platform/ai/messageSanitizer.js',
  'js/platform/ai/responseNormalizer.js',
  'js/platform/ai/aiRouter.js',
  'docs/0.3/release-v0.3.9-plan.md'
].forEach(requireFile);
[
  ['js/platform/ai/providerConfig.js', 'js/platform/ai/aiConfigStore.js'],
  ['js/platform/ai/aiConfigStore.js', 'js/platform/ai/modelRegistry.js'],
  ['js/platform/ai/modelRegistry.js', 'js/platform/ai/messageSanitizer.js'],
  ['js/platform/ai/messageSanitizer.js', 'js/platform/ai/responseNormalizer.js'],
  ['js/platform/ai/responseNormalizer.js', 'js/platform/ai/requestTraceStore.js'],
  ['js/platform/ai/providerRequestAdapter.js', 'js/platform/ai/aiRouter.js'],
  ['js/platform/ai/aiRouter.js', 'js/features/debugConsole/service.js'],
  ['js/platform/ai/messageSanitizer.js', 'js/modules/chat_ai.js'],
  ['js/platform/ai/responseNormalizer.js', 'js/modules/chat_ai.js']
].forEach(([a, b]) => requireBefore(a, b));
[
  ['js/platform/ai/aiConfigStore.js', 'TASK_ROUTE_FALLBACKS', 'task route fallback 必须集中定义'],
  ['js/platform/ai/aiConfigStore.js', 'legacy-compatible-router', '必须兼容旧 API 设置'],
  ['js/platform/ai/modelRegistry.js', 'memory-persona', '长期模型任务必须在 registry 中'],
  ['js/platform/ai/messageSanitizer.js', 'unknown-assistant', 'unknown 回复必须被过滤'],
  ['js/platform/ai/messageSanitizer.js', 'consecutive-duplicate', '连续重复消息必须去重'],
  ['js/platform/ai/responseNormalizer.js', 'reasoningRedacted', 'reasoning_content 必须隔离'],
  ['js/platform/ai/responseNormalizer.js', 'ai-response-batch', '多条回复必须形成批次'],
  ['js/platform/ai/requestTraceStore.js', 'recordAiResponseBatch', 'trace store 必须支持 AI 回复批次'],
  ['js/modules/chat_ai.js', 'sanitizeHistoryMessages', '聊天请求必须经过历史净化'],
  ['js/modules/chat_ai.js', 'recordAiResponseBatch', '聊天回复必须写回复批次 trace'],
  ['js/modules/chat_render.js', 'suppressConsoleTrace', '子消息必须可被批次合并隐藏'],
  ['js/features/debugConsole/service.js', 'AI Response', '控制台必须有 AI Response 分类'],
  ['js/features/debugConsole/service.js', 'Memory Brain', '控制台必须保留 Memory Brain 分类']
].forEach(([file, token, why]) => requireContains(file, token, why));
forbidContains('js/platform/ai/aiRouter.js', 'document', 'AI Router 不能渲染 UI');
forbidContains('js/platform/ai/aiRouter.js', 'getAiReply(', 'AI Router 不能反向依赖聊天旧入口');
forbidContains('js/platform/ai/aiConfigStore.js', 'fetch(', '配置层不能直接请求 API');

const app = { platform: { ai: {} }, core: { chat: { messageSemantics: { normalizeMessagesForProvider: m => m } } }, app: { state: { runtimeGlobals: {} } } };
const context = vm.createContext({ console, window: null, OwoApp: app, db: {}, fetch: async () => { throw new Error('unexpected fetch'); }, Date, Math, JSON, String, Number, Boolean, Object, Array });
context.window = context;
context.window.OwoApp = app;
['js/platform/ai/providerConfig.js','js/platform/ai/aiConfigStore.js','js/platform/ai/modelRegistry.js','js/platform/ai/messageSanitizer.js','js/platform/ai/responseNormalizer.js'].forEach(rel => vm.runInContext(read(rel), context, { filename: rel }));
const sourceDb = { apiSettings: { provider: 'newapi', url: 'https://api.example.com', key: 'secret', model: 'chat-model' }, summaryApiSettings: { provider: 'newapi', url: 'https://api.example.com', key: 'secret', model: 'memory-model' } };
const resolved = app.platform.ai.modelRegistry.resolve(sourceDb, 'memory-fact');
if (!resolved || resolved.settings.model !== 'memory-model') error('modelRegistry 未把 memory-fact 路由到 summaryApiSettings');
else ok('modelRegistry 正确路由 memory-fact');
const dirty = [
  { role: 'assistant', content: '[unknown的消息：I can\'t take on this roleplay.]' },
  { role: 'assistant', content: '[pp的消息：重复]' },
  { role: 'assistant', content: '[pp的消息：重复]' },
  { role: 'user', content: '[u的消息：你好]' }
];
const cleaned = app.platform.ai.messageSanitizer.sanitizeHistoryMessages(dirty);
if (cleaned.messages.length !== 2 || cleaned.diagnostics.duplicateCount !== 1 || !cleaned.diagnostics.dropped.some(item => item.reason === 'unknown-assistant')) error('messageSanitizer 未正确过滤 unknown / duplicate');
else ok('messageSanitizer 过滤 unknown / duplicate');
const response = { choices: [{ message: { role: 'assistant', content: '[pp的消息：一]\n[pp的消息：二]', reasoning_content: 'hidden reasoning' }, finish_reason: 'stop' }], usage: { total_tokens: 12 }, model: 'chat-model' };
const normalized = app.platform.ai.responseNormalizer.normalizeChatCompletion(response, { provider: 'newapi', model: 'chat-model' });
const batch = app.platform.ai.responseNormalizer.buildResponseBatch({ normalized, provider: 'newapi', model: 'chat-model' });
if (!normalized.metadata.hasReasoning || normalized.content.includes('hidden reasoning') || batch.messageCount !== 2) error('responseNormalizer 未隔离 reasoning 或未合并多消息');
else ok('responseNormalizer 隔离 reasoning 并生成多消息批次');
if (hasError) { console.error('\nAI Pipeline gate failed.'); process.exit(1); }
console.log('\nAI Pipeline gate passed.');
