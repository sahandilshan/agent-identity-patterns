# Decisions and Open Questions

This is the running log for the project. Add decisions with their date and reason. Never rewrite past entries; add a new entry that supersedes them.

## Origin (2026-10-22)

The idea is a site that shows how to build agent solutions properly, for developers and enterprises. It should have clear diagrams, strong visuals, and demos and samples people can try on the spot, with ThunderID applied as the implementation. It came from comparing the new thunderid.dev landing page with small solution-focused sites that explain one problem very clearly.

## Decisions

| Date | Decision | Reason |
|---|---|---|
| 2026-10-22 | The site stands on its own and does not rely on the ThunderID docs. | Sahan's direction. The ThunderID docs serve a different purpose; this site carries its own problem and solution story. |
| 2026-10-22 | The content is built from Sahan's concept and the Wayfinder demo ([concept.md](concept.md), [wayfinder-demo.md](wayfinder-demo.md)). | That material already frames the problems, patterns and scenes. |
| 2026-10-22 | It is a separate repository, `agent-identity-patterns`, on Sahan's personal GitHub account, published with GitHub Pages. | Independent from the ThunderID release cadence; static hosting fits recorded traces. |
| 2026-10-22 | The starting plan is [../plan/site-structure.md](../plan/site-structure.md). | Agreed as the base to build from. |

## Recommendations not yet decided

- **Demo, phase 1:** replay traces recorded from a real Wayfinder run against a tagged ThunderID release, plus a one-command local run. Build a hosted sandbox only if people drop off at the local run. GitHub Pages cannot host one anyway.
- **Voice:** standards-first (OAuth, RFC 8693, CIBA, RFC 8707, ID-JAG), with ThunderID as the implementation, for credibility with enterprises.
- **Status chips:** label each pattern Supported, Partial or Planned in ThunderID. Honest gaps are a differentiator.
- **Scope:** identity and authorization of agents only. Not orchestration, memory or evals.

## Open questions

- **Pattern order:** keep the concept's numbering (1 to 7), or the stack-map grouping in the site plan?
- **Custom domain:** do we want one, and how may the ThunderID name and logo be used under LF trademark rules?
- **Tech stack:** which static site framework, and how should the visuals (stack map, step-through player, token cards) be built?
- **Wayfinder fixes:** fix the known issues upstream in ThunderID before recording ([wayfinder-demo.md](wayfinder-demo.md#known-sample-issues-to-fix-before-recording)).
- **Pattern 7:** what should the multi-agent scene look like, and where does it live?
- **Ownership:** who keeps the traces and status chips current with each ThunderID release?
