---
title: "Hör auf, KI in deine Apps zu integrieren. Integriere deine Apps in KI."
date: 2026-03-27
description: "Warum KI-Funktionen in traditionellen Apps verkehrt herum gedacht sind und wie MCP die Architektur auf den Kopf stellt."
author: "Christian Pojoni"
tags: ["mcp", "nocodb", "ai", "architecture"]
images: ["/images/ai-architecture.png"]
translationHash: "0729e6058332da04c512c2cee20db737"
---
Ich habe kürzlich Airtable ausprobiert. Es bietet mittlerweile KI-Funktionen. Eine kleine Textbox innerhalb der App, in der man Fragen zu seinen Daten stellen kann. Es hat sich sofort falsch angefühlt, und es hat einige Tage gedauert, bis ich formulieren konnte, warum.

Das KI-Fenster in Airtable weiß nicht, wer ich bin. Es ist ein Fremder, der im Haus eines anderen sitzt und mich bittet, alles von Grund auf neu zu erklären.

Meine eigentliche KI – Claude – weiß das alles. Sie verfügt über meine Erinnerungen, meine maßgeschneiderten Skills und meinen Kontext aus Dutzenden von Gesprächen. Es fehlte ihr nur der Zugriff auf meine Daten in NocoDB.

Also habe ich diesen Zugriff geschaffen. Und der Unterschied ist wie Tag und Nacht.

**Die KI sollte deine Apps orchestrieren, nicht in ihnen leben.**

## Die Architektur ist verkehrt herum

Aktuell wetteifern alle SaaS-Unternehmen darum, ein KI-Chat-Fenster in ihr Produkt zu integrieren. Notion hat eins. Airtable hat eins. Jira hat eins. Sie alle bauen dasselbe: einen zustandslosen LLM-Endpunkt mit Zugriff auf die Daten einer einzigen App und keinerlei Kontext über den Nutzer.

Das ist die falsche Architektur. Sie ist auf den Hersteller-Lock-in optimiert, nicht auf die Arbeitsabläufe der Nutzer.

Überlege, was bei einer KI-Interaktion wirklich zählt: Kontext. Wer ist diese Person? Woran arbeitet sie? Was bevorzugt sie? Was hat sie bereits versucht? Ein generisches KI-Fenster in einer Datenbank-App wird das nie haben. Es kann es gar nicht. Der Kontext existiert außerhalb der App.

## MCP dreht es um

