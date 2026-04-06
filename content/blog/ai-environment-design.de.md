---
title: "Hören Sie auf, Ihr KI-System zu entwerfen. Entwerfen Sie seine Umgebung."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
description: "Sich selbst weiterentwickelnde KI-Systeme scheitern, wenn sie einen statischen Evaluator optimieren. Das biologische Modell hat recht: Was sich entwickeln muss, ist der Selektionsdruck, nicht nur das Genom."
images: ["/images/ai-environment-design-og.png"]
translationHash: "57e07e366bbcb43e8621ce7153ffcbbc"
---
Ichverbrachte eine Woche damit, ein "vector-native programming language for LLMs" zu entwerfen. Die Idee war, das Modellverhalten direkt auf der Aktivierungsebene zu programmieren, ohne Prompts, nur mit Interventionvektoren. Das war intellektuell befriedigend und praktisch falsch. Was ich eigentlich wollte, war keine Sprache. Es war ein Organismus.

**Die Einheit der Evolution ist nicht das Feature. Es ist der Mutations/Selektion-Zyklus.**

Diese Unterscheidung verändert alles, wie man eine Selbstentwicklungs-KI-Harness baut. Die meisten Systeme, die sich als "self-improving" bezeichnen, betreiben AutoML. Sie optimieren über einen festen Suchraum zu einem festen Ziel. Das kann Adaptation erzeugen, ist aber näher an AutoML als an offener Evolution. Der Unterschied stellt sich als architektonisch entscheidend in zwei Hinsichten heraus.

---

## Genotyp und Phänotyp Sind nicht die gleiche Ebene

Biologische Systeme trennen, was bleibt, von dem, was ausgewählt wird. Das Genom wird nicht direkt getestet. Das Phänotyp wird getestet. Mutationen geschehen am Genom. Die Selektion geschieht am Phänotyp. Das Genom überlebt, indem es Phänotypen hervorbringt, die überleben. Diese Asymmetrie ist die Quelle der Evolvierbarkeit selbst.

Ein KI-Harness hat eine analoge Struktur, wenn man sie korrekt baut, nicht als wörtliche biologische Entsprechung, sondern als nützliches architekturanalytisches Mapping. Das Genom ist dein dauerhafter Zustand: Adaptergewichte, Abruf‑ und Tool‑Policen, Aktivierungssteuerungsregeln, Codebasis‑Patches. Das Phänotyp ist das beobachtbare Verhalten bei Aufgaben. Der Evaluator sieht Verhalten, nicht interne Strukturen. Mutationen zielen auf das Genom. Die Selektion zielt auf das Phänotyp.

Viele selbstverbessernden Agentur-Designs kollabieren diese Unterscheidung, zumindest implizit. Sie messen Verhalten und bearbeiten dann direkt das, was sie gemessen haben. Das ist ähnlich wie die Evolution von Organismen durch direkte Bearbeitung ihrer Phänotypen. Es generalisiert nicht, weil du das Symptom patchst, nicht die Ursache.

Die richtige Architektur trennt diese Schichten explizit:

Der **persistence tier** speichert, was überlebt: Adapter (langfristig), Abruf‑ und Tool‑Policen (mittel‑termine), Aktivierungssteuerungsregeln (flüchtig). Die **mutation generators** schlagen Änderungen am persistence tier vor, nicht direkt am Verhalten. Der **evaluator** beobachtet nur das Verhalten und schaltet, welche Mutationen überleben. Nichts in der persistence tier wird aktualisiert, außer über diese Schleuse.

---

## Der Evaluator Ist Keine Verlustfunktion

Hier endet das biologische Denken im Vergleich zum ML-Denken auf eine Weise, die für die Architektur entscheidend ist.

Eine Verlustfunktion ist ein glattes, differenzierbares, lokal definiertes Ziel. Man minimiert sie. Sie setzt voraus, dass die richtige Antwort bekannt und fixiert ist. Eine Selektionsdruck ist nichts davon. Er ist die Umgebung, und die Umgebung wird nicht von dir entworfen. Er ist alles, was Dinge tötet, die sie nicht bewältigen können.

