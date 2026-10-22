import { describe, expect, it } from 'vitest';
import { checkContent, checkTemplate, type ContentSnapshot } from '../src/lib/content-rules';
import { ARROW_IDS } from '../src/schemas/map';
import { TEMPLATE_SECTIONS } from '../src/schemas/patterns';

const COMMIT = 'a'.repeat(40);
const ref = (collection: string, id: string) => ({ collection, id });
const fullBody = TEMPLATE_SECTIONS.map((s) => `<${s}>\n\ntext\n\n</${s}>`).join('\n\n');

/** A snapshot that passes every rule, launch gate included. */
function valid(): ContentSnapshot {
  return {
    target: { release: 'v1.2.0', commit: COMMIT },
    status: [{ id: 'own', label: 'Supported', release: 'v1.2.0', commit: COMMIT }],
    patterns: [
      {
        id: 'own-authority',
        draft: false,
        body: fullBody,
        status: ref('status', 'own'),
        standards: [ref('standards', 'rfc6749')],
        problem: ref('problems', 'copied-secret'),
      },
    ],
    standards: [{ id: 'rfc6749' }],
    problems: [{ id: 'copied-secret' }],
    arrows: ARROW_IDS.map((id) => ({ id, options: [{ pattern: ref('patterns', 'own-authority') }] })),
    scenes: [{ id: 'deals', pattern: ref('patterns', 'own-authority'), trace: ref('traces', 'deals') }],
    traces: [{ id: 'deals', synthetic: false, release: 'v1.2.0', commit: COMMIT }],
    author: 'An author',
  };
}

