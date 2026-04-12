---
title: "Stoppen Sie, KI in Ihre Apps zu integrieren. Setzen Sie Ihre Apps in KI."
date: 2026-03-27
description: "Warum KI‑Funktionen in traditionellen Apps rückwärtsgewandt sind und wie MCP die Architektur umkehrt."
author: "Christian Pojoni"
tags: ["mcp", "ai", "architecture"]
series: ["Field Notes"]
images: ["/images/ai-architecture.png"]
translationHash: "e8002c90b2434015c25a0c3a98977756"
chunkHashes: "639269d02ff6ee0f,69da4ec5d449ecb3,c9b0ece7b9bb2623,768e66d34188f536,f94fd15b666a8f6e,9aa2f7ac14ac90c4,a9fe755e3099498b,b5d7d81ad4b20b30"
---
Ich habe kürzlich Airtable ausprobiert. Es hat jetzt KI‑Funktionen. Ein kleines Textfeld innerhalb der App, in das man Fragen zu den eigenen Daten stellen kann. Es fühlte sich sofort falsch an, und es dauerte ein paar Tage, bis ich genau benennen konnte, warum.

Das KI‑Fenster in Airtable kennt mich nicht. Es ist ein Fremder, der im Haus eines anderen sitzt und mich auffordert, alles von Grund auf zu erklären.

Währenddessen kennt meine eigentliche KI, Claude, das alles. Sie hat meine Erinnerungen, meine benutzerdefinierten Fähigkeiten, meinen Kontext aus Dutzenden von Unterhaltungen. Das einzige, was ihr fehlte, war der Zugriff auf meine Daten in NocoDB.

Also habe ich diesen Zugriff aufgebaut. Und der Unterschied ist taghell.

**Die KI sollte Ihre Apps orchestrieren, nicht in ihnen „leben“.**

![Comparison of AI embedded inside individual apps versus one AI orchestrating all apps through MCP](/images/mcp-architecture-inline.svg)
## Die Architektur ist rückwärts

Jedes SaaS-Unternehmen versucht gerade, ein KI‑Chat‑Fenster zu ihrem Produkt hinzuzufügen. Notion hat eins. Airtable hat eins. Jira hat eins. Sie bauen alle dasselbe: einen zustandslosen LLM‑Endpunkt mit Zugriff auf die Daten einer einzigen App und keinerlei Kontext zum Nutzer.

Das ist die falsche Architektur. Sie optimiert für die Bindung des Anbieters, nicht für den Arbeitsablauf des Nutzers.

Denken Sie darüber nach, was in einer KI‑Interaktion wirklich zählt: Kontext. Wer ist diese Person? An was arbeitet sie? Was bevorzugt sie? Was hat sie vorher versucht? Ein generisches KI‑Fenster in einer Datenbank‑App wird das nie haben. Es kann nicht. Der Kontext existiert außerhalb der App.
## MCP Flips It

