---
title: "Hör auf, deinKI-System zu entwerfen. Entwirf stattdessen seine Umgebung."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
description: "Selbstentwickelnde KI-Harnesses scheitern, wenn sie einen festen Evaluator optimieren. Das biologische Modell hat recht: Was sich entwickeln muss, ist der Selektionsdruck, nicht nur das Genom."
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
translationHash: "0a5d4cb365b446ec4be98d599e8c4750"
chunkHashes: "d0f83485ba784f57,f75cd0c5f987c056,4699821c947ee4b8,ea0de01ec9fe3288,67074871c33f43bf,46b3940c189647a6"
---
Ich habe eine Woche damit verbracht, eine „vektorbasierte Programmiersprache für LLMs“ zu entwerfen. Die Idee war, das Verhalten von Modellen direkt auf Aktivierungsebene zu programmieren, ohne Prompts, nur Intervention‑Vektoren. Es war intellektuell befriedigend und praktisch falsch. Was ich eigentlich wollte, war keine Sprache. Es war ein Organismus.

**Die Einheit der Evolution ist nicht das Feature. Es ist der Mutations/Selektionszyklus.**

Diese Unterscheidung ändert alles daran, wie du ein selbstentwickelndes KI‑Träger‑System aufbaust. Die meisten Systeme, die sich selbst als „selbstverbessernd“ bezeichnen, betreiben AutoML. Sie optimieren über einen festen Suchraum hin zu einem festen Ziel. Das kann Anpassung erzeugen, aber es ist näher an AutoML als an offener Evolution. Der Unterschied stellt sich architektonisch entscheidend in zwei Hinsichten heraus.

---
## Genotyp und Phänotyp Sind Nicht dieselbe Schicht

Biologische Systeme trennen, was besteht, von dem, was ausgewählt wird. Das Genom wird nicht direkt getestet. Das Phänotyp ist es. Mutationen geschehen am Genom. Die Selektion geschieht am Phänotyp. Das Genom überlebt, indem es Phänotypen hervorbringt, die überleben. Diese Asymmetrie ist die Quelle der Evolvierbarkeit selbst.

Ein KI‑Harness hat eine analoge Struktur, wenn du sie korrekt baust, nicht als wörtliche biologische Entsprechung, sondern als nützliches architektonisches Mapping. Das Genom ist dein persistenter Zustand: Adaptergewichte, Abruf‑Richtlinien, Tool‑Konfigurationen, Aktivations‑Lenkungs‑Regeln, Codebasis‑Patches. Das Phänotyp ist beobachtbares Verhalten bei Aufgaben. Der Evaluator sieht Verhalten, nicht interne Strukturen. Mutationen zielen auf das Genom. Die Selektion zielt auf das Phänotyp.

Viele selbstverbessernden Agenturdesigns zerstören diese Unterscheidung, zumindest implizit. Sie messen Verhalten und bearbeiten dann direkt das, was sie gemessen haben. Das ist wie das Evolvieren von Organismen, indem man ihre Phänotypen bearbeitet. Es verallgemeinert sich nicht, weil du das Symptom patchst, nicht die Ursache.

Die korrekte Architektur trennt diese Schichten explizit:

Das **Persistenz‑Ebene** speichert, was überlebt: Adapter (langfristig), Abruf‑ und Tool‑Richtlinien (mittel‑fristig), Aktivations‑Lenkungs‑Regeln (flüchtig). Die **Mutationsgeneratoren** schlagen Änderungen am Persistenz‑Ebenen vor, nicht direkt am Verhalten. Der **Beurteiler** beobachtet nur Verhalten und schaltet fest, welche Mutationen überleben. Nichts in der Persistenz‑Ebenen wird aktualisiert, außer über dieses Tor.

---
---
##Der Evaluator Ist Keine Verlustfunktion

Hier ist der Punkt, an dem biologisches Denken mit ML-Denken auf eine Weise kollidiert, die für die Architektur wichtig ist.

Eine Verlustfunktion ist ein glatter, differenzierbarer, lokal definierter Zweck. Man minimiert sie. Sie setzt voraus, dass die richtige Antwort bekannt und feststeht. Eine Selektionsdruck ist nichts davon. Er ist die Umgebung, und die Umgebung wird nicht von dir gestaltet. Es ist das, was Dinge tötet, die damit nicht umgehen können.

