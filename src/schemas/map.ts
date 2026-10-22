import { z } from 'astro/zod';
import { tokenChip } from './common';

/**
 * Arrow IDs drawn by `StackMap.astro`. The geometry lives in the component,
 * so `stack-map.yaml` must define exactly these arrows.
 */
export const ARROW_IDS = ['agent', 'inbound', 'llm', 'mcp', 'sub', 'saas', 'domain'] as const;
export type ArrowId = (typeof ARROW_IDS)[number];

/** Shown when no arrow is chosen. */
export const DEFAULT_ARROW: ArrowId = 'mcp';

export const SIDES = ['inbound', 'agent', 'outbound', 'beyond'] as const;

export const SIDE_LABELS: Record<(typeof SIDES)[number], string> = {
  inbound: 'Who calls the agent',
  agent: 'The agent',
  outbound: 'What the agent calls',
  beyond: 'Across a trust boundary',
};

/** One choice on an arrow, without its pattern reference. */
export const arrowOptionShape = {
  /** When this pattern applies, such as "No user needed". */
  condition: z.string().min(1),
  /** The token difference this choice makes. */
  tokens: z.array(tokenChip).min(1),
};

/** An arrow, without its options. `content.config.ts` adds `options`. */
export const arrowShape = {
  side: z.enum(SIDES),
  order: z.number().int().positive(),
  /** Name in the narrow-screen list. */
  label: z.string().min(1),
  /** Button text on the arrow. */
  ask: z.string().min(1),
  eyebrow: z.string().min(1),
  question: z.string().min(1),
  without: z.string().min(1),
};
