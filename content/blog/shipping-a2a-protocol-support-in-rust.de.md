---
title: "Versand von A2A-Protokoll-Unterstützung in Rust: 7 Fallstricke, vor denen dich niemand warnt"
date: 2026-03-25
description: "Was ich gelernthabe, indem ich Agent-to-Agent-Protokollunterstützung in ein offenes Quellcode-Agent-Framework einfügte."
author: "Christian Pojoni"
tags: ["rust", "a2a", "security", "hrafn"]
translationHash: "b940abc59c347db0bbb28561f88a2c4a"
---
Das [A2A (Agent-to-Agent) Protokoll](https://google.github.io/A2A/) ist Googles offener Standard für die Interoperabilität von Agenten – Discovery, Aufgaben-Delegation, Lebenszyklus-Management über HTTP/JSON-RPC. Es steht neben MCP so, wie TCP neben USB steht: Das eine verbindet Agenten mit Agenten, das andere verbindet Agenten mit Tools.

Ich habe kürzlich [PR #4166](https://github.com/5queezer/hrafn/pull/4166) veröffentlicht, der native A2A-Unterstützung zu Hrafn hinzufügt – sowohl einen eingehenden JSON-RPC 2.0-Server als auch ein ausgehendes Client-Tool, geschrieben in Rust. Der PR bestand 40 Tests und lief E2E über fünf Raspberry Pi Zero 2 W-Instanzen. Dabei bin ich auf jede scharfe Kante gestoßen, die die Spezifikation nicht erwähnt.

**Die A2A-Spezifikation ist auf dem Papier sauber; die sicherheitskritischen Fallstricke werden dich in der Produktion erwischen.**

## 1. Agent Cards sind bewusst nicht authentifiziert -- und das ist in Ordnung

Die A2A-Spezifikation besagt, dass `GET /.well-known/agent-card.json` öffentlich zugänglich sein muss. Kein Bearer-Token, kein API-Key. Erster Impuls: Das ist ein Informationsleck.

Ist es nicht. Die Agent Card enthält Metadaten – Name, Beschreibung, Fähigkeiten, Endpunkt-URL. Stell es dir wie DNS für Agenten vor. Du würdest DNS auch nicht hinter eine Authentifizierung stellen.

Der eigentliche Knackpunkt: Wenn du `public_url` von der Bind-Adresse deines Gateways ableitest, leakagest du deine interne Netzwerktopologie. `0.0.0.0:3000` in einer Agent Card verrät einem Angreifer genau, wo er sondieren muss. Fordere immer eine explizite `public_url` in der Config und gib eine Startwarnung aus, falls sie fehlt.

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "A2A agent card will expose internal bind address. \
         Set [a2a].public_url to avoid leaking network topology."
    );
}
```

## 2. Der Bearer-Token-Vergleich muss mit konstanter Laufzeit erfolgen

Wenn dein A2A-Server Bearer-Tokens akzeptiert, benötigst du einen Vergleich mit konstanter Laufzeit. Nicht, weil dein Bedrohungsmodell Timing-Angriffe von Nationalstaaten auf ein Telegram-Bot-Framework umfasst -- sondern weil es dich exakt zwei Codezeilen kostet und eine ganze Klasse von Schwachstellen eliminiert.

Das Standard-`==` bei Strings bricht beim ersten nicht übereinstimmenden Byte vorzeitig ab. Ein Angreifer, der Antwortzeiten mit ausreichend Präzision messen kann, kann Tokens Byte für Byte per Brute-Force erraten. Unwahrscheinlich? Ja. Vermeidbar? Ebenfalls ja.

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

Das Crate `subtle` liefert dir `ct_eq`. Verwende es. Die Längenprüfung vor dem Vergleich ist beabsichtigt -- die Länge selbst ist kein Geheimnis (sie steht in deiner Config), und sie vermeidet die Allokation eines Puffers fester Größe.

## 3. SSRF-Schutz ist schwieriger, als man denkt

Dein A2A-Client-Tool lässt den Agenten beliebige URLs aufrufen: `discover https://agent.example.com`. Das ist nur ein HTTP-Aufruf entfernt von `discover http://169.254.169.254/latest/meta-data/` auf jeder Cloud-Instanz.

Das Blockieren privater IPs scheint einfach, bis man erkennt:

