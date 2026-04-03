---
title: "Stoppte das Einbinden von KI in Ihre Apps. Setze Ihre Apps in die KI ein."
date: 2026-03-27
description: "Warum KI-Funktionen in konventionellen oder etablierten Softwareanwendungen veraltet sind und wie MCP die Architektur grundlegend ändert.  

In konventionellen oder etablierten Softwareanwendungen integrieren sich KI-Funktionen oft reaktiv und isoliert, indem sie komplexe KI-Systeme abstrahieren. Dies führt zu statischen und nicht optimalen Ergebnissen. **MCP** hingegen bietet eine einheitliche Schnittstelle, mit der Anwendungen dynamisch und proaktiv in eine zentrale KI-Schicht integriert werden können. So entsteht eine neue architektonische Paradigmenverschiebung: Statt auf lokale oder eingeschränkte KI-Modelle zurückzugreifen, greifen Apps auf einen einheitlichen, leistungsfähigen und kontinuierlich aktualisierten KI-Backend zurück – und dies in einer nutzerzentrierten, nahtlosen Weise."
author: "Christian Pojoni"
tags: ["mcp", "nocodb", "ai", "architecture"]
images: ["/images/ai-architecture.png"]
translationHash: "9e4e893b4737ae7f7cda69cc1c0547e1"
---
Model Context Protocol (MCP)invertiert die Architektur. Statt einer dünnen KI-Schicht in jeder Anwendung, geben Sie Ihrer KI dicken Verbindungen zu allen Anwendungen. Die KI wird zum Orchesterer. Die Anwendungen werden zu Datenquellen.

In meiner Konfiguration ist Claude der Kommandozentrale. Er hat:

- **Erinnerungen** aus Hunderten von früheren Gesprächen
- **Benutzerdefinierte Fähigkeiten** für spezifische Workflows (Bewerbungsgespräche, Incident-Protokollierung, Blog-Erstellung)
- **MCP-Verbindungen** zu NocoDB (meinem CRM), Gmail, Google Kalender, Google Drive, Notion

Wenn ich sage: „Aktualisiere den Status meiner NocoDB-Anwendung und erstelle eine Follow-up-E-Mail“, erwartet Claude beide Aufgaben. Er weiß, um welchen Anwendungsfall es sich handelt, weil wir darüber gestern gesprochen haben. Er kennt meinen E-Mail-Stil, weil er mir bereits 50 Entwürfe erstellt hat. Keine Anwendungs-native KI-Fenster können das.

## Was das tatsächlich aussehen lässt

Ich verfolge Bewerbungen in NocoDB. Hier ist ein typisches Interaktionsexample:

Ich sage Claude: „Prüfe meinen Posteingang auf neue Rekruter-E-Mails, bewerte die Rollen und aktualisiere NocoDB.“

Claude durchsucht Gmail, liest die Threads, bewertet jede Rolle gegen einen benutzerdefinierten psychologischen Profil, das ich mit ihm erstellt habe – abdeckend Arbeitsstilpräferenzen, Kommunikationsmuster, Autonomiebedürfnisse und Kulturpassen-Marker – und erstellt oder aktualisiert Datensätze in NocoDB mit einem Treffer-Scores und Begründungen. Nicht Schlüsselwort-Matching. Echte Anpassung für langfristige Zufriedenheit auf beiden Seiten. Eine einzige Satz von mir, vier Tools koordiniert, volle Kontext-Konservierung.

Versuche das mit Airtables KI-Fenster.

## Warum NocoDB, nicht Airtable

Airtables KI-Features sind ein eingegrenzter Garten. Sie funktionieren innerhalb von Airtable, mit Airtables Modell, auf Airtables Bedingungen. Sie können den KI-Dienst nicht austauschen. Sie können Ihren eigenen Kontext nicht bringen. Sie können es nicht erweitern.

NocoDB ist Open Source, läuft auf Postgres und – wie meine aktuelle [OAuth 2.1 PR](https://github.com/nocodb/nocodb/issues/13363) zeigt – unterstützt standardmäßige MCP-Authentifizierung. Das bedeutet, dass jeder MCP-kompatible KI-Kunde mit korrekter OAuth-Flow zu NocoDB verbinden kann, nicht API-Token, die aus einer Einstellungspage kopiert werden.

Der Unterschied ist nicht kosmetisch. Es ist architektonisch. Mit NocoDB + MCP ist die KI-Schicht Ihrer Wahl. Sie wählen das Modell. Sie besitzen den Kontext. Sie entscheiden, was verbunden wird.

## Die unbequeme Implikation

Wenn die KI die Werkzeuge orchestriert statt darin zu leben, werden die Werkzeuge selbst zu Kommoditäten. Ihre Datenbank, Ihr E-Mail-Klient, Ihr Projekt-Tracker – sie sind nur Datenquellen mit APIs. Der Wert verschiebt sich auf die Orchestrierung-Schicht: die KI, die Sie kennt, Ihren Kontext erinnert und überall koordiniert.

Das ist unbequem für SaaS-Unternehmen, die Mauern um die Nutzer-Lock-in gebaut haben. Wenn Ihre KI mit MCP auf jede Datenbank sprechen kann, spielt die spezifische Projekt-Management-Tool, die Sie verwenden, eine Rolle, die einem USB-Kabel-Brand entspricht.

## Einschränkungen

Diese Einrichtung ist nicht einmalig. Sie erfordert die Bereitschaft eines Power-Nutzer, MCP-Server zu konfigurieren, OAuth-Flüsse zu debuggen und Tool-Integrationen zu integrieren. Sie setzt voraus, dass Sie Ihren KI-Kunden vertrauen, die über alle Anwendungen Ihres Datenzugriffs verfügen – was eine echte Vertrauensentscheidung ist, keine Checkbox. Und es funktioniert für einen einzelnen Benutzer mit einem einzigen KI-Kontext. Team-Scalierung, gemeinsame Erinnerungen, Zugriffs-Kontrollen – das existiert noch nicht.

## Den Brückenbau, nicht die Insel

Wenn Sie heute ein Produkt bauen, bauen Sie nicht einfach einen KI-Chat-Fenster auf Ihrer App. Stattdessen machen Sie Ihre App zu einem guten MCP-Server. Öffnen Sie saubere APIs, unterstützen Sie standardmäßige Authentifizierung (OAuth 2.1, nicht benutzerdefinierte Token), und lassen Sie den KI-Kunden Ihren Daten sprechen.

Die besten Werkzeuge in der MCP-Ära werden nicht die mit dem schönsten eingebauten KI sein. Sie werden die mit den sauberen MCP-Endpunkten sein und sich aus der Weise zurückziehen – wie NocoDB heute, und wie Notion und Airtable letztlich werden müssen.

Möchten Sie sehen, wie das praktisch aussieht? Ich fügte [OAuth 2.1 MCP-Unterstützung zu NocoDB hinzu](https://github.com/nocodb/nocodb/issues/13363) – RFC 8414 Discovery, RFC 7591 Dynamic Client Registration, RFC 9728 Protected Resource Metadata. Browse [die Fork](https://github.com/5queezer/nocodb), versuche Claude mit Ihrer eigenen NocoDB-Instanz zu verbinden, und sieh, wie die Architektur wirkt, wenn die KI oben statt drinnen sitzt.

---

*Mehr bei [vasudev.xyz](https://vasudev.xyz).*