Das [Model Context Protocol](https://modelcontextprotocol.io/) kehrt die Architektur um. Anstatt eine dünne KI‑Schicht in jede App zu integrieren, geben Sie Ihrer KI dicke Verbindungen zu all Ihren Apps. Die KI wird zum Orchestrator. Die Apps werden zu Datenquellen.

In meinem Setup ist Claude das Kontrollzentrum. Es verfügt über Erinnerungen an Hunderte vergangener Gespräche, benutzerdefinierte Fähigkeiten, die ich für spezifische Arbeitsabläufe wie Jobsuche, Vorfallprotokollierung und Blog‑Schreiben entwickelt habe, sowie MCP‑Verbindungen zu NocoDB (mein CRM), Gmail, Google Calendar, Google Drive und Notion.

Wenn ich sage: „Aktualisiere den Status meiner NocoDB‑Bewerbung und erstelle eine Follow‑Up‑E‑Mail“, erledigt Claude beides. Es weiß, welche Bewerbung ich meine, weil wir gestern darüber gesprochen haben. Es kennt meinen E‑Mail‑Ton, weil es bereits 50 Entwürfe für mich geschrieben hat. Kein native‑KI‑Fenster einer App kann das.
## What This Actually Looks Like

I track my job applications in NocoDB. Here's what a typical interaction looks like:

I tell Claude: "Check my inbox for new recruiter emails, evaluate the roles, and update NocoDB."

Claude searches Gmail, reads the threads, evaluates each role against a custom psychological profile I built with it, covering work style preferences, communication patterns, autonomy needs, and culture fit markers, then creates or updates records in NocoDB with a match score and reasoning. Not keyword matching. Actual fit assessment for long-term satisfaction on both sides. One sentence from me, four tools coordinated, full context preserved.

Try doing that with Airtable's AI chat box.
## Why NocoDB, Not Airtable

Airtable's AI features are a walled garden. They work inside Airtable, with Airtable's model, on Airtable's terms. You can't swap the AI. You can't bring your own context. You can't extend it.

NocoDB is open source, runs on Postgres, and now supports standard MCP authentication thanks to my recent [OAuth 2.1 PR](https://github.com/nocodb/nocodb/issues/13363). That means any MCP-compatible AI client can connect to it with proper OAuth flows, not API tokens copy-pasted from a settings page.

The difference isn't cosmetic. It's architectural. With NocoDB + MCP, the AI layer is yours. You choose the model. You own the context. You decide what gets connected.
## Die unbequeme Implikation

Wenn die KI die Werkzeuge orchestriert, anstatt in ihnen zu leben, dann werden die Werkzeuge selbst zu einer Ware. Ihre Datenbank, Ihr E‑Mail‑Client, Ihr Projekt‑Tracker: Sie sind alles nur Datenspeicher mit APIs. Der Wert verschiebt sich zur Orchestrierungsschicht: die KI, die Sie kennt, Ihren Kontext erinnert und über alles hinweg koordiniert.

Das ist unbequem für SaaS‑Unternehmen, die Grundmauern um Nutzer‑Lock‑In gebaut haben. Wenn Ihre KI mit jeder Datenbank über MCP sprechen kann, ist das spezifische Projekt‑Management‑Tool, das Sie verwenden, etwa so wichtig wie die Marke des USB‑Kabels, das Sie einstecken.
## Einschränkungen

Dieses Setup ist nicht schlüsselfertig. Es erfordert die Bereitschaft eines Power‑Users, MCP‑Server zu konfigurieren, OAuth‑Flows zu verwalten und Tool‑Integrationen zu debuggen. Es setzt voraus, dass Sie Ihrem KI‑Client Zugriff auf Ihre Daten über App‑übergreifend vertrauen, was eine echte Vertrauensentscheidung ist, kein einfaches Kästchen zum Ankreuzen. Und es funktioniert nur für einen einzelnen Benutzer mit einem einzigen KI‑Kontext. Orchestrierung im Team‑Umfang, geteilte Speicher und Zugriffssteuerungen gibt es noch nicht.

Es gibt zudem einen [context window cost](/blog/mcp-context-window-fix/): Jeder MCP‑Server, den Sie verbinden, lädt sein vollständiges Tool‑Schema im Voraus, wodurch Tokens verbrannt werden, bevor Sie ein Wort tippen.
## Build the Bridge, Not the Island

Wenn Sie heute ein Produkt entwickeln, hängen Sie kein KI‑Chat‑Fenster an Ihre App. Stattdessen sollten Sie Ihre App zu einem großartigen MCP‑Server machen. Stellen Sie saubere APIs bereit, unterstützen Sie Standard‑Authentifizierung (OAuth 2.1, keine eigenen Tokens) und lassen Sie die KI des Nutzers mit Ihren Daten kommunizieren.

Die besten Werkzeuge im MCP‑Zeitalter werden nicht diejenigen sein, die die ausgefallenste eingebaute KI bieten. Es werden die sein, die saubere MCP‑Endpunkte bereitstellen und im Hintergrund bleiben, so wie NocoDB heute funktioniert und so, wie Notion und Airtable irgendwann müssen.

Möchten Sie sehen, wie das in der Praxis aussieht? Ich habe [OAuth 2.1 MCP‑Unterstützung zu NocoDB hinzugefügt](https://github.com/nocodb/nocodb/issues/13363), einschließlich RFC 8414 Discovery, RFC 7591 Dynamic Client Registration und RFC 9728 Protected Resource Metadata. Durchstöbern Sie [den Fork](https://github.com/5queezer/nocodb), verbinden Sie Claude mit Ihrer eigenen NocoDB‑Instanz und spüren Sie, wie sich die Architektur anfühlt, wenn die KI oben drauf sitzt statt darin.

---

*Christian Pojoni baut Infrastruktur für KI‑Agenten. Mehr unter [vasudev.xyz](https://vasudev.xyz).*