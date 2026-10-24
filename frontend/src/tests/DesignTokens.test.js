// The design system lives in styles/colors.css (tokens) and is consumed by
// styles/layout.css and styles/instrument-system.css without hard-coded values.
const fs = require('fs');
const path = require('path');

const read = (name) => fs.readFileSync(path.resolve(__dirname, '../styles', name), 'utf8');

const tokens = {};
for (const m of read('colors.css').matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) tokens[m[1]] = m[2].trim();

describe('design tokens', () => {
  test('one accent teal, near-monochrome neutrals', () => {
    expect(tokens.accent.toLowerCase()).toBe('#00a0a0');
    expect(tokens.bg).toBe('#ffffff');
    expect(tokens.surface.toLowerCase()).toBe('#eff6f6');
    expect(tokens.ink).toBe('#111111');
    expect(tokens['ink-2'].toLowerCase()).toBe('#5c6e6e');
    expect(tokens.line.toLowerCase()).toBe('#dbe7e7');
  });

  test('type scale, radius and touch size', () => {
    expect(['fs-1', 'fs-2', 'fs-3', 'fs-4', 'fs-5'].map((k) => tokens[k])).toEqual(['12px', '14px', '17px', '22px', '64px']);
    expect(parseInt(tokens['r-control'], 10)).toBeLessThanOrEqual(2);
    expect(parseInt(tokens['r-surface'], 10)).toBeLessThanOrEqual(12);
    expect(tokens.touch).toBe('44px');
  });

  test('dial plate palette is defined and stays teal-tinted', () => {
    for (const k of ['dial-bg', 'dial-ink', 'dial-ink-2', 'dial-line', 'dial-accent']) expect(tokens[k]).toMatch(/^#[0-9a-f]{6}$/i);
    expect(tokens['dial-bg'].toLowerCase()).toBe('#0b2626');
  });

  test.each(['layout.css', 'instrument-system.css'])('%s uses tokens, no raw colours, no drop shadows', (file) => {
    const css = read(file);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/rgba?\(/);
    const shadows = css.match(/box-shadow:[^;]+;/g) || [];
    shadows.forEach((s) => expect(s).toMatch(/none|inset 0 0 0/));
  });
});
