#!/usr/bin/env node
/* Memory Brain v0.4.1 gate: history chunks/cursors must be metadata-only, resumable and shadow-only. */
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

console.log('OWO Memory Brain gate · v0.4.1 history chunks / cursor\n');
[
  'js/core/memoryBrain/archiveChunkSemantics.js',
  'js/platform/memoryBrain/historyChunkStore.js',
  'js/features/memoryBrain/historyChunkService.js',
  'js/features/memoryBrain/historyChunkView.js',
  'docs/0.4/release-v0.4.1-plan.md',
  'docs/0.4/roadmap-v0.4-v0.8.md'
].forEach(requireFile);

requireBefore('js/core/memoryBrain/archiveSourceSemantics.js', 'js/core/memoryBrain/archiveChunkSemantics.js');
requireBefore('js/core/memoryBrain/archiveChunkSemantics.js', 'js/core/memoryBrain/public.js');
requireBefore('js/platform/memoryBrain/historyArchiveScanner.js', 'js/platform/memoryBrain/historyChunkStore.js');
requireBefore('js/platform/memoryBrain/historyChunkStore.js', 'js/platform/memoryBrain/public.js');
requireBefore('js/features/memoryBrain/historyArchiveService.js', 'js/features/memoryBrain/historyChunkService.js');
requireBefore('js/features/memoryBrain/historyChunkService.js', 'js/features/memoryBrain/view.js');
requireBefore('js/features/memoryBrain/historyChunkView.js', 'js/features/memoryBrain/view.js');

[
  ['js/core/memoryBrain/types.js', 'archiveChunks', 'types 必须声明 archiveChunks'],
  ['js/core/memoryBrain/types.js', 'archiveCursors', 'types 必须声明 archiveCursors'],
  ['js/core/memoryBrain/types.js', 'history-chunks', '迁移阶段必须进入历史切片层'],
  ['js/core/memoryBrain/public.js', 'buildArchiveChunks', 'core public 必须暴露历史切片'],
  ['js/platform/memoryBrain/public.js', 'prepareArchiveChunks', 'platform public 必须暴露切片入口'],
  ['js/platform/memoryBrain/historyChunkStore.js', 'memoryBrain.archiveChunks + memoryBrain.archiveCursors + memoryBrain.archiveChunkRuns + memoryBrain.batches only', 'chunk store 写入边界'],
  ['js/platform/memoryBrain/historyChunkStore.js', 'rollbackArchiveChunkBatch', '切片批次必须可回滚'],
  ['js/features/memoryBrain/historyChunkService.js', '历史切片准备应用结果', 'service 必须写控制台 trace'],
  ['js/features/memoryBrain/historyChunkView.js', 'renderHistoryChunkPanel', '切片 view 必须独立渲染'],
  ['js/features/memoryBrain/view.js', 'memory-brain-prepare-chunks-btn', '页面必须有准备历史切片按钮'],
  ['docs/0.4/release-v0.4.1-plan.md', '不跑 AI', 'v0.4.1 文档必须声明不跑 AI'],
  ['docs/0.4/roadmap-v0.4-v0.8.md', 'v0.8：自我维护 / 梦境消化', '路线必须更新到 v0.8 梦境消化']
].forEach(([file, token, reason]) => requireContains(file, token, reason));

forbidContains('js/core/memoryBrain/archiveChunkSemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features'], 'core 语义必须保持纯计算');
forbidContains('js/platform/memoryBrain/historyChunkStore.js', ['getAiReply', 'aiRouter.chat', 'fetch(', 'memoryTables =', 'vectorMemory =', 'memoryJournals =', 'promptSemantics', 'sendMessage('], '历史切片 store 不能跑 AI、改旧记忆或接 prompt');
forbidContains('js/features/memoryBrain/historyChunkService.js', ['getAiReply', 'aiRouter.chat', 'fetch(', 'promptSemantics', 'sendMessage('], '历史切片 service 不能跑 AI 或接正式发送链路');

if (hasError) {
  console.error('\nHistory chunk gate failed.');
  process.exit(1);
}
console.log('\nHistory chunk gate passed.');
