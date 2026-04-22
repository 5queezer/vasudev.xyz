---
title: "Shipping A2A Protocol Support in Rust: 7 Gotchas Nobody Warns You About"
date: 2026-03-25
description: "What I learned adding Agent-to-Agent protocol support to an open-source agent framework."
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
author: "Christian Pojoni"
tags: ["rust", "a2a", "security"]
series: ["Field Notes"]
---













The [A2A (Agent-to-Agent) protocol](https://github.com/google/A2A) is Google's open standard for agent interoperability: discovery, task delegation, lifecycle management over HTTP/JSON-RPC. It sits next to MCP the way TCP sits next to USB: one connects agents to agents, the other connects agents to tools.

I recently shipped [PR #4166](https://github.com/5queezer/hrafn/pull/4166) adding native A2A support to Hrafn. That means both an inbound JSON-RPC 2.0 server and an outbound client tool, written in Rust. The PR passed 40 tests and ran E2E across five Raspberry Pi Zero 2 W instances. Along the way I hit every sharp edge the spec doesn't mention.

**The A2A spec is clean on paper. The security edges will cut you in production.**

## 1. Agent Cards are unauthenticated by design, and that's fine

The A2A spec says `GET /.well-known/agent-card.json` must be publicly accessible. No bearer token, no API key. First instinct: that's an information leak.

It's not. The agent card is metadata (name, description, capabilities, endpoint URL). Think of it as DNS for agents. You wouldn't put DNS behind auth.

The real gotcha: if you derive `public_url` from your gateway's bind address, you leak your internal network topology. `0.0.0.0:3000` in an agent card tells an attacker exactly where to probe. Always require an explicit `public_url` in config, and emit a startup warning if it's missing.

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "A2A agent card will expose internal bind address. \
         Set [a2a].public_url to avoid leaking network topology."
    );
}
```

## 2. Bearer token comparison must be constant-time

If your A2A server accepts bearer tokens, you need constant-time comparison. Not because your threat model includes nation-state timing attacks on a Telegram bot framework, but because it costs you exactly two lines and eliminates an entire class of vulnerabilities.

Standard `==` on strings short-circuits on the first mismatched byte. An attacker who can measure response times with enough precision can brute-force tokens byte by byte. Unlikely? Yes. Preventable? Also yes.

```rust
use subtle::ConstantTimeEq;

fn verify_token(provided: &str, expected: &str) -> bool {
    let provided_bytes = provided.as_bytes();
    let expected_bytes = expected.as_bytes();
    if provided_bytes.len() != expected_bytes.len() {
        return false;
    }
    provided_bytes.ct_eq(expected_bytes).into()
}
```

The `subtle` crate gives you `ct_eq`. Use it. The length check before comparison is intentional. Length itself isn't secret (it's in your config), and it avoids allocating a fixed-size buffer.

## 3. SSRF protection is harder than you think

Your A2A client tool lets the agent call arbitrary URLs: `discover https://agent.example.com`. That's one HTTP call away from `discover http://169.254.169.254/latest/meta-data/` on any cloud instance.

Blocking private IPs seems simple until you realize:

**IPv4-mapped IPv6 bypasses naive checks.** `::ffff:127.0.0.1` is localhost. `::ffff:169.254.169.254` is the cloud metadata endpoint. Your blocklist needs to handle both address families.

**DNS resolution happens twice.** You validate the hostname, it resolves to a public IP. Your HTTP client connects, but DNS has changed (DNS rebinding). Now you're hitting an internal IP. This is a TOCTOU (time-of-check, time-of-use) gap. The only real fix is to resolve DNS yourself, validate the IP, then connect to that IP directly.

**Redirects reopen the door.** You validate the initial URL, but the server redirects you to `http://localhost:8080/admin`. Your redirect policy needs to re-validate every hop.

```rust
fn is_private_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_loopback()
                || v4.is_private()
                || v4.is_link_local()
                || v4.octets()[0..2] == [169, 254] // metadata
        }
        IpAddr::V6(v6) => {
            v6.is_loopback()
                || is_ipv4_mapped_private(v6)  // ::ffff:10.x.x.x etc.
        }
    }
}
```

Document the TOCTOU gap honestly. I left a comment in the code and a note in the PR: "DNS rebinding TOCTOU acknowledged. Peer allowlist planned in [#4643](https://github.com/5queezer/hrafn/issues/4643)."

## 4. Same-host A2A breaks your own SSRF protection

Here's the irony: I built SSRF protection that blocks localhost. Then I deployed five Hrafn instances on a single Raspberry Pi, and they couldn't talk to each other.

Same-host multi-instance A2A is a legitimate use case. Multiple specialized agents on one machine communicate over `localhost:300X`. But your SSRF blocklist just blocked it.

