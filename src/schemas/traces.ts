import { z } from 'astro/zod';
import { COMMIT_RE, RELEASE_RE } from './common';

/**
 * Recorded runs are published, so the schema is an allowlist: a key that is
 * not listed here fails validation, and so does any value that looks like a
 * JWT. Tokens appear only as decoded claims, never as strings or signatures.
 */

const JWT_LIKE = /eyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}/;

type ActClaim = { sub: string; iss?: string | undefined; act?: ActClaim | undefined };
const actClaim: z.ZodType<ActClaim> = z.lazy(() =>
  z.strictObject({
    sub: z.string().min(1),
    iss: z.string().optional(),
    act: actClaim.optional(),
  }),
);

const claims = z.strictObject({
  iss: z.string().optional(),
  sub: z.string().optional(),
  aud: z.union([z.string(), z.array(z.string())]).optional(),
  exp: z.number().int().optional(),
  iat: z.number().int().optional(),
  nbf: z.number().int().optional(),
  auth_time: z.number().int().optional(),
  act: actClaim.optional(),
  client_id: z.string().optional(),
  azp: z.string().optional(),
  scope: z.string().optional(),
});

const header = z.strictObject({
  alg: z.string(),
  typ: z.string().optional(),
  kid: z.string().optional(),
});

const step = z.strictObject({
  id: z.string().min(1),
  from: z.string().min(1),
  to: z.string().min(1),
  label: z.string().min(1),
  kind: z.enum(['request', 'response', 'redirect', 'user-action']),
  http: z
    .strictObject({
      method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE']).optional(),
      /** Path only: no query string or fragment, which can carry codes. */
      path: z.string().regex(/^\/[^?#]*$/),
      status: z.number().int().optional(),
    })
    .optional(),
  token: z.strictObject({ header, claims }).optional(),
  note: z.string().optional(),
});

function findJwtLike(value: unknown, path: string): string | undefined {
  if (typeof value === 'string') return JWT_LIKE.test(value) ? path : undefined;
  if (Array.isArray(value)) {
    for (const [i, item] of value.entries()) {
      const hit = findJwtLike(item, `${path}[${i}]`);
      if (hit) return hit;
    }
    return undefined;
  }
  if (value && typeof value === 'object') {
    for (const [key, item] of Object.entries(value)) {
      const hit = findJwtLike(item, path ? `${path}.${key}` : key);
      if (hit) return hit;
    }
  }
  return undefined;
}

export const traceSchema = z
  .strictObject({
    meta: z.strictObject({
      release: z.string().regex(RELEASE_RE),
      commit: z.string().regex(COMMIT_RE),
      recordedOn: z.coerce.date(),
      /** Version of the Wayfinder patch set the run used. */
      patchSet: z.string().min(1),
      /** True only for test fixtures. Never published. */
      synthetic: z.boolean(),
    }),
    actors: z
      .array(
        z.strictObject({
          id: z.string().min(1),
          kind: z.enum(['person', 'application', 'agent', 'resource', 'identity-provider']),
          label: z.string().min(1),
        }),
      )
      .min(2),
    steps: z.array(step).min(1),
  })
  .superRefine((trace, ctx) => {
    const actorIds = new Set(trace.actors.map((a) => a.id));
    for (const [i, s] of trace.steps.entries()) {
      for (const end of ['from', 'to'] as const) {
        if (!actorIds.has(s[end])) {
          ctx.addIssue({ code: 'custom', path: ['steps', i, end], message: `Unknown actor "${s[end]}"` });
        }
      }
    }
    const jwtAt = findJwtLike(trace, '');
    if (jwtAt) {
      ctx.addIssue({ code: 'custom', path: [], message: `Value at ${jwtAt} looks like a JWT; store decoded claims only` });
    }
  });
export type Trace = z.infer<typeof traceSchema>;
