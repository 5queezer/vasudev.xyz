---
title: "Ein Sablier‑Fehler, der nicht Sablier war: 4 Stolperfallen beim Nachverfolgen eines Traefik‑Plugin‑Fehlers"
date: 2026-04-19
description: "Nachverfolgung eines sporadischen 'invalid middleware'-Fehlers in Sablier zu einer versteckten Startup-Abhängigkeit, die durch ein Refactoring von Traefik 3.5.3 eingeführt wurde."
author: "Christian Pojoni"
tags: ["architecture", "traefik"]
series: ["Field Notes"]
translationHash: "a960e4e3acee34b41e79b13b347d90ec"
chunkHashes: "9d46be67ffdb93e8,3f0837a5defbadbd,f708ca20c36b3bef,e5046a30363c021b,e01a6962bd409a3c,8039547e1da5ce63,fc60ce853b1e37de,13c2b64fff8f853e,74f4f3ff014f6406,ee697c4acc228525"
---
[Sablier](https://github.com/sablierapp/sablier) gibt Ihnen Cloud‑Run‑ähnliches Scale‑to‑Zero für selbstgehostete Docker‑Container. Anfragen treffen auf ein Reverse‑Proxy‑Middleware, das Middleware weckt den Ziel‑Container bei Bedarf, und der Container fährt nach einem Leerlauf‑Timeout wieder herunter. Ich habe einen Nachmittag damit verbracht, einen sporadischen `invalid middleware`‑Fehler nachzuvollziehen, den Sablier‑Benutzer seit Monaten melden. Der Fehler lag nicht in Sablier. Die Arbeit ergab drei öffentliche Artefakte: ein [deterministisches Reproduktions‑Repo](https://github.com/5queezer/sablier-traefik-repro), ein upstream [Issue](https://github.com/traefik/traefik/issues/13005) und ein [Fix‑PR](https://github.com/traefik/traefik/pull/13006). Hier sind vier Dinge, die Sie wissen sollten, bevor Sie Ihren nächsten `invalid middleware`‑Fehler debuggen.

**Ein Refactoring, das in einem Traefik‑Punktrelease veröffentlicht wurde, ließ stillschweigend jeden Plugin‑Start davon abhängig machen, dass `plugins.traefik.io` erreichbar ist, und kein einziger Middleware‑Besitzer war in der Lage, dies zu bemerken.**
## 1. Der Fehler lag in der Umstrukturierung, nicht im Feature

Das Symptom erschien im Sablier‑Tracker als `invalid middleware "whoami-sablier@file" configuration: invalid middleware type or middleware does not exist`. Sablier liefert ein Traefik‑Plugin aus, sodass Nutzer natürlich dort nachforschten. Es war jedoch nicht Sablier’s Fehler.

Traefik v3.5.3 integrierte [PR #12035, der das Plugin‑System umstrukturierte](https://github.com/traefik/traefik/pull/12035). Die Umstrukturierung teilte einen monolithischen Client in einen `Manager`, einen `Downloader` und neue Hash‑Verifizierungs‑Mechanismen auf. Was in den Release‑Notes nicht hervorgehoben wurde, ist, dass diese Form jede Plugin‑Initialisierung an die Erreichbarkeit von `plugins.traefik.io` koppelt. Der Pfad `Manager.InstallPlugin` ruft bedingungslos `Downloader.Download` und anschließend `Downloader.Check` auf. Beide Aufrufe treffen das Register. Jeder Fehler bricht die Installation ab.

Der betroffene Code‑Block in v3.5.3 ist kurz genug, um ihn vollständig wiederzugeben:

```go
func (m *Manager) InstallPlugin(ctx context.Context, plugin Descriptor) error {
    hash, err := m.downloader.Download(ctx, plugin.ModuleName, plugin.Version)
    if err != nil {
        return fmt.Errorf("unable to download plugin %s: %w", plugin.ModuleName, err)
    }
    if plugin.Hash != "" {
        if plugin.Hash != hash { /* ... */ }
    } else {
        err = m.downloader.Check(ctx, plugin.ModuleName, plugin.Version, hash)
        if err != nil {
            return fmt.Errorf("unable to check archive integrity of the plugin %s: %w", plugin.ModuleName, err)
        }
    }
    return m.unzip(plugin.ModuleName, plugin.Version)
}
```

**Der Sablier‑Issue‑Titel wies auf das Symptom hin. Die Traefik‑PR‑Beschreibung beschrieb die Änderung. Keine von beiden erwähnte die Kopplung.** Der einzige Weg, das Gesamtbild zu erkennen, bestand darin, den Traefik‑Diff zu lesen, während man das Sablier‑Symptom im Kopf behielt.
## 2. „Sporadisch“ ist fast immer eine versteckte Abhängigkeit

Der erste Versuch, das Problem zu reproduzieren, war naheliegend. Traefik in einer engen Schleife neu starten, den Endpunkt aufrufen, die Logs nach dem Fehler durchsuchen, melden, nach wie vielen Neustarts er auftritt. Ich führte fünfzig Durchläufe in einem Heimnetzwerk durch. Kein Auftreten.

Das ist diagnostisch. Wenn man einen Bug nicht durch Timing oder Neustart-Intervall erzwingen kann, ist die Variable nicht das Timing. Es ist die Erreichbarkeit einer externen Abhängigkeit, von der man nicht wusste, dass sie im Pfad liegt.

Die deterministische Reproduktion ist ein einzeiliger Docker‑Override:

```yaml
# docker-compose.netblock.yml
services:
  traefik:
    extra_hosts:
      - "plugins.traefik.io:127.0.0.1"
```

Damit wird das Register im Container auf localhost gemappt, sodass der Installations‑Call `connection refused` zurückgibt. Die Auslösungsrate springt von null in fünfzig Durchläufen auf hundert Prozent bei jedem Start. Die gleiche Technik funktioniert bei jedem „sporadisch nach Neustart“‑Bug, bei dem man einen versteckten Netzwerk‑Aufruf vermutet. Blockiere die verdächtige Abhängigkeit und beobachte, was bricht.

**Wenn du den Bug nicht durch Timing reproduzieren kannst, hör auf, das Timing zu variieren. Variiere stattdessen, was der Prozess erreichen kann.**
## 3. `ResetAll()` ist ein überraschend großer Hammer

Die Kaskade lohnt sich, Schritt für Schritt nachzuvollziehen. Das Installationsfehler eines Plugins gibt einen Fehler bis zu `SetupRemotePlugins` weiter, das `manager.ResetAll()` aufruft. Diese Methode löscht das gesamte `archives`‑Verzeichnis, nicht nur das Archiv des fehlerhaften Plugins. Dann protokolliert jede Middleware in der Konfiguration des Operators, die *irgendein* Plugin referenziert, ihren eigenen Fehler `invalid middleware type or middleware does not exist`, weil das Plugin‑Quellverzeichnis unter ihr entfernt wurde.

Ein einzelner transitorischer Netzwerk‑Aussetzer bei einem konfigurierten Plugin deaktiviert also jede plugin‑basierte Middleware in der Bereitstellung. Ein Sablier‑Benutzer sieht einen Sablier‑Fehler. Der Sablier‑Maintainer sieht ein gesperrtes Upstream‑Problem. Der Traefik‑Maintainer sieht eine Refaktorisierung, die die Prüfung bestanden hat.

Das ist ein Muster. Ein Fehlerbehandler, der seinen Wirkungsbereich über die fehlgeschlagene Komponente hinaus ausdehnt, erzeugt Fehlermeldungen, die nichts mit der eigentlichen Ursache zu tun zu haben scheinen. **Der Wirkungsbereich eines Fehlerbehandlers ist wichtiger als der Fehler, den er abfängt.** Wenn ein Retry, ein Reset oder ein Fallback mehrere Subsysteme umfasst, wird jemand stromabwärts den falschen Bug melden.

Der Fix in [PR #13006](https://github.com/traefik/traefik/pull/13006) verkleinert den Wirkungsbereich. Wenn `Download` gegen das Registry fehlschlägt und ein zuvor heruntergeladenes Archiv für dasselbe Plugin und dieselbe Version bereits auf der Festplatte liegt, fällt die Installation auf dieses zwischengespeicherte Archiv zurück, anstatt die Plugin‑Umgebung zu löschen. Ein `integrity check`‑Fehler wird *nur* in diesem Fallback‑Pfad toleriert, weil das zwischengespeicherte Archiv beim vorherigen erfolgreichen Installationsvorgang validiert wurde. Ein `Check`‑Fehler nach einem *erfolgreichen* `Download` bleibt fatal, sodass frisch heruntergeladener Inhalt trotzdem die Integritätsprüfung bestehen muss. Das Pinning von Hashes über `plugin.Hash` wird immer erzwungen. Eine Datei, vier Testfälle.
## 4. Ein gesperrtes Issue ist kein totes Issue

Die gleiche Grundursache war bereits Monate zuvor unter [#12137](https://github.com/traefik/traefik/issues/12137) gemeldet worden. Dieses Issue wurde automatisch als `frozen-due-to-age` geschlossen und die Sperrung von veralteten Issues im Repository verhindert neue Kommentare. Als der Sablier‑Thread genug Meldungen gesammelt hatte, um wie ein Muster auszusehen, war das relevante Traefik‑Issue nicht mehr erreichbar.

Ein neues Issue mit einer deterministischen Reproduktion, einem konkreten Hinweis auf das einführende PR und einer Auswahl an Lösungsmöglichkeiten landet bei einer anderen Art von Maintainer‑Aufmerksamkeit als ein abgefragter, aber gesperrter Thread. Es erzeugt ein neues Triage‑Signal. Es gibt Reviewern etwas, an das sie ein PR anhängen können. Und es bietet zukünftigen Nutzern einen offenen Thread zum Durchsuchen.

Wenn Sie auf ein gesperrtes Issue stoßen, das noch in der Wildnis existiert, erstellen Sie ein frisches. Verlinken Sie das alte Issue im ersten Absatz, damit die Historie nicht verloren geht. Hängen Sie ein Repro‑Repo an, nicht nur einen Stack‑Trace. Die Kosten für ein neues Issue betragen ein paar Minuten. Die Kosten für Nutzer, die sechs Monate später auf das gleiche Problem stoßen, sind Stunden, multipliziert mit der Anzahl der Nutzer.
## Was ich weggelassen habe

Drei Dinge, die ich absichtlich aufgeschoben und ausdrücklich in der Beschreibung des ursprünglichen Pull Requests aufgeführt habe.

Eine zweite Reproduktionsvariante für den Fall des zwischengespeicherten Plugins. Produktionsnutzer stoßen bei einem Neustart auf diesen Bug, wobei das Plugin‑Archiv bereits auf der Festplatte liegt – ein leicht anderer Code‑Pfad als beim ersten Start. Die Erst‑Start‑Reproduktion war ausreichend, um den Mechanismus zu beweisen und das Design der Fehlerbehebung zu steuern. Ein erneutes Ausführen mit einem vorbefüllten Volume würde das Vertrauen stärken, aber das Ergebnis nicht ändern.

Zwei alternative Fix‑Varianten. Ein Konfigurations‑Flag `experimental.plugins.offline: true` (Operator‑Opt‑In, keinerlei Verhaltensänderung für alle anderen) und ein asynchroner Post‑Startup‑`Check()` (koppelt den Start vollständig ab, fügt aber Parallelität zu einem ehemals geradlinigen Pfad hinzu). Beide sind im ursprünglichen Issue als Optionen aufgeführt. Wenn Maintainer eine der beiden gegenüber dem Ansatz im PR bevorzugen, ist die Formulierung ein Tag Arbeit und ein neuer PR.

Ein Traefik‑Integrationstest, der die netzwerkisolierung im Stil von `extra_hosts` End‑zu‑End prüft. Die drei Unit‑Tests im PR testen die neuen Zweige direkt über einen Mock‑Downloader. Ein End‑zu‑End‑Test wäre eindeutig besser. Es war außerdem ein Nebenprojekt, das ich bewusst nicht in den PR aufgenommen habe. Sollte ein Maintainer danach fragen, lässt es sich leicht hinzufügen.
## In Produktion eingesetzt

Der gepatchte Traefik läuft zum Zeitpunkt des Schreibens auf meiner eigenen Coolify‑on‑Hetzner‑Box. Vor dem Umschalten war die Box bei 7,2 GiB von 7,5 GiB residentem Speicher festgepinnt, mit 4 GiB genutztem Swap, dominiert von untätigen MCP‑Servern und wenig frequentierten Coolify‑Anwendungen, die zusammen vielleicht ein Dutzend Anfragen pro Tag bearbeiteten. Der Cached‑Archive‑Fallback ist es, der mir überhaupt ermöglichte, Sablier darauf zu legen. Jeder Neustart des gepatchten Traefik seitdem hat das Sablier‑Plugin aus dem lokalen Archiv neu geladen, ohne einen Registry‑Round‑Trip, was die zweite Reproduktionsvariante ist, die ich in der PR‑Beschreibung zurückgestellt habe.

Acht MCP‑Server und vier Coolify‑Anwendungen sitzen nun hinter Sablier mit einem Zehn‑Minute‑Leerlauffenster. Die Box hat 3,1 GiB residenten Speicher und 2 GiB Swap zurückgewonnene. Die Aufwach‑Latenz bei der Blockierungs‑Strategie liegt zwischen 300 ms und 10 s, je nach Kaltstart des Containers, was für Workloads mit sporadischem Traffic akzeptabel ist. Ich möchte weitere Neustart‑Zyklen und ein echtes Registry‑Flake im Zeitverlauf sehen, bevor ich behaupte, dass die Eigenschaft allgemein gilt, aber die Form des Deployments entspricht dem Szenario, das der Fix anvisiert.

Ein Traefik‑spezifisches Gotcha tauchte während der Ausrollung auf. Der Docker‑Provider entfernt einen Router im Moment, in dem sein zugehöriger Container stoppt, sodass die Sablier‑Middleware beim nächsten Request nie ausgelöst wird und der Aufrufer stattdessen ein 503 instead of the wake‑up path sieht. Die Lösung ist ein File‑Provider‑Router mit höherer Priorität als der Docker‑Label‑Router, der auf den Container per Docker‑DNS‑Name verweist und die Sablier‑Middleware angehängt hat. Dieser Router bleibt unabhängig vom Container‑Status bestehen. Coolify macht das etwas schwieriger, weil bei jedem Redeploy ein Container mit einem neuem UUID‑angehängten Namen entsteht, sodass die File‑Provider‑Router‑URL neu generiert werden muss. Das kleine Sync‑Tool, das diese Konfiguration mit den aktuellen Containernamen synchron hält, existiert als [Gist](https://gist.github.com/5queezer/f838aaa5e0690da5df04ce44f8f67266), falls jemand die Form kopieren möchte.
## Nachwort: Was in der Produktion kaputt ging

Das zehnminütige Leerlauffenster hielt für die acht von Compose verwalteten MCP-Server. Die vier von Coolify verwalteten Anwendungen überlebten es nicht. Innerhalb eines Tages nach dem Aktivieren der Labels hatte Coolifys Reconcile‑Schleife jedes von ihnen als `exited:unhealthy` markiert und schließlich den Container vollständig entfernt. Sablier verlor seine Gruppenreferenz beim nächsten Docker‑Socket‑Refresh und die nächste Anfrage erhielte von dem Sablier‑Daemon einen 404‑Fehler statt des Wake‑Pfads.

Der Mechanismus ist im Nachhinein offensichtlich. Sablier ruht, indem es `docker stop` aufruft. Coolifys Health‑Loop sieht einen Container im Zustand `exited`, wo er `running` erwartet, entscheidet, dass die Anwendung abgestürzt ist, und löscht ihn schließlich. Von Compose verwaltete Stacks haben dieses Problem nicht, weil `docker compose` mit `restart: unless-stopped` einen gestoppten Container dauerhaft in `docker ps -a` belässt und der Docker‑Provider von Sablier ihn weiter verfolgt. Das Aufwachen funktioniert.

**Wenn etwas anderes in Ihrem Stack ebenfalls den Container‑Status abgleicht, werden Sablier und dieses Ding miteinander kämpfen. Der Verlierer dieses Kampfes ist dasjenige, das der Orchestrator zuerst aus dem Müll sammelt.** Der MCP‑Stack ruht nun wie angekündigt. Die Coolify‑Anwendungen sind wieder immer eingeschaltet. Ein Sablier‑Provider, der Wake‑Events in Coolify‑API‑`/deploy`‑Aufrufe übersetzt, würde das Ganze zum Laufen bringen, weil Coolify den Lifecycle besitzen würde, aber niemand hat ihn gebaut, ich eingeschlossen.
## Vor dem ersten Review verschärft

Mein erster Entwurf der Korrektur tolerierte jedes Integritätsprüfungs‑Fehler, sobald ein zwischengespeichertes Archiv zu Beginn von `InstallPlugin` vorhanden war. Beim erneuten Lesen fiel mir auf, dass `Download` das Archiv bei Erfolg überschreibt, sodass „Archiv zu Beginn vorhanden“ nicht bewies, dass der Inhalt auf der Festplatte derselbe war wie der zuvor validierte. Eine nach dem Herunterladen auftretende Integritätsabweichung wäre als Warnung durchgerutscht, was genau das Gegenteil dessen ist, was die Integritätsprüfung durchsetzen soll. Die aktuelle Version verwendet ein `fallback`‑Flag, das nur gesetzt wird, wenn `Download` selbst fehlschlug. Der Test‑Suite stellt nun sicher, dass ein `Check`‑Fehler nach einem erfolgreichen `Download` weiterhin fatal bleibt. Der Commit‑Verlauf im PR zeigt den Fortschritt. Baue deine Toleranz‑Gateways eng. Jede `if`‑Anweisung, die einen Fehler durchlässt, ist eine Invariante, die du in der Review verteidigen musst.
## Probier es selbst

Die drei Artefakte sind öffentlich. Das [Reproduktions‑Repo](https://github.com/5queezer/sablier-traefik-repro) benötigt dreißig Sekunden zum Klonen und Ausführen. Das [Upstream‑Ticket](https://github.com/traefik/traefik/issues/13005) und der [Fix‑PR](https://github.com/traefik/traefik/pull/13006) sind zum Zeitpunkt des Schreibens offen. Wenn du Traefik mit irgendeinem Plugin betreibst, prüfe, ob `plugins.traefik.io` bei jedem Start aus deinem Traefik‑Container erreichbar ist. Wenn es nicht konsequent erreichbar ist, bist du nur einen Netzwerk‑Blip davon entfernt, dass alle plugin‑basierten Middleware gleichzeitig ungültig werden.

---

*Christian Pojoni baut Infrastruktur und debuggt Bugs, die dich um 3 Uhr morgens wecken. Mehr unter [vasudev.xyz](https://vasudev.xyz).*