# Scaffold Plan

Status: approved 2026-10-22. The first PR is built on the `site-scaffold` branch; this file describes what it contains.

It follows the decisions in [../context/decisions.md](../context/decisions.md): Astro with static output, SVG components, one Preact island for the player, the stack-map pattern order, names without numbers, and the approved home page mock-up. Package versions were read from the npm registry on 2026-10-22. Astro behaviour was checked in the Astro docs and in the published `astro` 7.4.2 and 7.4.1 packages on the same day.

## What the first PR delivers

- An Astro project at the repository root, with `docs/` left as project notes that are never published.
- The content model, with schemas and build-time checks that enforce the honest status rule.
- The home page, ported from the approved mock, with the stack map working without JavaScript.
- The pattern page route and template layout, with one draft stub.
- CI, deploy and release-check workflow files, inert until the GitHub remote exists.

Not in the first PR: the step-through player (PR 2), pattern content (PR 3), the patched Wayfinder copy, the recorder and real traces (PR 4). Creating the remote, pushing and enabling Pages wait for Sahan's go-ahead.

## Versions (pinned exactly)

| Package | Version | Note |
|---|---|---|
| `astro` | 7.4.1 | Needs Node 22.22.0 or later. |
| `@astrojs/mdx` | 8.1.0 | Its required peer, `@astrojs/markdown-satteri`, already comes with `astro`. |
| `@astrojs/check` | 0.9.11 | Its peer range is TypeScript 5 or 6. |
| `typescript` | 6.0.3 | TypeScript 7.0.2 is current, but `@astrojs/check` does not support it yet. |
| `vitest` | 5.0.5 | Node 22.12+, 24, or 26 and later. |
| `@fontsource-variable/instrument-sans` | 5.3.0 | OFL-1.1, self-hosted. The mock loaded Google Fonts; the site will not. |
| `@fontsource-variable/jetbrains-mono` | 5.3.0 | OFL-1.1, self-hosted. |
| `@astrojs/preact`, `preact` | 6.1.1, 11.0.1 | Added in PR 2 with the player, not before. |

- Node 24, pinned in `.nvmrc` (local is v24.12.0; the Astro deploy action defaults to 24).
- pnpm 12.14.0, pinned in the `packageManager` field. `.npmrc` sets `save-exact=true`, because `pnpm add` and `astro add` otherwise write `^` ranges. The lockfile is committed.
- pnpm 12 refuses versions published too recently, as a supply-chain safeguard. The first plan named astro 7.4.2, `@astrojs/mdx` 8.1.1 and `@astrojs/check` 0.9.12, all published on 2026-10-21; asking for them exactly made pnpm write exemptions that bypass the safeguard. The scaffold instead pins the newest versions pnpm accepts (built 2026-10-22), and never adds release-age exemptions.
- Fonts: Astro 7's Fonts API (`fontProviders.fontsource()`) could replace both font packages and adds preload links, but it downloads the fonts during the build. The packages keep the font files fixed by the lockfile, so builds are reproducible. Recommendation: the packages.

## Repository layout

```text
.
├── astro.config.mjs
├── package.json, pnpm-lock.yaml, tsconfig.json, .nvmrc, .npmrc
├── docs/                         project notes, not published
├── public/                       favicon, robots.txt
├── scripts/
│   ├── check-text.mjs            em dash and " -- " scan, outside code
│   └── check-links.mjs           internal links and anchors in dist/
├── src/
│   ├── content.config.ts         collections: plain schemas plus reference() fields
│   ├── schemas/                  plain zod schemas, importable by tests
│   ├── content/patterns/*.mdx    one file per pattern
│   ├── data/
│   │   ├── thunderid-target.yaml release and full commit the site targets
│   │   ├── thunderid-status.yaml one entry per capability claim
│   │   ├── standards.yaml        RFCs, OpenID specs, drafts
│   │   ├── problems.yaml         the six problems
│   │   ├── stack-map.yaml        arrows, their questions and patterns
│   │   ├── scenes.yaml           Wayfinder scenes
│   │   └── traces/*.json         recorded runs (PR 4)
│   ├── components/               Astro components
│   ├── layouts/                  BaseLayout, PatternLayout
│   ├── lib/
│   │   ├── url.ts                base-aware link helper
│   │   └── assert-content.ts     cross-collection rules, run during the build
│   ├── pages/                    routes
│   └── styles/                   tokens.css, global.css
├── tests/                        Vitest
└── .github/workflows/            ci.yml, deploy.yml, thunderid-release-check.yml
```

