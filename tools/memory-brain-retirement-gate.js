#!/usr/bin/env node
/* OWO v0.8.13 Memory Brain retirement gate. */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
let failed = false;
function fail(msg) { failed = true; console.error('❌ ' + msg); }
function pass(msg) { console.log('✅ ' + msg); }
function read(rel) { return fs.existsSync(path.join(root, rel)) ? fs.readFileSync(path.join(root, rel), 'utf8') : ''; }
for (const rel of ['js/core/memoryBrain','js/platform/memoryBrain','js/features/memoryBrain']) {
  fs.existsSync(path.join(root, rel)) ? fail(`目录仍存在：${rel}`) : pass(`已删除：${rel}`);
}
const index = read('index.html');
for (const token of ['memory-brain-screen','js/core/memoryBrain/','js/platform/memoryBrain/','js/features/memoryBrain/','css/modules/memory_brain']) {
  index.includes(token) ? fail(`index.html 仍包含：${token}`) : pass(`index.html 无活动引用：${token}`);
}
const activeFiles = [
  'js/app/namespace.js','js/app/screenManifest.js','js/app/featureIntegrationRegistry.js',
  'js/features/home/homeAppCatalog.js','js/ui.js','js/settings.js','js/app/state/initialState.js',
  'js/app/state/constants.js','js/platform/ai/aiConfigStore.js','js/modules/chat_ai.js'
];
for (const rel of activeFiles) {
  const text = read(rel);
  if (/memoryBrain|memory-brain-screen|memory_brain/.test(text)) fail(`${rel} 仍含活动 Memory Brain 标识`);
  else pass(`${rel} 已清理`);
}
const repair = read('js/platform/storage/loadRepair.js');
if (!repair.includes('legacySnapshots.memoryBrain') || !repair.includes('delete targetDb.memoryBrain')) fail('loadRepair 未保存并移除旧 payload');
else pass('旧 payload 会转存到 legacySnapshots');
if (failed) process.exit(1);
console.log('\nMemory Brain retirement gate passed.');
