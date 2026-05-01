---
title: "Streaming-UI von KI-Agenten: 5 Tools bewertet"
date: 2026-04-12
lastmod: 2026-05-01
tags: ["ai", "agents", "frontend", "architecture"]
description: "AG-UI, A2UI, Vercel AI SDK, TanStack AI und Kombai setzen unterschiedliche Einsätze darauf, wie Agenten Schnittstellen erstellen sollten. Die architektonische Frage entscheidet, welcher gewinnt."
images: ["/images/frontend-ai-agents-streaming-ui-og.png"]
images: ["/images/frontend-ai-agents-streaming-ui-og.png"]
author: "Christian Pojoni"
translationHash: "577889fbb94bf991bc456b693780adcd"
chunkHashes: "d2382bd182079319,9986d2d6e18f0fe6,2bbc871e7787de63,3fa87eb4ac66f92e,1fb95c53987e367b,f8608906d594ce51,d62c99066460a3fc,1793b237843cff7b,22b36b22535bd0fe"
---
Jeder KI‑Agent von heute kommuniziert über ein Chat‑Fenster. Der Nutzer stellt eine Frage, der Agent streamt Token zurück, eventuell mit einem Code‑Block. Das gesamte Frontend ist im Grunde ein aufgeblasener Terminal‑Emulator.

Fünf Werkzeuge setzen darauf, dass Agenten statt Text echte Oberflächen streamen. Sie unterscheiden sich darin, **wie** sie das tun, und bei zwei davon geht es nur um Details.

**Die Protokolle gehen bei einer Frage auseinander: Soll der Agent ausführbaren Code, strukturierte Daten oder Interaktions‑Events senden?**

Ihre Antwort bestimmt Ihr Sicherheitsmodell, die Kopplung an das Framework und ob Ihr Agent UI für etwas anderes als einen Browser‑Tab erstellen kann.
## Der Vergleich