**IPv4-gemapptes IPv6 umgeht naive Prüfungen.** `::ffff:127.0.0.1` ist localhost. `::ffff:169.254.169.254` ist der Cloud-Metadaten-Endpunkt. Deine Blockliste muss beide Adressfamilien berücksichtigen.

**Die DNS-Auflösung erfolgt zweimal.** Du validierst den Hostnamen, er löst sich zu einer öffentlichen IP auf. Dein HTTP-Client stellt eine Verbindung her -- aber DNS hat sich geändert (DNS-Rebinding). Jetzt triffst du auf eine interne IP. Dies ist eine TOCTOU (Time-of-Check, Time-of-Use) Lücke. Die einzige echte Lösung besteht darin, DNS selbst aufzulösen, die IP zu validieren und sich dann direkt mit dieser IP zu verbinden.

**Weiterleitungen öffnen die Tür erneut.** Du validierst die initiale URL, aber der Server leitet dich per 302 nach `http://localhost:8080/admin` weiter. Deine Weiterleitungsrichtlinie muss jeden Hop erneut validieren.

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

Dokumentiere die TOCTOU-Lücke offen. Ich habe einen Kommentar im Code und eine Notiz im PR hinterlassen: "DNS rebinding TOCTOU acknowledged; peer allowlist planned in [#4643](https://github.com/5queezer/hrafn/issues/4643)."

## 4. A2A auf demselben Host umgeht deinen eigenen SSRF-Schutz

Hier liegt die Ironie: Ich habe einen SSRF-Schutz gebaut, der localhost blockiert. Dann habe ich fünf Hrafn-Instanzen auf einem einzigen Raspberry Pi bereitgestellt und sie konnten nicht miteinander kommunizieren.

Multi-Instanz-A2A auf demselben Host ist ein legitimer Anwendungsfall -- mehrere spezialisierte Agenten auf einer Maschine, die über `localhost:300X` kommunizieren. Aber deine SSRF-Blockliste hat es einfach blockiert.

Die Lösung ist ein bedingter Umgehungspfad (`allow_local`), der aus der Config und nicht aus Benutzereingaben abgeleitet wird:

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Wenn deine eigene `public_url` auf localhost zeigt, läuft das System offensichtlich lokal, daher sind ausgehende Aufrufe zu localhost zu erwarten. Ist `public_url` eine echte Domain, bleibt localhost blockiert.

Bekanntes Restrisiko: `allow_local` ist eine pauschale Umgehung. Eine Peer-Allowlist (spezifische IPs/Ports) ist die korrekte langfristige Lösung. Publizierte die Umgehung, dokumentiere das Risiko, erstelle das Folge-Issue.

## 5. Der TaskStore benötigt ein Limit, sonst bekommst du ein kostenloses DoS

A2A-Tasks sind zustandsbehaftet. Jeder `message/send`-Aufruf erstellt einen Task-Eintrag. Wenn du Tasks im Speicher hältst (für v1 vernünftig), kann ein Angreifer 100.000 Anfragen senden und deinen Heap erschöpfen.

Begrenze es. Ich habe 10.000 mit einer 503-Antwort verwendet, wenn das Limit erreicht ist:

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

Eine Konstante, eine Prüfung, ein Fehlerpfad. Keine Eviction-Strategie in v1 -- das ist Komplexität für das Folge-Update. Das Limit allein verhindert den Absturz.

Warum 10.000? Überschlagsrechnung: Jedes `Task` ist serialisiert etwa 2–4 KB groß. 10K Tasks = 20–40 MB. Akzeptabel auf einem Pi Zero 2 W mit 512 MB RAM. Passe es an deine Zielhardware an.

## 6. Fehlermeldungen sind ein Informationskanal

Was gibst du zurück, wenn eine eingehende A2A-Anfrage fehlschlägt?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Du hast gerade bestätigt, dass `abc-123` ein gültiges Task-ID-Format ist und dass dein Store danach indexiert wird. Ein Angreifer kann Task-IDs aufzählen.

Schwärze ausgehende Fehlermeldungen. Protokolliere die vollständigen Details serverseitig:

```rust
// To the caller:
Err(json_rpc_error(-32600, "invalid request"))

// In your logs:
error!(task_id = %id, "task not found in store");
```

