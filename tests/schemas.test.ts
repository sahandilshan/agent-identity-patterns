import { describe, expect, it } from 'vitest';
import { statusSchema, targetSchema } from '../src/schemas/status';
import { traceSchema } from '../src/schemas/traces';

const COMMIT = '0123456789abcdef0123456789abcdef01234567';

describe('statusSchema', () => {
  const verified = {
    label: 'Partial',
    release: 'v1.2.0',
    commit: COMMIT,
    verifiedOn: '2026-10-22',
    evidence: [{ path: 'backend/internal/oauth/oauth2/granthandlers/token_exchange.go', lines: '219-272' }],
  };

  it('accepts a verified claim with release, full commit, date and evidence', () => {
    expect(statusSchema.safeParse(verified).success).toBe(true);
  });

  it.each(['release', 'commit', 'verifiedOn', 'evidence'] as const)('rejects a verified claim without %s', (field) => {
    const { [field]: _omitted, ...rest } = verified;
    expect(statusSchema.safeParse(rest).success).toBe(false);
  });

  it('rejects a short commit, so equality with the target is exact', () => {
    expect(statusSchema.safeParse({ ...verified, commit: COMMIT.slice(0, 7) }).success).toBe(false);
  });

  it('rejects empty evidence', () => {
    expect(statusSchema.safeParse({ ...verified, evidence: [] }).success).toBe(false);
  });

  it('rejects a label outside the four', () => {
    expect(statusSchema.safeParse({ ...verified, label: 'Documented pattern' }).success).toBe(false);
  });

  it('accepts Unverified with only a qualifier and tracking issue', () => {
    const r = statusSchema.safeParse({ label: 'Unverified', qualifier: 'Poll mode only.', tracking: 'thunder-id/thunderid#5662' });
    expect(r.success).toBe(true);
  });

  it('rejects verification fields on an Unverified claim, and unknown keys', () => {
    expect(statusSchema.safeParse({ label: 'Unverified', commit: COMMIT }).success).toBe(false);
    expect(statusSchema.safeParse({ ...verified, comit: COMMIT }).success).toBe(false);
  });

  it('rejects a malformed tracking reference', () => {
    expect(statusSchema.safeParse({ label: 'Unverified', tracking: '#5662' }).success).toBe(false);
  });
});

describe('targetSchema', () => {
  it('accepts both null, or a release with a full commit', () => {
    expect(targetSchema.safeParse({ release: null, commit: null }).success).toBe(true);
    expect(targetSchema.safeParse({ release: 'v1.0.1', commit: COMMIT }).success).toBe(true);
  });

  it('rejects a release without a commit', () => {
    expect(targetSchema.safeParse({ release: 'v1.0.1', commit: null }).success).toBe(false);
  });
});

describe('traceSchema', () => {
  const trace = () => ({
    meta: { release: 'v1.2.0', commit: COMMIT, recordedOn: '2026-10-22', patchSet: 'wayfinder-1', synthetic: true },
    actors: [
      { id: 'concierge', kind: 'agent', label: 'Wayfinder Concierge' },
      { id: 'thunderid', kind: 'identity-provider', label: 'ThunderID' },
    ],
    steps: [
      {
        id: 'token',
        from: 'thunderid',
        to: 'concierge',
        label: 'Access token',
        kind: 'response',
        http: { method: 'POST', path: '/oauth2/token', status: 200 },
        token: {
          header: { alg: 'RS256', typ: 'at+jwt', kid: 'k1' },
          claims: { sub: 'wayfinder-concierge', aud: 'http://localhost:8787/mcp', scope: 'booking:recommend', act: { sub: 'a', act: { sub: 'b' } } },
        },
      },
    ],
  });

  it('accepts decoded claims from the allowlist, with nested act', () => {
    expect(traceSchema.safeParse(trace()).success).toBe(true);
  });

  it('rejects a claim outside the allowlist, such as an opaque token', () => {
    const t = trace();
    (t.steps[0]!.token.claims as Record<string, unknown>)['refresh_token'] = 'opaque-value';
    expect(traceSchema.safeParse(t).success).toBe(false);
  });

  it('rejects a key outside the allowlist on a step, such as a request body', () => {
    const t = trace();
    (t.steps[0] as Record<string, unknown>)['body'] = { code: 'abc' };
    expect(traceSchema.safeParse(t).success).toBe(false);
  });

  it('rejects a path with a query string, which can carry an authorization code', () => {
    const t = trace();
    t.steps[0]!.http.path = '/callback?code=abc';
    expect(traceSchema.safeParse(t).success).toBe(false);
  });

  it('rejects any value shaped like a JWT, wherever it appears', () => {
    const t = trace();
    t.steps[0]!.label = 'eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJqb2huIn0.c2ln';
    const r = traceSchema.safeParse(t);
    expect(r.success).toBe(false);
    expect(JSON.stringify(r.error?.issues)).toContain('looks like a JWT');
  });

  it('rejects a step between unknown actors', () => {
    const t = trace();
    t.steps[0]!.to = 'nobody';
    expect(traceSchema.safeParse(t).success).toBe(false);
  });

  it('rejects a short commit', () => {
    const t = trace();
    t.meta.commit = COMMIT.slice(0, 7);
    expect(traceSchema.safeParse(t).success).toBe(false);
  });
});
