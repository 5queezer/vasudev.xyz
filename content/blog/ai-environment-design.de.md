---
title: "Hör auf,dein AI-System zu entwerfen. Entwerfe seine Umgebung."
date: 2026-04-04
tags: ["ai", "agents", "architecture", "mechanistic-interpretability", "llm", "hrafn"]
series: ["Building Agents That Sleep"]
series_weight: 6
description: "Selbstentwickelnde KI-Harnesses scheitern, wenn sie einen festen Evaluator optimieren. Das biologische Modell liegt richtig: Was sich entwickeln muss, ist der Selektionsdruck, nicht nur das Genom."
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
images: ["/images/ai-environment-design-og.png"]
translationHash: "ab8226124574242386745f7c5e6873af"
chunkHashes: "df9a169530aeaf1d,f75cd0c5f987c056,4699821c947ee4b8,ea0de01ec9fe3288,67074871c33f43bf,46b3940c189647a6"
---
Ichhabe eine Woche damit verbracht, eine „vectorspezifische Programmiersprache für LLMs“ zu entwerfen. Die Idee war, Modellverhalten direkt auf Aktivierungsebene zu programmieren, ohne Prompts, nur mit Interventionvektoren. Das war intellektuell befriedigend und praktisch falsch. Dabei wollte ich nicht nur eine Sprache. Es war ein Organismus.

**Die Einheit der Evolution ist nicht das Feature. Es ist der Mutations-/Selektion-Zyklus.**

Diese Unterscheidung ändert alles daran, wie du einen selbst-evolvierenden KI-Harness baust. Die meisten Systeme, die sich selbst als „self-improving“ bezeichnen, betreiben AutoML. Sie optimieren über einen festen Suchraum einem festen Ziel entgegen. Das kann Anpassung hervorbringen, ist aber näher an AutoML als an open-ended evolution. Der Unterschied ist architektonisch entscheidend in zwei Hinsichten.
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

##SAE Steering Ist kein Operator, sondern die Grundlage

Sparse Autoencoders können sparse latente Merkmale freilegen, von denen viele genug interpretierbar sind, um das Verhalten lokal zu steuern, obwohl Merkmalsqualität und kausale Spezifität weiterhin aktive Forschungsfragen bleiben. Man kann ein Modell einem Konzept zu oder davon weg steuern, indem man einen Feature-Vektor in einer bestimmten Schicht während des Vorwärtspasses hinzufügt oder unterdrückt. Das ist schnell, reversibel und erfordert kein Neutraining.

Aber es ist nur eine Operatorklasse in einem gemischten Aktionsraum. Die Mutationsgeneratoren in einem ernsthaften Harness sollten Vorschläge über mindestens vier Substrate erzeugen. Das erste Substrat sind prompt- und retrieval-Transforms: günstig, reversibel, immer der Ausgangspunkt. Das zweite sind activation steering rules: schnell, lokal, mittelfristige Verpflichtung. Das dritte sind adapter und LoRA updates: schwerer, erfordert Training, mittelfristige Beständigkeit. Das vierte ist code und policy edits: höchste Verpflichtung, schwerste Rücknahme.

Mit nur SAE Steering zu beginnen, ist wie ein evolutionsfähiges System zu bauen, das nur ein Gen mutieren kann. Man erhält schnelle lokale Anpassung und brüchiges globales Verhalten. Das System muss in der Lage sein, zu modifizieren, wie es Kontext abruft, wie es Tools routing und wie es Informationen auf Gewichts‑Ebene verarbeitet, nicht weil diese Operatoren mächtiger sind, sondern weil unterschiedliche Probleme in unterschiedlichen Substraten liegen.

Die richtige Disziplin ist: Eine erfolgreiche kostengünstige Intervention sollte, soweit möglich, in einem billigeren oder stabileren Substrat neu ausgedrückt werden, sei es als prompt Transform, retrieval rule oder adapter update, vorausgesetzt, die kausale Wirkung übersteht die Übersetzung. Das ist keine Regel allein für Sicherheit. Es ist eine Regel für Evolvierbarkeit: Das System sollte teure Mutationen widerstehen, bis günstige gefunden haben die richtige Nachbarschaft.
##Was ein minimal funktionsfähiger Loop eigentlich aussieht

Der Loop hat sechs Stufen. Beobachten. Vorschlagen. Sandbox. Bewerten. Den Gewinner behalten (oder alle Kandidaten ablehnen). Suchvordergrund aktualisieren.

