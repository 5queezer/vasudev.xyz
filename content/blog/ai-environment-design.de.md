---
title: "Hören Sie auf, Ihr KI-System zu entwerfen. Entwerfen Sie seine Umgebung."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
description: "Systeme für sich selbst entwickelnde KI scheitern, wenn sie einen statischen Evaluator optimieren. Das biologische Modell hat recht: Was sich entwickeln muss, ist der Selektionsdruck, nicht nur das Genom."
translationHash: "c8114fcd2ab02d4ccab95905304b83ca"
---
Ich habe eine Woche damit verbracht, eine „vektornative Programmiersprache für LLMs“ zu entwerfen. Die Idee war, das Modellverhalten direkt auf der Aktivierungsebene zu programmieren, keine Prompts, nur Interventionsvektoren. Es war intellektuell befriedigend und praktisch falsch. Was ich eigentlich wollte, war keine Sprache. Es war ein Organismus.

**Die Einheit der Evolution ist nicht das Merkmal. Es ist der Mutations-/Selektionszyklus.**

Diese Unterscheidung verändert alles daran, wie man ein sich selbst entwickelndes KI-Framework aufbaut. Die meisten Systeme, die sich selbst als „selbstverbessernd“ bezeichnen, betreiben AutoML. Sie optimieren über einen festen Suchraum hinweg auf ein festes Ziel hin. Das kann Anpassung hervorbringen, aber es steht AutoML näher als offener Evolution. Dieser Unterschied erweist sich auf zweierlei Weise als architektonisch entscheidend.

---

## Genotyp und Phänotyp sind nicht die gleiche Ebene

Biologische Systeme trennen das, was bleibt, von dem, was selektiert wird. Das Genom wird nicht direkt getestet. Der Phänotyp schon. Mutationen geschehen am Genom. Die Selektion betrifft den Phänotypen. Das Genom überlebt, indem es Phänotypen erzeugt, die überleben. Diese Asymmetrie ist die Quelle der Evolvierbarkeit selbst.

Ein KI-Framework besitzt eine analoge Struktur, wenn man es richtig aufbaut, nicht als wörtliche biologische Entsprechung, sondern als nützliche architektonische Abbildung. Das Genom ist Ihr persistenter Zustand: Adapter-Gewichte, Retrieval-Richtlinien, Tool-Konfigurationen, Aktivierungssteuerungsregeln, Codebasis-Patches. Der Phänotyp ist das beobachtbare Verhalten bei Aufgaben. Der Evaluator sieht Verhalten, keine Interna. Mutationen zielen auf das Genom ab. Die Selektion zielt auf den Phänotypen ab.

Viele selbstverbessernde Agentendesigns heben diese Unterscheidung auf, zumindest implizit. Sie messen Verhalten und bearbeiten dann direkt das, was sie gemessen haben. Das ist, als würde man Organismen evolvieren, indem man ihre Phänotypen editiert. Es verallgemeinert sich nicht, weil Sie das Symptom patchen, nicht die Ursache.

Die korrekte Architektur trennt diese Ebenen explizit:

Die **Persistenzschicht** speichert, was überlebt: Adapter (langfristig), Retrieval- und Tool-Richtlinien (mittelfristig), Aktivierungssteuerungsregeln (ephemer). Die **Mutationsgeneratoren** schlagen Änderungen an der Persistenzschicht vor, nicht direkt am Verhalten. Der **Evaluator** beobachtet nur das Verhalten und filtert, welche Mutationen überleben. Nichts in der Persistenzschicht wird aktualisiert, außer durch diesen Filter.

---

## Der Evaluator ist keine Verlustfunktion

Hier unterscheidet sich das biologische Denken vom ML-Denken auf eine Weise, die für die Architektur entscheidend ist.

Eine Verlustfunktion ist ein glattes, differenzierbares, lokal definiertes Optimierungsziel. Sie minimieren sie. Sie geht davon aus, dass die korrekte Antwort bekannt und feststehend ist. Ein Selektionsdruck ist keines von alledem. Er ist die Umwelt, und die Umwelt wird nicht von Ihnen entworfen. Sie ist das, was Dinge tötet, die mit ihr nicht zurechtkommen.