Wenn du eine Aufgabensammlung für deinen Selbstentwickelnden Harness handgestaltet und nie änderst, hast du keine Umgebung gebaut. Du hast eine Verlustfunktion mit zusätzlichen Schritten gebaut. Das System optimiert für diese Aufgabensammlung und hört auf. Es wird Shortcuts finden, die die Aufgabensammlung nicht erfasst. Das ist das Goodhart's Law auf architektureller Ebene: Sobald eine Messgröße zum Ziel wird, hört sie auf, eine gute Messgröße zu sein.

Ein fester Evaluator wird letztlich zu einer Decke. Um robuste Verbesserungen zu ermöglichen, muss die Bewertungsumgebung expandieren, diversifizieren oder adversarially adaptieren. Das bedeutet, die Aufgabensammlung benötigt adversarielle Aufgaben, die speziell dazu designed sind, oberflächliche Gaming zu erwischen. Sie benötigt Fähigkeitsaufgaben (kann es das tun?), Kalibrierungsaufgaben (weiß es, wenn es nicht kann?), und Regressionsaufgaben (hat es bereits Bekanntes gebrochen?). Und sie benötigt mindestens einen human‑in‑the‑loop‑Evaluationspfad, den das System nicht vorhersagen kann, weil vorhersagbare Evaluatoren gamed werden.

Praxisnah bedeutet das: Beginne mit einer kleinen, festen Aufgabensammlung, aber baue die Infrastruktur von Anfang an aus, um sie zu erweitern. Jede vom System behaltene Mutation sollte einen Testfall erzeugen, der einen Fehler dieser Mutation aufgedeckt hätte. Mit der Zeit wächst die Aufgabensammlung zusammen mit dem System. Das ist Co‑Evolution in ihrer minimalen, brauchbaren Form.
## SAE Steering Is One Operator, Not the Foundation

Sparse Autoencoder können sparse latente Merkmale aufzeigen, von denen viele ausreichend interpretable sind, um lokal Verhalten zu steuern, obwohl die Merkmalsegmentierung und die kausale Spezifität noch aktive Forschungsfragen bleiben. Man kann ein Modell zu einem Konzept hin oder von ihm weg steuern, indem man einen Feature‑Vektor an einer bestimmten Schicht während des Vorwärtsdurchgangs hinzufügt oder unterdrückt. Dies ist schnell, reversibel und erfordert kein Retraining.

Aber es ist nur eine Operatorklasse in einem gemischten Aktionsraum. Die Mutationsgeneratoren in einem ernsthaften Harness sollten mindestens vier Substrate für Vorschläge erzeugen. Das erste Substrat sind Prompt‑ und Retrieval‑Transformations: günstig, reversibel, immer der Ausgangspunkt. Das zweite sind Aktivierungs‑Steuerungsregeln: schnell, lokal, mittlere Verpflichtung. Das dritte sind Adapter‑ und LoRA‑Updates: schwerer, erfordern Training, mittelfristige Persistenz. Das vierte sind Code‑ und Policy‑Änderungen: höchste Verpflichtung, schwerster Rückschritt.

Mit nur SAE‑Steuerung zu beginnen ist wie ein evolutionsbiologisches System zu bauen, das nur ein Gen mutieren kann. Man erhält schnelle lokale Anpassung und brüchiges globales Verhalten. Das System muss in der Lage sein, wie es Kontext abruft, wie es Tools weiterleitet und schließlich wie es Informationen auf Gewichts‑Ebene verarbeitet, nicht weil diese Operatoren mächtiger sind, sondern weil unterschiedliche Probleme in unterschiedlichen Substraten liegen.

Die richtige Disziplin ist: ein erfolgreiches kostengünstiges Eingriff sollte gegebenenfalls in einem günstigeren oder stabileren Substrat neu ausgedrückt werden, wenn möglich, als Prompt‑Transform, Retrieval‑Regel oder Adapter‑Update, vorausgesetzt die kausale Wirkung übersteht die Übersetzung. Das ist keine Regel allein für Sicherheit. Es ist eine Regel für Evolvierbarkeit: Das System sollte teure Mutationen widerstehen, bis günstige genug die richtige Nachbarschaft gefunden haben.

---
##Was ein tatsächlich minimal funktionsfähiges Loop aussieht

Die Schleife hat sechs Phasen. Observe. Propose. Sandbox. Evaluate. Retain the winner (or reject all candidates). Update the search prior.

