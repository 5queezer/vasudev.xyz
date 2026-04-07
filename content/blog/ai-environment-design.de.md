---
title: "Hör mit dem Entwerfen deines KI-Systems auf. Entwirf stattdessen seine Umgebung."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
description: "SelbstentwickelndeKI-Harnischungen scheitern, wenn sie einen festen Bewertungsalgorithmus optimieren. Das biologische Modell hat recht: Was sich entwickeln muss, ist der Selektionsdruck, nicht nur das Genom."
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
translationHash: "5a4c8d555f193cfadfe26c378357502f"
---
Ich habe eine Woche damit verbracht, eine „vektorenative Programmiersprache für LLMs“ zu entwerfen. Die Idee war, das Modellverhalten direkt auf Aktivierungsebene zu programmieren, ohne Prompts, nur mit Interventionsvektoren. Es war intellektuell befriedigend und praktisch falsch. Was ich eigentlich wollte, war keine Sprache. Es war ein Organismus.

**Die Einheit der Evolution ist nicht das Feature. Es ist der Mutations-/Selektionszyklus.**

Diese Unterscheidung verändert alles daran, wie man ein sich selbst weiterentwickelndes KI-Harness aufbaut. Die meisten Systeme, die sich selbst als „selbstverbessernd“ bezeichnen, betreiben im Grunde AutoML. Sie optimieren über einen festen Suchraum hinweg auf ein festes Ziel. Das kann Adaption hervorbringen, steht aber AutoML näher als einer offenen Evolution. Dieser Unterschied erweist sich auf zwei Arten als architektonisch entscheidend.

---

## Genotyp und Phänotyp sind nicht dieselbe Ebene

Biologische Systeme trennen das, was bestehen bleibt, von dem, was selektiert wird. Das Genom wird nicht direkt getestet. Der Phänotyp ist es. Mutationen geschehen im Genom. Selektion geschieht am Phänotyp. Das Genom überlebt, indem es überlebensfähige Phänotypen erzeugt. Diese Asymmetrie ist die Quelle der Evolvierbarkeit selbst.

Ein KI-Harness besitzt eine analoge Struktur, wenn man ihn richtig aufbaut – nicht als wörtliche biologische Entsprechung, sondern als nützliche architektonische Abbildung. Das Genom ist euer persistenter Zustand: Adapter-Gewichte, Abrufrichtlinien, Tool-Konfigurationen, Aktivierungssteuerungsregeln, Codebasis-Patches. Der Phänotyp ist das beobachtbare Verhalten bei Aufgaben. Der Evaluator sieht Verhalten, nicht Interna. Mutationen zielen auf das Genom. Selektion zielt auf den Phänotyp.

Viele selbstverbessernde Agentendesigns lassen diese Unterscheidung zusammenfallen, zumindest implizit. Sie messen Verhalten und editieren dann direkt das, was sie gemessen haben. Das ist, als würde man Organismen evolvieren lassen, indem man ihre Phänotypen editiert. Es verallgemeinert nicht, weil man das Symptom patcht, nicht die Ursache.

Die korrekte Architektur trennt diese Ebenen explizit:

Die **Persistenzschicht** speichert das, was überlebt: Adapter (langfristig), Abruf- und Tool-Richtlinien (mittelfristig), Aktivierungssteuerungsregeln (vergänglich). Die **Mutationsgeneratoren** schlagen Änderungen für die Persistenzschicht vor, nicht direkt für das Verhalten. Der **Evaluator** beobachtet nur das Verhalten und entscheidet, welche Mutationen überleben. Nichts in der Persistenzschicht wird aktualisiert, außer durch diese Filterinstanz.

---

## Der Evaluator ist keine Loss-Funktion

Hier weicht das biologische Denken vom ML-Denken auf eine Weise ab, die für die Architektur relevant ist.

Eine Loss-Funktion ist ein glattes, differenzierbares, lokal definiertes Ziel. Man minimiert sie. Sie geht davon aus, dass die korrekte Antwort bekannt und feststehend ist. Ein Selektionsdruck ist nichts davon. Es ist die Umgebung, und die Umgebung wird nicht von dir entworfen. Es ist alles, was Dinge eliminiert, die nicht damit umgehen können.

