---
title: "Ein Sablier‑Bug, der kein Sablier war: 4 Fallstricke beim Nachverfolgen eines Traefik‑Plugin‑Fehlers"
date: 2026-04-19
description: "Verfolgung eines sporadischen ‘invalid middleware’-Fehlers in Sablier zu einer versteckten Startabhängigkeit, die durch ein Traefik 3.5.3‑Refactoring eingeführt wurde."
images: ["/images/a-sablier-bug-that-wasnt-sablier-og.png"]
images: ["/images/a-sablier-bug-that-wasnt-sablier-og.png"]
author: "Christian Pojoni"
tags: ["architecture", "traefik"]
series: ["Field Notes"]
translationHash: "5eaa1f789e78d921682220d990b4b498"
chunkHashes: "91e6d289b356043b,3f0837a5defbadbd,f708ca20c36b3bef,e5046a30363c021b,e01a6962bd409a3c,8039547e1da5ce63,fc60ce853b1e37de,13c2b64fff8f853e,74f4f3ff014f6406,7f670ac6c5113213"
---
[Sablier](https://github.com/sablierapp/sablier) bietet Cloud‑Run‑ähnliches Scale‑to‑Zero für selbstgehostete Docker‑Container. Anfragen treffen auf eine Reverse‑Proxy‑Middleware, die Middleware weckt den Ziel‑Container bei Bedarf, und der Container fährt nach einem Leerlauf‑Timeout wieder herunter. Ich habe einen Nachmittag damit verbracht, einen sporadischen `invalid middleware`‑Fehler zu untersuchen, den Sablier‑Nutzer seit Monaten melden. Der Fehler lag nicht in Sablier. Die Arbeit ergab drei öffentliche Artefakte: ein [deterministisches Reproduktions‑Repo](https://github.com/5queezer/sablier-traefik-repro), ein upstream [Issue](https://github.com/traefik/traefik/issues/13005) und ein [Fix‑PR](https://github.com/traefik/traefik/pull/13006). Hier sind vier Dinge, die es wert sind, vor dem Debuggen Ihres nächsten `invalid middleware`‑Fehlers zu wissen.

**Ein Refactoring, das in einem Traefik‑Punktrelease ausgeliefert wurde, ließ stillschweigend jeden Plugin‑Start von der Erreichbarkeit von `plugins.traefik.io` abhängig machen, und kein einziger Middleware‑Betreiber war in der Position, dies zu bemerken.**
## 1. Der Fehler lag in der Refaktur, nicht im Feature

Das Symptom landete im Sablier‑Tracker als `invalid middleware "whoami-sablier@file" configuration: invalid middleware type or middleware does not exist`. Sablier liefert ein Traefik‑Plugin aus, daher war das natürlich die Anlaufstelle für Nutzer. Es war nicht Sablier’s Fehler.

Traefik v3.5.3 hat [PR #12035, der das Plugin‑System refaktorierte](https://github.com/traefik/traefik/pull/12035) zusammengeführt. Die Refaktur zerlegte einen monolithischen Client in einen `Manager`, einen `Downloader` und neue Hash‑Verifizierungs‑Logik. Was die Release‑Notes nicht hervorhoben, ist, dass diese Struktur *jeden* Plugin‑Start an die Erreichbarkeit von `plugins.traefik.io` bindet. Der Pfad `Manager.InstallPlugin` ruft bedingungslos `Downloader.Download` und anschließend `Downloader.Check` auf. Beide Aufrufe treffen das Registry. Jeder Fehler bricht die Installation ab.

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

**Der Titel des Sablier‑Issues wies auf das Symptom hin. Die Beschreibung des Traefik‑PR erläuterte die Änderung. Keines von beidem erwähnte die Kopplung.** Die einzige Möglichkeit, das Gesamtbild zu erfassen, bestand darin, den Traefik‑Diff zu lesen, während man das Sablier‑Symptom im Kopf behielt.
## 2. „Sporadisch“ ist fast immer eine versteckte Abhängigkeit

Der erste Versuch der Reproduktion war offensichtlich. Traefik in einer engen Schleife neu starten, den Endpunkt aufrufen, die Logs nach dem Fehler durchsuchen, berichten, nach wie vielen Neustarts er erscheint. Ich führte fünfzig Durchläufe in einem Heimnetzwerk durch. Null Auslöser.

Das ist diagnostisch. Wenn man einen Bug nicht durch Timing oder Neustart‑Frequenz erzwingen kann, liegt die Variable nicht am Timing. Es ist die Erreichbarkeit einer externen Abhängigkeit, von der Sie nicht wussten, dass sie im Pfad liegt.

Die deterministische Reproduktion ist eine einzeilige Docker‑Überschreibung:

```yaml
# docker-compose.netblock.yml
services:
  traefik:
    extra_hosts:
      - "plugins.traefik.io:127.0.0.1"
```

Damit wird das Register innerhalb des Containers auf localhost gemappt, sodass der Installationsaufruf `connection refused` zurückgibt. Die Auslöse‑Rate springt von null in fünfzig Durchläufen auf einhundert Prozent bei jedem Start. Die gleiche Technik funktioniert bei jedem „sporadisch nach Neustart“‑Bug, bei dem Sie einen versteckten Netzwerkaufruf vermuten. Blockieren Sie die verdächtige Abhängigkeit und beobachten Sie, was bricht.

**Wenn Sie den Bug nicht durch Timing reproduzieren können, hören Sie auf, das Timing zu variieren. Variieren Sie stattdessen, worauf der Prozess zugreifen kann.**
## 3. `ResetAll()` ist ein überraschend großer Hammer

Die Kaskade lohnt es sich, Schritt für Schritt zu verfolgen. Der Installationsfehler eines Plugins gibt einen Fehler an `SetupRemotePlugins` weiter, das `manager.ResetAll()` aufruft. Diese Methode löscht das gesamte `archives`‑Verzeichnis, nicht nur das Archiv des fehlerhaften Plugins. Dann protokolliert jede Middleware in der Konfiguration des Operators, die *irgendein* Plugin referenziert, ihren eigenen Fehler `invalid middleware type or middleware does not exist`, weil das Plugin‑Quellverzeichnis darunter entfernt wurde.

Ein einzelner kurzzeitiger Netzwerk‑Fehler bei einem konfigurierten Plugin deaktiviert also jede plugin‑basierte Middleware in der Bereitstellung. Ein Sablier‑Nutzer sieht einen Sablier‑Fehler. Der Sablier‑Maintainer sieht ein gesperrtes Upstream‑Problem. Der Traefik‑Maintainer sieht eine Refactoring‑Änderung, die die Review bestanden hat.

Das ist ein Muster. Ein Fehlerbehandler, der seine Wirkungsfläche über die fehlgeschlagene Komponente hinaus ausdehnt, erzeugt Fehlermeldungen, die scheinbar nichts mit der Ursache zu tun haben. **Der Wirkungsbereich eines Fehlerbehandlers ist wichtiger als der Fehler, den er abfängt.** Wenn ein Retry, ein Reset oder ein Fallback mehrere Subsysteme berührt, wird jemand weiter unten den falschen Bug melden.

Der Fix in [PR #13006](https://github.com/traefik/traefik/pull/13006) reduziert den Wirkungsbereich. Wenn `Download` gegen das Registry fehlschlägt und ein zuvor heruntergeladenes Archiv für dasselbe Plugin und dieselbe Version bereits auf dem Datenträger liegt, greift die Installation auf dieses zwischengespeicherte Archiv zurück, anstatt die Plugin‑Umgebung zu löschen. Ein `integrity check`‑Fehler wird *nur* in diesem Fallback‑Pfad toleriert, weil das zwischengespeicherte Archiv beim vorherigen erfolgreichen Installationsvorgang validiert wurde. Ein `Check`‑Fehler nach einem *erfolgreichen* `Download` bleibt fatal, sodass frisch heruntergeladener Inhalt weiterhin die Integritätsprüfung bestehen muss. Hash‑Pinning via `plugin.Hash` wird immer erzwungen. Eine Datei, vier Testfälle.
## 4. Ein gesperrtes Issue ist kein erledigtes Issue

Der gleiche Grund war bereits einige Monate zuvor als [#12137](https://github.com/traefik/traefik/issues/12137) gemeldet worden. Dieses Issue wurde automatisch mit `frozen-due-to-age` geschlossen und die Sperre für veraltete Issues im Repository verhindert neue Kommentare. Als der Sablier‑Thread genügend Meldungen gesammelt hatte, um wie ein Muster auszusehen, war das relevante Traefik‑Issue nicht mehr erreichbar.

Ein neues Issue mit einer deterministischen Reproduktion, einem konkreten Hinweis auf die einführende PR und einer Auswahl an Fix‑Optionen erreicht eine andere Ebene der Aufmerksamkeit der Maintainer als ein umfrage‑, aber gesperrter Thread. Es erzeugt ein neues Triage‑Signal. Es gibt Reviewern etwas, an das sie eine PR anhängen können. Und es bietet zukünftigen Nutzern einen offenen Thread zum Durchsuchen.

Wenn Sie auf ein gesperrtes Issue stoßen, das noch in der Wildnis existiert, erstellen Sie ein neues. Verlinken Sie das alte im ersten Absatz, damit die Historie nicht verloren geht. Fügen Sie ein Repro‑Repo bei, nicht nur einen Stack‑Trace. Die Kosten für ein neues Issue betragen ein paar Minuten. Die Kosten dafür, dass Nutzer sechs Monate später an dieselbe Wand stoßen, sind Stunden, multipliziert mit der Anzahl der Nutzer.
## Was ich weggelassen habe

Drei Dinge, die ich bewusst hinausgeschoben und explizit in der Beschreibung des Upstream‑PR aufgelistet habe.

Eine zweite Reproduktionsvariante für den Fall des zwischengespeicherten Plugins. Produktionsnutzer stoßen auf diesen Bug beim Neustart, wenn das Plugin‑Archiv bereits auf der Festplatte liegt, was einen leicht anderen Codepfad darstellt als beim ersten Start. Der erste‑Start‑Repro war ausreichend, um den Mechanismus nachzuweisen und das Design der Korrektur zu bestimmen. Ein erneutes Ausführen mit einem vorab befüllten Volume würde das Vertrauen stärken, aber das Ergebnis nicht ändern.

Zwei alternative Fix‑Varianten. Ein Konfigurations‑Flag `experimental.plugins.offline: true` (Operator‑Opt‑In, keinerlei Verhaltensänderung für alle anderen) und ein asynchroner Post‑Startup‑Aufruf `Check()` (trennt den Start vollständig, fügt aber Parallelität zu einem zuvor geradlinigen Pfad hinzu). Beide sind im Upstream‑Issue als Optionen aufgeführt. Wenn Maintainer eine der beiden gegenüber dem Ansatz im PR bevorzugen, ist die Umsetzung ein Arbeitstag und ein neuer PR.

Ein Traefik‑Integrationstest, der die Netzwerkisolation im Stil von `extra_hosts` End‑zu‑End prüft. Die drei Unit‑Tests im PR testen die neuen Zweige direkt über einen Mock‑Downloader. Ein End‑zu‑End‑Test wäre eindeutig besser. Es war zudem ein Nebenprojekt, das ich bewusst nicht in den PR aufgenommen habe. Wenn ein Maintainer danach fragt, lässt er sich leicht hinzufügen.
## In Produktion eingesetzt

Der gepatchte Traefik läuft zum Zeitpunkt des Schreibens auf meiner eigenen Coolify‑on‑Hetzner‑Box. Vor dem Wechsel war die Box bei 7,2 GiB von 7,5 GiB residentem Speicher festgepinned, mit 4 GiB genutztem Swap, dominiert von untätigen MCP‑Servern und wenig frequentierten Coolify‑Anwendungen, die gemeinsam vielleicht ein Dutzend Anfragen pro Tag bedienten. Der Cached‑Archive‑Fallback ist das, was mir überhaupt erlaubte, Sablier darauf zu setzen. Jeder Neustart des gepatchten Traefik seitdem hat das Sablier‑Plugin aus dem lokalen Archiv neu geladen, ohne einen Registry‑Round‑Trip, was die zweite Reproduktionsvariante ist, die ich in der PR‑Beschreibung zurückgestellt habe.

Acht MCP‑Server und vier Coolify‑Anwendungen sitzen nun hinter Sablier mit einem zehnminütigen Leerlauffenster. Die Box hat 3,1 GiB residenten Speicher und 2 GiB Swap zurückgewonnen. Die Aufwach‑Latenz bei der blockierenden Strategie liegt zwischen 300 ms und 10 s, abhängig vom kalten Container‑Start, was für Workloads mit spärlichem Traffic akzeptabel ist. Ich möchte mehr Neustart‑Zyklen und einen echten Registry‑Flake im Zeitverlauf sehen, bevor ich behaupte, dass die Eigenschaft allgemein gilt, aber die Form der Bereitstellung entspricht dem Szenario, das der Fix adressiert.

Ein traefik‑spezifisches Gotcha trat während der Ausrollung auf. Der Docker‑Provider wirft einen Router sofort, sobald sein zugehöriger Container stoppt, sodass die Sablier‑Middleware beim nächsten Request nie ausgelöst wird und der Aufrufer stattdessen einen 503 statt des Aufwach‑Pfads sieht. Die Lösung ist ein File‑Provider‑Router mit höherer Priorität als der Docker‑Label‑Router, der auf den Container per Docker‑DNS‑Name zeigt und an den die Sablier‑Middleware angehängt ist. Dieser Router bleibt unabhängig vom Container‑Zustand bestehen. Coolify macht das etwas schwieriger, weil bei jedem Redeploy ein Container mit einem neuen, mit UUID versehenen Namen erstellt wird, sodass die File‑Provider‑Router‑URL neu generiert werden muss. Das kleine Sync‑Tool, das diese Konfiguration mit den aktuellen Containernamen abstimmt, steht als [Gist](https://gist.github.com/5queezer/f838aaa5e0690da5df04ce44f8f67266) zur Verfügung, falls jemand die Form kopieren möchte.
## Nachwort: Was in der Produktion kaputt ging

Das zehnminütige Leerlauffenster hielt bei den acht von Compose verwalteten MCP‑Servern. Die vier von Coolify verwalteten Anwendungen überlebten es nicht. Innerhalb eines Tages nach dem Aktivieren der Labels hatte Coolifys Reconcile‑Schleife jede von ihnen als `exited:unhealthy` markiert und schließlich den Container vollständig entfernt. Sablier verlor seine Gruppenreferenz beim nächsten Docker‑Socket‑Refresh und die nächste Anfrage bekam von dem Sablier‑Daemon ein 404 anstatt des Wake‑Pfads.

Der Mechanismus ist im Nachhinein offensichtlich. Sablier ruht, indem es `docker stop` aufruft. Coolifys Health‑Loop sieht einen Container im Zustand `exited`, wo er `running` erwartet, entscheidet, dass die Anwendung abgestürzt ist, und sammelt ihn schließlich als Müll ein. Compose‑verwaltete Stacks haben dieses Problem nicht, da `docker compose` mit `restart: unless-stopped` einen gestoppten Container unbegrenzt in `docker ps -a` belässt und der Docker‑Provider von Sablier ihn weiter verfolgt. Aufwachen funktioniert.

**Wenn etwas anderes in Ihrem Stack ebenfalls den Container‑Zustand reconciliert, werden Sablier und dieses Ding kämpfen. Der Verlierer dieses Kampfes ist das, was der Orchestrator zuerst als Müll sammelt.** Der MCP‑Stack ruht jetzt wie angekündigt. Die Coolify‑Anwendungen sind wieder immer eingeschaltet. Ein Sablier‑Provider, der Wake‑Events in Coolify‑API‑`/deploy`‑Aufrufe übersetzt, würde das funktionieren lassen, weil Coolify den Lebenszyklus besitzen würde, aber niemand hat ihn gebaut, ich selbst eingeschlossen.
## Angestrengt vor dem ersten Review

Mein erster Entwurf der Korrektur tolerierte jedes Versagen der Integritätsprüfung, sobald ein zwischengespeichertes Archiv zu Beginn von `InstallPlugin` vorhanden war. Beim erneuten Lesen bemerkte ich, dass `Download` das Archiv bei Erfolg überschreibt, sodass „Archiv zu Beginn vorhanden“ nicht beweist, dass der auf der Festplatte befindliche Inhalt derselbe wie der zuvor validierte war. Eine nach dem Download auftretende Integritätsabweichung wäre als Warnung durchgerutscht, was genau das Gegenteil dessen ist, was die Integritätsprüfung durchsetzen soll. Die aktuelle Version verwendet ein `fallback`‑Flag, das nur gesetzt wird, wenn `Download` selbst fehlschlug. Die Testsuite behauptet nun, dass ein `Check`‑Fehlschlag nach einem erfolgreichen `Download` weiterhin fatal bleibt. Der Commit‑Verlauf im PR zeigt den Fortschritt. Baue deine Toleranz‑Gates eng. Jede `if`‑Anweisung, die ein Versagen hindurchlässt, ist eine Invariante, die du in der Review verteidigen musst.
## Probier es selbst

Die drei Artefakte sind öffentlich. Das [Reproduktions‑Repo](https://github.com/5queezer/sablier-traefik-repro) benötigt dreißig Sekunden zum Klonen und Ausführen. Das [Upstream‑Ticket](https://github.com/traefik/traefik/issues/13005) und der [Fix‑PR](https://github.com/traefik/traefik/pull/13006) sind zum Zeitpunkt des Schreibens offen. Wenn du Traefik mit einem beliebigen Plugin betreibst, prüfe, ob `plugins.traefik.io` bei jedem Start aus deinem Traefik‑Container erreichbar ist. Wenn es nicht durchgängig erreichbar ist, bist du nur einen Netzwerk‑Blip davon entfernt, dass alle plugin‑basierten Middleware gleichzeitig ungültig werden.

---

*Christian Pojoni baut Infrastruktur und debuggt Bugs, die dich um 3 Uhr morgens wecken. Mehr unter [vasudev.xyz](https://vasudev.xyz).*

*Das Titelbild für diesen Beitrag wurde von KI erzeugt.*