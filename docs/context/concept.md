# Concept: Agent Identity Patterns

This is the source concept for the site: the problem framing, the vocabulary, and the patterns. It comes from Sahan's AgentID concept work (October 2026). Site pages should be derived from this file.

ThunderID status and limits below were code-inspected at `thunder-id/thunderid` main `8459a404` on 2026-10-14. They are not runtime-tested. Recheck each one against the release the site targets before publishing it.

## 1. Agents reach across the stack

The agent sits in the middle. Every arrow needs authentication, authorization and audit.

- **Inbound: who may invoke the agent.** Users, applications and other agents. Here the agent is the protected target.
- **Outbound: what the agent calls.** LLM providers, internal MCP servers and APIs, external systems and sub-agents. Here the agent is the caller, using its own authority or a user's.

## 2. What goes wrong when agents borrow identity

| Problem | What happens | Maps to |
|---|---|---|
| It has no identity of its own | Actions appear as a user or a shared service account, so no one can tell the agent acted. | Administer |
| It holds a copied secret | A borrowed password or shared API key: whoever holds it becomes the agent. | Authenticate |
| Nothing limits what it may do | Access is all or nothing, not the permissions this task needs. | Authorize |
| Delegation leaves no trace | The token cannot show that the agent acted for a user, or for which user. | Authorize, Audit |
| No one is there to approve | Background work has no way to ask the right person before it acts. | Authorize |
| Anyone can call the agent | The agent is an endpoint too, and needs its own access control. | Authorize |

## 3. The Four A's

| A | Meaning | In ThunderID |
|---|---|---|
| Administer | Establish and manage the agent's identity, ownership and configuration. | An agent record with agent type, owner, credentials, and role and group membership, in the Console or `/agents` API. |
| Authenticate | The agent proves its own identity, never with a borrowed user secret. | Client secret, private key JWT, or a public client with PKCE. Tokens can be DPoP-bound. |
| Authorize | Decide what it may do on its own, or on behalf of a user. | Role-based permissions on resource servers. Delegated tokens name the user as subject and the agent as actor. |
| Audit | Connect access and action evidence to the identities involved. | Token and flow events record subject, actor and a correlation ID. Action evidence comes from the resource server's logs. |

## 4. Vocabulary: subject, actor, resource

| Term | Question | Meaning | Claims |
|---|---|---|---|
| Subject | Whose authority? | The identity the token speaks for. Its permissions bound what can be granted. | `sub` |
| Actor | Who is acting? | The party performing the action when it is not the subject. The requesting client is named separately. | `act.sub`, `client_id` |
| Resource | What is protected? | The target the token is for. Its resource server defines the permissions that become scopes. | `aud`, `scope` |

Example: John books a flight through the Concierge. The subject is John, the actor is the Wayfinder Concierge, and the resource is the Wayfinder booking MCP server.

Subject and actor are roles in one interaction, not entity types. An `act` claim appears only when the actor differs from the subject.

## 5. Four ways an agent shows up

| Mode | What happens | Token |
|---|---|---|
| Acting on its own | Uses its own credential and its own permissions. | `sub` = agent, no `act` |
| Acting on behalf of a user | Obtains a user's delegated authority through its own client. | `sub` = user, `act.sub` = agent |
| Authenticating as a subject | Signs in to an application through that application's flow, if the application allows its agent type. | `sub` = agent, client = the application |
| Offering an app-like sign-in | Users sign in through the agent's own client and flows; the agent is still recorded as actor. | `sub` = user, `act.sub` = agent, always |

## 6. The seven patterns

Patterns 1 to 6 appear in the Wayfinder demo. Pattern 7 is explained but not demonstrated yet.

### Pattern 1: Securing an MCP server