Wenn du ein Aufgabenbatterie für deinen Selbstentwicklungs-Harness designst und nie änderst, hast du keine Umgebung geschaffen. Du hast eine Verlustfunktion mit zusätzlichen Schritten gebaut. Das System optimiert für diese Batterie und hört auf. Es findet Umgehungen, die die Batterie nicht erkennt. Das ist Goodhart's Law auf architektureller Ebene: sobald eine Messgröße zum Ziel wird, hört sie auf, eine gute Messgröße zu sein.

Ein fester Evaluator wird letztlich zu einer Decke. Um robuste Verbesserung nachhaltig zu gestalten, muss die Evaluierungsumgebung wachsen, diversifizieren oder sich adversär anpassen. Das bedeutet, die Aufgabenbatterie braucht adversärische Aufgaben, die speziell dafür gebaut sind, oberflächliche Spielereien zu durchschlagen. Sie braucht Fähigkeitsaufgaben (kann es das tun?), Kalibrieraufgaben (weiß es, wenn es nicht kann?), und Regressionsaufgaben (hat es das, was es already wusste, gebrochen?). Und sie braucht mindestens einen menschlichen Bewertungsweg, den das System nicht vorhersagen kann, weil vorhersagbare Evaluatoren ausgespielt werden.

Praxisnah bedeutet das: Beginne mit einer kleinen, festen Batterie, aber baue die Infrastruktur von Anfang an aus, um sie zu erweitern. Jede Mutation, die das System behält, sollte einen Testfall erzeugen, der einen Fehler dieser Mutation aufgedeckt hätte. Mit der Zeit wächst die Batterie mit dem System. Das ist ko-evolution in ihrer minimalen verwirklichbaren Form.

---

## SAE Steering Ist Einer Operator, Nicht die Grundlage

Sparse Autoencoders können spärliche latente Merkmale freilegen, von denen viele genug interpretierbar sind, um das Verhalten lokal zu steuern, wobei Qualität der Merkmale und kausale Spezifität weiterhin Forschungsfragen bleiben. Man kann ein Modell in Richtung oder weg von einem Konzept steuern, indem man einen Feature-Vektor an einer bestimmten Schicht während des Vorwärts-pass hinzufügt oder unterdrückt. Das ist schnell, reversibel und erfordert kein erneutes Training.

Aber es ist nur eine Operatorklasse in einem gemischten Aktionsraum. Die Mutation Generatoren in einem ernsthaften Harness sollten across mindestens vier Substrate Vorschläge erzeugen. Das erste Substrat sind Prompt- und Abruf-Transformations: billig, reversibel, immer der Ausgangspunkt. Das zweite sind Aktivierungssteuerungsregeln: schnell, lokal, mittelfristige Verpflichtung. Das dritte sind Adapter- und LoRA-Updates: schwerer, erfordern Training, mittelfristige Persistenz. Das vierte sind Code- und Politik-Änderungen: höchste Verpflichtung, schwerster zur Rücknahme.

Ein System, das nur SAE Steering nutzt, ist wie ein evolvierendes System, das nur ein Gen mutieren kann. Man erhält schnelle lokale Anpassung und brüchiges globales Verhalten. Das System muss in der Lage sein, wie es Kontext abruft, wie es Tools weiterleitet und letztlich wie es Informationen auf Gewichts‑ebene verarbeitet, nicht weil diese Operatoren mächtiger sind, sondern weil unterschiedliche Probleme in unterschiedlichen Substraten liegen.

Die richtige Disziplin ist: Eine erfolgreiche low‑cost Intervention sollte, wenn möglich, in einem günstigeren oder stabileren Substrat neu ausgedrückt werden, etwa als Prompt‑Transform, Abruf‑Regel oder Adapter‑Update, vorausgesetzt, die kausale Wirkung übersetzt sich. Das ist keine Regel allein für Sicherheit. Es ist eine Regel für Evolvierbarkeit: Das System sollte teure Mutationen ablehnen, bis günstige gefunden haben, die Nachbarschaft erreicht haben.

---

## Was ein Minimaler Realisierbarer Loop Eigentlich Aussieht

Die Schleife hat sechs Phasen. Observe. Propose. Sandbox. Evaluate. Retain the winner (oder lehne alle Kandidaten ab). Update the search prior.

