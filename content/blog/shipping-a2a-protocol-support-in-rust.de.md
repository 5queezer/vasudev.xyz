---
title: "A2A-Protokollunterstützung in Rust ausliefern: 7 Fallstricke, vor denen niemand warnt"
date: 2026-03-25
description: "Was ich beim Hinzufügen von Agent-zu-Agent-Protokollunterstützung zu einem Open-Source-Agenten-Framework gelernt habe."
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
author: "Christian Pojoni"
tags: ["rust", "a2a", "security"]
series: ["Field Notes"]
translationHash: "355fee262fb9baca152dd6579f803a31"
chunkHashes: "138d0a14635cf619,7d3e0b3378417e09,aa7513a6486f8faf,a825fb9bc8a4bae3,5dea57e52b8e70d4,28ed198a8cd428fc,685d9c5b09d7dcf3,6eadb412a20580a0,7262b64366b7ff90,e9307644648922c1"
---
Der [A2A (Agent-to-Agent)‑Protokoll](https://github.com/google/A2A) ist Googles offener Standard für die Interoperabilität von Agenten: Entdeckung, Aufgaben‑Delegierung, Lebenszyklus‑Verwaltung über HTTP/JSON‑RPC. Es sitzt neben MCP so, wie TCP neben USB steht: das eine verbindet Agenten mit Agenten, das andere verbindet Agenten mit Werkzeugen.

Ich habe kürzlich [PR #4166](https://github.com/5queezer/hrafn/pull/4166) veröffentlicht, der native A2A‑Unterstützung zu Hrafn hinzufügt. Das bedeutet sowohl einen eingehenden JSON‑RPC 2.0‑Server als auch ein ausgehendes Client‑Tool, geschrieben in Rust. Der PR bestand 40 Tests und wurde end‑zu‑ende auf fünf Raspberry Pi Zero 2 W‑Instanzen ausgeführt. Auf dem Weg dorthin bin ich auf jede harte Kante gestoßen, die das Spec nicht erwähnt.

**Das A2A‑Spec ist auf dem Papier sauber. Die Sicherheits‑Kanten werden dich in der Produktion schneiden.**
## 1. Agent Cards sind per Design nicht authentifiziert, und das ist in Ordnung

Die A2A‑Spezifikation besagt, dass `GET /.well-known/agent-card.json` öffentlich zugänglich sein muss. Kein Bearer‑Token, kein API‑Key. Der erste Gedanke: Das sei ein Informationsleck.

Ist es nicht. Die Agent Card ist Metadaten (Name, Beschreibung, Fähigkeiten, Endpunkt‑URL). Man kann sie sich wie DNS für Agenten vorstellen. Man würde DNS nicht hinter einer Authentifizierung verstecken.

Der eigentliche Stolperstein: Wenn du `public_url` aus der Bind‑Adresse deines Gateways ableitest, gibst du deine interne Netzwerk‑Topologie preis. `0.0.0.0:3000` in einer Agent Card verrät einem Angreifer genau, wo er sondieren muss. Erfordere immer eine explizite `public_url` in der Konfiguration und gib beim Starten eine Warnung aus, wenn sie fehlt.

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "A2A agent card will expose internal bind address. \
         Set [a2a].public_url to avoid leaking network topology."
    );
}
```
## 2. Der Vergleich von Bearer‑Tokens muss konstant‑zeitig sein

Wenn dein A2A‑Server Bearer‑Tokens akzeptiert, brauchst du einen konstant‑zeitigen Vergleich. Nicht weil dein Bedrohungsmodell Angriffe von Nationalstaaten auf ein Telegram‑Bot‑Framework beinhaltet, sondern weil es dich genau zwei Zeilen kostet und eine ganze Klasse von Sicherheitslücken eliminiert.

Der Standard‑`==`‑Operator für Strings bricht beim ersten nicht übereinstimmenden Byte ab. Ein Angreifer, der die Antwortzeiten mit ausreichender Präzision messen kann, könnte Tokens Byte für Byte brute‑force. Unwahrscheinlich? Ja. Vermeidbar? Auch ja.

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

Das `subtle`‑Crate liefert dir `ct_eq`. Benutze es. Die Längenprüfung vor dem Vergleich ist bewusst. Die Länge selbst ist nicht geheim (sie steht in deiner Konfiguration) und verhindert, dass ein Puffer fester Größe alloziert werden muss.
## 3. SSRF‑Schutz ist schwieriger als du denkst

Dein A2A‑Client‑Tool lässt den Agenten beliebige URLs aufrufen: `discover https://agent.example.com`. Das ist nur ein HTTP‑Aufruf entfernt von `discover http://169.254.169.254/latest/meta-data/` auf jeder Cloud‑Instanz.

