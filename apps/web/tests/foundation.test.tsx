import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("foundation foregrounds and necessary boundaries meet measured contrast thresholds", () => {
  const css = readFileSync(new URL("../src/index.css", import.meta.url), "utf8");
  const tokens = new Map([...css.matchAll(/--color-([a-z-]+):\s*(#[0-9a-f]+);/g)].map(match => [match[1], match[2]]));
  function luminance(name: string) {
    let hex = tokens.get(name); assert.ok(hex, name);
    hex = hex.slice(1); if (hex.length === 3) hex = [...hex].map(value => value + value).join("");
    const linear = [0, 2, 4].map(offset => { const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255; return value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4; });
    return .2126 * linear[0] + .7152 * linear[1] + .0722 * linear[2];
  }
  const pairs = [
    ["ink", "surface"], ["ink-secondary", "surface-muted"], ["action", "surface"], ["action-hover", "surface"],
    ["success-ink", "success-surface"], ["warning-ink", "warning-surface"], ["danger", "danger-surface"],
    ["info-ink", "info-surface"], ["neutral-ink", "surface-muted"], ["danger", "surface"],
    ["border-control", "surface"], ["border-control", "canvas"], ["focus", "surface"],
  ];
  for (const [foreground, background] of pairs) {
    const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
    const ratio = (values[0] + .05) / (values[1] + .05);
    assert.ok(ratio >= (foreground.startsWith("border") || foreground === "focus" ? 3 : 4.5), `${foreground}/${background}: ${ratio.toFixed(2)}`);
  }
});
