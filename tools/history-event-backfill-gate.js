#!/usr/bin/env node
/* Memory Brain v0.4.3 gate: history event backfill must use AI task routing but remain shadow-only. */
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

console.log('OWO Memory Brain gate · v0.4.3 history event backfill\n');
[
  'js/core/memoryBrain/historyEventBackfillSemantics.js',
  'js/platform/memoryBrain/historyEventBackfillStore.js',
  'js/features/memoryBrain/historyEventBackfillService.js',
  'js/features/memoryBrain/historyEventBackfillView.js',
  'css/modules/memory_brain_event_backfill.css',
  'docs/0.4/release-v0.4.3-plan.md'
].forEach(requireFile);

requireBefore('js/core/memoryBrain/backfillQueueSemantics.js', 'js/core/memoryBrain/historyEventBackfillSemantics.js');
requireBefore('js/core/memoryBrain/historyEventBackfillSemantics.js', 'js/core/memoryBrain/public.js');
requireBefore('js/platform/memoryBrain/backfillQueueStore.js', 'js/platform/memoryBrain/historyEventBackfillStore.js');
requireBefore('js/platform/memoryBrain/historyEventBackfillStore.js', 'js/platform/memoryBrain/public.js');
requireBefore('js/features/memoryBrain/historyBackfillService.js', 'js/features/memoryBrain/historyEventBackfillService.js');
requireBefore('js/features/memoryBrain/historyEventBackfillService.js', 'js/features/memoryBrain/view.js');
requireBefore('js/features/memoryBrain/historyEventBackfillView.js', 'js/features/memoryBrain/view.js');

[
  ['js/core/memoryBrain/types.js', 'historyEventBackfillRuns', 'types 必须声明历史事件回填运行记录'],
  ['js/core/memoryBrain/types.js', 'history-event-backfill', '迁移阶段必须进入历史事件回填层'],
  ['js/core/memoryBrain/public.js', 'buildHistoricalEventBackfillPrompt', 'core public 必须暴露历史事件 prompt'],
  ['js/core/memoryBrain/public.js', 'parseHistoricalEventBackfillResponse', 'core public 必须暴露历史事件 parser'],
  ['js/platform/memoryBrain/public.js', 'selectHistoryEventBackfillWork', 'platform public 必须暴露 work 选择'],
  ['js/platform/memoryBrain/public.js', 'appendHistoryEventBackfillBatch', 'platform public 必须暴露应用批次'],
  ['js/platform/memoryBrain/public.js', 'rollbackHistoryEventBackfillBatch', 'platform public 必须暴露历史事件回滚'],
  ['js/platform/memoryBrain/historyEventBackfillStore.js', 'memoryBrain.events + backfillJobs + archiveChunks + archiveCursors + backfillRuns + batches(kind=history-event-backfill)', 'store 写入边界'],
  ['js/features/memoryBrain/historyEventBackfillService.js', "task: 'memory-event'", 'service 必须走 AI task route'],
  ['js/features/memoryBrain/historyEventBackfillService.js', '历史事件回填应用结果', 'service 必须写控制台 trace'],
  ['js/features/memoryBrain/historyEventBackfillView.js', 'renderHistoryEventBackfillPanel', '历史事件 view 必须独立渲染'],
  ['js/features/memoryBrain/view.js', 'memory-brain-run-event-backfill-btn', '页面必须有运行历史事件回填按钮'],
  ['docs/0.4/release-v0.4.3-plan.md', '不正式注入 prompt', 'v0.4.3 文档必须声明不正式注入']
].forEach(([file, token, reason]) => requireContains(file, token, reason));

if (!read('index.html').includes('css/modules/memory_brain_event_backfill.css')) error('index.html 未加载 memory_brain_event_backfill.css');
forbidContains('js/core/memoryBrain/historyEventBackfillSemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features'], 'core 语义必须保持纯计算');
forbidContains('js/platform/memoryBrain/historyEventBackfillStore.js', ['getAiReply', 'aiRouter.chat', 'fetch(', 'memoryTables =', 'vectorMemory =', 'memoryJournals =', 'promptSemantics', 'sendMessage('], 'store 不能跑 AI、改旧记忆或接 prompt');
forbidContains('js/features/memoryBrain/historyEventBackfillService.js', ['getAiReply', 'fetch(', 'promptSemantics', 'sendMessage('], 'service 只能通过 aiRouter，不接旧聊天发送链路');

if (hasError) {
  console.error('\nHistory event backfill gate failed.');
  process.exit(1);
}
console.log('\nHistory event backfill gate passed.');
