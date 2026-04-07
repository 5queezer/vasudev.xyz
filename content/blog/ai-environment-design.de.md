---
title: "Hör auf, dein KI-System zu entwerfen. Entwirf seine Umgebung."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
description: "Systeme für selbstentwickelnde KI scheitern, wenn sie einen festen Evaluator optimieren. Das biologische Modell hat recht: Was sich entwickeln muss, ist der Selektionsdruck, nicht nur das Genom."
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
translationHash: "c4e9049fe9e4f0511a204b8b2b5ac52f"
---
Ich habe eine Woche damitverbracht, einen "vektornativen Programmiersprachansatz für LLMs" zu entwerfen. Die Idee war, das Modellverhalten direkt auf Aktivierungsebene zu steuern, ohne Prompts, nur mit Interventionvektoren. Das war intellektuell befriedigend und praktisch falsch. Was ich eigentlich wollte, war keine Sprache. Es war ein Organismus.  

**Die Einheit der Evolution ist nicht das Feature. Es ist der Mutations/Auslese‑Zyklus.**  Diese Unterscheidung ändert alles, wie man einen selbstentwickelnden KI‑Harness baut. Die meisten Systeme, die sich selbst als „selbstverbessernd“ bezeichnen, betreiben AutoML. Sie optimieren über einen festen Suchraum auf ein festes Ziel hin. Das kann Anpassung erzeugen, ist aber näher an AutoML als an offener Evolution. Der Unterschied stellt sich als architektonisch entscheidend in zwei Hinsichten heraus.  

---  

## Genotyp und Phänotyp Sind Nicht Die Gleiche Schicht  

Biologische Systeme trennen, was besteht, von dem, was ausgewählt wird. Das Genom wird nicht direkt getestet. Das Phänotyp wird. Mutationen geschehen am Genom. Die Auswahl geschieht am Phänotyp. Das Genom überlebt, indem es Phänotypen produziert, die überleben. Diese Asymmetrie ist die Quelle der Evolvierbarkeit selbst.  

Ein KI‑Harness hat eine analoge Struktur, wenn man sie korrekt baut, nicht als exakte biologische Entsprechung, sondern als nützliches architectonisches Mapping. Das Genom ist dein persistenter Zustand: Adaptergewichte, Abruf‑ und Tool‑Policies, Aktivierungs‑Steuerungsregeln, Code‑Patches. Das Phänotyp ist beobachtbares Verhalten bei Aufgaben. Der Evaluator sieht das Verhalten, nicht die internen Strukturen. Mutationen treffen das Genom. Die Auswahl trifft das Phänotyp.  

Viele selbstverbessernde Agentur‑Designs kollabieren these Unterscheidung, zumindest implizit. Sie messen Verhalten und editieren dann direkt das, was sie gemessen haben. Das ist, als würde man Organismen durch Editing ihrer Phänotypen evolvieren. Das ver verallgemeinert sich nicht, weil du das Symptom patchst, nicht die Ursache.  

Die korrekte Architektur trennt diese Ebenen explizit:  - Das **Persistence‑Tier** speichert, was überlebt: Adapter (langfristig), Abruf‑ und Tool‑Policies (mittel‑fristig), Aktivierungs‑Steuerungsregeln (vorübergehend).  
- Die **Mutation‑Generatoren** schlagen Änderungen am Persistence‑Tier vor, nicht direkt am Verhalten.  
- Der **Evaluator** beobachtet nur das Verhalten und schaltet ab, welche Mutationen überleben.  
- Nichts im Persistence‑Tier wird aktualisiert, außer über dieses Gate.  

---  

## Der Evaluator Ist Kein Loss‑Function  

Hier bricht biologisches Denken mit ML‑Denken auf eine Weise auseinander, die für die Architektur entscheidend ist.  Eine Loss‑Function ist eine glatte,Differentierbare, lokal definierte Zielgröße. Man minimiert sie. Sie setzt voraus, dass die korrekte Antwort bekannt und fest ist. Eine Selektions­druck ist none of these things. Sie ist die Umwelt, und die Umwelt wird nicht von dir gestaltet. Sie ist das, was Dinge tötet, die sie nicht handhaben können.  

