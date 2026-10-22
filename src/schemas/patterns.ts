import { z } from 'astro/zod';
import { fourA } from './common';

/** The stack-map groups, in reading order. */
export const GROUPS = ['foundation', 'inbound', 'outbound-own', 'outbound-user', 'tools', 'across'] as const;
export type Group = (typeof GROUPS)[number];

export const GROUP_LABELS: Record<Group, string> = {
  foundation: 'Foundation',
  inbound: 'Inbound',
  'outbound-own': 'Outbound, own authority',
  'outbound-user': 'Outbound, user authority',
  tools: 'The tools it calls',
  across: 'Across boundaries',
};

/**
 * Pattern frontmatter without its references. `content.config.ts` adds
 * `status`, `standards` and `problem` as `reference()` fields.
 * The arrows a pattern sits on and its scene are derived from
 * `stack-map.yaml` and `scenes.yaml`, so they are not repeated here.
 */
export const patternShape = {
  title: z.string().min(1),
  summary: z.string().min(1),
  group: z.enum(GROUPS),
  order: z.number().int().positive(),
  /** The concept's pattern number (1 to 7). Internal only, never rendered. */
  conceptId: z.number().int().min(1).max(7).optional(),
  fourAs: z.array(fourA).min(1),
  draft: z.boolean().default(false),
};

/**
 * The template sections every written pattern page uses, in order.
 * See docs/plan/site-structure.md, "Pattern page template".
 */
export const TEMPLATE_SECTIONS = [
  'Failure',
  'UseWhen',
  'Flow',
  'Token',
  'SeeItRun',
  'BuildIt',
  'GetItWrong',
  'ForArchitects',
] as const;
