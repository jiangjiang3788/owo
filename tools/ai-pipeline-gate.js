#!/usr/bin/env node
/* OWO v0.9.1 AI Task Runtime gate. */
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

console.log('OWO AI Task Runtime gate · v0.9.1\n');
[
  'js/core/ai/taskContracts.js',
  'js/core/ai/routingSemantics.js',
  'js/platform/ai/aiConfigStore.js',
  'js/platform/ai/modelRegistry.js',
  'js/platform/ai/providerRequestAdapter.js',
  'js/platform/ai/responseNormalizer.js',
  'js/platform/ai/aiRouter.js',
  'js/features/aiRuntime/service.js',
  'js/features/aiRuntime/public.js',
  'docs/releases/v0.9.0/plan.md'
].forEach(requireFile);

[
  ['js/core/ai/taskContracts.js', 'js/platform/ai/providerConfig.js'],
  ['js/core/ai/routingSemantics.js', 'js/platform/ai/aiConfigStore.js'],
  ['js/platform/ai/providerConfig.js', 'js/platform/ai/aiConfigStore.js'],
  ['js/platform/ai/aiConfigStore.js', 'js/platform/ai/modelRegistry.js'],
  ['js/platform/ai/responseNormalizer.js', 'js/platform/ai/providerRequestAdapter.js'],
  ['js/platform/ai/providerRequestAdapter.js', 'js/platform/ai/aiRouter.js'],
  ['js/platform/ai/aiRouter.js', 'js/features/aiRuntime/service.js'],
  ['js/features/aiRuntime/service.js', 'js/features/aiRuntime/public.js'],
  ['js/features/aiRuntime/public.js', 'js/utils.js'],
  ['js/features/aiRuntime/public.js', 'js/modules/chat_ai.js']
].forEach(([a, b]) => requireBefore(a, b));

[
  ['js/core/ai/taskContracts.js', "'conversation.reply'", '必须有聊天任务'],
  ['js/core/ai/taskContracts.js', 'schemaVersion', '任务契约必须版本化'],
  ['js/core/ai/taskContracts.js', 'outputContractId', '任务必须声明输出契约'],
  ['js/core/ai/taskContracts.js', 'sideEffectPolicy', '任务必须声明副作用策略'],
  ['js/core/ai/taskContracts.js', 'unregistered taskType', '未知任务必须被拒绝'],
  ['js/core/ai/taskContracts.js', "'journal.generate'", '必须有日记任务'],
  ['js/core/ai/taskContracts.js', "'image.describe'", '必须有识图任务'],
  ['js/core/ai/taskContracts.js', "'embedding.create'", '必须有向量任务'],
  ['js/core/ai/routingSemantics.js', 'selectTaskRoute', '必须集中处理 task pattern'],
  ['js/platform/ai/aiConfigStore.js', 'task-runtime-compatible', '必须兼容旧设置并输出新路由快照'],
  ['js/platform/ai/aiConfigStore.js', 'providerAccounts', '必须输出 Provider Account'],
  ['js/platform/ai/aiConfigStore.js', 'modelProfiles', '必须输出 Model Profile'],
  ['js/platform/ai/modelRegistry.js', 'fallbackModelCards', '必须暴露回退模型'],
  ['js/features/aiRuntime/service.js', 'invokeTask', '必须有统一任务入口'],
  ['js/features/aiRuntime/service.js', 'executeProviderRequest', '必须有旧功能兼容执行入口'],
  ['js/features/aiRuntime/service.js', 'recordFallbackDiagnostic', '必须记录故障回退'],
  ['js/modules/chat_ai.js', 'executeChatAiProviderRequest', '聊天 fetch 必须先过 Runtime'],
  ['js/utils.js', 'runtime.executeProviderRequest', '旧通用 AI 调用必须先过 Runtime'],
  ['js/platform/ai/requestTraceStore.js', 'taskType:', '请求 Trace 必须记录任务类型']
].forEach(([file, token, why]) => requireContains(file, token, why));

forbidContains('js/core/ai/taskContracts.js', 'fetch(', 'Task Contract 不能请求网络');
forbidContains('js/core/ai/routingSemantics.js', 'fetch(', '路由语义不能请求网络');
forbidContains('js/platform/ai/aiConfigStore.js', 'fetch(', '配置层不能请求网络');
forbidContains('js/features/aiRuntime/service.js', 'document', 'AI Runtime 不能渲染 UI');

