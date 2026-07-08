#!/usr/bin/env node
/* Memory Brain v0.5.0 gate: trusted review inbox stays shadow-only and does not touch legacy memory/prompt. */
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

console.log('OWO Memory Brain gate · v0.5.0 trusted review inbox\n');
[
  'js/core/memoryBrain/reviewInboxSemantics.js',
  'js/platform/memoryBrain/memoryReviewInboxStore.js',
  'js/features/memoryBrain/reviewInboxService.js',
  'js/features/memoryBrain/reviewInboxView.js',
  'css/modules/memory_brain_review.css',
  'docs/0.5/release-v0.5.0-plan.md'
].forEach(requireFile);

before('js/core/memoryBrain/reviewInboxSemantics.js', 'js/core/memoryBrain/public.js');
before('js/platform/memoryBrain/memoryReviewInboxStore.js', 'js/platform/memoryBrain/public.js');
before('js/features/memoryBrain/reviewInboxService.js', 'js/features/memoryBrain/view.js');
before('js/features/memoryBrain/reviewInboxView.js', 'js/features/memoryBrain/view.js');

requireContains('index.html', 'css/modules/memory_brain_review.css', 'v0.5.0 CSS 已加载');
requireContains('js/core/memoryBrain/types.js', 'reviewInboxItems', 'types 声明审查收件箱状态');
requireContains('js/core/memoryBrain/types.js', 'trusted-review-inbox', 'types 声明 v0.5.0 阶段');
requireContains('js/core/memoryBrain/public.js', 'buildReviewInboxPlan', 'core public 暴露审查计划');
requireContains('js/platform/memoryBrain/public.js', 'applyReviewInboxPlan', 'platform public 暴露审查写入');
requireContains('js/features/memoryBrain/service.js', 'buildReviewInbox', 'feature service 暴露审查入口');
requireContains('js/features/memoryBrain/view.js', 'memory-brain-build-review-btn', '页面有生成审查收件箱按钮');
requireContains('js/features/memoryBrain/groupedUiView.js', 'memory-brain-review-section', '分组 UI 包含审查区域');
requireContains('docs/0.5/release-v0.5.0-plan.md', '不正式注入 prompt', '文档声明不正式注入');

forbidContains('js/core/memoryBrain/reviewInboxSemantics.js', ['document', 'fetch(', 'global.db', 'window.db', 'app.platform', 'app.features'], 'core 语义必须纯计算');
forbidContains('js/features/memoryBrain/reviewInboxService.js', ['promptSemantics', 'sendMessage(', 'getAiReply(', 'memory_table', 'vector_memory', 'journal.js'], '审查 service 不得接正式 prompt 或旧记忆写入');
forbidContains('js/platform/memoryBrain/memoryReviewInboxStore.js', ['promptSemantics', 'sendMessage(', 'getAiReply(', 'memoryTables =', 'vectorMemory =', 'memoryJournals ='], '审查 store 不得接正式 prompt 或旧记忆写入');

if (hasError) { console.error('\nReview inbox gate failed.'); process.exit(1); }
console.log('\nReview inbox gate passed.');
