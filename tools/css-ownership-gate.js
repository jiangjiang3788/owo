#!/usr/bin/env node
/*
 * OWO V37 CSS ownership gate.
 * 只做静态检查：CSS owner 表、公共 token 唯一 owner、加载顺序和行数预算。
 * Rule token: loadedCssMustHaveOwner
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const mapPath = path.join(root, 'tools/css-ownership-map.json');
let hasError = false;

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}
function read(file) {
  return fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : '';
}
function error(message) {
  hasError = true;
  console.error('❌ ' + message);
}
function warn(message) {
  console.warn('⚠️  ' + message);
}
function stripHtmlComments(text) {
  return text.replace(/<!--([\s\S]*?)-->/g, '');
}
function stripCssComments(text) {
  return text.replace(/\/\*([\s\S]*?)\*\//g, '');
}
function walkCss(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const name of fs.readdirSync(dir)) {
    if (name === 'dist' || name === 'node_modules' || name === '.git') continue;
    const full = path.join(dir, name);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) walkCss(full, out);
    else if (name.endsWith('.css')) out.push(rel(full));
  }
  return out;
}

console.log('OWO V37 CSS ownership gate\n');

if (!fs.existsSync(mapPath)) {
  error('缺少 tools/css-ownership-map.json');
} else {
  const map = JSON.parse(read(mapPath));
  if (map.version !== 'V37') error('tools/css-ownership-map.json version 必须是 V37');
  const entries = Array.isArray(map.files) ? map.files : [];
  const byPath = new Map(entries.map(item => [item.path, item]));

  const requiredFiles = [
    'css/shared/theme-tokens.css',
    'css/base.css',
    'css/layout.css',
    'css/chat.css',
    'css/settings.css',
    'contacts.css',
    'more_menu.css'
  ];
  for (const file of requiredFiles) {
    if (!byPath.has(file)) error(`CSS ownership map 缺少必要文件：${file}`);
  }

  for (const item of entries) {
    if (!item.path || !item.owner || !item.role || !item.status) {
      error(`CSS ownership map 存在不完整条目：${JSON.stringify(item)}`);
      continue;
    }
    const full = path.join(root, item.path);
    if (!fs.existsSync(full)) {
      error(`CSS ownership map 指向不存在的文件：${item.path}`);
      continue;
    }
    const lines = read(full).split(/\r?\n/).length;
    const maxLines = Number(item.maxLines || 0);
    if (maxLines > 0 && lines > maxLines) {
      const message = `${item.path} ${lines} 行超过 CSS owner 预算 ${maxLines} 行`;
      if (item.status === 'legacy-heavy') warn(message);
      else error(message);
    }
  }

  const allCssFiles = walkCss(root).filter(file => !file.startsWith('dist/'));
  for (const file of allCssFiles) {
    if (!byPath.has(file)) error(`CSS 文件缺少 ownership map：${file}`);
  }

  const indexPath = path.join(root, 'index.html');
  const indexText = stripHtmlComments(read(indexPath));
  const loadedCss = [...indexText.matchAll(/<link\s+[^>]*rel=["']stylesheet["'][^>]*href=["']([^"']+\.css)["'][^>]*>/g)].map(m => m[1]);
  for (const href of loadedCss) {
    if (!byPath.has(href)) error(`index.html 加载 CSS 但 ownership map 未登记：${href}`);
  }

  const tokenHref = 'css/shared/theme-tokens.css';
  const baseHref = 'css/base.css';
  const tokenPos = indexText.indexOf(`href="${tokenHref}"`);
  const basePos = indexText.indexOf(`href="${baseHref}"`);
  if (tokenPos === -1) error(`index.html 未加载公共 token owner：${tokenHref}`);
  if (basePos === -1) error(`index.html 未加载 base CSS：${baseHref}`);
  if (tokenPos !== -1 && basePos !== -1 && tokenPos > basePos) {
    error(`${tokenHref} 必须在 ${baseHref} 前加载，避免 base/components 读取不到公共变量`);
  }

  const tokenOwnerFile = map.publicTokens && map.publicTokens.ownerFile;
  const publicTokens = (map.publicTokens && map.publicTokens.tokens) || [];
  const allowedOverrideFiles = new Set((map.publicTokens && map.publicTokens.allowedOverrideFiles) || []);
  if (tokenOwnerFile !== tokenHref) error(`publicTokens.ownerFile 必须是 ${tokenHref}`);
  const tokenText = read(path.join(root, tokenHref));
  if (!/:root\s*\{/.test(tokenText)) error(`${tokenHref} 必须包含 :root token 定义`);
  if (/\.(chat|forum|peek|theater|wallet|shop|settings|message|screen)\b/i.test(stripCssComments(tokenText))) {
    error(`${tokenHref} 不允许出现业务选择器；公共 token 文件只能定义 :root 变量`);
  }
  for (const token of publicTokens) {
    const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const defRe = new RegExp(`${escaped}\s*:`);
    if (!defRe.test(tokenText)) error(`${tokenHref} 缺少公共 token：${token}`);
  }

  for (const file of allCssFiles) {
    if (file === tokenHref || allowedOverrideFiles.has(file)) continue;
    const text = stripCssComments(read(path.join(root, file)));
    for (const token of publicTokens) {
      const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const defRe = new RegExp(`${escaped}\s*:`);
      if (defRe.test(text)) {
        error(`${file} 不应重新定义公共 token ${token}；初始定义归 ${tokenHref}，夜间模式 override 只允许 ${[...allowedOverrideFiles].join(', ')}`);
      }
    }
  }

  const sharedCssFiles = allCssFiles.filter(file => file.startsWith('css/shared/') && file !== tokenHref);
  for (const file of sharedCssFiles) {
    const text = stripCssComments(read(path.join(root, file)));
    if (/chat|character|memory|worldbook|forum|wallet|shop|peek|theater/i.test(text)) {
      error(`${file} 在 shared CSS 中疑似出现业务语义；shared CSS 只放公共 token 或通用基础样式`);
    }
  }

  const ownershipDoc = path.join(root, 'docs/css-ownership.md');
  if (!fs.existsSync(ownershipDoc)) error('缺少 docs/css-ownership.md');
  else {
    const docText = read(ownershipDoc);
    for (const token of ['css/shared/theme-tokens.css', 'tools/css-ownership-map.json', 'node tools/css-ownership-gate.js']) {
      if (!docText.includes(token)) error(`docs/css-ownership.md 缺少说明：${token}`);
    }
  }
}

if (hasError) {
  console.error('\nCSS ownership gate 未通过。');
  process.exit(1);
}
console.log('✅ CSS ownership gate passed');
