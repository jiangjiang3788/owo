#!/usr/bin/env node
/* Memory Brain v0.5.4 gate: long-term model manual correction remains shadow-only and reversible. */
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
console.log('OWO Memory Brain gate · v0.5.4 model correction\n');
[
  'js/core/memoryBrain/modelCorrectionSemantics.js',
  'js/platform/memoryBrain/modelCorrectionStore.js',
  'js/features/memoryBrain/modelCorrectionService.js',
  'js/features/memoryBrain/modelCorrectionView.js',
  'css/modules/memory_brain_model_correction.css',
  'docs/0.5/release-v0.5.4-plan.md'
].forEach(requireFile);
before('js/core/memoryBrain/modelCorrectionSemantics.js', 'js/core/memoryBrain/public.js');
before('js/platform/memoryBrain/modelCorrectionStore.js', 'js/platform/memoryBrain/public.js');
before('js/features/memoryBrain/modelCorrectionService.js', 'js/features/memoryBrain/view.js');
before('js/features/memoryBrain/modelCorrectionView.js', 'js/features/memoryBrain/view.js');
requireContains('index.html', 'css/modules/memory_brain_model_correction.css', 'v0.5.4 CSS 已加载');
requireContains('js/core/memoryBrain/types.js', 'modelCorrections', 'types 声明模型修正记录');
requireContains('js/core/memoryBrain/types.js', 'model-correction', 'types 声明 v0.5.4 阶段');
requireContains('js/core/memoryBrain/public.js', 'buildModelCorrectionPlan', 'core public 暴露模型修正计划');
requireContains('js/platform/memoryBrain/public.js', 'applyModelCorrectionPlan', 'platform public 暴露模型修正应用');
requireContains('js/platform/memoryBrain/modelCorrectionStore.js', 'rollbackModelCorrectionBatch', '模型修正 store 支持回滚');
requireContains('js/features/memoryBrain/service.js', 'correctModel', 'feature service 暴露模型修正入口');
requireContains('js/features/memoryBrain/view.js', 'memory-brain-apply-model-correction-btn', '页面有应用模型修正按钮');
requireContains('js/features/memoryBrain/groupedUiView.js', 'memory-brain-model-correction-section', '分组 UI 包含模型修正区域');
requireContains('docs/0.5/release-v0.5.4-plan.md', '不正式注入 prompt', '文档声明不正式注入');
forbidContains('js/core/memoryBrain/modelCorrectionSemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features'], 'core 语义必须纯计算');
forbidContains('js/features/memoryBrain/modelCorrectionService.js', ['promptSemantics', 'sendMessage(', 'getAiReply(', 'memory_table', 'vector_memory', 'journal.js'], '模型修正 service 不得接正式 prompt 或旧记忆写入');
forbidContains('js/platform/memoryBrain/modelCorrectionStore.js', ['promptSemantics', 'sendMessage(', 'getAiReply(', 'memoryTables =', 'vectorMemory =', 'memoryJournals ='], '模型修正 store 不得写旧记忆或接 prompt');
if (hasError) { console.error('\nModel correction gate failed.'); process.exit(1); }
console.log('\nModel correction gate passed.');
