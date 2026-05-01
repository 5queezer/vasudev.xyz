---
title: "Ein Sablier-Bug, der kein Sablier war: 4 Fallstricke beim Nachverfolgen eines Traefik-Plugin-Fehlers"
date: 2026-04-19
description: "Verfolgung eines sporadischen „invalid middleware“-Fehlers in Sablier zu einer versteckten Start‑Abhängigkeit, die durch ein Traefik 3.5.3‑Refactoring eingeführt wurde."
images: ["/images/a-sablier-bug-that-wasnt-sablier-og.png"]
author: "Christian Pojoni"
tags: ["architecture", "traefik"]
agentQuestions:
  - "Why was this a Traefik bug, not a Sablier bug?"
  - "What changed in Traefik 3.5.3 plugin startup?"
  - "How can I reproduce the invalid middleware failure?"
series: ["Field Notes"]
translationHash: "75744b97b5a70de6eb8521d19c8569c7"
chunkHashes: "7e18fa5668bb7516,3f0837a5defbadbd,f708ca20c36b3bef,e5046a30363c021b,e01a6962bd409a3c,8039547e1da5ce63,fc60ce853b1e37de,13c2b64fff8f853e,74f4f3ff014f6406,7f670ac6c5113213"
---
[Sablier](https://github.com/sablierapp/sablier) gibt dir Cloud‑Run‑ähnliches Scale‑to‑Zero für selbstgehostete Docker‑Container. Anfragen treffen auf eine Reverse‑Proxy‑Middleware, die Middleware weckt den Ziel‑Container bei Bedarf, und der Container fährt nach einer Untätigkeits‑Timeout wieder herunter. Ich habe einen Nachmittag damit verbracht, einen sporadischen `invalid middleware`‑Fehler nachzuvollziehen, den Sablier‑Benutzer seit Monaten melden. Der Fehler lag nicht in Sablier. Die Arbeit ergab drei öffentliche Artefakte: ein [deterministisches Reproduktions‑Repo](https://github.com/5queezer/sablier-traefik-repro), ein upstream [Issue](https://github.com/traefik/traefik/issues/13005) und ein [Fix‑PR](https://github.com/traefik/traefik/pull/13006). Hier sind vier Dinge, die es wert sind, vorher zu wissen, bevor du deinen nächsten `invalid middleware`‑Fehler debuggst.

**Ein Refactoring, das in einem Traefik‑Punktrelease ausgeliefert wurde, ließ stillschweigend jeden Plugin‑Start von der Erreichbarkeit von `plugins.traefik.io` abhängen, und kein einzelner Middleware‑Besitzer war in der Position, dies zu bemerken.**
## 1. Der Fehler lag im Refactoring, nicht im Feature

Das Symptom landete im Sablier‑Tracker als `invalid middleware "whoami-sablier@file" configuration: invalid middleware type or middleware does not exist`. Sablier liefert ein Traefik‑Plugin, also ist das natürlich dort, wo Nutzer melden. Es war jedoch kein Sablier‑Fehler.

Traefik v3.5.3 hat [PR #12035, das das Plugin‑System refaktorierte](https://github.com/traefik/traefik/pull/12035) zusammengeführt. Das Refactoring teilte einen monolithischen Client in einen `Manager`, einen `Downloader` und neue Hash‑Verifikations‑Logik auf. Was die Release‑Notes nicht erwähnten, ist, dass diese Struktur *jede* Plugin‑Initialisierung an die Erreichbarkeit von `plugins.traefik.io` bindet. Der Pfad `Manager.InstallPlugin` ruft bedingungslos `Downloader.Download` und anschließend `Downloader.Check` auf. Jeder Aufruf greift auf das Register zu. Jeder Fehler führt zum Abbruch der Installation.

Der betroffene Code‑Abschnitt in v3.5.3 ist kurz genug, um ihn komplett zu reproduzieren:

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

**Der Sablier‑Issue‑Titel wies auf das Symptom hin. Die Traefik‑PR‑Beschreibung beschrieb die Änderung. Keine von beiden erwähnte die Kopplung.** Der einzige Weg, das Gesamtbild zu erkennen, war, den Traefik‑Diff zu lesen, während man das Sablier‑Symptom im Kopf behielt.
## 2. „Sporadisch“ ist fast immer eine versteckte Abhängigkeit

Der erste Reproduktionsversuch war ein offensichtlicher. Traefik in einer engen Schleife neu starten, den Endpunkt aufrufen, die Logs nach dem Fehler durchsuchen, melden, nach wie vielen Neustarts er erscheint. Ich führte fünfzig Durchläufe in einem Heimnetzwerk durch. Null Auslösungen.

Das ist diagnostisch. Wenn man einen Bug nicht durch Timing oder Neustart‑Intervall erzwingen kann, liegt die Variable nicht am Timing. Es ist die Erreichbarkeit einer externen Abhängigkeit, von der man nicht wusste, dass sie im Pfad liegt.

Die deterministische Reproduktion ist ein einzeiliges Docker‑Override:

```yaml
# docker-compose.netblock.yml
services:
  traefik:
    extra_hosts:
      - "plugins.traefik.io:127.0.0.1"
```

Dies mappt das Registry auf localhost innerhalb des Containers, sodass der Installationsaufruf `connection refused` zurückgibt. Die Auslösungsrate springt von null bei fünfzig Durchläufen auf einhundert Prozent bei jedem Start. Die gleiche Technik funktioniert bei jedem „sporadischen nach Neustart“‑Bug, bei dem man eine versteckte Netzwerk‑Abfrage vermutet. Blockiere die verdächtige Abhängigkeit und beobachte, was bricht.

**Wenn du den Bug nicht durch Timing reproduzieren kannst, hör auf, das Timing zu variieren. Beginne damit, das zu variieren, was der Prozess erreichen kann.**
## 3. `ResetAll()` ist ein überraschend großer Hammer

Die Kaskade lohnt es sich, Schritt für Schritt zu durchlaufen. Der Installationsfehler eines Plugins gibt einen Fehler bis zu `SetupRemotePlugins` weiter, das `manager.ResetAll()` aufruft. Diese Methode löscht das gesamte `archives`‑Verzeichnis, nicht nur das Archiv des fehlerhaften Plugins. Dann protokolliert jede Middleware in der Konfiguration des Operators, die *irgendein* Plugin referenziert, ihren eigenen Fehler `invalid middleware type or middleware does not exist`, weil das Quellverzeichnis des Plugins darunter entfernt wurde.

So bewirkt ein einzelner, transienter Netzwerk‑Glitch gegen ein konfiguriertes Plugin, dass jede plugin‑basierte Middleware in der Bereitstellung deaktiviert wird. Ein Sablier‑Benutzer sieht einen Sablier‑Fehler. Der Sablier‑Betreuer sieht ein gesperrtes Upstream‑Problem. Der Traefik‑Betreuer sieht einen Refactor, der die Prüfung passiert hat.

Das ist ein Muster. Ein Fehler‑Handler, der seinen Wirkungskreis über die fehlgeschlagene Komponente hinaus ausdehnt, erzeugt Fehlermeldungen, die scheinbar nichts mit der eigentlichen Ursache zu tun haben. **Der Wirkungskreis eines Fehler‑Handlers ist wichtiger als der Fehler, den er fängt.** Wenn ein Retry, ein Reset oder ein Fallback mehrere Subsysteme berührt, wird jemand weiter unten den falschen Bug melden.

Der Fix in [PR #13006](https://github.com/traefik/traefik/pull/13006) verkleinert den Wirkungskreis. Wenn `Download` gegen das Registry fehlschlägt und ein bereits heruntergeladenes Archiv desselben Plugins und derselben Version auf der Festplatte liegt, fällt die Installation auf dieses zwischengespeicherte Archiv zurück, anstatt die Plugin‑Umgebung zu löschen. Ein `integrity check`‑Fehler wird *nur* in diesem Fallback‑Pfad toleriert, weil das zwischengespeicherte Archiv beim vorherigen erfolgreichen Installationslauf validiert wurde. Ein `Check`‑Fehler nach einem *erfolgreichen* `Download` bleibt fatal, sodass frisch heruntergeladene Inhalte weiterhin die Integrität bestehen müssen. Das Hash‑Pinning über `plugin.Hash` wird immer durchgesetzt. Eine Datei, vier Testfälle.
## 4. Ein gesperrtes Issue ist kein totes Issue

Die gleiche Ursache war bereits Monate zuvor unter [#12137](https://github.com/traefik/traefik/issues/12137) gemeldet worden. Dieses Issue wurde automatisch als `frozen-due-to-age` geschlossen und die Stale‑Issue‑Sperre des Repositories verhindert neue Kommentare. Als der Sablier‑Thread genug Meldungen gesammelt hatte, um wie ein Muster auszusehen, war das entsprechende Traefik‑Issue nicht mehr erreichbar.

Ein frisches Issue mit einer deterministischen Reproduktion, einem konkreten Hinweis auf das einführende PR und einer Auswahl an Fix‑Optionen erreicht eine andere Ebene der Maintainer‑Aufmerksamkeit als ein abgefragter, aber gesperrter Thread. Es erzeugt ein neues Triagesignal. Es gibt Reviewern etwas, an das sie ein PR anhängen können. Und es liefert zukünftigen Nutzern einen offenen Thread zum Suchen.

Wenn Sie auf ein gesperrtes Issue stoßen, das noch in der Wildnis aktiv ist, öffnen Sie ein neues. Verlinken Sie das alte Issue im ersten Absatz, damit die Historie nicht verloren geht. Fügen Sie ein Repro‑Repository bei, nicht nur einen Stack‑Trace. Die Kosten für ein neues Issue betragen ein paar Minuten. Die Kosten dafür, dass Nutzer sechs Monate später dieselbe Hürde treffen, können Stunden betragen – multipliziert mit der Anzahl der Nutzer.
## Was ich weggelassen habe

Drei Dinge, die ich absichtlich aufgeschoben und explizit in der Beschreibung des Upstream‑PRs aufgeführt habe.

Eine zweite Reproduktionsvariante für den Fall des zwischengespeicherten Plugins. Produktionsnutzer stoßen bei einem Neustart auf diesen Bug, wenn das Plugin‑Archiv bereits auf der Festplatte liegt, was einen leicht anderen Codepfad als beim ersten Start darstellt. Die Reproduktion des ersten Starts reichte aus, um den Mechanismus zu beweisen und das Design der Korrektur zu treiben. Ein erneutes Ausführen mit einem vorab befüllten Volume würde das Vertrauen erhöhen, aber das Ergebnis nicht ändern.

Zwei alternative Fix‑Ansätze. Ein Konfigurationsflag `experimental.plugins.offline: true` (Operator‑Opt‑In, keine Verhaltensänderung für alle anderen) und ein asynchroner Post‑Startup‑`Check()` (koppelt den Start vollständig los, fügt jedoch Parallelität zu einem vormals geradlinigen Pfad hinzu). Beide sind im Upstream‑Issue als Optionen aufgeführt. Wenn die Maintainer einen der beiden dem Ansatz im PR vorziehen, ist das ein Arbeitstag und ein neuer PR.

Ein Traefik‑Integrationstest, der die `extra_hosts`‑artige Netzwerkisolierung End‑zu‑Ende prüft. Die drei Unit‑Tests im PR testen die neuen Zweige direkt über einen Mock‑Downloader. Ein End‑zu‑End‑Test wäre eindeutig besser. Es war zudem ein Nebenthema, das ich im PR nicht ausbauen wollte. Wenn ein Maintainer danach fragt, lässt es sich leicht hinzufügen.
## In Produktion eingesetzt

Das gepatchte Traefik läuft zum Zeitpunkt des Schreibens auf meiner eigenen Coolify‑on‑Hetzner‑Box. Vor dem Umschalten war die Box bei 7,2 GiB von 7,5 GiB residentem Speicher mit 4 GiB genutztem Swap festgefahren, dominiert von untätigen MCP‑Servern und wenig frequentierten Coolify‑Anwendungen, die zusammen vielleicht ein Dutzend Anfragen pro Tag bedienten. Der Cached‑Archive‑Fallback ermöglichte es mir überhaupt, Sablier darauf zu setzen. Jeder Neustart des gepatchten Traefik seitdem hat das Sablier‑Plugin aus dem lokalen Archiv neu geladen, ohne einen Registry‑Round‑Trip, was die zweite Reproduktionsvariante ist, die ich in der PR‑Beschreibung zurückgestellt habe.

Acht MCP‑Server und vier Coolify‑Anwendungen sitzen nun hinter Sablier mit einem zehnminütigen Leerlauffenster. Die Box hat 3,1 GiB residenten Speicher und 2 GiB Swap zurückgewonnen. Die Aufwach‑Latenz bei der Blockierungs‑Strategie liegt je nach Kaltstart des Containers zwischen 300 ms und 10 s, was für Workloads mit spärlichem Traffic akzeptabel ist. Ich möchte mehr Neustart‑Zyklen und ein echtes Registry‑Flake in der Zeitleiste sehen, bevor ich behaupten kann, dass die Eigenschaft allgemein gilt, aber das Deployment‑Muster passt zu dem Szenario, das der Fix adressiert.

Ein Traefik‑spezifisches Gotcha trat während der Ausrollung zutage. Der Docker‑Provider entfernt einen Router sofort, sobald sein zugehöriger Container stoppt, sodass die Sablier‑Middleware beim nächsten Request nie ausgelöst wird und der Aufrufer stattdessen einen 503‑Fehler statt des Aufwach‑Pfads sieht. Die Lösung ist ein File‑Provider‑Router mit höherer Priorität als der Docker‑Label‑Router, der auf den Container über dessen Docker‑DNS‑Namen zeigt und die Sablier‑Middleware angehängt hat. Dieser Router bleibt unabhängig vom Container‑Zustand bestehen. Coolify erschwert das etwas, weil jeder Redeploy einen Container mit einem neuen UUID‑angehängten Namen erzeugt, sodass die File‑Provider‑Router‑URL neu generiert werden muss. Das kleine Synchronisations‑Tool, das diese Konfiguration mit den aktuellen Containernamen abgleicht, existiert als [Gist](https://gist.github.com/5queezer/f838aaa5e0690da5df04ce44f8f67266), falls jemand die Form übernehmen möchte.
## Nachwort: Was in der Produktion kaputt ging

Das zehnminütige Leerlauffenster hielt für die acht von Compose verwalteten MCP‑Server. Die vier von Coolify verwalteten Anwendungen überlebten es nicht. Innerhalb eines Tages, nachdem die Labels aktiviert wurden, hatte Coolifys Abgleichschleife jede von ihnen als `exited:unhealthy` markiert und schließlich den Container vollständig entfernt. Sablier verlor seine Gruppenreferenz beim nächsten Docker‑Socket‑Refresh und die nächste Anfrage erhielt ein 404 vom Sablier‑Daemon anstelle des Wake‑Pfads.

Der Mechanismus ist im Nachhinein offensichtlich. Sablier ruht, indem es `docker stop` aufruft. Coolifys Health‑Loop sieht einen Container im Zustand `exited`, wo er `running` erwartet, entscheidet, dass die Anwendung abgestürzt ist, und sammelt ihn schließlich als Müll ein. Compose‑verwaltete Stacks haben dieses Problem nicht, weil `docker compose` mit `restart: unless-stopped` einen gestoppten Container unbegrenzt in `docker ps -a` belässt und der Docker‑Provider von Sablier ihn weiter verfolgt. Das Aufwachen funktioniert.

**Falls irgendetwas anderes in deinem Stack ebenfalls den Container‑Zustand abgleicht, werden Sablier und dieses Ding gegeneinander kämpfen. Der Verlierer dieses Kampfes ist das, was der Orchestrator zuerst als Müll einsammelt.** Der MCP‑Stack ruht jetzt wie angekündigt. Die Coolify‑Anwendungen sind wieder immer eingeschaltet. Ein Sablier‑Provider, der Wake‑Events in Coolify‑API‑`/deploy`‑Aufrufe übersetzt, würde das Ganze funktionieren lassen, weil Coolify den Lebenszyklus besitzen würde, aber niemand hat ihn gebaut, ich selbst eingeschlossen.
## Vor dem ersten Review verschärft

Mein erster Entwurf der Korrektur tolerierte jeden Integritätsprüfungsfehler, sobald ein zwischengespeichertes Archiv zu Beginn von `InstallPlugin` vorhanden war. Beim erneuten Durchlesen bemerkte ich, dass `Download` das Archiv bei Erfolg überschreibt, sodass „Archiv zu Beginn vorhanden“ nicht bewies, dass der auf der Festplatte liegende Inhalt der zuvor validierte war. Eine nach dem Download auftretende Integritätsabweichung wäre als Warnung durchgerutscht, was genau das Gegenteil dessen ist, was die Integritätsprüfung gewährleisten soll. Die aktuelle Version verwendet ein `fallback`‑Flag, das nur gesetzt wird, wenn `Download` selbst fehlschlägt. Die Testsuite stellt nun sicher, dass ein `Check`‑Fehler nach einem erfolgreichen `Download` weiterhin fatal bleibt. Der Commit‑Verlauf im PR zeigt den Fortschritt. Bauen Sie Ihre Toleranzschwellen eng. Jede `if`‑Anweisung, die einen Fehler durchlässt, ist eine Invariante, die Sie im Review verteidigen müssen.
## Probier es selbst

Die drei Artefakte sind öffentlich. Das [reproduction repo](https://github.com/5queezer/sablier-traefik-repro) dauert dreißig Sekunden zu klonen und auszuführen. Das [upstream issue](https://github.com/traefik/traefik/issues/13005) und der [fix PR](https://github.com/traefik/traefik/pull/13006) sind zum Zeitpunkt des Schreibens offen. Wenn du Traefik mit irgendeinem Plugin betreibst, prüfe, ob `plugins.traefik.io` bei jedem Start aus deinem Traefik‑Container erreichbar ist. Wenn es nicht konsequent erreichbar ist, bist du einen Netzwerk‑Blip davon entfernt, dass jedes plugin‑basierte Middleware gleichzeitig ungültig wird.

---

*Christian Pojoni baut Infrastruktur und debuggt Bugs, die dich um 3 Uhr morgens wecken. Mehr unter [vasudev.xyz](https://vasudev.xyz).*

*Das Titelbild für diesen Beitrag wurde von KI erzeugt.*