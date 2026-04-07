---
title: "Shipping A2A Protocol Support in Rust: 7 Gotchas, vor denen dich niemand warnt"
date: 2026-03-25
description: "Was ich beim Hinzufügenvon Agent-zu-Agent-Protokollunterstützung zu einem Open-Source-Agenten-Framework gelernt habe."
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
images: ["/images/shipping-a2a-protocol-support-in-rust-og.png"]
author: "Christian Pojoni"
tags: ["rust", "a2a", "security"]
translationHash: "1893ad88cb2f25275c36be51aa4639f0"
---
## End‑to‑End‑Agenten in Rust: Was Rust‑Entwickler beim A2A‑Protokoll wissen sollten  

*The A2A (Agent‑to‑Agent) Protokoll ist Googles Open‑Standard für Agenten‑Interoperabilität – Entdeckung, Aufgaben‑Delegation, Lifecycle‑Management über HTTP/JSON‑RPC. Es liegt neben MCP, so wie TCP neben USB liegt: Eines verbindet Agenten untereinander, das andere verbindet Agenten mit Tools.*  Ich habe kürzlich [PR #4166](https://github.com/5queezer/hrafn/pull/4166) shipped, mit dem Hrafn native A2A‑Support bekommt – sowohl ein eingehender JSON‑RPC 2.0‑Server als auch ein ausgehender Client‑Tool, geschrieben in **Rust**. Der PR bestand 40 Tests und lief E2E über fünf Raspberry Pi Zero 2 W‑Instanzen. Dabei stieß ich auf jede scharfe Kante, die die Spec nicht erwähnt.  

**Die Spec ist sauber auf dem Papier; die Sicherheits‑Kanten schneiden dich in der Produktion.**  ---

### 1. Agent Cards sind per Design unauthentifiziert – und das ist in Ordnung  

Die A2A‑Spec sagt, `GET /.well-known/agent-card.json` muss öffentlich zugänglich sein. Kein Bearer‑Token, kein API‑Key. Der erste Impuls: das ist ein Informations‑Leak.  

Es ist nicht. Die Agent Card ist nur Metadaten – Name, Beschreibung, Fähigkeiten, Endpunkt‑URL. Man denke an DNS. Man würde DNS nicht hinter Auth stellen.  

Der eigentliche Haken: Wenn du `public_url` vom Bind‑Address des Gateways ableitest, leakst du deine interne Netzwerktopologie. `0.0.0.0:3000` in einer Agent Card verrät einem Angreifer genau, wo er probieren kann. Setze immer eine explizite `public_url` in der Config und gib beim Start einen Warnhinweis aus, falls sie fehlt.  

```rust
if a2a_config.public_url.is_none() {
    warn!(
        "A2A agent card will expose internal bind address. \
         Set [a2a].public_url to avoid leaking network topology."
    );
}
```

---

### 2. Bearer‑Token‑Vergleich muss konstant‑zeit sein  

Wenn dein A2A‑Server Bearer‑Tokens akzeptiert, muss der Vergleich konstant‑zeit erfolgen. Nicht, weil dein Threat‑Model Nation‑State‑Timing‑Attacks auf ein Telegram‑Bot‑Framework beinhaltet – aber weil es dich genau zwei Zeilen kostet und eine ganze Klasse von Schwachstellen eliminiert.  

Standard `==` bei Strings bricht bei der ersten nicht übereinstimmenden Byte‑Position ab. Ein Angreifer, der Antwortzeiten mit genügend Präzision messen kann, kann Tokens byte‑weise ausbruten. Unwahrscheinlich?Ja. Vermeidbar?Auch das.  

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

Das `subtle`‑Crate liefert `ct_eq`. Benutze es. Der Längen‑Check vor dem Vergleich ist bewusst – die Länge ist nicht geheim (sie steckt in deiner Config) und verhindert eine feste Puffergröße.  

---

### 3. SSRF‑Schutz ist schwerer, als er scheint  

Dein A2A‑Client‑Tool lässt den Agenten beliebige URLs aufrufen: `discover https://agent.example.com`. Das ist einen HTTP‑Aufruf vom `discover http://169.254.169.254/latest/meta-data/` auf jeder Cloud‑Instanz entfernt.  

Das Blockieren privater IPs scheint simpel, bis man merkt:  

* **IPv4‑mapped IPv6 umgeht naive Prüfungen.** `::ffff:127.0.0.1` ist localhost. `::ffff:169.254.169.254` ist das Cloud‑Metadata‑Endpoint. Deine Blockliste muss beide Adressfamilien behandeln.  * **DNS‑Auflösung passiert zweimal.** Du validierst den Hostnamen, er löst sich zu einer öffentlichen IP. Dein HTTP‑Client verbindet sich – aber DNS hat sich geändert (DNS‑Rebinding). Jetzt triffst du eine interne IP. Das ist ein TOCTOU‑Gap (time‑of‑check, time‑of‑use). Der einzige echte Fix ist, DNS selbst aufzulösen, die IP zu validieren, dann direkt zu dieser IP zu connecten.  
* **Redirects öffnen die Tür wieder.** Du prüfst die initiale URL, aber der Server gibt 302 zurück zu `http://localhost:8080/admin`. Deine Redirect‑Policy muss jede Hop‑Stufe neu prüfen.  

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

Kennzeichne den TOCTOU‑Gap ehrlich. Ich habe einen Kommentar im Code hinterlassen und einen Hinweis im PR: "DNS‑rebinding TOCTOU acknowledged; peer allowlist planned in [#4643](https://github.com/5queezer/hrafn/issues/4643)."  

---

### 4. Same‑Host A2A bricht deinen eigenen SSRF‑Schutz  

Hier kommt die Ironie: Ich baute SSRF‑Schutz, der localhost blockiert. Dann deployte ich fünf Hrafn‑Instanzen auf einer einzigen Raspberry Pi Zero 2 W und sie konnten sich nicht untereinander erreichen.  

Multi‑Instanz A2A innerhalb eines Hosts ist ein legitimer Use‑Case – mehrere spezialisierte Agenten auf einer Maschine, die über `localhost:300X` kommunizieren. Aber deine Blockliste blockierte das einfach.  

Die Lösung ist ein konditioneller Bypass (`allow_local`), abgeleitet von der Config und nicht von Benutzereingabe:  

```rust
let allow_local = a2a_config
    .public_url
    .as_ref()
    .map(|u| is_local_url(u))
    .unwrap_or(false);
```

Wenn dein eigener `public_url` auf localhost zeigt, bist du offenbar lokal unterwegs, also sind Aufrufe zu localhost erwartet. Wenn `public_url` ein echtes Domain ist, bleibt localhost blockiert.  

Residuelles Risiko: `allow_local` ist ein Blank‑Bypass. Ein Peer‑Allowlist (spezifische IPs/Ports) ist die langfristige richtige Lösung. Setze den Blank‑Bypass, dokumentiere das Risiko und erstelle ein Follow‑up‑Issue.  ---

### 5. TaskStore braucht ein Limit, sonst gibt es einen freien DoS  

A2A‑Tasks sind zustandsbehaftet. Jede `message/send` erzeugt einen Task‑Eintrag. Wenn du Tasks im Speicher (vernünftig für v1) speicherst, kann ein Angreifer 100 000 Anfragen schicken und deinen Heap leeren.  

Setze ein Limit. Ich nutzte 10 000 mit einem 503‑Response, wenn das Limit überschritten ist:  

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

Ein konstanter Check, ein Fehler‑Pfad. Keine Eviction‑Policy in v1 – das ist Zusatzkomplexität für das Follow‑up. Das Limit allein verhindert den Crash.  

Warum 10 000? Rechenbeispiel: Jeder `Task` ist etwa 2–4 KB serialisiert. 10 K Tasks = 20–40 MB. Das passt auf einen Pi Zero 2 W mit 512 MB RAM. Passe es für deine Ziel‑Hardware an.  

---

### 6. Fehlermeldungen sind ein Informations‑Kanal  

Wenn eine eingehende A2A‑Anfrage fehlschlägt, was gibst du zurück?  

```json
{"error": {"code": -32600, "message": "Task abc-123 not found in store"}}
```  

Du bestätigst dem Aufrufer, dass `abc-123` ein gültiger Task‑ID‑Format ist und dein Store nach ihr indexed ist. Ein Angreifer kann Task‑IDs aufzählen.  

Redigiere ausgehende Fehler. Logge die vollständigen Details serverseitig:  

```rust
// Zum Caller:
Err(json_rpc_error(-32600, "invalid request"))

// In deinen Logs:
error!(task_id = %id, "task not found in store");
```  

Generische Fehlermeldung zum Caller. Detaillierte Meldung in deinen Logs. Das Prinzip ist dasselbe wie bei Web‑Apps – aber leicht zu vergessen, wenn du dich in Protokoll‑Handler verlierst und an hilfreiche JSON‑RPC‑Antworten denkst.  

---

### 7. Das Tool existiert, aber das Modell kann es nicht sehen  Das kostete mich einen Nachmittag Debugging.  

Der A2A‑Tool war im Tool‑Registry von Hrafn registriert. `cargo test` schlug erfolgreich fehl. Der Gateway servierte Agent‑Cards. Aber wenn ich ein Instance startete und es bat, einen anderen Agenten zu kontaktieren, wusste das Modell nichts vom Tool.  

Das Problem: Hrafn nutzt eine textbasierte Tool‑Beschreibung‑Liste im Bootstrap‑System‑Prompt für Modelle, die kein nativen Function‑Calling unterstützen (wie einige OpenAI‑Codex‑Varianten). Das Tool war im Registry, aber nicht im `tool_descs`‑Array, das in den Prompt injiziert wird.  

```rust
if config.a2a.enabled {
    tool_descs.push((
        "a2a",
        "Communicate with remote A2A-compatible agents. Actions: \
         'discover', 'send', 'status', 'result'.",
    ));
}
```  

Lektion: Teste den vollständigen Pfad. Unit‑Tests zeigten, dass das Tool funktioniert, wenn es aufgerufen wird. Integration‑Tests zeigten, dass der Gateway Anfragen akzeptiert. Aber das Modell rief das Tool nie, weil es nicht wusste, dass es existierte. E2E‑Testing – tatsächliches Modell‑Inference‑Talk‑to‑echte Endpoints – entdeckte das, was Unit‑Tests nicht konnten.  

---

## Was ich bewusst weggelassen habe  

Der PR enthält explizit **nichts** davon:  

* **SSE‑Streaming** – A2A unterstützt es, aber synchrones Request/Response deckt 90 % der Use‑Cases ab. Streaming ist ergänzend, nicht grundlegend.  
* **mTLS/OAuth** – Bearer‑Tokens reichen für das Trust‑Model (gleicher Host, bekannte Peers). Zertifikats‑basierte Auth ist Enterprise‑Komplexität für ein Pi‑Deployment. Siehe außerdem: [Adding OAuth 2.1 to a Self‑Hosted MCP Server](/blog/adding-oauth-mcp-server-gotchas/).  
* **Agent‑Registry** – Discovery ist manuell (du konfigurierst die URL). Automatischer Registry/mDNS‑Support ist im Follow‑up‑Issue geplant.  
* **Task‑Eviction** – Der 10 K‑Cap ist eine harte Mauer, kein LRU‑Cache. Für v1 ausreichend.  

Jede „nicht‑eingeschlossene“ Sache ist eine bewusste Scope‑Entscheidung, kein Gap. Der PR‑Beschreibung listet jede Entscheidung mit einem Link zum Follow‑up‑Issue auf. Reviewer können exakt sehen, was in Betracht gezogen und verschoben wurde.  

---

## Die Einrichtung, die es funktionieren ließ  Fünf Hrafn‑Instanzen auf einer einzigen Raspberry Pi Zero 2 W (Quad‑Core ARM, 512 MB), jede mit einer eigenen Persona (Kerf, Sentinel, Architect, Critic, Researcher), die über A2A auf localhost‑Ports 3001‑3005 kommunizieren. Angetrieben von **gpt‑5.1-codex-mini**.  

Instance A entdeckt Instance B’s Agent Card, sendet eine Aufgabe (“review this code for security issues”), erhält über den Standard‑`process_message`‑Pipeline eine Antwort. Keine benutzerdefinierte Orchestrierung. Die A2A‑Schicht ist nur ein weiterer Eingabe‑Channel.  

Wenn es auf einem Pi Zero läuft, läuft es überall.  

Sieh dir die vollständige Implementierung in [PR #4166](https://github.com/5queezer/hrafn/pull/4166) an – jede oben aufgeführte Lektion mappt zu einem bestimmten Commit mit Tests. Wenn du A2A in dein eigenes Framework einbauen willst, starte mit dem SSRF‑Schutz in `a2a_client.rs` und dem TaskStore‑Cap in `task_store.rs`. Der Follow‑up für Peer‑Discovery und LAN‑mDNS ist im [#4643](https://github.com/5queezer/hrafn/issues/4643) verfolgt.  

---

*Ich schreibe über Systeme, Sicherheit und die Schnittstelle von KI‑Agenten mit echter Infrastruktur auf [vasudev.xyz](https://vasudev.xyz).*  

*Das Cover‑Image für diesen Beitrag wurde von KI generiert.*