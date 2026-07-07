#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error('[chat-console-time-gate] ' + message); process.exit(1); } }
assert(fs.existsSync(path.join(root, 'js/core/chat/messageTimeSemantics.js')), 'missing messageTimeSemantics');
const index = read('index.html');
assert(index.includes('js/core/chat/messageTimeSemantics.js'), 'index missing messageTimeSemantics');
assert(index.indexOf('messageTimeSemantics.js') < index.indexOf('js/modules/chat_ai.js'), 'messageTimeSemantics must load before chat_ai');
const chatAi = read('js/modules/chat_ai.js');
assert(chatAi.includes('chatAiMessageTimeSemantics'), 'chat_ai must use message time semantics');
assert((chatAi.match(/buildPromptTimePrefix/g) || []).length >= 2, 'both provider branches should use per-message time prefix');
const consoleService = read('js/features/debugConsole/service.js');
assert(consoleService.includes("category === 'response'"), 'console service must specialize response display');
assert(!/add\('原始记录', trace\)/.test(consoleService), 'console detail should not duplicate full raw trace by default');
const traceStore = read('js/platform/ai/requestTraceStore.js');
assert(traceStore.includes('findAiResponseBatchTrace'), 'trace store must dedupe AI response batch traces');
assert(traceStore.includes('compactBatchMetadata'), 'trace store must compact response batch metadata');
console.log('[chat-console-time-gate] ok');
