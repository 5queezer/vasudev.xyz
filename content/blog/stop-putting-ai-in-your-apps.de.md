---
title: "Hör auf, KI in deinen Apps zu verwenden. Bringe deine Apps in die KI."
date: 2026-03-27
description: "Warum KI‑Features in klassischen Anwendungen rückwärts sind und wie MCP die Architektur umkehrt."
author: "Christian Pojoni"
tags: ["mcp", "ai", "architecture"]
images: ["/images/ai-architecture.png"]
translationHash: "27829ec3ed0912b2c4ba37e469e8f14b"
---
Ich habe Airtable kürzlich ausprobiert. Sie hat jetzt KI‑Features. Ein kleines Textfeld in der App, in dem du Fragen zu deinen Daten stellen kannst. Es fühlte sich sofort falsch an, und es dauerte ein paar Tage, bis ich das formulieren konnte.

Das KI‑Fenster inside Airtable kennt mich nicht. Es ist ein Fremder, der in einem anderen Menschenhaus sitzt und mich fragt, alles von vorne zu erklären.

Zwischenzeitlich kennt meine eigentliche KI, Claude, all das. Sie hat meine Erinnerungen, meine individuellen Fähigkeiten, den Kontext über Dutzende von Gesprächen. Das Einzige, was ihr fehlte, war Zugriff auf meine Daten in NocoDB.

Also habe ich diesen Zugriff gebaut. Der Unterschied ist Tag und Nacht.

**Die KI sollte deine Apps orchestrieren, nicht in ihnen leben.**

## Die Architektur ist rückwärts

Jedes SaaS‑Unternehmen versucht derzeit, ein KI‑Chat‑Fenster zu seinem Produkt hinzuzufügen. Notion hat eins. Airtable hat eins. Jira hat eins. Sie bauen alle dasselbe: einen zustandslosen LLM‑Endpoint mit Zugriff auf die Daten einer einzelnen App und keinen Kontext zum Nutzer.

Das ist die falsche Architektur. Sie optimiert für die Lock‑in des Anbieters, nicht für den Arbeitsablauf des Nutzers.

Stell dir vor, was bei einer KI‑Interaktion wirklich wichtig ist: Kontext. Wer ist diese Person? Auf was für ein Projekt arbeitet sie? Was bevorzugt sie? Was haben sie bereits ausprobiert? Ein generisches KI‑Fenster in einer Datenbank‑App wird das nie haben. Es kann nicht. Der Kontext liegt außerhalb der App.

## MCP invertiert es

