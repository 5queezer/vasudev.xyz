---
title: "A2A Protocol-Unterstützung in Rust veröffentlichen: 7 Fallstricke, vor denen dich niemand warnt"
date: 2026-03-25
description: "Was ich gelernt habe, als ich Unterstützung für das Agent-to-Agent-Protokoll zu einem Open-Source-Agent-Framework hinzugefügt habe."
author: "Christian Pojoni"
tags: ["rust", "a2a", "security", "hrafn"]
translationHash: "dd52c5bc11589c42cbd1fbb029dd25ad"
---
Das [A2A (Agent-to-Agent)-Protokoll](https://google.github.io/A2A/) ist Googles offener Standard für die Agenten-Interoperabilität -- Discovery, Task-Delegation und Lebenszyklus-Management über HTTP/JSON-RPC. Es steht neben MCP so, wie TCP neben USB steht: Das eine verbindet Agenten mit Agenten, das andere verbindet Agenten mit Tools.

Ich habe kürzlich [PR #4166](https://github.com/5queezer/hrafn/pull/4166) veröffentlicht, der Hrafn um native A2A-Unterstützung erweitert -- sowohl einen eingehenden JSON-RPC 2.0-Server als auch ein ausgehendes Client-Tool, geschrieben in Rust. Der PR besteht 40 Tests und wurde E2E über fünf Raspberry Pi Zero 2 W Instanzen hinweg ausgeführt. Auf dem Weg bin ich dabei auf jede Stolperfalle gestoßen, die die Spezifikation nicht erwähnt.

**Die A2A-Spezifikation ist auf dem Papier sauber; die scharfen Sicherheitskanten werden dich im Produktivbetrieb erwischen.**

## 1. Agenten-Karten sind absichtlich nicht authentifiziert -- und das ist in Ordnung

Die A2A-Spezifikation besagt, dass `GET /.well-known/agent-card.json` öffentlich zugänglich sein muss. Kein Bearer-Token, kein API-Schlüssel. Erster Instinkt: Das ist ein Datenleck.

Ist es nicht. Die Agenten-Karte enthält nur Metadaten -- Name, Beschreibung, Fähigkeiten, Endpoint-URL. Man kann sie als DNS für Agenten betrachten. Niemand würde DNS hinter eine Authentifizierung setzen.

Die eigentliche Falle: Wenn du `public_url` aus der Bind-Adresse deines Gateways ableitest, gibst du deine interne Netzwerktopologie preis. `0.0.0.0:3000` in einer Agenten-Karte verrät einem Angreifer genau, wo er ansetzen muss. Fordere immer eine explizite `public_url` in der Konfiguration ein und gib eine Startwarnung aus, falls sie fehlt.

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "A2A agent card will expose internal bind address. \
         Set [a2a].public_url to avoid leaking network topology."
    );
}
```

## 2. Der Vergleich von Bearer-Tokens muss konstantzeitig erfolgen

Wenn dein A2A-Server Bearer-Tokens akzeptiert, brauchst du einen Vergleich in konstanter Zeit. Nicht, weil dein Bedrohungsmodell Timing-Angriffe von Nationalstaaten auf ein Telegram-Bot-Framework beinhaltet -- sondern weil es dich genau zwei Zeilen kostet und eine ganze Klasse von Schwachstellen eliminiert.

Das Standard-`==` bei Strings bricht beim ersten nicht übereinstimmenden Byte ab. Ein Angreifer, der Antwortzeiten mit ausreichender Präzision messen kann, kann Tokens dadurch Byteweise per Brute-Force knacken. Unwahrscheinlich? Ja. Verhinderbar? Ebenfalls ja.

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

Die `subtle`-Crate liefert dir `ct_eq`. Nutze es. Die Längenprüfung vor dem Vergleich ist beabsichtigt -- die Länge selbst ist kein Geheimnis (sie steht in deiner Konfiguration) und sie vermeidet die Allokation eines Puffers fester Größe.

## 3. SSRF-Schutz ist schwieriger, als man denkt

Dein A2A-Client-Tool erlaubt es dem Agenten, beliebige URLs aufzurufen: `discover https://agent.example.com`. Das ist nur einen HTTP-Call entfernt von `discover http://169.254.169.254/latest/meta-data/` auf jeder Cloud-Instanz.