- **Status in ThunderID:** supported, in the authorization server role.
- **Flow:**
  1. Discover: the MCP server publishes RFC 9728 protected resource metadata naming the authorization server.
  2. Register: the client is registered manually, through Dynamic Client Registration, or from its Client ID Metadata Document.
  3. Authorize: the client runs authorization code with PKCE and passes `resource` set to the MCP server. The token is issued for that server, carrying only the tool permissions the caller holds.
  4. Enforce: the MCP server validates signature, issuer, audience, expiry and the scope each tool needs.
- **Modelled as:** an MCP resource server type whose tools are actions with permissions. Roles grant tool permissions to users, applications or agents. The `resource` parameter binds a token to one server.
- **Limits:**
  - One resource server per token; more fails with `invalid_target`.
  - Open registration needs an explicit setting.
  - Metadata-document clients are pre-registered by an admin.

### Pattern 2: Registering and managing agents

- **Status in ThunderID:** supported, with lifecycle gaps.
- **The agent record:**
  - Identity: agent type schema, attributes and organization unit.
  - Owner: an accountable user, defaulting to the creator.
  - Credentials: client secret, private key JWT, or public client with PKCE.
  - Access: roles and groups that grant permissions.
  - Flows and tokens: sign-in flow, token lifetimes and claims.
- **Lifecycle today:** create, update, delete.
- **Limits:**
  - No disable or suspend state; an agent is active until deleted.
  - Deleting an agent does not revoke tokens already issued; they run until expiry.
  - Rotating a secret replaces the old one immediately.
  - A user who owns agents cannot be deleted until ownership moves.

### Pattern 3: Governing access to an agent (the agent as a resource)

