---
title: "Stoppe das Platzieren von Entscheidungen in CLAUDE.md. Platziere sie dort, wo der Agent nicht immer liest."
date: 2026-04-19
tags: ["adr", "agents", "architecture", "claude"]
description: "Zwei Studien aus dem Jahr 2026 widersprechen sich darüber, ob AGENTS.md Coding‑Agenten hilft. Der Streit ergibt Sinn, sobald man den Push‑Kontext vom Pull‑Kontext trennt."
images: ["/images/push-pull-context-og.png"]
images: ["/images/push-pull-context-og.png"]
translationHash: "53be221f358f21758916138ff28dbde8"
chunkHashes: "558460f560094c5f,d28287460d8ade35,624f8e8ebc566cab,9b54877510c78112,941f32bbac660aad,8a6f05f0c1c8728c,f1e4699e315c7f95,1b1fa23d8a9507de"
---
Zwei rigorose Studien aus dem Jahr 2026 untersuchten, ob Kontextdateien für Agenten KI‑Coding‑Agenten unterstützen. Sie kamen zu gegensätzlichen Ergebnissen. Die Gruppe der ETH Zürich führte SWE‑bench Lite und AGENTbench über mehrere Modelle hinweg durch und **stellte fest, dass von LLMs generierte AGENTS.md‑Dateien den Aufgabenerfolg um 3 % verringerten und die Inferenzkosten um 20 % erhöhten** (https://arxiv.org/abs/2602.11988). Von Entwicklern geschriebene Dateien brachten einen marginalen Anstieg von 4 % bei denselben Kosteneinbußen. Einen Monat später berichtete **Lulla et al.** das Gegenteil (https://arxiv.org/abs/2601.20404) in einem sauberen, gepaarten Experiment mit 124 echten GitHub‑Pull‑Requests: Das Vorhandensein von AGENTS.md verkürzte die mittlere Laufzeit um 28,64 % und die ausgegebenen Tokens um 16,58 %.

Beide Studien sind sorgfältig. Beide maßen reale Größen. Das Feld spaltete sich sofort in Lager.

Die Spaltung ist vermeidbar. Beide Studien maßen dasselbe Artefakt und behandelten es als ein einziges Ding. Das ist es nicht.

**Entscheidungen gehören in Pull‑Context, nicht in Push‑Context. Das Vermischen der beiden ist der Grund, warum die Hälfte deines CLAUDE.md dich wahrscheinlich gerade jetzt beeinträchtigt.**
## Kontext schieben versus Kontext ziehen

Ein Coding‑Agent liest zwei Arten von Projektinformationen.

**Push‑Kontext** wird in jede Sitzung geladen, bedingungslos. CLAUDE.md, AGENTS.md, copilot‑instructions.md. Der Agent liest beim Start die nächstgelegene Datei, egal ob Ihre Aufgabe sie benötigt oder nicht. Er zahlt bei jedem Schritt eine Token‑Steuer, und die Evidenz aus beiden oben genannten Studien zeigt, dass die Steuer ungefähr 20 % der Denk‑Tokens ausmacht, unabhängig davon, ob die Datei der spezifischen Aufgabe hilft.

**Pull‑Kontext** liegt auf der Festplatte und der Agent liest ihn, wenn er relevant ist. `docs/adr/0007-nautilus-backtest-engine.md`, `docs/specs/mcp-tools.md`, ein Skill in `.claude/skills/`, der eigentliche Quellcode einer Funktion. Null Grundkosten. Der Agent greift (greps), öffnet und liest nur die Dateien, deren Namen zur aktuellen Aufgabe passen. Wenn die Entscheidung nicht relevant ist, werden keine Tokens verbraucht.

Die empirische Geschichte sieht durch diese Linse anders aus. Lulla et al. maßen Repos, in denen AGENTS.md hauptsächlich Build‑Befehle, Test‑Runner und Tool‑Namen enthielt. Das ist wirklich immer relevante Push‑Kontext, bei dem die Kosten durch vermiedene Suche zurückgezahlt werden. Die vom ETH‑Zürich‑Team generierten LLM‑Dateien waren mit architektonischen Übersichten, Verzeichnisbäumen und Stilregeln gefüllt, die der Agent **nicht im Kontext brauchte, weil er sie bei Bedarf entdecken konnte** (https://www.marktechpost.com/2026/02/25/new-eth-zurich-study-proves-your-ai-coding-agents-are-failing-because-your-agents-md-files-are-too-detailed/). Das ist Push‑Kontext, der eine Steuer zahlt, ohne Rückzahlung.

Gleicher Artefakt, unterschiedlicher Inhalt, gegensätzliche Ergebnisse. Die Kennzahl, die zählt, ist nicht „existiert die Datei“, sondern „was haben Sie hineingeschrieben“.
## Die CLAUDE.md‑Falle, in die die meisten Repos tappen

Öffne die CLAUDE.md eines zufälligen öffentlichen Repos und du wirst fünf wiederkehrende Punkte finden. Build‑ und Test‑Befehle, korrekt als Push‑Context platziert. Tool‑Namen, die der Agent sonst nicht ableiten würde, wie `uv` oder `pnpm`, ebenfalls korrekt. Die ETH‑Studie hat ergeben, dass [erwähnte Werkzeuge 160 × häufiger verwendet werden](https://www.marktechpost.com/2026/02/25/new-eth-zurich-study-proves-your-ai-coding-agents-are-failing-because-your-agents-md-files-are-too-detailed/). Dann beginnt der Ballast. Ein Verzeichnis‑Baum des Repos, den Agenten schneller über `ls` und `grep` navigieren, als indem sie eine veraltete Textversion lesen. Code‑Style‑Regeln wie die Durchsetzung von camelCase, wofür dein Linter da ist, und die Trainingsdaten des Agenten bereits zu deinen Sprachkonventionen tendieren. Schließlich die architektonische Begründung, z. B. die Wahl von Postgres über MongoDB aus Grund X, was Pull‑Context vorgibt zu sein, der tatsächlich Push‑Context sein soll.

Diese letzten drei Punkte sind der Ballast. Die architektonische Begründung ist diejenige, über die man streiten kann, weil die dahinterstehende Intuition verteidigungswürdig ist: Wenn ich die Entscheidung in CLAUDE.md lege, sieht der Agent sie in jeder Sitzung und wird sie nicht erneut diskutieren. Der Fehler dabei ist, dass du die Token‑Kosten in jeder Sitzung zahlst, einschließlich der 95 % der Sitzungen, in denen diese Entscheidung irrelevant ist, und [Anthropics eigene Richtlinie warnt Claude, dass CLAUDE.md möglicherweise nicht relevant für die Aufgabe ist](https://www.humanlayer.dev/blog/writing-a-good-claude-md). Das ist ein Eingeständnis, dass das immer geladene Modell für alles außer immer relevantem Inhalt defekt ist.

Was du tatsächlich willst, ist, dass der Agent die Entscheidung in dem Moment lernt, in dem er den relevanten Code berührt. Das ist es, was Pull‑Context bewirkt.
## Warum ADRs das richtige Pull‑Context‑Muster sind

Architecture Decision Records haben in [Michael Nygard's Format](https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions) vier Eigenschaften, die sie agentenfreundlich machen, ohne Push‑Context zu sein.

**Nummeriert und sequenziell.** `docs/adr/0007-use-klinecharts-for-price-rendering.md`. Der Agent kann `docs/adr/` nach jedem Begriff durchsuchen und jede Entscheidung finden, die ihn berührt. Kontext, nicht Trivia.

**Statusge‑trackt.** `Accepted`, `Superseded by ADR-0023`, `Deprecated`. Wenn der Agent ADR‑0007 liest und `Superseded by ADR-0023` sieht, folgt er dem Link. Die Entscheidungshistorie ist navigierbar, ohne eine einzelne Datei zu verschmutzen.

**Alternativen‑Abschnitt.** Jeder ADR listet, was abgelehnt wurde und warum. Das ist der Teil, den niemand in CLAUDE.md dokumentiert, weil er zu lang wäre, und er ist der Teil, der verhindert, dass ein Agent drei Monate später „hilfreich“ deine Bibliothekswahl austauscht. Ohne dokumentierte Alternativen schlägt der Agent die abgelehnte Option erneut vor, weil seine Trainingsdaten mehr Beispiele der Alternative enthalten.

**Niemals überschrieben.** Wenn du deine Meinung änderst, schreibst du einen neuen ADR, der den alten superseded. Die Prüfspur ist das Artefakt. `git log` liefert das nicht. Es liefert Diffs, nicht die darüber liegende Argumentationsebene.

Der Agent bezahlt null Tokens für ADRs, die du nicht liest. Wenn er einen liest, erhält er 200 Wörter fokussierten, strukturierten Entscheidungskontexts genau in dem Moment, in dem er relevant ist.
## Die vollständige Push/Pull‑Zerlegung

Für ein agentisches Repo vier Artefakttypen mit vier unterschiedlichen Aufbewahrungsorten.

**CLAUDE.md (push).** Unter 100 Zeilen. Tool‑Namen, die der Agent nicht ableiten würde. Nicht‑Standard‑Build, Test‑ und Lint‑Befehle. Sicherheitsgrenzen („niemals Migrationen ohne Genehmigung ausführen“). Ein Verweis darauf, wo ADRs und Specs liegen. Nichts weiter. Wenn deine CLAUDE.md über 200 Zeilen hat, zahlst du pro Sitzung Steuern auf irrelevanten Inhalt.

**`docs/adr/` (pull).** Bindende architektonische Entscheidungen. Eine Entscheidung pro Datei. Nygard‑Format. Hier steht die Begründung, warum Nautilus statt vectorbt gewählt wurde.

**`docs/specs/` (pull).** Intent pro Feature. Was das Feature tut, was es nicht tut, Akzeptanzkriterien. Der Agent liest die Spec für das Feature, das er gerade baut, und ignoriert den Rest. Spec‑getriebene Entwicklungs‑Frameworks wie [Intent](https://www.augmentcode.com/guides/how-to-build-agents-md) formalisieren das. Du musst das Tool nicht zum Befolgen des Musters zwingen.

**`.claude/skills/` (pull, ausgelöst).** Workflow‑Protokolle. Wie man QA durchführt, wie man einen PR öffnet, wie man einen Blogbeitrag schreibt. Wird nur geladen, wenn die Trigger‑Phrase der Fähigkeit passt. Das ist [progressive disclosure](https://github.com/shanraisshan/claude-code-best-practice). Der Agent sieht die Fähigkeitsbeschreibung, entscheidet, sie zu laden, und sieht dann den Inhalt.

Der gemeinsame Nenner in den Pull‑Ebenen ist, dass der Agent basierend auf Aufgabenrelevanz auswählt, was geladen wird. CLAUDE.md ist die einzige Ebene, in der du für den Agenten wählst, und du bezahlst dafür jede Sitzung.
## Das Gegenargument des Lore-Papiers ist lesenswert

[Ivan Stetsenkos März‑2026‑Papier](https://arxiv.org/abs/2603.15566) argumentiert, dass ADRs auf zu grober Granularität operieren. Sie erfassen „warum PostgreSQL statt MongoDB“ nicht aber „warum diese Wiederholschleife drei Versuche und nicht fünf hat.“ Die Implementierungsebene‑Begründung, die er den **Decision Shadow** nennt, verschwindet. Sein Vorschlag ist, strukturierte Git‑Commit‑Nachrichten als Träger zu verwenden.

Er hat recht, dass ADRs eine Granularitäts‑Obergrenze haben. Die Antwort ist nicht, sie aufzugeben, sondern sie zu schichten. Commit‑Nachrichten erfassen die Begründung pro Änderung. ADRs erfassen die Begründung pro Entscheidung. Spezifikationen erfassen die Begründung pro Feature. **CLAUDE.md** erfasst die Begründung pro Repository. Jede Schicht hat ihre eigene Position im Push/Pull‑Spektrum und trägt ein unterschiedliches Granularitäts‑Level der Entscheidung.

Der Fehler besteht darin, eine Schicht für die Arbeit einer anderen zu verwenden. **CLAUDE.md**, das mit architektonischer Begründung überladen ist, ist die häufigste Form dieses Fehlers. Commit‑Nachrichten, die mit projektbezogenem Kontext aufgebläht sind, sind das seltenere Gegenstück.
## Was ich nicht behaupte

Keine Studie hat ADRs speziell isoliert und ihre Auswirkung auf den Erfolg von Agentenaufgaben gemessen. Die obigen Belege beziehen sich auf Dateien im Stil von AGENTS.md. Das Push/Pull‑Argument ist ein architektonischer Anspruch, der aus den AGENTS.md‑Daten plus dem bekannten Verhalten von dateisystembewussten Agenten extrapoliert wurde, nicht eine direkte Messung. Jemand sollte dieses Experiment durchführen. Bis das geschieht, sollte man dies als strukturierte Hypothese und nicht als Satz verstehen.

Ich behaupte zudem nicht, dass Pull‑Kontext kostenlos ist. Der Agent muss wissen, wo er suchen soll. Das bedeutet, CLAUDE.md muss einen kurzen Verweis enthalten, z. B. „Binding‑Entscheidungen befinden sich in `docs/adr/`, sortiert nach Nummer. Lies den relevanten ADR, bevor du die Architektur änderst.“ Ohne den Verweis entdeckt der Agent die Pull‑Ebene nicht. Mit ihm schaltet eine Zeile Push‑Kontext beliebige Pull‑Tiefe frei.
## Was man am Montag tun sollte

Öffne die `CLAUDE.md` deines Repos. Schneide jeden Abschnitt heraus, der nicht für jede Sitzung universell relevant ist. Der Verzeichnisbaum gehört hin. Der Style‑Guide gehört hin (dein Linter kümmert sich darum). Die architektonische Begründung gehört hin. Verschiebe das alles nach `docs/adr/0001-whatever.md` im Nygard‑Format, inklusive des Abschnitts *alternatives*, den du bisher ausgelassen hast.

Füge eine Zeile zu `CLAUDE.md` hinzu: `Binding architectural decisions live in docs/adr/. Read the relevant ADR before proposing structural changes.`

Diese einzige Umstrukturierung ist die wirkungsvollste Änderung, die agenten‑fähige Repos derzeit vornehmen können. Sie kostet einen Nachmittag. Sie entfernt die 20 %ige Reasoning‑Token‑Steuer auf irrelevante Sitzungen, bewahrt die Entscheidungsgeschichte mit höherer Treue, als es `CLAUDE.md` jemals könnte, und gibt Mitwirkenden (Menschen und Agenten) eine beständige Prüfspur.

Die beiden Studien widersprechen sich nicht. Sie messen zwei unterschiedliche Inhaltsstrategien unter demselben Dateinamen. Trenne *push* von *pull* und der Widerspruch löst sich auf.

---

*Christian Pojoni schreibt über agenten‑basiertes Coding, Rust und Handelsinfrastruktur auf [vasudev.xyz](https://vasudev.xyz). Er entwickelt [Hrafn](https://github.com/5queezer/hrafn), ein Rust‑Agent‑Framework, und trägt zu MuninnDB bei.*

*Das Titelbild dieses Beitrags wurde von KI generiert.*