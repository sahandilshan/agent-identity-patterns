import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { SIDES } from '../schemas/map';
import { FOUR_AS } from '../schemas/common';
import { GROUPS } from '../schemas/patterns';

// Collection order is not deterministic, so every list is sorted here.

export async function sortedPatterns(): Promise<CollectionEntry<'patterns'>[]> {
  const patterns = await getCollection('patterns');
  return patterns.sort(
    (a, b) => GROUPS.indexOf(a.data.group) - GROUPS.indexOf(b.data.group) || a.data.order - b.data.order,
  );
}

export async function sortedArrows(): Promise<CollectionEntry<'arrows'>[]> {
  const arrows = await getCollection('arrows');
  return arrows.sort((a, b) => SIDES.indexOf(a.data.side) - SIDES.indexOf(b.data.side) || a.data.order - b.data.order);
}

export async function sortedProblems(): Promise<CollectionEntry<'problems'>[]> {
  return (await getCollection('problems')).sort((a, b) => a.data.order - b.data.order);
}

export async function sortedScenes(): Promise<CollectionEntry<'scenes'>[]> {
  return (await getCollection('scenes')).sort((a, b) => a.data.order - b.data.order);
}

export async function target(): Promise<{ release: string | null; commit: string | null }> {
  return (await getEntry('target', 'current'))?.data ?? { release: null, commit: null };
}

/** The line that says which release the status chips were checked against. */
export async function statusStamp(): Promise<string> {
  const { release, commit } = await target();
  return release && commit
    ? `Status verified against ThunderID ${release} (${commit.slice(0, 7)})`
    : 'Status claims are not yet verified against a ThunderID release';
}

/** The arrows a pattern sits on, derived from stack-map.yaml. */
export async function arrowsFor(patternId: string): Promise<CollectionEntry<'arrows'>[]> {
  return (await sortedArrows()).filter((a) => a.data.options.some((o) => o.pattern.id === patternId));
}

/** The scene that demonstrates a pattern, derived from scenes.yaml. */
export async function sceneFor(patternId: string): Promise<CollectionEntry<'scenes'> | undefined> {
  return (await getCollection('scenes')).find((s) => s.data.pattern.id === patternId);
}

export interface ArrowOptionView {
  condition: string;
  tokens: CollectionEntry<'arrows'>['data']['options'][number]['tokens'];
  pattern: CollectionEntry<'patterns'>;
  standards: CollectionEntry<'standards'>[];
}

/** An arrow with its options' patterns and standards resolved, and the Four A's it covers. */
export async function arrowView(arrow: CollectionEntry<'arrows'>) {
  const options: ArrowOptionView[] = await Promise.all(
    arrow.data.options.map(async (option) => {
      const pattern = await getEntry(option.pattern);
      if (!pattern) throw new Error(`Arrow "${arrow.id}" references missing pattern "${option.pattern.id}"`);
      const standards = (await Promise.all(pattern.data.standards.map((s) => getEntry(s)))).filter(
        (s): s is CollectionEntry<'standards'> => s !== undefined,
      );
      return { condition: option.condition, tokens: option.tokens, pattern, standards };
    }),
  );
  const covered = new Set(options.flatMap((o) => o.pattern.data.fourAs));
  const covers = FOUR_AS.filter((a) => covered.has(a));
  return { arrow, options, covers };
}
