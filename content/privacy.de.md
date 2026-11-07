---
title: "Datenschutz"
date: 2026-05-01
description: "Wie vasudev.xyz mit Website-, Kommentar- und KI-Agent-Daten umgeht."
---

Diese Website ist eine statische Hugo-Website, die auf GitHub Pages gehostet wird. Sie verwendet kein allgemeines Analyse-Skript.

## KI-Agent

Der KI-Agent auf der Website wird von einem Cloudflare Worker betrieben, der Chat-Anfragen an ein über OpenRouter gehostetes Modell sendet. Der Agent kann außerdem serverseitige Traces an Langfuse senden, damit ich Fehler untersuchen, verstehen kann, welche Seiten hilfreiche Fragen auslösen, und den Agenten verbessern kann.

Ein Trace kann deine Chat-Nachrichten, die Antwort des Agenten, die Seiten-URL, die Sprache der Website, den Chat-Modus, Zeitstempel, Modell-Metadaten, Latenz, Fehlerstatus und eine anonyme Sitzungs-ID enthalten, die im Session Storage gespeichert wird. Die Sitzungs-ID dient dazu, Nachrichten innerhalb einer Browser-Sitzung zusammenzufassen. Sie ist nicht dazu bestimmt, dich über mehrere Besuche hinweg zu identifizieren.

Bitte gib keine sensiblen personenbezogenen Daten in den Agenten ein.

Die Rechtsgrundlage ist das berechtigte Interesse am Betrieb und an der Verbesserung des Website-Agenten. Agent-Traces werden weder für Werbung verwendet noch an Dritte verkauft.

## Auftragsverarbeiter

Die Website und der Agent können folgende Dienstanbieter nutzen:

- GitHub Pages für das statische Hosting.
- Cloudflare Workers für den Agent-Endpunkt.
- OpenRouter für die Modellinferenz.
- Langfuse für die Beobachtbarkeit des Agenten.
- Giscus und GitHub für Kommentare, falls du dich für einen Kommentar entscheidest.

## Kommentare

Kommentare werden über Giscus und GitHub Discussions bereitgestellt. Wenn du kommentierst, verarbeitet GitHub die Daten deines GitHub-Kontos und den Inhalt des Kommentars gemäß den eigenen Nutzungsbedingungen und Datenschutzrichtlinien von GitHub.

## Kontakt und Löschung

Wenn du die Entfernung eines Agent-Traces oder eines kommentarbezogenen Verweises wünschst, kontaktiere mich über die Links auf der Website und gib genügend Kontext an, um die betreffende Interaktion zu finden, etwa das ungefähre Datum, die Seite und den Nachrichtentext.
