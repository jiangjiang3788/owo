#!/usr/bin/env node
/* Memory Brain v0.4.2 gate: history backfill queue must be resumable and shadow-only. */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let hasError = false;
function read(relPath) { const file = path.join(root, relPath); return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function exists(relPath) { return fs.existsSync(path.join(root, relPath)); }
function error(message) { hasError = true; console.error('❌ ' + message); }
function ok(message) { console.log('✅ ' + message); }
function requireFile(relPath) { if (!exists(relPath)) error(`缺少文件：${relPath}`); else ok(`存在：${relPath}`); }
function requireContains(relPath, token, reason) { if (!read(relPath).includes(token)) error(`${relPath} 缺少标记：${reason || token}`); }
function forbidContains(relPath, tokens, reason) { const text = read(relPath); tokens.forEach(token => { if (text.includes(token)) error(`${relPath} 不应包含 ${token}${reason ? '：' + reason : ''}`); }); }
function pos(script) { return read('index.html').indexOf(`src="${script}"`); }
function requireBefore(beforeScript, afterScript) {
  const before = pos(beforeScript), after = pos(afterScript);
  if (before === -1) error(`index.html 未加载：${beforeScript}`);
  if (after === -1) error(`index.html 未加载：${afterScript}`);
  if (before !== -1 && after !== -1 && before > after) error(`${beforeScript} 必须在 ${afterScript} 之前加载`);
}

console.log('OWO Memory Brain gate · v0.4.2 history backfill queue\n');
[
  'js/core/memoryBrain/backfillQueueSemantics.js',
  'js/platform/memoryBrain/backfillQueueStore.js',
  'js/features/memoryBrain/historyBackfillService.js',
  'js/features/memoryBrain/historyBackfillView.js',
  'css/modules/memory_brain_backfill.css',
  'docs/0.4/release-v0.4.2-plan.md'
].forEach(requireFile);

requireBefore('js/core/memoryBrain/archiveChunkSemantics.js', 'js/core/memoryBrain/backfillQueueSemantics.js');
requireBefore('js/core/memoryBrain/backfillQueueSemantics.js', 'js/core/memoryBrain/public.js');
requireBefore('js/platform/memoryBrain/historyChunkStore.js', 'js/platform/memoryBrain/backfillQueueStore.js');
requireBefore('js/platform/memoryBrain/backfillQueueStore.js', 'js/platform/memoryBrain/public.js');
requireBefore('js/features/memoryBrain/historyChunkService.js', 'js/features/memoryBrain/historyBackfillService.js');
requireBefore('js/features/memoryBrain/historyBackfillService.js', 'js/features/memoryBrain/view.js');
requireBefore('js/features/memoryBrain/historyBackfillView.js', 'js/features/memoryBrain/view.js');

[
  ['js/core/memoryBrain/types.js', 'backfillJobs', 'types 必须声明 backfillJobs'],
  ['js/core/memoryBrain/types.js', 'backfillRuns', 'types 必须声明 backfillRuns'],
  ['js/core/memoryBrain/types.js', 'history-backfill', '迁移阶段必须进入回填队列层'],
  ['js/core/memoryBrain/public.js', 'buildBackfillJobs', 'core public 必须暴露回填任务构建'],
  ['js/core/memoryBrain/public.js', 'applyBackfillJobAction', 'core public 必须暴露任务状态机'],
  ['js/platform/memoryBrain/public.js', 'prepareBackfillQueue', 'platform public 必须暴露回填队列入口'],
  ['js/platform/memoryBrain/public.js', 'rollbackBackfillBatch', 'platform public 必须暴露回填回滚'],
  ['js/platform/memoryBrain/backfillQueueStore.js', 'memoryBrain.backfillJobs + memoryBrain.backfillRuns + memoryBrain.batches only', 'store 写入边界'],
  ['js/platform/memoryBrain/backfillQueueStore.js', 'rollbackBackfillBatch', '回填批次必须可回滚'],
  ['js/features/memoryBrain/historyBackfillService.js', '历史回填队列准备应用结果', 'service 必须写控制台 trace'],
  ['js/features/memoryBrain/historyBackfillView.js', 'renderHistoryBackfillPanel', '回填 view 必须独立渲染'],
  ['js/features/memoryBrain/view.js', 'memory-brain-build-backfill-btn', '页面必须有建立回填队列按钮'],
  ['docs/0.4/release-v0.4.2-plan.md', '不跑 AI', 'v0.4.2 文档必须声明不跑 AI']
].forEach(([file, token, reason]) => requireContains(file, token, reason));

if (!read('index.html').includes('css/modules/memory_brain_backfill.css')) error('index.html 未加载 memory_brain_backfill.css');
forbidContains('js/core/memoryBrain/backfillQueueSemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features'], 'core 语义必须保持纯计算');
forbidContains('js/platform/memoryBrain/backfillQueueStore.js', ['getAiReply', 'aiRouter.chat', 'fetch(', 'memoryTables =', 'vectorMemory =', 'memoryJournals =', 'promptSemantics', 'sendMessage('], '回填 store 不能跑 AI、改旧记忆或接 prompt');
forbidContains('js/features/memoryBrain/historyBackfillService.js', ['getAiReply', 'aiRouter.chat', 'fetch(', 'promptSemantics', 'sendMessage('], '回填 service 不能跑 AI 或接正式发送链路');

if (hasError) {
  console.error('\nHistory backfill gate failed.');
  process.exit(1);
}
console.log('\nHistory backfill gate passed.');
