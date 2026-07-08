#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = process.cwd();
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function exists(file) { return fs.existsSync(path.join(root, file)); }
function assert(condition, message) { if (!condition) { console.error('[owner-switch-gate] ' + message); process.exit(1); } }
const required = [
  'js/core/memoryBrain/ownerSwitchSemantics.js',
  'js/core/memoryBrain/uiGroupSemantics.js',
  'js/platform/memoryBrain/memoryOwnerGateStore.js',
  'js/features/memoryBrain/ownerGateService.js',
  'js/features/memoryBrain/ownerGateView.js',
  'css/modules/memory_brain_owner_gate.css',
  'docs/0.4/release-v0.4.9-plan.md'
];
required.forEach(file => assert(exists(file), `missing ${file}`));
const index = read('index.html');
required.slice(0, 6).forEach(file => assert(index.includes(file), `index missing ${file}`));
assert(index.indexOf('ownerSwitchSemantics.js') < index.indexOf('js/core/memoryBrain/public.js'), 'ownerSwitchSemantics must load before core public');
assert(index.indexOf('uiGroupSemantics.js') < index.indexOf('js/core/memoryBrain/public.js'), 'uiGroupSemantics must load before core public');
assert(index.indexOf('memoryOwnerGateStore.js') < index.indexOf('js/platform/memoryBrain/public.js'), 'memoryOwnerGateStore must load before platform public');
assert(index.indexOf('ownerGateService.js') < index.indexOf('js/features/memoryBrain/view.js'), 'ownerGateService must load before main view');
assert(index.indexOf('ownerGateView.js') < index.indexOf('js/features/memoryBrain/view.js'), 'ownerGateView must load before main view');
const semantics = read('js/core/memoryBrain/ownerSwitchSemantics.js');
assert(semantics.includes('blocked-until-v0.9') && semantics.includes('memoryBrainCanInject: false'), 'semantics must block formal Memory Brain injection until v0.9');
assert(!/document|fetch\(|global\.db|window\.db|app\.platform|app\.features/.test(semantics), 'ownerSwitchSemantics must stay pure');
const store = read('js/platform/memoryBrain/memoryOwnerGateStore.js');
assert(store.includes('ownerState') && store.includes('ownerSwitchRuns') && store.includes("kind: 'owner-switch-gate'"), 'store must write ownerState/runs/batch');
assert(store.includes('formalPromptInjection: false') && store.includes('noDualInjection: true'), 'store must forbid formal prompt injection and dual injection');
const service = read('js/features/memoryBrain/ownerGateService.js');
assert(service.includes('记忆脑 owner 切换门输入') && service.includes('formalPromptInjection: false'), 'service must write trace and keep shadow boundary');
assert(!service.includes('promptSemantics') && !service.includes('sendMessage(') && !service.includes('getAiReply('), 'ownerGateService must not touch formal chat pipeline');
const platformPublic = read('js/platform/memoryBrain/public.js');
assert(platformPublic.includes('appendOwnerSwitchRun') && platformPublic.includes('updateUiGroupOpen'), 'platform public must expose owner and UI group APIs');
const featurePublic = read('js/features/memoryBrain/public.js');
assert(featurePublic.includes('requestOwnerSwitch') && featurePublic.includes('updateUiGroupOpen'), 'feature public must expose owner and UI group APIs');
const view = read('js/features/memoryBrain/view.js');
const groupedView = read('js/features/memoryBrain/groupedUiView.js');
assert(view.includes('memory-brain-owner-section') && view.includes('groupedUiView.applyGroupedSections'), 'view must expose owner section and call grouped UI helper');
assert(groupedView.includes('memory-brain-ui-group') && groupedView.includes('UI_GROUP_DEFS'), 'grouped UI helper must wrap sections in details groups');
console.log('[owner-switch-gate] ok');