- **Status in ThunderID:** a configured pattern; a first-class link is planned (thunder-id/thunderid#2456, design discussion #5128).
- **Today:**
  1. A resource server represents the agent's endpoint, with a permission such as `agent:access`.
  2. Roles grant that permission to the users, applications or agents allowed to invoke it.
  3. The caller requests a token with `resource` set to the agent's endpoint.
  4. The agent validates every incoming token before it acts.
- **Not to be confused with** allowed agent types, which decide which agents may sign in to an application.

### Pattern 4: Acting on its own authority

- **Status in ThunderID:** supported.
- **Grant:** client credentials, with the agent's own credential.
- **Use when:** the task needs no user context, such as search, recommendations or scheduled work.
- **Token:**

  ```json
  { "sub": "<agent entity ID>", "client_id": "<agent client ID>", "aud": "<resource server>", "scope": "<agent's permissions>" }
  ```

- **Note:** scopes are filtered by the agent's roles. Unauthorized scopes are dropped, not rejected.

### Pattern 5: Just-in-time user delegation

- **Status in ThunderID:** supported.
- **Grant:** authorization code with PKCE through the agent's own client, with consent.
- **Use when:** the action belongs to the user and the user is present, such as a booking or personal data.
- **Token:**

  ```json
  { "sub": "<user ID>", "act": { "sub": "<agent entity ID>" }, "aud": "<resource server>", "scope": "<consented ∩ user's permissions>" }
  ```

- **Note:** on a user token issued through an agent's client, ThunderID always records the agent as actor.

### Pattern 6: Out-of-band approval with CIBA

- **Status in ThunderID:** supported, poll mode.
- **Flow:**
  1. Request: the agent calls the backchannel endpoint with a login hint, scope and binding message.
  2. Notify: the user gets an approval link by email or SMS.
  3. Approve: the user signs in and consents on their own device.
  4. Poll: the agent polls the token endpoint until the request is approved, denied or expired.
  5. Act: the token names the user as subject and the agent as actor.
- **Use when:** the agent works in the background and an action needs the user's approval later, such as an upgrade, a payment or a change outside the session.
- **Limits:**
  - Poll delivery only; ping and push are not supported.
  - Requests expire after 120 seconds by default.
  - Consent is requested on every approval.

### Pattern 7: Multi-agent authorization

- **Status in ThunderID:** supported via token exchange (RFC 8693).
- **How it works:** the worker agent exchanges the user's delegated token, presenting the delegating agent's token as the actor and asking for a narrower scope.
- **Token:**

  ```json
  { "sub": "<user ID>", "act": { "sub": "<worker agent>", "act": { "sub": "<orchestrator>" } } }
  ```

- **Limits:**
  - The chain nests only when the actor token already carries the earlier agent. Each exchange builds `act` from the actor token only.
  - There is no registered parent and sub-agent relationship yet.
  - There is no Wayfinder scene for this pattern yet.

## 7. Beyond the seven

### Crossing a trust boundary with ID-JAG

- **Status in ThunderID:** supported, with caveats.
- **Standard:** Identity Assertion Authorization Grant, IETF draft `draft-ietf-oauth-identity-assertion-authz-grant`.
- **Flow:**
  1. Sign in: the user signs in through the agent's client, and the agent receives an ID token.
  2. Request: the agent exchanges that ID token for an ID-JAG, only for audiences its client allows.
  3. Redeem: the agent presents the ID-JAG at the other domain's authorization server with the JWT bearer grant.
  4. Access: that server issues its own access token. The user does not sign in or consent again.
- **Who authenticates where:** the user authenticates once, at the identity provider. The agent authenticates with its own credentials at both authorization servers.
- **Limits:**
  - The ID-JAG carries the user; the agent appears only as `client_id`, with no `act`.
  - The other domain must trust your identity provider and share the client ID.
  - Scope evaluation and client binding gaps are open.

### Calling LLM providers without static keys

- **Status in ThunderID:** a documented pattern.
- **How it works:** the agent presents its token to a provider that supports workload identity federation, and the provider performs the exchange.

### Calling external SaaS for a user

- **Status in ThunderID:** planned.
- **The need:** let the agent call Google, Slack or Salesforce with the user's account.
- **Today:** ThunderID does not store or broker third-party tokens. The agent or a gateway must handle it.

## 8. How ThunderID represents an agent

- An agent is its own entity category, beside users and applications.
- Its OAuth client capabilities are configured on the agent: grants, credentials, redirects, flows and tokens.
- One record holds identity, owner, credentials, client settings and roles.
- Still configured separately:
  - the resource servers and permissions the agent calls;
  - the roles that grant them;
  - the application users sign in to.

## Code evidence (main `8459a404`, recheck before use)

Paths are in `thunder-id/thunderid`. Line numbers are from `8459a404`; the file paths were confirmed to still exist on main `7551bbb2` (2026-10-22), but the line numbers were not rechecked.

| Claim | Location |
|---|---|
| Client credentials: `sub` is the entity ID; scopes narrowed to the resource server and filtered by roles, unauthorized ones dropped | `backend/internal/oauth/oauth2/granthandlers/client_credentials.go:75-123`, `:148` |
| Agent recorded as `act` on authorization code | `backend/internal/oauth/oauth2/granthandlers/authorization_code.go:182-184` |
| Granted scope = consented ∩ authorized | `backend/internal/flow/executor/auth_assert_executor.go:782-797` |
| Token exchange builds `act` from the actor token only | `backend/internal/oauth/oauth2/granthandlers/token_exchange.go:219-272`, `backend/internal/oauth/oauth2/tokenservice/builder.go:364-377`, `backend/internal/oauth/oauth2/tokenservice/validator.go:690-714` |
| One resource server per token (`invalid_target`) | `backend/internal/oauth/oauth2/resourceindicators/resourceindicators.go:41-62` |
| ID-JAG carries no `act` | `backend/internal/oauth/oauth2/tokenservice/builder.go:200-230` |
| Entity categories | `backend/pkg/thunderidengine/providers/constants.go:240-248` |
| Agent service creates the entity and its OAuth client together | `backend/internal/agent/service.go:57-67`, `134`, `150-153`, `812-815` |
| Agent sign-in as subject (allowed agent types) | `backend/internal/authnprovider/common/subject_constraints.go:28-33` |