Generischer Fehler für den Aufrufer. Spezifischer Fehler in deinen Logs. Das gleiche Prinzip wie bei Webanwendungen -- aber leicht zu vergessen, wenn man einen Protocol-Handler baut und in nützlichen JSON-RPC-Antworten denkt.

## 7. Das Tool existiert, aber das Modell kann es nicht sehen

Das hat mich einen Nachmittag Debugging gekostet.

Das A2A-Tool war in Hrafns Tool-Registry registriert. `cargo test` war erfolgreich. Das Gateway lieferte Agent Cards. Aber als ich eine Instanz tatsächlich startete und sie bat, einen anderen Agenten zu kontaktieren, hatte das Modell keine Ahnung, dass das Tool existiert.

Das Problem: Hrafn verwendet eine textbasierte Tool-Beschreibungsliste in seinem Bootstrap-System-Prompt für Modelle, die kein natives Function Calling unterstützen (wie einige OpenAI Codex-Varianten). Das Tool war in der Registry, aber nicht im `tool_descs`-Array, das in den Prompt injiziert wird.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lektion: Teste den gesamten Pfad. Unit-Tests bewiesen, dass das Tool funktioniert, wenn es aufgerufen wird. Integrationstests bewiesen, dass das Gateway Anfragen akzeptiert. Aber das Modell rief das Tool nie auf, weil es nicht wusste, dass es existiert. E2E-Tests -- bei denen echte Modell-Inferenz mit echten Endpunkten kommuniziert -- haben das aufgedeckt, was Unit-Tests übersehen hätten.

---

## Was ich bewusst weggelassen habe

Der PR enthält ausdrücklich nicht:

* **SSE-Streaming** -- A2A unterstützt es, aber synchrones Request/Response deckt 90 % der Anwendungsfälle ab. Streaming ist ergänzend, nicht fundamental.
* **mTLS/OAuth** -- Bearer-Tokens sind für das Vertrauensmodell ausreichend (gleicher Host, bekannte Peers). Zertifikatsbasierte Authentifizierung ist Komplexität auf Enterprise-Niveau für ein Pi-Deployment. Siehe auch: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Agent-Registry** -- Das Discovery ist manuell (du konfigurierst die URL). Eine automatische Registry/mDNS ist im Folge-Issue geplant.
* **Task-Eviction** -- Das 10K-Limit ist eine harte Grenze, kein LRU-Cache. Gut genug für v1.

Jeder „nicht enthaltene“ Punkt ist eine Scope-Entscheidung, keine Lücke. Die PR-Beschreibung listet jeden einzelnen mit einem Link zum Folge-Issue auf. Reviewer können genau sehen, was erwogen und verschoben wurde.

## Das Setup, das bewiesen hat, dass es funktioniert

Fünf Hrafn-Instanzen auf einem einzigen Raspberry Pi Zero 2 W (Quad-Core-ARM, 512 MB), jede mit einer eigenen Persona (Kerf, Sentinel, Architect, Critic, Researcher), die über A2A auf den localhost-Ports 3001–3005 kommunizieren. Unterstützt von gpt-5.1-codex-mini.

Instanz A ruft die Agent Card von Instanz B auf, sendet eine Aufgabe („Überprüfe diesen Code auf Sicherheitsprobleme“) und erhält eine Antwort über die standardmäßige `process_message`-Pipeline. Keine benutzerdefinierte Orchestrierung. Die A2A-Schicht ist einfach nur ein weiterer Eingabekanal.

Wenn es auf einem Pi Zero läuft, läuft es überall.

Lies die vollständige Implementierung in [PR #4166](https://github.com/5queezer/hrafn/pull/4166) -- jede der oben genannten Fallstricke ist einem spezifischen Commit mit Tests zugeordnet. Wenn du A2A in dein eigenes Framework einbaust, beginne mit dem SSRF-Schutz in `a2a_client.rs` und dem TaskStore-Limit in `task_store.rs`. Die Weiterentwicklung für Peer-Discovery und LAN-mDNS wird in [#4643](https://github.com/5queezer/hrafn/issues/4643) verfolgt.

---

*Ich schreibe über Systeme, Sicherheit und die Schnittstelle von KI-Agenten mit echter Infrastruktur auf [vasudev.xyz](https://vasudev.xyz).*