---
title: "Hör auf, KI in deinen Apps zu verwenden. Bringe deine Apps in die KI."
date: 2026-03-27
description: "Warum KI‑Features intraditionellen Apps rückwärts sind, und wie MCP die Architektur umkehrt."
author: "Christian Pojoni"
tags: ["mcp", "ai", "architecture"]
series: ["Field Notes"]
images: ["/images/ai-architecture.png"]
translationHash: "90ecbd8a9daca5ea54bc730c131a0d59"
chunkHashes: "6fc769ba51456bb7,0f2a252451c29b22,c9b0ece7b9bb2623,768e66d34188f536,f94fd15b666a8f6e,9aa2f7ac14ac90c4,c839c4edbc4121f2,9d3d3d47a3d8b02b"
---
Ich habekürzlich Airtable ausprobiert. Sie hat mittlerweile KI‑Features. Ein kleines Textfeld im Inneren der App, in dem man Fragen zu den eigenen Daten stellen kann. Es fühlte sich sofort falsch an, und es dauerte ein paar Tage, bis ich das Warum erklären konnte.

Das KI‑Fenster in Airtable kennt mich nicht. Es ist ein Fremder, der in einem fremden Haus sitzt und mich dazu zwingt, alles von vorn zu erklären.

Derweil kennt mein eigentlicher KI‑Partner, Claude, all das. Er hat meine Erinnerungen, meine individuellen Fähigkeiten und den Kontext über Dutzende von Gesprächen. Das Einzige, was ihm fehlte, war der Zugriff auf meine Daten in NocoDB.

Also habe ich diesen Zugriff gebaut. Und der Unterschied ist Tag und Nacht.

**Die KI sollte deine Apps orchestrieren, nicht in ihnen leben.**
## The Architecture is Backwards

Every SaaS company right now is racing to add an AI chat window to their product. Notion has one. Airtable has one. Jira has one. They're all building the same thing: a stateless LLM endpoint with access to one app's data and zero context about the user.

This is the wrong architecture. It optimizes for the vendor's lock‑in, not for the user's workflow.

Think about what actually matters in an AI interaction: context. Who is this person? What are they working on? What do they prefer? What have they tried before? A generic AI window inside a database app will never have that. It can't. The context lives outside the app.
##MCP kehrt das um