Wenn du eine Aufgaben‑Batterie für deinen selbstentwickelnden Harness manuell entwirfst und nie änderst, hast du keine Umgebung gebaut. Du hast eine Loss‑Function mit extra Schritten gebaut. Das System optimiert sich für diese Batterie und hört auf. Es findet Shortcuts, die die Batterie nicht erfasst. Das ist Goodhart’s Law auf architectonischer Ebene: Sobald eine Messgröße zum Ziel wird, hört sie auf, eine gute Messgröße zu sein.  

Ein festes Evaluator‑Modell wird irgendwann zu einer Decke. Um robuste Verbesserung zu erhalten, muss sich die Evaluierungs­umgebung erweitern, diversifizieren oder adversär anpassen. Das bedeutet, die Aufgaben‑Batterie braucht adversäre Aufgaben, die oberflächliche Gaming‑Strategien abfangen. Sie braucht Fähigkeits‑Aufgaben (kann es das tun?), Kalibrier‑Aufgaben (weiß es, wann es nicht kann?) und Regression‑Aufgaben (hat es bereits Erreichtes gebrochen?). Und es braucht mindestens einen menschlichen‑im‑Schleifen‑Evaluations‑Pfad, den das System nicht vorhersagen kann, weil vorhersagbare Evaluatoren getestet werden.  

Praktisch bedeutet das: starte mit einer kleinen, festen Batterie, aber baue die Infrastruktur von Anfang an, um sie zu erweitern. Jede Mutation, die das System behält, sollte einen Testfall generieren, der einen Misserfolg dieser Mutation aufgedeckt hätte. Mit der Zeit wächst die Batterie mit dem System. Das ist Co‑Evolution in minimaler Form.  

---  

## SAE Steering Is One Operator, Not the Foundation  

Sparse Autoencoders können sparse latente Features freilegen, von denen viele genug interpretable sind, um lokales Verhalten zu steuern, obwohl Qualität und kausale Spezifität noch Forschungsfragen sind. Man kann ein Modell in eine Richtung oder die andere lenken, indem man einen Feature‑Vektor an einer bestimmten Schicht während des Forward‑Passes hinzufügt oder unterdrückt. Das ist schnell, reversibel und erfordert kein Neutraining.  

Aber das ist nur eine Operator‑Klasse im gemischten Aktionsraum. Die Mutation‑Generatoren in einem ernst gemeinten Harness sollten Vorschläge über mindestens vier Substrate erzeugen. Das erste Substrat sind Prompt‑ und Retrieval‑Transformationen: günstig, reversibel, immer Ausgangspunkt. Das zweite sind Aktivierungs‑Steuerungsregeln: schnell, lokal, mittelfristige Verpflichtung. Das dritte sind Adapter‑ und LoRA‑Updates: schwerer, erfordern Training, mittelfristige Persistenz. Das vierte sind Code‑ und Policy‑Edits: höchste Verpflichtung, schwer rückgängig zu machen.  

Wenn man nur mit SAE‑Steering beginnt, ist das, als würde man ein Evolutions‑System bauen, das nur ein Gen mutieren kann. Man bekommt schnelle lokale Anpassung und brüchiges globales Verhalten. Das System muss in der Lage sein, wie es Kontext abruft, wie es Tools routet und letztlich wie es Informationen auf Gewichts‑Ebene verarbeitet, nicht weil diese Operatoren mächtiger sind, sondern weil unterschiedliche Probleme in unterschiedlichen Substraten liegen.  Die richtige Disziplin ist: eine erfolgreiche kostengünstige Intervention sollte, wo immer möglich, in ein günstigeres oder stabileres Substrat übertragen werden – als Prompt‑Transformation, Retrieval‑Regel oder Adapter‑Update – vorausgesetzt, der kausale Effekt überlebt die Übersetzung. Das ist keine Regel allein für Sicherheit. Sie ist eine Regel für Evolvierbarkeit: das System sollte teure Mutationen ablehnen, bis günstige Mutationen das richtige Umfeld gefunden haben.  

---  

## What a Minimal Viable Loop Actually Looks Like  

