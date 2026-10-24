const assert = require('node:assert/strict');
const { test } = require('node:test');
const { inspect } = require('../../../scripts/check-i18n.cjs');
test('I18N detector rejects new JSX text and accessible labels without flagging translated/user content', () => {
  assert.deepEqual(inspect('<div>{t("Common.save")}{user.name}</div>', 'fixture.tsx'), []);
  const literals = inspect('<div title="New title"><span>New text</span><input placeholder="New hint" aria-label="New label" />{ready ? "Ready" : "Wait"}</div>', 'fixture.tsx');
  assert.deepEqual(literals.map(item => item.kind), ['title', 'text', 'placeholder', 'aria-label', 'conditional', 'conditional']);
});
