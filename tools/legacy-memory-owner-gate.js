#!/usr/bin/env node
/* Legacy memory owner v0.3.10 gate: formal prompt uses exactly one legacy owner; Memory Brain remains read-only/shadow before v0.9. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = process.cwd();
let hasError = false;
function read(rel) { const file = path.join(root, rel); return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : ''; }
function exists(rel) { return fs.existsSync(path.join(root, rel)); }
function error(msg) { hasError = true; console.error('❌ ' + msg); }
function ok(msg) { console.log('✅ ' + msg); }
function requireFile(rel) { exists(rel) ? ok(`存在：${rel}`) : error(`缺少文件：${rel}`); }
function requireContains(rel, token, why) { if (!read(rel).includes(token)) error(`${rel} 缺少标记：${why || token}`); else ok(`${rel} 包含：${why || token}`); }
function forbidContains(rel, token, why) { if (read(rel).includes(token)) error(`${rel} 不应包含 ${token}${why ? '：' + why : ''}`); }
function indexOfScript(script) { return read('index.html').indexOf(`src="${script}"`); }
function requireBefore(a, b) {
  const pa = indexOfScript(a), pb = indexOfScript(b);
  if (pa === -1) error(`index.html 未加载：${a}`);
  if (pb === -1) error(`index.html 未加载：${b}`);
  if (pa !== -1 && pb !== -1 && pa > pb) error(`${a} 必须在 ${b} 之前加载`);
}

console.log('OWO Legacy Memory Owner gate · v0.3.10\n');
[
  'js/core/memory/legacyMemoryOwnerSemantics.js',
  'docs/0.3/release-v0.3.10-plan.md'
].forEach(requireFile);
requireBefore('js/core/memory/legacyMemoryOwnerSemantics.js', 'js/modules/chat_ai.js');
requireBefore('js/core/memory/legacyMemoryOwnerSemantics.js', 'js/modules/journal.js');
requireBefore('js/core/memory/legacyMemoryOwnerSemantics.js', 'js/modules/memory_table.js');
requireBefore('js/core/memory/legacyMemoryOwnerSemantics.js', 'js/modules/vector_memory.js');
[
  ['js/app/namespace.js', 'legacyMemoryOwnerSemantics', 'namespace 预声明旧记忆 owner 语义'],
  ['js/core/memory/legacyMemoryOwnerSemantics.js', 'memoryBrainFormalInjection: false', 'Memory Brain 在 v0.9 前保持 read-only / shadow'],
  ['js/core/memory/legacyMemoryOwnerSemantics.js', 'shouldRunAutoJournal', '日记自动总结必须受 owner 管控'],
  ['js/core/memory/legacyMemoryOwnerSemantics.js', 'shouldRunAutoTableUpdate', '档案/表格自动更新必须受 owner 管控'],
  ['js/core/memory/legacyMemoryOwnerSemantics.js', 'shouldRunVectorAutoSummary', '向量自动总结必须受 owner 管控'],
  ['js/modules/chat_ai.js', 'buildActiveLegacyMemoryContextBlock', 'prompt 只能读取当前正式旧记忆 owner'],
  ['js/modules/chat_ai.js', '禁止表格/向量模式空内容时回退到日记', '档案/向量模式不得回退到日记'],
  ['js/modules/chat_ai.js', 'shouldUseJournalMemory(character) && character.syncGroupMemory', '群聊收藏日记只属于 journal owner'],
  ['js/modules/journal.js', 'stopAutoJournalForInactiveOwner', '日记自动总结必须能被非 journal owner 截停'],
  ['js/modules/journal.js', 'wrong-memory-owner', '日记自动总结 owner mismatch 必须可诊断'],
  ['js/modules/memory_table.js', 'stopMemoryTableAutoUpdateForInactiveOwner', '表格自动更新必须能被非 table owner 截停'],
  ['js/modules/memory_table.js', 'wrong-memory-owner', '表格自动更新 owner mismatch 必须可诊断'],
  ['js/modules/vector_memory.js', 'stopVectorAutoSummaryForInactiveOwner', '向量自动总结必须能被非 vector owner 截停'],
  ['js/modules/vector_memory.js', '当前不是向量记忆模式', '向量自动总结 owner mismatch 必须提示'],
  ['docs/0.3/release-v0.3.10-plan.md', 'Memory Brain 仍只读', '文档必须声明新记忆脑仍不正式注入'],
  ['docs/0.3/release-v0.3.10-plan.md', '三选一', '文档必须声明 journal/table/vector 三选一']
].forEach(([file, token, why]) => requireContains(file, token, why));
forbidContains('js/core/memory/legacyMemoryOwnerSemantics.js', 'document', 'owner 语义不能访问 DOM');
forbidContains('js/core/memory/legacyMemoryOwnerSemantics.js', 'fetch(', 'owner 语义不能请求网络');
forbidContains('js/modules/chat_ai.js', 'else {\n        const favoritedJournals', 'chat prompt 不应在表格/向量空内容时回退到日记');

const app = { core: { memory: {} } };
const context = vm.createContext({ console, OwoApp: app, window: null, Date, Math, JSON, String, Number, Boolean, Object, Array });
context.window = context;
context.window.OwoApp = app;
vm.runInContext(read('js/core/memory/legacyMemoryOwnerSemantics.js'), context, { filename: 'legacyMemoryOwnerSemantics.js' });
const owner = app.core.memory.legacyMemoryOwnerSemantics;
const tableChat = { memoryMode: 'table', autoJournalEnabled: true, memoryTables: { autoUpdateEnabled: true }, vectorMemory: { autoSummaryEnabled: true } };
const journalChat = { memoryMode: 'journal', autoJournalEnabled: true, memoryTables: { autoUpdateEnabled: true }, vectorMemory: { autoSummaryEnabled: true } };
const vectorChat = { memoryMode: 'vector', autoJournalEnabled: true, memoryTables: { autoUpdateEnabled: true }, vectorMemory: { autoSummaryEnabled: true } };
if (!owner.isTableOwner(tableChat) || owner.shouldRunAutoJournal(tableChat) || !owner.shouldRunAutoTableUpdate(tableChat) || owner.shouldRunVectorAutoSummary(tableChat)) error('table owner 语义错误：档案模式只允许表格自动更新');
else ok('table owner 只允许表格自动更新');
if (!owner.isJournalOwner(journalChat) || !owner.shouldRunAutoJournal(journalChat) || owner.shouldRunAutoTableUpdate(journalChat) || owner.shouldRunVectorAutoSummary(journalChat)) error('journal owner 语义错误：日记模式只允许日记自动总结');
else ok('journal owner 只允许日记自动总结');
if (!owner.isVectorOwner(vectorChat) || owner.shouldRunAutoJournal(vectorChat) || owner.shouldRunAutoTableUpdate(vectorChat) || !owner.shouldRunVectorAutoSummary(vectorChat)) error('vector owner 语义错误：向量模式只允许向量自动总结');
else ok('vector owner 只允许向量自动总结');
const snapshot = owner.buildOwnerSnapshot(tableChat);
if (snapshot.memoryBrainFormalInjection !== false || snapshot.formalOwner !== 'table') error('owner snapshot 未声明 Memory Brain formal injection = false 或 formal owner 错误');
else ok('owner snapshot 保持 Memory Brain read-only/shadow');
if (hasError) { console.error('\nLegacy Memory Owner gate failed.'); process.exit(1); }
console.log('\nLegacy Memory Owner gate passed.');