describe('checkContent', () => {
  it('accepts a complete snapshot, with and without the launch gate', () => {
    expect(checkContent(valid(), { launch: false })).toEqual([]);
    expect(checkContent(valid(), { launch: true })).toEqual([]);
  });

  it('fails on an empty collection, which is how Astro loads a missing data file', () => {
    const s = { ...valid(), standards: [] };
    expect(checkContent(s, { launch: false })).toContainEqual(expect.stringContaining('collection "standards" is empty'));
  });

  it('fails when the target entry is missing', () => {
    expect(checkContent({ ...valid(), target: undefined }, { launch: false })).toContainEqual(
      expect.stringContaining('must define a "current" entry'),
    );
  });

  it('fails on a reference to a missing entry, which Astro only logs', () => {
    const s = valid();
    s.patterns[0]!.status = ref('status', 'nope');
    expect(checkContent(s, { launch: false })).toContainEqual(
      'pattern "own-authority" references "nope" in "status", which does not exist',
    );
  });

  it('fails on a status entry that no pattern uses', () => {
    const s = valid();
    s.status.push({ id: 'stale', label: 'Supported', release: 'v1.2.0', commit: COMMIT });
    expect(checkContent(s, { launch: false })).toContainEqual('status "stale" is not used by any pattern; remove it');
  });

  it('fails on missing and extra arrows', () => {
    const s = valid();
    s.arrows = s.arrows.filter((a) => a.id !== 'mcp');
    s.arrows.push({ id: 'extra', options: [{ pattern: ref('patterns', 'own-authority') }] });
    const errors = checkContent(s, { launch: false });
    expect(errors).toContainEqual('stack-map.yaml has no arrow "mcp"');
    expect(errors).toContainEqual('stack-map.yaml arrow "extra" is not drawn by StackMap');
  });

  it('fails on a pattern that is on no arrow', () => {
    const s = valid();
    s.patterns.push({ ...s.patterns[0]!, id: 'orphan' });
    expect(checkContent(s, { launch: false })).toContainEqual('pattern "orphan" is on no arrow in stack-map.yaml');
  });

  it('fails on two scenes for one pattern', () => {
    const s = valid();
    s.scenes.push({ id: 'again', pattern: ref('patterns', 'own-authority'), trace: ref('traces', 'deals') });
    expect(checkContent(s, { launch: false })).toContainEqual(expect.stringContaining('has two scenes'));
  });

  it('fails on a verified status when no target is set', () => {
    const s = { ...valid(), target: { release: null, commit: null } };
    expect(checkContent(s, { launch: false })).toContainEqual('status "own" is Supported, but no target release is set');
  });

  it('fails on a verified status from another commit, so a target bump forces re-verification', () => {
    const s = valid();
    s.status[0] = { id: 'own', label: 'Partial', release: 'v1.1.0', commit: 'b'.repeat(40) };
    expect(checkContent(s, { launch: false })).toContainEqual(expect.stringContaining('re-verify it at the target'));
  });

  it('accepts Unverified statuses without a target outside the launch gate', () => {
    const s = valid();
    s.target = { release: null, commit: null };
    s.status = [{ id: 'own', label: 'Unverified' }];
    s.traces = [];
    s.scenes = [{ id: 'deals', pattern: ref('patterns', 'own-authority') }];
    expect(checkContent(s, { launch: false })).toEqual([]);
  });

  it('fails on a recorded trace that is not from the target release', () => {
    const s = valid();
    s.traces[0] = { id: 'deals', synthetic: false, release: 'v1.1.0', commit: 'c'.repeat(40) };
    expect(checkContent(s, { launch: false })).toContainEqual(expect.stringContaining('not at the target release'));
  });

  it('requires an empty pattern page to be a draft', () => {
    const s = valid();
    s.patterns[0]!.body = '\n  \n';
    expect(checkContent(s, { launch: false })).toContainEqual('pattern "own-authority" has no body but is not marked draft');
  });

  it('checks the template on every written page, drafts included', () => {
    const s = valid();
    s.patterns[0]!.draft = true;
    s.patterns[0]!.body = '<Failure>x</Failure>';
    expect(checkContent(s, { launch: false })).toContainEqual('pattern "own-authority": missing <UseWhen>');
  });

  describe('launch gate', () => {
    it('reports every unfinished item', () => {
      const s = valid();
      s.target = { release: null, commit: null };
      s.status = [{ id: 'own', label: 'Unverified' }];
      s.patterns[0]!.draft = true;
      s.traces = [{ id: 'deals', synthetic: true, release: 'v1.2.0', commit: COMMIT }];
      s.scenes.push({ id: 'second', pattern: ref('patterns', 'own-authority') });
      s.author = null;
      const errors = checkContent(s, { launch: true });
      expect(errors).toEqual(
        expect.arrayContaining([
          'launch: no target ThunderID release is set in thunderid-target.yaml',
          'launch: status "own" is Unverified',
          'launch: pattern "own-authority" is a draft',
          'launch: trace "deals" is synthetic',
          'launch: scene "second" has no recorded trace',
          'launch: the footer author line is not set (src/lib/site.ts)',
        ]),
      );
    });

    it('is off without the launch flag', () => {
      const s = valid();
      s.patterns[0]!.draft = true;
      expect(checkContent(s, { launch: false })).toEqual([]);
    });
  });
});

describe('checkTemplate', () => {
  it('accepts every section once, in order', () => {
    expect(checkTemplate(fullBody)).toEqual([]);
  });

  it('accepts self-closing sections', () => {
    expect(checkTemplate(TEMPLATE_SECTIONS.map((s) => `<${s} />`).join('\n'))).toEqual([]);
  });

  it('reports missing and repeated sections', () => {
    const body = fullBody.replace('<Flow>', '<Token>');
    const problems = checkTemplate(body);
    expect(problems).toContain('missing <Flow>');
    expect(problems).toContain('<Token> appears 2 times');
  });

  it('reports sections out of order', () => {
    const [first, second, ...rest] = TEMPLATE_SECTIONS;
    const body = [second, first, ...rest].map((s) => `<${s} />`).join('\n');
    expect(checkTemplate(body)).toEqual([expect.stringContaining('sections out of order')]);
  });

  it('ignores section names inside code', () => {
    const body = `${fullBody}\n\n\`\`\`mdx\n<Failure />\n\`\`\`\n\nInline \`<Flow />\` too.`;
    expect(checkTemplate(body)).toEqual([]);
  });

  it('does not mistake a longer component name for a section', () => {
    expect(checkTemplate(`${fullBody}\n<FlowChart />`)).toEqual([]);
  });
});