Das Blocken privater IPs scheint einfach, bis man realisiert:

**IPv4-gemapptes IPv6 umgeht naive Prüfungen.** `::ffff:127.0.0.1` ist localhost. `::ffff:169.254.169.254` ist der Cloud-Metadaten-Endpoint. Deine Blockliste muss beide Adressfamilien behandeln.

**Die DNS-Auflösung erfolgt zweimal.** Du validierst den Hostnamen, er löst sich in eine öffentliche IP auf. Dein HTTP-Client verbindet sich -- aber das DNS hat sich geändert (DNS Rebinding). Jetzt triffst du auf eine interne IP. Das ist eine TOCTOU-Lücke (time-of-check, time-of-use). Die einzige echte Lösung ist, DNS selbst aufzulösen, die IP zu validieren und sich dann direkt mit dieser IP zu verbinden.

**Redirects öffnen die Tür erneut.** Du validierst die initiale URL, aber der Server leitet dich per 302 zu `http://localhost:8080/admin` weiter. Deine Redirect-Richtlinie muss jeden Sprung neu validieren.

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

Dokumentiere die TOCTOU-Lücke ehrlich. Ich habe einen Kommentar im Code und einen Hinweis im PR hinterlassen: "DNS Rebinding TOCTOU anerkannt; Peer-Allowlist geplant in [#4643](https://github.com/5queezer/hrafn/issues/4643)."

## 4. Same-Host-A2A setzt deinen eigenen SSRF-Schutz außer Kraft

Die Ironie dabei: Ich habe einen SSRF-Schutz gebaut, der localhost blockt. Dann habe ich fünf Hrafn-Instanzen auf einem einzigen Raspberry Pi deployed, und sie konnten nicht mehr miteinander kommunizieren.

Same-Host-Multi-Instance-A2A ist ein legitimer Anwendungsfall -- mehrere spezialisierte Agenten auf einem Rechner, die über `localhost:300X` kommunizieren. Aber deine SSRF-Blockliste hat das einfach blockiert.

Die Lösung ist ein bedingter Bypass (`allow_local`), der aus der Konfiguration und nicht aus Benutzereingaben abgeleitet wird:

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Wenn deine eigene `public_url` auf localhost zeigt, läuft die Anwendung offensichtlich lokal, daher sind ausgehende Calls zu localhost zu erwarten. Ist `public_url` eine echte Domain, bleibt localhost blockiert.

Bekanntes Restrisiko: `allow_local` ist ein pauschaler Bypass. Eine Peer-Allowlist (spezifische IPs/Ports) ist die korrekte Langzeitlösung. Veröffentliche den Bypass, dokumentiere das Risiko und eröffne das Folge-Issue.

## 5. Der TaskStore braucht ein Limit, sonst bekommst du einen kostenlosen DoS

A2A-Tasks sind zustandsbehaftet. Jeder `message/send`-Aufruf erstellt einen Task-Eintrag. Wenn du Tasks im Speicher hältst (vernünftig für v1), kann ein Angreifer 100.000 Anfragen senden und deinen Heap erschöpfen.

Begrenze es. Ich habe 10.000 verwendet, mit einer 503-Antwort, wenn das Limit erreicht ist:

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

Eine Konstante, eine Prüfung, ein Fehlerpfad. Keine Eviction-Regel in v1 -- das ist Komplexität für die nachfolgende Version. Das Limit allein verhindert den Absturz.

Warum 10.000? Überschlagsrechnung: Jedes `Task` ist serialisiert etwa 2–4 KB groß. 10K Tasks = 20–40 MB. Akzeptabel auf einem Pi Zero 2 W mit 512 MB RAM. Passe es an deine Zielhardware an.

## 6. Fehlermeldungen sind ein Informationskanal

Was gibst du zurück, wenn eine eingehende A2A-Anfrage fehlschlägt?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Du hast damit gerade bestätigt, dass `abc-123` ein gültiges Task-ID-Format ist und dass dein Store danach indiziert ist. Ein Angreifer kann Task-IDs aufzählen.

Schwärze ausgehende Fehlermeldungen. Logge die vollständigen Details serverseitig:

```rust
// To the caller:
Err(json_rpc_error(-32600, "invalid request"))

// In your logs:
error!(task_id = %id, "task not found in store");
```

