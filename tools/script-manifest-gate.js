#!/usr/bin/env node
/* v0.9.1 index script/style manifest writer and gate. */
const fs = require('fs');
const path = require('path');
const root = process.cwd();
const indexPath = path.join(root, 'index.html');
const manifestPath = path.join(root, 'script-manifest.json');
const writeMode = process.argv.includes('--write');

function parseAttributes(tag) {
  const attrs = {};
  const re = /([A-Za-z_:][-A-Za-z0-9_:.]*)\s*=\s*(["'])(.*?)\2/g;
  let match;
  while ((match = re.exec(tag))) attrs[match[1].toLowerCase()] = match[3];
  return attrs;
}
function extract(indexText) {
  const scripts = [];
  const styles = [];
  for (const match of indexText.matchAll(/<script\b[^>]*>/gi)) {
    const attrs = parseAttributes(match[0]);
    if (attrs.src) scripts.push(attrs.src);
  }
  for (const match of indexText.matchAll(/<link\b[^>]*>/gi)) {
    const attrs = parseAttributes(match[0]);
    if (attrs.rel && attrs.rel.toLowerCase() === 'stylesheet' && attrs.href) styles.push(attrs.href);
  }
  return { scripts, styles };
}
function duplicates(items) {
  const seen = new Set();
  const dup = new Set();
  items.forEach(item => seen.has(item) ? dup.add(item) : seen.add(item));
  return Array.from(dup);
}
function isLocal(ref) { return !/^(?:https?:)?\/\//i.test(ref) && !ref.startsWith('data:'); }
function stableManifest(extracted) {
  return {
    schemaVersion: 1,
    owner: 'index.html',
    scripts: extracted.scripts,
    styles: extracted.styles
  };
}
function fail(message) { console.error('❌ ' + message); process.exitCode = 1; }
function pass(message) { console.log('✅ ' + message); }

if (!fs.existsSync(indexPath)) {
  fail('缺少 index.html');
  process.exit();
}
const extracted = extract(fs.readFileSync(indexPath, 'utf8'));
const generated = stableManifest(extracted);
if (writeMode) {
  fs.writeFileSync(manifestPath, JSON.stringify(generated, null, 2) + '\n');
  pass(`已生成 script-manifest.json：${generated.scripts.length} scripts / ${generated.styles.length} styles`);
}
if (!fs.existsSync(manifestPath)) {
  fail('缺少 script-manifest.json，请运行 node tools/script-manifest-gate.js --write');
  process.exit();
}
let manifest;
try { manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')); }
catch (error) { fail('script-manifest.json 不是有效 JSON：' + error.message); process.exit(); }
if (JSON.stringify(manifest.scripts || []) !== JSON.stringify(generated.scripts)) fail('script-manifest.json 的脚本顺序与 index.html 不一致');
else pass('脚本清单与 index.html 顺序一致');
if (JSON.stringify(manifest.styles || []) !== JSON.stringify(generated.styles)) fail('script-manifest.json 的样式顺序与 index.html 不一致');
else pass('样式清单与 index.html 顺序一致');
const scriptDup = duplicates(generated.scripts);
const styleDup = duplicates(generated.styles);
if (scriptDup.length) fail('存在重复脚本：' + scriptDup.join(', ')); else pass('不存在重复脚本');
if (styleDup.length) fail('存在重复样式：' + styleDup.join(', ')); else pass('不存在重复样式');
for (const ref of [...generated.scripts, ...generated.styles]) {
  if (isLocal(ref) && !fs.existsSync(path.join(root, ref.split(/[?#]/)[0]))) fail('清单引用的本地文件不存在：' + ref);
}
if (!process.exitCode) pass('清单中的本地文件全部存在');
