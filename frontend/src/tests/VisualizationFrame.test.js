import fs from 'fs';
import path from 'path';

describe('visualization accessibility framing', () => {
  test('scopes the strong metronome boundary to high-contrast mode', () => {
    const stylesheet = fs.readFileSync(
      path.join(__dirname, '../styles/accessibility.css'),
      'utf8'
    );

    expect(stylesheet).toMatch(/body\.high-contrast\s+\.metronome-container\s*\{/);
    expect(stylesheet).not.toMatch(/(?:^|\})\s*\.metronome-container\s*\{[^}]*border:/m);
  });
});