The solution is a conditional bypass (`allow_local`), derived from the config rather than user input:

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

If your own `public_url` points to localhost, you're clearly running locally, so outbound calls to localhost are expected. If `public_url` is a real domain, localhost stays blocked.

Known residual risk: `allow_local` is a blanket bypass. A peer allowlist (specific IPs/ports) is the correct long-term fix. Ship the bypass, document the risk, file the follow-up issue.

## 5. TaskStore needs a cap, or you get a free DoS

A2A tasks are stateful. Every `message/send` creates a task entry. If you store tasks in memory (reasonable for v1), an attacker can send 100,000 requests and exhaust your heap.

Cap it. I used 10,000 with a 503 response when full:

```rust
const MAX_TASKS: usize = 10_000;

async fn create_task(&self, task: Task) -> Result<(), A2aError> {
    let store = self.tasks.read().await;
    if store.len() >= MAX_TASKS {
        return Err(A2aError::ServiceUnavailable);
    }
    drop(store);
    self.tasks.write().await.insert(task.id.clone(), task);
    Ok(())
}
```

One constant, one check, one error path. No eviction policy in v1. That's complexity for the follow-up. The cap alone prevents the crash.

Why 10,000? Back-of-envelope: each `Task` is roughly 2-4 KB serialized. 10K tasks = 20-40 MB. Acceptable on a Pi Zero 2 W with 512 MB RAM. Adjust for your target hardware.

## 6. Error messages are an information channel

When an inbound A2A request fails, what do you return?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

You just confirmed that `abc-123` is a valid task ID format and that your store is keyed by it. An attacker can enumerate task IDs.

Redact outbound errors. Log the full detail server-side:

```rust
// To the caller:
Err(json_rpc_error(-32600, "invalid request"))

// In your logs:
error!(task_id = %id, "task not found in store");
```

Generic error to the caller. Specific error in your logs. Same principle as web applications, but easy to forget when you're building a protocol handler and thinking in terms of helpful JSON-RPC responses.

## 7. The tool exists but the model can't see it

This one cost me an afternoon of debugging.

The A2A tool was registered in Hrafn's tool registry. `cargo test` passed. The gateway served agent cards. But when I actually ran an instance and asked it to contact another agent, the model had no idea the tool existed.

The problem: Hrafn uses a text-based tool description list in its bootstrap system prompt for models that don't support native function calling (like some OpenAI Codex variants). The tool was in the registry but not in the `tool_descs` array that gets injected into the prompt.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lesson: test the full path. Unit tests proved the tool worked when called. Integration tests proved the gateway accepted requests. But the model never called the tool because it didn't know it existed. E2E testing (actual model inference talking to actual endpoints) caught what unit tests couldn't.

---

## What I left out (intentionally)

The PR explicitly does not include:

* **SSE streaming.** A2A supports it, but synchronous request/response covers 90% of use cases. Streaming is additive, not foundational.
* **mTLS/OAuth.** Bearer tokens are sufficient for the trust model (same host, known peers). Certificate-based auth is enterprise-grade complexity for a Pi deployment. See also: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Agent registry.** Discovery is manual (you configure the URL). Automatic registry/mDNS is planned in the follow-up issue.
* **Task eviction.** The 10K cap is a hard wall, not an LRU cache. Good enough for v1.

Every "not included" is a scope decision, not a gap. The PR description lists each one with a link to the follow-up issue. Reviewers can see exactly what was considered and deferred.

## The setup that proved it works

Five Hrafn instances on a single Raspberry Pi Zero 2 W (quad-core ARM, 512 MB), each with a distinct persona (Kerf, Sentinel, Architect, Critic, Researcher), communicating via A2A on localhost ports 3001-3005. Backed by gpt-5.1-codex-mini.

Instance A discovers Instance B's agent card, sends a task ("review this code for security issues"), receives a response through the standard `process_message` pipeline. No custom orchestration. The A2A layer is just another input channel.

If it runs on a Pi Zero, it runs anywhere.

Read the full implementation in [PR #4166](https://github.com/5queezer/hrafn/pull/4166). Each gotcha above maps to a specific commit with tests. If you're building A2A into your own framework, start with the SSRF protection in `a2a_client.rs` and the TaskStore cap in `task_store.rs`. The follow-up for peer discovery and LAN mDNS is tracked in [#4643](https://github.com/5queezer/hrafn/issues/4643).

---

*Christian Pojoni builds [Hrafn](https://github.com/5queezer/hrafn), a Rust agent runtime for edge hardware. More at [vasudev.xyz](https://vasudev.xyz).*

*The cover image for this post was generated by AI.*