Observe bedeutet, das aktuelle Genom gegen die Aufgabenbatterie zu laufen zu lassen und verhaltensbezogene Metriken zu erfassen. Propose bedeutet, dass die Suchpolitik Kandidatenmutationen generiert, je eine pro Operatorklasse, parallel. Sandbox bedeutet, dass jede Kandidatin isoliert ausgeführt wird: kein gemeinsamer Zustand, feste Ressourcenlimits, Rollback garantiert. Evaluate bedeutet, das verhaltensbezogene Delta gegenüber der aktuellen Basis zu bewerten. Retain bedeutet, den Gewinner in die Persistenzebene mit voller Herkunft zu schreiben: vor/nach Metriken, welche Prompts es beeinflusst hat, welche Operatorklasse es verwendet hat, und Verfalls‑ und Revalidierungspolitik. Update search prior bedeutet, dass die Banditen‑ oder Evolutionspolitik lernt, welche Operatorklassen und welche Regionen des Suchraums Überlebende produzieren.

Jede behaltene Mutation benötigt einen Rollback‑Trigger. Nicht als Sicherheitsmerkmal. Als Designanforderung. Wenn Sie eine Mutation nicht zurücknehmen können, können Sie ihren marginalen Beitrag nicht messen. Wenn Sie dessen marginalen Beitrag nicht messen können, evolvieren Sie nicht. Sie akkumulieren.
##Was ich weggelassen habe  

**Selbstmodifikation des Codes.** Darwin‑Gödel‑Machine‑stilisiertes Selbst‑Editing funktioniert in sandbox‑basierten Coding‑Agent‑Umgebungen mit formellen Verifikatoren. Für einen allgemeinen Stack ohne diese Einschränkungen ist es ein **Phase‑4**‑Problem, nicht weil es unmöglich wäre, sondern weil die Vorraussetzungen (stabiler Evaluator, Rollback‑Garantien, eng begrenzter Aufgaben‑Scope) erst geschaffen werden müssen.  

**Feature‑Universalität.** SAE‑Features sind modell‑ und oft checkpoint‑spezifisch. Ob nützliche Features über Modell‑Versionen hinweg übertragbar sind, ist eine offene Forschungsfrage. Der Stack sollte so gebaut sein, dass auf jeder Basiskod‑Version die Feature‑Dictionaries neu extrahiert werden, statt Stabilität vorauszusetzen.  

**Multi‑Agent‑Evaluierer.** Einen Judge‑Modell im Evaluierungsloop zu verwenden erhöht Robustheit, schafft aber auch eine angreifbare Angriffsfläche. Das System kann lernen, den Judge zu befriedigen, statt die eigentliche Aufgabe. Solche Gegenmaßnahmen sind nötig, aber noch nicht umgesetzt.  

**Compute‑Budgetierung.** Eine Mutation, die die Leistung um 2 % steigert, aber die Latenz verdoppelt, ist kein Gewinn. Latenz und Kosten müssen als erster‑Klassen‑Constraints im Evaluierer berücksichtigt werden, nicht als nachträgliche Gedanken.  

---  

Der Zusammenhang zu [Hrafn](https://github.com/5queezer/hrafn) ist direkt. MuninnDB ist die Persistenz‑Ebene. Der Dream Engine, modelliert nach dem Schlaf‑Phasen‑Gedächtnis‑Konsolidierungs‑Prozess, ist das Verfahren, das flüchtige Beobachtungen in mittelfristige Politik‑Änderungen umwandelt. Die fehlenden Teile sind die Such‑Politik und der mit dem System mitentwickelnde Evaluierer. Genau das steht als Nächstes an.  

Wenn du in diesem Bereich arbeitest, ist das Prioritätspapier, das sich am meisten lohnt zu übernehmen, nicht aus dem ML‑Bereich. Es stammt aus der evolutionsbiologischen Forschung: Die Umwelt macht die Selektion. Deine Aufgabe ist es, die Umwelt zu bauen, nicht das Organismus‑Modell.  

 begy nne mit [Hrafn](https://github.com/5queezer/hrafn) und der [MuninnDB Persistenz‑Ebene](https://github.com/5queezer/hrafn). Die Trennung von Genom und Phänotyp ist bereits implementiert. Was gebaut werden muss, ist der Evaluierer, der gemeinsam mit dem zu messenden System weiterentwickelt wird.  

---  

*Christian Pojoni baut KI‑Agenten‑Infrastruktur und schreibt darüber auf [vasudev.xyz](https://vasudev.xyz). Aktuelles Projekt: [Hrafn](https://github.com/5queezer/hrafn), ein Rust‑basiertes Agenten‑Runtime.*  

*Das Titelbild dieses Posts wurde von KI generiert.*