## What changes

## Checklist

- [ ] Every ThunderID capability statement in prose is wrapped in `<Claim status="...">`, so it shows its status chip. The build cannot find a claim written as plain text.
- [ ] Status changes in `src/data/thunderid-status.yaml` cite code evidence at the target release's commit.
- [ ] Snippets and demos validate tokens fully: signature, issuer, audience, expiry, then scope.
- [ ] No WSO2-internal material, internal sessions or local branches are cited.
- [ ] `pnpm run ci` passes locally.
