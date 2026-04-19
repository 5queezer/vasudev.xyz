---
title: "Streaming-UI von KI-Agenten: 4 Ansätze bewertet"
date: 2026-04-12
tags: ["ai", "agents", "frontend", "architecture"]
description: "AG-UI, A2UI, Vercel AI SDK streamUI und Kombai setzen vier verschiedene Wetten darauf, wie Agenten Oberflächen erstellen sollten. Eine Frage entscheidet, welche gewinnt."
images: ["/images/frontend-ai-agents-streaming-ui-og.png"]
author: "Christian Pojoni"
translationHash: "fc826033382bcc1c5cc5e645b9ae8a67"
chunkHashes: "58118e91cca91c36,9142427892b65d62,6a71031730590be7,3518e28c2596186a,e05335f473e3e302,f66c2c0db4067994,fb3afdb324c0836d,2f421d19f9641a44"
---
Jeder KI‑Agent spricht heute über ein Chat‑Fenster. Der Nutzer stellt eine Frage, der Agent streamt Tokens zurück, vielleicht mit einem Code‑Block. Das gesamte Frontend ist nur ein glorifiziertes Terminal‑Emulator.

Vier Projekte setzen darauf, dass Agenten reale Schnittstellen statt Text streamen. Sie sind dabei heftig verschiedener Meinung, **wie**.

**Die Protokolle spalten sich bei einer Frage: Soll der Agent ausführbaren Code, strukturierte Daten oder Interaktions‑Events senden?**

Ihre Antwort bestimmt Ihr Sicherheitsmodell, die Kopplung Ihres Frameworks und ob Ihr Agent UI für mehr als nur einen Browser‑Tab erstellen kann.
## Der Vergleich

