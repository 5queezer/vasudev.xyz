---
title: "A2A-Protokoll-Support in Rust veröffentlichen: 7 Fallstricke, vor denen dich niemand warnt"
date: 2026-03-25
description: "Was ich beim Hinzufügen vonAgent-zu-Agent-Protokollunterstützung zu einem Open-Source-Agenten-Framework gelernt habe."
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
author: "Christian Pojoni"
tags: ["rust", "a2a", "security"]
translationHash: "6a0e782582ed268f9942df27fb7c0832"
---
The [A2A (Agent-to-Agent) protocol](https://google.github.io/A2A/) ist Googles offenes Standard‑Protokoll für die Interoperabilität von Agenten -- Entdeckung, Aufgabenvergabe, Lifecycle‑Management über HTTP/JSON‑RPC. Es steht neben MCP, ähnlich wie TCP neben USB: Eines verbindet Agenten miteinander, das andere verbindet Agenten mit Werkzeugen.

Ich habe kürzlich [PR #4166](https://github.com/5queezer/hrafn/pull/4166) veröffentlicht, in dem ich native A2A‑Unterstützung zu Hrafn hinzugefügt habe -- sowohl einen eingehenden JSON‑RPC 2.0‑Server als auch ein ausgehendes Client‑Tool, geschrieben in Rust. Der PR bestand 40 Tests und lief E2E über fünf Raspberry Pi Zero 2 W‑Instanzen. Dabei stieß ich auf jede scharfe Kante, die die Spezifikation nicht erwähnt.

**Die A2A‑Spezifikation ist auf dem Papier sauber; die Sicherheitskanten werden dich in der Produktion zerschneiden.**

## 1. Agent Cards sind per Design unauthentifiziert – und das ist in Ordnung

Die A2A‑Spezifikation sagt, `GET /.well-known/agent-card.json` muss öffentlich erreichbar sein. Kein Bearer‑Token, kein API‑Key. Die erste Reaktion: Das ist ein Informationsleck.

Das ist nicht der Fall. Der Agent‑Card ist Metadaten – Name, Beschreibung, Fähigkeiten, Endpunkt‑URL. Denk daran wie DNS für Agenten. Du würdest DNS nicht hinter Authentifizierung verstecken.

Der eigentliche Haken: Wenn du `public_url` aus der Bind‑Adresse deines Gateways ableitest, leakst du deine interne Netzwerktopologie preis. `0.0.0.0:3000` in einer Agent‑Card sagt einem Angreifer genau, wo er probieren kann. Setze immer eine explizite `public_url` in der Konfiguration und gib beim Fehlen einen Startup‑Warnung aus.

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "A2A agent card will expose internal bind address. \
         Set [a2a].public_url to avoid leaking network topology."
    );
}
```

## 2. Der Vergleich von Bearer‑Tokens muss konstantzeitig erfolgen

Wenn dein A2A‑Server Bearer‑Tokens akzeptiert, brauchst du einen konstantzeitigen Vergleich. Nicht weil dein Threat‑Model Nation‑State‑Timing‑Attacks auf ein Telegram‑Bot‑Framework umfasst -- sondern weil es dich genau zwei Zeilen kostet und eine ganze Klasse von Schwachstellen eliminiert.

`subtle`‑Crate gibt dir `ct_eq`. Benutze es. Die Längenvorprüfung vor dem Vergleich ist bewusst – die Länge selbst ist nicht geheim (sie steht in deiner Konfiguration) und verhindert die Zuweisung eines festen Puffer­größen.

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

## 3. SSRF‑Schutz ist schwieriger, als du denkst

Dein A2A‑Client‑Tool ermöglicht dem Agenten, beliebige URLs aufzurufen: `discover https://agent.example.com`. Das ist einen HTTP‑Aufruf entfernt von `discover http://169.254.169.254/latest/meta-data/` auf jeder Cloud‑Instanz.

Das Blockieren privater IPs erscheint einfach, bis du folgendes erkennst:

