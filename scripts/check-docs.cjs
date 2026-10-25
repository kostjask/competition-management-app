// Dependency-free repository Markdown checks. Run: node scripts/check-docs.cjs
const fs = require('node:fs');
const path = require('node:path');
const { TextDecoder } = require('node:util');

const root = path.resolve(__dirname, '..');
const files = [];
const excluded = new Set(['node_modules', '.git', '.turbo', 'dist', 'coverage']);
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink() || excluded.has(entry.name)) continue;
    const target = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(target);
    else if (entry.name.endsWith('.md')) files.push(target);
  }
}
walk(root);

const failures = [];
const documents = new Map();
const anchors = new Map();
const decoder = new TextDecoder('utf-8', { fatal: true });
const slug = text => text.toLowerCase().replace(/<[^>]*>/g, '')
  .replace(/[^\p{L}\p{M}\p{N}_\-\s]/gu, '').replace(/\s/g, '-');
for (const file of files) {
  const relative = path.relative(root, file);
  let source;
  try { source = decoder.decode(fs.readFileSync(file)).replace(/\r\n/g, '\n'); }
  catch { failures.push(`${relative}: invalid UTF-8`); continue; }
  if (source.includes('\uFFFD')) failures.push(`${relative}: replacement character`);
  documents.set(file, source);
  const ids = new Set();
  const counts = new Map();
  let fence;
  for (const [index, line] of source.split('\n').entries()) {
    if (/[\t ]+$/.test(line)) failures.push(`${relative}:${index + 1}: trailing whitespace`);
    const marker = line.match(/^\s*(`{3,}|~{3,})/);
    if (marker) {
      if (!fence) fence = marker[1];
      else if (marker[1][0] === fence[0] && marker[1].length >= fence.length) fence = undefined;
      continue;
    }
    if (fence) continue;
    for (const match of line.matchAll(/<(?:a|h[1-6])\b[^>]*\bid=["']([^"']+)["']/g)) ids.add(match[1]);
    const heading = line.match(/^#{1,6}\s+(.+?)(?:\s+#+)?$/);
    if (heading) {
      const base = slug(heading[1]);
      const count = counts.get(base) || 0;
      ids.add(count ? `${base}-${count}` : base);
      counts.set(base, count + 1);
    }
  }
  if (fence) failures.push(`${relative}: unclosed code fence`);
  anchors.set(file, ids);
}

let linkCount = 0;
for (const [file, source] of documents) {
  // Check inline and reference Markdown links outside fenced code examples.
  const prose = source.replace(/^\s*(`{3,}|~{3,})[^\n]*\n[\s\S]*?^\s*\1\s*$/gm, '');
  const links = [...prose.matchAll(/\]\((<[^>]+>|[^\s)]+)(?:\s+["'][^\n]*["'])?\)/g),
    ...prose.matchAll(/^\s*\[[^\]]+\]:\s*(<[^>]+>|\S+)/gm)];
  for (const match of links) {
    let href = match[1].replace(/^<|>$/g, '');
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) continue;
    linkCount++;
    try { href = decodeURIComponent(href); }
    catch { failures.push(`${path.relative(root, file)}: invalid URL encoding: ${href}`); continue; }
    const hash = href.indexOf('#');
    const fragment = hash >= 0 ? href.slice(hash + 1) : '';
    const local = hash >= 0 ? href.slice(0, hash) : href;
    const target = local ? path.resolve(path.dirname(file), local) : file;
    if (!fs.existsSync(target)) failures.push(`${path.relative(root, file)}: missing target: ${href}`);
    else if (fragment && anchors.has(target) && !anchors.get(target).has(fragment)) {
      failures.push(`${path.relative(root, file)}: missing anchor: ${href}`);
    }
  }
}

if (failures.length) {
  console.error(failures.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`PASS: ${files.length} Markdown files; ${linkCount} local links; anchors, UTF-8, fences and whitespace.`);
}
