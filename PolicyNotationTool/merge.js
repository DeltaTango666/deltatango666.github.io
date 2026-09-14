#!/usr/bin/env node
/**
 * merge.js — re-inlines styles.css and script.js into index.html
 * to produce a single self-contained HTML file for deployment/release.
 *
 * Usage:
 *   node merge.js
 *   node merge.js index.html styles.css script.js PolicyNotationTool.html
 *
 * Defaults: reads index.html, styles.css, script.js from the current
 * directory and writes PolicyNotationTool.html (single-file build).
 */

const fs = require('fs');
const path = require('path');

const [
  htmlIn = 'index.html',
  cssIn = 'styles.css',
  jsIn = 'script.js',
  htmlOut = 'PolicyNotationTool.html',
] = process.argv.slice(2);

function read(file) {
  const p = path.resolve(file);
  if (!fs.existsSync(p)) {
    console.error(`Missing file: ${p}`);
    process.exit(1);
  }
  return fs.readFileSync(p, 'utf8');
}

let html = read(htmlIn);
const css = read(cssIn);
const js = read(jsIn);

// Replace <link rel="stylesheet" href="styles.css"> with an inline <style> block.
const linkRe = /<link[^>]+rel=["']stylesheet["'][^>]*href=["'][^"']*styles\.css["'][^>]*>/i;
if (!linkRe.test(html)) {
  console.error('Could not find the styles.css <link> tag in ' + htmlIn);
  process.exit(1);
}
html = html.replace(linkRe, `<style>\n${css}\n</style>`);

// Replace <script src="script.js"></script> with an inline <script> block.
const scriptRe = /<script[^>]+src=["'][^"']*script\.js["'][^>]*>\s*<\/script>/i;
if (!scriptRe.test(html)) {
  console.error('Could not find the script.js <script> tag in ' + htmlIn);
  process.exit(1);
}
html = html.replace(scriptRe, `<script>\n${js}\n</script>`);

fs.writeFileSync(path.resolve(htmlOut), html, 'utf8');
console.log(`Merged build written to ${htmlOut}`);
