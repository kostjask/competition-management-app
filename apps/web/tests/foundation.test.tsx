import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const pairs = [
  ["ink", "surface"], ["ink-secondary", "surface-muted"], ["action", "surface"], ["action-hover", "surface"],
  ["on-action", "action"], ["on-action-tonal", "action-tonal"],
  ["success-ink", "success-surface"], ["warning-ink", "warning-surface"], ["danger", "danger-surface"],
  ["info-ink", "info-surface"], ["neutral-ink", "surface-muted"], ["danger", "surface"],
  ["border-control", "surface"], ["border-control", "canvas"], ["focus", "surface"], ["focus", "canvas"],
] as const;

for (const [name, path, prefix] of [
  ["Day", "../src/index.css", "color"],
  ["Night", "../src/components/layouts/workspace-tokens.css", "stage"],
] as const) {
  test(`${name} foregrounds and necessary boundaries meet measured contrast thresholds`, () => {
    const css = readFileSync(new URL(path, import.meta.url), "utf8");
    const pattern = new RegExp(`--${prefix}-([a-z-]+):\\s*(#[0-9a-f]{6});`, "g");
    const tokens = new Map([...css.matchAll(pattern)].map(match => [match[1], match[2]]));
    function luminance(token: string) {
      const hex = tokens.get(token);
      assert.ok(hex, token);
      const linear = [1, 3, 5].map(offset => {
        const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
        return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4;
      });
      return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
    }
    for (const [foreground, background] of pairs) {
      const first = luminance(foreground);
      const second = luminance(background);
      const ratio = (Math.max(first, second) + .05) / (Math.min(first, second) + .05);
      const minimum = foreground === "border-control" || foreground === "focus" ? 3 : 4.5;
      assert.ok(ratio >= minimum, `${foreground}/${background}: ${ratio.toFixed(2)}`);
    }
  });
}
