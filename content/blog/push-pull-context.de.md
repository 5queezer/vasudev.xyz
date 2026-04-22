---
title: "Hör auf, Entscheidungen in CLAUDE.md zu platzieren. Leg sie dort hin, wo der Agent nicht immer liest."
date: 2026-04-19
tags: ["adr", "agents", "architecture", "claude"]
description: "Zwei Studien aus dem Jahr 2026 sind uneinig darüber, ob AGENTS.md Coding‑Agenten hilft. Der Konflikt wird verständlich, sobald man den Push‑Kontext vom Pull‑Kontext trennt."
translationHash: "3d5003214440c678dd5140f1af71e7a6"
chunkHashes: "2b463bedee49dbf5,d28287460d8ade35,624f8e8ebc566cab,9b54877510c78112,941f32bbac660aad,8a6f05f0c1c8728c,f1e4699e315c7f95,6b9c4f367214421b"
---
Zwei rigorose Studien aus dem Jahr 2026 untersuchten, ob Kontextdateien für Agenten KI‑Programmieragenten tatsächlich helfen. Sie kamen zu gegensätzlichen Ergebnissen. Die ETH‑Zürich‑Gruppe führte SWE‑bench Lite und AGENTbench über mehrere Modelle hinweg aus und **stellte fest, dass von LLM‑generierte AGENTS.md‑Dateien den Erfolg von Aufgaben um 3 % reduzierten und die Inferenzkosten um 20 % erhöhten** [https://arxiv.org/abs/2602.11988](https://arxiv.org/abs/2602.11988). Von Entwicklern geschriebene Dateien brachten lediglich einen marginalen Anstieg von 4 % bei denselben zusätzlichen Kosten. Einen Monat zuvor **berichtete Lulla et al. das Gegenteil** [https://arxiv.org/abs/2601.20404](https://arxiv.org/abs/2601.20404) in einem sauberen, gepaarten Experiment mit 124 realen GitHub‑Pull‑Requests: Das Vorhandensein von AGENTS.md verkürzte die mittlere Laufzeit um 28,64 % und reduzierte die ausgegebenen Token um 16,58 %.

Beide Studien sind sorgfältig. Beide haben reale Größen gemessen. Das Feld spaltete sich sofort in Lager.

Die Spaltung ist vermeidbar. Beide Studien maßen dasselbe Artefakt und behandelten es als ein einziges. Das ist es nicht.

**Entscheidungen gehören in den Pull‑Kontext, nicht in den Push‑Kontext. Die Verwechslung der beiden ist der Grund, warum die Hälfte deines CLAUDE.md dich wahrscheinlich gerade jetzt behindert.**
## Push‑Kontext versus Pull‑Kontext

Ein Coding‑Agent liest zwei Arten von Projektinformationen.

Push‑Kontext wird in jede Sitzung geladen, bedingungslos. CLAUDE.md, AGENTS.md, copilot‑instructions.md. Der Agent liest beim Start das nächstgelegene, egal ob deine Aufgabe es benötigt oder nicht. Er zahlt bei jedem Zug eine Token‑Steuer, und die Evidenz aus beiden oben genannten Studien zeigt, dass die Steuer etwa 20 % der Reasoning‑Tokens ausmacht, unabhängig davon, ob die Datei bei der konkreten Aufgabe hilft.

Pull‑Kontext liegt auf der Festplatte und wird vom Agenten nur gelesen, wenn er relevant ist. `docs/adr/0007-nautilus-backtest-engine.md`, `docs/specs/mcp-tools.md`, ein Skill in `.claude/skills/`, die eigentliche Quelle einer Funktion. Keine Grundkosten. Der Agent greift, öffnet und liest nur die Dateien, deren Namen zur aktuellen Aufgabe passen. Wenn die Entscheidung nicht relevant ist, werden keine Tokens verbraucht.

Die empirische Geschichte liest sich durch diese Brille anders. Lulla et al. maßen Repos, in denen AGENTS.md hauptsächlich Build‑Befehle, Test‑Runner und Tool‑Namen enthielt. Das ist echter, immer‑relevanter Push‑Kontext, bei dem die Kosten durch vermiedene Entdeckungen zurückgezahlt werden. Die von der ETH‑Zürich‑Gruppe erzeugten LLM‑Dateien waren mit architektonischen Overviews, Verzeichnisbäumen und Stilregeln gefüllt, die der Agent [im Kontext nicht brauchte, weil er sie bei Bedarf entdecken konnte](https://www.marktechpost.com/2026/02/25/new-eth-zurich-study-proves-your-ai-coding-agents-are-failing-because-your-agents-md-files-are-too-detailed/). Das ist Push‑Kontext, der eine Steuer zahlt, ohne Rückzahlung.

Gleicher Gegenstand, unterschiedlicher Inhalt, gegenteilige Ergebnisse. Die Kennzahl, die zählt, ist nicht „existiert die Datei“, sondern „was hast du darin abgelegt“.
## Die CLAUDE.md‑Falle, in die die meisten Repos tappen

Öffne die CLAUDE.md eines zufälligen öffentlichen Repos und du wirst fünf wiederkehrende Punkte finden. Build‑ und Test‑Befehle, korrekt als Push‑Context platziert. Werkzeugsnamen, die der Agent sonst nicht ableiten würde, wie `uv` oder `pnpm`, ebenfalls korrekt. Die ETH‑Studie ergab, dass [erwähnte Werkzeuge 160 × häufiger verwendet werden](https://www.marktechpost.com/2026/02/25/new-eth-zurich-study-proves-your-ai-coding-agents-are-failing-because-your-agents-md-files-are-too-detailed/). Dann beginnt der Ballast. Ein Verzeichnisbaum des Repos, den Agenten via `ls` und `grep` schneller navigieren als durch das Lesen einer veralteten Textversion. Code‑Style‑Regeln wie die Durchsetzung von camelCase, wofür dein Linter gedacht ist, und die Trainingsdaten des Agenten bereits zu den Konventionen deiner Sprache neigen. Schließlich die architektonische Begründung, z. B. die Wahl von Postgres anstelle von MongoDB aus Grund X, was Pull‑Context vorgibt zu sein, aber eigentlich Push‑Context ist.

Diese letzten drei Punkte sind der Ballast. Die architektonische Begründung ist diejenige, über die man diskutieren kann, weil die dahinterstehende Intuition verteidigungsfähig ist: Wenn ich die Entscheidung in CLAUDE.md festhalte, sieht der Agent sie in jeder Session und wird sie nicht erneut verhandeln. Der Fehler ist, dass du die Token‑Kosten in jeder Session zahlst, auch in den 95 % der Sessions, in denen diese Entscheidung irrelevant ist, und [Anthropics eigene Richtlinie warnt Claude, dass CLAUDE.md möglicherweise nicht zur Aufgabe passt](https://www.humanlayer.dev/blog/writing-a-good-claude-md). Das ist ein Eingeständnis, dass das immer geladene Modell für alles außer immer relevanten Inhalten defekt ist.

Was du wirklich willst, ist, dass der Agent die Entscheidung in dem Moment lernt, in dem er den relevanten Code berührt. Das ist es, was Pull‑Context bewirkt.
## Warum ADRs Pull‑Kontext richtig umsetzen

Architecture Decision Records, im [Format von Michael Nygard](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions), besitzen vier Eigenschaften, die sie agentenfreundlich machen, ohne Push‑Kontext zu sein.

**Nummeriert und sequenziell.** `docs/adr/0007-use-klinecharts-for-price-rendering.md`. Der Agent kann `docs/adr/` nach jedem Begriff durchsuchen und jede Entscheidung finden, die ihn berührt. Kontext, kein Trivia.

**Status‑gefasst.** `Accepted`, `Superseded by ADR-0023`, `Deprecated`. Wenn der Agent ADR‑0007 liest und `Superseded by ADR-0023` sieht, folgt er dem Link. Die Entscheidungsgeschichte ist navigierbar, ohne eine einzelne Datei zu verschmutzen.

**Alternativen‑Abschnitt.** Jeder ADR listet auf, was Sie verworfen haben und warum. Das ist der Teil, den niemand in CLAUDE.md dokumentiert, weil er zu lang wäre, und er ist der Teil, der einen Agenten davon abhält, drei Monate später „hilfreich“ Ihre Bibliothekswahl zu ändern. Ohne dokumentierte Alternativen schlägt der Agent die verworfene Option erneut vor, weil seine Trainingsdaten mehr Beispiele der Alternative enthalten.

**Niemals umgeschrieben.** Wenn Sie Ihre Meinung ändern, schreiben Sie einen neuen ADR, der den alten ersetzt. Die Prüfspur ist das Artefakt. `git log` liefert das nicht. Es liefert Diffs, nicht die darüber liegende Begründungsebene.

Der Agent bezahlt keine Tokens für ADRs, die Sie nicht lesen. Wenn er ein solches liest, erhält er 200 Wörter fokussierten, strukturierten Entscheidungskontexts genau in dem Moment, in dem er relevant ist.
## Die vollständige Push/Pull-Dekomposition

Für ein agentisches Repository vier Artefontypen mit vier unterschiedlichen Aufbewahrungsorten.

**CLAUDE.md (push).** Unter 100 Zeilen. Toolnamen, die der Agent nicht ableiten würde. Nicht‑Standard‑Build-, Test‑ und Lint‑Befehle. Sicherheitsgrenzen („nie Migrationen ohne Genehmigung ausführen“). Ein Verweis darauf, wo ADRs und Spezifikationen liegen. Nichts weiter. Wenn deine CLAUDE.md über 200 Zeilen liegt, zahlst du pro Sitzung Steuern für irrelevanten Inhalt.

**`docs/adr/` (pull).** Bindende Architekturentscheidungen. Eine Entscheidung pro Datei. Nygard‑Format. Hier steht die Begründung, warum Nautilus statt vectorbt gewählt wurde.

**`docs/specs/` (pull).** Intent pro Feature. Was das Feature tut, was es nicht tut, Akzeptanzkriterien. Der Agent liest die Spezifikation für das Feature, das er gerade entwickelt, und ignoriert den Rest. Spec‑getriebene Entwicklungs‑Frameworks wie [Intent](https://www.augmentcode.com/guides/how-to-build-agents-md) formalisieren das. Du brauchst das Tool nicht, um das Muster zu folgen.

**`.claude/skills/` (pull, getriggert).** Workflow‑Protokolle. Wie man QA ausführt, wie man einen PR öffnet, wie man einen Blog‑Post schreibt. Wird nur geladen, wenn die Trigger‑Phrase der Fähigkeit passt. Das ist [progressive disclosure](https://github.com/shanraisshan/claude-code-best-practice). Der Agent sieht die Beschreibungs‑Fähigkeit, entscheidet, sie zu laden, und sieht dann den Inhalt.

Der gemeinsame Nenner in den Pull‑Ebenen ist, dass der Agent basierend auf Aufgabenrelevanz auswählt, was geladen wird. CLAUDE.md ist die einzige Ebene, in der du für den Agenten entscheidest, und du zahlst dafür jede Sitzung.
## Das Gegenargument des Lore-Papiers ist lesenswert

[Ivan Stetsenkos März‑2026‑Paper](https://arxiv.org/abs/2603.15566) argumentiert, dass ADRs auf zu grober Granularität operieren. Sie erfassen „warum PostgreSQL statt MongoDB“ zwar, aber nicht „warum diese Retry‑Schleife drei Versuche und nicht fünf hat“. Die auf Implementierungsebene stattfindende Begründung, die er den Decision Shadow nennt, verschwindet. Sein Vorschlag: strukturierte Git‑Commit‑Nachrichten als Träger.

Er hat Recht, dass ADRs eine Granularitäts‑Obergrenze besitzen. Die Antwort ist nicht, sie komplett aufzugeben, sondern sie zu schichten. Commit‑Nachrichten fangen die Begründung pro Änderung ein. ADRs fangen die Begründung pro Entscheidung ein. Specs fangen die Begründung pro Feature ein. CLAUDE.md fängt die Begründung pro Repository ein. Jede Ebene hat ihre eigene Position im Push‑/Pull‑Spektrum und trägt ein unterschiedliches Maß an Entscheidung.

Der Fehler besteht darin, eine Ebene für die Arbeit einer anderen zu verwenden. CLAUDE.md, aufgebläht mit architektonischer Begründung, ist die häufigste Form dieses Fehlers. Commit‑Nachrichten, die mit projektbezogenem Kontext aufgeblasen werden, sind die seltenere Umkehrung.
## Was ich nicht behaupte

Keine Studie hat ADRs speziell isoliert und ihre Auswirkung auf den Erfolg von Agentenaufgaben gemessen. Die obigen Belege beziehen sich auf Dateien im Stil von AGENTS.md. Das Push/Pull‑Argument ist ein architektonischer Anspruch, der aus den AGENTS.md‑Daten sowie dem bekannten Verhalten von dateisystembewussten Agenten abgeleitet wird, nicht aus einer direkten Messung. Jemand sollte dieses Experiment durchführen. Bis das geschieht, sollte man dies als strukturierte Hypothese und nicht als Satz betrachten.

Ich behaupte außerdem nicht, dass Pull‑Kontext kostenfrei ist. Der Agent muss wissen, wo er suchen soll. Das bedeutet, CLAUDE.md muss einen kurzen Verweis enthalten, etwa „Binding‑Entscheidungen befinden sich in `docs/adr/`, nach Nummer sortiert. Lies das relevante ADR, bevor du die Architektur änderst.“ Ohne den Verweis entdeckt der Agent die Pull‑Ebene nicht. Mit ihm schaltet eine Zeile Push‑Kontext eine beliebige Pull‑Tiefe frei.
## Was man am Montag tun sollte

Öffne das CLAUDE.md deines Repos. Schneide jeden Abschnitt heraus, der nicht für jede Sitzung universell relevant ist. Der Verzeichnisbaum gehört hin. Der Styleguide gehört hin (dein Linter kümmert sich darum). Die architektonische Begründung gehört hin. Verschiebe das alles nach `docs/adr/0001-whatever.md` im Nygard-Format, inklusive des Abschnitts zu Alternativen, den du bisher übersprungen hast.

Füge eine Zeile zum CLAUDE.md hinzu: `Binding architectural decisions live in docs/adr/. Read the relevant ADR before proposing structural changes.`

Diese eine Umstrukturierung ist die höchstwirksame Änderung, die agentenfähige Repos derzeit vornehmen können. Sie kostet einen Nachmittag. Sie entfernt die 20 %ige Reasoning‑Token‑Steuer auf irrelevante Sitzungen, bewahrt die Entscheidungs‑Historie mit höherer Treue, als CLAUDE.md es je könnte, und gibt Mitwirkenden (Menschen und Agenten) eine beständige Prüfspur.

Die beiden Studien widersprechen sich nicht. Sie messen zwei verschiedene Inhaltsstrategien unter demselben Dateinamen. Trenne Push von Pull und der Widerspruch löst sich auf.

---

*Christian Pojoni schreibt über agentenfähiges Coding, Rust und Handels‑Infrastruktur auf [vasudev.xyz](https://vasudev.xyz). Er entwickelt [Hrafn](https://github.com/5queezer/hrafn), ein Rust‑Agent‑Framework, und trägt zu MuninnDB bei.*