---
title: "Hör auf, Entscheidungen in CLAUDE.md zu platzieren. Platziere sie dort, wo der Agent nicht immer liest."
date: 2026-04-19
tags: ["adr", "agents", "architecture", "claude"]
description: "Zwei Studien aus dem Jahr 2026 sind uneins darüber, ob AGENTS.md Coding‑Agenten hilft. Der Streit ergibt Sinn, sobald man Kontext‑Push von Kontext‑Pull unterscheidet."
images: ["/images/push-pull-context-og.png"]
images: ["/images/push-pull-context-og.png"]
images: ["/images/push-pull-context-og.png"]
translationHash: "1efe46f0746426b51d508fdcc4e7a4df"
chunkHashes: "b817ba1b27214d6a,d28287460d8ade35,624f8e8ebc566cab,9b54877510c78112,941f32bbac660aad,8a6f05f0c1c8728c,f1e4699e315c7f95,1b1fa23d8a9507de"
---
Zwei rigorose Studien aus dem Jahr 2026 untersuchten, ob Kontextdateien für Agenten KI‑Programmierungsagenten helfen. Sie kamen zu gegensätzlichen Schlussfolgerungen. Die ETH‑Zürich‑Gruppe führte SWE‑bench Lite und AGENTbench über mehrere Modelle hinweg aus und **stellte fest, dass von LLMs generierte AGENTS.md‑Dateien den Erfolg von Aufgaben um 3 % verringerten und die Inferenzkosten um 20 % erhöhten** (https://arxiv.org/abs/2602.11988). Von Entwicklern geschriebene Dateien brachten einen marginalen Anstieg von 4 % bei gleichen Kosteneinbußen. Einen Monat zuvor berichtete **Lulla et al. das Gegenteil** (https://arxiv.org/abs/2601.20404) in einem sauberen, gepaarten Experiment mit 124 echten GitHub‑Pull‑Requests: Das Vorhandensein von AGENTS.md reduzierte die mittlere Laufzeit um 28,64 % und die Ausgabetoken um 16,58 %.

Beide Studien sind sorgfältig. Beide haben reale Dinge gemessen. Das Feld spaltete sich sofort in Lager.

Die Spaltung ist vermeidbar. Beide Studien haben dasselbe Artefakt gemessen und es als ein Ding behandelt. Das ist es nicht.

**Entscheidungen gehören in den Pull‑Context, nicht in den Push‑Context. Die Vermischung beider ist der Grund, warum die Hälfte deines CLAUDE.md dich wahrscheinlich gerade jetzt behindert.**
## Push‑Kontext versus Pull‑Kontext

Ein Coding‑Agent liest zwei Arten von Projektinformationen.

Push‑Kontext wird in jede Sitzung geladen, bedingungslos. CLAUDE.md, AGENTS.md, copilot-instructions.md. Der Agent liest beim Start die nächstliegende Datei, egal ob deine Aufgabe sie benötigt oder nicht. Er zahlt bei jedem Zug eine Token‑Steuer, und die Evidenz aus beiden oben genannten Studien zeigt, dass die Steuer etwa 20 % der Reasoning‑Tokens ausmacht, unabhängig davon, ob die Datei bei der konkreten Aufgabe hilft.

Pull‑Kontext liegt auf der Festplatte und der Agent liest ihn, wenn er relevant ist. `docs/adr/0007-nautilus-backtest-engine.md`, `docs/specs/mcp-tools.md`, ein Skill in `.claude/skills/`, die eigentliche Quelle einer Funktion. Null Basiskosten. Der Agent greift, öffnet und liest nur die Dateien, deren Namen zur aktuellen Aufgabe passen. Wenn die Entscheidung nicht relevant ist, werden keine Tokens verbraucht.

Die empirische Geschichte liest sich durch diese Brille anders. Lulla et al. maßen Repos, in denen AGENTS.md hauptsächlich Build‑Befehle, Test‑Runner und Tool‑Namen enthielt. Das ist wirklich immer relevante Push‑Kontext, bei dem die Kosten durch vermiedene Entdeckungen zurückgezahlt werden. Die von der ETH‑Zürich‑Gruppe generierten LLM‑Dateien waren mit Architektur‑Übersichten, Verzeichnisbäumen und Stilregeln gefüllt, die der Agent [im Kontext nicht brauchte, weil er sie bei Bedarf entdecken konnte](https://www.marktechpost.com/2026/02/25/new-eth-zurich-study-proves-your-ai-coding-agents-are-failing-because-your-agents-md-files-are-too-detailed/). Das ist Push‑Kontext, der eine Steuer zahlt, ohne Rückerstattung.

Gleicher Artefakt, anderer Inhalt, gegensätzliche Ergebnisse. Die Kennzahl, die zählt, ist nicht „existiert die Datei“, sondern „was hast du darin abgelegt.“
## Die CLAUDE.md-Falle, in die die meisten Repos tappen

Öffne das CLAUDE.md eines zufälligen öffentlichen Repos und du wirst fünf wiederkehrende Elemente finden. Build‑ und Test‑Befehle, korrekt als Push‑Context platziert. Werkzeugnamen, die der Agent sonst nicht ableiten würde, wie `uv` oder `pnpm`, ebenfalls korrekt. Die ETH‑Studie ergab, dass [genannte Werkzeuge 160 × häufiger verwendet werden](https://www.marktechpost.com/2026/02/25/new-eth-zurich-study-proves-your-ai-coding-agents-are-failing-because-your-agents-md-files-are-too-detailed/). Dann beginnt der Ballast. Ein Verzeichnisbaum des Repos, den Agenten über `ls` und `grep` schneller navigieren als indem sie eine veraltete Textversion lesen. Code‑Stilregeln wie die Durchsetzung von camelCase, wofür dein Linter gedacht ist, und die Trainingsdaten des Agenten bereits zu deinen Sprachkonventionen tendieren. Schließlich die architektonische Begründung, z. B. die Wahl von Postgres statt MongoDB aus Grund X, was Pull‑Context ist, der sich als Push‑Context ausgibt.

Diese letzten drei Punkte sind der Ballast. Die architektonische Begründung ist die, über die man diskutieren kann, weil die dahinterstehende Intuition verteidbar ist: Wenn ich die Entscheidung in CLAUDE.md lege, sieht sie der Agent in jeder Sitzung und wird sie nicht erneut aufwerfen. Der Fehler ist, dass du die Token‑Kosten bei jeder Sitzung zahlst, einschließlich der 95 % der Sitzungen, in denen diese Entscheidung irrelevant ist, und [Anthropics eigene Richtlinie warnt Claude, dass CLAUDE.md für die Aufgabe möglicherweise nicht relevant ist](https://www.humanlayer.dev/blog/writing-a-good-claude-md). Das ist ein Eingeständnis, dass das immer geladene Modell für alles außer immer relevanten Inhalt fehlerhaft ist.

Was du wirklich willst, ist, dass der Agent die Entscheidung in dem Moment lernt, in dem er den relevanten Code berührt. Das ist es, was Pull‑Context bewirkt.
## Warum ADRs das richtige Pull‑Context sind

Architecture Decision Records, im [Format von Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), besitzen vier Eigenschaften, die sie agentenfreundlich machen, ohne Push‑Context zu sein.

**Nummeriert und sequenziell.** `docs/adr/0007-use-klinecharts-for-price-rendering.md`. Der Agent kann `docs/adr/` nach beliebigen Begriffen durchsuchen und jede Entscheidung finden, die damit zusammenhängt. Kontext, kein Trivia.

**Statusgeprüft.** `Accepted`, `Superseded by ADR-0023`, `Deprecated`. Wenn der Agent ADR-0007 liest und `Superseded by ADR-0023` sieht, folgt er dem Link. Die Entscheidungshistorie ist navigierbar, ohne eine einzelne Datei zu verschmutzen.

**Alternativen‑Abschnitt.** Jeder ADR listet auf, was abgelehnt wurde und warum. Das ist der Teil, den niemand in CLAUDE.md dokumentiert, weil er zu lang wäre, und er ist der Grund, warum ein Agent nicht „hilfsbereit“ deine Bibliothekswahl drei Monate später austauscht. Ohne dokumentierte Alternativen schlägt der Agent die verworfene Option erneut vor, weil seine Trainingsdaten mehr Beispiele der Alternative enthalten.

**Nie überschrieben.** Wenn du deine Meinung änderst, schreibst du einen neuen ADR, der den alten ersetzt. Der Prüfpfad ist das Artefakt. `git log` liefert das nicht. Es liefert Diffs, nicht die darüber liegende Begründungsebene.

Der Agent verbraucht null Tokens für ADRs, die du nicht liest. Wenn er einen liest, erhält er 200 Wörter fokussierten, strukturierten Entscheidungskontexts genau in dem Moment, in dem er relevant ist.
## Die vollständige Push/Pull‑Zerlegung

Für ein agentisches Repo gibt es vier Artefakt‑Typen mit vier unterschiedlichen Aufbewahrungsorten.

**CLAUDE.md (push).** Unter 100 Zeilen. Werkzeugnamen, die der Agent nicht ableiten würde. Nicht‑Standard‑Build‑, Test‑ und Lint‑Befehle. Sicherheitsgrenzen („nie Migrationen ohne Genehmigung ausführen“). Ein Verweis darauf, wo ADRs und Specs liegen. Nichts Weiteres. Wenn deine CLAUDE.md über 200 Zeilen hat, verlierst du pro Sitzung Steuern auf irrelevanten Inhalt.

**`docs/adr/` (pull).** Bindende Architektur‑Entscheidungen. Eine Entscheidung pro Datei. Nygard‑Format. Hier findet man die Begründung, warum Nautilus statt vectorbt gewählt wurde.

**`docs/specs/` (pull).** Intent pro Feature. Was das Feature tut, was es nicht tut, Akzeptanz‑Kriterien. Der Agent liest die Spec für das Feature, das er gerade erstellt, und ignoriert den Rest. Spec‑gesteuerte Entwicklungs‑Frameworks wie [Intent](https://www.augmentcode.com/guides/how-to-build-agents-md) formalisieren das. Du musst das Werkzeug nicht zum Befolgen des Musters zwingen.

**`.claude/skills/` (pull, ausgelöst).** Workflow‑Protokolle. Wie man QA durchführt, wie man einen PR öffnet, wie man einen Blog‑Post schreibt. Wird nur geladen, wenn die Trigger‑Phrase der Fähigkeit passt. Das ist [progressive disclosure](https://github.com/shanraisshan/claude-code-best-practice). Der Agent sieht die Fähigkeitsbeschreibung, entscheidet, sie zu laden, und sieht dann den Inhalt.

Der gemeinsame Nenner der Pull‑Ebenen ist, dass der Agent basierend auf Aufgabenrelevanz auswählt, was geladen wird. CLAUDE.md ist die einzige Ebene, in der du für den Agenten auswählst, und du bezahlst dafür in jeder Sitzung.
## Das Gegenargument des Lore-Papiers lohnt sich zu lesen

[Ivan Stetsenkos März‑2026‑Paper](https://arxiv.org/abs/2603.15566) argumentiert, dass ADRs zu grob granuliert sind. Sie erfassen „warum PostgreSQL statt MongoDB“ aber nicht „warum diese Retry‑Schleife drei Versuche und nicht fünf hat“. Die Implementierungs‑Level‑Begründung, die er Decision Shadow nennt, verschwindet. Sein Vorschlag ist, strukturierte Git‑Commit‑Nachrichten als Träger zu verwenden.

Er hat recht, dass ADRs eine Granularitätsobergrenze haben. Die Antwort ist nicht, sie aufzugeben, sondern sie zu stapeln. Commit‑Nachrichten fassen die Begründung pro Änderung zusammen. ADRs fassen die Begründung pro Entscheidung zusammen. Specs fassen die Begründung pro Feature zusammen. CLAUDE.md fängt die Begründung pro Repository ein. Jede Ebene hat ihre eigene Position im Push/Pull‑Spektrum und trägt ein unterschiedliches Maß an Entscheidung.

Der Fehler besteht darin, eine Ebene für die Arbeit einer anderen zu benutzen. CLAUDE.md, das mit architektonischer Begründung aufgebläht ist, ist die häufigste Form dieses Fehlers. Commit‑Nachrichten, die mit projektbezogenem Kontext aufgefüllt sind, sind das seltenere Gegenstück.
## Was ich nicht behaupte

Keine Studie hat ADRs speziell isoliert und ihre Auswirkung auf den Erfolg von Agentenaufgaben gemessen. Die obigen Belege beziehen sich auf Dateien im AGENTS.md‑Stil. Das Push/Pull‑Argument ist ein architektonischer Anspruch, der aus den AGENTS.md‑Daten plus dem bekannten Verhalten dateisystem‑bewusster Agenten extrapoliert wurde, nicht eine direkte Messung. Jemand sollte dieses Experiment durchführen. Bis dies geschieht, sollte man dies als strukturierte Hypothese und nicht als Satz betrachten.

Ich behaupte auch nicht, dass Pull‑Kontext kostenlos ist. Der Agent muss wissen, wo er suchen muss. Das bedeutet, CLAUDE.md muss einen kurzen Hinweis enthalten wie „Binding‑Entscheidungen liegen in `docs/adr/`, sortiert nach Nummer. Lies das relevante ADR, bevor du die Architektur änderst.“ Ohne diesen Hinweis entdeckt der Agent die Pull‑Ebene nicht. Mit ihm eröffnet eine Zeile Push‑Kontext beliebige Pull‑Tiefe.
## Was man am Montag tun sollte

Öffne das CLAUDE.md‑Repository. Schneide jeden Abschnitt heraus, der nicht für jede Sitzung universell relevant ist. Der Verzeichnisbaum geht dahin. Der Style‑Guide geht dahin (dein Linter kümmert sich darum). Die architektonische Begründung geht dahin. Verschiebe das alles nach `docs/adr/0001-whatever.md` im Nygard‑Format, inklusive des Abschnitts „Alternatives“, den du bisher übersprungen hast.

Füge eine Zeile zu CLAUDE.md hinzu: `Binding architectural decisions live in docs/adr/. Read the relevant ADR before proposing structural changes.`

Diese einzige Umstrukturierung ist die wirkungsvollste Änderung, die agentenfähige Repos derzeit vornehmen können. Sie kostet einen Nachmittag. Sie entfernt die 20 % Reasoning‑Token‑Steuer auf irrelevante Sitzungen, bewahrt die Entscheidungshistorie mit höherer Treue, als es CLAUDE.md je könnte, und bietet Mitwirkenden (Menschen und Agenten) einen dauerhaften Prüfpfad.

Die beiden Studien widersprechen sich nicht. Sie messen zwei unterschiedliche Inhaltsstrategien unter demselben Dateinamen. Trenne Push von Pull und der Widerspruch löst sich.

---

*Christian Pojoni schreibt über agentenorientiertes Programmieren, Rust und Trading‑Infrastruktur auf [vasudev.xyz](https://vasudev.xyz). Er entwickelt [Hrafn](https://github.com/5queezer/hrafn), ein Rust‑Agenten‑Framework, und trägt zu MuninnDB bei.*

*Das Titelbild für diesen Beitrag wurde von KI erzeugt.*