## Configuration

- `astro.config.mjs`: `site: 'https://sahandilshan.github.io'` (the account `gh` is signed in as; confirm it is the one for this site), `base: '/agent-identity-patterns'`, `trailingSlash: 'always'`, integrations `[mdx()]`, static output with no adapter.
- `tsconfig.json`: extends `astro/tsconfigs/strictest`.
- `src/lib/url.ts`: one `href()` helper builds every internal link from `import.meta.env.BASE_URL`. The link check fails on any root-relative link that skips the base, so a later custom domain stays a config change.

## Content model

Collections live in `src/content.config.ts`, using the `glob()` and `file()` loaders from `astro/loaders` and `z` from `astro/zod`. Collection order is not deterministic, so every list sorts explicitly by group and order.

| Collection | Loader | Holds |
|---|---|---|
| `patterns` | `glob` over `src/content/patterns/*.mdx` | Title, summary, group (the six stack-map groups), order within the group, internal concept ID (optional, never rendered), status (`reference('status')`), standards (`reference('standards')[]`), Four A's, problem (`reference('problems')`), `draft`. The arrows a pattern sits on and its scene are derived from `stack-map.yaml` and `scenes.yaml`, so the relation is stored once. Use when and not when are prose in the body. |
| `status` | `file` over `thunderid-status.yaml` | Label (`Supported`, `Partial`, `Planned` or `Unverified`), a one-line qualifier, verified release, verified commit, verified date, evidence (repository paths with line ranges), tracking issue (optional). |
| `standards` | `file` | Name, kind (RFC, OpenID, IETF draft, other), URL. |
| `problems` | `file` | Title, what happens, Four A's. The patterns that answer it are derived from pattern frontmatter. |
| `arrows` | `file` over `stack-map.yaml` | Arrow ID, side, the question it raises, what goes wrong without a pattern, Four A's, and its patterns in chooser order, each with a condition label ("No user needed") and its token difference. |
| `scenes` | `file` | Title, pattern, trace, the claim that changes. |
| `traces` | `glob` over `src/data/traces/*.json` | Defined now, filled in PR 4 (see below). |

### The honest status rule, as code

Each rule sits where it is actually enforced:

- **Shape, in the schema.** Astro 7.4 throws `InvalidContentEntryDataError` when an entry fails its schema, so the build fails (the docs do not say this; the package code does). The status schema is a union keyed on the label: `Supported`, `Partial` and `Planned` require a release, a full 40-character commit, a date and evidence. `Unverified` requires none of them.
- **Across collections, in `assertContent()`.** Astro 7.4 only logs an error when a `reference()` points to a missing entry, and a missing data file loads as an empty collection. So `src/lib/assert-content.ts` runs inside the build, where `getCollection()` works. `BaseLayout` calls it, so it runs on every build whichever pages exist, and once per build. A thrown error fails the build. The rules themselves are in `src/lib/content-rules.ts`, free of `astro:content`, so Vitest tests them. It checks:
  - that every reference resolves;
  - that no collection is empty;
  - that every verified status commit equals the target commit, so bumping the target makes every claim fail until it is re-verified, in one reviewable change;
  - that each pattern page has every template section, once and in order.
  - that every status entry is used by a pattern;
  - that the arrows in `stack-map.yaml` are exactly the arrows `StackMap` draws, and every pattern sits on at least one;
  - that no pattern has two scenes, and every recorded trace comes from the target commit;
  - that a pattern page without a body is a draft.
