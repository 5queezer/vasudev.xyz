---
title: "Einführung von A2A-Protokollunterstützung in Rust: 7 Fallstricke, vor denen dich niemand warnt"
date: 2026-03-25
description: "Was ich beim Hinzufügen von Agent-to-Agent-Protokollunterstützung zu einem Open-Source-Agenten-Framework gelernt habe."
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
author: "Christian Pojoni"
tags: ["rust", "a2a", "security"]
translationHash: "78b127daa6d5d0cc86a4b8e8137b6d4a"
chunkHashes: "e725cda5ee890e0d,7d3e0b3378417e09,aa7513a6486f8faf,a825fb9bc8a4bae3,5dea57e52b8e70d4,28ed198a8cd428fc,685d9c5b09d7dcf3,6eadb412a20580a0,7262b64366b7ff90,e9307644648922c1"
---
Das [A2A(Agent-to-Agent) protocol](https://github.com/google/A2A) ist Googles offenes Standard für Agenten‑Interoperabilität: Entdeckung, Aufgaben‑Delegation, Lifecycle‑Management über HTTP/JSON‑RPC. Er liegt neben MCP, so wie TCP neben USB liegt: Eines verbindet Agenten miteinander, das andere verbindet Agenten mit Werkzeugen.

Kürzlich habe ich [PR #4166](https://github.com/5queezer/hrafn/pull/4166) native A2A‑Support zu Hrafn hinzugefügt. Das bedeutet, sowohl einen eingehenden JSON‑RPC 2.0 Server als auch ein ausgehendes Client‑Tool, geschrieben in Rust. Der PR bestand 40 Tests und lief E2E über fünf Raspberry Pi Zero 2 W Instanzen. Auf dem Weg traf ich jede scharfe Kante, die die Spezifikation nicht erwähnt.

**Die A2A Spezifikation ist sauber auf dem Papier. Die Sicherheitsecken werden dich in der Produktion zerschneiden.**
## 1.Agent Cards sind standardmäßig unauthentifiziert, und das ist in Ordnung

Die A2A-Spezifikation verlangt, dass `GET /.well-known/agent-card.json` öffentlich zugänglich ist. Kein Bearer-Token, kein API-Key. Der erste Impuls: Das ist ein Informationsleak.

Es ist es nicht. Die Agent Card ist lediglich Metadaten (Name, Beschreibung, Fähigkeiten, Endpunkt-URL). Man denke an sie als DNS für Agenten. Man würde DNS nicht hinter Authentifizierung schalten.

Der eigentliche Haken: Wenn du `public_url` aus der Bind-Adresse deines Gateways ableitest, lecksst du deine interne Netzwerktopologie. `0.0.0.0:3000` in einer Agent Card sagt einem Angreifer genau, wo er ansetzen muss. Setze immer eine explizite `public_url` in der Konfiguration und gib beim Startup eine Warnung aus, wenn sie fehlt.

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "A2A agent card will expose internal bind address. \
         Set [a2a].public_url to avoid leaking network topology."
    );
}
```
## 2.Bearer-Token-Vergleich muss konstantzeitgleich sein

Wenn dein A2A-Server Bearer-Token akzeptiert, musst du eine konstante-Zeit-Vergleichsmethode verwenden. Nicht, weil dein Threat Model Nationstaaten-Timing-Angriffe auf einen Telegram-Bot-Framework einschließt, sondern weil es dich genau zwei Zeilen kostet und eine ganze Klasse von Schwachstellen eliminiert.

Standard `==` bei Strings schneidet bei der ersten nicht übereinstimmenden Byte-Stelle ab. Ein Angreifer, der die Reaktionszeiten mit ausreichender Präzision messen kann, kann Tokens byteweise brute‑force. Unwahrscheinlich? Ja. Verhinderbar? ebenfalls ja.

```rustuse subtle::ConstantTimeEq;

fn verify_token(provided: &str, expected: &str) -> bool {
    let provided_bytes = provided.as_bytes();
    let expected_bytes = expected.as_bytes();
    if provided_bytes.len() != expected_bytes.len() {
        return false;
    }
    provided_bytes.ct_eq(expected_bytes).into()
}
```

Das `subtle` crate bietet dir `ct_eq`. Verwende es. Die Längenprüfung vor dem Vergleich ist bewusst. Die Länge selbst ist nicht geheim (sie steht in deiner Konfiguration) und verhindert die Zuweisung eines Puffers fester Größe.
```
## 3. SSRF-Schutz ist schwieriger, als du denkstDein A2A-Client-Tool lässt den Agenten beliebige URLs aufrufen: `discover https://agent.example.com`. Damit ist man nur einen HTTP-Aufruf von `discover http://169.254.169.254/latest/meta-data/` auf jedem Cloud-Instance entfernt.

