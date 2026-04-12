---
title: "Stoppe das Design deines KI‑Systems. Gestalte seine Umgebung."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "interpretability", "llm"]
series: ["Building Agents That Sleep"]
series_weight: 6
description: "Selbstentwickelnde KI‑Systeme scheitern, wenn sie einen festen Evaluator optimieren. Das biologische Modell hat recht: Was sich weiterentwickeln muss, ist der Selektionsdruck, nicht nur das Genom."
images: ["/images/ai-environment-design-og.png"]
translationHash: "c40af029d9351be1aa6f1752ab99ed4a"
chunkHashes: "682b09f9f086f4a4,f75cd0c5f987c056,16ff48cc1008e801,ea0de01ec9fe3288,e25ca86ec3da9258,c0bac7cdc18b0ad6"
---
Ich habe eine Woche damit verbracht, eine „vektor-nativ programmierbare Sprache für LLMs“ zu entwerfen. Die Idee war, das Verhalten des Modells direkt auf der Aktivierungsebene zu programmieren, ohne Prompt, nur mit Eingriffen über Vektoren. Es war intellektuell befriedigend und praktisch falsch. Was ich tatsächlich wollte, war keine Sprache. Es war ein Organismus.

**Die Einheit der Evolution ist nicht das Merkmal. Es ist der Mutations‑/Selektionszyklus.**

Diese Unterscheidung verändert alles daran, wie man ein selbst‑evolvierendes KI‑System baut. Die meisten Systeme, die sich „self‑improving“ nennen, betreiben AutoML. Sie optimieren innerhalb eines festen Suchraums hin zu einem festen Ziel. Das kann Anpassung erzeugen, ist aber eher AutoML als offene Evolution. Der Unterschied erweist sich architektonisch in zweierlei Hinsicht als entscheidend.

---
## Genotyp und Phänotyp sind nicht dieselbe Schicht

Biologische Systeme trennen das, was erhalten bleibt, vom dem, was ausgewählt wird. Das Genom wird nicht direkt getestet. Der Phänotyp wird es. Mutationen passieren am Genom. Selektion geschieht am Phänotyp. Das Genom überlebt, indem es Phänotypen hervorbringt, die überleben. Diese Asymmetrie ist die Quelle der Evolvierbarkeit selbst.

Ein KI‑Harnisch hat eine analoge Struktur, wenn man ihn korrekt aufbaut – nicht als wörtliche biologische Entsprechung, sondern als nützliches architektonisches Mapping. Das Genom ist dein beständiger Zustand: Adapter‑Gewichte, Abruf‑Strategien, Werkzeug‑Konfigurationen, Aktivierungs‑Steuerungsregeln, Code‑Basis‑Patches. Der Phänotyp ist das beobachtbare Verhalten bei Aufgaben. Der Evaluator sieht das Verhalten, nicht die Interna. Mutationen zielen auf das Genom. Selektion zielt auf den Phänotyp.

Viele selbstverbessernde Agenten‑Designs verwischen diesen Unterschied, zumindest implizit. Sie messen das Verhalten und bearbeiten dann direkt das, was sie gemessen haben. Das ist, als würde man Organismen durch Bearbeitung ihrer Phänotypen evolvieren. Es verallgemeinert nicht, weil man das Symptom patcht, nicht die Ursache.

Die korrekte Architektur trennt diese Schichten explizit:

- Die **Persistenz‑Ebene** speichert, was überlebt: Adapter (langfristig), Abruf‑ und Werkzeug‑Strategien (mittelfristig), Aktivierungs‑Steuerungsregeln (flüchtig).  
- Die **Mutationsgeneratoren** schlagen Änderungen an der Persistenz‑Ebene vor, nicht direkt am Verhalten.  
- Der **Evaluator** beobachtet ausschließlich das Verhalten und entscheidet, welche Mutationen überleben.  

Nichts in der Persistenz‑Ebene wird aktualisiert, außer durch dieses Gate.
## Der Evaluator ist keine Verlustfunktion

Hier trennt sich das biologische Denken vom maschinellen Lernen auf eine Weise, die für die Architektur bedeutend ist.

Eine Verlustfunktion ist ein glattes, differenzierbares, lokal definiertes Ziel. Man minimiert sie. Sie geht davon aus, dass die richtige Antwort bekannt und fest ist. Ein Selektionsdruck ist keines dieser Dinge. Er ist die Umwelt, und die Umwelt wird nicht von dir entworfen. Sie ist das, was Dinge tötet, die damit nicht umgehen können.

