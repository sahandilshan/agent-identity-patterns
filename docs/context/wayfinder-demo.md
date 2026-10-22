# Demo: Wayfinder

Wayfinder is the demo application for the site. It is a travel-booking app with a chat Concierge agent, and it lives in the ThunderID repository at `samples/apps/wayfinder-sample`. A Python Concierge alternative is open as thunder-id/thunderid#5884 (Sahan's PR).

The site does not copy the sample. It links to it, or pins a tagged version, and replays traces recorded from real runs.

Everything below was code-inspected at `thunder-id/thunderid` main `8459a404` (2026-10-14). None of it was runtime-tested. Rehearse it on the build you record from.

## Cast

| Kind | Identity | Details |
|---|---|---|
| Person | John Doe (`john.doe`) | Can chat and book. Holds Chat User, Traveler, Booking User. |
| Person | Jane Smith (`jane.smith`) | Can book in the app; no chat access. Holds Traveler, Booking User. |
| Application | Wayfinder (`WAYFINDER`) | Public SPA, authorization code with PKCE. Users sign in here and it requests the chat token. |
| Agent | Wayfinder Concierge (`WAYFINDER-CONCIERGE`) | Client credentials and authorization code, `client_secret_basic`, redirect `http://localhost:5173/agent-callback`, flow `wayfinder-agent-auth-flow`. |
| Agent | Upgrade Agent (`WAYFINDER-UPGRADE-AGENT`) | Client credentials and CIBA, flow `wayfinder-ciba-email-flow`. |
| Resource server | Wayfinder Agent (`wayfinder-agent-rs`) | The Concierge's chat endpoint, `http://localhost:8790/chat`, permission `agent:access`. |
| Resource server | Wayfinder Booking (`wayfinder-booking-rs`) | MCP server at `http://localhost:8787/mcp`, with permissions `booking:read/create/cancel/recommend/upgrade` and `upgrade:read/search/process`. |

**Roles:**

| Role | Permissions | Assigned to |
|---|---|---|
| Chat User | `agent:access`, `booking:upgrade`, `upgrade:process` | John |
| Traveler, Booking User | `booking:read/create/cancel` | John, Jane |
| Recommender | `booking:recommend`, `upgrade:search` | the Concierge |
| Upgrade Scheduler | `upgrade:read`, `upgrade:search` | the Upgrade Agent |

**Why two agents:** an agent's sign-in flow is shared by authorization code and CIBA, and those need different flows (interactive versus notification).

**Setup:**
1. Import `thunderid-config/redirect/thunderid-config.yaml` with `thunderid.env` from the Console welcome screen.
2. Create `ai-agent/.env` before starting.
3. Run `npm run dev`. That starts the frontend `:5173`, the booking backend and MCP server `:8787`, the agent `:8790`, the mock SMTP inbox `:8788`, and the lounge `:8795`.

## Scenes

### Scene 1: Who may talk to the Concierge (pattern 3, plus pattern 2)

1. John signs in. His first chat message makes the app request a token with `resource` set to the chat endpoint and scope `agent:access`.
2. Only Chat User grants `agent:access`. Jane lacks it, so the Concierge refuses her with a 403.

```json
{ "sub": "wayfinder-john-doe", "client_id": "WAYFINDER", "aud": "http://localhost:8790/chat", "scope": "agent:access" }
```

### Scene 2: Deals on the agent's own authority (pattern 4)

1. John asks for flight deals. No user authority is needed.
2. The Concierge requests a client credentials token for the MCP server, asking for `booking:recommend upgrade:search`.
3. ThunderID keeps only the scopes the agent's roles allow.
4. The MCP server sees an agent caller, not John.

```json
{ "sub": "wayfinder-concierge", "client_id": "WAYFINDER-CONCIERGE", "aud": "http://localhost:8787/mcp", "scope": "booking:recommend upgrade:search" }
```

### Scene 3: Booking on John's behalf (pattern 5)

1. John asks to book.
2. The Concierge answers `need_user_consent`, and a popup runs authorization code with PKCE through the Concierge's own client.
3. John signs in and consents.
4. The Concierge redeems the code and calls `create_booking`.

```json
{ "sub": "wayfinder-john-doe", "act": { "sub": "wayfinder-concierge" }, "client_id": "WAYFINDER-CONCIERGE", "aud": "http://localhost:8787/mcp", "scope": "openid booking:create ..." }
```

Compared with Scene 2, it is the same agent and the same client but a different subject. The `act` claim makes the delegation visible.

### Scene 4: Background upgrade approved out of band (pattern 6)

1. John asks for a Business upgrade that is not available yet. The Concierge records an upgrade request.
2. Later, the Upgrade Agent finds the request with its own token and starts CIBA for John with a binding message.
3. John approves from the email in the mock inbox.
4. The agent's poll succeeds and it processes the upgrade.

```json
{ "sub": "wayfinder-john-doe", "act": { "sub": "wayfinder-upgrade-agent" }, "client_id": "WAYFINDER-UPGRADE-AGENT", "aud": "http://localhost:8787/mcp", "scope": "openid upgrade:process" }
```

### Scene 5 (to build): Multi-agent delegation (pattern 7)

There is no scene yet. One idea: the Concierge hands a narrowed search to a worker agent through token exchange.

## Recap

| Scene | Pattern | Grant | Subject | Actor | Audience |
|---|---|---|---|---|---|
| 1 Chat access | 3 Agent as resource | Authorization code (app) | John | none | Agent endpoint |
| 2 Deals | 4 Own authority | Client credentials | Concierge | none | Booking MCP |
| 3 Booking | 5 JIT delegation | Authorization code (agent) | John | Concierge | Booking MCP |
| 4 Upgrade | 6 CIBA | CIBA, poll | John | Upgrade Agent | Booking MCP |

Patterns 1 and 2 underpin every scene: registered agents with their own clients, and an MCP server protected by ThunderID-issued tokens.

## Known sample issues to fix before recording

A site about doing this properly cannot replay a sample that does it improperly. All of these were found at `8459a404`; recheck them on current main.

- **Chat gate:** the agent only decodes the JWT payload and checks scope (`ai-agent/agent.ts:319-326`, `995-1036`). It does not verify signature, issuer, audience or expiry, although the README says it validates the token.
  Still present on main `7551bbb2` (2026-10-22): the agent decodes the payload with base64url (`agent.ts:322`), and the file has no JWKS or signature verification calls.
- **Backend audience check:** the backend verifies signature, issuer and expiry, but checks audience only when `THUNDER_AUDIENCE` is set, and `.env.example` does not set it (`backend/src/auth.js:80-100`). The conditional check is still present on main `7551bbb2`.
- **CIBA order:** `process_upgrade` fails while Business is locked (`backend/src/mcp.js:498-500`). If Business is unlocked when John asks, the Concierge upgrades directly and CIBA never runs. Working order, inferred from code: lock, request the upgrade, unlock, run `scripts/trigger-upgrade.sh`, approve within 120 seconds.
- **LLM key variable:** the code reads `LLM_API_KEY`; the README and Console guide name `ANTHROPIC_API_KEY` or `GOOGLE_API_KEY`.
- **Scheduler:** do not enable `UPGRADE_SCHEDULER_ENABLED`. Failed cycles loop and resend emails.
- **Denied consent:** a denied permission persists for the agent session with no re-consent prompt.
- **First chat message:** the README says there is no popup, but the first chat message opens one.
- **No pattern 7 scene.**
