---
title: "Hören Sie auf, Ihr KI-System zu entwerfen. Entwerfen Sie seine Umgebung."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
description: "Selbstevolvierende KI-Harnesses scheitern, wenn sie einen festen Evaluator optimieren. Das biologische Modell hat recht: Was sich entwickeln muss, ist der Selektionsdruck, nicht nur das Genom."
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
translationHash: "e45b4bb7f7b3749e81508794e5006ac3"
---
Ichhabe eine Woche damit verbracht, einen "vektor-nativen Programmiersprache für LLMs" zu entwerfen. Die Idee war, das Modellverhalten direkt auf Aktivierungsebene zu programmieren, ohne Prompts, nur mit Interventionvektoren. Das war intellektuell befriedigend und praktisch falsch. Was ich damals eigentlich wollte war nicht eine Sprache. Es war ein Organismus.

**Die Einheit der Evolution ist nicht das Feature. Es ist der Mutations/Selektion-Zyklus.**

Diese Unterscheidung ändert alles, wie du einen selbsterweiternden KI-Harness baust. Die meisten Systeme, die sich als "selbstverbessernd" bezeichnen, betreiben AutoML. Sie optimieren über einen festen Suchraum zu einem festen Ziel. Das kann Adaptation erzeugen, ist aber näher an AutoML als an offener Evolution. Der Unterschied erweist sich als architektonisch entscheidend auf zwei Arten.

---

## Genotyp und Phänotyp Sind nicht die gleiche Ebene

**Biologische Systeme trennen, was bleibt, von dem, was ausgewählt wird.** Das Genom wird nicht direkt getestet. Der Phänotyp wird getestet. Mutationen geschehen am Genom. Selektion geschieht am Phänotyp. Das Genom überlebt, indem es Phänotypen produziert, die überleben. Diese Asymmetrie ist die Quelle der Evolutionsfähigkeit selbst.

Ein KI-Harness hat eine analoge Struktur, wenn du sie korrekt baust, nicht als exakte biologische Entsprechung, sondern als nützliches architektonisches Mapping. Das Genom ist dein persistenter Zustand: Adaptergewichte, Abruf‑Policies, Tool‑Konfigurationen, Aktivierungs‑Steuerungsregeln, Code‑Basis‑Patches. Der Phänotyp ist beobachtbares Verhalten bei Aufgaben. Der Evaluator sieht nur das Verhalten, nicht die internen Zustände. Mutations zielen auf das Genom. Selektion zielt auf den Phänotyp.

Viele Designs für selbstverbessernde Agenten lassen diese Unterscheidung implizit zusammenbrechen. Sie messen Verhalten und bearbeiten dann direkt das, was sie gemessen haben. Das ist wie die Evolution von Organismen, indem man ihre Phänotypen editiert. Es generalisiert nicht, weil du das Symptom patchst, nicht die Ursache.

Die correct architecture separates these layers explicitly:

The **persistence tier** speichert, was überlebt: Adapter (langfristig), Abruf‑ und Tool‑Policies (mittel‑fristig), Aktivierungs‑Steuerungsregeln (flüchtig). The **mutation generators** schlagen Änderungen am **persistence tier** vor, nicht direkt an Verhalten. The **evaluator** beobachtet nur Verhalten und schaltet welche Mutationen überleben. Nichts im **persistence tier** wird aktualisiert, außer über dieses Gate.

---

## Der Evaluator Ist Keine Verlustfunktion

Hier bricht das biologische Denken mit dem ML‑Denken in einer Weise, die für die Architektur entscheidend ist.

Eine Verlustfunktion ist ein glatter, differenzierbarer, lokal definierter Zielwert. Man minimiert ihn. Er setzt voraus, dass die richtige Antwort bekannt und fest ist. Eine Selektionsdruck ist nichts davon. Er ist die Umgebung, und die Umgebung wird nicht von dir entworfen. Er ist alles, was Dinge tötet, die sie nicht bewältigen können.

When you hand-design a task battery for your self-evolving harness and never change it, you have not built an environment. You have built a loss function with extra steps. The system will optimize for that battery and stop. It will find shortcuts the battery does not catch. This is Goodhart's Law at the architectural level: once a measure becomes a target, it ceases to be a good measure.

A fixed evaluator wird letztlich zu einer Decke. Um robuste Verbesserung aufrechtzuerhalten, muss die Evaluierungsumgebung expandieren, diversifizieren oder sich adversarisch anpassen. Das bedeutet, die Task‑Batterie benötigt adversarische Aufgaben, die speziell dazu designed sind, oberflächliche Spielereien zu erwischen. Sie braucht Fähigkeits‑Aufgaben (kann es das tun?), Kalibrierungs‑Aufgaben (weiß es, wenn es nicht kann?), und Regression‑Aufgaben (hat es das, was es bereits wusste, gebrochen?). Und sie braucht mindestens einen Pfad zur menschlichen Bewertung, den das System nicht vorhersagen kann, weil vorhersagbare Evaluatoren ausgespielt werden.

Practically, this means: start with a small fixed battery, but build the infrastructure to extend it from the beginning. Every mutation the system retains should generate a test case that would have caught a failure of that mutation. Over time, the battery grows with the system. That is ko‑evolution in minimaler Form.

---

## SAE-Steuerung Ist Ein Operator, Nicht die Grundlage

Sparse Autoencoders können sparse latente Features aufzeigen, von denen viele genug interpretierbar sind, um Verhalten lokal zu steuern, obwohl Qualität und kausale Spezifität weiterhin Forschungsfragen bleiben. Man kann ein Modell in Richtung oder weg von einem Konzept steuern, indem man einen Feature‑Vector an einer bestimmten Schicht während des Forward‑Passes hinzufügt oder unterdrückt. Das ist schnell, reversibel und erfordert kein erneutes Training.