Wenn du einen Aufgabensatz für deinen selbst‑entwickelnden Mechanismus von Hand entwirfst und ihn nie änderst, hast du keine Umwelt gebaut. Du hast eine Verlustfunktion mit zusätzlichen Schritten gebaut. Das System wird für diesen Aufgabensatz optimieren und stoppen. Es wird Abkürzungen finden, die der Aufgabensatz nicht erfasst. Das ist Goodharts Gesetz auf der architektonischen Ebene: Sobald ein Maß zu einem Ziel wird, hört es auf, ein gutes Maß zu sein. Ich habe das direkt in den [Konsolidierungsmetriken von MuninnDB](/blog/memory-metrics-lying-how-to-ground-them/) gemessen: Dashboard‑Zahlen verbesserten sich, während die Abrufqualität abnahm.

Ein fester Evaluator wird schließlich zur Decke. Um robuste Verbesserung aufrechtzuerhalten, muss die Evaluationsumgebung expandieren, diversifizieren oder adversarial adaptieren. Das bedeutet, der Aufgabensatz benötigt adversarielle Aufgaben, die speziell dafür entworfen sind, Oberflächen‑Gaming zu erkennen. Er braucht Fähigkeits‑Aufgaben (kann es das Ding?), Kalibrierungs‑Aufgaben (weiß es, wann es nicht kann?) und Regressions‑Aufgaben (hat es das, was es bereits wusste, zerstört?). Und er braucht mindestens einen mensch‑in‑der‑Schleife‑Evaluationspfad, den das System nicht vorhersagen kann, weil vorhersehbare Evaluatoren ausgenutzt werden.

Praktisch bedeutet das: Beginne mit einem kleinen festen Aufgabensatz, baue aber von Anfang an die Infrastruktur, um ihn zu erweitern. Jede Mutation, die das System beibehält, sollte einen Testfall erzeugen, der einen Fehler dieser Mutation aufgezeigt hätte. Im Laufe der Zeit wächst der Aufgabensatz mit dem System. Das ist ko‑Evolution in der minimalen funktionsfähigen Form.
## SAE-Steuerung ist ein Operator, nicht die Grundlage

Sparse Autoencoder können spärliche latente Merkmale offenbaren, von denen viele interpretierbar genug sind, um das Verhalten lokal zu steuern, obwohl die Merkmalqualität und die kausale Spezifität noch aktive Forschungsfragen sind. Man kann ein Modell zu einem Konzept hin oder von einem Konzept weg steuern, indem man während des Vorwärtsdurchlaufs einen Merkmalsvektor in einer bestimmten Schicht hinzufügt oder unterdrückt. Das ist schnell, reversibel und erfordert kein erneutes Training.

Aber es ist nur eine Operator-Klasse in einem gemischten Aktionsraum. Die Mutationsgeneratoren in einem ernsthaften Harness sollten Vorschläge über mindestens vier Substrate hinweg produzieren. Das erste Substrat sind Prompt‑ und Retrieval‑Transforme: billig, reversibel, immer der Ausgangspunkt. Das zweite sind Aktivierungs‑Steuerungsregeln: schnell, lokal, mittlere Verpflichtung. Das dritte sind Adapter‑ und LoRA‑Updates: schwerer, erfordern Training, mittel‑ bis langfristige Persistenz. Das vierte sind Code‑ und Policy‑Änderungen: höchste Verpflichtung, am schwersten rückgängig zu machen.

Nur mit SAE‑Steuerung zu starten ist, als würde man ein evolutionäres System bauen, das nur ein Gen mutieren kann. Man bekommt schnelle lokale Anpassung und ein sprödes globales Verhalten. Das System muss in der Lage sein, zu ändern, wie es Kontext abruft, wie es Werkzeuge routet und schließlich, wie es Informationen auf Gewichtsebene verarbeitet – nicht weil diese Operatoren mächtiger sind, sondern weil unterschiedliche Probleme in unterschiedlichen Substraten leben.

Die richtige Disziplin lautet: Eine erfolgreiche, kostengünstige Intervention sollte, wo möglich, in ein billigeres oder stabileres Substrat umformuliert werden, sei es als Prompt‑Transform, Retrieval‑Regel oder Adapter‑Update, vorausgesetzt, die kausale Wirkung überlebt die Übersetzung. Das ist nicht nur eine Regel für Sicherheit. Es ist eine Regel für Evolvierbarkeit: Das System sollte teure Mutationen widerstehen, bis günstige welche das richtige Umfeld gefunden haben.
## Was ein Minimal Viable Loop tatsächlich aussieht

Die Schleife hat sechs Phasen. Beobachten. Vorschlagen. Sandbox. Evaluieren. Den Gewinner behalten (oder alle Kandidaten ablehnen). Den Such‑Prior aktualisieren.

![Six-stage mutation/selection cycle: Observe, Propose, Sandbox, Evaluate, Retain/Reject, Update prior](/images/evolution-loop-inline.svg)