Beobachten bedeutet, das aktuelle Genom gegen das Aufgaben-Set auszuführen und verhaltensbezogene Metriken aufzuzeichnen. Vorschlagen bedeutet, dass die Such-Politik Kandidatenmutationen, je einen pro Operatorklasse, parallel generiert. Sandbox bedeutet, dass jeder Kandidat isoliert läuft: keine geteilte Zustandsfähigkeit, strenge Ressourcenbegrenzungen, und ein garantierter Rollback. Bewerten bedeutet, den verhaltensbezogenen Delta-Wert gegenüber der aktuellen Basislinie zu bewerten. Den Gewinner behalten bedeutet, den Gewinner in die Persistenzschicht mit voller Provenienz zu schreiben: vor/nach Metriken, welche Prompts es beeinflusste, welche Operatorklasse er verwendet hat, sowie Ablauf- und Revalidierungsrichtlinien. Update search prior bedeutet, dass die Banditen- oder Evolutionspolitik lernt, welche Operatorklassen und welche Regionen des Suchraums Survivors produzieren.

Jede behaltene Mutation benötigt einen Rollback-Handhalter. Nicht aus Sicherheitsgründen. Als Design-Anforderung.

Wenn Sie eine Mutation nicht zurückrollen können, können Sie ihren marginalen Beitrag nicht messen. Wenn Sie seinen marginalen Beitrag nicht messen können, evolvieren Sie nicht. Sie haufen sich lediglich an.

---
We needto translate headings and bold etc.

We keep "## What I Left Out" unchanged? The heading marker "##" is markdown heading. Should we translate the text after ##? The heading text is "What I Left Out". That's not a proper noun; it's a title. Should we translate it? The instruction says "Do not translate proper nouns, project names, GitHub URLs, or code." "What I Left Out" is not a proper noun; it's a phrase. Should we translate it? The tone: keep same tone and style. Probably translate the heading as well, but maybe keep as is? The instruction says "Do not translate proper nouns, project names, GitHub URLs, or code." It doesn't forbid translating other text. So we can translate heading text. So "## What I Left Out" -> "## Was ich weggelassen habe" maybe. But need to preserve markdown heading syntax. So we replace the text after ## with German translation, keeping ##. So "## Was ich weggelassen habe". Keep bold? There's no bold there.

Then we have "**Self-modification of code.**" That's bold markdown. The text inside bold should be translated? The instruction: "Do not translate proper nouns, project names, GitHub URLs, or code." This is not a proper noun; it's a phrase. So we can translate it. But we must preserve the bold markdown syntax: **...**. So we translate the content inside bold to German, but keep the asterisks. So "**Selbstmodifikation des Codes.**"

Then the sentence: "Darwin-Gödel Machine-style self-editing works in sandboxed coding-agent settings with formal verifiers." Translate to German, preserving code references? "Darwin-Gödel Machine-style" includes "Machine" which is part of name; maybe keep as is? It's not a proper noun? It's a style name; maybe keep as is. But we can translate "self-editing works in sandboxed coding-agent settings with formal verifiers." So German: "Darwin-Gödel Machine‑stilisierte Selbstbearbeitung funktioniert in abgesicherten Codier-Agenten-Umgebungen mit formalen Verifizierern." Might be okay.

But we must preserve any code blocks? There's none.

Proceed.

Next paragraph:

**Feature universality.** SAE features are model-specific and sometimes checkpoint-specific. Whether useful features transfer across model versions is an open research question. The harness should be designed to re-extract feature dictionaries on each base model update rather than assuming stability.

Translate heading "**Feature universality.**" -> "**Feature-Universalität.**" maybe. Keep bold.

Sentence: "SAE features are model-specific and sometimes checkpoint-specific." -> "SAE-Features sind modell-spezifisch und manchmal checkpoint-spezifisch." Keep SAE as is (not translation). "checkpoint" maybe keep as is.

"Whether useful features transfer across model versions is an open research question." -> "Ob nützliche Features über Modell-Versionen hinwegübertragbar sind, ist eine offene Forschungsfrage."

"The harness should be designed to re-extract feature dictionaries on each base model update rather than assuming stability." -> "Der Harness sollte so gestaltet sein, dass bei jedem Basis-Modell-Update feature-Dictionaries erneut extrahiert werden, anstatt stabile Annahmen zu treffen."

Next paragraph:

**Multi-agent evaluators.** Using a judge model as part of the evaluation loop adds robustness but also creates an adversarial surface. The system can learn to satisfy the judge rather than the underlying task. This needs explicit counter‑measures that I have not designed yet.