The [Model Context Protocol](https://modelcontextprotocol.io/) invertiert die Architektur. Statt eine dünne KI‑Schicht in jede Anwendung zu packen, gibst du deiner KI dicke Verbindungen zu allen deinen Anwendungen. Die KI wird zum Orchestrator. Die Anwendungen werden zu Datenquellen.

In meiner Einrichtung ist Claude das Kommandozentrum. Sie hat Erinnerungen an hunderte vergangener Gespräche, eigene Fähigkeiten, die ich für bestimmte Workflows wie Job‑Suche, Vorfall‑Logging und Blog‑Schreiben gebaut habe, und MCP‑Verbindungen zu NocoDB (meinem CRM), Gmail, Google Calendar, Google Drive und Notion.

Wenn ich sage „den Status meiner NocoDB‑Bewerbung aktualisiere und eine Rückantwort‑E‑Mail verfasse“, erledigt Claude beides. Sie weiß, um welche Bewerbung es geht, weil wir das gestern besprochen haben. Sie kennt meinen E‑Mail‑Ton, weil dafür bereits 50 Entwürfe geschrieben wurden. Keine app‑interne KI‑Schnittstelle kann das.
## Was Das Eigentlich So Aussieht

Ich verfolge meine Jobbewerbungen in NocoDB. Hier ist ein typisches Interaktionsbeispiel:

Ich sage zu Claude: "Check my inbox for new recruiter emails, evaluate the roles, and update NocoDB."

Claude durchsucht Gmail, liest die Threads, bewertet jede Rolle anhand eines maßgeschneiderten psychologischen Profils, das ich damit aufgebaut habe, und deckt Arbeitsstilpräferenzen, Kommunikationsmuster, Autonomiebedarf und Kultur‑Fit‑Hinweise ab, dann erstellt oder aktualisiert es Datensätze in NocoDB mit einer Passungs‑Bewertung und Begründung. NichtKeyword‑Übereinstimmung. Echte Passungsbewertung für langfristige Zufriedenheit auf beiden Seiten. Eine einzige Aussage von mir, vier Tools werden koordiniert, voller Kontext erhalten.

Versuche das mal mit der AI‑Chat‑Box von Airtable.
## Why NocoDB,Not Airtable

Die KI‑Features von Airtable sind ein abgeschlossener Garten. Sie arbeiten innerhalb von Airtable, mit Airtable‑Modell, unter Airtable‑Bedingungen. Man kann die KI nicht austauschen. Man kann keinen eigenen Kontext einbringen. Man kann sie nicht erweitern.

NocoDB ist Open Source, läuft auf Postgres, und unterstützt jetzt standardmäßige MCP‑Authentifizierung dank meines jüngsten [OAuth 2.1 PR](https://github.com/nocodb/nocodb/issues/13363). Das bedeutet, dass jeder MCP‑kompatible AI‑Client sich damit verbinden kann mit den richtigen OAuth‑Abläufen, nicht mit von einer Einstellungsseite kopierten API‑Tokens.

Der Unterschied ist nicht kosmetisch. Er ist architektonisch. Mit NocoDB + MCP ist die KI‑Schicht deine. Du wählst das Modell. Du besitzt den Kontext. Du entscheidest, was angeschlossen wird.
## Die unbequeme Implikation

Wenn die KI die Tools orchestriert, statt in ihnen zu leben, werden die Tools selbst commoditized. Deine Datenbank, dein E‑Mail‑Client, dein Projekt‑Tracker: alles nur Datenspeicher mit APIs. Der Wert verschiebt sich auf die Orchestriereschicht: die KI, die dich kennt, deinen Kontext verfolgt und über alles hinweg koordiniert.

Das ist für SaaS‑Unternehmen unbequem, die auf Nutzer‑bindung (Moats) basierten. Wenn deine KI über MCP mit jeder Datenbank kommunizieren kann, ist das spezifische Projekt‑Management‑Tool, das du nutzt, so irrelevant wie die Marke eines USB‑Kabels, das du anschließt.
## Limitations

Dieses Setup istnicht sofort einsatzbereit. Es erfordert Bereitschaft eines Power‑Users, MCP‑Server zu verkabeln, OAuth‑Abläufe zu verwalten und Tool‑Integrationen zu debuggen. Es setzt voraus, dass du dem AI‑Client vertraust, Zugriff auf deine Daten über verschiedene Apps zu gewähren – was eine echte Vertrauensentscheidung ist, keine reine Kontrollkästchen‑Option. Und es funktioniert für einen einzelnen Nutzer mit einer einzelnen AI‑Sitzung. Team‑skalierte Orchestrierung, geteilter Speicher und Zugriffssteuerungen existieren noch nicht.
## Bridge bauen, nicht Insel

Wenn du heute ein Produkt bauen willst, füge kein KI-Chatfenster deiner App hinzu. Stattdessen mache deine App zu einem guten MCP-Server. Exponiere saubere APIs, unterstütze standardisiertes Authentifizierung (OAuth 2.1, nicht benutzerdefinierte Tokens) und lass die KI des Benutzers mit deinen Daten sprechen.

Die besten Tools in der MCP‑Ära werden nicht die mit dem ausgeklügeltesten eingebauten KI sein. Sie werden die sein, die saubere MCP‑Endpoints bereitstellen und sich zurückhalten, wie NocoDB heute bereits tut und wie Notion und Airtable letztlich tun müssen.

Möchtest du sehen, wie das in der Praxis aussieht? Ich habe [OAuth 2.1 MCP support to NocoDB](https://github.com/nocodb/nocodb/issues/13363), einschließlich RFC 8414 Discovery, RFC 7591 Dynamic Client Registration und RFC 9728 Protected Resource Metadata. Durchsuche [den Fork](https://github.com/5queezer/nocodb), verbinde Claude mit deiner eigenen NocoDB‑Instanz und beobachte, wie die Architektur wirkt, wenn die KI obenauf statt inside liegt.

---

*Christian Pojoni baut KI-Agenten-Infrastruktur. Mehr unter [vasudev.xyz](https://vasudev.xyz).*

*Das Deckblatt dieses Beitrags wurde von KI generiert.*