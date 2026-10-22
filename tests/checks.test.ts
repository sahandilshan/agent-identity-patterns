import { describe, expect, it } from 'vitest';
import { checkRef, cssRefs, htmlIds, htmlRefs } from '../scripts/check-links.mjs';
import { findDashes } from '../scripts/check-text.mjs';

describe('findDashes', () => {
  it('finds em dashes and spaced double hyphens', () => {
    expect(findDashes('one \u2014 two\nthree -- four', '.astro')).toEqual([
      { line: 1, found: 'em dash' },
      { line: 2, found: '" -- "' },
    ]);
  });

  it('ignores CSS custom properties', () => {
    expect(findDashes('color: var(--ink);', '.astro')).toEqual([]);
  });

  it('skips code blocks and code spans in Markdown, keeping line numbers', () => {
    const md = 'Use `a -- b` here.\n\n```sh\nx \u2014 y\n```\n\nBut \u2014 here.';
    expect(findDashes(md, '.mdx')).toEqual([{ line: 7, found: 'em dash' }]);
  });

  it('does not skip code-like text outside Markdown', () => {
    expect(findDashes('`a \u2014 b`', '.yaml')).toEqual([{ line: 1, found: 'em dash' }]);
  });
});

describe('check-links', () => {
  const site = {
    base: '/agent-identity-patterns',
    files: new Set(['index.html', 'patterns/index.html', 'patterns/x/index.html', '_astro/font.woff2']),
    ids: new Map([
      ['index.html', new Set(['main', 'arrow-mcp'])],
      ['patterns/index.html', new Set(['main'])],
      ['patterns/x/index.html', new Set(['main'])],
    ]),
  };

  it('extracts references and ids', () => {
    expect(htmlRefs('<a href="/a/">x</a><img src=\'b.png\'>')).toEqual(['/a/', 'b.png']);
    expect(cssRefs('src: url(/f.woff2) format("woff2"), url("g.woff")')).toEqual(['/f.woff2', 'g.woff']);
    expect([...htmlIds('<span id="arrow-mcp"></span>')]).toEqual(['arrow-mcp']);
  });

  it('accepts base-relative, relative, fragment and external links', () => {
    for (const ref of [
      '/agent-identity-patterns/',
      '/agent-identity-patterns/patterns/x/',
      '/agent-identity-patterns/#arrow-mcp',
      '#main',
      '../',
      '/agent-identity-patterns/_astro/font.woff2',
      'https://example.com/',
      'mailto:a@example.com',
    ]) {
      expect(checkRef(ref, 'patterns/index.html', site), ref).toEqual([]);
    }
  });

  it('resolves relative links against the page directory', () => {
    expect(checkRef('x/', 'patterns/index.html', site)).toEqual([]);
    expect(checkRef('./x/', 'patterns/index.html', site)).toEqual([]);
    expect(checkRef('../../', 'patterns/index.html', site)[0]).toContain('outside the site');
  });

  it('rejects a root-relative link that skips the base path', () => {
    expect(checkRef('/patterns/', 'index.html', site)[0]).toContain('skips the base path');
  });

  it('rejects a link to a missing page or file', () => {
    expect(checkRef('/agent-identity-patterns/nope/', 'index.html', site)[0]).toContain('does not resolve');
  });

  it('rejects a page link without its trailing slash', () => {
    expect(checkRef('/agent-identity-patterns/patterns', 'index.html', site)[0]).toContain('trailing slash');
  });

  it('rejects a fragment that the target page does not define', () => {
    expect(checkRef('/agent-identity-patterns/#arrow-nope', 'patterns/index.html', site)[0]).toContain('#arrow-nope');
    expect(checkRef('#arrow-mcp', 'patterns/index.html', site)[0]).toContain('#arrow-mcp');
  });
});
