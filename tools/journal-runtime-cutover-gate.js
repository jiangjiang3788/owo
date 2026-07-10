#!/usr/bin/env node
/* OWO v0.9.3 journal runtime vertical-slice gate. */
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

console.log('OWO v0.9.3 journal runtime cutover gate\n');
[
  'js/core/ai/cutoverSemantics.js',
  'js/core/output/outputContracts.js',
  'js/core/journal/runtimeModeSemantics.js',
  'js/core/journal/outputContracts.js',
  'js/features/journalRuntime/service.js',
  'js/features/journalRuntime/public.js'
].forEach(requireFile);
requireBefore('js/core/ai/cutoverSemantics.js', 'js/core/chat/runtimeModeSemantics.js');
requireBefore('js/core/output/outputContracts.js', 'js/core/journal/outputContracts.js');
requireBefore('js/core/journal/outputContracts.js', 'js/features/journalRuntime/service.js');
requireBefore('js/features/aiRuntime/public.js', 'js/features/journalRuntime/service.js');
requireBefore('js/features/journalRuntime/public.js', 'js/modules/journal.js');

const journalModule = read('js/modules/journal.js');
if (journalModule.includes('fetchAiResponse(')) fail('journal.js 不得继续直接调用 fetchAiResponse');
else pass('journal.js 已移除直接模型请求');
if ((journalModule.match(/journalRuntime\.executeJournalTask\(/g) || []).length !== 2) fail('日记生成与合并必须各有一个统一 Runtime 调用点');
else pass('日记生成与合并共用 Journal Runtime');
if (!journalModule.includes("taskType: 'journal.merge'")) fail('日记合并未注册为 journal.merge');
if (!journalModule.includes("journalTaskType = 'journal.summarize'")) fail('摘要模式未使用 journal.summarize');

const app = {
  core: { ai: {}, output: {}, journal: {} },
  features: { aiRuntime: { publicApi: {} }, journalRuntime: {} },
  platform: { ai: { requestTraceStore: { recordDiagnostic() {} } }, storage: { repository: { async saveGlobalSettings() {} } } }
};
const calls = { legacy: 0, resolve: 0, unified: 0, repair: 0 };
let legacyOutput = '<journal><title>旧路径</title><content>正文</content></journal>';
let unifiedOutput = '<journal><title>新路径</title><content>正文</content></journal>';
let repairOutput = '<journal><title>修复后</title><content>正文</content></journal>';
app.features.aiRuntime.publicApi = {
  resolveTask(request) { calls.resolve += 1; return { route: { id: 'summary-route' }, taskType: request.taskType }; },
  async invokeTask(request) {
    if (request.taskType === 'system.repair_structured_output') { calls.repair += 1; return { content: repairOutput }; }
    calls.unified += 1;
    return { content: unifiedOutput };
  }
};
const context = { OwoApp: app, console, setTimeout, clearTimeout, db: {}, fetchAiResponse: async () => { calls.legacy += 1; return legacyOutput; } };
context.window = context;
vm.createContext(context);
for (const rel of [
  'js/core/ai/taskContracts.js',
  'js/core/ai/cutoverSemantics.js',
  'js/core/output/outputContracts.js',
  'js/core/journal/runtimeModeSemantics.js',
  'js/core/journal/outputContracts.js',
  'js/features/journalRuntime/service.js',
  'js/features/journalRuntime/public.js'
]) vm.runInContext(read(rel), context, { filename: rel });

const state = {
  apiSettings: { provider: 'newapi', url: 'https://main.invalid', key: 'main', model: 'main-model' },
  summaryApiSettings: { provider: 'newapi', url: 'https://summary.invalid', key: 'summary', model: 'summary-model' }
};
function reset() { calls.legacy = calls.resolve = calls.unified = calls.repair = 0; }

(async () => {
  reset();
  let result = await app.features.journalRuntime.publicApi.executeJournalTask({ taskType: 'journal.generate', prompt: 'x', state: { ...state, journalRuntimeMode: 'legacy' } });
  if (result.value.title !== '旧路径' || calls.legacy !== 1 || calls.resolve !== 0 || calls.unified !== 0) fail('legacy 必须单次使用兼容 executor');
  else pass('legacy 单次执行通过');
  if (result.sideEffectsCommitted !== false) fail('Journal Runtime 不得提交业务副作用');
  else pass('Runtime 与日记写入边界分离');

  reset();
  result = await app.features.journalRuntime.publicApi.executeJournalTask({ taskType: 'journal.generate', prompt: 'x', state: { ...state, journalRuntimeMode: 'shadow' } });
  if (result.value.title !== '旧路径' || calls.legacy !== 1 || calls.resolve !== 1 || calls.unified !== 0) fail('shadow 必须一次预检 + 一次兼容网络请求，不能双请求');
  else pass('shadow 无双请求通过');

  reset();
  result = await app.features.journalRuntime.publicApi.executeJournalTask({ taskType: 'journal.merge', prompt: 'x', state: { ...state, journalRuntimeMode: 'unified' } });
  if (result.value.title !== '新路径' || calls.unified !== 1 || calls.legacy !== 0 || calls.resolve !== 0) fail('unified 必须只调用一次统一任务');
  else pass('unified 单次执行通过');

  reset();
  unifiedOutput = '格式坏了';
  repairOutput = '<journal><title>修复后</title><content>正文</content></journal>';
  result = await app.features.journalRuntime.publicApi.executeJournalTask({ taskType: 'journal.generate', prompt: 'x', state: { ...state, journalRuntimeMode: 'unified' } });
  if (!result.repairAttempted || calls.unified !== 1 || calls.repair !== 1 || result.value.title !== '修复后') fail('结构化输出失败时必须且只能修复一次');
  else pass('结构化输出单次修复通过');

  reset();
  unifiedOutput = '仍然坏';
  repairOutput = '修复也坏';
  let rejected = false;
  try { await app.features.journalRuntime.publicApi.executeJournalTask({ taskType: 'journal.generate', prompt: 'x', state: { ...state, journalRuntimeMode: 'unified' } }); }
  catch (error) { rejected = error && error.code === 'JOURNAL_OUTPUT_VALIDATION_ERROR'; }
  if (!rejected || calls.repair !== 1) fail('二次解析失败必须停止且不能继续重试');
  else pass('修复失败会安全终止且不写库');

  if (failed) process.exit(1);
  console.log('\n✅ v0.9.3 journal runtime cutover gate passed');
})().catch(error => { console.error(error); process.exit(1); });