- **The launch gate.** With `LAUNCH=true` (an `astro:env` boolean), the build also fails on any `Unverified` status, `draft` pattern or page (the stub pages are drafts), template placeholder (`Pending`), synthetic trace, scene without a recorded trace, unset target release, or missing footer author line. CI builds without it, so PR 1 is green while every claim is still `Unverified`. The deploy workflow builds with it once the repository variable `SITE_LAUNCHED` is `true`; before that it deploys marked previews (see Workflows). Development builds show `Unverified` as the dashed "To verify" chip from the mock.
- **Text, in `scripts/check-text.mjs`.** A plain Node scan for em dashes and ` -- ` in published text under `src/content`, `src/data`, `src/pages`, `src/components`, `src/layouts`, `src/lib` and `src/schemas`, skipping code spans and code blocks.

`reference()` comes from `astro:content`, which only exists inside Astro. The schemas in `src/schemas/` are therefore plain zod, and `content.config.ts` adds the `reference()` fields. Vitest tests the plain schemas, including failing cases such as a verified entry without a commit.

Status chips take a status ID, never a literal label. An inline `<Claim status="...">` component marks capability statements in prose, so they render with their chip. A claim written as plain prose without it cannot be detected; the PR template asks reviewers to look for those.

### Pattern page template

`PatternLayout` renders the header, the mini stack map with the page's arrows highlighted, and the status and standards chips. The MDX body uses one template component per section, in the fixed order from the site plan: the failure, use when and not when, flow, token, see it run, build it, get it wrong, for architects. The `[slug]` page passes the template components to `<Content components={...} />`, so MDX files use them without imports, and sets `Astro.locals.pattern` so that data components (such as `SeeItRun`) can read the entry. Sections whose content arrives later render through `Pending`, which a launch build refuses.

### Trace format (defined now, used from PR 2)

- `meta`: ThunderID release and full commit, recording date, Wayfinder patch set version, and `synthetic` (true only for test fixtures).
- `actors`: ID, kind (person, application, agent, resource, identity provider), label.
- `steps`: ID, from, to, label, kind (request, response, redirect, user action), optional HTTP method, path without query string and status, optional decoded token header and claims, note.
- Safety is an allowlist, not a denylist: token headers may carry only `alg`, `typ` and `kid`; claims only a fixed set (`iss`, `sub`, `aud`, `exp`, `iat`, `nbf`, `act`, `client_id`, `scope` and the other registered claims the patterns need). Any other key fails, so opaque tokens, authorization codes and `auth_req_id` values cannot slip in. No string may have the shape of a compact JWT, and no step carries a request or response body.

## Components

| Component | Purpose |
|---|---|
| `BaseLayout`, `SiteHeader`, `SiteFooter` | Page shell, skip link, self-hosted fonts, tokens. |
| `StackMap` | The SVG map from the mock. A `variant` prop gives `full` (home) or `mini` (pattern pages); a `highlight` prop takes arrow IDs. Geometry lives in the component; meaning comes from `stack-map.yaml`. |
| `ArrowPanel` | The panel for one arrow: question, what goes wrong, its patterns with token chips and status. |
| `StatusChip`, `StandardChip`, `Claim` | Chips and inline claims driven by data IDs. |
| `Glyph` | The identity icons, with fixed colours per kind. |
| `TokenClaims` | Static `sub`, `act`, `aud` and `scope` chips. The diffing token card comes with the player in PR 2. |
| `PatternCard`, `ProblemCard`, `SceneCard` | Home and index cards. |

**Stack map without JavaScript:**

- **Targets:** each arrow's button is a link to `#arrow-<id>`. The target elements are empty anchors at the top of the map container, so following a link scrolls only to the map's top. Links like `/#arrow-mcp` can be shared.
- **Panels:** all panels are rendered on the server. `.stack-map:has(#arrow-mcp:target)` shows that arrow's panel and highlights its arrow. The default MCP panel shows under `.stack-map:not(:has([id^="arrow-"]:target))`, which is scoped to the map, so the skip link's `#main` target does not hide it.
- **Fallback:** where `:has()` is unsupported, `@supports not selector(:has(*))` shows every panel as a list.
- **Focus:** each panel has a heading and `tabindex="-1"`. A small optional script moves focus to the chosen panel's heading with `preventScroll`. It never rewrites the URL, because `pushState` and `replaceState` do not update `:target`.
- **History:** every choice adds a history entry, so Back returns to the previous arrow. This is accepted.
- **Narrow screens:** the map becomes the same links as a list, as in the mock.

