---
title: "A2A-Protokoll-Unterstützung in Rust ausliefern: 7 Fallstricke, vor denen niemand warnt"
date: 2026-03-25
description: "Was ich bei der Integration von Agent-to-Agent-Protokoll-Unterstützung in ein Open-Source-Agenten-Framework gelernt habe."
author: "Christian Pojoni"
tags: ["rust", "a2a", "security"]
translationHash: "fcddc6cdba3e103637e70e5a22c07a08"
---
Das [A2A (Agent-to-Agent) Protocol](https://google.github.io/A2A/) ist Googles offener Standard für die Interoperabilität von Agenten – Discovery, Auftragsdelegierung und Lebenszyklusmanagement über HTTP/JSON-RPC. Es steht neben MCP genauso, wie TCP neben USB steht: Das eine verbindet Agenten miteinander, das andere verbindet Agenten mit Tools.

Vor Kurzem habe ich [PR #4166](https://github.com/5queezer/hrafn/pull/4166) veröffentlicht, das native A2A-Unterstützung zu Hrafn hinzufügt – sowohl einen eingehenden JSON-RPC-2.0-Server als auch ein ausgehendes Client-Tool, geschrieben in Rust. Der PR bestand 40 Tests und lief E2E über fünf Raspberry Pi Zero 2 W-Instanzen. Dabei bin ich auf jede scharfe Kante gestoßen, die die Spezifikation nicht erwähnt.

**Die A2A-Spezifikation ist auf dem Papier sauber; die Sicherheitsfallen werden dich in der Produktion jedoch empfindlich treffen.**

## 1. Agent Cards sind bewusst nicht authentifiziert – und das ist in Ordnung

Die A2A-Spezifikation schreibt vor, dass `GET /.well-known/agent-card.json` öffentlich zugänglich sein muss. Kein Bearer-Token, kein API-Key. Erster Impuls: Das ist ein Informationsleck.

Ist es nicht. Die Agent Card ist Metadaten – Name, Beschreibung, Fähigkeiten, Endpoint-URL. Man kann es sich als DNS für Agenten vorstellen. Man stellt DNS nicht hinter eine Authentifizierung.

Die eigentliche Falle: Wenn du die `public_url` von der Bind-Adresse deines Gateways ableitest, gibst du deine interne Netzwerk-Topologie preis. `0.0.0.0:3000` in einer Agent Card verrät einem Angreifer genau, wo er sondieren soll. Fordere immer eine explizite `public_url` in der Konfiguration und gib eine Startwarnung aus, falls sie fehlt.

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "A2A agent card will expose internal bind address. \
         Set [a2a].public_url to avoid leaking network topology."
    );
}
```

## 2. Der Vergleich von Bearer-Tokens muss in konstanter Zeit erfolgen

Wenn dein A2A-Server Bearer-Tokens akzeptiert, benötigst du einen Vergleich in konstanter Zeit. Nicht weil dein Bedrohungsmodell Timing-Angriffe von Nationalstaaten auf ein Telegram-Bot-Framework umfasst –, sondern weil es dich genau zwei Zeilen kostet und eine ganze Klasse von Schwachstellen eliminiert.

Das Standard-`==` für Strings bricht beim ersten nicht übereinstimmenden Byte vorzeitig ab. Ein Angreifer, der Antwortzeiten präzise genug messen kann, kann Tokens so Byte für Byte durchbruten. Unwahrscheinlich? Ja. Vermeidbar? Ebenfalls ja.

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

Das `subtle`-Crate liefert dir `ct_eq`. Nutze es. Die Längenprüfung vor dem Vergleich ist beabsichtigt – die Länge selbst ist kein Geheimnis (steht in deiner Config) und vermeidet die Allokation eines Puffers fester Größe.

## 3. SSRF-Schutz ist schwieriger, als man denkt

Dein A2A-Client-Tool erlaubt es dem Agenten, beliebige URLs aufzurufen: `discover https://agent.example.com`. Das ist nur einen HTTP-Aufruf entfernt von `discover http://169.254.169.254/latest/meta-data/` auf jeder Cloud-Instanz.

Das Blockieren privater IPs klingt einfach, bis einem klar wird:

