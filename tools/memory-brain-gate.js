#!/usr/bin/env node
/* Memory Brain v0.3.8 gate: memory palace/export productization remains shadow-only. */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
let hasError = false;
function read(relPath) { const file = path.join(root, relPath); return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function exists(relPath) { return fs.existsSync(path.join(root, relPath)); }
function error(message) { hasError = true; console.error('❌ ' + message); }
function ok(message) { console.log('✅ ' + message); }
function indexOfScript(indexText, script) { return indexText.indexOf(`src="${script}"`); }
function requireFile(relPath) { if (!exists(relPath)) error(`缺少文件：${relPath}`); else ok(`存在：${relPath}`); }
function requireContains(relPath, token, reason) { if (!read(relPath).includes(token)) error(`${relPath} 缺少标记：${reason || token}`); }
function forbidContains(relPath, tokens, reason) { const text = read(relPath); tokens.forEach(token => { if (text.includes(token)) error(`${relPath} 不应包含 ${token}${reason ? '：' + reason : ''}`); }); }
function requireBefore(indexText, beforeScript, afterScript, reason) {
  const before = indexOfScript(indexText, beforeScript), after = indexOfScript(indexText, afterScript);
  if (before === -1) error(`index.html 未加载：${beforeScript}`);
  if (after === -1) error(`index.html 未加载：${afterScript}`);
  if (before !== -1 && after !== -1 && before > after) error(`${beforeScript} 必须在 ${afterScript} 之前加载${reason ? '，' + reason : ''}`);
}

console.log('OWO Memory Brain gate · v0.3.8 memory palace / export productization\n');

[
  'js/core/memoryBrain/eventSemantics.js',
  'js/core/memoryBrain/factSemantics.js',
  'js/core/memoryBrain/familySemantics.js',
  'js/core/memoryBrain/graphSemantics.js',
  'js/core/memoryBrain/modelSemantics.js',
  'js/core/memoryBrain/injectionSemantics.js',
  'js/core/memoryBrain/weightSemantics.js',
  'js/core/memoryBrain/productSemantics.js',
  'js/platform/memoryBrain/memoryFactStore.js',
  'js/platform/memoryBrain/memoryEmbeddingService.js',
  'js/platform/memoryBrain/memoryFamilyStore.js',
  'js/platform/memoryBrain/memoryGraphStore.js',
  'js/platform/memoryBrain/memoryModelStore.js',
  'js/platform/memoryBrain/memoryInjectionStore.js',
  'js/platform/memoryBrain/memoryScheduleStore.js',
  'js/platform/memoryBrain/memoryExportAdapter.js',
  'js/features/memoryBrain/eventTimelineService.js',
  'js/features/memoryBrain/factExtractionService.js',
  'js/features/memoryBrain/familyService.js',
  'js/features/memoryBrain/graphService.js',
  'js/features/memoryBrain/longTermModelService.js',
  'js/features/memoryBrain/injectionPreviewService.js',
  'js/features/memoryBrain/memorySchedulerService.js',
  'js/features/memoryBrain/productizationService.js',
  'js/features/memoryBrain/timelineView.js',
  'js/features/memoryBrain/factView.js',
  'js/features/memoryBrain/familyView.js',
  'js/features/memoryBrain/graphView.js',
  'js/features/memoryBrain/modelView.js',
  'js/features/memoryBrain/injectionView.js',
  'js/features/memoryBrain/schedulerView.js',
  'js/features/memoryBrain/memoryPalaceView.js',
  'css/modules/memory_brain_palace.css',
  'docs/0.3/release-v0.3.8-plan.md',
  'docs/0.3/memory-brain-full-plan.md',
  'tools/memory-brain-fixture-gate.js'
].forEach(requireFile);

const indexText = read('index.html');
[
  ['js/core/memoryBrain/weightSemantics.js', 'js/core/memoryBrain/productSemantics.js'],
  ['js/core/memoryBrain/productSemantics.js', 'js/core/memoryBrain/public.js'],
  ['js/platform/memoryBrain/memoryScheduleStore.js', 'js/platform/memoryBrain/memoryExportAdapter.js'],
  ['js/platform/memoryBrain/memoryExportAdapter.js', 'js/platform/memoryBrain/public.js'],
  ['js/features/memoryBrain/memorySchedulerService.js', 'js/features/memoryBrain/productizationService.js'],
  ['js/features/memoryBrain/productizationService.js', 'js/features/memoryBrain/timelineView.js'],
  ['js/features/memoryBrain/schedulerView.js', 'js/features/memoryBrain/memoryPalaceView.js'],
  ['js/features/memoryBrain/memoryPalaceView.js', 'js/features/memoryBrain/view.js']
].forEach(pair => requireBefore(indexText, pair[0], pair[1]));
for (const css of ['css/modules/memory_brain_timeline.css', 'css/modules/memory_brain_facts.css', 'css/modules/memory_brain_families.css', 'css/modules/memory_brain_graph.css', 'css/modules/memory_brain_models.css', 'css/modules/memory_brain_injection.css', 'css/modules/memory_brain_scheduler.css', 'css/modules/memory_brain_palace.css']) if (!indexText.includes(css)) error(`index.html 未加载 CSS：${css}`);

for (const coreFile of ['eventSemantics.js', 'factSemantics.js', 'familySemantics.js', 'graphSemantics.js', 'modelSemantics.js', 'injectionSemantics.js', 'weightSemantics.js', 'productSemantics.js']) forbidContains(`js/core/memoryBrain/${coreFile}`, ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features'], 'core 语义必须保持纯计算');

[
  ['js/core/memoryBrain/types.js', 'exports: []', 'types 必须声明 exports manifest 记录'],
  ['js/core/memoryBrain/types.js', 'productization', 'types 必须声明产品化收口阶段'],
  ['js/core/memoryBrain/public.js', 'buildMemoryPalace', 'core public 暴露记忆小屋'],
  ['js/core/memoryBrain/public.js', 'buildMemoryExportManifest', 'core public 暴露导出 manifest'],
  ['js/core/memoryBrain/productSemantics.js', 'ROOM_DEFS', '产品语义必须声明小屋房间'],
  ['js/core/memoryBrain/productSemantics.js', 'readyForFormalCutover: false', 'v0.3.8 禁止正式接管'],
  ['js/core/memoryBrain/productSemantics.js', 'buildMemoryExportManifest', '产品语义必须生成导出清单'],
  ['js/platform/memoryBrain/memoryExportAdapter.js', 'memoryBrain.exports + memoryBrain.batches only', '导出 adapter 写入边界'],
  ['js/platform/memoryBrain/memoryExportAdapter.js', 'manifest-only', 'App 内只能保存 manifest 记录'],
  ['js/platform/memoryBrain/memoryExportAdapter.js', 'formalPromptInjection: false', '导出路线不得正式注入'],
  ['js/platform/memoryBrain/public.js', 'createExportBundle', 'platform public 暴露导出包生成'],
  ['js/platform/memoryBrain/public.js', 'appendExportPreviewBatch', 'platform public 暴露导出预览批次'],
  ['js/platform/memoryBrain/public.js', 'rollbackExportBatch', 'platform public 暴露导出回滚'],
  ['js/features/memoryBrain/productizationService.js', '记忆脑导出包生成', '导出必须写控制台 trace'],
  ['js/features/memoryBrain/productizationService.js', '记忆脑导出预览批次回滚', '导出回滚必须写 trace'],
  ['js/features/memoryBrain/public.js', 'copyExportBundle', 'feature public 暴露导出复制'],
  ['js/features/memoryBrain/view.js', 'memory-brain-copy-export-btn', '页面需要复制导出包按钮'],
  ['js/features/memoryBrain/view.js', 'memory-brain-palace-section', '页面需要记忆小屋区域'],
  ['js/features/memoryBrain/memoryPalaceView.js', 'memory-brain-palace-panel', '记忆小屋 view 必须独立渲染面板'],
  ['docs/0.3/release-v0.3.8-plan.md', 'memoryBrain.exports', 'v0.3.8 文档必须声明导出记录位置'],
  ['docs/0.3/release-v0.3.8-plan.md', '不正式注入 prompt', 'v0.3.8 文档必须声明仍不正式注入'],
  ['docs/0.3/memory-brain-full-plan.md', 'memory-export-preview', '完整计划必须记录导出预览批次']
].forEach(([file, token, reason]) => requireContains(file, token, reason));

forbidContains('js/features/memoryBrain/productizationService.js', ['promptSemantics', 'buildFinalPrompt', 'getAiReply(', 'sendMessage('], '产品化 service 不能接正式聊天 prompt / 发送链路');
forbidContains('js/platform/memoryBrain/memoryExportAdapter.js', ['promptSemantics', 'sendMessage(', 'memoryTables =', 'vectorMemory =', 'memoryJournals ='], '导出 adapter 不能触碰旧记忆写入或正式 prompt');

if (hasError) {
  console.error('\nMemory Brain gate failed.');
  process.exit(1);
}
console.log('\nMemory Brain gate passed.');