## Styles

- `src/styles/tokens.css` carries the mock's values as custom properties: ground, ink, muted text, rules, the five identity-kind colours, the accent, status chip colours, type scale and radii.
- Plain CSS with Astro's scoped styles. No Tailwind: the mock's values carry over directly, and there is one dependency fewer.
- Light theme only for now; tokens are named so a dark theme can be added (open question).

## Pages in the first PR

| Route | Content |
|---|---|
| `/` | The home page from the mock, built from the data files. |
| `/patterns/` | Patterns by group. |
| `/patterns/[slug]/` | `PatternLayout`, from the collection; one draft stub. |
| `/problem/`, `/demo/`, `/build/` | Stubs so navigation resolves; filled in later PRs. |
| `404` | Not-found page. |

## Quality gates

- `pnpm run ci` runs `astro check`, `check-text`, `vitest`, `astro build` (with `assertContent()` inside) and `check-links`, in that order.
- `pnpm run ci:launch` runs the same with `LAUNCH=true`.
- The link check confirms that every internal `href` and `src` in `dist/` resolves under the base path, and that `#arrow-*` anchors exist. It also checks indexing: in a preview build every page must carry `noindex`, and in a launch build none may.
- An automated accessibility check (axe through Playwright) arrives in PR 2, when the player gives it keyboard behaviour worth testing. It also covers the map.

## Workflows

All three are written in the first PR and do nothing until the remote exists and Sahan enables Pages. Every action is pinned to a full commit SHA.

- **`ci.yml`:** on pull requests and pushes, `pnpm install --frozen-lockfile`, then `pnpm run ci`.
- **`deploy.yml`:** the workflow from Astro's GitHub Pages guide. It triggers on pushes to `main` and on manual runs, with read access to contents and write access to Pages and `id-token`. It uses `actions/checkout` (v7), `withastro/action` (v6) and `actions/deploy-pages` (v5). Pages source: GitHub Actions.
  - Until the repository variable `SITE_LAUNCHED` is `true`, it deploys a preview: `build-cmd` is `pnpm run ci`, so every gate except the launch gate runs. A preview build shows a banner on every page and marks every page `noindex` (decided 2026-10-23).
  - Once `SITE_LAUNCHED` is `true`, `build-cmd` is `pnpm run ci:launch`, so nothing deploys while a claim is Unverified or a page is unfinished.
  - `robots.txt` cannot help a preview: on a project Pages site, crawlers read it only at the domain root, so `noindex` does the work.
- **`thunderid-release-check.yml`:** weekly and on manual runs, with read access to contents and write access to issues. It reads the latest stable release with `gh release list -R thunder-id/thunderid --exclude-pre-releases --limit 1` (the latest is v1.0.1, 2026-08-25). If that release is newer than `thunderid-target.yaml` and no open issue has its title, it opens one in this repository.
  - GitHub disables scheduled workflows in a public repository after 60 days without activity, and emails a warning first.
  - This is accepted: the footer's "verified against" stamp shows staleness publicly in any case.

## Later PRs

| PR | Delivers |
|---|---|
| 2 | Preact, the `SequencePlayer` island (renders every step as a list before hydration, then becomes the player), the diffing token card, synthetic trace fixtures for tests, axe checks. |
| 3 | Pattern pages, the problem page and the build page, one pattern per PR or in small groups. |
| 4 | The pinned, patched Wayfinder copy, the trace recorder with redaction, real traces, and status verification against the target release. |

## Open questions

- **Target release.** The latest stable ThunderID release is v1.0.1 (2026-08-25). The status claims so far were code-inspected on main: all at `8459a404`, a few rechecked at `6f774bb5`. None was checked against a release, and recent agent work, such as the ID-JAG console change merged on 2026-10-22, is not in v1.0.1. Target v1.0.1, or the next release? This sets the launch date, not the scaffold. Until it is chosen, every status entry stays `Unverified`.
- **Account.** Confirm that `sahandilshan` is the personal account for the site.
- **Dark theme.** Needed at launch?