Das [Model Context Protocol](https://modelcontextprotocol.io/) invertiert die Architektur. Statt eine dünne KI‑Schicht in jede App zu packen, gibst du deiner KI tiefe Verbindungen zu allen deinen Apps. Die KI wird zum Orchestrator. Die Apps werden zu Datenquellen.

In meiner Einrichtung ist Claude das Kommandozentrum. Sie hat Erinnerungen an Hunderte vergangener Gespräche, eigene Fähigkeiten, die ich für bestimmte Workflows wie Jobsuche, Vorfalls‑Logging und Blog‑Schreiben gebaut habe, und MCP‑Verbindungen zu NocoDB (meinem CRM), Gmail, Google Calendar, Google Drive und Notion.

Wenn ich sage „aktualisiere den Status meiner NocoDB‑Anwendung und erstelle einen Folgebewerbungs‑E‑Mail‑Entwurf“, macht Claude beides. Sie weiß, auf welche Anwendung ich mich beziehe, weil wir das gestern besprochen haben. Sie kennt meinen E‑Mail‑Ton, weil dafür bereits 50 Entwürfe existieren. Keine app‑eigene KI‑Fenster‑Lösung kann das.

## Was das eigentlich aussieht

Ich verfolge meine Bewerbungen in NocoDB. So sieht ein typisches Gespräch aus:

Ich sage zu Claude: „Prüfe meine Posteingang nach neuen Recruiter‑E‑Mails, bewerte die Rollen und aktualisiere NocoDB.“

Claude durchsucht Gmail, liest die Threads, bewertet jede Rolle anhand eines individuell aufgebauten psychologischen Profils, das ich mit ihr entwickelt habe, und berücksichtigt Arbeitsstil‑Präferenzen, Kommunikationsmuster, Autonomie‑Bedarf und Kultur‑Fit‑Markierer. Dann erstellt oder aktualisiert sie Datensätze in NocoDB mit einem Match‑Score und einer Begründung. Nicht nur Keyword‑Matching. Eine echte Passungs‑Bewertung für langfristige Zufriedenheit beidseitig. Eine einzelne Aussage von mir, vier Tools koordiniert, voller Kontext erhalten.

Versuch das mit dem KI‑Chat‑Fenster von Airtable zu machen.

## Warum NocoDB, nicht Airtable

Die KI‑Features von Airtable sind ein abgeschlossenes Garten‑Gebiet. Sie laufen innerhalb von Airtable, mit Airtable‑Modellen und nach Airtable‑Voraussetzungen. Du kannst die KI nicht austauschen. Du kannst keinen eigenen Kontext einbringen. Du kannst sie nicht erweitern.

NocoDB ist Open‑Source, läuft auf Postgres und unterstützt dank meines jüngsten [OAuth 2.1 PR](https://github.com/nocodb/nocodb/issues/13363) standardmäßige MCP‑Authentifizierung. Das bedeutet, dass beliebige MCP‑kompatible KI‑Clients sich mit korrekten OAuth‑Abläufen verbinden können, nicht mit per Copy‑Paste entnommenen API‑Tokens aus einer Einstellungsseite.

Der Unterschied ist nicht nur oberflächlich. Er ist architektonisch. Mit NocoDB + MCP ist die KI‑Schicht dir gehören. Du wählst das Modell. Du besitzt den Kontext. Du entscheidest, was verbunden wird.

## Die unbequeme Implikation

Wenn die KI die Tools orchestriert statt in ihnen zu leben, dann werden die Tools selbst commodifiziert. Deine Datenbank, dein E‑Mail‑Client, dein Projekt‑Tracker: alles sind nur Datenspeicher mit APIs. Der Wert verschiebt sich auf die Orchestrierungsebene: die KI, die dich kennt, deinen Kontext erinnert und über alles hinweg koordiniert.

Das ist für SaaS‑Firmen unangenehm, die sich auf Sperren rund um Nutzer‑Lock‑In stützten. Wenn deine KI über MCP mit jeder Datenbank reden kann, ist das spezifische Projekt‑Management‑Tool, das du nutzt, etwa so wichtig wie die Marke eines USB‑Kabels, das du anschließt.

## Einschränkungen

Diese Einrichtung ist nicht sofort einsatzbereit. Sie erfordert die Bereitschaft eines Power‑Users, MCP‑Server zu verkabeln, OAuth‑Abläufe zu verwalten und Tool‑Integrationen zu debuggen. Sie setzt voraus, dass du deiner KI‑Implementierung vertraust, wenn sie Zugriff auf Daten über verschiedene Apps hinweg hat – das ist eine echte Vertrauensentscheidung, kein bloßes Kontrollkästchen. Und sie funktioniert für einen einzigen Nutzer mit einem einzigen KI‑Kontext. Skalierung für Teams, geteilter Speicher und Zugriffs‑Kontrollen gibt es noch nicht.

## Bau die Brücke, nicht die InselWenn du heute ein Produkt baut, stecke keine KI‑Chat‑Fenster‑Erweiterung in deine App. Stattdessen mache deine App zu einem guten MCP‑Server. Biete saubere APIs, unterstütze standardisierte Authentifizierung (OAuth 2.1, nicht benutzerdefinierte Tokens), und lass die KI des Nutzers mit deinen Daten reden.

Die besten Werkzeuge im MCP‑Zeitalter werden nicht die mit den ausgeklügeltesten eingebauten KI‑Features sein, sondern jene, die saubere MCP‑Endpoints bereitstellen und sich aus dem Weg räumen, wie NocoDB heute macht und wie Notion und Airtable irgendwann gezwungen sein werden.

Möchtest du sehen, wie das in der Praxis aussieht? Ich habe [OAuth 2.1 MCP‑Support zu NocoDB](https://github.com/nocodb/nocodb/issues/13363) hinzugefügt, inklusive RFC 8414 Discovery, RFC 7591 Dynamic Client Registration und RFC 9728 Protected Resource Metadata. Durchsuche [den Fork](https://github.com/5queezer/nocodb), verbinde Claude mit deiner eigenen NocoDB‑Instanz und spüre die Architektur, wenn die KI oben liegt statt innen.

*Das Deckbild für diesen Beitrag wurde von KI generiert.*

*Christian Pojoni baut KI‑Agenten‑Infrastruktur. Mehr bei [vasudev.xyz](https://vasudev.xyz).*