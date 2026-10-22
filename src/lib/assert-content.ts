import { getCollection } from 'astro:content';
import { LAUNCH } from 'astro:env/server';
import { checkContent, type ContentSnapshot } from './content-rules';
import { SITE } from './site';

let run: Promise<void> | undefined;

/**
 * Throws, failing the build, when content breaks a rule in content-rules.ts.
 * BaseLayout calls it, so it runs once per build whichever pages exist.
 */
export function assertContent(): Promise<void> {
  if (import.meta.env.DEV) return check();
  run ??= check();
  return run;
}

async function check(): Promise<void> {
  const [patterns, status, target, standards, problems, arrows, scenes, traces] = await Promise.all([
    getCollection('patterns'),
    getCollection('status'),
    getCollection('target'),
    getCollection('standards'),
    getCollection('problems'),
    getCollection('arrows'),
    getCollection('scenes'),
    getCollection('traces'),
  ]);

  const snapshot: ContentSnapshot = {
    target: target.find((t) => t.id === 'current')?.data,
    status: status.map((e) =>
      e.data.label === 'Unverified'
        ? { id: e.id, label: e.data.label }
        : { id: e.id, label: e.data.label, release: e.data.release, commit: e.data.commit },
    ),
    patterns: patterns.map((e) => ({
      id: e.id,
      draft: e.data.draft,
      body: e.body ?? '',
      status: e.data.status,
      standards: e.data.standards,
      problem: e.data.problem,
    })),
    standards: standards.map((e) => ({ id: e.id })),
    problems: problems.map((e) => ({ id: e.id })),
    arrows: arrows.map((e) => ({ id: e.id, options: e.data.options })),
    scenes: scenes.map((e) => ({ id: e.id, pattern: e.data.pattern, trace: e.data.trace })),
    traces: traces.map((e) => ({
      id: e.id,
      synthetic: e.data.meta.synthetic,
      release: e.data.meta.release,
      commit: e.data.meta.commit,
    })),
    author: SITE.author,
  };

  const errors = checkContent(snapshot, { launch: LAUNCH });
  if (errors.length > 0) {
    throw new Error(`Content checks failed${LAUNCH ? ' (launch gate on)' : ''}:\n- ${errors.join('\n- ')}`);
  }
}