Das Blockieren privater IPs scheint einfach, bis man bemerkt:

**IPv4-mapped IPv6 umgeht naive Prüfungen.** `::ffff:127.0.0.1` ist localhost. `::ffff:169.254.169.254` ist der Cloud-Metadata-Endpunkt. Deine Blockliste muss beide Adressfamilien berücksichtigen.

**Die DNS-Auflösung findet zweimal statt.** Du validierst den Hostnamen, er wird zu einer öffentlichen IP. Dein HTTP-Client verbindet sich, aber DNS hat sich geändert (DNS‑Rebinding). Jetzt triffst du eine interne IP. Das ist eine TOCTOU-Lücke (time‑of‑check, time‑of‑use). Die einzige wirkliche Lösung ist, DNS selbst aufzulösen, die IP zu validieren und dann direkt zu dieser IP zu verbinden.

**Redirects öffnen die Tür erneut.** Du validierst die initiale URL, aber der Server leitet dich auf `http://localhost:8080/admin` um. Deine Redirect-Richtlinie muss jeden Hop neu validieren.

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

Mach die TOCTOU-Lücke ehrlich dokumentiert. Ich habe einen Kommentar im Code und einen Hinweis im PR hinterlassen: "DNS rebinding TOCTOU acknowledged. Peer allowlist planned in [#4643](https://github.com/5queezer/hrafn/issues/4643)."
## 4. Same‑Host‑A2A bricht eigenen SSRF‑Schutz

Hier ist das Ironie: Ich habe SSRF‑Schutz gebaut, der `localhost` blockiert. Dann habe ich fünf Hrafn‑Instanzen auf einer einzigen **Raspberry Pi**, und sie konnten nicht miteinander kommunizieren.

Same‑host multi‑instance A2A ist ein legitimer Use‑Case. Mehrere spezialisierte Agenten auf einer Maschine kommunizieren über `localhost:300X`. Aber deine SSRF‑Blockliste blockierte das einfach.

Die Lösung ist ein bedingter Bypass (`allow_local`), der aus der Konfiguration stammt, nicht aus Benutzereingaben:

