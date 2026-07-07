#!/usr/bin/env node
/* Memory Brain v0.4.0 gate: history archive scanner must be scan-only, shadow-only. */
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

console.log('OWO Memory Brain gate · v0.4.0 history archive scanner\n');
[
  'js/core/memoryBrain/archiveSourceSemantics.js',
  'js/platform/memoryBrain/historyArchiveScanner.js',
  'js/features/memoryBrain/historyArchiveService.js',
  'js/features/memoryBrain/historyArchiveView.js',
  'css/modules/memory_brain_archive.css',
  'docs/0.4/README.md',
  'docs/0.4/release-v0.4.0-plan.md'
].forEach(requireFile);

requireBefore('js/core/memoryBrain/archiveSourceSemantics.js', 'js/core/memoryBrain/public.js');
requireBefore('js/platform/memoryBrain/historyArchiveScanner.js', 'js/platform/memoryBrain/public.js');
requireBefore('js/features/memoryBrain/historyArchiveService.js', 'js/features/memoryBrain/view.js');
requireBefore('js/features/memoryBrain/historyArchiveView.js', 'js/features/memoryBrain/view.js');
if (!read('index.html').includes('css/modules/memory_brain_archive.css')) error('index.html 未加载 css/modules/memory_brain_archive.css');

[
  ['js/core/memoryBrain/types.js', 'archiveSources', 'types 必须声明 archiveSources'],
  ['js/core/memoryBrain/types.js', 'archiveScanRuns', 'types 必须声明 archiveScanRuns'],
  ['js/core/memoryBrain/types.js', 'history-archive', '迁移阶段必须进入历史大整理入口'],
  ['js/core/memoryBrain/public.js', 'buildArchiveSourceFromChat', 'core public 必须暴露历史来源构建'],
  ['js/platform/memoryBrain/historyArchiveScanner.js', 'memoryBrain.archiveSources + memoryBrain.archiveScanRuns + memoryBrain.batches only', 'scanner 写入边界'],
  ['js/platform/memoryBrain/historyArchiveScanner.js', 'formalPromptInjection: false', 'scanner 禁止正式注入'],
  ['js/features/memoryBrain/historyArchiveService.js', '历史归档扫描应用结果', 'service 必须写控制台 trace'],
  ['js/features/memoryBrain/view.js', 'memory-brain-scan-archive-btn', '页面必须有扫描全部历史按钮'],
  ['js/features/memoryBrain/historyArchiveView.js', 'renderHistoryArchivePanel', '历史整理室 view 必须独立渲染'],
  ['docs/0.4/release-v0.4.0-plan.md', '不跑 AI', 'v0.4.0 文档必须声明 scan-only']
].forEach(([file, token, reason]) => requireContains(file, token, reason));

forbidContains('js/core/memoryBrain/archiveSourceSemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features'], 'core 语义必须保持纯计算');
forbidContains('js/platform/memoryBrain/historyArchiveScanner.js', ['getAiReply', 'aiRouter.chat', 'fetch(', 'memoryTables =', 'vectorMemory =', 'memoryJournals =', 'promptSemantics'], '历史扫描器不能跑 AI、改旧记忆或接 prompt');
forbidContains('js/features/memoryBrain/historyArchiveService.js', ['getAiReply', 'aiRouter.chat', 'fetch(', 'promptSemantics', 'sendMessage('], '历史整理 service 不能跑 AI 或接正式发送链路');

if (hasError) {
  console.error('\nHistory archive gate failed.');
  process.exit(1);
}
console.log('\nHistory archive gate passed.');
