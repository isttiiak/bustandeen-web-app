import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import JsonLd, { jsonLdString } from './JsonLd.js';

// Audit 2026-11-16 P2-11: the structured-data block is a <script>, so a "</script>" inside any
// text in it ends the block and what follows runs as page markup. The data is the app's own
// today, but it takes city and place names and translated copy, so the block must be safe
// whatever the text says.

describe('jsonLdString', () => {
  const nasty = {
    name: '</script><script>alert(1)</script>',
    note: '<!-- comment --> <img src=x onerror=alert(1)>',
    line: 'a b c',
    ok: 'Dhaka & Chattogram > Sylhet',
  };

  it('never contains a "<" that could close or open a tag', () => {
    const out = jsonLdString(nasty);
    expect(out).not.toContain('<');
    expect(out.toLowerCase()).not.toContain('</script');
  });

  it('is still the same data when read back as JSON', () => {
    expect(JSON.parse(jsonLdString(nasty))).toEqual(nasty);
  });

  it('leaves ordinary text byte-for-byte alone', () => {
    const plain = { '@type': 'Question', name: 'When is Fajr in Dhaka? Dhaka & Sylhet > 5' };
    expect(jsonLdString(plain)).toBe(JSON.stringify(plain));
  });
});

describe('<JsonLd>', () => {
  it('renders one script element whatever the data says', () => {
    const html = renderToStaticMarkup(
      createElement(JsonLd, { data: { name: '</script><b>x</b>' } })
    );
    expect(html.match(/<script/g)).toHaveLength(1);
    expect(html.match(/<\/script>/g)).toHaveLength(1);
    expect(html).not.toContain('<b>');
  });
});
