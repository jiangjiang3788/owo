#!/usr/bin/env node
/*
 * V27 memory regression gate.
 * Static companion check for docs/smoke-memory.md.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
let hasError = false;

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}
function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}
function error(message) {
  hasError = true;
  console.error('❌ ' + message);
}
function ok(message) {
  console.log('✓ ' + message);
}
function requireFile(file, label) {
  if (!fs.existsSync(file)) {
    error(`缺少 ${label}：${rel(file)}`);
    return '';
  }
  return read(file);
}
function posInIndex(indexText, script) {
  return indexText.indexOf(`src="${script}"`);
}
function requireScriptBefore(indexText, beforeScript, afterScript, reason) {
  const beforePos = posInIndex(indexText, beforeScript);
  const afterPos = posInIndex(indexText, afterScript);
  if (beforePos === -1) error(`index.html 未加载：${beforeScript}`);
  if (afterPos === -1) error(`index.html 未加载：${afterScript}`);
  if (beforePos !== -1 && afterPos !== -1 && beforePos > afterPos) {
    error(`${beforeScript} 必须在 ${afterScript} 之前加载${reason ? '，' + reason : ''}`);
  }
}
function assertIncludes(text, token, label) {
  if (!text.includes(token)) error(`${label} 缺少：${token}`);
}
function assertNoForbidden(text, rules, label) {
  for (const rule of rules) {
    if (rule.test(text)) error(`${label} 命中禁止依赖：${rule}`);
  }
}

console.log('OWO V27 memory regression gate\n');

const smokePath = path.join(root, 'docs/smoke-memory.md');
const planPath = path.join(root, 'docs/v27-memory-regression-gate-plan.md');
const smokeText = requireFile(smokePath, 'V27 memory smoke 文档');
requireFile(planPath, 'V27 memory regression plan');

const requiredDocTokens = [
  'MEM-TABLE-01', 'MEM-TABLE-08',
  'MEM-VECTOR-01', 'MEM-VECTOR-09',
  'MEM-JOURNAL-01', 'MEM-JOURNAL-08',
  'MEM-WORLDBOOK-01', 'MEM-WORLDBOOK-08',
  'MEM-CROSS-01', 'MEM-CROSS-07',
  'node tools/arch-check.js',
  'node tools/memory-regression-gate.js',
  'window.OwoApp.features.memoryTable.publicApi',
  'window.OwoApp.features.vectorMemory.publicApi',
  'window.OwoApp.features.journal.publicApi',
  'window.OwoApp.features.worldBook.publicApi'
];
for (const token of requiredDocTokens) assertIncludes(smokeText, token, 'docs/smoke-memory.md');
ok('memory smoke 文档包含必需测试 ID 和控制台 probes');

const indexText = requireFile(path.join(root, 'index.html'), 'index.html');
const requiredFiles = [
  ['js/core/memory/tableSemantics.js', 'memory table semantics'],
  ['js/features/memoryTable/model.js', 'memory table model'],
  ['js/features/memoryTable/service.js', 'memory table service'],
  ['js/features/memoryTable/view.js', 'memory table view'],
  ['js/features/memoryTable/public.js', 'memory table public facade'],
  ['js/platform/ai/embeddingAdapter.js', 'embedding adapter'],
  ['js/features/vectorMemory/model.js', 'vector memory model'],
  ['js/features/vectorMemory/contextService.js', 'vector memory context service'],
  ['js/features/vectorMemory/public.js', 'vector memory public facade'],
  ['js/core/memory/journalSemantics.js', 'journal semantics'],
  ['js/features/journal/service.js', 'journal service'],
  ['js/features/journal/public.js', 'journal public facade'],
  ['js/core/memory/worldBookSemantics.js', 'worldbook semantics'],
  ['js/features/worldBook/contextService.js', 'worldbook context service'],
  ['js/features/worldBook/public.js', 'worldbook public facade']
];
for (const [file, label] of requiredFiles) requireFile(path.join(root, file), label);
ok('V23-V26 memory owner 文件存在');

const scriptOrderPairs = [
  ['js/core/memory/tableSemantics.js', 'js/modules/memory_table.js', 'memory table legacy shell 之前加载 semantics'],
  ['js/features/memoryTable/public.js', 'js/modules/memory_table.js', 'memory table public facade 之前加载 legacy shell'],
  ['js/platform/ai/embeddingAdapter.js', 'js/features/vectorMemory/contextService.js', 'vector context 之前加载 embedding adapter'],
  ['js/features/vectorMemory/public.js', 'js/modules/vector_memory.js', 'vector public facade 之前加载 legacy shell'],
  ['js/core/memory/journalSemantics.js', 'js/modules/journal.js', 'journal legacy shell 之前加载 semantics'],
  ['js/features/journal/public.js', 'js/modules/journal.js', 'journal public facade 之前加载 legacy shell'],
  ['js/core/memory/worldBookSemantics.js', 'js/features/worldBook/contextService.js', 'worldbook context 之前加载 semantics'],
  ['js/features/worldBook/public.js', 'js/core/chat/promptContext.js', 'promptContext 之前加载 worldbook public facade']
];
for (const [before, after, reason] of scriptOrderPairs) requireScriptBefore(indexText, before, after, reason);
ok('memory owner 脚本顺序稳定');

const pureCoreRules = [/\bdocument\b/, /\bwindow\b/, /fetch\s*\(/, /localStorage/, /Dexie/, /window\.saveData/];
for (const file of [
  'js/core/memory/tableSemantics.js',
  'js/core/memory/journalSemantics.js',
  'js/core/memory/worldBookSemantics.js'
]) {
  assertNoForbidden(read(path.join(root, file)), pureCoreRules, file);
}
ok('core memory 语义文件未接触 DOM / window / storage / network');

const featureForbiddenRules = [/window\.saveData\b/, /window\.fetchAiResponse\b/, /processStream/, /document\.querySelector\(/];
for (const file of [
  'js/features/memoryTable/model.js',
  'js/features/memoryTable/service.js',
  'js/features/vectorMemory/model.js',
  'js/features/vectorMemory/contextService.js',
  'js/features/journal/service.js',
  'js/features/worldBook/contextService.js'
]) {
  assertNoForbidden(read(path.join(root, file)), featureForbiddenRules, file);
}
ok('memory feature owners 未直接调用旧保存 / AI / stream 全局');

const chatAiText = read(path.join(root, 'js/modules/chat_ai.js'));
assertIncludes(chatAiText, 'getVectorMemoryContextBlock', 'chat_ai.js');
assertIncludes(chatAiText, 'getActiveWorldBooksContents', 'chat_ai.js');
assertIncludes(chatAiText, 'generatePrivateSystemPrompt', 'chat_ai.js');
ok('chat_ai prompt integration symbols remain present');

if (hasError) {
  console.error('\nMemory regression gate failed.');
  process.exit(1);
}
console.log('\n✅ Memory regression gate passed.');