Wenn Sie manuell eine Aufgabenbatterie für Ihr sich selbst entwickelndes Framework entwerfen und diese nie ändern, haben Sie keine Umwelt gebaut. Sie haben eine Verlustfunktion mit ein paar zusätzlichen Schritten gebaut. Das System wird für diese Batterie optimieren und dann stoppen. Es wird Abkürzungen finden, die die Batterie nicht erfasst. Das ist Goodharts Gesetz auf architektonischer Ebene: Sobald eine Kennzahl zum Ziel wird, hört sie auf, eine gute Kennzahl zu sein.

Ein fester Evaluator wird schließlich zur Obergrenze. Um robuste Verbesserungen aufrechtzuerhalten, muss die Evaluationsumwelt wachsen, sich diversifizieren oder sich adversarial anpassen. Das bedeutet, dass die Aufgabenbatterie adversariale Aufgaben benötigt, die speziell darauf ausgelegt sind, oberflächliches Gaming zu erkennen. Sie benötigt Fähigkeitsaufgaben (Kann es die Sache tun?), Kalibrierungsaufgaben (Weiß es, wann es das nicht kann?) und Regressionsaufgaben (Hat es zerstört, was es bereits konnte?). Und sie benötigt mindestens einen Human-in-the-Loop-Evaluationspfad, den das System nicht vorhersagen kann, denn vorhersagbare Evaluatoren werden ausgetrickst.

Praktisch bedeutet das: Beginnen Sie mit einer kleinen, festen Batterie, bauen Sie aber von Anfang an die Infrastruktur, um sie zu erweitern. Jede Mutation, die das System beibehält, sollte einen Testfall generieren, der ein Versagen dieser Mutation hätte aufdecken können. Mit der Zeit wächst die Batterie mit dem System. Das ist Koevolution in ihrer minimal überlebensfähigen Form.

---

## SAE-Steuerung ist ein Operator, nicht das Fundament

Sparse Autoencoder können spärliche latente Merkmale freilegen, von denen viele interpretierbar genug sind, um Verhalten lokal zu steuern, auch wenn Merkmalsqualität und kausale Spezifität weiterhin aktive Forschungsfragen bleiben. Sie können ein Modell auf ein Konzept hin oder davon weg steuern, indem Sie einen Merkmalsvektor während des Forward-Passes an einer bestimmten Schicht hinzufügen oder unterdrücken. Das ist schnell, reversibel und erfordert kein erneutes Training.

Aber es ist nur eine Operator-Klasse in einem gemischten Aktionsraum. Die Mutationsgeneratoren in einem ernsthaften Framework sollten Vorschläge über mindestens vier Substrate hinweg erzeugen. Das erste Substrat sind Prompt- und Retrieval-Transformationen: günstig, reversibel, immer der Ausgangspunkt. Das zweite sind Aktivierungssteuerungsregeln: schnell, lokal, mittlere Bindung. Das dritte sind Adapter- und LoRA-Updates: schwerer, erfordern Training, mittelfristige Persistenz. Das vierte sind Code- und Richtlinien-Edits: höchste Bindung, am schwersten rückgängig zu machen.

Nur mit SAE-Steuerung zu beginnen, ist wie der Bau eines evolutionären Systems, das nur ein Gen mutieren kann. Man erhält schnelle lokale Anpassung und brüchiges globales Verhalten. Das System muss in der Lage sein zu verändern, wie es Kontext abruft, wie es Tools routet und schließlich, wie es Informationen auf Gewichtsebene verarbeitet, nicht weil diese mächtigere Operatoren sind, sondern weil verschiedene Probleme in verschiedenen Substraten existieren.

Die richtige Disziplin lautet: Eine erfolgreiche kostengünstige Intervention sollte nach Möglichkeit in einem günstigeren oder stabileren Substrat neu formuliert werden, als Prompt-Transformation, Retrieval-Regel oder Adapter-Update, vorausgesetzt, die kausale Wirkung übersteht die Übersetzung. Dies ist keine Regel allein für die Sicherheit. Es ist eine Regel für Evolvierbarkeit: Das System sollte teure Mutationen widerstehen, bis günstige die richtige Nachbarschaft gefunden haben.

---

## Wie ein minimal funktionsfähiger Loop tatsächlich aussieht

Der Loop besteht aus sechs Phasen. Beobachten. Vorschlagen. Sandboxen. Bewerten. Sieger beibehalten (oder alle Kandidaten verwerfen). Suchprior aktualisieren.