```rustlet allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Wenn deine eigene `public_url` auf `localhost` zeigt, bist du offensichtlich lokal unterwegs, also sind ausgehende Aufrufe zu `localhost` erwartet. Wenn `public_url` eine echte Domain ist, bleibt `localhost` blockiert.

Bekannter Restrisiko: `allow_local` ist ein genereller Bypass. Eine **Peer‑Allowlist** (konkrete IPs/Ports) ist die richtige Langzeit‑Lösung. Implementiere den Bypass, dokumentiere das Risiko, und erstelle ein Follow‑up Issue.
## 5. TaskStore needs a cap, or you get a free DoS

A2A‑Aufgaben sind zustandsbehaftet. Jede `message/send` erstellt eine Task‑Eintragung. Wenn Sie Aufgaben im Speicher speichern (für v1 sinnvoll), kann ein Angreifer 100.000 Anfragen senden und Ihren Heap erschöpfen.

Setze eine Obergrenze. Ich habe 10.000 verwendet mit einer 503‑Antwort, wenn voller Speicher:

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

Eine Konstante, eine Prüfung, ein Fehlerpfad. Keine Eviction‑Policy in v1. Das ist Komplexität für das Follow‑up. Die Obergrenze allein verhindert den Absturz.

Warum 10.000? Back‑of‑envelope: Jede `Task` ist ungefähr 2‑4 KB serialisiert. 10K Tasks = 20‑40 MB. Akzeptabel auf einem Pi Zero 2 W mit 512 MB RAM. Passen Sie es für Ihre Zielhardware an.
## 6. Fehlerausgabensind ein Informationskanal

Wenn eine eingehende A2A-Anfrage fehlschlägt, was gibst du zurück?

```json{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Du hast gerade bestätigt, dass `abc-123` ein gültiges Aufgaben‑ID‑Format ist und dass dein Store danach indiziert ist. Ein Angreifer kann Aufgaben‑IDs aufzählen.

Leite ausgehende Fehler weiter. Logge vollständige Details serverseitig:

```rust
// To the caller:
Err(json_rpc_error(-32600, "invalid request"))

// In your logs:
error!(task_id = %id, "task not found in store");
```

Generischer Fehler nach außen. Spezifischer Fehler in deinen Logs. Das gleiche Prinzip wie bei Webanwendungen, aber leicht zu vergessen, wenn du einen Protokoll‑Handler baust und in puncto hilfreicher JSON‑RPC‑Antworten denkst.
## 7.Das Tool existiert, aber das Modell kann es nicht sehen

Dies kostete mich einen ganzen Nachmittag Debugging.

Das A2A-Tool war im Tool‑Registry von Hrafn registriert. `cargo test` Bestand. Der Gateway zeigte Agent‑Karten an. Aber als ich tatsächlich eine Instanz gestartet und sie gebeten hatte, mit einem anderen Agenten zu kommunizieren, hatte das Modell keine Ahnung, dass das Tool existierte.

Das Problem: Hrafn verwendet in seinem Bootstrap‑Systemprompt für Modelle, die kein natives Funktionsaufrufsupport bieten (wie einige OpenAI Codex‑Varianten), eine textbasierte Tool‑Beschreibungsliste. Das Tool war in der Registry, aber nicht im `tool_descs`‑Array, das in den Prompt injiziert wird.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lektion: Teste den kompletten Pfad. Unit‑Tests zeigten, dass das Tool beim Aufrufen funktionierte. Integrationstests zeigten, dass der Gateway Anfragen akzeptierte. Aber das Modell rief das Tool nie auf, weil es nicht wusste, dass es existierte. E2E‑Tests (tatsächliche Modell‑Inference, die mit echten Endpoints kommuniziert) fanden das heraus, was Unit‑Tests nicht konnten.
## Was ich bewusst weggelassen habe (absichtlich)

The PR explicitly does not include:

* **SSE streaming.** A2A unterstützt es, aber synchroner Anfrage/Antwort‑Workflow deckt 90 % der Anwendungsfälle ab. Streaming ist ergänzend, nicht grundlegend.
* **mTLS/OAuth.** Bearer tokens sind ausreichend für das Vertrauensmodell (gleicher Host, bekannte Peers). Zertifikat‑basierte Auth ist Enterprise‑Komplexität für ein Pi‑Deployment. Siehe auch: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Agent registry.** Die Entdeckung erfolgt manuell (Sie konfigurieren die URL). Ein automatisches Registry/mDNS ist für das Folgemy‑Issue geplant.
* **Task eviction.** Die 10 K‑Grenze ist eine feste Obergrenze, kein LRU‑Cache. Genügend für v1.

Jede "nicht enthalten" ist eine bewusste Scope‑Entscheidung, kein Mangel. Die PR‑Beschreibung führt jede Punkte mit einem Link zum Folgemy‑Issue auf. Reviewer können genau sehen, was in Erwägung gezogen und verschoben wurde.
## The setup that provedit works

Fünf Hrafn‑Instanzen auf einem einzelnen Raspberry Pi Zero 2 W (quad‑core ARM, 512 MB), jede mit einer eigenen Persönlichkeit (Kerf, Sentinel, Architect, Critic, Researcher), die über A2A über localhost‑Ports 3001‑3005 kommunizieren. Unterstützt von gpt-5.1-codex-mini.

Instance A entdeckt die Agentenkarte von Instance B, sendet eine Aufgabe (“code auf Sicherheitsprobleme prüfen”), erhält über den Standard‑`process_message`‑Pipeline eine Antwort. Keine benutzerdefinierte Orchestrierung. Die A2A‑Schicht ist nur ein weiteres Eingabekanal.

Läuft es auf einem Pi Zero, läuft es überall.

Lies die vollständige Implementierung in [PR #4166](https://github.com/5queezer/hrafn/pull/4166). Jeder der genannten Fallstricke entspricht einem spezifischen Commit mit Tests. Wenn du A2A in dein eigenes Framework integrierst, fange mit dem SSRF‑Schutz in `a2a_client.rs` und der TaskStore‑Begrenzung in `task_store.rs` an. Der Ausblick für die Peer‑Entdeckung und LAN‑mDNS ist im [#4643](https://github.com/5queezer/hrafn/issues/4643) verfolgt.

---

*Christian Pojoni baut [Hrafn](https://github.com/5queezer/hrafn), ein Rust‑Agent‑Runtime für Edge‑Hardware. Mehr darüber auf [vasudev.xyz](https://vasudev.xyz).*

*Das Titelbild für diesen Beitrag wurde von KI generiert.*
## 3.SSRF-Schutz ist schwieriger, als du denkst

Dein A2A-Client‑Tool lässt den Agenten beliebige **URLs** aufrufen: `discover https://agent.example.com`. Das ist nur ein HTTP‑Aufruf entfernt von `discover http://169.254.169.254/latest/meta-data/` auf jeder Cloud‑Instanz.

Block private IPs scheint einfach, bis du merkst:

**IPv4‑mapped IPv6 umgeht naive Prüfungen.** `::ffff:127.0.0.1` ist localhost. `::ffff:169.254.169.254` ist die Cloud‑Metadaten‑Endpoint. Deine Blockliste muss beide Adressfamilien berücksichtigen.

**DNS‑Auflösung happens twice.** You validate the hostname, it resolves to a public IP. Your HTTP client connects, but DNS has changed (DNS rebinding). Jetzt triffst du eine interne IP. Das ist ein TOCTOU‑Gap (time‑of‑check, time‑of‑use). Der einzige echte Fix ist, DNS selbst aufzulösen, die IP zu validieren, und dann direkt zu dieser IP zu connecten.

**Redirects reopen the door.** You validate the initial URL, but the server redirects you to `http://localhost:8080/admin`. Dein Redirect‑Policy muss jeden Hop erneut validieren.

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

Document the TOCTOU gap ehrlich. Ich hinterlasse einen Kommentar im Code und einen Hinweis im PR: "DNS rebinding TOCTOU acknowledged. Peer allowlist planned in [#4643](https://github.com/5queezer/hrafn/issues/4643)."
##4. Same-host A2A breaks your own SSRF protection

Hier ist das Ironie: Ich habe SSRF-Schutz gebaut, der `localhost` blockt. Dann habe ich fünf Hrafn-Instanzen auf einem einzigen Raspberry Pi bereitgestellt, und sie konnten nicht miteinander kommunizieren.

Same‑Host Multi‑Instanz A2A ist ein legitimer Use Case. Mehrere spezialisierte Agenten auf einer Maschine kommunizieren über `localhost:300X`. Aber eure SSRF‑Blockliste blockierte das einfach.

Die Lösung ist ein bedingter Umgehung (`allow_local`), abgeleitet aus der Konfiguration statt von Benutzereingaben:

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Wenn eure eigene `public_url` auf `localhost` zeigt, läuft ihr offensichtlich lokal, also sind ausgehende Aufrufe zu `localhost` zu erwarten. Wenn `public_url` eine echte Domain ist, bleibt `localhost` blockiert.

Bekannter Residual‑Risiko: `allow_local` ist ein genereller Umgehung. Eine Peer‑Allowlist (spezifische IPs/Ports) ist die richtige Langzeitlösung. Setzt den Umgehung, dokumentiert das Risiko und eröffnet ein Folgethema.
## 5. TaskStore braucht ein Limit, sonst gibt's einen freien DoS

A2A‑Tasks sind zustandsbehaftet. Jede `message/send` creates einen Aufgaben‑Eintrag. Wenn du Aufgaben im Speicher speicherst (angemessen für v1), kann ein Angreifer 100 000 Anfragen senden und deinen Arbeitsspeicher erschöpfen.

Begrenze das. Ich habe 10 000 verwendet mit einer 503‑Antwort, wenn das Limit erreicht ist:

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

Eine Konstante, eine Prüfung, ein Fehlerpfad. Keine Eviction‑Policy in v1. Das ist Komplexität für das Follow‑up. Das Limit allein verhindert den Absturz.

Warum 10 000? Back‑of‑envelope: Jede `Task` ist ungefähr 2‑4 KB serialisiert. 10K Aufgaben = 20‑40 MB. Das passt auf einen Pi Zero 2 W mit 512 MB RAM. Passe es an deine Ziel‑hardware an.
## 6.Fehlernachrichten sind ein Informationskanal

Wenn eine eingehende A2A-Anforderung fehlschlägt, was gibst du zurück?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Du hast gerade bestätigt, dass `abc-123` ein gültiges Task-ID-Format ist und dass dein Store nach ihr indiziert ist. Ein Angreifer kann Task-IDs enumerieren.

Verberge ausgehende Fehler. Protokolliere die vollständigen Details serverseitig:

```rust
// To the caller:
Err(json_rpc_error(-32600, "invalid request"))

// In your logs:
error!(task_id = %id, "task not found in store");
```

Generischer Fehler an den Aufrufer. Spezifischer Fehler in deinen Logs. Gleiches Prinzip wie bei Webanwendungen, aber leicht zu vergessen, wenn du einen Protokollhandler baust und über nützliche JSON-RPC-Antworten nachdenkst.
## 7. Das Tool existiert, aber das Modell kann es nicht sehen

Dieser kostete mich einen ganzen Nachmittag Debugging.

Das A2A-Tool war in Hrafns Tool-Registry registriert. `cargo test` gelang. Die Gateway stellte Agent-Karten bereit. Doch als ich tatsächlich eine Instanz gestartet und sie gebeten habe, mit einem anderen Agenten zu kommunizieren, hatte das Modell keine Ahnung, dass das Tool existierte.

Das Problem: Hrafn verwendet eine textbasierte Toolbeschreibung in seinem Bootstrap-Systemprompt für Modelle, die keine nativen Funktionsaufrufe unterstützen (wie einige OpenAI Codex-Varianten). Das Tool war in der Registry, aber nicht im `tool_descs`-Array, das in den Prompt injiziert wird.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lehre: teste den vollständigen Pfad. Unit-Tests zeigten, dass das Tool beim Aufrufen funktionierte. Integrationstests zeigten, dass die Gateway Anfragen annahm. Aber das Modell rief das Tool nie auf, weil es nicht existierte. E2E-Testing (tatsächliche Modell-Inference, die mit echten Endpunkten spricht) entdeckte, was Unit-Tests nicht konnten.

---
---
## Was ich absichtlichweggelassen habe

* **SSE-Streaming.** A2A unterstützt es, deckt aber synchrones Request/Response 90 % der Anwendungsfälle ab. Streaming ist ergänzend, nicht grundlegend.  
* **mTLS/OAuth.** Bearer-Token reichen für das Vertrauensmodell (gleicher Host, bekannte Partner). Zertifikatbasierte Auth ist für einen Pi-Einsatz Enterprise‑Komplexität. Siehe auch: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).  
* **Agent registry.** Die Entdeckung erfolgt manuell (du konfigurierst die URL). Ein automatischer Registry/mDNS ist für das Folg‑Issue geplant.  
* **Task eviction.** Die 10 K-Grenze ist eine feste Mauer, kein LRU‑Cache. Für v1 ausreichend.
##The setup that proved it works

Five Hrafn Instanzen auf einem einzelnen Raspberry Pi Zero 2 W (quad-core ARM, 512 MB), jeweils mit einer unterschiedlichen Persona (Kerf, Sentinel, Architect, Critic, Researcher), kommunizieren über A2A über lokale Ports 3001-3005. Gestützt von gpt-5.1-codex-mini.

Instance A entdeckt die Agent Card von Instance B, sendet eine Aufgabe ("review this code for security issues"), empfängt eine Antwort über den standardmäßigen `process_message`‑Pipeline. Keine benutzerdefinierte Orchestrierung. Die A2A‑Schicht ist nur ein weiterer Eingabekanal.

Wenn es auf einem Pi Zero läuft, läuft es überall.

Lies die komplette Implementierung in [PR #4166](https://github.com/5queezer/hrafn/pull/4166). Jede oben genannte Gotcha geht zurück auf einen spezifischen Commit mit Tests. Wenn du A2A in dein eigenes Framework integrieren willst, beginne mit dem SSRF-Schutz in `a2a_client.rs` und der TaskStore‑Begrenzung in `task_store.rs`. Die Weiterverfolgung für Peer‑Entdeckung und LAN mDNS ist in [#4643](https://github.com/5queezer/hrafn/issues/4643) dokumentiert.

---

*Christian Pojoni baut [Hrafn](https://github.com/5queezer/hrafn), ein Rust‑Agenten‑Runtime für Edge‑Hardware. Mehr unter [vasudev.xyz](https://vasudev.xyz).*

*Das Cover‑Image für diesen Beitrag wurde von KI generiert.*