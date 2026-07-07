#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error('[fact-lifecycle-gate] ' + message); process.exit(1); } }
const required = [
  'js/core/memoryBrain/factLifecycleSemantics.js',
  'js/platform/memoryBrain/factLifecycleStore.js',
  'js/features/memoryBrain/factLifecycleService.js',
  'js/features/memoryBrain/factLifecycleView.js',
  'css/modules/memory_brain_lifecycle.css',
  'docs/0.4/release-v0.4.5-plan.md'
];
required.forEach(file => assert(fs.existsSync(path.join(root, file)), `missing ${file}`));
const index = read('index.html');
required.slice(0, 5).forEach(file => assert(index.includes(file), `index missing ${file}`));
assert(index.indexOf('factLifecycleSemantics.js') < index.indexOf('js/core/memoryBrain/public.js'), 'core lifecycle must load before core public');
assert(index.indexOf('factLifecycleStore.js') < index.indexOf('js/platform/memoryBrain/public.js'), 'platform lifecycle store must load before platform public');
assert(index.indexOf('factLifecycleService.js') < index.indexOf('js/features/memoryBrain/view.js'), 'feature lifecycle service must load before memory brain view');
assert(read('js/platform/memoryBrain/factLifecycleStore.js').includes('formalPromptInjection: false'), 'fact lifecycle must remain shadow');
assert(read('js/features/memoryBrain/factLifecycleService.js').includes('writesLegacyMemory: false'), 'fact lifecycle service must not write legacy memory');
console.log('[fact-lifecycle-gate] ok');
