---
title: "Hör auf, KI in deine Apps zu integrieren. Integriere deine Apps in KI."
date: 2026-03-27
description: "Warum KI-Funktionen in traditionellen Apps rückwärts gedacht sind und wie MCP die Architektur auf den Kopf stellt."
author: "Christian Pojoni"
tags: ["mcp", "ai", "architecture"]
images: ["/images/ai-architecture.png"]
translationHash: "6647f6a4913cc31d8574f8ce4894b788"
---
Ich habe Airtable kürzlich ausprobiert. Es hat jetzt KI-Funktionen. Ein kleines Textfeld in der App, in dem man Fragen zu seinen Daten stellen kann. Es fühlte sich sofort falsch an, und es hat mich ein paar Tage gekostet, zu artikulieren, warum.

Das KI-Fenster in Airtable weiß nicht, wer ich bin. Es ist ein Fremder, der im Haus eines anderen sitzt und von mir verlangt, alles von Grund auf neu zu erklären.

Meine eigentliche KI – Claude – weiß das alles hingegen. Sie hat meine Erinnerungen, meine individuellen Fähigkeiten, meinen Kontext über Dutzende von Gesprächen hinweg. Das Einzige, was ihr fehlte, war der Zugriff auf meine Daten in NocoDB.

Also habe ich diesen Zugriff gebaut. Und der Unterschied ist wie Tag und Nacht.

**Die KI sollte deine Apps orchestrieren, nicht in ihnen leben.**

## Die Architektur steht auf dem Kopf

Jedes SaaS-Unternehmen wetteifert derzeit darum, ein KI-Chatfenster in sein Produkt zu integrieren. Notion hat eines. Airtable hat eines. Jira hat eines. Sie bauen alle dasselbe: einen zustandslosen LLM-Endpunkt mit Zugriff auf die Daten einer einzigen App und null Kontext über den Nutzer.

Das ist die falsche Architektur. Sie ist auf den Vendor-Lock-in des Anbieters ausgelegt, nicht auf den Workflow der Nutzer.

Denk darüber nach, was bei einer KI-Interaktion tatsächlich zählt: der Kontext. Wer ist diese Person? Woran arbeitet sie? Was bevorzugt sie? Was hat sie schon versucht? Ein generisches KI-Fenster in einer Datenbank-App wird das niemals haben. Es kann es nicht. Der Kontext lebt außerhalb der App.

## MCP dreht es um