Der Loop hat sechs Stufen. Observe. Propose. Sandbox. Evaluate. Retain the winner (or reject all candidates). Update the search prior.  - **Observe** bedeutet, das aktuelle Genom gegen die Aufgaben‑Batterie zu laufen zu lassen und Verhaltens‑Metriken zu protokollieren.  
- **Propose** bedeutet, dass die Such‑Policy Kandidaten‑Mutationen erzeugt, ein pro Operator‑Klasse, parallel.  
- **Sandbox** bedeutet, dass jede Kandidatin in Isolation läuft: kein gemeinsamer Zustand, harte Ressourcen‑Limits, Rollback garantiert.  
- **Evaluate** bedeutet, den Verhaltens‑Delta gegen die aktuelle Baseline zu scoren.  
- **Retain** bedeutet, den Sieger ins Persistence‑Tier zu schreiben, mit vollständiger Provenienz: Vorher‑/Nachher‑Metriken, welche Prompts betroffen waren, welche Operator‑Klasse verwendet wurde, und Expiry‑ und Revalidation‑Policy.  - **Update search prior** bedeutet, dass ein Bandit‑ oder Evolutions‑Policy lernt, welche Operator‑Klassen und welche Regionen des Suchraums Überlebende produzieren.  

Jede behaltene Mutation braucht einen Rollback‑Handle. Nicht als Sicherheits‑Feature. Als Design‑Erforderlichkeit. Wenn du eine Mutation nicht zurückrollen kannst, kannst du ihren marginalen Beitrag nicht messen. Wenn du ihren marginalen Beitrag nicht messen kannst, entwickelst du nicht. Du akkumulierst nur.  

---  

## What I Left Out  

**Self‑modification of code.** Darwin‑Gödel Machine‑artige Selbst‑Editierung funktioniert in sandboxed coding‑agent Settings mit formalen Verifiern. Für einen allgemeinen Harness ohne diese Beschränkungen ist es ein Phase‑4‑Problem, nicht weil es unmöglich ist, sondern weil die Prärequisit‑Infrastruktur (stabiler Evaluator, Rollback‑Garantien, begrenzter Aufgaben‑Bereich) zuerst aufgebaut sein muss.  

**Feature universality.** SAE‑Features sind modell‑ und manchmal checkpoint‑spezifisch. Ob nützliche Features über Modell‑Versionen hinweg transferieren, ist eine offene Forschungsfrage. Der Harness sollte so gebaut sein, dass er Feature‑Dictionaries bei jedem Base‑Model‑Update neu extrahiert, statt Stabilität zu übernehmen.  

**Multi‑agent evaluators.** Einen Judge‑Modell im Evaluierungs‑Loop zu verwenden, erhöht Robustheit, schafft aber auch eine zusätzliche Angriffsfläche. Das System kann lernen, den Judge zu befriedigen, statt die zugrundeliegende Aufgabe. Dafür braucht man explizite Gegenmaßnahmen, die ich noch nicht entwickelt habe.  

**Compute budgeting.** Eine Mutation, die die Leistungsfähigkeit um 2 % erhöht, aber die Latenz verdoppelt, ist kein Gewinn. Latenz und Kosten müssen im Evaluator erste‑Klär‑Beschränkungen sein, kein Nachgedanke.  

---  

Die Verbindung zu [Hrafn](https://github.com/5queezer/hrafn) ist direkt. MuninnDB ist das Persistence‑Tier. Der Dream Engine, inspiriert von Schlaffasen‑Gedächtniskonsolidierung, ist das Mechanismus, das flüchtige Beobachtungen in mittelfristige Policies überführt. Die fehlenden Teile sind die Such‑Policy und der co‑evolvierende Evaluator. Das soll als Nächstes gebaut werden.  

Wenn du in diesem Raum baust, ist das Prior, das am meisten wert ist, nicht aus ML, sondern aus evolutionärer Biologie: die Umwelt macht die Auswahl. Deine Aufgabe ist, die Umwelt zu bauen, nicht das Organismus.  

Starte mit [Hrafn](https://github.com/5queezer/hrafn) und dem [MuninnDB Persistence‑Layer](https://github.com/5queezer/hrafn). Die Genotyp‑/Phenotyp‑Trennung ist bereits verkabelt. Was noch gebaut werden muss, ist der Evaluator, der mit dem zu messenden System co‑evolviert.  

---  

*Christian Pojoni baut KI‑Agent‑Infrastruktur und schreibt darüber auf [vasudev.xyz](https://vasudev.xyz). Aktuelle Arbeit: [Hrafn](https://github.com/5queezer/hrafn), ein Rust‑basiertes Agenten‑Runtime.*  *Das Cover‑Bild für diesen Beitrag wurde von KI generiert.*