---
title: "Implementierung von A2A Protocol Support in Rust: 7 Fallstricke, die niemand dir vorher warnt"
date: 2026-03-25
description: "Was ich beim Hinzufügen von Unterstützung für das Agent-zu-Agent-Protokoll zu einem Open-Source-Agenten-Framework gelernt habe"
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
author: "Christian Pojoni"
tags: ["rust", "a2a", "security"]
translationHash: "54bf376766d2f5336ddd263c55333924"
---
The [A2A (Agent-to-Agent) protocol](https://google.github.io/A2A/) is Google's open standard for agent interoperability: discovery, task delegation, lifecycle management over HTTP/JSON-RPC. It sits next to MCP the way TCP sits next to USB: one connects agents to agents, the other connects agents to tools.

I recently shipped [PR #4166](https://github.com/5queezer/hrafn/pull/4166) adding native A2A support to Hrafn. That means both an inbound JSON-RPC 2.0 server and an outbound client tool, written in Rust. The PR passed 40 tests and ran E2E across five Raspberry Pi Zero 2 W instances. Along the way I hit every sharp edge the spec doesn't mention.

**Das A2A‑Spec ist sauber auf dem Papier. Die Sicherheits‑Kanten schneiden dich in der Produktion.**

## 1. Agent Cards werden nach Design unauthentifiziert, und das ist in OrdnungErste Neigung: das ist ein Informationsleak.  
**It's not.** Der Agent‑Card ist Metadaten (Name, Beschreibung, Fähigkeiten, Endpunkt‑URL). Denk daran, wie DNS für Agenten funktioniert. Du würdest DNS nicht hinter Auth stellen.

Der eigentliche Haken: wenn du `public_url` aus der Bind‑Adresse deines Gateways ableitest, enthüllst du deine interne Netzwerktopologie. `0.0.0.0:3000` in einer Agent‑Card sagt einem Angreifer genau, wo er probieren kann. Always require an explicit `public_url` in config, und emit a startup warning if it's missing.

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "A2A agent card will expose internal bind address. \
         Set [a2a].public_url to avoid leaking network topology."
    );
}
```

## 2. Bearer token comparison muss constant-time

Wenn dein A2A‑Server Bearer‑Tokens akzeptiert, brauchst du constant-time comparison. Nicht weil dein Threat‑Model Nation‑State‑Timing‑Attacks auf ein Telegram‑Bot‑Framework includes, sondern weil es dich genau zwei Zeilen kostet und eine ganze Klasse von Vulnerabilities eliminiert.

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

## 3. SSRF protection ist harder than you think

Dein A2A‑Client‑Tool lässt den Agenten belieige URLs aufrufen: `discover https://agent.example.com`. Das ist nur einen HTTP‑Call vom `discover http://169.254.169.254/latest/meta-data/` auf jedem Cloud‑Instance entfernt.

**IPv4-mapped IPv6 bypasses naive checks.** `::ffff:127.0.0.1` ist localhost. `::ffff:169.254.169.254` ist der Cloud‑Metadata‑Endpoint. Deine Blockliste muss beide Adressfamilien behandeln.

**DNS resolution happens twice.** Du validierst den Hostnamen, er löst sich in eine öffentliche IP auf. Dein HTTP‑Client verbindet sich, aber DNS hat sich geändert (DNS‑rebinding). Jetzt triffst du eine interne IP. Das ist ein TOCTOU‑(time-of-check, time-of-use) Gap. Die einzige wirkliche Lösung ist, DNS selbst aufzulösen, die IP zu validieren und dann direkt zu dieser IP zu verbinden.

```rust
fn is_private_ip(ip: &IpAddr) -> bool {
    match ip {
        IpAddr::V4(v4) => {
            v4.is_loopback()
                || v4.is_private()
                || v4.octets()[0..2] == [169, 254] // metadata        }
        IpAddr::V6(v6) => {
            v6.is_loopback()
                || is_ipv4_mapped_private(v6)  // ::ffff:10.x.x.x etc.
        }
    }
}
```

Dokumentiere den TOCTOU‑Gap ehrlich. Ich habe einen Kommentar im Code und einen Hinweis im PR hinterlegt: "DNS rebinding TOCTOE acknowledged. Peer allowlist planned in [#4643](https://github.com/5queezer/hrafn/issues/4643)."

## 4. Same-host A2A bricht deine eigene SSRF protection

Hier ist das Ironie: Ich baute SSRF protection, die localhost blockiert. Dann deployte ich fünf Hrafn‑Instanzen auf einer einzigen Raspberry Pi, und sie konnten nicht miteinander kommunizieren.

Multi‑Instance A2A auf derselben Host‑Maschine ist ein legitimer Use Case. Mehrere spezialisierte Agenten auf einer Maschine kommunizieren über `localhost:300X`. Aber deine SSRF blocklist blockierte es einfach.

Die Lösung ist ein bedingter Bypass (`allow_local`), der aus der Config, nicht aus Benutzereingabe, abgeleitet wird:

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Wenn dein eigener `public_url` auf localhost zeigt, bist du eindeutig im lokalen Betrieb, also sind ausgehende Aufrufe zu localhost erwartet. Wenn `public_url` eine echte Domain ist, bleibt localhost blockiert.