Das [Model Context Protocol](https://modelcontextprotocol.io/) kehrt die Architektur um. Statt eine dünne KI-Schicht in jede App zu integrieren, stattet man seine KI mit robusten Anbindungen zu allen seinen Apps aus. Die KI wird zum Orchestrator. Die Apps werden zu Datenquellen.

In meinem Setup ist Claude die Schaltzentrale. Es verfügt über:

- **Erinnerungen** aus Hunderten vergangener Gespräche
- **Maßgeschneiderte Skills**, die ich für spezifische Workflows gebaut habe (Jobsuche, Incident-Logging, Blog-Schreiben)
- **MCP-Verbindungen** zu NocoDB (mein CRM), Gmail, Google Calendar, Google Drive, Notion

Wenn ich sage: „Aktualisiere den Status meiner Bewerbung in NocoDB und entwirf eine Follow-up-E-Mail“, erledigt Claude beides. Es weiß, welche Bewerbung ich meine, weil wir gestern darüber gesprochen haben. Es kennt meinen E-Mail-Ton, da es bereits 50 Entwürfe für mich verfasst hat. Kein KI-Fenster, das nativ in einer App integriert ist, kann das leisten.

## Wie das in der Praxis aussieht

Ich verwalte meine Bewerbungen in NocoDB. So sieht eine typische Interaktion aus:

Ich sage zu Claude: „Prüfe meinen Posteingang auf neue E-Mails von Recruitern, bewerte die Stellenangebote und aktualisiere NocoDB.“

Claude durchsucht Gmail, liest die E-Mail-Verläufe und bewertet jede Stelle anhand eines individuellen psychologischen Profils, das ich gemeinsam mit der KI erstellt habe – darunter Präferenzen im Arbeitsstil, Kommunikationsmuster, Autonomiebedürfnisse und Indikatoren für die kulturelle Passung. Anschließend erstellt oder aktualisiert es Datensätze in NocoDB mit einem Match-Score und einer Begründung. Kein reines Keyword-Matching. Eine echte Eignungsbewertung für langfristige Zufriedenheit auf beiden Seiten. Ein Satz von mir, vier Tools werden koordiniert, der gesamte Kontext bleibt erhalten.

Versuch das mal mit der KI-Chatbox von Airtable.

## Warum NocoDB, nicht Airtable

Die KI-Funktionen von Airtable sind ein ummauertes Ökosystem (Walled Garden). Sie funktionieren nur innerhalb von Airtable, mit Airtables Modell und zu Airtables Bedingungen. Man kann die KI nicht austauschen. Man kann nicht den eigenen Kontext mitbringen. Man kann sie nicht erweitern.

NocoDB ist Open Source, läuft auf Postgres und unterstützt – seit meinem jüngsten [OAuth 2.1 PR](https://github.com/nocodb/nocodb/issues/13363) – standardmäßige MCP-Authentifizierung. Das bedeutet, dass sich jeder MCP-kompatible KI-Client über korrekte OAuth-Flows verbinden kann, anstatt mit API-Tokens, die Copy-Paste aus einer Einstellungsseite stammen.

Der Unterschied ist nicht nur kosmetisch. Er ist architektonischer Natur. Mit NocoDB + MCP gehört die KI-Schicht dir. Du wählst das Modell. Du kontrollierst den Kontext. Du entscheidest, was vernetzt wird.

## Die unkomfortable Konsequenz

Wenn die KI die Tools orchestriert, anstatt in ihnen zu residieren, dann werden die Tools selbst zu austauschbaren Commodities. Deine Datenbank, dein E-Mail-Client, dein Projekttracker – sie sind alle nur Datenspeicher mit APIs. Der Mehrwert verlagert sich auf die Orchestrierungsschicht: die KI, die dich kennt, sich deinen Kontext merkt und alles übergreifend koordiniert.

Das ist unkomfortabel für SaaS-Unternehmen, die ihren Burggraben rund um die Nutzerbindung (User Lock-in) gebaut haben. Wenn deine KI über MCP mit jeder Datenbank kommunizieren kann, ist es nahezu egal, welches konkrete Projektmanagement-Tool du verwendest – ähnlich wie die Marke des USB-Kabels, das du anschließt.

## Einschränkungen

Dieses Setup ist nicht schlüsselfertig. Es erfordert die Bereitschaft eines fortgeschrittenen Nutzers (Power User), MCP-Server zu konfigurieren, OAuth-Flows zu verwalten und Tool-Integrationen zu debuggen. Es setzt voraus, dass du deinem KI-Client app-übergreifenden Zugriff auf deine Daten gewährst – eine echte Vertrauensentscheidung, keine bloße Checkbox. Und es funktioniert bisher nur für einen einzelnen Nutzer mit einem einzigen KI-Kontext. Orchestrierung im Team-Maßstab, geteiltes Gedächtnis, Zugriffskontrollen – all das existiert noch nicht.

## Baue die Brücke, nicht die Insel

Wenn du heute ein Produkt entwickelst, schraube kein KI-Chat-Fenster an deine App. Mach deine App stattdessen zu einem erstklassigen MCP-Server. Stelle saubere APIs bereit, unterstütze Standard-Authentifizierung (OAuth 2.1, statt Custom Tokens) und lass die KI des Nutzers direkt mit deinen Daten kommunizieren.

Die besten Tools in der MCP-Ära werden nicht diejenigen sein, die die ausgefeilteste integrierte KI bieten. Es werden die sein, die saubere MCP-Endpunkte bereitstellen und sich nicht in den Weg stellen – genau wie NocoDB es heute schon tut, und wie Notion und Airtable es früher oder später tun müssen.

Möchtest du sehen, wie das in der Praxis aussieht? Ich habe [OAuth-2.1-MCP-Unterstützung für NocoDB](https://github.com/nocodb/nocodb/issues/13363) hinzugefügt – gemäß RFC 8414 Discovery, RFC 7591 Dynamic Client Registration, RFC 9728 Protected Resource Metadata. Wirf einen Blick auf [den Fork](https://github.com/5queezer/nocodb), verbinde Claude mit deiner eigenen NocoDB-Instanz und erlebe, wie sich die Architektur anfühlt, wenn die KI oben drauf sitzt statt darin eingeschlossen zu sein.

---

*Mehr unter [vasudev.xyz](https://vasudev.xyz).*