Beobachten bedeutet, das aktuelle Genom gegen den Aufgaben‑Battery laufen zu lassen und Verhaltensmetriken aufzuzeichnen. Vorschlagen bedeutet, dass die Such‑Policy Kandidaten‑Mutationen erzeugt, jeweils eine pro Operator‑Klasse, parallel. Sandbox bedeutet, dass jeder Kandidat in Isolation läuft: kein geteilter Zustand, harte Ressourcen‑Limits, Rollback garantiert. Evaluieren bedeutet, das Verhaltens‑Delta gegenüber dem aktuellen Basis‑Lineup zu bewerten. Behalten bedeutet, den Gewinner in die Persistenz‑Schicht mit voller Provenienz zu schreiben: Vorher‑/Nachher‑Metriken, welche Prompts davon betroffen sind, welche Operator‑Klasse verwendet wurde und Ablauf‑ sowie Revalidierungs‑Policy. Den Such‑Prior aktualisieren bedeutet, dass der Banditen‑ oder Evolutions‑Policy lernt, welche Operator‑Klassen und welche Bereiche des Suchraums Überlebende erzeugen.

Jede behaltene Mutation benötigt einen Rollback‑Handle. Nicht als Sicherheitsfunktion. Als Gestaltungsanforderung. Wenn du eine Mutation nicht zurückrollen kannst, kannst du ihren marginalen Beitrag nicht messen. Wenn du ihren marginalen Beitrag nicht messen kannst, entwickelst du dich nicht weiter. Du akkumuliert nur.
## Was ich ausgelassen habe

**Selbstmodifikation von Code.** Selbstbearbeitung im Stil von Darwin‑Gödel‑Maschinen funktioniert in sandbox‑basierten Coding‑Agent‑Umgebungen mit formalen Verifizierern. Für ein allgemeines Framework ohne diese Einschränkungen ist es ein Phase‑4‑Problem, nicht weil es unmöglich ist, sondern weil die notwendige Infrastruktur (stabiler Evaluator, Rollback‑Garantie, enger Aufgaben‑Umfang) zuerst bereitgestellt werden muss.

**Feature‑Universalität.** SAE‑Features sind modell‑spezifisch und manchmal checkpoint‑spezifisch. Ob nützliche Features über Modellversionen hinweg übertragbar sind, ist eine offene Forschungsfrage. Das Framework sollte so gestaltet werden, dass es Feature‑Dictionaries bei jedem Basis‑Modell‑Update neu extrahiert, anstatt Stabilität anzunehmen.

**Multi‑Agent‑Evaluatoren.** Einen Judge‑Model als Teil der Evaluationsschleife zu verwenden, erhöht die Robustheit, schafft aber auch eine adversarische Angriffsfläche. Das System kann lernen, den Judge zu befriedigen, statt die zugrunde liegende Aufgabe zu lösen. Das erfordert explizite Gegenmaßnahmen, die ich noch nicht entworfen habe.

**Rechen‑Budgetierung.** Eine Mutation, die die Fähigkeit um 2 % steigert, aber die Latenz verdoppelt, ist kein Gewinn. Latenz und Kosten müssen als erstklassige Beschränkungen im Evaluator berücksichtigt werden, nicht als Nachgedanke.

---

Die Verbindung zu [Hrafn](https://github.com/5queezer/hrafn) ist direkt. MuninnDB ist die Persistenz‑Schicht. Die Dream Engine, modelliert nach der speicher‑konsolidierenden Schlafphase, ist der Mechanismus, der flüchtige Beobachtungen in mittel‑fristige Politik überführt. Die fehlenden Bausteine sind die Such‑Policy und der ko‑evolvierende Evaluator. Das wird als Nächstes gebaut.

Wenn du in diesem Bereich tätig bist, ist das wichtigste Vorwissen nicht aus dem ML‑Bereich zu übernehmen, sondern aus der Evolutionsbiologie: Die Umwelt führt die Selektion durch. Deine Aufgabe ist, die Umwelt zu bauen, nicht das Lebewesen.

Beginne mit [Hrafn](https://github.com/5queezer/hrafn) und der [MuninnDB‑Persistenzschicht](https://github.com/5queezer/hrafn). Die Trennung von Genom/Phänotyp ist bereits verdrahtet. Was gebaut werden muss, ist der Evaluator, der sich zusammen mit dem System, das er misst, co‑evolviert.

---

*Christian Pojoni entwickelt AI‑Agent‑Infrastruktur und schreibt darüber auf [vasudev.xyz](https://vasudev.xyz). Aktuelle Arbeit: [Hrafn](https://github.com/5queezer/hrafn), ein Rust‑basiertes Agent‑Runtime.*