Private IPs zu blockieren scheint einfach, bis man merkt:

**IPv4‑gemappte IPv6 umgeht naive Prüfungen.** `::ffff:127.0.0.1` ist localhost. `::ffff:169.254.169.254` ist der Cloud‑Metadata‑Endpunkt. Deine Blockliste muss beide Adressfamilien behandeln.

**DNS‑Auflösung erfolgt zweimal.** Du validierst den Hostnamen, er löst zu einer öffentlichen IP auf. Dein HTTP‑Client verbindet sich, aber DNS hat sich geändert (DNS‑Rebinding). Jetzt triffst du eine interne IP. Das ist eine TOCTOU‑Lücke (time‑of‑check, time‑of‑use). Die einzige wirkliche Lösung ist, DNS selbst aufzulösen, die IP zu validieren und dann direkt zu dieser IP zu verbinden.

**Redirects öffnen die Tür wieder.** Du validierst die initiale URL, aber der Server leitet dich zu `http://localhost:8080/admin` weiter. Deine Redirect‑Richtlinie muss jeden Hop neu validieren.

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

Dokumentiere die TOCTOU‑Lücke ehrlich. Ich habe einen Kommentar im Code und eine Notiz im PR hinterlassen: „DNS‑Rebinding TOCTOU acknowledged. Peer allowlist planned in [#4643](https://github.com/5queezer/hrafn/issues/4643).“
## 4. Same‑Host‑A2A unterläuft deinen eigenen SSRF‑Schutz

Hier die Ironie: Ich habe einen SSRF‑Schutz gebaut, der localhost blockiert. Dann habe ich fünf Hrafn‑Instanzen auf einem einzigen Raspberry Pi bereitgestellt, und sie konnten nicht miteinander kommunizieren.

Same‑Host‑Multi‑Instance‑A2A ist ein legitimer Anwendungsfall. Mehrere spezialisierte Agents auf derselben Maschine kommunizieren über `localhost:300X`. Aber deine SSRF‑Blockliste hat das schlichtweg blockiert.

Die Lösung ist ein bedingter Ausnahmemechanismus (`allow_local`), der aus der Konfiguration und nicht aus Benutzereingaben abgeleitet wird:

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Wenn deine eigene `public_url` auf localhost zeigt, läuft du offensichtlich lokal, sodass ausgehende Aufrufe zu localhost erwartet werden. Wenn `public_url` eine echte Domain ist, bleibt localhost blockiert.

Bekanntes Restrisiko: `allow_local` ist eine pauschale Ausnahmeregel. Eine Peer‑Allowlist (spezifische IPs/Ports) ist die langfristig korrekte Lösung. Shippe die Ausnahmeregel, dokumentiere das Risiko und erstelle das Nachfolge‑Ticket.
## 5. TaskStore benötigt ein Limit, sonst gibt es einen kostenlosen DoS

A2A‑Aufgaben sind zustandsbehaftet. Jeder Aufruf von `message/send` erzeugt einen Eintrag im Task‑Store. Wenn du Tasks im Speicher ablegst (für v1 vernünftig), kann ein Angreifer 100 000 Requests senden und deinen Heap erschöpfen.

Setz ein Limit. Ich habe 10 000 verwendet und bei voller Auslastung eine 503‑Antwort zurückgegeben:

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

Eine Konstante, eine Prüfung, ein Fehlerpfad. Keine Eviktions‑Policy in v1. Das ist die Komplexität für das Follow‑up. Das alleinige Limit verhindert den Absturz.

Warum 10 000? Grobe Schätzung: Jeder `Task` ist etwa 2‑4 KB serialisiert. 10 K Tasks = 20‑40 MB. Akzeptabel auf einem Pi Zero 2 W mit 512 MB RAM. Passe es an deine Ziel‑Hardware an.
## 6. Fehlermeldungen sind ein Informationskanal

Wenn eine eingehende A2A‑Anfrage fehlschlägt, was geben Sie zurück?

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```

Damit haben Sie gerade bestätigt, dass `abc-123` ein gültiges Task‑ID‑Format ist und dass Ihr Store danach indiziert ist. Ein Angreifer kann Task‑IDs aufzählen.

Reduzieren Sie ausgehende Fehlermeldungen. Protokollieren Sie die vollständigen Details serverseitig:

```rust
// An den Aufrufer:
Err(json_rpc_error(-32600, "invalid request"))

// In Ihren Logs:
error!(task_id = %id, "task not found in store");
```

Allgemeine Fehlermeldung an den Aufrufer. Spezifische Fehlermeldung in Ihren Logs. Gleiches Prinzip wie bei Web‑Anwendungen, aber leicht zu vergessen, wenn Sie einen Protokoll‑Handler bauen und in Termen hilfreicher JSON‑RPC‑Antworten denken.
## 7. Das Werkzeug existiert, aber das Modell kann es nicht sehen

Das hat mich einen Nachmittag mit Debugging gekostet.

Das A2A‑Werkzeug war im Werkzeug‑Register von Hrafn registriert. `cargo test` bestand. Das Gateway lieferte Agent‑Cards aus. Aber als ich tatsächlich eine Instanz startete und sie bat, einen anderen Agenten zu kontaktieren, hatte das Modell keine Ahnung, dass das Werkzeug existierte.

Das Problem: Hrafn verwendet für Modelle, die keinen nativen Funktionsaufruf unterstützen (wie einige OpenAI‑Codex‑Varianten), eine textbasierte Werkzeug‑Beschreibungsliste im Bootstrap‑System‑Prompt. Das Werkzeug war im Register, aber nicht im `tool_descs`‑Array, das in den Prompt eingefügt wird.

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```

Lektion: den gesamten Pfad testen. Unit‑Tests zeigten, dass das Werkzeug bei Aufruf funktionierte. Integrationstests bewiesen, dass das Gateway Anfragen akzeptierte. Aber das Modell rief das Werkzeug nie auf, weil es nicht wusste, dass es existiert. E2E‑Tests (tatsächliche Modulinferenz, die mit echten Endpunkten spricht) haben das aufgedeckt, was Unit‑Tests nicht konnten.
## Was ich absichtlich weggelassen habe

Der PR beinhaltet ausdrücklich nicht:

* **SSE-Streaming.** A2A unterstützt es, aber synchrones Request/Response deckt 90 % der Anwendungsfälle ab. Streaming ist zusätzlich, nicht grundlegend.
* **mTLS/OAuth.** Bearer‑Token reichen für das Vertrauensmodell (gleicher Host, bekannte Peers). Zertifikatbasierte Authentifizierung ist eine Unternehmens‑Komplexität für ein Pi‑Deployment. Siehe auch: [Adding OAuth 2.1 to a Self-Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).
* **Agent‑Registry.** Die Erkennung ist manuell (Sie konfigurieren die URL). Automatische Registry/mDNS ist im Folge‑Issue geplant.
* **Task‑Eviction.** Das Limit von 10 K ist eine harte Grenze, kein LRU‑Cache. Für v1 ausreichend.

Jedes „nicht enthaltene“ ist eine Scope‑Entscheidung, keine Lücke. Die PR‑Beschreibung listet jedes einzelne mit einem Link zum entsprechenden Folge‑Issue auf. Reviewer können genau sehen, was berücksichtigt und zurückgestellt wurde.
## Das Setup, das die Funktionsfähigkeit bewiesen hat

Fünf Hrafn‑Instanzen auf einem einzigen Raspberry Pi Zero 2 W (Quad‑Core‑ARM, 512 MB), jede mit einer eigenen Persona (Kerf, Sentinel, Architect, Critic, Researcher), die über A2A auf den localhost‑Ports 3001‑3005 kommunizieren. Unterstützt von gpt‑5.1‑codex‑mini.

Instanz A entdeckt die Agent‑Karte von Instanz B, sendet eine Aufgabe („prüfe diesen Code auf Sicherheitsprobleme“), erhält eine Antwort über die normale `process_message`‑Pipeline. Keine benutzerdefinierte Orchestrierung. Die A2A‑Schicht ist einfach ein weiterer Eingabekanal.

Läuft es auf einem Pi Zero, läuft es überall.

Lies die vollständige Implementierung im [PR #4166](https://github.com/5queezer/hrafn/pull/4166). Jeder oben genannte Gotcha entspricht einem konkreten Commit mit Tests. Wenn du A2A in dein eigenes Framework einbauen willst, beginne mit dem SSRF‑Schutz in `a2a_client.rs` und der TaskStore‑Beschränkung in `task_store.rs`. Das Follow‑up für Peer‑Discovery und LAN‑mDNS wird in [#4643](https://github.com/5queezer/hrafn/issues/4643) nachverfolgt.

---

*Christian Pojoni entwickelt [Hrafn](https://github.com/5queezer/hrafn), eine Rust‑Agent‑Runtime für Edge‑Hardware. Mehr unter [vasudev.xyz](https://vasudev.xyz).*

*Das Titelbild für diesen Beitrag wurde von KI generiert.*