| | Vercel AI SDK | TanStack AI | AG-UI | A2UI | Kombai |
|---|---|---|---|---|---|
| **Was bereitgestellt wird** | Tool‑Ausgabe (RSC pausiert) | Tool‑Ausgabe (Client‑Render) | Interaktions‑Events | Deklarative JSON‑UI‑Bäume | Generierter Quellcode |
| **Transport** | SSE, RSC‑Streaming | SSE, HTTP‑Streaming, asynchrone Iterables, RPC | SSE, bidirektionale Events | Progressive JSON‑Streaming | HTTP (Batch) |
| **Framework‑Bindung** | Next.js‑orientiert, React zuerst | Framework‑agnostischer Kern (React, Solid, Preact) | Beliebig (Protokoll‑Ebene) | Beliebig (Protokoll‑Ebene) | Gibt React, Vue, HTML aus |
| **Sicherheitsmodell** | Trusted Execution | Sandkasten‑Code (Node, Workers, QuickJS) | Event‑Schema‑Validierung | Whitelist‑Komponentenkatalog | Statischer Output, kein Laufzeit‑Risiko |
| **Cross‑Platform** | Nur Web | Web | Web | Flutter, Angular, Lit (React geplant) | Web |
| **MCP‑Unterstützung** | Nativ (AI SDK 6) | Noch nicht | Indirekt über Tool‑Call‑Events | Nicht zutreffend | Nicht zutreffend |
| **GitHub** | [Vercel/ai](https://github.com/vercel/ai) (~23 K Sterne) | [TanStack/ai](https://github.com/tanstack/ai) (~2,6 K, Alpha) | [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui) (~13 K Sterne) | [google/A2UI](https://github.com/google/A2UI) (~14 K Sterne) | Closed source |
| **Lizenz** | Apache 2.0 | MIT | MIT | Apache 2.0 | Proprietär |
| **Wann wählen** | Du hostest auf Vercel und willst das AI‑Gateway | Du brauchst Portabilität und typische Eingrenzung pro Modell | Du benötigst Agent‑Beobachtbarkeit und Human‑in‑the‑Loop | Du brauchst plattformübergreifende Unterstützung von nicht vertrauenswürdigen Agents | Du konvertierst Figma‑Designs in Code |

Das ist das Dashboard. Jetzt die Meinungen.
## Vercel AI SDK: Stream die Komponente

Vercels [AI SDK](https://github.com/vercel/ai) (~23 K GitHub‑Stars) lässt deinen Agent komplette React Server Components statt nur Text zurückgeben. Das Modell ruft ein Tool auf, das Tool liefert JSX, das Framework streamt es zum Browser. Kein WebSocket‑Boilerplate. Keine manuelle SSE‑Einrichtung. Die Komponente erscheint schrittweise, während das Modell sie generiert.

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

Hier wird in den Tutorials übergangen: `streamUI` befindet sich im AI‑SDK‑RSC‑Modul, das Vercel **experimentell** gekennzeichnet und **im Oktober 2024 die Entwicklung eingestellt** hat (https://sdk.vercel.ai/docs). Der empfohlene Pfad in AI SDK 6 ist AI SDK UI. Du streamst Tool‑Aufruf‑Daten oder Objekte über `useChat` und `useObject` und renderst die Komponenten client‑seitig. Der RSC‑Ansatz funktioniert weiterhin, aber Vercel setzt jetzt stärker auf Client‑Side‑Rendering.

Das ist wichtig, weil das ursprüngliche Versprechen für `streamUI` lautete: „Stream komplette Server‑Components von deinem Agenten.“ Die aktuelle Empfehlung lautet eher: „Stream strukturierte Daten, render lokal.“ Was, wenn man die Augen zusammenkneift, dieselbe Richtung ist, in die A2UI geht – nur ohne die Sicherheit auf Protokollebene.

Du setzt außerdem stark auf React und Next.js. Dein Agent sendet ausführbare Komponentenbäume im RSC‑Pfad, was volles Vertrauen zwischen Agent und Frontend bedeutet. Das ist in Ordnung für First‑Party‑Agenten, aber gefährlich, sobald du Tool‑Ausgaben von Dritt‑Anbietern akzeptierst. Im SDK gibt es keine Sandbox‑Schicht.

Was das SDK seit der Pause von streamUI gewonnen hat, ist der Rest einer Plattform. AI SDK 6 liefert native [MCP‑Unterstützung](https://sdk.vercel.ai/docs), dauerhafte Agenten‑Abstraktionen wie `ToolLoopAgent` und `DurableAgent` sowie optionale Integration mit dem [AI Gateway](https://vercel.com/kb/guide/vercel-ai-sdk-vs-tanstack-ai) (ein Endpunkt für 20+ Provider, automatischer Failover, null Markup für Teams auf Vercel). Das SDK dreht sich jetzt weniger um generative UI, sondern mehr um die Laufzeit des Agenten darum herum.

**Nutze es**, wenn du auf Vercel deployst und Gateway, MCP und dauerhafte Agenten in einem Paket willst. **Überspringe es**, wenn du plattformübergreifende Ausgaben brauchst oder die Bindung an Next.js zu viel Reibung erzeugt, die du nicht bezahlen kannst.
## TanStack AI: Same Bet, Different Priors

[TanStack AI](https://github.com/tanstack/ai) (~2,6 K Sterne, Alpha seit Januar 2026) ist dieselbe architektonische Wette wie das moderne Vercel‑SDK. Werkzeuge laufen auf dem Server, das Modell ruft sie auf, der Client rendert das Ergebnis. Der Unterschied liegt in allem, was diese Schleife umschließt.

Der Kern ist framework‑agnostisch. Ein einziger headless `ChatClient` liefert Adapter für React, Solid und Preact. Vue und Svelte sind geplant. Es gibt keine RSC‑Story und das Team hat diesen Weg **explizit abgelehnt**(https://tanstack.com/ai/latest/docs/comparison/vercel-ai-sdk). Das positioniert TanStack AI etwa dort, wo das Vercel‑SDK nach dem Pausieren von streamUI gelandet ist – nur ohne die Next.js‑Schwerkraft.

```ts
const weather = defineTool({
  schema: z.object({ city: z.string() }),
  server: async ({ city }) => getWeather(city),
  client: ({ result }) => <WeatherCard data={result} />,
})
```

Drei Dinge stechen aus der Spezifikation hervor.

Erstens: isomorphe Werkzeugdefinitionen. Ein Schema wird auf beiden Seiten validiert und die Hälften `server` und `client` teilen es sich. Das Vercel‑SDK verteilt dasselbe Werkzeug über zwei Dateien und verlangt, dass man sie synchron hält. Der [LogRocket‑Benchmark](https://blog.logrocket.com/tanstack-vs-vercel-ai-library-react/) misst etwa 600 Zeilen für zehn Werkzeuge bei Vercel gegenüber 300 bei TanStack AI. Der größte Teil der Einsparungen stammt aus der Wegfallenden Duplizierung.

Zweitens: Modellspezifische Typ‑Einschränkungen. Die Auswahl eines konkreten Modells (nicht nur eines Anbieters) ändert tatsächlich die inferierten Optionen und Antworttypen. Vercel schränkt nach Anbieter ein. Wenn dein Code nach Modellfähigkeiten verzweigt, wird der Unterschied im Type‑Checker sichtbar.

Drittens: sandboxed Code‑Execution‑Treiber. TanStack liefert isolierte Runtime‑Umgebungen für Node, Cloudflare Workers und QuickJS, sodass modellgenerierter Code in einer abgeschlossenen VM läuft. Vercel stellt dies nicht auf SDK‑Ebene bereit. Der Vertrauens‑Kalkül verschiebt sich. Du kannst Code von weniger vertrauenswürdigen Modellen akzeptieren, ohne deine eigene Sandbox zu bauen.

Was du aufgibst: MCP und die Plattform. TanStack AI hat heute keine MCP‑Integration und kein AI‑Gateway‑Äquivalent. Wenn du über Vercel bereitstellst, ist das Gateway allein schon Grund, dabei zu bleiben. Wenn nicht, ist das Gateway Ballast und die Sperre die Kosten.

Der andere Haken ist die Reife. Alpha‑Software, breaking changes zwischen Minor‑Versionen, ~2,6 K Sterne gegenüber Vercels ~23 K. Adoptiere dementsprechend.

**Use it** wenn du ein portables, typ‑striktes SDK willst, das nicht Next.js voraussetzt, und du das Alpha‑stadium abwarten kannst. **Skip it** wenn du heute MCP, langlebige Agent‑Abstraktionen oder das AI‑Gateway brauchst.
## AG-UI: Den Denkprozess streamen

[AG-UI](https://github.com/ag-ui-protocol/ag-ui) (~13 K GitHub‑Sterne) verfolgt einen grundlegend anderen Ansatz. Anstatt UI‑Komponenten zu streamen, überträgt es Interaktionsereignisse: Nachrichten, Tipp‑Indikatoren, Denkschritte, Tool‑Aufrufe, Zustands‑Updates. Das Front‑End interpretiert diese Ereignisse nach Belieben.

```
event: TEXT_MESSAGE_START
event: TOOL_CALL_START  {name: "getWeather", args: {city: "Vienna"}}
event: TOOL_CALL_END    {result: {temp: 22, condition: "sunny"}}
event: STATE_SNAPSHOT   {weather: {temp: 22}}
event: TEXT_MESSAGE_CONTENT "It's 22°C and sunny in Vienna."
```

Entwickelt vom [CopilotKit](https://github.com/CopilotKit/CopilotKit)-Team, behandelt AG-UI die Kommunikation zwischen Agent und Front‑End als standardisierten Event‑Bus. Dein Agent sendet typisierte Ereignisse. Dein Front‑End abonniert und rendert. Das Protokoll unterstützt Sub‑Agenten, sodass du beobachten kannst, wie ein Orchestrator Aufgaben delegiert, und jeden Schritt für die menschliche Nachbearbeitung streamen kannst.

Dies ist das einzige Protokoll im Vergleich, das Debug‑Fähigkeit in den Vordergrund stellt. Du kannst jedes Ereignis inspizieren, Agent‑Entscheidungen wiedergeben und UIs bauen, die den Denkprozess neben den Ergebnissen anzeigen. Integrationen existieren für [LangGraph](https://github.com/langchain-ai/langgraph), [CrewAI](https://github.com/crewAIInc/crewAI) und [Mastra](https://github.com/mastra-ai/mastra).

Der Kompromiss ist klar: AG-UI liefert Ereignisse, keine Oberflächen. Du musst jede Komponente selbst bauen. Das Protokoll sagt dir *was der Agent getan hat*. Du entscheidest *was der Nutzer sieht*.

**Verwende es**, wenn du agentische Erlebnisse schaffst, bei denen Nutzer sehen und überschreiben müssen, was der Agent in jedem Schritt macht. **Überspringe es**, wenn du willst, dass der Agent die UI selbst generiert.
## A2UI: Stream die Beschreibung

[A2UI](https://github.com/google/A2UI) (~14 K GitHub‑Stars) von Google ist der ambitionierteste Eintrag. Der Agent sendet reines JSON, das einen Komponenten‑Baum beschreibt: Karten, Buttons, Textfelder, Diagramme. Kein ausführbarer Code. Der Client hält einen freigegebenen Katalog vertrauenswürdiger Komponenten und ordnet jedem JSON‑Knoten sein natives Widget zu.

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

Heute existieren offizielle Renderer für Flutter, Angular und Lit. React und SwiftUI sind geplant, aber noch nicht veröffentlicht. Das architektonische Versprechen ist eine JSON‑Beschreibung für jede Plattform. Der Client steuert das gesamte Styling, die Animationen und das Zustandsmanagement. Der Agent steuert nur Struktur und Daten.

Das Sicherheitsmodell ist das Highlight. Agenten können nur Komponenten aus dem vom Client genehmigten Katalog anfordern. Die [Schema‑Validierung](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) läuft bei jeder Nachricht. Sendet der Agent etwas außerhalb der Whitelist, wird es abgelehnt und das LLM korrigiert sich selbst. Das eliminiert UI‑Injection vollständig. Die anderen Protokolle behandeln Injection nicht auf Protokollebene.

Das progressive Streaming funktioniert gut: Der Agent beginnt mit einem Gerüst und füllt dann Daten nach, sobald sie eintreffen. In Multi‑Agent‑Systemen kann ein Orchestrator [UI‑Payloads inspizieren und modifizieren](https://www.griddynamics.com/blog/ai-agent-for-ui-a2ui) von Sub‑Agenten, bevor sie gerendert werden. Diese Komponierbarkeit ist einzigartig für den deklarativen Ansatz.

A2UI bleibt bewusst eng gefasst. Kein Transport‑Spec, keine Auth‑Spec, keine Styling‑Regeln. Es beschreibt UI‑Absichten und sonst nichts. Es ist zudem noch vor Version 1.0. Der Spec ist noch in Entwicklung und das Ökosystem dünn.

**Nutze es**, wenn du plattformübergreifendes Rendering von halb‑vertrauenswürdigen oder untrusted Agenten brauchst. **Überspring es**, wenn du heute Produktions‑Stabilität benötigst.
## Kombai: Das Außenseiter‑Produkt

[Kombai](https://www.kombai.com) gehört nicht in dieselbe Kategorie wie die anderen drei, und das sollte gleich zu Beginn gesagt werden. Es ist kein Streaming‑Protokoll. Es ist ein kommerzieller KI‑Agent (VS Code‑Erweiterung + Figma‑Plugin), der Designs in Frontend‑Code für über 400 Framework‑Ziele umwandelt.

Während streamUI, AG‑UI und A2UI die Laufzeit‑Kommunikation Agent‑zu‑Benutzer lösen, löst Kombai die Code‑Generierung zur Entwicklungszeit. Gib ihm eine Figma‑Datei, ein Bild oder einen geschriebenen Prompt. Es erzeugt komponentenbasierten Code für React, Next.js, Svelte, Flutter, Tailwind, MUI oder was immer dein Stack verwendet. Dieser Code geht durch deinen normalen Review‑ und Deploy‑Prozess. Kein Laufzeit‑Agent. Kein Streaming‑Protokoll. Das Produkt ist SOC 2‑zertifiziert und trainiert nicht mit Kundendaten.

Ich nehme es auf, weil es eine andere Position im Spektrum einnimmt: Der Agent baut die UI zur Entwicklungszeit, nicht zur Laufzeit. Das macht Kombai ergänzend statt konkurrierend. Du könntest Kombai nutzen, um den Komponenten‑Katalog zu erzeugen, den A2UI‑Agenten zur Laufzeit referenzieren. Oder es verwenden, um die React‑Komponenten zu erzeugen, die streamUI bereitstellt.

Kombai ist Closed‑Source und proprietär (kostenloser Tier mit 300 Credits/Monat, kostenpflichtig ab 20 $/Monat). Kein GitHub‑Repo für das Kernprodukt.

**Verwende es**, wenn du Figma‑Designs in produktiven Code umwandelst. **Überspringe es**, wenn du nach Laufzeit‑Agent‑zu‑UI‑Streaming suchst. Ein völlig anderes Problem.
## Die wahre Trennung

Die Vergleichstabelle ist nützlich, verbirgt aber die architektonische Frage, die wirklich zählt.

Vercels streamUI sendete **Code**. Der Agent erzeugte React‑Komponenten, der Server streamte sie. Maximale Ausdrucksfähigkeit, maximales Vertrauen erforderlich. Vercel stellte diesen Weg im Oktober 2024 ein.

Was ihn ersetzte, sowohl in AI SDK 6 als auch in TanStack AI, ist das Streamen von **Tool‑Ausgaben**. Der Agent ruft ein typisiertes Tool auf, das Ergebnis wird an den Client zurückgeliefert, der Client rendert. Der Agent erzeugt nie direkt UI. Derselbe Vertrauensannahme, kleinere Angriffsfläche. Die Aufteilung in diesem Lager ist Portabilität versus Plattform. TanStack lehnt Framework‑Lock‑In ab und fügt sandboxed Code‑Ausführung hinzu. Vercel behält MCP, dauerhafte Agents und das Gateway.

A2UI sendet **Daten**. Der Agent beschreibt, was er möchte, der Client entscheidet, wie gerendert wird. Maximale Sicherheit, eingeschränkte Ausdrucksfähigkeit. Das ist das Web‑Content‑Modell: Der Agent ist ein Autor, der Client ist der Browser.

AG‑UI sendet **Ereignisse**. Es sendet, was der Agent gerade tut, und das Frontend entscheidet, was angezeigt wird. Das ist das Observability‑Modell: Der Agent erledigt seine Arbeit, die UI ist ein Überwachungs‑Dashboard.

Jedes Modell ist korrekt für seine Vertrauensgrenze. Erst‑Party‑Agents auf Ihrer eigenen Infrastruktur? Streamen Sie Tool‑Ausgaben über das SDK, das zu Ihrer Plattform passt. Dritt‑Party‑Agents von externen Diensten? Benötigen deklarative Daten. Komplexe Multi‑Agent‑Orchestrierung, bei der Menschen eingreifen müssen? Streamen Sie Ereignisse.

Hier ist das, was die meisten Vergleiche übersehen: AG‑UI und A2UI sind dafür gedacht, sich zu ergänzen. AG‑UI definiert *wie* Agent und Frontend kommunizieren (den Transport). A2UI definiert *was* UI gerendert werden soll (den Inhalt). Sie könnten A2UI‑Payloads über AG‑UI‑Ereignisse laufen lassen. CopilotKit hostet bereits einen [Generative UI Playground](https://github.com/CopilotKit/generative-ui), der AG‑UI, A2UI und MCP‑Apps zusammen zeigt. Die wirkliche Architektur könnte also nicht „Entscheide dich für eins“ sein, sondern „Schichte sie übereinander“.

Der Fehler besteht darin, ein Protokoll nach Funktionsumfang oder GitHub‑Stars zu wählen. Wählen Sie nach dem, wer den Agenten kontrolliert und wer das Risiko eines fehlerhaften Renderns trägt.
## Was ich weggelassen habe

* **MCPs Beziehung zu diesen Protokollen.** MCP verbindet Agenten mit Werkzeugen. Diese Protokolle verbinden Agenten mit Nutzern. Sie sind komplementäre Schichten. Aber die Überschneidung der „tool call“-Ereignisse von AG‑UI und des „tool-generated UI“-Musters von streamUI verdient einen eigenen Beitrag.

* **Leistungsbenchmarks.** Keines dieser Protokolle veröffentlicht Latenzvergleiche für die First‑Paint‑Zeit, progressive Rendergeschwindigkeit oder Ereignisdurchsatz unter Last. Wenn du Benchmarks durchführst, will ich die Zahlen sehen.

* **Anthropics Ansatz.** Claudes Artefakte und das Streaming‑Tool‑Use stellen ein fünftes Modell dar, bei dem die Plattform das Rendering übernimmt. Einen Vergleich wert, aber architektonisch von offenen Protokollen verschieden.

* **Die iframe‑Frage.** Chainlit, Gradio und ähnliche Frameworks lösen die Agent‑UI, indem sie iframes einbetten. Das funktioniert zur Isolation. Keines der vier hier vorgestellten Protokolle adressiert dieses Muster, und die Gründe dafür sind interessant.

---

Lies die Spezifikationen und entscheide nach Vertrauensgrenzen, nicht nach Hype. Wenn du auf Vercel deployen willst und MCP, das Gateway und dauerhafte Agenten in einem Paket möchtest, ist das [Vercel SDK](https://sdk.vercel.ai/docs) der Weg mit dem geringsten Widerstand. Wenn du dieselbe Architektur ohne Next.js‑Einbindung und mit sandboxed Execution willst, ist [TanStack AI](https://tanstack.com/ai) die glaubwürdige Alternative, sobald das Alpha stabil ist. Wenn du den Agenten nicht kontrollierst, ist das Whitelist‑Modell von [A2UI](https://a2ui.org) das einzige, das Injection auf Protokollebene adressiert. Wenn du Einblick in Multi‑Agent‑Workflows brauchst, ist [AG‑UI](https://github.com/ag-ui-protocol/ag-ui) das einzige Protokoll, das das Denken sichtbar macht.

---

*Christian Pojoni bewertet Agent‑Interface‑Protokolle. Mehr unter [vasudev.xyz](https://vasudev.xyz).*

*Das Titelbild für diesen Beitrag wurde von KI generiert.*