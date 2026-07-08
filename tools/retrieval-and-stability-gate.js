#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const root = path.resolve(__dirname, '..');
function read(rel) { return fs.readFileSync(path.join(root, rel), 'utf8'); }
function assertContains(rel, pattern, label) {
  const text = read(rel);
  const ok = pattern instanceof RegExp ? pattern.test(text) : text.includes(pattern);
  if (!ok) throw new Error(`${label || pattern} missing in ${rel}`);
}
assertContains('js/core/memoryBrain/injectionSemantics.js', 'retrieval_strategy_v0_6_1_keywords_trust_weight_recentness', 'v0.6.1 retrieval diagnostic');
assertContains('js/core/memoryBrain/injectionSemantics.js', 'trustScore', 'trust score ranking');
assertContains('js/core/memoryBrain/injectionSemantics.js', 'weightScore', 'weight ranking');
assertContains('js/core/memoryBrain/injectionSemantics.js', 'freshnessScore', 'freshness ranking');
assertContains('js/platform/storage/githubBackupAdapter.js', 'GitHubNetworkError', 'friendly GitHub network error');
assertContains('js/modules/memory_table.js', 'isMemoryTableXmlDiagnosticError', 'memory table XML diagnostic suppression');
assertContains('js/modules/tutorial.js', 'globalToastSwitch', 'global toast switch persistence');
assertContains('js/modules/chat_render.js', 'const globalToastEnabled = db.globalToastEnabled !== false;', 'global toast master switch');
assertContains('js/features/chat/inputPrivacyRuntime.js', 'data-lpignore', 'input privacy runtime');
assertContains('index.html', 'js/features/chat/inputPrivacyRuntime.js', 'input privacy script loaded');
assertContains('js/features/chat/chatRoomScreenTemplate.js', 'autocomplete=\\"new-password\\"', 'chat input autocomplete hardening');
assertContains('js/features/forum/forumScreenTemplates.js', 'autocomplete=\\"new-password\\"', 'forum input autocomplete hardening');
console.log('retrieval-and-stability-gate passed');