Bekannter restlicher Risiko: `allow_local` ist ein Blanket‑Bypass. Eine Peer‑Allowlist (spezifische IPs/Ports) ist die richtige Langzeitlosung. Deploy den Bypass, dokumentiere das Risiko, erstelle das Follow‑up Issue.

## 5. TaskStore braucht ein Cap, oder du bekommst einen freien DoS

A2A‑Tasks sind zustandsabhängig. Jede `message/send` erstellt einen Task‑Eintrag. Wenn du Tasks im Speicher (verwertbar für v1) speicherst, kann ein Angreifer 100,000 Anfragen senden und deinen Heap leeren.

Set a limit. Ich habe 10,000 verwendet mit einer 503‑Antwort, wenn das Limit erreicht ist:

```rustconst MAX_TASKS: usize = 10_000;

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

Eine Konstante, eine Prüfung, ein Fehlerpfad. Keine Eviction‑Politik in v1. Das ist Komplexität für das Follow‑up. Der Cap allein verhindert das Absturz.

Warum 10,000? Back-of-envelope: each `Task` is roughly 2-4 KB serialized. 10K tasks = 20-40 MB. Akzeptabel auf einem Pi Zero 2 W mit 512 MB RAM. Passe es für dein Ziel‑Hardware an.

## 6. Error messages sind ein InformationskanalWenn eine eingehende A2A-Anfrage fehlschlägt, was gibst du zurück?

```json
{\"error\": {\"code\": -32600, \"message\": \"Task abc-123 not found in store\"}}
```

Du hast seulement bestätigt, dass `abc-123` ein gültiges Task‑ID‑Format ist und dass dein Store nach ihr indexiert ist. Ein Angreifer kann Task‑IDs enumerieren.

Redactiere ausgehende Errors. Protokolliere die vollständigen Details serverseitig:

```rust
// To the caller:
Err(json_rpc_error(-32600, "invalid request"))

// In your logs:
error!(task_id = %id, "task not found in store");
```

Generic error to the caller. Specific error in your logs. Same principle as web applications, but easy to forget when you're building a protocol handler and thinking in terms of helpful JSON-RPC responses.

## 7. The tool exists but the model can't see it

Das kostete mich einen Nachmittag Debugging.

Die A2A‑Tool war im Tool‑Registry von Hrafn registriert. `cargo test` bestand. Das Gateway servierte Agent‑Cards. Aber wenn ich eine Instanz actually laufen ließ und sie bat, einen anderen Agenten zu kontaktieren, hatte das Modell keine Ahnung, dass das Tool existierte.

Das Problem: Hrafn verwendet eine textbasierte Tool‑Beschreibung‑Liste in seinem Bootstrap‑System‑Prompt für Modelle, die keine nativen Funktionsaufrufe unterstützen (wie einige OpenAI Codex‑Varianten). Das Tool war im Registry, aber nicht im `tool_descs`‑Array, das in den Prompt injiziert wird.

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

## What I left out (intentionally)

Der PR enthält ausdrücklich nicht:

* **SSE streaming.** A2A unterstützt es, aber synchrones Request/Response deckt 90% der Use Cases ab. Streaming ist ergänzend, nicht grundlegend.
* **mTLS/OAuth.** Bearer Tokens sind für das Trust‑Model (gleiches Host, bekannte Peers) ausreichend. Zertifikat‑basierte Auth ist企业级复杂度 für eine Pi‑Bereitstellung. Siehe auch: [Adding OAuth 2.1 to a Self‑Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Agent registry.** Discovery ist manuell (du konfigurierst die URL). Automatic registry/mDNS ist im Follow‑up Issue geplant.
* **Task eviction.** Der 10K Cap ist eine harte Grenze, kein LRU‑Cache. Gut genug für v1.

Jede "not included" Entscheidung ist ein Scope‑Entcheid, keine Lücke. Die PR‑Beschreibung listet jedes auf mit einem Link zum Follow‑up Issue. Reviewer können genau sehen, was berücksichtigt und verschoben wurde.

## The setup that proved it works

Fünf Hrafn‑Instanzen auf einer einzigen Raspberry Pi Zero 2 W (quad‑core ARM, 512 MB), jede mit einer distincten Persona (Kerf, Sentinel, Architect, Critic, Researcher), kommunizieren via A2A über localhost Ports 3001‑3005. Backed by gpt-5.1-codex-mini.

Read the full implementation in [PR #4166](https://github.com/5queezer/hrafn/pull/4166). Jede oben beschriebene Gotcha mappt zu einem spezifischen Commit mit Tests. Wenn du A2A in dein eigenes Framework einbaust, fang mit der SSRF‑Protection in `a2a_client.rs` und dem TaskStore‑Cap in `task_store.rs` an. Das Follow‑up für Peer‑Discovery und LAN mDNS ist in [#4643](https://github.com/5queezer/hrafn/issues/4643) verfolgt.

*Christian Pojoni builds [Hrafn](https://github.com/5queezer/hrafn), ein Rust‑Agent‑Runtime für Edge‑Hardware. Mehr unter [vasudev.xyz](https://vasudev.xyz)*