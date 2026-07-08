#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function assert(condition, message) { if (!condition) { console.error('[memory-brain-ui-group-gate] ' + message); process.exit(1); } }
const semantics = read('js/core/memoryBrain/uiGroupSemantics.js');
['history', 'quality', 'owner', 'daily', 'overview'].forEach(id => assert(semantics.includes(`id: '${id}'`), `ui group missing ${id}`));
assert(semantics.includes('normalizeGroupPrefs') && semantics.includes('buildGroupCards'), 'uiGroupSemantics must expose prefs/card builders');
const types = read('js/core/memoryBrain/types.js');
assert(types.includes('uiGroupsOpen'), 'types must persist ui group preferences');
const store = read('js/platform/memoryBrain/memoryOwnerGateStore.js');
assert(store.includes('updateUiGroupOpen') && store.includes('memoryBrain.settings.uiGroupsOpen'), 'store must persist ui group open state');
const view = read('js/features/memoryBrain/view.js');
const groupedView = read('js/features/memoryBrain/groupedUiView.js');
assert(view.includes('groupedUiView.applyGroupedSections'), 'main view must call grouped UI helper');
assert(groupedView.includes('UI_GROUP_DEFS') && groupedView.includes("details.className = 'memory-brain-ui-group'"), 'grouped UI helper must wrap sections in details groups');
assert(groupedView.includes("'.memory-brain-archive-actions'") && groupedView.includes("'.memory-brain-owner-actions'") && groupedView.includes("'.memory-brain-plan-section'"), 'view groups must cover history, owner and overview sections');
const css = read('css/modules/memory_brain_owner_gate.css');
assert(css.includes('.memory-brain-ui-group') && css.includes('.memory-brain-owner-gate-panel'), 'owner gate css must style groups and owner panel');
console.log('[memory-brain-ui-group-gate] ok');