Generische Fehlermeldung an den Aufrufer. Spezifischer Fehler in deinen Logs. Das gleiche Prinzip wie bei Webanwendungen -- aber leicht zu vergessen, wenn man einen Protokoll-Handler baut und in hilfreichen JSON-RPC-Antworten denkt.

## 7. Das Tool existiert, aber das Modell kann es nicht sehen

Das hat mich einen ganzen Nachmittag Debugging gekostet.

Das A2A-Tool war in Hrafns Tool-Registry registriert. `cargo test` war grün. Das Gateway hat Agenten-Karten ausgeliefert. Aber als ich dann tatsächlich eine Instanz startete und sie bat, einen anderen Agenten zu kontaktieren, hatte das Modell keine Ahnung, dass das Tool existierte.

Das Problem: Hrafn verwendet eine textbasierte Liste von Tool-Beschreibungen in seinem Bootstrap-System-Prompt für Modelle, die kein natives Function Calling unterstützen (wie einige OpenAI Codex-Varianten). Das Tool war in der Registry, aber nicht im `tool_descs`-Array, das in den Prompt injiziert wird.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lehre: Teste den gesamten Pfad. Unittests bewiesen, dass das Tool funktioniert, wenn es aufgerufen wird. Integrationstests bewiesen, dass das Gateway Anfragen annimmt. Aber das Modell hat das Tool nie aufgerufen, weil es nicht wusste, dass es existiert. E2E-Tests -- also tatsächliche Modell-Inferenz, die mit echten Endpunkten spricht -- haben das erkannt, was Unittests nicht konnten.

---

## Was ich weggelassen habe (absichtlich)

Der PR enthält ausdrücklich nicht:

* **SSE-Streaming** -- A2A unterstützt es, aber synchrone Request/Response deckt 90 % der Anwendungsfälle ab. Streaming ist additiv, nicht grundlegend.
* **mTLS/OAuth** -- Bearer-Tokens sind für dieses Vertrauensmodell ausreichend (gleicher Host, bekannte Peers). Zertifikatsbasierte Authentifizierung ist Enterprise-Grade-Komplexität für ein Pi-Deployment. Siehe auch: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Agenten-Registry** -- Discovery ist manuell (du konfigurierst die URL). Eine automatische Registry/mDNS ist für das Folge-Issue geplant.
* **Task-Eviction** -- Das 10K-Limit ist eine harte Grenze, kein LRU-Cache. Gut genug für v1.

Jeder "nicht enthaltene" Punkt ist eine Scope-Entscheidung, keine Lücke. Die PR-Beschreibung listet jeden einzelnen mit einem Link zum Folge-Issue auf. Reviewer können genau sehen, was erwogen und zurückgestellt wurde.

## Das Setup, das bewiesen hat, dass es funktioniert

Fünf Hrafn-Instanzen auf einem einzigen Raspberry Pi Zero 2 W (Quad-Core-ARM, 512 MB), jede mit einer eigenen Persona (Kerf, Sentinel, Architect, Critic, Researcher), die über A2A auf den localhost-Ports 3001-3005 kommunizieren. Angetrieben von gpt-5.1-codex-mini.

Instanz A entdeckt die Agenten-Karte von Instanz B, sendet eine Task ("review this code for security issues") und erhält eine Antwort über die Standard-`process_message`-Pipeline. Keine maßgeschneiderte Orchestrierung. Die A2A-Ebene ist einfach ein weiterer Input-Kanal.

Wenn es auf einem Pi Zero läuft, läuft es überall.

Die vollständige Implementierung findest du in [PR #4166](https://github.com/5queezer/hrafn/pull/4166) -- jede der oben genannten Stolperstellen ist einem spezifischen Commit mit Tests zugeordnet. Wenn du A2A in dein eigenes Framework einbaust, beginne mit dem SSRF-Schutz in `a2a_client.rs` und dem TaskStore-Limit in `task_store.rs`. Das Folge-Issue für Peer Discovery und LAN-mDNS ist in [#4643](https://github.com/5queezer/hrafn/issues/4643) verzeichnet.

---

*Ich schreibe über Systeme, Sicherheit und die Schnittstelle von KI-Agenten mit realer Infrastruktur auf [vasudev.xyz](https://vasudev.xyz).*