import { z } from 'astro/zod';
import { fourA, tokenChip } from './common';

export const standardSchema = z.strictObject({
  name: z.string().min(1),
  kind: z.enum(['RFC', 'OpenID', 'IETF draft', 'Other']),
  url: z.url(),
});

export const problemSchema = z.strictObject({
  order: z.number().int().positive(),
  title: z.string().min(1),
  happens: z.string().min(1),
  fourAs: z.array(fourA).min(1),
});

/** A scene, without its references. `content.config.ts` adds `pattern` and `trace`. */
export const sceneShape = {
  order: z.number().int().positive(),
  title: z.string().min(1),
  /** The claims a teaser card shows. Replaced by the recorded trace once it exists. */
  preview: z.array(tokenChip).min(1),
  note: z.string().min(1).optional(),
};
