---
title: "Adding OAuth 2.1 to a Self-Hosted MCP Server: 5 Gotchas from the Trenches"
date: 2026-03-25
description: "What broke when I wired up claude.ai to my own Reactive Resume instance via OAuth."
author: "Christian Pojoni"
---

MCP (Model Context Protocol) lets AI assistants call tools on remote servers. But if your MCP server is self-hosted, claude.ai needs to authenticate against your user accounts, not Anthropic's. That means your server needs to become an OAuth 2.1 provider -- Dynamic Client Registration, Authorization Code with PKCE, token exchange, the whole stack.

I submitted PR #2829 to add this to Reactive Resume, the open-source resume builder. Six commits, one mid-PR refactor after the maintainer flagged a deprecation, and several hours of debugging auth chains. Here are the gotchas.

## 1. Your MCP server needs two .well-known endpoints, not one

When claude.ai connects to a custom MCP endpoint, it doesn't just POST to your URL. It first probes for OAuth metadata. The MCP auth spec requires two discovery endpoints:

`GET /.well-known/oauth-authorization-server` returns the OAuth 2.0 Authorization Server Metadata (RFC 8414) -- where to authorize, where to exchange tokens, what grant types you support.

`GET /.well-known/oauth-protected-resource` returns the Protected Resource Metadata (RFC 9728) -- what resource this is, what scopes it needs, and where to find the authorization server.

Miss either one and claude.ai silently fails to connect. No error message, no retry. It just doesn't offer the "Connect" button. I lost an hour to this because the `oauth-protected-resource` endpoint wasn't in any tutorial I found. I only discovered it by reading the MCP auth spec directly.

```typescript
// .well-known/oauth-authorization-server
export const Route = createAPIFileRoute("/.well-known/oauth-authorization-server")({
  GET: async () => {
    return json({
      issuer: authBaseUrl,
      authorization_endpoint: `${authBaseUrl}/api/auth/oauth/authorize`,
      token_endpoint: `${authBaseUrl}/api/auth/oauth/token`,
      registration_endpoint: `${authBaseUrl}/api/auth/oauth/register`,
      response_types_supported: ["code"],
      grant_types_supported: ["authorization_code", "refresh_token"],
      code_challenge_methods_supported: ["S256"],
    });
  },
});
```

Both endpoints must return JSON, both must be at the exact paths specified, and both must agree on the authorization server URL. If `issuer` in one doesn't match `authorization_server` in the other, the client rejects the configuration.

## 2. The auth library you picked might get deprecated mid-PR

Reactive Resume uses better-auth for authentication. Better-auth ships an `mcp()` plugin that handles Dynamic Client Registration and token management. Perfect -- three lines of config and you have OAuth for MCP.

I built the entire PR around it, deployed to Cloud Run, verified it worked end-to-end with claude.ai, and marked the PR ready for review.

The maintainer's response:

> The MCP plugin is soon to be deprecated [...] Could you refactor the PR to make use of the OAuth Provider Plugin instead?

He was right. The better-auth docs already had a deprecation notice pointing to `@better-auth/oauth-provider`. The new plugin is more general (not MCP-specific), uses JWT tokens instead of opaque tokens, and requires JWKS key management.

The refactor touched every auth-related file. Opaque token lookup via `getMcpSession()` became JWT verification via `verifyAccessToken()`. The database schema changed -- `oauthApplication` became `oauthClient` (RFC 7591 compliant), and new tables for `oauthRefreshToken` and `jwks` appeared.

The lesson isn't "check for deprecations first" -- it's that MCP auth tooling is moving fast right now. Whatever you pick today might be superseded next month. Keep your OAuth logic behind a thin adapter so the refactor is mechanical, not architectural.

## 3. Your auth chain has more layers than you think

This one cost me the most debugging time. The OAuth flow worked -- claude.ai got a token, the MCP endpoint accepted it, and the McpServer processed the request. But every tool call (list resumes, get resume, patch resume) failed with `Unauthorized`.

The problem: Reactive Resume uses oRPC for its API layer. The oRPC context has its own auth chain -- separate from the MCP endpoint auth. When a tool calls `listResumes`, oRPC checks for a session cookie or an API key. It doesn't know about OAuth Bearer tokens.

The MCP endpoint authenticated the user. Then it called an oRPC procedure. oRPC saw no cookie and no API key. `Unauthorized`.

The fix: propagate the Bearer token through the oRPC auth chain.

