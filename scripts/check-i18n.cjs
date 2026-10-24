const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function files(directory) { return fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? files(path.join(directory, entry.name)) : [path.join(directory, entry.name)]); }
function inspect(source, file) {
  const result = [];
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
  const add = (kind, text) => { const normalized = text.replace(/\s+/g, ' ').trim(); if (/[\p{L}]/u.test(normalized)) result.push({ file, kind, text: normalized }); };
  function visit(node) {
    if (ts.isJsxText(node)) add('text', node.text);
    if (ts.isJsxAttribute(node) && ['title', 'placeholder', 'alt', 'aria-label'].includes(node.name.text) && node.initializer && ts.isStringLiteral(node.initializer)) add(node.name.text, node.initializer.text);
    if (ts.isJsxExpression(node) && node.expression) {
      if (ts.isStringLiteral(node.expression)) add('expression', node.expression.text);
      if (ts.isConditionalExpression(node.expression)) for (const value of [node.expression.whenTrue, node.expression.whenFalse]) if (ts.isStringLiteral(value)) add('conditional', value.text);
    }
    ts.forEachChild(node, visit);
  }
  visit(tree); return result;
}
function scan() { return files(path.join(root, 'apps/web/src')).filter(file => file.endsWith('.tsx')).flatMap(file => inspect(fs.readFileSync(file, 'utf8'), path.relative(root, file).replaceAll('\\', '/'))); }
function check() {
  const baseline = JSON.parse(fs.readFileSync(path.join(root, 'docs/i18n-hardcoded-baseline.json'), 'utf8'));
  const approved = new Set(baseline.entries.map(entry => JSON.stringify(entry)));
  const newEntries = scan().filter(entry => !approved.has(JSON.stringify(entry)));
  if (newEntries.length) throw new Error('New hardcoded application text requires translation: ' + JSON.stringify(newEntries));
  console.log('I18N source check passed; legacy UI exceptions are tracked in I18N-UI.');
}
module.exports = { inspect, scan, check };
if (require.main === module) check();