Beobachten bedeutet, das aktuelle Genom gegen die Aufgabenbatterie laufen zu lassen und Verhaltensmetriken aufzuzeichnen. Vorschlagen bedeutet, dass die Suchrichtlinie Kandidatenmutationen generiert, eine pro Operator-Klasse, parallel. Sandboxen bedeutet, dass jeder Kandidat isoliert läuft: kein gemeinsamer Zustand, harte Ressourcenlimits, Rollback garantiert. Bewerten bedeutet, die Verhaltensänderung gegenüber der aktuellen Baseline zu bewerten. Beibehalten bedeutet, den Sieger in die Persistenzschicht mit vollständiger Provenienz zu schreiben: Vorher-/Nachher-Metriken, welche Prompts betroffen waren, welche Operator-Klasse verwendet wurde, sowie Ablauf- und Revalidierungsrichtlinie. Suchprior aktualisieren bedeutet, dass die Banditen- oder evolutionäre Richtlinie lernt, welche Operator-Klassen und welche Regionen des Suchraums Überlebende produzieren.

Jede beibehaltene Mutation benötigt einen Rollback-Mechanismus. Nicht als Sicherheitsfeature. Als Designanforderung. Wenn Sie eine Mutation nicht rückgängig machen können, können Sie ihren marginalen Beitrag nicht messen. Wenn Sie ihren marginalen Beitrag nicht messen können, findet keine Evolution statt. Nur Akkumulation.

---

## Was ich ausgelassen habe

**Selbstmodifikation von Code.** Selbstbearbeitung im Stil der Darwin-Gödel-Maschine funktioniert in sandboxed Coding-Agent-Szenarien mit formalen Verifizierern. Für ein allgemeines Framework ohne diese Einschränkungen ist es ein Thema für Phase 4, nicht weil es unmöglich wäre, sondern weil die erforderliche Infrastruktur (stabiler Evaluator, Rollback-Garantien, enger Aufgabenumfang) zuerst stehen muss.

**Merkmalsuniversalität.** SAE-Merkmale sind modellspezifisch und manchmal checkpoint-spezifisch. Ob nützliche Merkmale über Modellversionen hinweg transferierbar sind, ist eine offene Forschungsfrage. Das Framework sollte so ausgelegt sein, Merkmalswörterbücher bei jedem Update des Basismodells neu zu extrahieren, anstatt von Stabilität auszugehen.

**Multi-Agenten-Evaluatoren.** Die Verwendung eines Judge-Modells als Teil des Evaluationsloops fügt Robustheit hinzu, schafft aber auch eine adversariale Angriffsfläche. Das System kann lernen, den Judge zufriedenzustellen, anstatt die eigentliche Aufgabe zu lösen. Dafür sind explizite Gegenmaßnahmen nötig, die ich noch nicht entworfen habe.

**Compute-Budgetierung.** Eine Mutation, die die Fähigkeit um 2 % verbessert, aber die Latenz verdoppelt, ist kein Gewinn. Latenz und Kosten müssen erstklassige Einschränkungen im Evaluator sein, kein nachträglicher Gedanke.

---

Die Verbindung zu [Hrafn](https://github.com/5queezer/hrafn) ist direkt. MuninnDB ist die Persistenzschicht. Die Dream Engine, modelliert nach der speicher-konsolidierenden Schlafphase, ist der Mechanismus, der ephemere Beobachtungen in mittelfristige Richtlinien überführt. Die fehlenden Teile sind die Suchrichtlinie und der koevolutionäre Evaluator. Das wird als Nächstes gebaut.

Wenn Sie in diesem Bereich entwickeln, stammt die wichtigste zu übernehmende Annahme (Prior) nicht aus dem ML-Bereich. Sie kommt aus der Evolutionsbiologie: Die Umwelt bestimmt die Selektion. Ihre Aufgabe ist es, die Umwelt zu bauen, nicht den Organismus.

Beginnen Sie mit [Hrafn](https://github.com/5queezer/hrafn) und der [MuninnDB-Persistenzschicht](https://github.com/5queezer/hrafn). Die Trennung von Genotyp und Phänotyp ist bereits implementiert. Was noch gebaut werden muss, ist der Evaluator, der mit dem System, das er misst, koevolviert.

---

*Christian Pojoni entwickelt Infrastruktur für KI-Agente und schreibt darüber auf [vasudev.xyz](https://vasudev.xyz). Aktuelle Arbeit: [Hrafn](https://github.com/5queezer/hrafn), eine auf Rust basierende Agenten-Laufzeitumgebung.*