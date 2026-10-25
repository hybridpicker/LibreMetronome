// The design system lives in styles/colors.css (tokens). The stylesheets of the
// main screen consume it without hard-coded values. Direction "Score": flat,
// white page, Okabe-Ito blue pair as the only accent, square keys, no depth.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = (...p) => fs.readFileSync(path.resolve(root, ...p), 'utf8');

const tokensOf = (css) => {
  const out = {};
  for (const m of css.matchAll(/--([a-z0-9-]+):\s*([^;]+);/g)) out[m[1]] = m[2].trim();
  return out;
};
const tokens = tokensOf(read('styles', 'colors.css'));

// WCAG 2.1 contrast ratio
const lin = (v) => {
  const s = v / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
};
const lum = (hex) => {
  const [r, g, b] = [1, 3, 5].map((i) => lin(parseInt(hex.substr(i, 2), 16)));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};
const t = (k) => tokens[k].toLowerCase();

// Stylesheets that must be written against tokens only. Grows as the redesign
// reaches more of the app (dialogs join in step 5 of round 3).
const TOKEN_ONLY = ['layout.css', 'instrument-system.css'].map((f) => ['styles', f]);
// The slider track still draws its progress with a gradient until step 3
// replaces it with a 1.5 px progress element; instrument-system.css joins then.
const NO_GRADIENT = ['layout.css'].map((f) => ['styles', f]);

describe('design tokens: Score palette', () => {
  test('white page, blue pair as the only accent', () => {
    expect(t('bg')).toBe('#ffffff');
    expect(t('accent')).toBe('#0072b2'); // fills: current beat, Start, active keys, progress
    expect(t('accent-ink')).toBe('#005a8d'); // text, links, Tap label, accent marks
    expect(t('accent-deep')).toBe('#004b78'); // pressed Start only
    expect(t('accent-wash')).toBe('#e6f1f7');
    expect(t('on-accent')).toBe('#ffffff');
    expect(t('focus')).toBe('#005a8d');
  });

  test('blue-tinted neutrals', () => {
    expect(t('surface')).toBe('#f2f5f8');
    expect(t('line')).toBe('#dbe0e6');
    expect(t('line-strong')).toBe('#768593');
    expect(t('ink-2')).toBe('#5a6672');
    expect(t('ink')).toBe('#111111');
  });

  test('contrast meets WCAG AA', () => {
    const { bg, surface } = { bg: t('bg'), surface: t('surface') };
    expect(ratio(t('ink'), bg)).toBeGreaterThanOrEqual(7);
    expect(ratio(t('ink-2'), bg)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t('ink-2'), surface)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t('accent-ink'), bg)).toBeGreaterThanOrEqual(7);
    expect(ratio(t('accent-ink'), surface)).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t('on-accent'), t('accent'))).toBeGreaterThanOrEqual(4.5);
    expect(ratio(t('on-accent'), t('accent-deep'))).toBeGreaterThanOrEqual(7);
    expect(ratio(t('accent'), bg)).toBeGreaterThanOrEqual(3); // graphic
    expect(ratio(t('line-strong'), bg)).toBeGreaterThanOrEqual(3); // graphic
    expect(ratio(t('focus'), bg)).toBeGreaterThanOrEqual(3);
  });

  test('dial plate is white and reads the same blue pair', () => {
    expect(t('dial-bg')).toBe('#ffffff');
    expect(t('dial-accent')).toBe(t('accent'));
    expect(t('dial-accent-ink')).toBe(t('accent-ink'));
    for (const k of ['dial-ink', 'dial-ink-2', 'dial-line', 'dial-line-strong']) {
      expect(tokens[k]).toMatch(/^#[0-9a-f]{6}$/i);
    }
  });
});