**IPv4-gemappte IPv6-Adressen umgehen naive Prüfungen.** `::ffff:127.0.0.1` ist localhost. `::ffff:169.254.169.254` ist der Cloud-Metadaten-Endpoint. Deine Blockliste muss beide Adressfamilien abdecken.

**Die DNS-Auflösung erfolgt zweimal.** Du validierst den Hostnamen, er löst sich in eine öffentliche IP auf. Dein HTTP-Client verbindet sich – aber das DNS hat sich geändert (DNS-Rebinding). Jetzt triffst du auf eine interne IP. Das ist eine TOCTOU-Lücke (Time-of-check, Time-of-use). Die einzig echte Lösung besteht darin, DNS selbst aufzulösen, die IP zu validieren und sich dann direkt mit dieser IP zu verbinden.

**Redirects öffnen die Tür von Neuem.** Du validierst die ursprüngliche URL, aber der Server leitet dich per 302 nach `http://localhost:8080/admin` um. Deine Redirect-Richtlinie muss jeden Hop erneut validieren.

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

Dokumentiere die TOCTOU-Lücke ehrlich. Ich habe einen Kommentar im Code und einen Hinweis im PR hinterlassen: „DNS-Rebinding-TOCTOU bekannt; Peer-Allowlist geplant in [#4643](https://github.com/5queezer/hrafn/issues/4643).“

## 4. A2A auf demselben Host bricht deinen eigenen SSRF-Schutz

Das ist die Ironie: Ich habe einen SSRF-Schutz gebaut, der localhost blockiert. Dann habe ich fünf Hrafn-Instanzen auf einem einzigen Raspberry Pi deployed und sie konnten nicht miteinander kommunizieren.

A2A mit mehreren Instanzen auf demselben Host ist ein legitimer Anwendungsfall – mehrere spezialisierte Agenten auf einer Maschine, die über `localhost:300X` kommunizieren. Aber deine SSRF-Blockliste hat es einfach verhindert.

Die Lösung ist ein bedingter Bypass (`allow_local`), der aus der Config und nicht aus Benutzereingaben abgeleitet wird:

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Wenn deine eigene `public_url` auf localhost zeigt, läufst du offensichtlich lokal, daher sind ausgehende Aufrufe an localhost zu erwarten. Wenn `public_url` eine echte Domain ist, bleibt localhost blockiert.

Bekanntes Restrisiko: `allow_local` ist ein pauschaler Bypass. Eine Peer-Allowlist (spezifische IPs/Ports) ist die korrekte Langzeitlösung. Veröffentliche den Bypass, dokumentiere das Risiko, eröffne das Follow-up-Issue.

## 5. Der TaskStore braucht ein Limit, sonst erhältst du einen kostenlosen DoS

A2A-Tasks sind zustandsbehaftet. Jedes `message/send` erzeugt einen Task-Eintrag. Wenn du Tasks im Speicher hältst (für v1 vernünftig), kann ein Angreifer 100.000 Anfragen senden und deinen Heap erschöpfen.

Begrenze es. Ich habe 10.000 verwendet und liefere eine 503-Antwort, wenn es voll ist:

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

Eine Konstante, eine Prüfung, ein Fehlerpfad. Keine Eviction-Richtlinie in v1 – das ist Komplexität für das Follow-up. Das Limit allein verhindert den Crash.

Warum 10.000? Pi-mal-Daumen-Rechnung: Jeder `Task` ist serialisiert etwa 2–4 KB groß. 10 K Tasks = 20–40 MB. Akzeptabel auf einem Pi Zero 2 W mit 512 MB RAM. Passe es an deine Zielhardware an.

## 6. Fehlermeldungen sind ein Informationskanal

Was gibst du zurück, wenn eine eingehende A2A-Anfrage fehlschlägt?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Du hast gerade bestätigt, dass `abc-123` ein gültiges Task-ID-Format ist und dass dein Store danach indexiert. Ein Angreifer kann Task-IDs aufzählen.

Zensiere ausgehende Fehler. Logge die vollständigen Details serverseitig:

```rust
// To the caller:
Err(json_rpc_error(-32600, "invalid request"))

// In your logs:
error!(task_id = %id, "task not found in store");
```

Generischer Fehler für den Aufrufer. Spezifischer Fehler in deinen Logs. Dasselbe Prinzip wie bei Webanwendungen – aber leicht zu vergessen, wenn man einen Protocol Handler baut und in nützlichen JSON-RPC-Antworten denkt.

## 7. Das Tool existiert, aber das Modell sieht es nicht

Das hat mich einen Nachmittag Debugging-Zeit gekostet.

Das A2A-Tool war in Hrafns Tool-Registry registriert. `cargo test` war erfolgreich. Das Gateway stellte Agent Cards bereit. Aber als ich tatsächlich eine Instanz startete und sie bat, Kontakt mit einem anderen Agenten aufzunehmen, wusste das Modell nichts von der Existenz des Tools.

Das Problem: Hrafn verwendet eine textbasierte Tool-Beschreibungsliste im Bootstrap-Systemprompt für Modelle, die kein natives Function Calling unterstützen (wie einige OpenAI-Codex-Varianten). Das Tool war in der Registry, aber nicht im `tool_descs`-Array, das in den Prompt injiziert wird.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lektion: Teste den vollständigen Pfad. Unit-Tests bewiesen, dass das Tool aufgerufen funktioniert. Integrationstests bewiesen, dass das Gateway Anfragen akzeptiert. Aber das Modell rief das Tool nie auf, weil es nicht wusste, dass es existiert. E2E-Tests – tatsächliche Modell-Inferenz, die mit tatsächlichen Endpoints spricht – haben gefunden, was Unit-Tests nicht konnten.

---

## Was ich weggelassen habe (absichtlich)

Der PR enthält ausdrücklich nicht:

* **SSE-Streaming** – A2A unterstützt es, aber synchrones Request/Response deckt 90 % der Anwendungsfälle ab. Streaming ist additiv, nicht fundamental.
* **mTLS/OAuth** – Bearer-Token sind für das Vertrauensmodell (gleicher Host, bekannte Peers) ausreichend. Zertifikatsbasierte Authentifizierung ist für ein Pi-Deployment Komplexität im Enterprise-Bereich. Siehe auch: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Agent-Registry** – Die Discovery erfolgt manuell (du konfigurierst die URL). Eine automatische Registry/mDNS ist im Follow-up-Issue geplant.
* **Task-Eviction** – Das 10K-Limit ist eine harte Grenze, kein LRU-Cache. Gut genug für v1.

Jeder „nicht enthaltene“ Punkt ist eine Umfangsentscheidung, keine Lücke. Die PR-Beschreibung listet jeden einzelnen mit einem Link zum Follow-up-Issue auf. Reviewer sehen genau, was berücksichtigt und verschoben wurde.

## Das Setup, das bewiesen hat, dass es funktioniert

Fünf Hrafn-Instanzen auf einem einzigen Raspberry Pi Zero 2 W (Quad-Core ARM, 512 MB), jeweils mit einer eigenen Persona (Kerf, Sentinel, Architect, Critic, Researcher), die über A2A auf Localhost-Ports 3001–3005 kommunizieren. Im Backend läuft gpt-5.1-codex-mini.

Instanz A entdeckt die Agent Card von Instanz B, sendet einen Task („review this code for security issues“) und erhält eine Antwort über die Standard-`process_message`-Pipeline. Keine eigene Orchestrierung. Die A2A-Schicht ist einfach ein weiterer Eingabekanal.

Wenn es auf einem Pi Zero läuft, läuft es überall.

Die vollständige Implementierung findest du in [PR #4166](https://github.com/5queezer/hrafn/pull/4166) – jeder der oben genannten Fallstricke ist einem bestimmten Commit mit Tests zugeordnet. Wenn du A2A in dein eigenes Framework einbaust, beginne mit dem SSRF-Schutz in `a2a_client.rs` und dem TaskStore-Limit in `task_store.rs`. Das Follow-up für die Peer-Discovery und LAN-mDNS wird in [#4643](https://github.com/5queezer/hrafn/issues/4643) verfolgt.

---

*Ich schreibe auf [vasudev.xyz](https://vasudev.xyz) über Systeme, Sicherheit und die Schnittstelle von KI-Agenten mit realer Infrastruktur.*