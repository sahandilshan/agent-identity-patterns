# Agent Identity Patterns

A site that shows developers and enterprises how to build agent solutions properly, problem by problem. Each problem leads to a pattern built on open standards, the core flows are shown in recorded runs of a demo app (in progress), and ThunderID is the implementation underneath.

**Status:** preview. The site deploys to GitHub Pages as a preview: every page carries a preview banner and a noindex tag, because every ThunderID status claim is still Unverified and every pattern page is a draft. The launch build fails until every claim is verified and every page is finished.

## Develop

Needs Node 24 (`.nvmrc`); pnpm comes from the `packageManager` field.

```bash
pnpm install
```

```bash
pnpm run dev
```

```bash
pnpm run ci
```

`pnpm run ci` runs the type check, the text check, the tests, the build (with the content rules) and the link check. `pnpm run ci:launch` adds the launch gate, which fails until every claim is verified against a target ThunderID release and every page is finished.

## Repository layout

| Path | What it holds |
|---|---|
| [docs/plan/site-structure.md](docs/plan/site-structure.md) | The site plan: navigation, pages, pattern page template, demo approach |
| [docs/plan/scaffold.md](docs/plan/scaffold.md) | The Astro scaffold plan: versions, layout, content model, components, quality gates, workflows |
| [docs/context/concept.md](docs/context/concept.md) | The source concept: stack map, six problems, Four A's, vocabulary, seven patterns and beyond |
| [docs/context/wayfinder-demo.md](docs/context/wayfinder-demo.md) | The demo: cast, scenes, expected tokens, sample issues to fix |
| [docs/context/decisions.md](docs/context/decisions.md) | Decisions, recommendations and open questions |
| [AGENTS.md](AGENTS.md) | Instructions for coding agents working in this repository |
| `src/content/patterns/` | One MDX page per pattern, written with the template components |
| `src/data/` | Status claims and the target release, standards, problems, stack map arrows, scenes, traces |
| `src/lib/content-rules.ts` | The rules the build enforces across content, including the launch gate |
| `src/components/`, `src/layouts/`, `src/pages/` | The site |
| `scripts/` | Text (no em dashes) and link checks |
| `.github/workflows/` | CI, deploy to GitHub Pages, and the weekly ThunderID release check |