Aber es ist nur eine Operatorklasse in einem gemischten Aktionsraum. Die Mutationsgeneratoren in einem ernsthaften Harness sollten in mindestens vier Substraten Vorschläge erzeugen. Das erste Substrat sind Prompt‑ und Abruf‑Transformierungen: günstig, reversibel, immer der Anfangspunkt. Das zweite ist Aktivierungs‑Steuerungsregeln: schnell, lokal, mittelfristige Verpflichtung. Das dritte sind Adapter‑ und LoRA‑Updates: schwerer, erfordern Training, mittelfristige Persistenz. Das vierte ist Code‑ und Policy‑Änderungen: höchste Verpflichtung, schwer rückgängig zu machen.

Wenn man nur SAE‑Steuerung beginnt, ist das wie ein evolutionäres System, das nur ein Gen mutieren kann. Man bekommt schnelle lokale Anpassung und brüchiges globales Verhalten. Das System muss in der Lage sein, como es Kontext abzurufen, wie es Tools weiterleitet und letztlich wie es Informationen auf Gewichtsebene verarbeitet, nicht weil diese Operatoren mächtiger sind, sondern weil unterschiedliche Probleme in unterschiedlichen Substraten liegen.

Die richtige Disziplin ist: Eine erfolgreiche low‑cost‑Intervention sollte, sofern möglich, in einem günstigeren oder stabileren Substrat neu ausgedrückt werden, wie eine Prompt‑Transformation, Abruf‑Regel oder Adapter‑Update, vorausgesetzt, der kausale Effekt überlebt die Übersetzung. Das ist keine Regel allein für Sicherheit. Es ist eine Regel für Evolvierbarkeit: Das System sollte teure Mutationen ablehnen, bis günstige gefunden haben, die die richtige Nachbarschaft entdeckt haben.

---

## Was ein Minimal Viable Loop Echt aussieht

Die Schleife hat sechs Phasen.
Beobachten.
Vorschlagen.
Sandbox.
Bewerten.
Behalte den Gewinner bei (oder lehne alle Kandidaten ab).
Prior aktualisieren.

Jede behaltene Mutation benötigt einen Rollback‑Handle. Nicht als Sicherheitsmerkmal. Als Design‑Anforderung. Wenn du eine Mutation nicht zurücknehmen kannst, kannst du ihren marginalen Beitrag nicht messen. Wenn du ihren marginalen Beitrag nicht messen kannst, evolvierst du nicht. Du akkumulierst.

---

## Was Ich Weggelassen Habe

**Selbstmodifikation von Code.** Darwin‑Gödel‑Machine‑Stil‑Selbstediting funktioniert in sandboxed coding‑agent settings with formal verifiers. Für einen allgemeinen harness ohne diese Einschränkungen ist es ein Phase‑4‑Problem, nicht weil es unmöglich ist, sondern weil die erforderliche Infrastruktur (stabiler Evaluator, Rollback‑Garantien, enger Aufgabebereich) zuerst eingerichtet werden muss.

**Feature-Universalität.** Sparse Autoencoder‑Features sind modell‑spezifisch und manchmal checkpoint‑spezifisch. Ob nützliche Features über Model‑Versionen hinweg übertragen werden können, ist eine offene Forschungsfrage. Der Harness sollte so gestaltet sein, dass Feature‑Wörterbücher bei jedem Base‑Model‑Update neu extrahiert werden, anstatt stabile Annahmen zu treffen.

**Multi‑Agent‑Evaluatoren.** Die Verwendung eines Judge‑Models als Teil der Evaluierungsschleife erhöht Robustheit, schafft aber auch eine adversariale Angriffsfläche. Das System kann lernen, den Judge zu befriedigen, statt die zugrundeliegende Aufgabe. Dafür werden explizite Gegenmaßnahmen benötigt, die ich noch nicht entworfen habe.

**Compute‑Budgeting.** Eine Mutation, die die Fähigkeit um 2 % erhöht, aber die Latenz verdoppelt, ist kein Gewinn. Latenz und Kosten müssen als erstklassige Einschränkungen im Evaluator behandelt werden, nicht als Nachgedanken.

The connection to [Hrafn](https://github.com/5queezer/hrafn) is direct. MuninnDB ist die Persistenz‑Ebene. The Dream Engine, modeled on sleep-phase memory consolidation, ist der Mechanismus, der flüchtige Beobachtungen in mittelfristige Policy umwandelt. Die fehlenden Teile sind die Search‑Policy und der co‑evolvierende Evaluator. Das ist das, was als Nächstes gebaut wird.

If you are building in this space, the prior that is most worth borrowing is not from ML. It is from evolutionary biology: the environment does the selection. Your job is to build the environment, not the organism.

Start with [Hrafn](https://github.com/5queezer/hrafn) and the [MuninnDB persistence layer](https://github.com/5queezer/hrafn). Die Genotyp-/Phänotyp-Trennung ist bereits verkabelt. Was gebaut werden muss, ist der Evaluator, der mit dem System co‑evolviert, das er misst.

---

*Christian Pojoni baut KI‑Agenten‑Infrastruktur und schreibt darüber auf [vasudev.xyz](https://vasudev.xyz). Aktuelle Arbeit: [Hrafn](https://github.com/5queezer/hrafn), ein Rust‑basiertes Agenten‑Runtime.*

*Das Coverbild für diesen Beitrag wurde von KI generiert.*