Translate heading "**Multi-agent evaluators.**" -> "**Multi-Agent-Evaluatoren.**"

Sentence: "Using a judge model as part of the evaluation loop adds robustness but also creates an adversarial surface." -> "Die Verwendung eines Bewertungsmodells im Evaluationsschleifen-Mechanismus erhöht Robustheit, birgt aber zugleich eine angreifbare Angriffsfläche."

"The system can learn to satisfy the judge rather than the underlying task." -> "Das System kann lernen, den Bewerter zu befriedigen, statt die zugrundeliegende Aufgaben zu lösen."

"This needs explicit counter‑measures that I have not designed yet." -> "Dies erfordert explizite Gegenmaßnahmen, die ich noch nicht gestaltet habe."

Next paragraph:

**Compute budgeting.** A mutation that improves capability by 2% but doubles latency is not a win. Latency and cost need to be first‑class constraints in the evaluator, not afterthoughts.

Heading: "**Compute budgeting.**" -> "**Rechenbudgetierung.**"

Sentence: "A mutation that improves capability by 2% but doubles latency is not a win." -> "Eine Mutation, die die Leistungsfähigkeit um 2 % verbessert, aber die Latenz verdoppelt, ist kein Gewinn."

"Latency and cost need to be first‑class constraints in the evaluator, not afterthoughts." -> "Latenz und Kosten müssen als erstklassige Constraints im Evaluator berücksichtigt werden, nicht als nachträgliche Gedanken."

Next paragraph:

---

