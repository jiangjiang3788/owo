#!/usr/bin/env node
/* v0.8.13 legacy memory compatibility gate: journal/table/vector remain intact while the retired Memory Brain owner is absent. */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const root = process.cwd();
let failed = false;
function read(rel) { return fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : ''; }
function ok(msg) { console.log('✅ ' + msg); }
function error(msg) { failed = true; console.error('❌ ' + msg); }
function assert(cond, msg) { cond ? ok(msg) : error(msg); }
console.log('OWO legacy memory compatibility gate · v0.8.13\n');
const rel = 'js/core/memory/legacyMemoryOwnerSemantics.js';
const text = read(rel);
assert(text.includes("['journal', 'table', 'vector']"), '三套旧记忆模式仍可识别');
assert(!text.includes('memoryBrainFormalInjection'), '旧 owner snapshot 不再携带 Memory Brain 标记');
const app = { core: { memory: {} } };
const context = vm.createContext({ console, OwoApp: app, window: null, Object, Array, String, Boolean });
context.window = context;
context.window.OwoApp = app;
vm.runInContext(text, context, { filename: rel });
const sem = app.core.memory.legacyMemoryOwnerSemantics;
assert(sem.getActiveMemoryMode({ memoryMode: 'table' }) === 'table', '档案模式保持可用');
assert(sem.getActiveMemoryMode({ memoryMode: 'vector' }) === 'vector', '向量模式保持可用');
assert(sem.getActiveMemoryMode({}) === 'journal', '默认日记模式保持可用');
const snapshot = sem.buildOwnerSnapshot({ memoryMode: 'table', memoryTables: {} });
assert(snapshot.formalOwner === 'table' && snapshot.tableCanInject === true, 'owner snapshot 只描述三套旧记忆');
if (failed) process.exit(1);
console.log('\nLegacy memory compatibility gate passed.');
