import { z } from 'astro/zod';

export const FOUR_AS = ['Administer', 'Authenticate', 'Authorize', 'Audit'] as const;
export const fourA = z.enum(FOUR_AS);

/** A full Git commit. Short hashes are refused so equality checks are exact. */
export const COMMIT_RE = /^[0-9a-f]{40}$/;
export const RELEASE_RE = /^v\d+\.\d+\.\d+$/;
/** An issue reference such as `thunder-id/thunderid#5662`. */
export const ISSUE_REF_RE = /^[\w.-]+\/[\w.-]+#\d+$/;

/** How a token value is coloured: by the kind of identity it names. */
export const TOKEN_KINDS = ['person', 'agent', 'resource', 'plain'] as const;

export const tokenChip = z.strictObject({
  claim: z.string().min(1),
  value: z.string().min(1),
  kind: z.enum(TOKEN_KINDS),
});
export type TokenChip = z.infer<typeof tokenChip>;
