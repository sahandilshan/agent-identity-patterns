# Site Structure

Status: starting plan, sketched 2026-10-22. It is built from the concept in [../context/concept.md](../context/concept.md) and the demo in [../context/wayfinder-demo.md](../context/wayfinder-demo.md). The site is standalone and does not depend on the ThunderID docs.

## Thesis

Agents are not users and not service accounts. Every arrow an agent touches needs authentication, authorization and audit. Each problem on the site maps to a pattern, each pattern runs in a real demo, and ThunderID is the implementation underneath.

## Top navigation

The problem · Patterns · Live demo · Build it with ThunderID

## 1. Home

- **Hero:** one-line thesis, plus two entry buttons: "I'm building an agent" (developers) and "I'm governing agents" (architects, security, enterprise).
- **Stack map (signature visual and navigation):** the agent in the centre.
  - Inbound: users, applications, other agents.
  - Outbound: LLM providers, MCP servers and APIs, external SaaS, sub-agents.
  - Every arrow is clickable. It opens a panel with the question the arrow raises, what goes wrong without a pattern, and every pattern on that arrow (decided 2026-10-22 with the approved mock). Agent to MCP server opens a "whose authority?" chooser.
- **Six problems strip:** each card names the failure and the A it maps to.
- **Pattern grid:** the patterns in their stack-map groups, by name, each with a status chip.
- **Demo teaser:** the four Wayfinder scenes as thumbnails.

## 2. The problem

- **Agents reach across the stack:** the inbound and outbound split.
- **Six things that go wrong when an agent borrows an identity.** Each is a three-line story told with the Wayfinder cast:
  1. It has no identity of its own → Administer
  2. It holds a copied secret → Authenticate
  3. Nothing limits what it may do → Authorize
  4. Delegation leaves no trace → Authorize, Audit
  5. No one is there to approve → Authorize
  6. Anyone can call the agent → Authorize
- **The Four A's:** Administer, Authenticate, Authorize, Audit.
- **Shared vocabulary:**
  - Subject, actor and resource (`sub`, `act`, `aud`, `scope`), shown with "John books a flight through the Concierge".
  - The four ways an agent shows up: acting on its own, acting for a user, signing in as a subject, offering an app-like sign-in.

## 3. Patterns

The patterns are grouped by where they sit on the stack map, so the home visual and the pattern index read the same way. The concept's pattern numbers are kept in brackets.

| Group | Pattern | Status in ThunderID (code-inspected at main `8459a404`, recheck before launch) |
|---|---|---|
| Foundation | Register and manage agents (2) | Supported, lifecycle gaps |
| Inbound | Govern who may call the agent (3) | Configured pattern, first-class link planned |
| Outbound, own authority | Act on its own authority (4) | Supported |
| Outbound, user authority | Just-in-time user delegation (5) | Supported |
| Outbound, user authority | Out-of-band approval with CIBA (6) | Supported, poll mode |
| Outbound, user authority | Multi-agent delegation (7) | Partial: token exchange drops the subject token's `act`, so successive exchanges do not extend the delegation chain (rechecked at main `6f774bb5`, thunder-id/thunderid#5662) |
| The tools it calls | Secure an MCP server (1) | Supported, authorization server role |
| Across boundaries | Cross-domain access with ID-JAG | Supported with caveats |
| Across boundaries | LLM provider access without static keys | Documented pattern |
| Across boundaries | Call external SaaS for a user | Planned |

### Pattern page template (identical on every page)

1. **The failure:** a short story with the Wayfinder cast.
2. **Use when / not when.**
3. **Flow:** a step-through sequence diagram.
4. **The token:** decoded `sub`, `act`, `aud` and `scope` chips, highlighting what changed at each step.
5. **See it run:** the matching Wayfinder scene, replayed from a recorded real run.
6. **Build it:** standards-level steps plus TypeScript and Python snippets, then the ThunderID configuration.
7. **Get it wrong:** pitfalls such as skipping signature or audience checks, or scopes that are silently dropped.
8. **For architects:** which A it covers, what audit evidence exists, and governance questions.
9. **Chips:** the status chip, plus the standards involved (RFC 8693, OpenID CIBA, RFC 8707, ID-JAG draft, MCP authorization).

## 4. Live demo (Wayfinder)

- **Cast board:**
  - People: John (can chat and book), Jane (no chat access).
  - Application: the Wayfinder SPA.
  - Agents: the Concierge, the Upgrade Agent.
  - Resource servers: the agent's endpoint (`agent:access`), the Booking MCP server.
- **Scene player:** chat or app UI on the left, flow and token panel on the right, with step controls. Each scene links to its pattern page.
  1. Who may talk to the Concierge → pattern 3
  2. Deals on the agent's own authority → pattern 4
  3. Booking on John's behalf → pattern 5
  4. Background upgrade approved by email → pattern 6
  5. (To build) Concierge hands a narrowed task to a worker agent → pattern 7
- **Recap matrix:** scene, pattern, grant, subject, actor, audience.
- **Run it yourself:** a one-command local setup of ThunderID plus Wayfinder (TypeScript or the Python Concierge).

## 5. Build it with ThunderID

- **How ThunderID models an agent:** an agent is its own entity category, and one record holds the identity and its OAuth client.
- **Capability table:** pattern, ThunderID capability, status, standard.
- **Quickstart:** run ThunderID, import the Wayfinder resources, run a scene.
- **Go deeper:** outbound links to the ThunderID site and repository.

## Reusable visual components

- **Identity glyphs** with fixed colours: person, application, agent, resource/MCP server, ThunderID.
- **Stack map:** home hero, plus a mini version on each pattern page with its arrow highlighted.
- **Sequence step-through player.**
- **Token card** with chips that diff between steps.
- **Status and standards chips.**

## Demo approach

- **Phase 1:**
  - Recorded traces from a real Wayfinder run against a tagged ThunderID release, replayed in the browser and labelled with that version. Re-record on each release.
  - The one-command local run.
- **Later:** a hosted sandbox, only if people drop off at the local run.

## Before launch

- Harden Wayfinder so it shows correct practice:
  - The chat gate decoded the JWT and checked only scope, as of `8459a404`.
  - The CIBA scene needs a non-obvious order.
  - Recheck both on current main.
- Build the pattern 7 scene.
- Re-verify every status chip against the current release.

## Phase 2

- Reference architectures for enterprise:
  - customer-facing assistant;
  - workforce agents reaching internal MCP servers across domains;
  - background autonomous agents.
- Agent identity self-check: Four A's questions that point to the patterns you are missing.
- Framework variants: LangChain, Google ADK, Vercel AI SDK, CrewAI.
- Hosted sandbox.

## Open decisions

- **Where it lives:** decided. It is this repository, on Sahan's personal GitHub account, published with GitHub Pages. The domain and logo approach were decided on 2026-10-22 ([decisions.md](../context/decisions.md)); asking the maintainers about the logo is still open.
- **Voice:** standards-first with ThunderID as the implementation (recommended for credibility), or ThunderID-first.
- **Pattern order:** decided on 2026-10-22: the stack-map grouping above, with names and slugs and no public numbers. The bracketed numbers are internal IDs only.
