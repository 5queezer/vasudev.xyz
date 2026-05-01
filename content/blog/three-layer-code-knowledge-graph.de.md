---
title: "Ihr Code Knowledge Graph benötigt vier Ebenen, nicht nur eine"
date: 2026-05-01
tags: ["agents", "ai", "architecture"]
description: "Der Speicher sollte ein Graph sein. Der Graph sollte vier Ebenen haben. Die mittlere Ebene trägt die Navigation. Die oberste Ebene wandelt die Navigation in Aktion um."
images: ["/images/three-layer-code-knowledge-graph-og.png"]
translationHash: "0e623b3b9bf9e2e72ecea70ec245d769"
chunkHashes: "9e6944bc5d80e730,ec5547e06414e078,21030a3bc5a894ce,bf8304f9abff75b0,90c4a0ab21256886,788dd5224f820a57,2886fbcd5acc9517,d713ecba99fef97b,44df79228b76677f,047ffe07cf5f897b,40fb162a3d5dd183"
---
Andrej Karpathy machte das Argument in einem Beitrag: Speicher ist eine Struktur, in der du lebst, nicht ein Cache, den du bei jeder Eingabe auffüllst. Achtundvierzig Stunden später veröffentlichte Safi Shamsi [Graphify](https://github.com/safishamsi/graphify) und schrieb *The Memory Layer* darum herum. Die These lautet, dass ein KI‑Agent einen Wissensgraphen durchlaufen sollte, anstatt einen Vektor‑Index zu durchsuchen, weil Beziehungen im Weißraum zwischen den Chunks liegen und ein Vektor‑Store sie nicht erkennen kann.

Ich stimme der These zu. Ich denke, das Buch bleibt eine Ebene zu kurz. Dann habe ich das gepostet und sofort bemerkt, dass es zwei Ebenen zu kurz bleibt.

Ich habe letzte Woche einen Graphify‑Graphen für den Code‑Base eines Coding‑Agents erzeugt. Die erste Version war das Offensichtliche. Knoten waren Dateien, Klassen, Funktionen, Methoden. Kanten waren `imports`, `calls`, `contains`, `method`. In Obsidian geöffnet, sah es aus wie ein Haarball. Ich clusterte ihn in Communities und benannte jede mit einem Konzeptnamen. Besser. Aber die Kanten zeigten immer noch Dinge wie `calls×32 / method×7 / contains×11`. Nützlich als Beleg. Nicht nützlich als Karte. Dann schrieb ich die Kanten als menschliche Beziehungsphrasen um: „steuert und beobachtet Unterhaltungen“, „liefert Anmeldeinformationen an“, „rendert Markdown mit“. Plötzlich las sich der Graph wie ein Satz. Plötzlich konnte ein LLM sich darauf orientieren.

Das gab mir drei Ebenen. Dann versuchte ich, sie bei einer echten Aufgabe („einen neuen Modell‑Provider zu diesem CLI hinzufügen“) zu verwenden und stellte fest, dass ich eine vierte Ebene brauchte.

**Ein Code‑Wissensgraph für einen LLM‑Agent sollte vier Ebenen haben. Ebene zwei übernimmt die Navigation. Ebene vier erledigt die Arbeit.**
## Wie das tatsächlich aussieht

Nehmen wir eine reale Subsystemgrenze in einer Coding‑Agent‑Runtime. Die interaktive Terminal‑UI spricht mit dem Lebenszyklus der Agent‑Session. Das ist ein echter architektonischer Fakt. Es gibt jetzt vier verschiedene Arten, sie zu beschreiben.

Layer one ist der rohe Implementierungsgraph:

```text
InteractiveSession.handleInput  --calls-->  AgentSession.send
InteractiveSession              --imports-->  AgentSession
InteractiveSession.render       --calls-->  AgentSession.events.subscribe
... 38 more edges between these two modules
```

Layer two fasst Dateien und Symbole zu Communities zusammen und aggregiert die Kanten:

```text
Interactive Session Orchestration  --calls×32 / imports×9 / contains×7-->  Agent Session Lifecycle
```

Layer three formuliert das Prädikat als menschlichen Satz, wobei die rohen Zählungen als Beleg darunter erhalten bleiben:

```text
Interactive Session Orchestration  --drives and observes conversations-->  Agent Session Lifecycle
```

Layer four ist keiner dieser Fälle. Layer four ist ein Playbook, das einem Task zugeordnet ist:

```text
Playbook: "Add a new model provider"
  intent:           wire a new LLM provider into the CLI
  involved concepts: Provider Auth, Model Registry, CLI Login
  key files:        model-resolver.ts, provider-display-names.ts, args.ts
  validation:       npm run check, then a manual login round-trip
  common pitfalls:  forgot to register the display name, env var fallback order
```

Dasselbe System. Vier verschiedene Rahmungen. Keine von ihnen ist allein die richtige Antwort, und nur das vierte sagt dem Agenten, was er tatsächlich tun soll.
## Warum Ebene Eins allein scheitert

Der rohe Graph ist korrekt und nutzlos. Ein mittelgroßes Repository hat Zehntausende von Knoten und Hunderttausende von Kanten. Öffnet man ihn in einem beliebigen Graph‑Viewer, bekommt man einen schwarzen Ball ohne Informationen. Gibt man ihn einem LLM, sprengt man das Kontextfenster, bevor der Agent die Möglichkeit hat zu reasoning.

Shamsi untermauert diesen Punkt mit einer klaren Zahl. In Kapitel 6 von *The Memory Layer* komprimiert Graphify einen etwa fünf‑Million‑Token‑Code‑Base auf rund einhundertsechsundsiebzig tausend Token von Knoten, Kanten und Community‑Zusammenfassungen. Das entspricht einer 28‑fachen Kompression. Das ist auch der Grund, warum Ebene 1 allein nicht der Einstiegspunkt sein kann. Der ganze Reiz beim Aufbau des Graphen besteht darin, dass man aufhört, Text zu senden, und beginnt, Topologie zu senden. Wenn man dann die Topologie wieder edge‑by‑edge an das Modell zurückgibt, hat man den Datei‑Baum nur etwas strukturierter gemacht und nennt es Fortschritt.

Der rohe Graph ist zudem für das, was ein Agent tatsächlich tut, fehlkalibriert. Ein Agent will nicht wissen, dass `formatTimestamp` `padStart` aufruft. Er will wissen, dass der Export‑Viewer Markdown mit einem vendierten Parser rendert, weil das bestimmt, welche Datei bearbeitet werden muss, wenn der Nutzer einen Rendering‑Fehler meldet.

Du brauchst dennoch Ebene 1. Sie ist die einzige Schicht, die es dir ermöglicht, von einem Konzept zurück zu einer genauen Datei und Zeile zu gelangen. Aber sie kann nicht der Einstiegspunkt sein.
## Warum Layer Drei Allein Versagt

Der entgegengesetzte Fehler ist verführerischer. Sobald Sie menschliche Prädikate wie „steuert und beobachtet Unterhaltungen“ haben, liest sich das Diagramm wie Prosa. Es wirkt wie die richtige Abstraktion für ein LLM, weil LLMs gut mit Prosa umgehen können.

Das Problem ist, dass menschliche Prädikate interpretativ sind. Sie stellen eine redaktionelle Ebene über den Beweisen dar. Wenn Sie sie als Tatsachen ansehen, plant der Agent auf Basis von Formulierungen, die seit dem letzten Refactoring möglicherweise falsch waren, und es gibt keinen einfachen Weg, den Drift zu erkennen. Das LLM wird selbstbewusst sagen „der Export‑Viewer rendert Markdown mit dem eingebundenen Parser“, selbst nachdem jemand den Parser ausgetauscht hat, weil das menschliche Label nicht neu generiert wurde.

Shamsi antizipiert den Fehlermodus und gibt Graphify die richtige Verteidigung auf Kantenebene. Jede Kante trägt eines von drei Provenienz‑Tags: `EXTRACTED` (im AST beobachtet), `INFERRED` (logisch impliziert mit einem Konfidenz‑Score) und `AMBIGUOUS` (widersprüchliche Evidenz, markiert zur menschlichen Überprüfung). Der Konfidenzwert multipliziert sich entlang eines Pfades, sodass eine zweistufige inferierte Kette mit 0,9 und 0,8 auf 0,72 zusammenfällt und einem Agenten mitgeteilt werden kann, er solle alles unter einem Schwellenwert ablehnen. Diese Verteidigung ist korrekt. Sie ist jedoch auf der falschen Granularität definiert, wenn Sie Navigation wollen. Ein Konfidenz‑Score auf einer einzelnen Kante sagt Ihnen, ob Sie dieser Tatsache vertrauen sollen. Er sagt nicht, welches Subsystem Sie zuerst betrachten sollten.

Der Ausdruck muss ein Hyperlink sein, kein Fakt. Jeder menschliche Prädikat muss zurück zu den aggregierten rohen Kanten führen, die es begründen. Wenn sich diese rohen Kanten verschieben, ist der Ausdruck verdächtig.
## Die Ebene, die Navigation trägt

Ebene zwei ist die unglamouröse. Gemeinschaften von Dateien, die durch aggregierte typisierte Kanten zusammengehalten werden. Kein Fließtext, keine handkuratierte Sprache, nur strukturelle Cluster mit Zählungen an den Kanten zwischen ihnen.

Das ist, worauf ein LLM‑Agent zuerst schließen sollte, wenn er etwas finden muss.

Der Grund ist die Reduzierung des Suchraums. Ein Repository enthält Hunderte von Dateien. Ein Subsystem‑Graph hat ein paar Dutzend Gemeinschaften. Wenn der Benutzer sagt „behebe den Bug, bei dem das Bash‑Tool veraltete Ausgabe druckt“, sollte der Agent nicht Schlüsselwortsuche im gesamten Baum durchführen. Er sollte sich den Gemeinschafts‑Graphen ansehen, „Bash Execution Interface“ und „Interactive Session Orchestration“ finden, notieren, zu welchen anderen Gemeinschaften sie Brücken schlagen, und dann in Ebene eins für die genaue Datei absteigen. Das sind zwei Graph‑Sprünge statt tausender Grep‑Treffer.

Die aggregierten Kantenzählungen kodieren außerdem etwas, das der Roh‑Graph verbirgt. Wenn zwei Gemeinschaften verbunden sind durch `calls×32 / imports×9 / events×4`, ist das eine enge Kopplung und jede Änderung an der einen wird wahrscheinlich die andere berühren. Wenn sie verbunden sind durch `contains×1`, kennen sie einander kaum. Zählungen sind das günstigste Impact‑Analyse‑Signal, das du hast.

Aber Ebene zwei beantwortet nur „wo soll ich schauen?“. Sie beantwortet nicht „was mache ich, sobald ich dort bin?“. Das ist die Lücke, die Ebene vier schließt.
## Ebene Vier: Von der Navigation zur Aktion

Ebene vier ist das operative Playbook. Ein Knoten in dieser Ebene ist kein Konzept wie „Authentifizierung“. Es ist eine Aufgabe: „Authentifizierungs‑Flow des Anbieters hinzufügen oder ändern.“ Der Knoten enthält das, was ein Agent tatsächlich zum Handeln braucht, nicht das, was er verstehen muss.

Ein nützlicher Ebene‑4‑Knoten hat sechs Felder:

- **Absicht.** Was der Benutzer zu erreichen versucht, in seinen eigenen Worten.
- **Beteiligte Konzepte.** Verweise auf Ebene 3 (Provider‑Auth, Model‑Registry usw.).
- **Schlüsseldateien.** Verweise auf Ebene 1 (args.ts, model‑resolver.ts).
- **Validierungsschritte.** Die genauen Befehle oder Tests, die beweisen, dass die Änderung funktioniert.
- **Übliche Fallstricke.** Was bei früheren Versuchen dieser Aufgabe schiefgelaufen ist.
- **Rollback‑Risiken.** Was kaputtgeht, wenn diese Änderung nur halb rückgängig gemacht wird.

Konkrete Beispiele aus einem Code‑Agent‑Code‑Base:

```text
Playbook: "Add a new model provider"
  concepts:    Provider Auth, Model Registry, CLI Login, Docs
  files:       model-resolver.ts, provider-display-names.ts, args.ts, docs/
  validation:  npm run check, then login round-trip
  pitfalls:    forgetting to register the display name; env var fallback order
  rollback:    safe (additive); leftover registry entries are harmless

Playbook: "Fix a TUI rendering bug"
  concepts:    Interactive Session Orchestration, TUI Components, Footer Status
  files:       <component>.tsx, key bindings file, render entry point
  validation:  targeted component test, optional tmux harness for visual check
  pitfalls:    stale component state surviving a hot reload; async render races
  rollback:    safe; UI-only

Playbook: "Change a built-in tool's behavior"
  concepts:    Runtime Tools, Agent Session Lifecycle, Tool Rendering
  files:       tool definition, runtime binding, UI render component
  validation:  unit test for the tool, regression test for the rendering
  pitfalls:    tool schema drift breaks transcripts; UI assumes old shape
  rollback:    risky; old transcripts may not replay cleanly
```

Lies das und merke, was es nicht ist. Es sind keine Architekturskizzen. Es sind keine Zusammenfassungen. Es sind keine Abruf‑Anker. Es sind kurze, pointierte, wiederholbare Verfahren, die „der Benutzer hat X gefragt“ in „sieh dir Y an, ändere Z, prüfe mit W“ übersetzen.

Ebene drei sagt dem Agenten, was das System bedeutet. Ebene vier sagt dem Agenten, was im System zu tun ist. Der Agent liest Ebene vier zuerst, wenn die Aufgabe konkret ist, arbeitet sich durch die Ebenen drei, zwei und eins, um zu prüfen, und greift dann erst auf den Quellcode zu. Wenn die Aufgabe explorativ ist und noch kein Playbook existiert, überspringt der Agent Ebene vier und beginnt bei Ebene drei. Beide Lese‑Reihenfolgen sind gültig. Wichtig ist, dass Ebene vier für wiederkehrende Aufgaben existiert, weil dort Agenten die meisten Tokens verschwenden, indem sie denselben Plan neu erfinden.

Das ist zudem die Ebene mit dem größten Nutzen‑zu‑Aufwand‑Verhältnis beim Schreiben. Eine Handvoll gut geschriebener Playbooks für die häufigsten Änderungen in deinem Code‑Base steigert die Agenten‑Durchsatzrate mehr als jede andere Wissensinves­tition. Agenten hören auf, jede Woche dieselben fünf Dateien für dieselben fünf Aufgaben neu zu entdecken. Sie verpassen nicht mehr den Test, der dieselbe Regression jedes Mal fängt. Sie vergessen nicht mehr den Fallstrick, der die letzten drei Versuche zum Scheitern brachte.
## Der Arbeitsablauf, den das impliziert

Die vier Ebenen sind keine Alternativen. Sie bilden eine Pipeline mit zwei gültigen Einstiegspunkten.

```text
Layer 4 (operational playbook)
  agent matches the task to a known recipe
    "the user wants to add a new model provider"
       playbook: "Add a new model provider"
         (or: no playbook exists, fall through to layer 3)

Layer 3 (human ontology)
  agent reads the map for the involved concepts
    "Provider Auth, Model Registry, CLI Login"

Layer 2 (community graph)
  agent identifies the relevant subsystem and its bridges
    "Auth and Credentials cluster, bridged to CLI Startup"

Layer 1 (raw graph)
  agent finds the exact file and function
    "args.ts:parseLoginArgs(), model-resolver.ts:resolveProvider()"

Source code
  agent reads, edits, runs the playbook's validation step
```

Jede Ebene beantwortet eine andere Frage. Ebene vier beantwortet **„Was soll ich tun?“** Ebene drei beantwortet **„Was ist das und warum existiert es?“** Ebene zwei beantwortet **„Wo befindet sich das und was berührt es?“** Ebene eins beantwortet **„Welches präzise Symbol muss ich ändern?“** Sie können nicht zusammengefasst werden, weil sich die Fragestellung bei jedem Schritt ändert.
## Wo das in der Literatur steht

Drei Literaturen konvergieren auf diese Form und sprechen meist nicht miteinander.

Die erste ist Programmanalyse. Der [Code Property Graph](https://de.wikipedia.org/wiki/Code_property_graph), eingeführt von Yamaguchi et al. in ihrem IEEE S&P‑Papier von 2014 „Modeling and Discovering Vulnerabilities with Code Property Graphs“ (das 2024 den IEEE Test‑of‑Time Award gewann), fasst bereits drei klassische Darstellungen zu einer Struktur zusammen: den abstrakten Syntaxbaum, den Kontrollflussgraphen und den Program Dependence Graph. Der ursprüngliche Anwendungsfall war die Entdeckung von Schwachstellen, aber die Lehre lässt sich verallgemeinern. Eine einzelne Darstellung kann nicht alle Fragen beantworten, die Sie zu Code haben, also kombinieren Sie Darstellungen und lassen die Abfrage die passende Teilmenge auswählen. Das ist Schicht 1 gut umgesetzt, und das seit über einem Jahrzehnt.

Die zweite ist graphbasierte Retrieval‑Methoden für LLMs. Microsofts GraphRAG‑Papier, „From Local to Global: A Graph RAG Approach to Query‑Focused Summarization“ (https://arxiv.org/abs/2404.16130) von Edge et al. (2024), spricht explizit den Wert einer Zwischenschicht‑Community an. Sie bauen einen Entitätsgraphen, partitionieren ihn mit dem [Leiden‑Algorithmus](https://de.wikipedia.org/wiki/Leiden_algorithm), und erzeugen Zusammenfassungen pro Community. Die [GraphRAG‑Dokumentation](https://microsoft.github.io/graphrag/) ist eindeutig darüber, was Ihnen diese Communities bringen: jede Ebene der resultierenden Hierarchie „represents a different level of abstraction and summarization.“ Das ist das geschichtete Rahmenwerk in ihren eigenen Worten, angewandt auf Dokumente statt Code. Abfragen treffen zuerst die Community‑Zusammenfassungen und steigen nur bei Bedarf zu den Entitäten hinab. *The Memory Layer* beschreibt dasselbe Muster in Kapitel 5 und behandelt HybridRAG (eine einstellbare Mischung `α · vector_score + (1 - α) · graph_score`) als neuen Standard. Beide bestätigen, dass die Community‑Schicht real und tragfähig ist.

Neuere, code‑spezifische Arbeiten konvergieren auf dieselbe Form. „[Code Graph Model (CGM): A Graph‑Integrated Large Language Model for Repository‑Level Software Engineering Tasks](https://arxiv.org/abs/2505.16901)“ von Tao et al. integriert die Repository‑Code‑Graph‑Struktur in den Aufmerksamkeitsmechanismus eines LLMs und verbindet sie mit einem agentenlosen Graph‑RAG‑Framework, wobei sie 43 % auf SWE‑bench Lite als bestes Open‑Weight‑Modell erreichen. „[GraphCodeAgent: Dual Graph‑Guided LLM Agent for Retrieval‑Augmented Repo‑Level Code Generation](https://arxiv.org/abs/2504.10046)“ von Li et al. nutzt ein Dual‑Graph‑Design (ein Anforderungs‑Graph und ein strukturell‑semantischer Code‑Graph) und lässt den Agenten zwischen beiden mehrstufig abrufen. „[Knowledge Graph Based Repository‑Level Code Generation](https://arxiv.org/abs/2505.14394)“ von Athale und Vaddina stellt ein Repo als Graph dar, der strukturelle und relationale Informationen erfasst und hybride Retrieval‑Methoden darüber verwendet.

Die dritte Literatur ist die Operations‑Literatur, und dorther kommt Schicht 4. Site‑Reliability‑Engineering hat seit zwei Jahrzehnten Runbooks: kurze, meinungsstarke Verfahren, die an einen Alarm oder ein wiederkehrendes Incident gebunden sind. Das Runbook sagt dem On‑Call‑Ingenieur, welches Dashboard er öffnen, welchen Service er neu starten und welches Post‑Mortem er erstellen soll. Coding‑Agents benötigen denselben Artefakt, gebunden an wiederkehrende Nutzeranfragen statt an Seiten. Anthropics Claude‑Code‑Skills und Cursors Befehle sind Frühstadien‑Versionen davon. Es sind Playbooks, die ein Agent aufruft, nicht Graphen, die ein Agent liest, aber die Form ist die gleiche: Intent, beteiligte Konzepte, Schlüsseldateien, Validierungsschritte. Der engste veröffentlichte Präzedenzfall für die Schicht‑4‑Idee, bei der Aufgaben selbst als erstklassige Knoten im selben Wissensgraphen wie das von ihnen berührte System behandelt werden, ist „[Knowledge Graph Modeling‑Driven Large Language Model Operating System for Task Automation](https://arxiv.org/abs/2408.14494)“, das Prozess‑Engineering‑Workflows als KG‑Knoten modelliert, die das LLM durchläuft, um ausführbare Pläne zu erstellen. Schicht 4 ist das, was passiert, wenn Sie das für einen Code‑Base tun: Playbooks werden zu erstklassigen Knoten im selben Graphen wie die Architektur, sodass der Agent von „was zu tun ist“ über „was das bedeutet“ zu „wo es lebt“ navigieren kann, ohne die Struktur zu verlassen.

Keines dieser Werke benennt die Vier‑Schichten‑Aufteilung als Einheit. Schichten 1 und 2 sind stark dokumentiert. Schicht 3 wird als Ontologie‑ und Community‑Zusammenfassung dokumentiert, aber die spezifische Form „menschliche Prädikate über Code‑Communities, erneut als Cache von Schicht 2 generiert“ ist eine praktische Anpassung statt einer veröffentlichten Methode. Schicht 4 ist am wenigsten standardisiert, passt aber zu Agent‑Workflow‑ und Procedural‑Memory‑Ideen in der Operations‑Literatur. Der Beitrag hier ist das Verpacken, nicht die einzelnen Schichten: roher Code‑Graph → Community‑Graph → semantische Ontologie → operative Playbooks, mit Beweisen, die bei jedem Sprung erhalten bleiben, und zwei gültigen Lesrichtungen über den Stack. *The Memory Layer* beschreibt Graphifys „drei Gehirne“ (Tree‑sitter für Code, einen semantischen Extraktor für Prosa, eine multimodale Pipeline für Diagramme und Audio), aber das sind Extraktionsmodalitäten, keine Navigationsschichten, und das Buch endet bei „baue den Graph und lass den Agenten ihn durchlaufen.“ GraphRAG erzeugt Community‑Zusammenfassungen, nutzt sie aber als Retrieval‑Anker für Chunk‑Level‑Beweise, nicht als permanente menschenlesbare Karte. Die code‑spezifischen Paper legen rohe Knoten und Kanten dem LLM offen. Entweder liest das Modell strukturellen Brei, oder es liest natürliche‑Sprach‑Zusammenfassungen, die für Retrieval komprimiert wurden, oder es liest eine Skill‑Datei, die von jedem strukturellen Kontext losgelöst ist. Die Aufteilung, die für mich funktionierte, besteht darin, menschliche Prosa als Eingabekarte zu behalten, sie zurück zu den aggregierten strukturellen Kanten und den darunterliegenden Symbolen zu verlinken und eine dünne operative Schicht obenauf zu legen, sodass wiederkehrende Aufgaben eine stabile Form erhalten.
## Was das kostet

Das ist nicht kostenlos. Vier Dinge kosten etwas.

Erstens muss jede Ebene neu generiert werden, wenn sich der Code ändert. Ebene eins entsteht automatisch aus einem Parser. Ebene zwei entsteht automatisch aus der Community-Erkennung. Ebene drei ist die teure, weil die menschlichen Prädikate einen LLM-Durchlauf benötigen und stillschweigend veralten. Die Gegenmaßnahme besteht darin, Ebene drei als Cache über Ebene zwei zu behandeln, mit einer Frische‑Prüfung, die den Labeler neu ausführt, wenn sich die zugrundeliegenden aggregierten Kanten über einen Schwellenwert hinaus ändern.

Zweitens ist Ebene drei interpretativ. Wenn du einem LLM erlaubst, die Prädikat‑Phrasen zu schreiben, erbst du seine Halluzinationen. Die Gegenmaßnahme ist die, die *The Memory Layer* bereits für rohe Kanten vorschreibt: Verankerung plus Provenienz. Jede Phrase trägt die aggregierten Ebene‑zwei‑Kantenzahlen, die sie rechtfertigen, und diese wiederum tragen Graphify's `EXTRACTED` / `INFERRED` / `AMBIGUOUS`‑Tags. Der Agent behandelt die Phrase als Hypothese und die unteren Ebenen als Test.

Drittens benötigt die mittlere Ebene einen Community‑Detection‑Algorithmus, der stabile, interpretierbare Cluster erzeugt. Leiden funktioniert, aber die Cluster‑Identität driftet, wenn der Code wächst. Du musst entweder Community‑IDs über Läufe hinweg festpinnen oder akzeptieren, dass „Subsystem X“ im nächsten Monat eine etwas andere Menge an Dateien bedeuten kann. Das habe ich noch nicht sauber gelöst.

Viertens ist Ebene vier die teuerste aller zu pflegen, weil sie größtenteils handgeschrieben ist. Ein Playbook, das sagt „edit args.ts and model‑resolver.ts“, veraltet in dem Moment, in dem jemand die Datei umbenennt. Die Gegenmaßnahme hier ist wieder Provenienz: Jeder Schlüssel‑Datei‑Verweis in einem Playbook sollte auf ein Symbol der Ebene eins auflösen, und ein Playbook mit einem veralteten Verweis sollte gekennzeichnet und für autonome Ausführung abgelehnt werden. Behandle Playbooks wie Code, nicht wie Dokumentation. Sie werden geprüft, getestet und bereinigt.
## Was ich weggelassen habe

- **Cross-repo graphs.** Das gleiche Vier‑Schichten‑Muster sollte sich über ein Monorepo von Services erstrecken, aber der Community‑Algorithmus muss zuerst Paketgrenzen respektieren. Noch nicht erledigt.  
- **Versioned ontology diffs.** Schicht drei ändert sich, wenn die Architektur ändert, und diese Differenz ist selbst interessant (sie ist das Architektur‑Change‑Log). Ich habe die Diff‑Ansicht noch nicht gebaut.  
- **Query language.** Im Moment navigiert der Agent durch die Schichten, indem er Markdown liest und Links folgt. Eine typisierte Abfragesprache über die vier Schichten, vielleicht Cypher über einen Neo4j‑Export von Schicht zwei und vier, wäre schneller, ist aber ein separates Projekt.  
- **Embedding-based edges.** Die aktuellen Kanten sind strukturell. Das Hinzufügen von semantisch‑Ähnlichkeits‑Kanten (Module, die ähnliche Probleme lösen, ohne einander aufzurufen) würde latente Kopplungen erfassen, jedoch auf Kosten von mehr Rauschen. Das ist im Wesentlichen HybridRAG in Schicht zwei.  
- **Auto-mining playbooks from PR history.** Die meisten wiederkehrenden Aufgaben fanden bereits mehrfach im Git‑Log statt. Ein Bootstrap der vierten Schicht, das geschlossene PRs nach wiederholten Änderungsmustern durchsucht, ist der naheliegende nächste Schritt. Noch nicht gebaut.
## Welche Schichten sollte der Agent zuerst lesen

Wenn die Aufgabe konkret und wiederkehrend ist, lies zuerst Schicht vier und arbeite dann nach unten. Das Playbook gibt dem Agenten die Antwort. Die unteren Schichten zeigen dem Agenten, wie er sie verifizieren kann.

Wenn die Aufgabe explorativ ist und es kein Playbook gibt, lies zuerst Schicht zwei. Der Community‑Graph mit aggregierten, typisierten Kanten bietet das beste Verhältnis von Information zu Tokens. Schicht drei hilft, ein Modell einzuarbeiten, das den Code‑Base noch nie gesehen hat. Schicht eins ist für die Verifizierung zwingend erforderlich, sollte aber niemals der Einstiegspunkt sein.

Wenn du gerade nur Zeit hast, eine Schicht zu bauen, baue Schicht zwei (sie ergibt sich aus der Community‑Erkennung im Schicht‑eins‑Graphen, den du bereits hast). Wenn du nur Zeit hast, eine Schicht von Hand zu schreiben, schreibe Schicht vier (ein paar Playbooks für die Aufgaben, die dein Team am häufigsten erledigt). Schicht drei ist am angenehmsten zu lesen und am wenigsten dringend zu bauen.

Wenn du einen Code‑Agenten baust und deine Abruf‑Strategie keyword‑über‑Quelle oder Vektor‑über‑Chunks ist, lässt du das stärkste Signal auf dem Boden liegen. Karpathy hatte Recht, dass Gedächtnis ein Graph sein sollte. Shamsi hatte Recht, dass du diesen Graphen in achtundvierzig Stunden liefern kannst. Die verbleibenden Schritte sind, den Graphen als vier Dinge und nicht als eins zu lesen und die Playbooks niederzuschreiben, die dein Agent ständig neu erfindet.

Die Fähigkeit, Schichten zwei und drei aus einem Graphify‑`graph.json` zu erzeugen, befindet sich unter `~/.pi/agent/skills/graphify-human-ontology/`. Die Playbook‑Schicht besteht hauptsächlich aus einem Ordner mit kurzen Markdown‑Dateien, die nach Intent benannt sind, leicht genug, um neben deinem `.claude/skills/`‑ oder `.cursor/commands/`‑Verzeichnis zu leben, bis etwas Strukturierteres es ersetzt. Führe Graphify zuerst auf deinem größten Repository aus, zeige der Fähigkeit auf die Ausgabe, und schreibe dann fünf Playbooks für die fünf Dinge, die du einem Agenten am häufigsten aufträgst. Der Knotengeflecht wird deutlich weniger hässlich, wenn du aufhörst, ihn als ein einziges Ding zu lesen, und dein Agent wird deutlich kostengünstiger, sobald er aufhört, dieselbe Änderung jeden Dienstag von Grund auf neu zu planen.

---

Christian Pojoni schreibt über KI‑Agenten, Wissensgraphen und die Architektur‑Entscheidungen, die bestimmen, ob sie überhaupt funktionieren. Mehr unter [vasudev.xyz](https://vasudev.xyz).

*Das Titelbild für diesen Beitrag wurde von KI generiert.*