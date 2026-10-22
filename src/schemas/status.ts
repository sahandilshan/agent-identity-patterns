import { z } from 'astro/zod';
import { COMMIT_RE, ISSUE_REF_RE, RELEASE_RE } from './common';

export const VERIFIED_LABELS = ['Supported', 'Partial', 'Planned'] as const;

const shared = {
  /** One line shown beside the chip, such as "Poll mode only." */
  qualifier: z.string().min(1).optional(),
  tracking: z.string().regex(ISSUE_REF_RE).optional(),
};

/** A claim checked against the code of the target release, with evidence. */
const verified = z.strictObject({
  label: z.enum(VERIFIED_LABELS),
  release: z.string().regex(RELEASE_RE),
  commit: z.string().regex(COMMIT_RE),
  verifiedOn: z.coerce.date(),
  evidence: z
    .array(
      z.strictObject({
        path: z.string().min(1),
        lines: z
          .string()
          .regex(/^\d+(-\d+)?$/)
          .optional(),
      }),
    )
    .min(1),
  ...shared,
});

/** A claim nobody has checked against the target release yet. */
const unverified = z.strictObject({
  label: z.literal('Unverified'),
  ...shared,
});

export const statusSchema = z.discriminatedUnion('label', [verified, unverified]);
export type Status = z.infer<typeof statusSchema>;

/** The release every verified claim must match. Both fields stay null until a target is chosen. */
export const targetSchema = z.union([
  z.strictObject({ release: z.null(), commit: z.null() }),
  z.strictObject({ release: z.string().regex(RELEASE_RE), commit: z.string().regex(COMMIT_RE) }),
]);
export type Target = z.infer<typeof targetSchema>;
