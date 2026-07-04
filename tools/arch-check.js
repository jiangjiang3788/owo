#!/usr/bin/env node
/*
 * OWO V1 architecture check.
 * 用法：node tools/arch-check.js
 * 只依赖 Node 内置模块，适合当前无 package.json 的项目。
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const MAX_SOFT_LINES = 300;
const MAX_HARD_LINES = 380;

const ignoreDirs = new Set(['.git', 'node_modules']);
const jsFiles = [];

function walk(dir) {
  for (const name of fs.readdirSync(dir)) {
    if (ignoreDirs.has(name)) continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walk(full);
    else if (full.endsWith('.js')) jsFiles.push(full);
  }
}

walk(path.join(root, 'js'));

let hasError = false;
function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}
function error(msg) {
  hasError = true;
  console.error('❌ ' + msg);
}
function warn(msg) {
  console.warn('⚠️  ' + msg);
}

console.log('OWO architecture check\n');

// 1. 行数 gate
for (const file of jsFiles) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/).length;
  const r = rel(file);
  const isNewStructure = /^js\/(app|core|features|platform|shared|compat)\//.test(r);
  if (lines > MAX_HARD_LINES && isNewStructure) {
    error(`${r} ${lines} 行，超过 ${MAX_HARD_LINES}，新结构文件必须拆分`);
  } else if (lines > MAX_SOFT_LINES && isNewStructure) {
    warn(`${r} ${lines} 行，超过 ${MAX_SOFT_LINES}，需要解释或拆分`);
  } else if (lines > MAX_HARD_LINES && !r.startsWith('js/modules/')) {
    warn(`${r} ${lines} 行是 legacy 大文件，V1 暂不阻断，但后续必须拆分`);
  }
}

// 2. core/shared 禁止词 gate
const forbiddenInCore = [/\bwindow\b/, /\bdocument\b/, /\bfetch\s*\(/, /\blocalStorage\b/, /\bDexie\b/, /\bdb\b/];
const businessWordsInShared = [/chat/i, /character/i, /memory/i, /worldbook/i, /forum/i, /wallet/i, /prompt/i];
for (const file of jsFiles) {
  const r = rel(file);
  const text = fs.readFileSync(file, 'utf8');
  if (r.startsWith('js/core/')) {
    for (const rule of forbiddenInCore) {
      if (rule.test(text)) error(`${r} 在 core 中出现禁止依赖：${rule}`);
    }
  }
  if (r.startsWith('js/shared/')) {
    for (const rule of businessWordsInShared) {
      if (rule.test(text)) error(`${r} 在 shared 中疑似出现业务语义：${rule}`);
    }
  }
}

// 3. 新目录禁止直接调用旧全局 API
const legacyGlobalUse = /window\.(showToast|saveData|saveCharacter|saveGlobalSettings|normalizeMessagesForProvider|retryImageGen)\b/g;
for (const file of jsFiles) {
  const r = rel(file);
  if (!/^js\/(app|core|features|platform|shared)\//.test(r)) continue;
  if (r === 'js/app/namespace.js') continue;
  const text = fs.readFileSync(file, 'utf8');
  const matches = [...text.matchAll(legacyGlobalUse)].map(m => m[0]);
  if (matches.length) {
    error(`${r} 新结构文件直接引用旧全局 API：${[...new Set(matches)].join(', ')}`);
  }
}

// 4. window 赋值索引，用于发现可能的全局覆盖
const assigns = new Map();
const assignRe = /window\.([A-Za-z_$][\w$]*)\s*=\s*(?![=>])/g;
for (const file of jsFiles) {
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  lines.forEach((line, index) => {
    let m;
    while ((m = assignRe.exec(line))) {
      const name = m[1];
      if (!assigns.has(name)) assigns.set(name, []);
      assigns.get(name).push(`${rel(file)}:${index + 1}`);
    }
  });
}
for (const [name, sites] of [...assigns.entries()].sort()) {
  const uniqueFiles = new Set(sites.map(s => s.split(':')[0]));
  if (uniqueFiles.size > 1) {
    warn(`window.${name} 在多个文件赋值：${sites.join(', ')}`);
  }
}

if (hasError) {
  console.error('\n架构检查未通过。');
  process.exit(1);
}
console.log('\n✅ 架构检查通过，但请处理 warning 中的潜在全局覆盖。');
