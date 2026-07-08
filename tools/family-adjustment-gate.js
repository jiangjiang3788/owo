#!/usr/bin/env node
/* Memory Brain v0.5.3 gate: family merge / split remains shadow-only and reversible. */
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
console.log('OWO Memory Brain gate · v0.5.3 family adjustment\n');
[
  'js/core/memoryBrain/familyAdjustmentSemantics.js',
  'js/platform/memoryBrain/familyAdjustmentStore.js',
  'js/features/memoryBrain/familyAdjustmentService.js',
  'js/features/memoryBrain/familyAdjustmentView.js',
  'css/modules/memory_brain_family_adjust.css',
  'docs/0.5/release-v0.5.3-plan.md'
].forEach(requireFile);
before('js/core/memoryBrain/familyAdjustmentSemantics.js', 'js/core/memoryBrain/public.js');
before('js/platform/memoryBrain/familyAdjustmentStore.js', 'js/platform/memoryBrain/public.js');
before('js/features/memoryBrain/familyAdjustmentService.js', 'js/features/memoryBrain/view.js');
before('js/features/memoryBrain/familyAdjustmentView.js', 'js/features/memoryBrain/view.js');
requireContains('index.html', 'css/modules/memory_brain_family_adjust.css', 'v0.5.3 CSS 已加载');
requireContains('js/core/memoryBrain/types.js', 'familyAdjustments', 'types 声明家族调整记录');
requireContains('js/core/memoryBrain/types.js', 'family-adjustment', 'types 声明 v0.5.3 阶段');
requireContains('js/core/memoryBrain/public.js', 'buildFamilyAdjustmentPlan', 'core public 暴露家族调整计划');
requireContains('js/platform/memoryBrain/public.js', 'applyFamilyAdjustmentPlan', 'platform public 暴露家族调整应用');
requireContains('js/platform/memoryBrain/familyAdjustmentStore.js', 'rollbackFamilyAdjustmentBatch', '家族调整 store 支持回滚');
requireContains('js/features/memoryBrain/service.js', 'adjustFamily', 'feature service 暴露家族调整入口');
requireContains('js/features/memoryBrain/view.js', 'memory-brain-apply-family-adjust-btn', '页面有应用家族调整按钮');
requireContains('js/features/memoryBrain/groupedUiView.js', 'memory-brain-family-adjust-section', '分组 UI 包含家族调整区域');
requireContains('docs/0.5/release-v0.5.3-plan.md', '不正式注入 prompt', '文档声明不正式注入');
forbidContains('js/core/memoryBrain/familyAdjustmentSemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features'], 'core 语义必须纯计算');
forbidContains('js/features/memoryBrain/familyAdjustmentService.js', ['promptSemantics', 'sendMessage(', 'getAiReply(', 'memory_table', 'vector_memory', 'journal.js'], '家族调整 service 不得接正式 prompt 或旧记忆写入');
forbidContains('js/platform/memoryBrain/familyAdjustmentStore.js', ['promptSemantics', 'sendMessage(', 'getAiReply(', 'memoryTables =', 'vectorMemory =', 'memoryJournals ='], '家族调整 store 不得写旧记忆或接 prompt');
if (hasError) { console.error('\nFamily adjustment gate failed.'); process.exit(1); }
console.log('\nFamily adjustment gate passed.');
