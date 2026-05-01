---
title: "Ihr Code‑Wissensgraph benötigt drei Ebenen, nicht eine"
date: 2026-05-01
tags: ["agents", "ai", "architecture"]
description: "Shamsi's Memory Layer hat recht, dass Agenten einen Graphen benötigen. Es bleibt um eine Schicht zu kurz. Die mittlere Schicht ist das, was ein LLM durch ein Repo trägt."
translationHash: "c63e4fa24305c4c50cc3f8568ad993b8"
chunkHashes: "77ce7eb9b618ff47,9fc4c74354b5a1bb,e39122859526c0ae,bf9f071324cbdcc6,754445b6bf178f72,033d0d53ff1fa0f2,6c18a8f902e510bc,0b994df6c248454c,eb38ad07d0c07a79,1962a179dd445435"
---
Andrej Karpathy brachte das Argument in einem Beitrag vor: Gedächtnis ist eine Struktur, in der du lebst, nicht ein Cache, den du bei jeder Eingabe auffüllst. Achtundvierzig Stunden später veröffentlichte Safi Shamsi [Graphify](https://github.com/safishamsi/graphify) und schrieb *The Memory Layer* darum herum. Die These ist, dass ein KI‑Agent einen Wissensgraphen durchlaufen sollte, anstatt einen Vektor‑Index zu durchsuchen, weil Beziehungen im Weißraum zwischen den Abschnitten liegen und ein Vektor‑Speicher sie nicht sehen kann.

Ich stimme der These zu. Ich denke, das Buch bleibt eine Ebene zu kurz.

Ich habe letzte Woche einen Graphify‑Graphen für einen Code‑Agenten‑Code‑Base erzeugt. Die erste Version war das Offensichtliche. Knoten waren Dateien, Klassen, Funktionen, Methoden. Kanten waren `imports`, `calls`, `contains`, `method`. Beim Öffnen in Obsidian sah es aus wie ein Haarknoten. Ich clusterte ihn in Communities und benannte jede nach einem Konzeptnamen. Besser. Aber die Kanten zeigten immer noch Dinge wie `calls×32 / method×7 / contains×11`. Nützlich als Beweis. Nicht nützlich als Karte. Dann schrieb ich die Kanten als menschliche Beziehungsphrasen um: „steuert und beobachtet Unterhaltungen“, „stellt Anmeldeinformationen bereit für“, „rendert Markdown mit“. Plötzlich las sich der Graph wie ein Satz. Plötzlich konnte ein LLM sich daran orientieren.

Dann stellte ich die offensichtliche Frage. Wenn die Mensch‑Sprache‑Ebene so lesbar ist, warum nicht die anderen beiden überspringen?

**Ein Code‑Wissensgraph für einen LLM‑Agenten sollte drei Ebenen haben, und die mittlere Ebene ist die, die die Arbeit erledigt.**
## Wie das tatsächlich aussieht

Nehmen wir eine echte Subsystem‑Grenze in einer Laufzeit eines Coding‑Agents. Die interaktive Terminal‑UI kommuniziert mit dem Lebenszyklus der Agent‑Sitzung. Das ist ein realer architektonischer Fakt. Es gibt drei verschiedene Arten, dies zu beschreiben.

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

Layer three formuliert das Prädikat als menschliche Phrase, wobei die Rohzahlen als Beleg darunter erhalten bleiben:

```text
Interactive Session Orchestration  --drives and observes conversations-->  Agent Session Lifecycle
```

Dieselbe Tatsache. Drei verschiedene Darstellungen. Keine von ihnen ist allein die richtige Antwort.
## Warum Ebene Eins allein scheitert

Der Rohgraph ist korrekt und nutzlos. Ein mittelgroßes Repository hat Zehntausende von Knoten und Hunderttausende von Kanten. Öffnet man ihn in irgendeinem Graph‑Viewer, erhält man eine schwarze Kugel ohne Informationen. Gibt man ihn einem LLM, bläst man das Kontextfenster, bevor der Agent die Chance hat zu argumentieren.

Shamsi macht diesen Punkt mit einer ehrlichen Zahl deutlich. In Kapitel 6 von *The Memory Layer* komprimiert Graphify einen ungefähr fünf‑Millionen‑Token‑Codebestand auf etwa einhundertsechsundsiebzig tausend Token aus Knoten, Kanten und Community‑Zusammenfassungen. Das entspricht einer 28‑fachen Kompression. Das ist auch der Grund, warum Ebene eins allein nicht der Einstiegspunkt sein kann. Der ganze Reiz beim Aufbau des Graphen besteht darin, dass man aufhört, Text zu senden, und stattdessen Topologie übermittelt. Wenn man dann die Topologie Kante für Kante zurück an das Modell wirft, hat man den Dateibaum nur etwas strukturierter gemacht und nennt es Fortschritt.

Der Rohgraph ist zudem für das, was ein Agent tatsächlich tut, fehlkalibriert. Ein Agent will nicht wissen, dass `formatTimestamp` `padStart` aufruft. Er will wissen, dass der Export‑Viewer Markdown mit einem mitgelieferten Parser rendert, weil das entscheidet, welche Datei zu editieren ist, wenn der Nutzer einen Rendering‑Fehler meldet.

Du brauchst dennoch Ebene eins. Sie ist die einzige Schicht, die es ermöglicht, von einem Konzept zurück zu einer genauen Datei und Zeile zu gelangen. Aber sie kann nicht der Einstiegspunkt sein.
## Warum Schicht Drei allein versagt

Der gegenteilige Fehler ist verführerischer. Sobald Sie menschliche Prädikate wie „steuert und beobachtet Gespräche“ haben, liest sich das Graph wie Prosa. Es fühlt sich wie die richtige Abstraktion für ein LLM an, weil LLMs gut in Prosa sind.

Das Problem ist, dass menschliche Prädikate interpretativ sind. Sie sind eine redaktionelle Ebene über den Beweisen. Wenn Sie sie als Tatsachen behandeln, plant der Agent basierend auf Formulierungen, die seit dem letzten Refactoring falsch sein könnten, und es gibt keinen einfachen Weg, den Drift zu erkennen. Das LLM würde selbstbewusst sagen „der Export‑Viewer rendert Markdown mit dem vendierten Parser“, selbst nachdem jemand den Parser ausgetauscht hat, weil das menschliche Label nicht neu generiert wurde.

Shamsi antizipiert den Fehlermodus und gibt Graphify die richtige Abwehr auf Kantenebene. Jede Kante trägt eines von drei Provenienz‑Tags: `EXTRACTED` (im AST beobachtet), `INFERRED` (logisch impliziert mit einem Vertrauens‑Score) und `AMBIGUOUS` (widersprüchliche Evidenz, zur menschlichen Überprüfung markiert). Das Vertrauen multipliziert sich entlang eines Pfads, sodass eine zweistufige inferierte Kette mit 0,9 und 0,8 zu 0,72 zusammenfällt und einem Agenten gesagt werden kann, alles unter einer Schwelle abzulehnen. Diese Abwehr ist korrekt. Sie ist jedoch auf der falschen Granularität definiert, wenn Sie Navigation wünschen. Ein Vertrauens‑Score auf einer einzelnen Kante sagt Ihnen nur, ob Sie dieser Tatsache vertrauen sollten. Er sagt nicht, welches Subsystem Sie zuerst anschauen sollten.

Der Ausdruck muss ein Hyperlink sein, keine Tatsache. Jeder menschliche Prädikat muss zurück zu den aggregierten rohen Kanten zeigen, die ihn rechtfertigen. Wenn sich diese rohen Kanten verschieben, ist der Ausdruck verdächtig.
## Die Ebene, die den Agenten tatsächlich trägt

Ebene zwei ist die unglamouröse. Gemeinschaften von Dateien, die durch aggregierte getypte Kanten zusammengehalten werden. Kein Prosatext, keine handkuratierte Sprache, nur strukturelle Cluster mit Zählungen an den Kanten zwischen ihnen.

Das ist, worüber ein LLM‑Agent zuerst nachdenken sollte.

Der Grund ist die Reduktion des Suchraums. Ein Repository enthält Hunderte von Dateien. Ein Subsystem‑Graph hat ein paar Dutzend Gemeinschaften. Wenn der Nutzer sagt „Behebe den Fehler, bei dem das Bash‑Tool veraltete Ausgabe erzeugt“, sollte der Agent nicht die Stichwortsuche über den gesamten Baum durchführen. Er sollte sich den Community‑Graph anschauen, „Bash Execution Interface“ und „Interactive Session Orchestration“ finden, notieren, zu welchen anderen Gemeinschaften sie eine Brücke bilden, und dann in Ebene eins für die genaue Datei absteigen. Das sind zwei Graph‑Sprünge statt tausender Grep‑Matches.

Die aggregierten Kantenzählungen kodieren außerdem etwas, das der rohe Graph verbirgt. Wenn zwei Gemeinschaften durch `calls×32 / imports×9 / events×4` verbunden sind, ist das eine starke Kopplung und jede Änderung an einer wird wahrscheinlich die andere berühren. Wenn sie durch `contains×1` verbunden sind, kennen sie einander kaum. Zählungen sind das günstigste Impact‑Analysis‑Signal, das Sie haben.
## Der Workflow, den dies impliziert

Die drei Schichten sind keine Alternativen. Sie bilden eine Pipeline.

```text
Layer 3 (human ontology)
  agent reads the map, picks a conceptual route
    "the user wants to change how exports render markdown"

Layer 2 (community graph)
  agent identifies the relevant subsystem and its bridges
    "HTML Session Export Viewer, bridged to Markdown Rendering Engine"

Layer 1 (raw graph)
  agent finds the exact file and function
    "themes/export/render.ts, parseMarkdown(), line 84"

Source code
  agent reads, edits, verifies
```

Jede Schicht beantwortet eine andere Frage. Schicht drei beantwortet „Was ist das und warum existiert es?“. Schicht zwei beantwortet „Wo befindet es sich und was berührt es?“. Schicht eins beantwortet „Welches genaue Symbol muss ich ändern?“. Sie können nicht zusammengefasst werden, weil sich die Frage bei jedem Schritt ändert.
## Wo das in der Literatur steht

Zwei Literaturen konvergieren zu dieser Form und reden meist nicht miteinander.

Die erste ist Programmanalyse. Der [code property graph](https://en.wikipedia.org/wiki/Code_property_graph), eingeführt von Yamaguchi et al. in ihrer IEEE S&P‑Arbeit von 2014 „Modeling and Discovering Vulnerabilities with Code Property Graphs“ (die 2024 den IEEE Test‑of‑Time Award gewann), fasst bereits drei klassische Darstellungen zu einer Struktur zusammen: den abstrakten Syntaxbaum, den Kontrollflussgraphen und den Programmdatenabhängigkeitsgraphen. Der ursprüngliche Anwendungsfall war die Schwachstellenerkennung, aber die Lehre verallgemeinert. Eine einzelne Darstellung kann nicht alle Fragen beantworten, die du zu Code hast, also kombinierst du Darstellungen und lässt die Abfrage die passende Scheibe auswählen. Das ist Ebene 1 gut umgesetzt, und das wird seit über einem Jahrzehnt gut gemacht.

Die zweite ist graphbasierte Retrieval für LLMs. Microsofts GraphRAG‑Paper, ["From Local to Global: A Graph RAG Approach to Query-Focused Summarization"](https://arxiv.org/abs/2404.16130) von Edge et al. (2024), spricht explizit über den Wert einer Zwischenschicht für Communities. Sie bauen einen Entitätsgraphen, partitionieren ihn mit dem [Leiden‑Algorithmus](https://de.wikipedia.org/wiki/Leiden_algorithm), und erzeugen Zusammenfassungen pro Community. Abfragen treffen zuerst die Community‑Zusammenfassungen und tauchen nur bei Bedarf in die Entitäten ein. Das ist exakt Ebene 2, angewendet auf Dokumente statt Code. *The Memory Layer* beschreibt dasselbe Muster in Kapitel 5 und behandelt HybridRAG (eine einstellbare Mischung `α · vector_score + (1 - α) · graph_score`) als neue Vorgabe. Beide bestätigen, dass die Community‑Schicht real und tragfähig ist.

Aktuelle, code‑spezifische Arbeiten konvergieren zu derselben Form. ["Code Graph Model (CGM): A Graph‑Integrated Large Language Model for Repository‑Level Software Engineering Tasks"](https://arxiv.org/abs/2505.16901) von Tao et al. integriert die Repository‑Code‑Graph‑Struktur in den Aufmerksamkeitsmechanismus eines LLM und koppelt sie an ein agentenloses Graph‑RAG‑Framework, wobei es 43 % auf SWE‑bench Lite als bestes Open‑Weight‑Modell erzielt. ["GraphCodeAgent: Dual Graph‑Guided LLM Agent for Retrieval‑Augmented Repo‑Level Code Generation"](https://arxiv.org/abs/2504.10046) von Li et al. verwendet ein Dual‑Graph‑Design (ein Anforderungs‑Graph und ein strukturell‑semantischer Code‑Graph) und lässt den Agenten über beide hinweg mehrstufiges Retrieval durchführen. ["Knowledge Graph Based Repository‑Level Code Generation"](https://arxiv.org/abs/2505.14394) von Athale und Vaddina stellt ein Repo als Graph dar, der strukturelle und relationale Informationen erfasst, und nutzt hybride Retrieval‑Methoden darüber.

Was keiner dieser Beiträge klar ausführt, ist die dritte Schicht. *The Memory Layer* beschreibt Graphifys „drei Gehirne“ (Tree‑sitter für Code, einen semantischen Extraktor für Prosa, eine multimodale Pipeline für Diagramme und Audio), aber das sind Extraktions‑Modalitäten, keine Navigations‑Schichten. Das Buch endet bei „baue den Graphen und lass den Agenten darauf laufen.“ GraphRAG erzeugt Community‑Zusammenfassungen, nutzt sie aber als Retrieval‑Anker für Chunk‑Level‑Belege, nicht als permanente, menschenlesbare Karte. Die code‑spezifischen Paper geben rohe Knoten und Kanten an das LLM weiter. Entweder liest das LLM strukturelles Wirrwarr oder es liest natürlichsprachliche Zusammenfassungen, die für das Retrieval komprimiert wurden. Die Aufteilung, die bei mir funktionierte, besteht darin, die menschliche Prosa als Einstiegskarte zu behalten, sie aber immer zurückzuverlinken zu den aggregierten strukturellen Kanten, die wiederum zu den Symbolen verweisen. Drei Schichten, eine Leserichtung, Belege bei jedem Hopfen erhalten.
## Was das kostet

Das ist nicht kostenlos. Drei Dinge kosten etwas.

Erstens muss jede Ebene neu generiert werden, wenn sich der Code ändert. Ebene eins entsteht automatisch aus einem Parser. Ebene zwei entsteht automatisch aus der Community‑Erkennung. Ebene drei ist die teure, weil die menschlichen Prädikate einen LLM‑Durchlauf benötigen und sie stillschweigend veralten. Die Abmilderung besteht darin, Ebene drei als Cache über Ebene zwei zu behandeln, mit einer Frische‑Prüfung, die den Labeler neu ausführt, sobald die zugrunde liegenden aggregierten Kanten einen Schwellenwert überschreiten.

Zweitens ist Ebene drei interpretativ. Wenn ein LLM die Prädikat‑Phrasen schreibt, übernimmt man seine Halluzinationen. Die Abmilderung ist diejenige, die *The Memory Layer* bereits für rohe Kanten vorschreibt: Verankerung plus Provenienz. Jede Phrase trägt die aggregierten Kanten‑Zähler der Ebene zwei, die sie begründen, und diese wiederum tragen Graphify‑Tags `EXTRACTED` / `INFERRED` / `AMBIGUOUS`. Der Agent behandelt die Phrase als Hypothese und die unteren Ebenen als Test.

Drittens benötigt die mittlere Ebene einen Community‑Detection‑Algorithmus, der stabile, interpretierbare Cluster erzeugt. Leiden funktioniert, aber die Cluster‑Identität driftet, wenn der Code wächst. Man muss entweder Community‑IDs über Läufe hinweg festlegen oder akzeptieren, dass „Subsystem X“ nächsten Monat ein leicht anderes Dateiset bedeutet. Ich habe das noch nicht sauber gelöst.
## Was ich ausgelassen habe

Ein paar Dinge wurden bewusst zurückgestellt:

- **Cross-repo‑Graphen.** Das gleiche Drei‑Schichten‑Muster sollte sich über ein Monorepo von Services hinweg zusammensetzen, aber der Community‑Algorithmus muss zuerst Paketgrenzen respektieren. Noch nicht erledigt.
- **Versionierte Ontologie‑Diffs.** Schicht drei ändert sich, wenn die Architektur sich ändert, und dieser Diff ist an sich interessant (es ist das Architektur‑Change‑Log). Die Diff‑Ansicht habe ich noch nicht gebaut.
- **Abfragesprache.** Im Moment navigiert der Agent durch die Schichten, indem er Markdown liest und Links folgt. Eine typisierte Abfragesprache über die drei Schichten, vielleicht Cypher über einen Neo4j‑Export von Schicht zwei, wäre schneller, ist aber ein separates Projekt.
- **Embedding‑basierte Kanten.** Die aktuellen Kanten sind strukturell. Das Hinzufügen von semantisch‑Ähnlichkeits‑Kanten (Module, die ähnliche Probleme lösen, ohne einander aufzurufen) würde latente Kopplungen erfassen, allerdings auf Kosten von mehr Rauschen. Das ist im Grunde HybridRAG innerhalb von Schicht zwei.
## Welche Ebene sollte der Agent zuerst lesen

Wenn Sie nur Zeit haben, eine Ebene in Ihren Agent zu integrieren, wählen Sie Ebene zwei. Der Community‑Graph mit aggregierten typisierten Kanten bietet das beste Verhältnis von Information zu Tokens. Ebene drei ist ein nettes Add‑On, das beim Onboarding hilft. Ebene eins ist für die Verifikation verpflichtend, sollte aber niemals der Einstiegspunkt sein.

Wenn Sie einen Code‑Agent bauen und Ihre Retrieval‑Strategie Keyword‑über‑Quelle oder Vektor‑über‑Chunks ist, lassen Sie das stärkste Signal liegen. Karpathy hatte recht, dass Speicher ein Graph sein sollte. Shamsi hatte recht, dass man diesen Graphen in achtundvierzig Stunden bereitstellen kann. Der verbleibende Schritt besteht darin, den Graphen nicht mehr als ein einziges Ding zu lesen. Der strukturelle Graph existiert bereits in Ihrem AST. Clustern Sie ihn, kennzeichnen Sie die Brücken und lassen Sie den Agenten die Karte durchlaufen, bevor er den Baum durchläuft.

Die Fähigkeit, alle drei Ebenen aus einem `graph.json` von Graphify zu erzeugen, befindet sich unter `~/.pi/agent/skills/graphify-human-ontology/`. Führen Sie Graphify zuerst auf Ihrem größten Repository aus und zeigen Sie die Fähigkeit dann auf die Ausgabe. Sie erhalten die beschrifteten Diagramme, die Evidenz‑Notizen und das Canvas. Das Haarball‑Problem wird deutlich weniger unübersichtlich, wenn Sie aufhören, es als ein einziges Ding zu lesen.

---

Christian Pojoni schreibt über KI‑Agenten, Wissensgraphen und die architektonischen Entscheidungen, die darüber entscheiden, ob sie tatsächlich funktionieren. Mehr unter [vasudev.xyz](https://vasudev.xyz).