```typescript
// In the oRPC context builder
const bearer = headers.get("authorization")?.replace("Bearer ", "");
if (bearer) {
  const token = await verifyOAuthToken(bearer);
  if (token?.userId) {
    const user = await db.query.user.findFirst({
      where: eq(userTable.id, token.userId),
    });
    if (user) return { user };
  }
}
```

The deeper lesson: in any system where auth happens at a gateway layer (MCP endpoint) and then gets forwarded to an inner layer (oRPC), you need to verify that the inner layer accepts the same credential format. If it doesn't, you have two options: pass the resolved user context through, or teach the inner layer to understand the new credential type. I chose the latter because it's more robust against future tool additions.

## 4. getMcpSession returns a token object, not a user

After solving the auth chain issue, tool calls still failed. This time with a different error: `Cannot read properties of undefined (reading 'id')`.

The code assumed `getMcpSession()` returns something like a session object with a `user` property:

```typescript
const session = await getMcpSession(token);
const user = session.user; // undefined
```

It doesn't. `getMcpSession()` (and its successor `verifyAccessToken()`) returns an `OAuthAccessToken` object. That object has a `userId` field, not a `user` field. You need a separate database lookup:

```typescript
const token = await verifyAccessToken(bearer);
const user = await db.query.user.findFirst({
  where: eq(userTable.id, token.userId),
});
```

This is a documentation gap. The better-auth docs show the OAuth flow but don't show how to go from "I have a valid token" to "I have a user object I can pass to my business logic." In any OAuth provider implementation, token verification and user resolution are two separate steps. Don't assume the library merges them.

## 5. Backward compatibility means two auth paths forever

Reactive Resume already had MCP auth via `x-api-key` headers. Existing users have API keys configured. Ripping that out and forcing everyone to re-authenticate via OAuth would break every existing integration.

So the MCP endpoint now has a dual auth path:

```typescript
// Try OAuth Bearer first
const bearer = headers.get("authorization")?.replace("Bearer ", "");
if (bearer) {
  const session = await verifyOAuthToken(bearer);
  if (session?.userId) { /* authenticated */ }
}

// Fall back to API key
const apiKey = headers.get("x-api-key");
if (apiKey) {
  const user = await verifyApiKey(apiKey);
  if (user) { /* authenticated */ }
}

// Neither worked
return new Response("Unauthorized", {
  status: 401,
  headers: { "WWW-Authenticate": "Bearer" },
});
```

The ordering matters. Bearer first, API key second. If you check API key first and the user sends a malformed API key alongside a valid Bearer token, the API key check might throw before the Bearer path runs.

And the `WWW-Authenticate: Bearer` header in the 401 response is required by the MCP spec. Without it, claude.ai doesn't know to initiate the OAuth flow -- it just treats the endpoint as permanently inaccessible.

One more subtlety: `verifyApiKey` can throw on malformed input. Wrapping it in try-catch prevents noisy error logs from failed token parsing attempts. The original code used string matching on error messages (`error.message.includes("...")`). The refactored version uses `instanceof AuthError` -- type-safe and won't break if the error message changes.

## What I left out

- **Token refresh** -- the OAuth Provider plugin handles refresh tokens automatically. I didn't need custom logic.
- **Scope enforcement** -- all MCP tools get full user access. Fine for a personal resume builder, not fine for a multi-tenant SaaS.
- **Rate limiting on the OAuth endpoints** -- Dynamic Client Registration is open by design (RFC 7591). Anyone can register. Rate limiting is on the maintainer's TODO.
- **Consent screen** -- better-auth's OAuth Provider skips the consent screen for first-party apps. If Reactive Resume ever becomes an OAuth provider for third-party apps, a consent UI is needed.

## The setup that proved it works

Self-hosted Reactive Resume on Google Cloud Run (europe-west1), PostgreSQL on Cloud SQL. The OAuth flow completes in under 2 seconds: claude.ai discovers endpoints, registers dynamically, redirects to the login page, exchanges the code, and starts making tool calls. Resume listing, reading, and patching all work through the Bearer token.

The PR is still in draft -- the refactor to `oauth-provider` needs a final pass. But the flow is proven end-to-end.

---

The PR is [#2829](https://github.com/AmruthPillworking/Reactive-Resume/pull/2829). My self-hosted Reactive Resume runs at [resume.vasudev.xyz](https://resume.vasudev.xyz).

I write about systems, security, and the intersection of AI agents with real infrastructure at [vasudev.xyz](https://vasudev.xyz).
