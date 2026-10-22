import { ARROW_IDS } from '../schemas/map';
import { TEMPLATE_SECTIONS } from '../schemas/patterns';

/**
 * Rules that span collections, which zod schemas cannot express. Kept free of
 * astro:content so Vitest can test them; src/lib/assert-content.ts feeds them
 * the real collections during the build.
 */

export interface Ref {
  collection: string;
  id: string;
}

export interface ContentSnapshot {
  /** The `current` entry of thunderid-target.yaml, or undefined when missing. */
  target: { release: string | null; commit: string | null } | undefined;
  status: { id: string; label: string; release?: string | undefined; commit?: string | undefined }[];
  patterns: { id: string; draft: boolean; body: string; status: Ref; standards: Ref[]; problem: Ref }[];
  standards: { id: string }[];
  problems: { id: string }[];
  arrows: { id: string; options: { pattern: Ref }[] }[];
  scenes: { id: string; pattern: Ref; trace?: Ref | undefined }[];
  traces: { id: string; synthetic: boolean; release: string; commit: string }[];
  /** Footer author line from src/lib/site.ts. */
  author: string | null;
}

export interface RuleOptions {
  /** The launch gate: everything must be verified, written and recorded. */
  launch: boolean;
}

/** Problems with a pattern body's template sections; empty when it follows the template. */
export function checkTemplate(body: string): string[] {
  const prose = body.replace(/^(```|~~~)[\s\S]*?^\1/gm, '').replace(/`[^`\n]*`/g, '');
  const sectionNames: readonly string[] = TEMPLATE_SECTIONS;
  const found = [...prose.matchAll(/<([A-Z][A-Za-z]*)(?=[\s/>])/g)]
    .map((m) => m[1] ?? '')
    .filter((name) => sectionNames.includes(name));

  const problems: string[] = [];
  for (const name of TEMPLATE_SECTIONS) {
    const count = found.filter((f) => f === name).length;
    if (count === 0) problems.push(`missing <${name}>`);
    if (count > 1) problems.push(`<${name}> appears ${count} times`);
  }
  if (problems.length === 0 && found.join() !== TEMPLATE_SECTIONS.join()) {
    problems.push(`sections out of order: ${found.join(', ')}; expected ${TEMPLATE_SECTIONS.join(', ')}`);
  }
  return problems;
}

export function checkContent(s: ContentSnapshot, { launch }: RuleOptions): string[] {
  const errors: string[] = [];

  // Astro loads a missing or unreadable data file as an empty collection.
  const required = {
    patterns: s.patterns,
    status: s.status,
    standards: s.standards,
    problems: s.problems,
    arrows: s.arrows,
    scenes: s.scenes,
  };
  for (const [name, entries] of Object.entries(required)) {
    if (entries.length === 0) errors.push(`collection "${name}" is empty; check that its data file exists and parses`);
  }
  if (!s.target) errors.push('src/data/thunderid-target.yaml must define a "current" entry');

  // Astro only logs a reference to a missing entry.
  const ids: Record<string, Set<string>> = {
    patterns: new Set(s.patterns.map((e) => e.id)),
    status: new Set(s.status.map((e) => e.id)),
    standards: new Set(s.standards.map((e) => e.id)),
    problems: new Set(s.problems.map((e) => e.id)),
    scenes: new Set(s.scenes.map((e) => e.id)),
    traces: new Set(s.traces.map((e) => e.id)),
  };
  const checkRef = (owner: string, ref: Ref) => {
    if (!ids[ref.collection]?.has(ref.id)) {
      errors.push(`${owner} references "${ref.id}" in "${ref.collection}", which does not exist`);
    }
  };
  for (const p of s.patterns) {
    checkRef(`pattern "${p.id}"`, p.status);
    checkRef(`pattern "${p.id}"`, p.problem);
    for (const ref of p.standards) checkRef(`pattern "${p.id}"`, ref);
  }
  for (const a of s.arrows) for (const o of a.options) checkRef(`arrow "${a.id}"`, o.pattern);
  for (const sc of s.scenes) {
    checkRef(`scene "${sc.id}"`, sc.pattern);
    if (sc.trace) checkRef(`scene "${sc.id}"`, sc.trace);
  }

  // A status no pattern uses is a claim nobody sees or re-verifies.
  const usedStatus = new Set(s.patterns.map((p) => p.status.id));
  for (const st of s.status) {
    if (!usedStatus.has(st.id)) errors.push(`status "${st.id}" is not used by any pattern; remove it`);
  }

  // The map component draws a fixed set of arrows.
  const arrowIds = new Set(s.arrows.map((a) => a.id));
  for (const id of ARROW_IDS) if (!arrowIds.has(id)) errors.push(`stack-map.yaml has no arrow "${id}"`);
  for (const id of arrowIds) {
    if (!(ARROW_IDS as readonly string[]).includes(id)) errors.push(`stack-map.yaml arrow "${id}" is not drawn by StackMap`);
  }

  // Every pattern must be reachable from the map.
  const onMap = new Set(s.arrows.flatMap((a) => a.options.map((o) => o.pattern.id)));
  for (const p of s.patterns) if (!onMap.has(p.id)) errors.push(`pattern "${p.id}" is on no arrow in stack-map.yaml`);

  // A pattern page shows one scene.
  const sceneFor = new Map<string, string>();
  for (const sc of s.scenes) {
    const other = sceneFor.get(sc.pattern.id);
    if (other) errors.push(`pattern "${sc.pattern.id}" has two scenes: "${other}" and "${sc.id}"`);
    sceneFor.set(sc.pattern.id, sc.id);
  }

  // Verified claims and recorded traces must match the target release.
  const target = s.target;
  const targetSet = Boolean(target?.release && target.commit);
  for (const st of s.status) {
    if (st.label === 'Unverified') continue;
    if (!targetSet) {
      errors.push(`status "${st.id}" is ${st.label}, but no target release is set`);
    } else if (st.commit !== target?.commit || st.release !== target?.release) {
      errors.push(`status "${st.id}" was verified at ${st.release} (${st.commit}); re-verify it at the target ${target?.release} (${target?.commit})`);
    }
  }
  for (const t of s.traces) {
    if (t.synthetic) continue;
    if (!targetSet || t.commit !== target?.commit || t.release !== target?.release) {
      errors.push(`trace "${t.id}" was recorded at ${t.release} (${t.commit}), not at the target release`);
    }
  }

  // A page with a body follows the template; an empty page is a draft.
  for (const p of s.patterns) {
    if (p.body.trim() === '') {
      if (!p.draft) errors.push(`pattern "${p.id}" has no body but is not marked draft`);
      continue;
    }
    for (const problem of checkTemplate(p.body)) errors.push(`pattern "${p.id}": ${problem}`);
  }

  if (launch) {
    if (!targetSet) errors.push('launch: no target ThunderID release is set in thunderid-target.yaml');
    for (const st of s.status) if (st.label === 'Unverified') errors.push(`launch: status "${st.id}" is Unverified`);
    for (const p of s.patterns) if (p.draft) errors.push(`launch: pattern "${p.id}" is a draft`);
    for (const t of s.traces) if (t.synthetic) errors.push(`launch: trace "${t.id}" is synthetic`);
    for (const sc of s.scenes) if (!sc.trace) errors.push(`launch: scene "${sc.id}" has no recorded trace`);
    if (!s.author) errors.push('launch: the footer author line is not set (src/lib/site.ts)');
  }

  return errors;
}
