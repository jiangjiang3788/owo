#!/usr/bin/env node
/*
 * Optional static deploy build for Netlify dist mode.
 * 当前默认部署路径是 netlify.toml publish = "."，不会运行本脚本。
 * 如果未来切回 publish = "dist"，本脚本只复制静态资源，不打包、不改运行时代码。
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

function ensureDeployShape() {
  const requiredFiles = ['index.html'];
  const requiredDirs = ['js', 'css'];
  for (const name of requiredFiles) {
    if (!fs.existsSync(path.join(outDir, name))) {
      throw new Error(`[netlify-build] dist 缺少必要文件：${name}`);
    }
  }
  for (const name of requiredDirs) {
    if (!fs.existsSync(path.join(outDir, name))) {
      throw new Error(`[netlify-build] dist 缺少必要目录：${name}`);
    }
  }
  for (const optional of ['_redirects', 'manifest.json', 'sw.js']) {
    if (!fs.existsSync(path.join(outDir, optional))) {
      console.warn(`[netlify-build] 可选文件未发布：${optional}`);
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

ensureDeployShape();
console.log('✅ Optional Netlify dist build complete: dist/');
