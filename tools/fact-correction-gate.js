#!/usr/bin/env node
/* Memory Brain v0.5.1 gate: fact correction remains shadow-only and reversible. */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let hasError = false;
function read(rel) { const file = path.join(root, rel); return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function error(msg) { hasError = true; console.error('❌ ' + msg); }
function ok(msg) { console.log('✅ ' + msg); }
function requireFile(rel) { exists(rel) ? ok(`存在：${rel}`) : error(`缺少文件：${rel}`); }
function requireContains(rel, token, reason) { if (!read(rel).includes(token)) error(`${rel} 缺少：${reason || token}`); else ok(`${rel} 包含：${reason || token}`); }
function forbidContains(rel, tokens, reason) { const text = read(rel); tokens.forEach(token => { if (text.includes(token)) error(`${rel} 不应包含 ${token}${reason ? '：' + reason : ''}`); }); }
function idx(script) { return read('index.html').indexOf(`src="${script}"`); }
function before(a, b) { const ai = idx(a), bi = idx(b); if (ai === -1) error(`index 未加载 ${a}`); if (bi === -1) error(`index 未加载 ${b}`); if (ai !== -1 && bi !== -1 && ai > bi) error(`${a} 必须在 ${b} 之前加载`); else if (ai !== -1 && bi !== -1) ok(`${a} 加载顺序正确`); }
console.log('OWO Memory Brain gate · v0.5.1 fact correction\n');
[
  'js/core/memoryBrain/factCorrectionSemantics.js',
  'js/platform/memoryBrain/factCorrectionStore.js',
  'js/features/memoryBrain/factCorrectionService.js',
  'js/features/memoryBrain/factCorrectionView.js',
  'css/modules/memory_brain_correction.css',
  'docs/0.5/release-v0.5.1-plan.md'
].forEach(requireFile);
before('js/core/memoryBrain/factCorrectionSemantics.js', 'js/core/memoryBrain/public.js');
before('js/platform/memoryBrain/factCorrectionStore.js', 'js/platform/memoryBrain/public.js');
before('js/features/memoryBrain/factCorrectionService.js', 'js/features/memoryBrain/view.js');
before('js/features/memoryBrain/factCorrectionView.js', 'js/features/memoryBrain/view.js');
requireContains('index.html', 'css/modules/memory_brain_correction.css', 'v0.5.1 CSS 已加载');
requireContains('js/core/memoryBrain/types.js', 'factCorrections', 'types 声明事实改写记录');
requireContains('js/core/memoryBrain/types.js', 'fact-correction', 'types 声明 v0.5.1 阶段');
requireContains('js/core/memoryBrain/public.js', 'buildFactCorrectionPlan', 'core public 暴露改写计划');
requireContains('js/platform/memoryBrain/public.js', 'applyFactCorrectionPlan', 'platform public 暴露改写应用');
requireContains('js/platform/memoryBrain/factCorrectionStore.js', 'rollbackFactCorrectionBatch', '改写 store 支持回滚');
requireContains('js/features/memoryBrain/service.js', 'correctFact', 'feature service 暴露事实改写入口');
requireContains('js/features/memoryBrain/view.js', 'memory-brain-apply-correction-btn', '页面有应用事实改写按钮');
requireContains('js/features/memoryBrain/groupedUiView.js', 'memory-brain-correction-section', '分组 UI 包含纠错区域');
requireContains('docs/0.5/release-v0.5.1-plan.md', '不正式注入 prompt', '文档声明不正式注入');
forbidContains('js/core/memoryBrain/factCorrectionSemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features'], 'core 语义必须纯计算');
forbidContains('js/features/memoryBrain/factCorrectionService.js', ['promptSemantics', 'sendMessage(', 'getAiReply(', 'memory_table', 'vector_memory', 'journal.js'], '纠错 service 不得接正式 prompt 或旧记忆写入');
forbidContains('js/platform/memoryBrain/factCorrectionStore.js', ['promptSemantics', 'sendMessage(', 'getAiReply(', 'memoryTables =', 'vectorMemory =', 'memoryJournals ='], '纠错 store 不得写旧记忆或接 prompt');
if (hasError) { console.error('\nFact correction gate failed.'); process.exit(1); }
console.log('\nFact correction gate passed.');
