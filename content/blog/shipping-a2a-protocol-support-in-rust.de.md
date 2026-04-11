---
title: "Einführung der A2A-Protokoll-Unterstützung in Rust: 7 Gotchas, vor denen dich niemand warnt"
date: 2026-03-25
description: "Was ich beim Hinzufügen von Agent‑zu‑Agent‑Protokoll‑Unterstützung zu einem Open‑Source‑Agenten‑Framework gelernt habe"
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
author: "Christian Pojoni"
tags: ["rust", "a2a", "security"]
series: ["Field Notes"]
translationHash: "e49e1a8762cabb38544bf8328b98c93d"
chunkHashes: "464e3e41b8d8b968,7d3e0b3378417e09,aa7513a6486f8faf,a825fb9bc8a4bae3,5dea57e52b8e70d4,28ed198a8cd428fc,685d9c5b09d7dcf3,6eadb412a20580a0,7262b64366b7ff90,e9307644648922c1"
---
## 1. Agent Cards sind per Definition unauthentifiziert, und das ist in Ordnung

The [A2A (Agent-to-Agent) protocol](https://github.com/google/A2A) ist Google's offenes Standardverfahren für die Interoperabilität von Agenten: Entdeckung, Auftragsdelegierung, Lifecycle‑Management über HTTP/JSON‑RPC. Sie liegt neben MCP, genau wie TCP neben USB liegt: einer verbindet Agenten mit Agenten, der andere verbindet Agenten mit Werkzeugen.

Ich habe vor kurzem [PR #4166](https://github.com/5queezer/hrafn/pull/4166) mit nativem A2A‑Support zu Hrafn hinzugefügt. Das bedeutet sowohl einen eingehenden JSON‑RPC 2.0‑Server als auch ein ausgehenden Client‑Tool, geschrieben in Rust. Die PR bestand 40 Tests und lief E2E über fünf Raspberry Pi Zero 2 W‑Instanzen. Auf dem Weg bin ich über jede scharfe Kante gestolpert, die die Spezifikation nicht erwähnt.

**Die A2A‑Spezifikation ist auf dem Papier sauber. Die Sicherheits‑Kanten werden dich in der Produktion schneiden.**
## 1. Agent Cards are unauthenticated by design, and that's fine

Das [A2A (Agent-to-Agent)-Protokoll](https://github.com/google/A2A) ist Googles offenes Standardverfahren für die Interoperabilität von Agenten: Discovery, task delegation, lifecycle management über HTTP/JSON-RPC. Es steht neben MCP, ähnlich wie TCP neben USB liegt: Eines verbindet Agenten miteinander, das andere verbindet Agenten mit Werkzeugen.

Kürzlich habe ich [PR #4166](https://github.com/5queezer/hrafn/pull/4166) native A2A‑Unterstützung zu Hrafn hinzugefügt. Das bedeutet sowohl einen eingehenden JSON‑RPC 2.0 Server als auch ein ausgehendes Client‑Tool, geschrieben in Rust. Die PR bestand 40 Tests und lief über fünf Raspberry Pi Zero 2 W Instanzen end‑to‑end. Dabei stieß ich auf jede scharfe Kante, die die Spezifikation nicht erwähnt.

**Die A2A‑Spezifikation ist auf dem Papier sauber. Die Sicherheits‑Kanten werden dich in der Produktion schneiden.**
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

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
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

## 3.SSRF-Schutz ist schwieriger als man denkt

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
## 4.Same-host A2A breaks your own SSRF protection

Hier ist das Ironie: Ich habe SSRF‑Schutz gebaut, der localhost blockt. Dann habe ich fünf Hrafn‑Instanzen auf einem einzigen Raspberry Pi bereitgestellt, und sie konnten nicht miteinander kommunizieren.

Same‑host multi‑instance A2A ist ein legitimer Anwendungsfall. Mehrere spezialisierte Agents auf einer Maschine kommunizieren über `localhost:300X`. Euer SSRF‑Blocklist hat das einfach blockiert.

Die Lösung ist ein bedingter Umgehungscode (`allow_local`), der aus der Konfiguration und nicht aus Benutzereingaben abgeleitet wird:

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Wenn eure eigene `public_url` auf localhost zeigt, läuft ihr offensichtlich lokal, also sind ausgehende Aufrufe an localhost erwartet. Wenn `public_url` eine echte Domain ist, bleibt localhost blockiert.

Bekanntes restriktionelles Risiko: `allow_local` ist ein genereller Umgehungscode. Eine Peer‑Allowlist (spezifische IPs/Ports) ist die richtige Langzeitlösung. Shippe den Umgehungscode, dokumentiere das Risiko, und erstelle das Nachverfolgungs‑Issue.
## 5. TaskStore brauchtein Limit, sonst gibt's einen freien DoSA2A‑Aufgaben sind zustandsbehaftet. Jeder `message/send` erstellt einen Task‑Eintrag. Wenn Sie Aufgaben im Speicher (für v1 üblich) speichern, kann ein Angreifer 100.000 Anfragen senden und Ihren Heap aufbrauchen.

Begrenzen Sie die Anzahl. Ich habe 10.000 verwendet und gebe beim Vollwerden einen 503‑Fehler zurück:

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

Eine Konstante, eine Prüfung, ein Fehlerfall. In v1 gibt es keine Aufräum‑Politik. Das ist Komplexität für die Nachbereitung. Allein die Begrenzung verhindert den Absturz.

Warum 10.000? Auf den ersten Blick: Jedes `Task` ist etwa 2–4 KB groß beim Serialisieren. 10 K Aufgaben = 20–40 MB. Akzeptabel auf einem Raspberry Pi Zero 2 W mit 512 MB RAM. Passen Sie die Zahl für Ihre Zielhardware an.
## 6. Fehlerausgaben sind ein Informationskanal

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
## 7.Das Tool ist registriert, aber das Modell kann es nicht sehen

Dieser kostete mich einen Nachmittag Debugging.

Das A2A‑Tool war im Tool‑Registry von Hrafn registriert. `cargo test` bestand. Die Gateway‑Instanz stellte Agent‑Karten bereit. Doch als ich tatsächlich eine Instanz gestartet und sie gebeten hatte, mit einem anderen Agenten zu kommunizieren, hatte das Modell keine Ahnung, dass das Tool existierte.

Das Problem: Hrafn verwendet in seinem Bootstrap‑System‑Prompt für Modelle, die native Funktionsaufrufe nicht unterstützen (wie einige OpenAI Codex‑Varianten), eine texte‑basierte Tool‑Beschreibungs‑Liste. Das Tool war im Registry, aber nicht im `tool_descs`‑Array, das in den Prompt injiziert wird.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lektion: Teste den vollständigen Pfad. Unit‑Tests zeigten, dass das Tool funktionierte, wenn es aufgerufen wurde. Integrationstests zeigten, dass die Gateway‑Anfragen akzeptiert wurden. Aber das Modell rief das Tool nie auf, weil es nicht wusste, dass es existierte. E2E‑Tests (echte Modell‑Inference, die mit echten Endpunkten kommuniziert) entdeckten, was Unit‑Tests nicht konnten.
---
## Was ich bewusst weggelassenhabe (absichtlich)

Der PR enthält ausdrücklich **nicht**:

* **SSE-Streaming.** A2A unterstützt es, aber synchroner Request/Response deckt 90 % der Anwendungsfälle ab. Streaming ist ergänzend, nicht grundlegend.
* **mTLS/OAuth.** Bearer-Token reichen für das Trust-Model (gleicher Host, bekannte Peers). Zertifikatbasierte Auth ist Enterprise‑Grade‑Komplexität für einen Pi‑Einsatz. Siehe außerdem: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Agenten-Registry.** Die Entdeckung ist manuell (Sie konfigurieren die URL). Automatisches Registry/mDNS ist für das Issue geplant.
* **Task eviction.** Die 10 K‑Grenze ist eine feste Grenze, kein LRU‑Cache. Für v1 ausreichend.

Jede „nicht enthalten“-Entscheidung ist eine bewusste Scope‑Entscheidung, kein Mangel. Die PR‑Beschreibung führt jede Punktuell mit einem Link zum Folgemaß‑Issue auf. Reviewer können genau sehen, was berücksichtigt und vertagt wurde.
##Die Einrichtung, die es funktionieren lässt

Fünf Hrafn‑Instanzen auf einem einzelnen Raspberry Pi Zero 2 W (quad‑core ARM, 512 MB), jeweils mit einer unterschiedlichen Persönlichkeit (Kerf, Sentinel, Architect, Critic, Researcher), die via A2A über localhost‑Ports 3001‑3005 kommunizieren. Gestützt von gpt‑5.1-codex-mini.

Instanz A discovert die Agentenkarte von Instanz B, sendet eine Aufgabe („review this code for security issues“), erhält eine Antwort über die standardmäßige `process_message`-Pipeline. Keine benutzerdefinierte Orchestrierung. Die A2A‑Schicht ist nur ein weiterer Eingabe‑Kanal.

Wenn es auf einem Pi Zero läuft, läuft es überall.

Lies die vollständige Implementierung in [PR #4166](https://github.com/5queezer/hrafn/pull/4166). Jede Gotcha oben entspricht einem bestimmten Commit mit Tests. Wenn du A2A in dein eigenes Framework integrierst, fang mit dem SSRF‑Schutz in `a2a_client.rs` und der TaskStore‑Grenze in `task_store.rs` an. Der Folgemaßstab für Peer‑Entdeckung und LAN‑mDNS ist im [#4643](https://github.com/5queezer/hrafn/issues/4643) verfolgt.

---

*Christian Pojoni entwickelt [Hrafn](https://github.com/5queezer/hrafn), einen Rust‑Agenten‑Runtime für Edge‑Hardware. Mehr bei [vasudev.xyz](https://vasudev.xyz).*

*Das Titelbild für diesen Beitrag wurde von KI generiert.*
## 3. SSRF-Schutzist schwieriger als du denkst

Ihr A2A-Client-Tool lässt den Agenten beliebige URLs aufrufen: `discover https://agent.example.com`. Das ist nur einen HTTP-Aufruf entfernt von `discover http://169.254.169.254/latest/meta-data/` auf jeder Cloud‑Instanz.

Das Blockieren privater IPs scheint einfach, bis man bemerkt:

**IPv4-gemapptes IPv6 umgeht naive Prüfungen.** `::ffff:127.0.0.1` ist localhost. `::ffff:169.254.169.254` ist der Cloud‑Metadata‑Endpunkt. Ihre Blockliste muss beide Adressfamilien behandeln.

**DNS‑Auflösung erfolgt zweimal.** Sie validieren den Hostnamen, er wird zu einer öffentlichen IP. Ihr HTTP‑Client verbindet sich, aber die DNS‑Einträge ändern sich (DNS‑Rebinding). Jetzt treffen Sie eine interne IP. Das ist ein TOCTOU‑Lücke (time‑of‑check, time‑of‑use). Der einzige wirkliche Fix ist, selbst DNS aufzulösen, die IP zu validieren und dann direkt zu dieser IP zu verbinden.

**Redirects öffnen die Tür erneut.** Sie validieren die initiale URL, aber der Server leitet Sie zu `http://localhost:8080/admin` um. Ihre Redirect‑Richtlinie muss jede Hüpferneuerungsprüfung wiederholen.

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

Die TOCTOU‑Lücke ehrlich dokumentieren. Ich habe einen Kommentar im Code und einen Hinweis im Pull‑Request hinterlassen: "DNS rebinding TOCTOU acknowledged. Peer allowlist planned in [#4643](https://github.com/5queezer/hrafn/issues/4643)."
## 4. Same-Host A2A bricht deinen eigenen SSRF-Schutz

Hier ist das Ironie: Ich habe SSRF-Schutz gebaut, der localhost blockt. Dann habe ich fünf Hrafn-Instanzen auf einem einzigen Raspberry Pi deployed, und sie konnten nicht miteinander kommunizieren.

Same-Host Multi-Instanz A2A ist ein legitimierter Use Case. Mehrere spezialisierte Agenten auf einer Maschine kommunizieren über `localhost:300X`. Aber deine SSRF-Blockliste blockierte das einfach.

Die Lösung ist ein bedingter Bypass (`allow_local`), der aus der Konfiguration stammt, nicht aus Benutzereingabe:

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Wenn deine eigene `public_url` auf localhost zeigt, bist du offensichtlich lokal unterwegs, also sind ausgehende Aufrufe zu localhost zu erwarten. Wenn `public_url` eine echte Domain ist, bleibt localhost blockiert.

Bekannter restlicher Risiko: `allow_local` ist ein generischer Bypass. Eine Peer-Allowlist (spezifische IPs/Ports) ist die richtige Langzeitlösung. Setze den Bypass, dokumentiere das Risiko, erstelle das Follow-up-Issue.
## 5. TaskStore benötigt ein Limit, sonst gibt es einen freien DoS

A2A‑Aufgaben sind zustandsbehaftet. Jede `message/send`‑Anforderung erstellt einen Aufgaben‑Eintrag. Wenn du Aufgaben im Speicher speicherst (für v1 sinnvoll), kann ein Angreifer 100.000 Anfragen senden und deinen Heap auslasten.

Begrenze sie. Ich habe 10.000 verwendet und liefere eine 503‑Antwort, wenn das Limit erreicht ist:

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

Eine Konstante, eine Prüfung, ein Fehlerpfad. Keine Eviction‑Policy in v1. Das ist zusätzliche Komplexität für den Follow‑up. Das Limit allein verhindert den Absturz.

Warum 10.000? Back‑of‑the‑Envelope‑Rechnung: Jede `Task` ist etwa 2‑4 KB groß, wenn sie serialisiert wird. 10 K Aufgaben = 20‑40 MB. Das passt auf einen Pi Zero 2 W mit 512 MB RAM. Passe es für deine Zielhardware an.
## 6. Fehlermeldungen sind ein Informationskanal

Wenn eine eingehende A2A-Anfrage fehlschlägt, welche Antwort geben Sie zurück?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Sie haben gerade bestätigt, dass `abc-123` ein gültiges Task-ID-Format ist und dass Ihr Store davon keyed ist. Ein Angreifer kann Task-IDs auflisten.

```rust
// To the caller:
Err(json_rpc_error(-32600, "invalid request"))

// In your logs:
error!(task_id = %id, "task not found in store");
```

Generischer Fehler für den Aufrufer. Spezifischer Fehler in Ihren Logs. Gleiches Prinzip wie bei Webanwendungen, aber leicht zu vergessen, wenn man einen Protokollhandler baut und über hilfreiche JSON-RPC-Antworten nachdenkt.
## 7.Das Tool existiert, aber das Modell kann es nicht sehen

Dieses kostete mich einen Nachmittag Debugging.

Das A2A-Tool war in Hrafn's Tool-Registry registriert. `cargo test` war erfolgreich. Die Gateway präsentierte Agentenkarten. Doch als ich eine Instanz ausführte und sie bat, mit einem anderen Agenten zu kommunizieren, war dem Modell das Tool nicht bekannt.

Das Problem: Hrafn verwendet eine textbasierte Tool-Beschreibungsliste in seinem Bootstrap-System-Prompt für Modelle, die keinen nativen Funktionsaufruf unterstützen (wie einige OpenAI Codex-Varianten). Das Tool war in der Registry, jedoch nicht im `tool_descs`‑Array, das in den Prompt injiziert wird.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lehre: Teste den vollständigen Pfad. Unit‑Tests zeigten, dass das Tool beim Aufrufen funktionierte. Integrations‑Tests zeigten, dass die Gateway Anfragen akzeptierte. Doch das Modell rief das Tool nie auf, weil es nicht wusste, dass es existierte. E2E‑Tests (tatsächliches Modell‑Inference mit echten Endpunkten) entdeckten, was Unit‑Tests nicht konnten.

---
##Was ich bewusst weglassen habe (absichtlich)

* **SSE streaming.** A2A unterstützt es, aber synchroner Anfrage/Antwort-Handling deckt 90 % der Anwendungsfälle ab. Streaming ist ergänzend, nicht grundlegend.  
* **mTLS/OAuth.** Bärentokens sind ausreichend für das Vertrauensmodell (gleicher Host, bekannte Peers). Zertifikatbasierte Authentifizierung ist unternehmenskomplexe Komplexität für ein Pi‑Setup. Siehe auch: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).  
* **Agent registry.** Die Entdeckung erfolgt manuell (Sie konfigurieren die URL). Ein automatischer Registry/mDNS‑Dienst ist für das Follow‑up‑Issue geplant.  
* **Task eviction.** Die 10K‑Grenze ist eine feste Grenze, kein LRU‑Cache. Gut genug für v1.
## Die Einrichtung, die funktioniert hat

Fünf Hrafn-Instanzen auf einem einzigen Raspberry Pi Zero 2 W (quad-core ARM, 512 MB), jede mit einer eigenen Persona (Kerf, Sentinel, Architect, Critic, Researcher), die über A2A auf Lokalhost-Ports 3001-3005 kommunizieren. Gestützt durch gpt-5.1-codex-mini.

Instanz A entdeckt die Agentenkarte von Instanz B, sendet eine Aufgabe ("review this code for security issues"), erhält eine Antwort über die Standard-`process_message`-Pipeline. Keine benutzerdefinierte Orchestrierung. Die A2A-Ebene ist nur ein weiterer Eingabekanal.

Wenn es auf einem Pi Zero läuft, läuft es überall.

Lesen Sie die vollständige Implementierung in [PR #4166](https://github.com/5queezer/hrafn/pull/4166). Jeder obige Punkt entspricht einem bestimmten Commit mit Tests. Wenn Sie A2A in Ihr eigenes Framework integrieren, beginnen Sie mit dem SSRF-Schutz in `a2a_client.rs` und der TaskStore-Obergrenze in `task_store.rs`. Der Folgemaßstab für Peer-Discovery und LAN-mDNS ist in [#4643](https://github.com/5queezer/hrafn/issues/4643) verfolgt.

---

*Christian Pojoni baut [Hrafn](https://github.com/5queezer/hrafn), ein Rust-Agenten-Runtime für Edge-Hardware. Mehr unter [vasudev.xyz](https://vasudev.xyz).*

*Das Cover-Bild für diesen Beitrag wurde von KI generiert.*
## 4. Same-Host A2A bricht eigenen SSRF-Schutz

Hier ist die Ironie: Ich habe SSRF-Schutz gebaut, der localhost sperrt. Dann habe ich fünf Hrafn‑Instanzen auf einem einzigen Raspberry Pi bereitgestellt, und sie konnten nicht miteinander kommunizieren.

Multi‑Instanz‑A2A auf einer einzelnen Maschine ist ein legitimer Anwendungsfall. Mehrere spezialisierte Agenten auf einer Maschine kommunizieren über `localhost:300X`. Aber deine SSRF‑Sperrliste blockierte das.

Die Lösung ist ein bedingter Bypass (`allow_local`), der aus der Konfiguration und nicht aus der Benutzereingabe stammt:

```rustlet allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Wenn deine eigene `public_url` auf localhost zeigt, befindest du dich eindeutig im lokalen Betrieb, sodass ausgehenden Aufrufen zu localhost erwartet werden. Ist `public_url` jedoch eine echte Domain, bleibt localhost gesperrt.

Bekannter Residuum‑Risiko: `allow_local` ist ein generischer Bypass. Eine Peer‑Allowlist (spezifische IPs/Ports) ist die richtige langfristige Lösung. Implementiere den Bypass, dokumentiere das Risiko und erstelle das Folgemanagement‑Issue.
## 5. TaskStore braucht ein Limit, oder du bekommst kostenlosen DoS

A2A‑Aufgaben sind zustandsbehaftet. Jede `message/send`‑Anforderung erstellt einen Aufgaben‑Eintrag. Wenn du Aufgaben im Speicher speicherst (angemessen für v1), kann ein Angreifer 100.000 Anfragen senden und deinen Heap erschöpfen.

Begrenze es. Ich habe 10.000 verwendet mit einer 503‑Antwort, wenn das Limit erreicht ist:

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

Eine Konstante, eine Prüfung, ein Fehlerpfad. In v1 gibt es keine Aufräumungs‑Policy. Das ist Komplexität für die Nachverfolgung. Der Limit allein verhindert den Absturz.

Warum 10.000? Back-of-envelope: jedes `Task` ist ungefähr 2‑4 KB groß, wenn es serialisiert wird. 10 000 Aufgaben = 20‑40 MB. Akzeptabel auf einem Pi Zero 2 W mit 512 MB RAM. Passe es für deine Zielhardware an.
## 6.Fehlermeldungen sind ein Informationskanal

Wenn eine eingehende A2A‑Anforderung fehlschlägt, was gibst du zurück?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Du hast bestätigt, dass `abc-123` ein gültiges Task‑ID‑Format ist und dass dein Store nach ihr indiziert wird. Ein Angreifer kann Task‑IDs aufzählen.

Verstecke ausgehende Fehler. Protokolliere die vollständigen Details serverseitig:

```rust
// To the caller:
Err(json_rpc_error(-32600, "invalid request"))

// In deinen Logs:
error!(task_id = %id, "task not found in store");
```

Allgemeine Fehler an den Aufrufer. Konkrete Fehler in deinen Logs. Das gleiche Prinzip wie bei Web‑Anwendungen, aber leicht zu vergessen, wenn du einen Protocol‑Handler baust und in hilfreichen JSON‑RPC‑Antworten denkst.
## 7. Das Werkzeug existiert, aber das Modell kann es nicht sehen

Dieses kostete mich einen Nachmittag debugging.

Das A2A‑Tool war im Tool‑Register von Hrafn registriert. `cargo test` erfolgreich. Die Gateway‑Instanz servierte Agentenkarten. Aber als ich tatsächlich eine Instanz startete und sie aufforderte, mit einem anderen Agenten zu kommunizieren, hatte das Modell keine Ahnung, dass das Tool existierte.

Das Problem: Hrafn verwendet in seinem Bootstrapsystem‑Prompt für Modelle, die native Funktionsaufrufe nicht unterstützen (wie einige OpenAI Codex‑Varianten), eine textbasierte Tool‑Beschreibungsliste. Das Tool war zwar im Register, aber nicht im `tool_descs`‑Array, das in den Prompt injiziert wird.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lektion: Teste den gesamten Pfad. Unit‑Tests zeigten, dass das Tool beim Aufrufen funktionierte. Integration‑Tests zeigten, dass das Gateway Anfragen akzeptierte. Doch das Modell rief das Tool nie auf, weil es nicht wusste, dass es existierte. E2E‑Tests (tatsächliche Modell‑Inference, die zu echten Endpunkten spricht) erwischten, was Unit‑Tests nicht konnten.
---
## Was ich bewusstweggelassen habe (absichtlich)

Die PR enthält ausdrücklich **keine**:

* **SSE streaming.** A2A unterstützt es, aber synchroner Anfrage/Antwort‑Call deckt 90 % der Anwendungsfälle ab. Streaming ist ergänzend, nicht grundlegend.
* **mTLS/OAuth.** Bärentreiber‑Token reichen für das Vertrauensmodell (gleicher Host, bekannte Peers). Zertifikatsbasierte Auth ist Enterprise‑Grade‑Komplexität für ein Pi‑Deployment. Siehe auch: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Agent registry.** Entdeckung ist manuell (du konfigurierst die URL). Automatisches Registry/mDNS ist für das Folgemaß issue geplant.
* **Task eviction.** Die 10K‑Grenze ist eine feste Mauer, kein LRU‑Cache. Für v1 ausreichend.

Jede „nicht enthalten“-Angabe ist eine bewusste Scope‑Entscheidung, kein Mangel. Der PR‑Beschreibung listet jede mit einem Link zum Folgemaß issue auf. Reviewer können genau sehen, was in Erwägung gezogen und vertagt wurde.
## Die Einrichtung, diees funktionieren lässt

Fünf Hrafn‑Instanzen auf einem einzigen Raspberry Pi Zero 2 W (quad‑core ARM, 512 MB), jede mit einer unterschiedlichen Persönlichkeit (Kerf, Sentinel, Architect, Critic, Researcher), kommunizieren via A2A über localhost‑Ports 3001‑3005. Gestützt von gpt-5.1-codex-mini.

Instanz A entdeckt die Agentenkarte von Instanz B, sendet eine Aufgabe ("code für Sicherheitsprobleme überprüfen"), erhält eine Antwort über die standardmäßige `process_message`‑Pipeline. Keine benutzerdefinierte Orchestrierung. Die A2A‑Schicht ist nur ein weiterer Eingabe‑Channel.

Läuft es auf einem Pi Zero, läuft es überall.

Lies die vollständige Implementierung in [PR #4166](https://github.com/5queezer/hrafn/pull/4166). Jede der genannten Gotchas entspricht einem bestimmten Commit mit Tests. Wenn du A2A in dein eigenes Framework integrierst, beginne mit dem SSRF‑Schutz in `a2a_client.rs` und der TaskStore‑Grenze in `task_store.rs`. Die Weiterverfolgung für Peer‑Entdeckung und LAN mDNS ist in [#4643](https://github.com/5queezer/hrafn/issues/4643) verfolgt.

---

*Christian Pojoni entwickelt [Hrafn](https://github.com/5queezer/hrafn), ein Rust‑Agenten‑Runtime für Edge‑Hardware. Mehr unter [vasudev.xyz](https://vasudev.xyz).*

*Das Cover‑Bild für diesen Beitrag wurde von KI generiert.*