The connection to [Hrafn](https://github.com/5queezer/hrafn) is direct. MuninnDB is the persistence tier. The Dream Engine, modeled on sleep-phase memory consolidation, is the mechanism that promotes ephemeral observations into medium-term policy. The missing pieces are the search policy and the co‑evolving evaluator. That is what gets built next.

Translate: "The connection to [Hrafn](https://github.com/5queezer/hrafn) is direct." -> "Der Zusammenhang zu [Hrafn](https://github.com/5queezer/hrafn) ist direkt."

"MuninnDB is the persistence tier." -> "MuninnDB ist die Persistenz-Ebene."

"The Dream Engine, modeled on sleep-phase memory consolidation, is the mechanism that promotes ephemeral observations into medium-term policy." -> "Der Dream Engine, modelliert auf Schlafphasen‑Gedächtniskonsolidierung, ist das Mechanismus, das flüchtige Beobachtungen in mittel‑fristige Strategien überführt."

"The missing pieces are the search policy and the co‑evolving evaluator." -> "Die fehlenden Teile sind die Suchstrategie und der ko‑evolvierende Evaluator."

"That is what gets built next." -> "Das wird als Nächstes gebaut."

Next paragraph:

If you are building in this space, the prior that is most worth borrowing is not from ML. It is from evolutionary biology: the environment does the selection. Your job is to build the environment, not the organism.

Translate: "If you are building in this space, the prior that is most worth borrowing is not from ML." -> "Wenn du in diesem Bereich arbeitest, ist die Priorität, die es sich am meisten lohnt zu übernehmen, nicht aus dem ML‑Bereich."

"It is from evolutionary biology: the environment does the selection." -> "Sie stammt aus der evolutionsbiologie: die Umgebung führt die Selektion durch."

"Your job is to build the environment, not the organism." -> "Deine Aufgabe ist es, die Umgebung zu bauen, nicht das Organismus."

Next paragraph:

Start with [Hrafn](https://github.com/5queezer/hrafn) and the [MuninnDB persistence layer](https://github.com/5queezer/hrafn). The genome/phenotype separation is already wired. What needs building is the evaluator that co‑evolves with the system it measures.

Translate: "Start with [Hrafn](https://github.com/5queezer/hrafn) and the [MuninnDB persistence layer](https://github.com/5queezer/hrafn)." -> "Starte mit [Hrafn](https://github.com/5queezer/hrafn) und der [MuninnDB Persistence-Schicht](https://github.com/5queezer/hrafn)." But "persistence layer" is not a proper name; it's a descriptive phrase. Should we translate? The instruction says preserve links exactly; the anchor text "[MuninnDB persistence layer]" includes "persistence layer" which is not a proper noun. We can translate that anchor text? The rule: "Do not translate proper nouns, project names, GitHub URLs, or code." "persistence layer" is not a proper noun; it's a phrase. So we can translate it. But we must preserve the markdown link syntax. So we can change the anchor text to German translation, but keep the link unchanged. So "[MuninnDB Persistence-Schicht]" maybe. But the original anchor text is "MuninnDB persistence layer". We can translate to "MuninnDB Persistence-Schicht". That seems okay.

"The genome/phenotype separation is already wired." -> "Die Genom/Phänotyp-Trennung ist bereits verkabelt." Might keep "genome/phenotype" as is? It's a phrase; we can translate to "Genom/Phänotyp-Trennung". Keep slash.

"What needs building is the evaluator that co‑evolves with the system it measures." -> "Was gebaut werden muss, ist der Evaluator, der mit dem System, das er misst, ko‑evolviert."

Next paragraph:

---

*Christian Pojoni builds AI agent infrastructure and writes about it at [vasudev.xyz](https://vasudev.xyz). Current work: [Hrafn](https://github.com/5queezer/hrafn), a Rust-based agent runtime.*

"The cover image for this post was generated by AI."

We need to translate these lines, preserving markdown formatting (italics with asterisks). The asterisks indicate italics. So we keep them.

First italic line: "*Christian Pojoni builds AI agent infrastructure and writes about it at [vasudev.xyz](https://vasudev.xyz). Current work: [Hrafn](https://github.com/5queezer/hrafn), a Rust-based agent runtime.*"

We translate the English text outside the links, but keep the links unchanged. So we translate "Christian Pojoni builds AI agent infrastructure and writes about it at" -> "Christian Pojoni baut KI‑Agenten-Infrastruktur und schreibt darüber auf". Then "Current work:" -> "Aktuelle Arbeit:" then the link to Hrafn remains same anchor text "Hrafn". Then ", a Rust-based agent runtime." -> ", ein Rust-basiertes Agenten‑Runtime." But "agent runtime" maybe keep as is? It's not a proper noun. Could translate to "Agenten‑Runtime". We'll translate.

But we must preserve the markdown italics: start with * and end with *. So we translate everything inside the asterisks, but keep the links unchanged.

Second italic line: "*The cover image for this post was generated by AI.*" Translate to German: "*Das Cover‑Bild für diesen Beitrag wurde von KI erzeugt.*"

We must preserve asterisks.

Now ensure no extra commentary.

Let's assemble the translated markdown.

We must keep blank lines as in original? Probably maintain same spacing.

Original structure:

## What I Left Out

**Self-modification of code.** ...

**Feature universality.** ...

**Multi-agent evaluators.** ...

**Compute budgeting.** ...

---

The connection to [Hrafn](https://github.com/5queezer/hrafn) is direct. ...

If you are building in this space, ...

Start with [Hrafn](https://github.com/5queezer/hrafn) and the [MuninnDB persistence layer](https://github.com/5queezer/hrafn). ...

---

*Christian Pojoni builds AI agent infrastructure and writes about it at [vasudev.xyz](https://vasudev.xyz). Current work: [Hrafn](https://github.com/5queezer/hrafn), a Rust-based agent runtime.*

*The cover image for this post was generated by AI.*

We need to translate each paragraph.

Let's write final output:

## Was ich weggelassen habe

**Selbstmodifikation des Codes.** Darwin‑Gödel‑Machine‑stilisierte Selbstbearbeitung funktioniert in abgesicherten Codier‑Agenten‑Umgebungen mit formalen Verifizierern. Für einen allgemeinen Rahmen ohne diese Einschränkungen ist es ein Phase‑4‑Problem, nicht weil es unmöglich wäre, sondern weil die erforderliche Infrastruktur (stabile Evaluierer, Rücksetzmöglichkeiten, begrenzter Aufgabenbereich) zuerst geschaffen werden muss.

**Feature‑Universalität.** SAE‑Features sind modell‑spezifisch und manchmal checkpoint‑spezifisch. Ob nützliche Features über Modell‑Versionen hinweg übertragbar sind, ist eine offene Forschungsfrage. Der Harness sollte so gestaltet sein, dass bei jedem Basis‑Modell‑Update feature‑Dictionary‑Einträge erneut extrahiert werden, anstatt stabile Annahmen zu treffen.

**Multi‑Agent‑Evaluatoren.** Die Verwendung eines Bewertungsmodells im Evaluationsschleifen‑Mechanismus erhöht Robustheit, birgt aber zugleich eine angreifbare Angriffsfläche. Das System kann lernen, den Bewerter zu befriedigen, statt die zugrundeliegende Aufgabe zu lösen. Dies erfordert explizite Gegenmaßnahmen, die ich noch nicht gestaltet habe.

**Rechenbudgetierung.** Eine Mutation, die die Leistungsfähigkeit um 2 % verbessert, aber die Latenz verdoppelt, ist kein Gewinn. Latenz und Kosten müssen als erstklassige Constraints im Evaluator berücksichtigt werden, nicht als nachträgliche Gedanken.

---

Der Zusammenhang zu [Hrafn](https://github.com/5queezer/hrafn) ist direkt. MuninnDB ist die Persistenz‑Ebene. Der Dream Engine, modelliert auf Schlafphasen‑Gedächtniskonsolidierung, ist das Mechanismus, das flüchtige Beobachtungen in mittel‑fristige Strategien überführt. Die fehlenden Teile sind die Suchstrategie und der ko‑evolvierende Evaluator. Das wird als Nächstes gebaut.

Wenn du in diesem Bereich arbeitest, ist die Priorität, die man am meisten übernehmen sollte, nicht aus dem ML‑Bereich. Sie stammt aus der Evolutionsbiologie: die Umgebung führt die Selektion durch. Deine Aufgabe ist es, die Umgebung zu bauen, nicht das Organismus.

Starte mit [Hrafn](https://github.com/5queezer/hrafn) und der [MuninnDB Persistence‑Schicht](https://github.com/5queezer/hrafn). Die Genom/Phänotyp‑Trennung ist bereits verkabelt. Was gebaut werden muss, ist der Evaluator, der mit dem System, das er misst, ko‑evolviert.

---

*Christian Pojoni baut KI‑Agenten‑Infrastruktur und schreibt darüber auf [vasudev.xyz](https://vasudev.xyz). Aktuelle Arbeit: [Hrafn](https://github.com/5queezer/hrafn), ein Rust‑basiertes Agenten‑Runtime.*

*Das Cover‑Bild für diesen Beitrag wurde von KI erzeugt.*

Check for any missing formatting: There is a line with "---" originally after the first section? Actually original had "---" after the first paragraph? Let's re-check original:

The provided text:

## What I Left Out

**Self-modification of code.** Darwin-Gödel Machine-style self-editing works in sandboxed coding-agent settings with formal verifiers. For a general harness without those constraints, it is a Phase 4 concern, not because it is impossible, but because the prerequisite infrastructure (stable evaluator, rollback guarantees, narrow task scope) needs to be in place first.

**Feature universality.** SAE features are model-specific and sometimes checkpoint-specific. Whether useful features transfer across model versions is an open research question. The harness should be designed to re-extract feature dictionaries on each base model update rather than assuming stability.

**Multi-agent evaluators.** Using a judge model as part of the evaluation loop adds robustness but also creates an adversarial surface. The system can learn to satisfy the judge rather than the underlying task. This needs explicit counter‑measures that I have not designed yet.

**Compute budgeting.** A mutation that improves capability by 2% but doubles latency is not a win. Latency and cost need to be first‑class constraints in the evaluator, not afterthoughts.

---

The connection to [Hrafn](https://github.com/5queezer/hrafn) is direct. MuninnDB is the persistence tier. The Dream Engine, modeled on sleep-phase memory consolidation, is the mechanism that promotes ephemeral observations into medium-term policy. The missing pieces are the search policy and the co‑evolving evaluator. That is what gets built next.

If you are building in this space, the prior that is most worth borrowing is not from ML. It is from evolutionary biology: the environment does the selection. Your job is to build the environment, not the organism.

Start with [Hrafn](https://github.com/5queezer/hrafn) and the [MuninnDB persistence layer](https://github.com/5queezer/hrafn). The genome/phenotype separation is already wired. What needs building is the evaluator that co‑evolves with the system it measures.

---

*Christian Pojoni builds AI agent infrastructure and writes about it at [vasudev.xyz](https://vasudev.xyz). Current work: [Hrafn](https://github.com/5queezer/hrafn), a Rust-based agent runtime.*

*The cover image for this post was generated by AI.*

We need to preserve the "---" lines. In markdown, "---" is a horizontal rule. We should keep them as "---". So we need to include them exactly as they appear, but maybe we need to translate nothing around them. So we keep "---" lines unchanged.

Thus we need to insert "---" after the first set of bullet points? Actually there is a "---" after the fourth bullet (Compute budgeting). So we should keep that line as "---". Then continue with "The connection to..." etc.

Thus we need to keep "---" lines exactly as "---". So we will have:
