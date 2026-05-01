---
title: "Streaming-UI von KI-Agenten: 5 Tools bewertet"
date: 2026-04-12
lastmod: 2026-05-01
tags: ["ai", "agents", "frontend", "architecture"]
description: "AG-UI, A2UI, Vercel AI SDK, TanStack AI und Kombai setzen unterschiedliche Wetten darauf, wie Agenten Schnittstellen bauen sollten. Die architektonische Frage entscheidet, wer gewinnt."
images: ["/images/frontend-ai-agents-streaming-ui-og.png"]
author: "Christian Pojoni"
translationHash: "aa33e6eb32df7bdbfad94bbe76675c65"
chunkHashes: "369bc41754f08c49,9986d2d6e18f0fe6,2bbc871e7787de63,3fa87eb4ac66f92e,1fb95c53987e367b,f8608906d594ce51,d62c99066460a3fc,1793b237843cff7b,22b36b22535bd0fe"
---
Jeder KI‑Agent von heute kommuniziert über ein Chat‑Fenster. Der Nutzer stellt eine Frage, der Agent streamt Tokens zurück, vielleicht mit einem Code‑Block. Das gesamte Frontend ist im Grunde ein aufgemotzter Terminal‑Emulator.

Fünf Werkzeuge setzen darauf, dass Agenten echte Oberflächen anstelle von Text streamen. Sie unterscheiden sich darin, **wie** sie das tun, und bei zwei geht es nur um Details.
## Der Vergleich