Wenn du manuell eine Aufgabenbatterie für dein selbstentwickelndes Harness entwirfst und sie nie änderst, hast du keine Umgebung gebaut. Du hast eine Loss-Funktion mit zusätzlichen Schritten gebaut. Das System wird für diese Batterie optimieren und dann stoppen. Es wird Abkürzungen (Shortcuts) finden, die die Batterie nicht erkennt. Das ist Goodharts Gesetz auf architektonischer Ebene: Sobald eine Metrik zum Ziel wird, hört sie auf, eine gute Metrik zu sein.

Ein statischer Evaluator wird letztlich zu einer Obergrenze. Um robuste Verbesserungen aufrechtzuerhalten, muss sich die Evaluationsumgebung erweitern, diversifizieren oder sich adversariell anpassen. Das bedeutet, dass die Aufgabenbatterie adversarielle Aufgaben benötigt, die speziell darauf ausgelegt sind, oberflächliches Gaming zu erkennen. Sie benötigt Fähigkeitsaufgaben (Kann es die Sache?), Kalibrierungsaufgaben (Weiß es, wann es sie nicht kann?) und Regressionsaufgaben (Hat es das zerstört, was es bereits wusste?). Und sie benötigt mindestens einen Human-in-the-Loop-Evaluationspfad, den das System nicht vorhersagen kann, denn vorhersagbare Evaluatoren werden ausgespielt.

Praktisch heißt das: Beginne mit einer kleinen, festen Batterie, baue aber die Infrastruktur zu ihrer Erweiterung von Anfang an mit. Jede Mutation, die das System beibehält, sollte einen Testfall generieren, der einen Fehler dieser Mutation erkannt hätte. Mit der Zeit wächst die Batterie mit dem System. Das ist Ko-Evolution in ihrer minimal funktionsfähigen Form.

---

## SAE-Steering ist ein Operator, nicht die Grundlage

Sparse Autoencoder können spärliche latente Merkmale offenlegen, von denen viele interpretierbar genug sind, um Verhalten lokal zu steuern, wobei die Merkmalqualität und kausale Spezifität weiterhin aktive Forschungsfragen bleiben. Man kann ein Modell auf ein Konzept zu oder davon weg steuern, indem man während des Forward-Passes einen Merkmalsvektor auf einer bestimmten Schicht addiert oder unterdrückt. Das ist schnell, reversibel und erfordert kein Retraining.

Aber es ist nur eine Operator-Klasse in einem gemischten Aktionsraum. Die Mutationsgeneratoren in einem ernsthaften Harness sollten Vorschläge über mindestens vier Substrate hinweg erstellen. Das erste Substrat sind Prompt- und Abruf-Transformationen: günstig, reversibel, immer der Ausgangspunkt. Das zweite sind Aktivierungssteuerungsregeln: schnell, lokal, mittlere Verbindlichkeit. Das dritte sind Adapter- und LoRA-Updates: aufwändiger, erfordert Training, mittelfristige Persistenz. Das vierte sind Code- und Richtlinien-Edits: höchste Verbindlichkeit, am schwersten rückgängig zu machen.

Nur mit SAE-Steering zu beginnen, ist wie der Bau eines evolutionären Systems, das nur ein Gen mutieren kann. Man erhält schnelle lokale Anpassung und sprödes globales Verhalten. Das System muss in der Lage sein, zu ändern, wie es Kontext abruft, wie es Tools routet und schließlich, wie es Informationen auf Gewicht-Ebene verarbeitet – nicht weil das leistungsstärkere Operatoren sind, sondern weil verschiedene Probleme in verschiedenen Substraten leben.

Die richtige Disziplin lautet: Eine erfolgreiche kostengünstige Intervention sollte nach Möglichkeit in ein günstigeres oder stabileres Substrat übersetzt werden, als Prompt-Transformation, Abrufregel oder Adapter-Update, vorausgesetzt der kausale Effekt übersteht die Übersetzung. Das ist keine Regel nur für die Sicherheit. Es ist eine Regel für Evolvierbarkeit: Das System sollte teuren Mutationen widerstehen, bis günstige die richtige Nachbarschaft gefunden haben.

---

## Wie eine minimal funktionsfähige Loop tatsächlich aussieht

Die Loop besteht aus sechs Phasen. Beobachten. Vorschlagen. Sandboxing. Evaluieren. Gewinner übernehmen (oder alle Kandidaten verwerfen). Such-Prior aktualisieren.

