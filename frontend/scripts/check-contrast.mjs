import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/styles/tokens.css', import.meta.url), 'utf8');
const tokens = Object.fromEntries(
  [...css.matchAll(/--(color-[\w-]+):\s*(#[0-9a-f]{6})/gi)].map((match) => [match[1], match[2]])
);
const pairs = [
  ['color-text', 'color-surface', 4.5],
  ['color-text', 'color-canvas', 4.5],
  ['color-text-muted', 'color-surface', 4.5],
  ['color-text-muted', 'color-canvas', 4.5],
  ['color-text-muted', 'color-surface-muted', 4.5],
  ['color-on-primary', 'color-primary', 4.5],
  ['color-on-primary', 'color-primary-hover', 4.5],
  ['color-on-primary', 'color-primary-active', 4.5],
  ['color-primary', 'color-primary-soft', 4.5],
  ['color-error', 'color-error-soft', 4.5],
  ['color-success', 'color-success-soft', 4.5],
  ['color-warning', 'color-warning-soft', 4.5],
  ['color-info', 'color-info-soft', 4.5],
  ['color-focus', 'color-surface', 3],
  ['color-focus', 'color-canvas', 3],
  ['color-focus', 'color-primary-soft', 3],
  ['color-control-border', 'color-surface', 3],
];
function luminance(hex) {
  if (!hex) throw new Error('Missing semantic color token');
  const channels = hex
    .slice(1)
    .match(/../g)
    .map((channel) => {
      const value = parseInt(channel, 16) / 255;
      return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
    });
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
}
let failed = false;
for (const [foreground, background, minimum] of pairs) {
  const a = luminance(tokens[foreground]);
  const b = luminance(tokens[background]);
  const ratio = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
  const pass = ratio >= minimum; // Never round before comparing with the minimum.
  console.log(`${pass ? 'PASS' : 'FAIL'} ${foreground} / ${background}: ${ratio.toFixed(2)}:1 (minimum ${minimum}:1)`);
  failed ||= !pass;
}
if (failed) process.exitCode = 1;