| | Vercel AI SDK | TanStack AI | AG-UI | A2UI | Kombai |
|---|---|---|---|---|---|
| **Was bereitgestellt wird** | Werkzeugausgabe (RSC pausiert) | Werkzeugausgabe (Client-Rendering) | Interaktionsereignisse | Deklarative JSON-UI-Bäume | Generierter Quellcode |
| **Transport** | SSE, RSC-Streaming | SSE, HTTP-Streaming, asynchrone Iterables, RPC | SSE, bidirektionale Ereignisse | Progressive JSON-Streaming | HTTP (Batch) |
| **Framework-Bindung** | Next.js-orientiert, React zuerst | Framework-unabhängiger Kern (React, Solid, Preact) | Beliebig (Protokollebene) | Beliebig (Protokollebene) | Gibt React, Vue, HTML aus |
| **Sicherheitsmodell** | Vertrauenswürdige Ausführung | Sandgeboßter Code (Node, Workers, QuickJS) | Ereignis‑Schema‑Validierung | Whitelist‑Katalog für Komponenten | Statischer Output, kein Laufzeit‑Risiko |
| **Plattformübergreifend** | Nur Web | Web | Web | Flutter, Angular, Lit (React geplant) | Web |
| **MCP-Unterstützung** | Nativ (AI SDK 6) | Noch nicht | Indirekt über Werkzeugaufruf‑Ereignisse | k.A. | k.A. |
| **GitHub** | [Vercel/ai](https://github.com/vercel/ai) (~23K stars) | [TanStack/ai](https://github.com/tanstack/ai) (~2.6K, alpha) | [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui) (~13K stars) | [google/A2UI](https://github.com/google/A2UI) (~14K stars) | Closed source |
| **Lizenz** | Apache 2.0 | MIT | MIT | Apache 2.0 | Proprietary |
| **Wann wählen** | Du deployst auf Vercel und möchtest das AI Gateway | Du willst Portabilität und modellspezifische Typenspezifizierung | Du benötigst Agenten‑Observierbarkeit und Human‑in‑the‑Loop | Du brauchst plattformübergreifend von nicht vertrauenswürdigen Agenten | Du konvertierst Figma‑Designs zu Code |

Das ist das Dashboard. Jetzt die Meinungen.
## Vercel AI SDK: Stream die Komponente  

Vercels [AI SDK](https://github.com/vercel/ai) (~23 K GitHub‑Sterne) lässt deinen Agenten vollständige React Server Components statt Text zurückgeben. Das Modell ruft ein Tool auf, das Tool gibt JSX zurück, das Framework streamt es zum Browser. Kein WebSocket‑Boilerplate. Keine manuelle SSE‑Einrichtung. Die Komponente erscheint nach und nach, während das Modell sie generiert.

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

Hier ist, was die Tutorials auslassen: `streamUI` lebt im AI‑SDK‑RSC‑Modul, das Vercel als **experimentell** markiert und die Entwicklung im Oktober 2024 **eingestellt** hat (https://sdk.vercel.ai/docs). Der empfohlene Weg in AI SDK 6 ist AI SDK UI. Du streamst Tool‑Aufruf‑Daten oder Objekte über `useChat` und `useObject` und renderst die Komponenten dann clientseitig. Der RSC‑Ansatz funktioniert noch, aber Vercel setzt jetzt stärker auf client‑seitiges Rendering.

Das ist wichtig, weil das ursprüngliche Versprechen für `streamUI` lautete: „Stream komplette Server‑Components von deinem Agenten.“ Die aktuelle Empfehlung ist eher: „Stream strukturierte Daten, rendere lokal.“ Was, wenn man genau hinschaut, dieselbe Richtung ist, die A2UI einschlägt – nur ohne die Sicherheit auf Protokollebene.

Du setzt außerdem stark auf React und Next.js. Dein Agent sendet ausführbare Komponentenbäume im RSC‑Pfad, was volles Vertrauen zwischen Agent und Frontend bedeutet. Das ist in Ordnung für First‑Party‑Agenten. Gefahr entsteht, sobald du Tool‑Ausgaben von Drittparteien akzeptierst. Im SDK gibt es keinerlei Sandbox‑Schicht.

Was das SDK seit dem Pause‑von‑streamUI gewonnen hat, ist der Rest einer Plattform. AI SDK 6 liefert native [MCP‑Unterstützung](https://sdk.vercel.ai/docs), robuste Agenten‑Abstraktionen wie `ToolLoopAgent` und `DurableAgent` sowie optionale Integration mit dem [AI Gateway](https://vercel.com/kb/guide/vercel-ai-sdk-vs-tanstack-ai) (ein Endpunkt für 20+ Anbieter, automatischer Failover, null Markup für Teams auf Vercel). Das SDK dreht sich jetzt weniger um generative UI, sondern mehr um die Laufzeitumgebung des Agenten.

**Verwende es**, wenn du auf Vercel deployen willst und Gateway, MCP und langlebige Agenten in einem Paket benötigst. **Überspringe es**, wenn du plattformübergreifende Ausgaben brauchst oder die Kopplung an Next.js zu viel Friktion verursacht.
## TanStack AI: Same Bet, Different Priors

[TanStack AI](https://github.com/tanstack/ai) (~2,6 K Sterne, Alpha seit Januar 2026) ist dieselbe architektonische Wette wie das moderne Vercel‑SDK. Werkzeuge laufen auf dem Server, das Modell ruft sie auf, der Client rendert das Ergebnis. Der Unterschied liegt in allem, was diese Schleife umschließt.

Der Kern ist framework‑agnostisch. Ein einzelner headless `ChatClient` liefert Adapter für React, Solid und Preact. Vue und Svelte sind geplant. Es gibt keine RSC‑Story und das Team hat den Ansatz [explizit abgelehnt](https://tanstack.com/ai/latest/docs/comparison/vercel-ai-sdk). Das positioniert TanStack AI etwa dort, wo das Vercel‑SDK nach dem Pausieren von streamUI gelandet ist – nur ohne die Next.js‑Schwerkraft.

```ts
const weather = defineTool({
  schema: z.object({ city: z.string() }),
  server: async ({ city }) => getWeather(city),
  client: ({ result }) => <WeatherCard data={result} />,
})
```

Drei Dinge stechen aus der Spezifikation hervor.

Erstens, isomorphe Werkzeugdefinitionen. Ein Schema wird auf beiden Seiten validiert und die `server`‑ und `client`‑Hälften teilen sich dieses. Das Vercel‑SDK teilt dasselbe Werkzeug über zwei Dateien und verlangt, dass man sie synchron hält. Der [LogRocket‑Benchmark](https://blog.logrocket.com/tanstack-vs-vercel-ai-library-react/) misst zehn Werkzeuge mit etwa 600 Zeilen bei Vercel gegenüber 300 bei TanStack AI. Der größte Teil der Einsparungen kommt von doppeltem Code, der jetzt nicht mehr existiert.

Zweitens, per‑Modell Typ‑Einschränkung. Die Auswahl eines konkreten Modells (nicht nur eines Anbieters) ändert tatsächlich die inferierten Optionen und Antworttypen. Vercel schränkt nach Anbieter ein. Wenn dein Code je nach Modellfähigkeiten verzweigt, wird der Unterschied im Type‑Checker sichtbar.

Drittens, sandboxed Code‑Execution‑Treiber. TanStack liefert isolierte Laufzeiten für Node, Cloudflare Workers und QuickJS, sodass vom Modell generierter Code in einer abgeschlossenen VM läuft. Vercel bietet das nicht auf der SDK‑Ebene an. Die Vertrauensrechnung verschiebt sich. Du kannst Code von weniger vertrauenswürdigen Modellen akzeptieren, ohne deine eigene Sandbox zu bauen.

Was du aufgibst: MCP und die Plattform. TanStack AI hat heute keine MCP‑Integration und kein Äquivalent zu AI Gateway. Wenn du über Vercel bereitstellst, ist das Gateway allein schon Grund, dabei zu bleiben. Wenn du das nicht tust, ist das Gateway unnötiges Gewicht und die Sperre die Kosten.

Der andere Haken ist die Reife. Alpha‑Software, breaking changes zwischen Minor‑Versionen, ~2,6 K Sterne gegenüber Vercels ~23 K. Passe deine Entscheidung entsprechend an.

**Use it** wenn du ein portables, typ‑striktes SDK möchtest, das nicht von Next.js ausgeht, und du die Alpha‑Phase abwarten kannst. **Skip it** wenn du MCP, langlebige Agenten‑Abstraktionen oder das AI Gateway heute brauchst.
## AG-UI: Das Denken streamen

[AG-UI](https://github.com/ag-ui-protocol/ag-ui) (~13 K GitHub‑Sterne) verfolgt einen grundlegend anderen Ansatz. Anstatt UI‑Komponenten zu streamen, überträgt es Interaktionsereignisse: Nachrichten, Tipp‑Indikatoren, Denk‑Schritte, Werkzeug‑Aufrufe, Zustands‑Updates. Das Frontend interpretiert diese Ereignisse nach Belieben.

```
event: TEXT_MESSAGE_START
event: TOOL_CALL_START  {name: "getWeather", args: {city: "Vienna"}}
event: TOOL_CALL_END    {result: {temp: 22, condition: "sunny"}}
event: STATE_SNAPSHOT   {weather: {temp: 22}}
event: TEXT_MESSAGE_CONTENT "It's 22°C and sunny in Vienna."
```

Vom [CopilotKit](https://github.com/CopilotKit/CopilotKit)-Team entwickelt, behandelt AG-UI die Kommunikation zwischen Agent und Frontend als standardisierten Ereignis‑Bus. Dein Agent sendet typisierte Ereignisse. Dein Frontend abonniert sie und rendert sie. Das Protokoll unterstützt Sub‑Agents, sodass du beobachten kannst, wie ein Orchestrator Aufgaben delegiert und jeden Schritt für die menschliche Überprüfung streamt.

Dies ist das einzige Protokoll im Vergleich, das Debug‑Fähigkeit in den Vordergrund stellt. Du kannst jedes Ereignis inspizieren, Agent‑Entscheidungen wiedergeben und UIs bauen, die den Denkprozess neben den Ergebnissen anzeigen. Integrationen gibt es für [LangGraph](https://github.com/langchain-ai/langgraph), [CrewAI](https://github.com/crewAIInc/crewAI) und [Mastra](https://github.com/mastra-ai/mastra).

Der Kompromiss ist klar: AG-UI liefert dir Ereignisse, keine Oberflächen. Du musst jede Komponente selbst bauen. Das Protokoll sagt dir *was der Agent getan hat*. Du entscheidest *was der Nutzer sieht*.

**Verwende es**, wenn du agentenbasierte Erlebnisse entwickelst, bei denen Nutzer sehen und überschreiben müssen, was der Agent in jedem Schritt tut. **Überspringe es**, wenn du möchtest, dass der Agent die UI selbst generiert.
## A2UI: Stream die Beschreibung

[A2UI](https://github.com/google/A2UI) (~14 K GitHub‑Stars) von Google ist der ambitionierteste Eintrag. Der Agent sendet reines JSON, das einen Komponenten‑Baum beschreibt: Karten, Buttons, Textfelder, Diagramme. Kein ausführbarer Code. Der Client verwaltet einen von einer Positivliste freigegebenen Katalog vertrauenswürdiger Komponenten und weist jeden JSON‑Knoten seinem nativen Widget zu.

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

Heute existieren offizielle Renderer für Flutter, Angular und Lit. React und SwiftUI sind geplant, aber noch nicht ausgeliefert. Das architektonische Versprechen lautet: eine JSON‑Beschreibung für jede Plattform. Der Client steuert das komplette Styling, Animationen und State‑Management. Der Agent steuert nur Struktur und Daten.

Das Sicherheitsmodell ist das herausragende Merkmal. Agenten können nur Komponenten aus dem vom Client freigegebenen Katalog anfordern. Die [Schema‑Validierung](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) läuft bei jeder Nachricht. Sendet der Agent etwas außerhalb der Positivliste, wird es abgelehnt und das LLM korrigiert sich selbst. Das eliminiert UI‑Injection vollständig. Die anderen Protokolle behandeln Injection nicht auf Protokollebene.

Das progressive Streaming funktioniert gut: Der Agent startet mit einem Skelett und füllt dann Daten nach, sobald sie ankommen. In Multi‑Agent‑Systemen kann ein Orchestrator die UI‑Payloads von Sub‑Agenten [inspektieren und ändern](https://www.griddynamics.com/blog/ai-agent-for-ui-a2ui), bevor sie gerendert werden. Diese Komponierbarkeit ist einzigartig für den deklarativen Ansatz.

A2UI bleibt bewusst eng gefasst. Keine Transport‑Spezifikation, keine Auth‑Spezifikation, keine Styling‑Regeln. Es beschreibt UI‑Intentionen und nichts weiter. Es befindet sich zudem noch vor Version 1.0. Die Spezifikation entwickelt sich noch und das Ökosystem ist dünn.

**Nutze es**, wenn du plattformübergreifendes Rendering von halb‑vertrauenswürdigen oder un‑vertrauenswürdigen Agenten benötigst. **Überspringe es**, wenn du heute Produktions‑Stabilität brauchst.
## Kombai: Der Außenseiter

[​Kombai](https://www.kombai.com) gehört nicht in dieselbe Kategorie wie die anderen drei, und das ist wichtig, gleich zu Beginn zu sagen. Es ist kein Streaming‑Protokoll. Es ist ein kommerzieller KI‑Agent (VS Code‑Erweiterung + Figma‑Plugin), der Designs in Frontend‑Code für über 400 Framework‑Ziele umwandelt.

Während streamUI, AG‑UI und A2UI die Laufzeit‑Kommunikation von Agent zu Benutzer lösen, übernimmt Kombai die Code‑Generierung zur Entwicklungszeit. Gib ihm eine Figma‑Datei, ein Bild oder eine schriftliche Eingabe. Es gibt komponentenbasierten Code für React, Next.js, Svelte, Flutter, Tailwind, MUI oder welchen Stack du auch nutzt, aus. Dieser Code durchläuft deinen normalen Review‑ und Deploy‑Prozess. Kein Laufzeit‑Agent. Kein Streaming‑Protokoll. Das Produkt ist SOC 2 zertifiziert und trainiert nicht mit Kundendaten.

Ich nehme es auf, weil es eine andere Position im Spektrum einnimmt: Der Agent baut die UI zur Entwicklungszeit, nicht zur Laufzeit. Das macht Kombai ergänzend statt konkurrenzfähig. Du könntest Kombai nutzen, um den Komponenten‑Katalog zu generieren, auf den A2UI‑Agenten zur Laufzeit zugreifen. Oder es verwenden, um die React‑Komponenten zu scaffolden, die streamUI bereitstellt.

Kombai ist Closed‑Source und proprietär (Kostenlos‑Stufe mit 300 Credits/Monat, kostenpflichtig ab 20 $/Monat). Kein GitHub‑Repo für das Kernprodukt.

**Nutze es**, wenn du Figma‑Designs in Produktions‑Code umwandelst. **Überspringe es**, wenn du nach Laufzeit‑Agent‑zu‑UI‑Streaming suchst. Ein völlig anderes Problem.
## Die wirkliche Trennung

Die Vergleichstabelle ist nützlich, verbirgt aber die architektonische Frage, die wirklich zählt.

Vercels streamUI sendete **Code**. Der Agent erzeugte React‑Komponenten, der Server streamte sie. Maximale Ausdruckskraft, maximales Vertrauen erforderlich. Vercel hat diesen Weg im Oktober 2024 pausiert.

Was ihn ersetzte, sowohl in AI SDK 6 als auch in TanStack AI, ist das Streaming von **Tool‑Ausgaben**. Der Agent ruft ein typisiertes Tool auf, das Ergebnis gelangt zurück zum Client, der Client rendert. Der Agent erzeugt niemals direkt UI. Dieselbe Vertrauensannahme, kleinere Angriffsfläche. Die Teilung innerhalb dieses Camps ist Portabilität versus Plattform. TanStack lehnt Framework‑Lock‑in ab und fügt sandboxed Code Execution hinzu. Vercel behält MCP, dauerhafte Agents und das Gateway.

A2UI sendet **Daten**. Der Agent beschreibt, was er möchte, der Client entscheidet, wie gerendert wird. Maximale Sicherheit, eingeschränkte Ausdruckskraft. Das ist das Web‑Content‑Modell: Der Agent ist ein Autor, der Client ist der Browser.

AG‑UI sendet **Ereignisse**. Es sendet, was der Agent gerade tut, und das Frontend entscheidet, was gezeigt wird. Das ist das Observability‑Modell: Der Agent erledigt seine Arbeit, die UI ist ein Monitoring‑Dashboard.

Jedes Modell ist für seine Vertrauensgrenze korrekt. Erst‑Party‑Agents auf Ihrer eigenen Infrastruktur? Streamen Sie Tool‑Ausgaben über das SDK, das zu Ihrer Plattform passt. Dritt‑Party‑Agents von externen Diensten? Benötigen deklarative Daten. Komplexe Multi‑Agent‑Orchestrierung, bei der Menschen eingreifen müssen? Streamen Sie Ereignisse.

Hier ist das, was die meisten Vergleiche übersehen: AG‑UI und A2UI sind dazu gedacht, komplementär zu sein. AG‑UI definiert *wie* Agent und Frontend kommunizieren (der Transport). A2UI definiert *was* UI gerendert wird (der Inhalt). Sie könnten A2UI‑Payloads über AG‑UI‑Ereignisse laufen lassen. CopilotKit hostet bereits einen [Generative UI Playground](https://github.com/CopilotKit/generative-ui), der AG‑UI, A2UI und MCP‑Apps zusammen zeigt. Die wahre Architektur ist vielleicht nicht „eines auswählen“, sondern „sie schichten“.

Der Fehler besteht darin, ein Protokoll nach Funktionsumfang oder GitHub‑Stars zu wählen. Wählen Sie nach dem, wer den Agenten kontrolliert und wer das Risiko einer schlechten Darstellung trägt.
## Was ich ausgelassen habe

* **MCPs Beziehung zu diesen Protokollen.** MCP verbindet Agenten mit Werkzeugen. Diese Protokolle verbinden Agenten mit Nutzern. Sie sind komplementäre Schichten. Aber die Überschneidung bei AG‑UI‑„tool call“‑Ereignissen und dem „tool-generated UI“‑Muster von streamUI verdient einen eigenen Beitrag.

* **Leistungsbenchmarks.** Keines dieser Protokolle veröffentlicht Latenzvergleiche für First‑Paint‑Zeit, progressive Rendering‑Geschwindigkeit oder Ereignis‑Durchsatz unter Last. Wenn du Benchmarks erstellst, will ich die Zahlen.

* **Anthropics Ansatz.** Claudes Artefakte und das Streaming‑Tool‑Verhalten stellen ein fünftes Modell dar, bei dem die Plattform das Rendering übernimmt. Einen Vergleich wert, aber architektonisch von offenen Protokollen verschieden.

* **Die iframe‑Frage.** Chainlit, Gradio und ähnliche Frameworks lösen die Agent‑UI durch Einbetten von iframes. Das funktioniert für Isolation. Keines der vier hier vorgestellten Protokolle adressiert dieses Muster, und die Gründe sind interessant.

---

Lies die Spezifikationen und entscheide nach Vertrauensgrenze, nicht nach Hype. Wenn du auf Vercel deployst und MCP, das Gateway und dauerhafte Agenten in einer Box willst, ist das [Vercel SDK](https://sdk.vercel.ai/docs) der Weg mit dem geringsten Widerstand. Wenn du dieselbe Architektur ohne Next.js‑Schwerkraft und mit sandboxed Execution willst, ist [TanStack AI](https://tanstack.com/ai) die glaubwürdige Alternative, sobald das Alpha stabil ist. Wenn du den Agenten nicht kontrollierst, ist das Whitelist‑Modell von [A2UI](https://a2ui.org) das einzige, das Injection auf Protokollebene adressiert. Wenn du Sichtbarkeit in Multi‑Agent‑Workflows benötigst, ist [AG‑UI](https://github.com/ag-ui-protocol/ag-ui) das einzige Protokoll, das das Denken sichtbar macht.

---

*Christian Pojoni bewertet Agent‑Interface‑Protokolle. Mehr unter [vasudev.xyz](https://vasudev.xyz).*

*Das Titelbild für diesen Beitrag wurde von KI generiert.*