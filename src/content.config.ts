import { defineCollection, reference } from 'astro:content';
import { file, glob } from 'astro/loaders';
import { z } from 'astro/zod';
import { problemSchema, sceneShape, standardSchema } from './schemas/data';
import { arrowOptionShape, arrowShape } from './schemas/map';
import { patternShape } from './schemas/patterns';
import { statusSchema, targetSchema } from './schemas/status';
import { traceSchema } from './schemas/traces';

// Plain schemas live in src/schemas so tests can import them; this file only
// adds the reference() fields, which need astro:content.
// Astro logs, but does not fail on, a reference to a missing entry or an empty
// data file. src/lib/assert-content.ts turns both into build errors.

const patterns = defineCollection({
  loader: glob({ base: './src/content/patterns', pattern: '*.mdx' }),
  schema: z.strictObject({
    ...patternShape,
    status: reference('status'),
    standards: z.array(reference('standards')),
    problem: reference('problems'),
  }),
});

const status = defineCollection({
  loader: file('src/data/thunderid-status.yaml'),
  schema: statusSchema,
});

const target = defineCollection({
  loader: file('src/data/thunderid-target.yaml'),
  schema: targetSchema,
});

const standards = defineCollection({
  loader: file('src/data/standards.yaml'),
  schema: standardSchema,
});

const problems = defineCollection({
  loader: file('src/data/problems.yaml'),
  schema: problemSchema,
});

const arrows = defineCollection({
  loader: file('src/data/stack-map.yaml'),
  schema: z.strictObject({
    ...arrowShape,
    options: z.array(z.strictObject({ ...arrowOptionShape, pattern: reference('patterns') })).min(1),
  }),
});

const scenes = defineCollection({
  loader: file('src/data/scenes.yaml'),
  schema: z.strictObject({
    ...sceneShape,
    pattern: reference('patterns'),
    trace: reference('traces').optional(),
  }),
});

const traces = defineCollection({
  loader: glob({ base: './src/data/traces', pattern: '*.json' }),
  schema: traceSchema,
});

export const collections = { patterns, status, target, standards, problems, arrows, scenes, traces };
