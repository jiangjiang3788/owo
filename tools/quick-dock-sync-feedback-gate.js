#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error('[quick-dock-sync-feedback-gate] ' + message); process.exit(1); } }
const service = read('js/features/quickDock/service.js');
const view = read('js/features/quickDock/view.js');
const css = read('css/modules/quick_dock.css');
assert(service.includes('正在同步到 GitHub'), 'quick dock service must set immediate syncing status');
assert(service.includes('options.onProgress'), 'quick dock service must surface progress callbacks');
assert(view.includes('setActionStatus'), 'quick dock view must render status immediately');
assert(view.includes('立即同步'), 'quick dock button label should communicate sync');
assert(view.includes("service.backupNow({ onProgress"), 'quick dock view must pass backup progress renderer');
assert(css.includes('.quick-dock--busy .quick-dock-status'), 'quick dock busy status must be visually distinct');
console.log('[quick-dock-sync-feedback-gate] ok');
