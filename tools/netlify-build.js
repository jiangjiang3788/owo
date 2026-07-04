#!/usr/bin/env node
/*
 * Minimal static deploy build for Netlify.
 * It does not bundle or transform source files; it copies the browser app into dist/.
 */
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const outDir = path.join(root, 'dist');

const rootFiles = [
  '_redirects',
  'contacts.css',
  'index.html',
  'manifest.json',
  'more_menu.css',
  'style.css',
  'sw.js',
  'volcengine_tts_doc.txt'
];
const rootDirs = ['css', 'js'];

function copyFile(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(src, dest);
}

function copyDir(srcDir, destDir) {
  if (!fs.existsSync(srcDir)) return;
  for (const name of fs.readdirSync(srcDir)) {
    const src = path.join(srcDir, name);
    const dest = path.join(destDir, name);
    const stat = fs.statSync(src);
    if (stat.isDirectory()) copyDir(src, dest);
    else if (stat.isFile()) copyFile(src, dest);
  }
}

function ensureRequiredDeployFiles() {
  const required = ['index.html', 'manifest.json', 'sw.js', '_redirects'];
  for (const name of required) {
    if (!fs.existsSync(path.join(outDir, name))) {
      throw new Error(`[netlify-build] dist 缺少必要文件：${name}`);
    }
  }
}

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of rootFiles) {
  const src = path.join(root, file);
  if (fs.existsSync(src)) copyFile(src, path.join(outDir, file));
}
for (const dir of rootDirs) {
  copyDir(path.join(root, dir), path.join(outDir, dir));
}

ensureRequiredDeployFiles();
console.log('✅ Netlify static build complete: dist/');