Beobachten bedeutet, das aktuelle Genom gegen die Aufgabenbatterie laufen zu lassen und Verhaltensmetriken aufzuzeichnen. Vorschlagen bedeutet, dass die Suchrichtlinie parallel Kandidatenmutationen generiert, jeweils eine pro Operator-Klasse. Sandboxing bedeutet, dass jeder Kandidat isoliert läuft: kein gemeinsamer Zustand, harte Ressourcenlimits, garantiertes Rollback. Evaluieren bedeutet, das Verhaltensdelta gegenüber der aktuellen Baseline zu bewerten. Übernehmen bedeutet, den Gewinner in die Persistenzschicht zu schreiben, mit vollständiger Provenienz: Vorher/Nachher-Metriken, welche Prompts betroffen waren, welche Operator-Klasse verwendet wurde, sowie Ablauf- und Revalidierungsrichtlinie. Den Such-Prior aktualisieren bedeutet, dass die Bandit- oder evolutionäre Policy lernt, welche Operator-Klassen und welche Regionen des Suchraums Überlebende hervorbringen.

Jede übernommene Mutation benötigt ein Rollback-Handle. Nicht als Sicherheitsfeature. Als Designanforderung. Wenn du eine Mutation nicht rückgängig machen kannst, kannst du ihren marginalen Beitrag nicht messen. Wenn du ihren marginalen Beitrag nicht messen kannst, evolvierst du nicht. Du akkumulierst nur.

---

## Was ich ausgelassen habe

**Selbstmodifikation von Code.** Selbstediting nach dem Muster der Darwin-Gödel-Maschine funktioniert in sandboxierten Coding-Agent-Umgebungen mit formalen Verifizierern. Für ein allgemeines Harness ohne diese Einschränkungen ist es ein Thema für Phase 4, nicht weil es unmöglich ist, sondern weil die notwendige Infrastruktur (stabiler Evaluator, Rollback-Garantien, enger Aufgabenfokus) erst vorhanden sein muss.

**Feature-Universalität.** SAE-Features sind modellspezifisch und manchmal checkpoint-spezifisch. Ob nützliche Features über Modellversionen hinweg transferieren, ist eine offene Forschungsfrage. Das Harness sollte so entworfen sein, dass Feature-Verzeichnisse bei jedem Update des Basismodells neu extrahiert werden, anstatt Stabilität vorauszusetzen.

**Multi-Agent-Evaluatoren.** Die Verwendung eines Judge-Modells als Teil des Evaluationsloops erhöht die Robustheit, schafft aber auch eine adversarielle Angriffsfläche. Das System kann lernen, den Judge zu befriedigen, anstatt die zugrundeliegende Aufgabe zu lösen. Das erfordert explizite Gegenmaßnahmen, die ich noch nicht entworfen habe.

**Compute-Budgetierung.** Eine Mutation, die die Fähigkeit um 2 % verbessert, aber die Latenz verdoppelt, ist kein Gewinn. Latenz und Kosten müssen erstklassige Constraints im Evaluator sein, keine nachträglichen Überlegungen.

---

Die Verbindung zu [Hrafn](https://github.com/5queezer/hrafn) ist direkt. MuninnDB ist die Persistenzschicht. Die Dream Engine, modelliert nach der Gedächtniskonsolidierung in Schlafphasen, ist der Mechanismus, der vergängliche Beobachtungen in mittelfristige Richtlinien überführt. Die fehlenden Teile sind die Suchrichtlinie und der ko-evolvierende Evaluator. Das ist es, was als Nächstes gebaut wird.

Wenn du in diesem Bereich baust, ist das Prior-Wissen, das sich am meisten zu leihen lohnt, nicht aus dem ML. Es stammt aus der Evolutionsbiologie: Die Umgebung übernimmt die Selektion. Deine Aufgabe ist es, die Umgebung zu bauen, nicht den Organismus.

Beginne mit [Hrafn](https://github.com/5queezer/hrafn) und der [MuninnDB-Persistenzschicht](https://github.com/5queezer/hrafn). Die Genotyp/Phänotyp-Trennung ist bereits verdrahtet. Was gebaut werden muss, ist der Evaluator, der mit dem System ko-evolviert, das er misst.

---

*Christian Pojoni baut AI-Agent-Infrastruktur und schreibt darüber auf [vasudev.xyz](https://vasudev.xyz). Aktuelles Projekt: [Hrafn](https://github.com/5queezer/hrafn), eine auf Rust basierende Agent-Runtime.*

*Das Titelbild für diesen Beitrag wurde von einer KI generiert.*