describe('design tokens: type, shape, motion', () => {
  test('type scale', () => {
    expect(['fs-1', 'fs-2', 'fs-3', 'fs-4', 'fs-5'].map((k) => tokens[k])).toEqual(['12px', '13px', '17px', '22px', '80px']);
    expect(tokens['fs-5-short']).toBe('64px');
    expect(tokens['fs-5-wide']).toBe('104px');
    expect(tokens['fs-title']).toBe('28px');
    expect(tokens['fs-title-lg']).toBe('32px');
    expect(tokens['fw-light']).toBe('300');
    expect(tokens['fw-regular']).toBe('400');
    expect(tokens['fw-bold']).toBe('700');
  });

  test('square keys, flat surfaces, touch size', () => {
    expect(parseInt(tokens['r-control'], 10)).toBe(0);
    expect(parseInt(tokens['r-surface'], 10)).toBe(0);
    expect(tokens.touch).toBe('44px');
    expect(tokens.stroke).toBe('1px');
    expect(tokens['stroke-viz']).toBe('1.5px');
    expect(tokens['stroke-select']).toBe('2px');
    expect(tokens['stroke-final']).toBe('3px');
  });

  test('beat fill motion: 90 ms in, 160 ms out', () => {
    expect(tokens['t-in']).toBe('90ms ease-out');
    expect(tokens['t-out']).toBe('160ms ease-out');
  });

  test('dialog scrim is light, not dark', () => {
    expect(tokens['overlay-bg']).toMatch(/rgba\(255,\s*255,\s*255/);
  });
});

describe('Lato is bundled in the cuts the design uses', () => {
  const css = read('index.css');
  const weights = [...css.matchAll(/font-family:\s*'Lato';[^}]*?font-weight:\s*(\d+)/g)].map((m) => Number(m[1]));
  test('Light 300, Regular 400, Bold 700; Thin is gone', () => {
    expect(weights.sort()).toEqual([300, 400, 700]);
    expect(css).not.toMatch(/Lato-Thin/);
    for (const f of ['Lato-Light.ttf', 'Lato-Regular.ttf', 'Lato-Bold.ttf']) {
      expect(fs.existsSync(path.resolve(root, 'assets', 'fonts', f))).toBe(true);
    }
    expect(fs.existsSync(path.resolve(root, 'assets', 'fonts', 'Lato-Thin.ttf'))).toBe(false);
  });
});

describe('accessibility modes override tokens only', () => {
  const css = read('styles', 'accessibility-modes.css');
  const block = (sel) => {
    const m = css.match(new RegExp(`${sel.replace(/[.]/g, '\\.')}\\s*\\{([^}]*)\\}`));
    return m ? tokensOf(m[1]) : null;
  };

  test('large text steps the scale up one size', () => {
    const b = block('body.large-text');
    expect(['fs-1', 'fs-2', 'fs-3', 'fs-4', 'fs-5'].map((k) => b[k])).toEqual(['14px', '16px', '19px', '24px', '96px']);
  });

  test('tritanopia swaps the blue for vermilion; protanopia and deuteranopia need no override', () => {
    const b = block('body.tritanopia');
    expect(b.accent.toLowerCase()).toBe('#c24d00');
    expect(b['accent-ink'].toLowerCase()).toBe('#a13f00');
    expect(ratio(b['accent-ink'], '#ffffff')).toBeGreaterThanOrEqual(4.5);
    expect(ratio('#ffffff', b.accent)).toBeGreaterThanOrEqual(4.5);
    expect(css).not.toMatch(/body\.(protanopia|deuteranopia)[^{]*\{[^}]*--accent/);
  });

  test('monochromacy uses ink; high contrast stays black, white, cyan, yellow', () => {
    expect(block('body.monochromacy').accent.toLowerCase()).toBe('#111111');
    const hc = block('body.high-contrast');
    expect([hc.bg, hc.ink, hc.accent, hc.focus].map((v) => v.toLowerCase())).toEqual(['#000000', '#ffffff', '#00ffff', '#ffff00']);
  });
});

describe('stylesheets use tokens, no decoration', () => {
  test.each(TOKEN_ONLY)('%s/%s: no raw colours, no shadows, no gradients', (...p) => {
    const css = read(...p);
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/rgba?\(/);
    const shadows = css.match(/box-shadow:[^;]+;/g) || [];
    shadows.forEach((s) => expect(s).toMatch(/none/));
    expect(css).not.toMatch(/text-shadow:\s*(?!none)/);
    expect(css).not.toMatch(/drop-shadow\(/);
  });

  test.each(NO_GRADIENT)('%s/%s: no gradients', (...p) => {
    expect(read(...p)).not.toMatch(/gradient\(/);
  });

  test.each(TOKEN_ONLY)('%s/%s: radii are 0 or from tokens (never above 12 px)', (...p) => {
    const css = read(...p);
    for (const m of css.matchAll(/border-radius:\s*([^;]+);/g)) {
      const v = m[1].trim();
      expect(v).toMatch(/^(0|var\(--r-(control|surface)\)|50%)$/);
    }
  });
});