const app = {
  core: { ai: {}, chat: { messageSemantics: {
    openAiMessagesToGeminiContents: messages => messages,
    collectSystemInstruction: () => '',
    normalizeMessagesForProvider: messages => messages
  } } },
  platform: { ai: {} },
  features: { aiRuntime: {} },
  app: { state: { runtimeGlobals: {} } },
  shared: { utils: { getRandomValue: value => String(value || '').split(',')[0] } }
};
let fetchCalls = [];
let failSummary = false;
function response(status, payload) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() { return payload; },
    async text() { return JSON.stringify(payload); }
  };
}
const context = vm.createContext({
  console,
  window: null,
  OwoApp: app,
  Date, Math, JSON, String, Number, Boolean, Object, Array, Set, Error,
  fetch: async (endpoint, options) => {
    const body = JSON.parse(options.body || '{}');
    fetchCalls.push({ endpoint, body });
    if (failSummary && body.model === 'summary-model') return response(500, { error: 'summary unavailable' });
    return response(200, { choices: [{ message: { role: 'assistant', content: `ok:${body.model}` }, finish_reason: 'stop' }], model: body.model, usage: { total_tokens: 3 } });
  }
});
context.window = context;
context.window.OwoApp = app;
app.platform.ai.requestTraceStore = {
  trackedFetch: (request) => context.fetch(request.endpoint, request.fetchOptions),
  recordDiagnostic: () => null
};
app.platform.ai.embeddingAdapter = { fetchEmbeddingBatch: async () => [[1, 0]] };
[
  'js/core/ai/taskContracts.js',
  'js/core/ai/routingSemantics.js',
  'js/platform/ai/providerConfig.js',
  'js/platform/ai/aiConfigStore.js',
  'js/platform/ai/modelRegistry.js',
  'js/platform/ai/providerRequestAdapter.js',
  'js/platform/ai/responseNormalizer.js',
  'js/features/aiRuntime/service.js',
  'js/features/aiRuntime/public.js'
].forEach(rel => vm.runInContext(read(rel), context, { filename: rel }));

const sourceDb = {
  apiSettings: { provider: 'newapi', url: 'https://main.example.com', key: 'main-key', model: 'main-model' },
  summaryApiSettings: { provider: 'newapi', url: 'https://summary.example.com', key: 'summary-key', model: 'summary-model' },
  backgroundApiSettings: { provider: 'newapi', url: 'https://background.example.com', key: 'background-key', model: 'background-model' }
};

const alias = app.core.ai.taskContracts.normalizeTaskType('memory-fact');
if (alias !== 'memory.extract') error('旧 memory-fact 别名未映射到 memory.extract');
else ok('旧任务别名可迁移到 canonical task');

const resolved = app.platform.ai.modelRegistry.resolve(sourceDb, 'journal.generate');
if (!resolved || resolved.settings.model !== 'summary-model') error('journal.generate 未路由到 summaryApiSettings');
else ok('journal.generate 正确路由到总结模型');
if (!resolved.fallbackModelCards.some(card => card && card.model === 'main-model')) error('总结任务没有主模型回退候选');
else ok('总结任务包含主模型回退候选');

(async () => {
  fetchCalls = [];
  const first = await app.features.aiRuntime.publicApi.invokeTask({
    taskType: 'journal.generate',
    state: sourceDb,
    input: { prompt: 'summarize this' }
  });
  if (first.content !== 'ok:summary-model' || fetchCalls[0].body.model !== 'summary-model') error('invokeTask 未使用路由模型或未标准化响应');
  else ok('invokeTask 使用路由模型并返回标准化响应');

  fetchCalls = [];
  failSummary = true;
  const fallback = await app.features.aiRuntime.publicApi.invokeTask({
    taskType: 'journal.generate',
    state: sourceDb,
    input: { prompt: 'fallback please' }
  });
  if (fallback.content !== 'ok:main-model' || fetchCalls.length !== 2) error('主候选失败后未回退到 main model');
  else ok('主候选失败后成功回退到 main model');

  let unknownRejected = false;
  try {
    await app.features.aiRuntime.publicApi.invokeTask({ taskType: 'unknown.task', state: sourceDb, input: { messages: [] } });
  } catch (error) {
    unknownRejected = error && error.code === 'AI_TASK_VALIDATION_ERROR';
  }
  if (!unknownRejected) error('未注册 taskType 没有被 Runtime 拒绝');
  else ok('未注册 taskType 会在路由前被拒绝');

  let overrideRejected = false;
  try {
    await app.features.aiRuntime.publicApi.invokeTask({ taskType: 'journal.generate', state: sourceDb, input: { prompt: 'x' }, options: { promptTemplateId: 'evil' } });
  } catch (error) {
    overrideRejected = error && error.code === 'AI_TASK_VALIDATION_ERROR';
  }
  if (!overrideRejected) error('业务调用方仍可注入未授权策略覆盖');
  else ok('业务调用方不能注入未授权策略覆盖');

  if (first.schemaVersion !== 1 || first.outputContractId !== 'journal.entry.v1') error('任务结果缺少版本化契约元数据');
  else ok('任务结果包含 schemaVersion 与 outputContractId');

  if (hasError) { console.error('\nAI Task Runtime gate failed.'); process.exit(1); }
  console.log('\nAI Task Runtime gate passed.');
})().catch(err => { console.error(err); process.exit(1); });