| | Vercel AI SDK (streamUI) | AG-UI | A2UI | Kombai |
|---|---|---|---|---|
| **Was geliefert wird** | React Server Components | Interaktions‑Events | Deklarative JSON‑UI‑Bäume | Generierter Quellcode |
| **Transport** | RSC‑Streaming | SSE, bidirektionale Events | Progressives JSON‑Streaming | HTTP (Batch) |
| **Framework‑Bindung** | Next.js + React | Beliebig (Protokoll‑Ebene) | Beliebig (Protokoll‑Ebene) | Gibt React, Vue, HTML aus |
| **Sicherheitsmodell** | Vertrauenswürdige Ausführung | Ereignisschema‑Validierung | Whitelist‑Komponentenkatalog | Statischer Output, kein Laufzeit‑Risiko |
| **Cross‑Platform** | Nur Web | Web | Flutter, Angular, Lit (React geplant) | Web |
| **Agent‑Integration** | In AI‑SDK‑Tools eingebaut | LangGraph, CrewAI, CopilotKit | Beliebiger Agent via JSON | Standalone (Figma‑Eingabe) |
| **GitHub** | [Vercel/ai](https://github.com/vercel/ai) (~23K Sterne) | [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui) (~13K Sterne) | [google/A2UI](https://github.com/google/A2UI) (~14K Sterne) | Closed source |
| **Lizenz** | Apache 2.0 | MIT | Apache 2.0 | Proprietär |
| **Auswahl, wenn** | Du besitzt den Agent und das Next.js‑Frontend | Du brauchst Agent‑Beobachtbarkeit und Human‑in‑the‑Loop | Du brauchst plattformübergreifend von nicht vertrauenswürdigen Agenten | Du konvertierst Figma‑Designs zu Code |

Das ist das Dashboard. Jetzt die Meinungen.
## Vercel AI SDK: Stream the Component

Vercels [AI SDK](https://github.com/vercel/ai) (~23 K GitHub‑Stars) ermöglicht es deinem Agenten, vollständige React Server Components anstelle von Text zurückzugeben. Das Modell ruft ein Tool auf, das Tool liefert JSX, das Framework streamt es zum Browser. Keine WebSocket‑Verkabelung. Kein manuelles SSE‑Setup. Die Komponente erscheint schrittweise, während das Modell sie erzeugt.

```tsx
const result = streamUI({
  model: openai('gpt-4o'),
  prompt: 'Show a weather dashboard for Vienna',
  tools: {
    weather: {
      description: 'Get weather data for a city',
      parameters: z.object({ city: z.string() }),
      generate: async function* ({ city }) {
        yield <WeatherSkeleton />
        const data = await getWeather(city)
        return <WeatherCard data={data} />
      }
    }
  }
})
```

Hier ist, was die Tutorials weglassen: `streamUI` befindet sich im AI‑SDK‑RSC‑Modul, das Vercel **experimentell** markiert und [im Oktober 2024 die Weiterentwicklung pausiert hat](https://sdk.vercel.ai/docs). Der empfohlene Weg in AI SDK 6 ist AI SDK UI. Du streamst Tool‑Aufruf‑Daten oder Objekte über `useChat` und `useObject` und renderst die Komponenten clientseitig. Der RSC‑Ansatz funktioniert weiterhin, aber Vercel setzt stärker auf client‑seitiges Rendering.

Das ist wichtig, weil das ursprüngliche Versprechen für `streamUI` lautete: „Vollständige Server‑Components vom Agenten streamen.“ Die aktuelle Empfehlung lautet eher: „Strukturierte Daten streamen, lokal rendern.“ Was, wenn man die Augen zusammenkneift, dieselbe Richtung wie A2UI ist, nur ohne die Sicherheit auf Protokollebene.

Du bist außerdem an React und Next.js gebunden. Dein Agent sendet ausführbare Komponentenbäume. Das bedeutet volles Vertrauen zwischen Agent und Frontend. Das ist in Ordnung für firmeninterne Agenten. Gefährlich wird es, sobald du Werkzeugausgaben von Drittparteien akzeptierst. Im Protokoll gibt es keine Sandbox‑Schicht.

**Nutze es**, wenn du sowohl den Agenten als auch die Next.js‑App besitzt und den experimentellen Status akzeptierst. **Überspringe es**, wenn deine Agenten aus externen Quellen stammen oder wenn „nur Web“ eine Bedingung ist, die du nicht erfüllen kannst.
## AG-UI: Das Denken streamen

[AG-UI](https://github.com/ag-ui-protocol/ag-ui) (~13 K GitHub‑Sterne) verfolgt einen grundlegend anderen Ansatz. Anstatt UI‑Komponenten zu streamen, werden Interaktions‑Events gestreamt: Nachrichten, Tipp‑Indikatoren, Denk‑Schritte, Werkzeugaufrufe, Zustands‑Updates. Das Frontend interpretiert diese Events, wie es möchte.

```
event: TEXT_MESSAGE_START
event: TOOL_CALL_START  {name: "getWeather", args: {city: "Vienna"}}
event: TOOL_CALL_END    {result: {temp: 22, condition: "sunny"}}
event: STATE_SNAPSHOT   {weather: {temp: 22}}
event: TEXT_MESSAGE_CONTENT "It's 22°C and sunny in Vienna."
```

Von dem [CopilotKit](https://github.com/CopilotKit/CopilotKit)‑Team entwickelt, behandelt AG-UI die Agent‑Frontend‑Kommunikation als einen standardisierten Event‑Bus. Dein Agent sendet typisierte Events. Dein Frontend abonniert und rendert. Das Protokoll unterstützt Sub‑Agents, sodass du beobachten kannst, wie ein Orchestrator Arbeit delegiert und jeden Schritt für ein Human‑in‑the‑Loop‑Review streamt.

Dies ist das einzige Protokoll im Vergleich, das Debug‑barkeit in den Vordergrund stellt. Du kannst jedes Event inspizieren, Agent‑Entscheidungen wiedergeben und UIs bauen, die den Denk‑Prozess neben den Ergebnissen anzeigen. Integrationen existieren für [LangGraph](https://github.com/langchain-ai/langgraph), [CrewAI](https://github.com/crewAIInc/crewAI) und [Mastra](https://github.com/mastra-ai/mastra).

Der Kompromiss ist klar: AG-UI liefert dir Events, keine Interfaces. Du baust weiterhin jede Komponente selbst. Das Protokoll sagt dir *was der Agent getan hat*. Du entscheidest *was der Nutzer sieht*.

**Verwende es**, wenn du agentenbasierte Erlebnisse baust, bei denen Nutzer sehen und überschreiben müssen, was der Agent in jedem Schritt tut. **Überspringe es**, wenn du möchtest, dass der Agent die UI selbst erzeugt.
## A2UI: Stream the Description

[A2UI](https://github.com/google/A2UI) (~14K GitHub stars) von Google ist der ambitionierteste Eintrag. Der Agent sendet reines JSON, das einen Komponenten‑Baum beschreibt: Karten, Buttons, Textfelder, Diagramme. Kein ausführbarer Code. Der Client hält einen Whitelist‑Katalog vertrauenswürdiger Komponenten und mappt jeden JSON‑Knoten auf sein natives Widget.

```json
{
  "type": "Card",
  "children": [
    {"type": "Heading", "content": "Weather in Vienna"},
    {"type": "Chart", "chartType": "line", "data": [18, 22, 19, 24]},
    {"type": "Text", "content": "Current: 22°C, sunny"}
  ]
}
```

Heute gibt es offizielle Renderer für Flutter, Angular und Lit. React und SwiftUI sind geplant, aber noch nicht ausgeliefert. Das architektonische Versprechen ist eine JSON‑Beschreibung für jede Plattform. Der Client kontrolliert das gesamte Styling, Animationen und State‑Management. Der Agent kontrolliert nur Struktur und Daten.

Das Sicherheitsmodell ist das Highlight. Agenten können nur Komponenten aus dem vom Client genehmigten Katalog anfordern. Die [Schema‑Validierung](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) läuft bei jeder Nachricht. Wenn der Agent etwas außerhalb der Whitelist sendet, wird es abgelehnt und das LLM korrigiert sich selbst. Das eliminiert UI‑Injection vollständig. Die anderen Protokolle adressieren Injection nicht auf Protokollebene.

Das progressive Streaming funktioniert gut: Der Agent startet mit einem Gerüst und füllt dann Daten nach, sobald sie eintreffen. In Multi‑Agent‑Systemen kann ein Orchestrator [UI‑Payloads inspizieren und modifizieren](https://www.griddynamics.com/blog/ai-agent-for-ui-a2ui) von Sub‑Agenten, bevor sie gerendert werden. Diese Komponierbarkeit ist einzigartig für den deklarativen Ansatz.

A2UI bleibt bewusst eng gefasst. Keine Transport‑Spezifikation, keine Auth‑Spezifikation, keine Styling‑Regeln. Es beschreibt UI‑Intention und sonst nichts. Es befindet sich außerdem noch in einer Vor‑1.0‑Phase. Die Spezifikation entwickelt sich noch und das Ökosystem ist dünn.

**Nutze es**, wenn du plattformübergreifendes Rendering von halb‑vertrauenswürdigen oder untrusted Agenten brauchst. **Überspringe es**, wenn du heute Produktions‑Stabilität brauchst.
## Kombai: Das Seltsame Ausreißer‑Projekt

[Kombai](https://www.kombai.com) gehört nicht in dieselbe Kategorie wie die anderen drei, und das sollte man gleich zu Beginn sagen. Es ist kein Streaming‑Protokoll. Es ist ein kommerzieller KI‑Agent (VS Code‑Erweiterung + Figma‑Plugin), der Designs in Frontend‑Code für über 400 Framework‑Ziele umwandelt.

Während streamUI, AG‑UI und A2UI die Laufzeit‑Kommunikation Agent‑zu‑Benutzer lösen, löst Kombai die Code‑Generierung zur Entwicklungszeit. Gib ihm eine Figma‑Datei, ein Bild oder einen geschriebenen Prompt. Es gibt komponentenbasierten Code für React, Next.js, Svelte, Flutter, Tailwind, MUI oder welchen Stack du auch nutzt, aus. Dieser Code durchläuft deinen normalen Review‑ und Deploy‑Prozess. Kein Laufzeit‑Agent. Kein Streaming‑Protokoll. Das Produkt ist SOC 2‑zertifiziert und trainiert nicht mit Kundendaten.

Ich füge es ein, weil es eine andere Position im Spektrum einnimmt: Der Agent baut die UI zur Entwicklungszeit, nicht zur Laufzeit. Das macht Kombai ergänzend statt konkurrierend. Du könntest Kombai verwenden, um den Komponenten‑Katalog zu erzeugen, auf den A2UI‑Agents zur Laufzeit zugreifen. Oder es nutzen, um die React‑Komponenten zu scaffolden, die streamUI bereitstellt.

Kombai ist Closed‑Source und proprietär (Kostenlos‑Stufe mit 300 Credits/Monat, kostenpflichtig ab 20 USD/Monat). Kein GitHub‑Repo für das Kernprodukt.

**Verwende es**, wenn du Figma‑Designs in Produktions‑Code umwandelst. **Überspringe es**, wenn du nach Laufzeit‑Agent‑zu‑UI‑Streaming suchst. Ein völlig anderes Problem.
## Die wirkliche Trennung

Die Vergleichstabelle ist nützlich, aber sie verbirgt die architektonische Frage, die tatsächlich von Bedeutung ist.

Vercels streamUI sendet **Code**. Der Agent erzeugt React‑Komponenten. maximale Ausdrucksfähigkeit, maximales Vertrauen erforderlich. Das ist das native‑App‑Modell, angewendet auf KI: Der Agent ist der Entwickler und liefert UI zur Laufzeit.

A2UI sendet **Daten**. Der Agent beschreibt, was er möchte, und der Client entscheidet, wie es gerendert wird. maximale Sicherheit, eingeschränkte Ausdrucksfähigkeit. Das ist das Web‑Content‑Modell: Der Agent ist Autor, der Client ist der Browser.

AG‑UI sendet **Ereignisse**. Es sendet, was der Agent gerade tut, und das Frontend entscheidet, was angezeigt wird. Das ist das Beobachtungs‑Modell: Der Agent erledigt seine Arbeit, die UI ist ein Monitoring‑Dashboard.

Jedes Modell ist für seine Vertrauensgrenze korrekt. Erst‑Party‑Agenten auf Ihrer eigenen Infrastruktur? Code streamen. Dritt‑Party‑Agenten von externen Diensten? Deklarative Daten erfordern. Komplexe Multi‑Agent‑Orchestrierung, bei der Menschen eingreifen müssen? Ereignisse streamen.

Hier ist das, was die meisten Vergleiche übersehen: AG‑UI und A2UI sind dazu gedacht, sich zu ergänzen. AG‑UI definiert *wie* Agent und Frontend kommunizieren (der Transport). A2UI definiert *was* UI gerendert werden soll (der Inhalt). Sie könnten A2UI‑Payloads über AG‑UI‑Ereignisse laufen lassen. CopilotKit hostet bereits einen [Generative UI Playground](https://github.com/CopilotKit/generative-ui), der AG‑UI, A2UI und MCP‑Apps zusammen zeigt. Die wahre Architektur besteht vielleicht nicht darin, „eines auszuwählen“, sondern „sie zu schichten“.

Der Fehler besteht darin, ein Protokoll nach Feature‑Anzahl oder GitHub‑Stars auszuwählen. Wählen Sie nach dem, wer den Agenten kontrolliert und wer das Risiko eines schlechten Renderings trägt.
## Was ich weggelassen habe

* **Die Beziehung von MCP zu diesen Protokollen.** MCP verbindet Agenten mit Werkzeugen. Diese Protokolle verbinden Agenten mit Nutzern. Sie sind komplementäre Schichten. Aber die Überschneidung zwischen den „tool call“-Ereignissen von AG‑UI und dem „tool‑generated UI“-Muster von streamUI verdient einen eigenen Beitrag.

* **Leistungsbenchmarks.** Keines dieser Protokolle veröffentlicht Latenzvergleiche für First‑Paint‑Zeit, progressive Rendering‑Geschwindigkeit oder Ereignisdurchsatz unter Last. Wenn du Benchmarks durchführst, will ich die Zahlen sehen.

* **Der Ansatz von Anthropic.** Claude‑Artefakte und das Streamen von Werkzeugnutzung stellen ein fünftes Modell dar, bei dem die Plattform das Rendering übernimmt. Es lohnt sich zum Vergleich, ist aber architektonisch von offenen Protokollen verschieden.

* **Die iframe‑Frage.** Chainlit, Gradio und ähnliche Frameworks lösen die Agent‑UI, indem sie iframes einbetten. Das funktioniert zur Isolation. Keines der hier vorgestellten vier Protokolle adressiert dieses Muster, und die Gründe sind interessant.

---

Lies die Spezifikationen und entscheide nach Vertrauensgrenzen, nicht nach Hype. Wenn du beide Seiten kontrollierst, bietet dir [streamUI](https://sdk.vercel.ai/docs) das meiste mit dem geringsten Aufwand. Wenn du den Agenten nicht kontrollierst, ist das Whitelist‑Modell von [A2UI](https://a2ui.org) das einzige, das Injection auf Protokollebene adressiert. Wenn du Sichtbarkeit in Multi‑Agent‑Workflows brauchst, ist [AG-UI](https://github.com/ag-ui-protocol/ag-ui) das einzige Protokoll, das das Denken sichtbar macht.

---

*Christian Pojoni bewertet Agent‑Interface‑Protokolle. Mehr unter [vasudev.xyz](https://vasudev.xyz).*