Observe bedeutet, das aktuelle Genom gegen die Aufgabenbatterie zu laufen zu lassen und verhaltensmäßige Metriken zu protokollieren. Propose bedeutet, dass die Suchpolicy kandidaten Mutationen, je nach Operatorklasse, parallel generiert. Sandbox bedeutet, dass jede Kandidatin in Isolation läuft: kein gemeinsamer Zustand, harte Ressourcenbegrenzungen, Rückgängigmachen garantiert. Evaluate bedeutet, den verhaltensmäßigen Delta-Wert gegen die aktuelle Basislinie zu bewerten. Retain bedeutet, den Sieger in das persistence tier mit voller Provenienz zu schreiben: Vorher/Nachher‑Metriken, welche Prompts es beeinflusst hat, welche Operatorklasse verwendet wurde, und Ablauf- und Revalidierungspolitik. Update search prior bedeutet, dass das Bandit‑ oder Evolutions‑Policy lernt, welche Operatorklassen und welche Regionen des Suchraums Survivors erzeugen.

Jede behaltene Mutation benötigt einen Rollback‑Handles. Nicht als Sicherheitsfeature. Als Design‑Anforderung. Wenn du eine Mutation nicht zurückrollen kannst, kannst du ihren marginalen Beitrag nicht messen. Wenn du ihren marginalen Beitrag nicht messen kannst, evolvierst du nicht. Du akkumulierst nur.

---

## Was Ich Alles Weggelassen Habe

**Self-modification of code.** Darwin‑Gödel Machine‑stil Self‑Editing funktioniert in sandboxed coding‑agent settings with formal verifiers. Für einen allgemeinen Harness ohne diese Einschränkungen ist es ein Phase 4‑Anliegen, nicht weil es unmöglich ist, sondern weil die Voraussetzungsinfrastruktur (stabiler Evaluator, Rückgängigmach‑Garantien, begrenzter Aufgabenumfang) zuerst geschaffen sein muss.

**Feature‑Universalität.** SAE‑Merkmale sind modell‑spezifisch und manchmal checkpoint‑spezifisch. Ob nützliche Merkmale über Modellversionen hinweg übertragen werden, ist eine offene Forschungsfrage. Der Harness sollte so gestaltet werden, dass er bei jedem Base‑Modell‑Update Feature‑Wörterbücher neu extrahiert, statt Stabilität vorauszusetzen.

**Multi‑agent evaluators.** Die Nutzung eines Bewertungsmodells als Teil der Evaluierungsschleife erhöht Robustheit, schafft aber auch eine adversäre Angriffsfläche. Das System kann lernen, den Bewerter zu befriedigen, statt der zugrunde liegenden Aufgabe. Das erfordert explizite Gegenmaßnahmen, die ich bisher nicht designed habe.

**Compute budgeting.** Eine Mutation, die die Kapazität um 2 % verbessert, aber die Latenz verdoppelt, ist kein Gewinn. Latenz und Kosten müssen als erste‑Klasse‑Beschränkungen im Evaluator stehen, nicht als Nachgedanken.

Der Zusammenhang zu [Hrafn](https://github.com/5queezer/hrafn) ist direkt. MuninnDB ist die persistence tier. The Dream Engine, modeled on sleep‑phase memory consolidation, is the mechanism that promotes ephemeral observations into medium‑term policy. The missing pieces are the search policy and the co‑evolving evaluator. That is what gets built next.

Wenn du in diesem Bereich baust, ist die prior, die am meisten wert ist zu übernehmen, nicht aus ML. Sie kommt aus der evolutionären Biologie: die Umgebung macht die Selektion. Deine Aufgabe ist, die Umgebung zu bauen, nicht das Organismus.

Starte mit [Hrafn](https://github.com/5queezer/hrafn) und der [MuninnDB persistence layer](https://github.com/5queezer/hrafn). Die genome/phenotype separation ist bereits verkabelt. Was gebaut werden muss, ist der Evaluator, der mit dem System co‑evolviert, das er misst.

*Christian Pojoni builds AI agent infrastructure and writes about it at [vasudev.xyz](https://vasudev.xyz). Current work: [Hrafn](https://github.com/5queezer/hrafn), a Rust-based agent runtime.*

*The cover image for this post was generated by AI.*