Das [Model Context Protocol](https://modelcontextprotocol.io/) dreht die Architektur um. Statt eine dünne KI-Schicht in jede App zu packen, stattest du deine KI mit robusten Verbindungen zu all deinen Apps aus. Die KI wird zum Orchestrator. Die Apps werden zu Datenquellen.

In meinem Setup ist Claude die Kommandozentrale. Es verfügt über:

- **Erinnerungen** aus hunderten vergangenen Gesprächen
- **Individuelle Fähigkeiten**, die ich für bestimmte Workflows gebaut habe (Jobsuche, Incident-Logging, Blog-Schreiben)
- **MCP-Verbindungen** zu NocoDB (mein CRM), Gmail, Google Kalender, Google Drive, Notion

Wenn ich sage „Aktualisiere den Status meiner NocoDB-Bewerbung und entwirf eine Follow-up-E-Mail“, erledigt Claude beides. Es weiß, welche Bewerbung ich meine, weil wir sie gestern besprochen haben. Es kennt meinen E-Mail-Tonfall, weil es schon 50 Entwürfe für mich geschrieben hat. Kein app-eigenes KI-Fenster kann das.

## Wie das in der Praxis aussieht

Ich verfolge meine Bewerbungen in NocoDB. So sieht eine typische Interaktion aus:

Ich sage zu Claude: „Prüfe meinen Posteingang auf neue Recruiter-E-Mails, bewerte die Stellen und aktualisiere NocoDB.“

Claude durchsucht Gmail, liest die Threads, bewertet jede Stelle anhand eines individuellen psychologischen Profils, das ich mit ihm erstellt habe – es umfasst Arbeitsstilpräferenzen, Kommunikationsmuster, Autonomiebedürfnisse und Marker für die Kulturpassung – und erstellt oder aktualisiert dann Datensätze in NocoDB mit einem Match-Score und einer Begründung. Kein Keyword-Matching. Eine echte Passungsbewertung für langfristige Zufriedenheit auf beiden Seiten. Ein Satz von mir, vier koordinierte Tools, vollständiger Kontext bleibt erhalten.

Versuch das mal mit dem KI-Chatfeld von Airtable.

## Warum NocoDB, nicht Airtable

Die KI-Funktionen von Airtable sind ein abgeschottetes Ökosystem. Sie funktionieren innerhalb von Airtable, mit Airtables Modell und zu Airtables Bedingungen. Du kannst die KI nicht austauschen. Du kannst deinen eigenen Kontext nicht mitbringen. Du kannst sie nicht erweitern.

NocoDB ist Open Source, läuft auf Postgres und unterstützt – seit meinem kürzlichen [OAuth 2.1 PR](https://github.com/nocodb/nocodb/issues/13363) – die standardmäßige MCP-Authentifizierung. Das bedeutet, dass jeder MCP-kompatible KI-Client mit korrekten OAuth-Flows darauf zugreifen kann, statt mit API-Tokens, die von einer Einstellungsseite kopiert und eingefügt wurden.

Der Unterschied ist nicht kosmetisch. Er ist architektonisch. Mit NocoDB + MCP gehört dir die KI-Schicht. Du wählst das Modell. Du besitzt den Kontext. Du entscheidest, was verbunden wird.

## Die unbequeme Schlussfolgerung

Wenn die KI die Tools orchestriert, anstatt in ihnen zu leben, dann werden die Tools selbst zur austauschbaren Massenware. Deine Datenbank, dein E-Mail-Client, dein Projekttracker – sie sind alle nur Datenspeicher mit APIs. Der Wert verschiebt sich auf die Orchestrierungsschicht: die KI, die dich kennt, sich deinen Kontext merkt und über alles hinweg koordiniert.

Das ist unangenehm für SaaS-Unternehmen, die Burggräben um den User-Lock-in herum gebaut haben. Wenn deine KI über MCP mit jeder Datenbank sprechen kann, ist es fast so egal, welches spezifische Projektmanagement-Tool du nutzt, wie die Marke des USB-Kabels, das du einstöpselst.

## Einschränkungen

Dieses Setup ist nicht schlüsselfertig. Es erfordert die Bereitschaft eines Power-Users, MCP-Server zu verdrahten, OAuth-Flows zu verwalten und Tool-Integrationen zu debuggen. Es setzt voraus, dass du deinem KI-Client appübergreifenden Zugriff auf deine Daten gewährst – eine echte Vertrauensentscheidung, keine bloße Checkbox. Und es funktioniert für einen einzelnen Nutzer mit einem einzelnen KI-Kontext. Orchestrierung im Team-Maßstab, geteilter Speicher, Zugriffskontrollen – nichts davon existiert bisher.

## Baut eine Brücke, keine Insel

Wenn du heute ein Produkt entwickelst, schraube kein KI-Chatfenster an deine App. Mach deine App stattdessen zu einem erstklassigen MCP-Server. Biete saubere APIs an, unterstütze Standard-Authentifizierung (OAuth 2.1, keine Custom-Tokens) und lass die KI des Nutzers mit deinen Daten sprechen.

Die besten Tools im MCP-Zeitalter werden nicht die mit der ausgefeiltesten eingebauten KI sein. Es werden die sein, die saubere MCP-Endpunkte bereitstellen und sich nicht in den Weg stellen – so wie es NocoDB heute tut und wie es Notion und Airtable irgendwann tun müssen.

Möchtest du sehen, wie das in der Praxis aussieht? Ich habe [OAuth 2.1 MCP-Support zu NocoDB hinzugefügt](https://github.com/nocodb/nocodb/issues/13363) – RFC 8414 Discovery, RFC 7591 Dynamic Client Registration, RFC 9728 Protected Resource Metadata. Durchstöbere [den Fork](https://github.com/5queezer/nocodb), verbinde Claude mit deiner eigenen NocoDB-Instanz und spür selbst, wie sich die Architektur anfühlt, wenn die KI oben drauf sitzt statt drin.

---

*Mehr unter [vasudev.xyz](https://vasudev.xyz).*