**IPv4‑mapped IPv6 umgeht naive Prüfungen.** `::ffff:127.0.0.1` ist localhost. `::ffff:169.254.169.254` ist der Cloud‑Metadata‑Endpoint. Deine Blockliste muss beide Adressfamilien behandeln.

**DNS‑Auflösung erfolgt zweimal.** Du validierst den Hostnamen, er wird zu einer öffentlichen IP aufgelöst. Dein HTTP‑Client verbindet sich -- aber DNS hat sich geändert (DNS‑Rebinding). Jetzt erreichst du eine interne IP. Das ist ein TOCTOU‑Problem (time‑of‑check, time‑of‑use). Die einzige wirkliche Lösung ist, DNS selbst aufzulösen, die IP zu validieren, und dann direkt zu dieser IP zu verbinden.

**Redirects öffnen die Tür erneut.** Du validierst die initiale URL, aber der Server gibt 302 zurück zu `http://localhost:8080/admin`. Dein Redirect‑Policy muss jeden HOP erneut validieren.

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

Dokumentiere das TOCTOU‑Problem ehrlich. Ich habe einen Kommentar im Code und einen Hinweis im PR hinterlassen: "DNS rebinding TOCTOE acknowledged; peer allowlist planned in [#4643](https://github.com/5queezer/hrafn/issues/4643)."

## 4. Same‑host A2A bricht deine eigenen SSRF‑Schutz

Hier ist die Ironie: Ich habe SSRF‑Schutz gebaut, der localhost blockiert. Dann habe ich fünf Hrafn‑Instanzen auf einer einzigen Raspberry Pi Zero 2 W bereitgestellt, und sie konnten nicht miteinander kommunizieren.

Same‑host Multi‑Instance‑A2A ist ein legitimer Anwendungsfall – mehrere spezialisierte Agenten auf einer Maschine, die über `localhost:300X` kommunizieren. Dein SSRF‑Blocklist blockierte das jedoch.

Die Lösung ist ein bedingter Bypass (`allow_local`), abgeleitet aus der Konfiguration und nicht vom Benutzer:

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Wenn deine eigene `public_url` auf localhost zeigt, läuft sie eindeutig lokal, also sind ausgehende Aufrufe zu localhost expected. Wenn `public_url` ein echtes Domänen ist, bleibt localhost blockiert.

Bekannte restliche Risiken: `allow_local` ist ein genereller Bypass. Eine Peer‑Allowlist (spezifische IPs/Ports) ist die richtige Langzeitlösung. Setze den Bypass frei, dokumentiere das Risiko und erstelle das Folgieticket.

## 5. TaskStore braucht ein Limit, sonst gibt es einen freien DoS

A2A‑Aufgaben sind zustandsbehaftet. Jede `message/send`‑Anforderung erstellt einen Task‑Eintrag. Wenn du Aufgaben im Speicher (vernünftig für v1) speicherst, kann ein Angreifer 100 000 Anfragen senden und deinen Heap erschöpfen.

Eine Konstante, eine Prüfung, ein Fehlerpfad. Keine Eviction‑Policy in v1 – das ist Komplexität für das Follow‑up. Die Obergrenze allein verhindert den Crash.

Warum 10 000? Schnellrechnung: Jede `Task` ist etwa 2‑4 KBSerialized. 10 000 Aufgaben = 20‑40 MB. Akzeptabel auf einem Pi Zero 2 W mit 512 MB RAM. Passe es für deine Zielhardware an.

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

## 6. Fehlernachrichten sind ein Informationskanal

Wenn eine eingehende A2A‑Anfrage fehlschlägt, was gibst du zurück?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Du hast gerade bestätigt, dass `abc-123` ein gültiges Task‑ID‑Format ist und dass dein Store nach ihr indiziert ist. Ein Angreifer kann Task‑IDs enumerieren.

Generischer Fehler an den Aufrufer. Spezifischer Fehler in deinen Logs. Gleiches Prinzip wie bei Web‑Anwendungen – aber leicht zu vergessen, wenn du ein Protokoll‑Handler baust und an hilfreiche JSON‑RPC‑Antworten denkst.

```rust
// To the caller:
Err(json_rpc_error(-32600, "invalid request"))

// In your logs:
error!(task_id = %id, "task not found in store");
```

