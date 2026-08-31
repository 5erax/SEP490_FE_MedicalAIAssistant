import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const style = (name) => readFileSync(new URL(`../../src/styles/${name}`, import.meta.url), 'utf8');

test('body font request includes real italic faces for guidance and its emphasis', () => {
  const fontUrl = style('index.css').match(/@import url\("([^"]+)"\)/)?.[1];
  assert.ok(fontUrl, 'The application font request must be present');
  const family = new URL(fontUrl).searchParams.getAll('family').find((item) => item.startsWith('Be Vietnam Pro:'));
  assert.ok(family?.includes(':ital,wght@'), 'Upright-only fonts cannot render italic with font-synthesis:none');
  const faces = family.split('@')[1].split(';');
  for (const face of ['0,400', '0,500', '0,600', '0,700', '0,800', '1,400', '1,600', '1,700']) {
    assert.ok(faces.includes(face), `Missing body font face ${face}`);
  }
});

test('guidance permits synthetic slant when a font is unavailable without changing the global policy', () => {
  assert.match(style('base.css'), /font-synthesis:\s*none/);
  for (const name of ['clinical-notes.css', 'dashboard-clinical.css', 'facility-explorer.css']) {
    const italicRules = style(name).match(/[^{}]+\{[^{}]*font-style:\s*italic\s*;[^{}]*\}/g) ?? [];
    assert.ok(italicRules.length > 0, `Expected guidance rules in ${name}`);
    for (const rule of italicRules) assert.match(rule, /font-synthesis:\s*style\s*;/, `Missing scoped italic fallback in ${name}`);
  }
});
