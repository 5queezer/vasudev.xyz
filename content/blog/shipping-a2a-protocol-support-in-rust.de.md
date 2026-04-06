---
title: "Versand der A2A-Protokoll‑Unterstützung in Rust: 7 Stolperfallen, vor denen niemand warnt"
date: 2026-03-25
description: "Was ich beim Hinzufügen von Unterstützung für das Agent-to-Agent-Protokoll zu einem Open-Source-Agenten-Framework gelernt habe."
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
author: "Christian Pojoni"
tags: ["rust", "a2a", "security"]
translationHash: "e20081003cfc70b752cd153b45a8210b"
---
The [A2A (Agent-to-Agent) protocol](https://google.github.io/A2A/) is Google's open standard for agent interoperability – discovery, task delegation, lifecycle management over HTTP/JSON-RPC. It sits next to MCP the way TCP sits next to USB: one connects agents to agents, the other connects agents to tools.

I recently shipped [PR #4166](https://github.com/5queezer/hrafn/pull/4166) adding native A2A support to Hrafn – both an inbound JSON-RPC 2.0 server and an outbound client tool, written in Rust. The PR passed 40 tests and ran E2E across five Raspberry Pi Zero 2 W instances. Along the way I hit every sharp edge the spec doesn't mention.

**The A2A spec is clean on paper; the security edges will cut you in production.**

## 1. Agent Cards sind per Design unauthentifiziert – und das ist in Ordnung

The A2A spec says `GET /.well-known/agent-card.json` must be publicly accessible. No bearer token, no API key. First instinct: that's an information leak.

It's not. The agent card is metadata – name, description, capabilities, endpoint URL. Think of it as DNS for agents. You wouldn't put DNS behind auth.

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

If your A2A server accepts bearer tokens, you need constant-time comparison. Not because your threat model includes nation-state timing attacks on a Telegram bot framework – but because it costs you exactly two lines and eliminates an entire class of vulnerabilities.

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

The `subtle` crate gives you `ct_eq`. Use it. The length check before comparison is intentional – length itself isn't secret (it's in your config), and it avoids allocating a fixed-size buffer.

## 3. SSRF protection is harder than you think

Your A2A client tool lets the agent call arbitrary URLs: `discover https://agent.example.com`. That's one HTTP call away from `discover http://169.254.169.254/latest/meta-data/` on any cloud instance.

Blocking private IPs seems simple until you realize:

**IPv4-mapped IPv6 bypasses naive checks.** `::ffff:127.0.0.1` is localhost. `::ffff:169.254.169.254` is the cloud metadata endpoint. Your blocklist needs to handle both address families.

**DNS resolution happens twice.** You validate the hostname, it resolves to a public IP. Your HTTP client connects – but DNS has changed (DNS rebinding). Now you're hitting an internal IP. This is a TOCTOU (time-of-check, time-of-use) gap. The only real fix is to resolve DNS yourself, validate the IP, then connect to that IP directly.

**Redirects reopen the door.** You validate the initial URL, but the server 302s you to `http://localhost:8080/admin`. Your redirect policy needs to re-validate every hop.

```rust
fn is_private_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_loopback()
                || v4.is_private()
                || v4.octets()[0..2] == [169, 254] // metadata
        }
        IpAddr::V6(v6) => {
            v6.is_loopback()
                || is_ipv4_mapped_private(v6)  // ::ffff:10.x.x.x etc.
        }
    }
}
```

Document the TOCTOU gap honestly. I left a comment in the code and a note in the PR: "DNS rebinding TOCTOU acknowledged; peer allowlist planned in [#4643](https://github.com/5queezer/hrafn/issues/4643)."

## 4. Same-host A2A breaks your own SSRF protection

Here's the irony: I built SSRF protection that blocks localhost. Then I deployed five Hrafn instances on a single Raspberry Pi, and they couldn't talk to each other.

Same-host multi-instance A2A is a legitimate use case – multiple specialized agents on one machine, communicating over `localhost:300X`. But your SSRF blocklist just blocked it.

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

One constant, one check, one error path. No eviction policy in v1 – that's complexity for the follow-up. The cap alone prevents the crash.

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

Generic error to the caller. Specific error in your logs. Same principle as web applications – but easy to forget when you're building a protocol handler and thinking in terms of helpful JSON-RPC responses.

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

Lesson: test the full path. Unit tests proved the tool works when called. Integration tests proved the gateway accepted requests. But the model never called the tool because it didn't know it existed. E2E testing – actual model inference talking to actual endpoints – caught what unit tests couldn't.

---

## Was ich bewusst weggelassen habe (absichtlich)

The PR schließt explizit folgende Dinge nicht ein:

* **SSE streaming** – A2A unterstützt es, aber synchrones Request/Response deckt 90 % der Use Cases ab. Streaming ist ergänzend, nicht grundlegend.
* **mTLS/OAuth** – Bearer tokens reichen für das Trust‑Model (gleicher Host, bekannte Peers). Zertifikats‑basierte Auth ist Enterprise‑Komplexität für eine Pi‑Bereitstellung. Siehe auch: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Agent registry** – Discovery ist manuell (du konfiguriere die URL). Automatischer Registry/mDNS ist im Follow‑up Issue geplant.
* **Task eviction** – Der 10K‑Deckel ist eine harte Mauer, kein LRU‑Cache. Gut genug für v1.

Jede „nicht‑eingeschlossene“ Sache ist eine bewusste Entscheidungs‑Scope‑Grenze, kein Gap. Die PR‑Beschreibung führt jede davon mit einem Link zum Follow‑up Issue auf.

## Die Einrichtung, die gezeigt hat, dass es funktioniert

Fünf Hrafn‑Instanzen auf einer einzigen Raspberry Pi Zero 2 W (Quad‑Core ARM, 512 MB), jeweils mit einer distincten Persona (Kerf, Sentinel, Architect, Critic, Researcher), die über A2A auf localhost‑Ports 3001‑3005 kommunizieren. Geteilte Infrastruktur von gpt‑5.1-codex-mini.

Instance A entdeckt Instance B’s agent card, sendet eine Aufgabe („review this code for security issues“), erhält eine Antwort über den standardmäßigen `process_message`‑Pipeline. Keine benutzerdefinierte Orchestrierung. Die A2A‑Ebene ist nur ein weiteres Eingabekanal.

Wenn es auf einem Pi Zero läuft, läuft es überall.

Sieh dir die vollständige Implementierung in [PR #4166](https://github.com/5queezer/hrafn/pull/4166) an – jede oben beschriebene Herausforderung mappt zu einem konkreten Commit mit Tests. Wenn du A2A in dein eigenes Framework einbauen willst, starte mit der SSRF‑Schutz‑Logik in `a2a_client.rs` und dem TaskStore‑Deckel in `task_store.rs`. Der Follow‑up für Peer‑Discovery und LAN mDNS ist im [#4643](https://github.com/5queezer/hrafn/issues/4643) verfolgt.

---

*Ich schreibe über Systeme, Sicherheit und die Schnittstelle von KI‑Agenten mit realer Infrastruktur auf [vasudev.xyz](https://vasudev.xyz).*

*Das Titelbild für diesen Beitrag wurde von KI generiert.*