## 7. Das Tool existiert, aber das Modell kann es nicht sehen

Dieser Punkt kostete mich einen Nachmittag Debugging.

Das A2A‑Tool war im Tool‑Registry von Hrafn registriert. `cargo test` passte. Die Gateway‑Dienstleistung zeigte Agent‑Cards an. Aber als ich tatsächlich eine Instanz gestartet und sie bat, einen anderen Agenten zu kontaktieren, hatte das Modell keine Ahnung, dass das Tool existierte.

Das Problem: Hrafn nutzt eine textbasierte Tool‑Beschreibungsliste im Bootstrap‑System‑Prompt für Modelle, die keine nativen Funktionsaufrufe unterstützen (wie einige OpenAI Codex‑Varianten). Das Tool war im Registry, aber nicht im `tool_descs`‑Array, das in den Prompt injiziert wird.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lektion: Teste den vollständigen Pfad. Unit‑Tests zeigten, dass das Tool funktioniert, wenn es aufgerufen wird. Integration‑Tests zeigten, dass die Gateway‑Anfragen akzeptiert werden. Aber das Modell rief das Tool nie auf, weil es nicht wusste, dass es existiert. E2E‑Tests – echte Modell‑Inference, die mit echten Endpunkten kommuniziert – erwischten, was Unit‑Tests nicht konnten.

## Was ich bewusst außen vor ließ (intentionally)

Der PR beinhaltet explizit nicht:

* **SSE Streaming** -- A2A unterstützt es, aber synchrones Request/Response deckt 90 % der Anwendungsfälle ab. Streaming ist ergänzend, nicht grundlegend.
* **mTLS/OAuth** -- Bearer‑Tokens reichen für das Vertrauensmodell (gleicher Host, bekannte Peers). Zertifikats‑basierte Auth ist Enterprise‑Komplexität für ein Pi‑Setup. Siehe auch: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Agent registry** -- Discovery ist manuell (du konfigurierst die URL). Ein automatisches Registry/mDNS ist im Folgieticket geplant.
* **Task eviction** -- Der 10K‑Cap ist eine feste Grenze, kein LRU‑Cache. Gut genug für v1.

Jede „nicht‑eingeschlossene“ Sache ist eine Scope‑Entscheidung, kein Gap. Die PR‑Beschreibung listet jede mit einem Link zum Folgieticket auf. Reviewer können genau sehen, was berücksichtigt und was aufgeschoben wurde.

## Die Einrichtung, die es beweist

Fünf Hrafn‑Instanzen auf einer einzigen Raspberry Pi Zero 2 W (Quad‑Core ARM, 512 MB), jeweils mit einer distincten Persona (Kerf, Sentinel, Architect, Critic, Researcher), die über A2A auf localhost‑Ports 3001‑3005 kommunizieren. Gestützt von gpt-5.1-codex-mini.

Instanz A entdeckt die Agent‑Card von Instanz B, sendet eine Aufgabe (“review this code for security issues”), erhält eine Antwort über den standardmäßigen `process_message`‑Pipeline. Keine benutzerdefinierte Orchestrierung. Die A2A‑Schicht ist nur ein weiterer Eingabekanal.

Wenn es auf einem Pi Zero läuft, läuft es überall.

Lies die vollständige Implementierung in [PR #4166](https://github.com/5queezer/hrafn/pull/4166) -- jeder oben beschriebene Haken mappt zu einem spezifischen Commit mit Tests. Wenn du A2A in dein eigenes Framework integrierst, beginne mit dem SSRF‑Schutz in `a2a_client.rs` und dem TaskStore‑Cap in `task_store.rs`. Der Follow‑up für Peer‑Discovery und LAN‑mDNS wird in [#4643](https://github.com/5queezer/hrafn/issues/4643) verfolgt.

---

*Ich schreibe über Systeme, Sicherheit und die Schnittstelle von KI‑Agenten mit realistischer Infrastruktur auf [vasudev.xyz](https://vasudev.xyz).*  

*Das Cover‑Bild für diesen Beitrag wurde von KI generiert.*