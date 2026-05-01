---
title: "Dein MCP‑Setup verbrennt 90 % seines Kontextfensters. Hier ist die Lösung."
date: 2026-04-10
tags: ["mcp", "claude", "ai", "agents"]
description: "Jedes MCP‑Tool, das Sie verbinden, lädt sein vollständiges Schema im Voraus, bevor Sie ein Wort tippen. Anthropic's verzögertes Laden behebt das."
images: ["/images/mcp-context-window-fix-og.png"]
images: ["/images/mcp-context-window-fix-og.png"]
images: ["/images/mcp-context-window-fix-og.png"]
translationHash: "9d63a016d732196c0848baca371cb0a7"
chunkHashes: "3886a8ae7806d6a4,e81dbeffd9a9b444,f42e5e8b8b603887,cfd893eb1abea6bb,27081f359030c72d,665a133456bb0746,324b5b78d6fa7aff"
---
Verbinde den [GitHub‑MCP‑Server](https://github.com/github/github-mcp-server) mit Claude. Prüfe jetzt deinen Token‑Zähler, bevor du eine einzige Nachricht sendest. [46.000 Token, 22 % von Claude Opus’ Kontextfenster](https://www.candede.com/articles/claude-tool-search) werden bereits durch Werkzeugdefinitionen belegt, die du noch nicht verwendet hast. Füge Jira (weitere ~17 K), einen Slack‑Server, Google Drive hinzu, und du lädst über 100 K Token Overhead hoch, bevor irgendeine eigentliche Arbeit beginnt. [Anthropic hat interne Setups benchmarked, die allein bei Werkzeugdefinitionen 134 K Token erreichen](https://www.anthropic.com/engineering/advanced-tool-use).

**Jedes MCP‑Werkzeug, das du verbindest, ist eine im Voraus gezahlte Steuer, egal ob das Werkzeug genutzt wird oder nicht.**

Dies ist das Standardverhalten von MCP‑Clients heute: Alle Werkzeugdefinitionen werden zu Beginn jeder Anfrage in den Kontext geladen. Die Spezifikation verlangt das nicht. Es ist einfach der Weg des geringsten Widerstands und skaliert schlecht.
## Warum das passiert

MCP‑Server bewerben ihre Werkzeuge als JSON‑Schema‑Objekte: Namen, Beschreibungen, Parametertypen, erforderliche Felder, Beispiele. Diese Schemata sind nützlich. Sie zeigen Claude, was ein Werkzeug tut und wie es korrekt aufgerufen wird. Aber „nützlich“ und „muss jederzeit im Kontext sein“ sind verschiedene Dinge.

Ein fünf‑Server‑Setup (GitHub mit 91 Werkzeugen, Jira, Slack, Google Drive, ein benutzerdefinierter interner Server) könnte insgesamt 140 Werkzeuge bereitstellen. Bei etwa 400–600 Token pro Werkzeugdefinition sind das 55 K‑85 K Token, die verbraucht werden, bevor Sie überhaupt eine Frage gestellt haben. Das Modell verschlechtert sich unter dieser Last ebenfalls: Die [Benchmarks von Anthropic](https://www.anthropic.com/engineering/advanced-tool-use) zeigen, dass die Genauigkeit bei der Werkzeugauswahl zusammenbricht, wenn die Werkzeuganzahl steigt, weil das Modell gleichzeitig zu viele Optionen im Fokus behalten muss.

Mehr Werkzeuge im Kontext = mehr verbrauchte Token + schlechtere Entscheidungen darüber, welches Werkzeug zu verwenden ist. Das ist ein doppelter Nachteil.

![Balkendiagramm, das den Tokenverbrauch von 77 K auf 8,7 K bei verzögertem Laden von Werkzeugen zeigt](/images/context-window-cost-inline.svg)
## Die Lösung: defer_loading und Tool Search

Anthropic hat im November 2025 eine Lösung unter dem Beta‑Header `advanced-tool-use-2025-11-20` veröffentlicht. Der Mechanismus heißt deferred loading, und das daraus resultierende Muster wird Tool Search genannt.

Anstatt alle Tool‑Schemas im Voraus zu laden, markierst du Tools mit `defer_loading: true`. Die API erhält die Definitionen, fügt sie aber nicht sofort in den Kontext ein. Claude startet mit einem schlanken Kontext und einem einzigen Meta‑Tool (einem Such‑Tool), das er aufruft, wenn er herausfinden muss, was verfügbar ist.

```python
import anthropic

client = anthropic.Anthropic()

response = client.beta.messages.create(
    betas=["advanced-tool-use-2025-11-20"],
    model="claude-opus-4-6",
    max_tokens=2048,
    tools=[
        # Das Such‑Tool – immer im Kontext, ~500 Tokens
        {"type": "tool_search_tool_bm25_20251119", "name": "tool_search_tool_bm25"},

        # Hochfrequentes Tool – ständig geladen
        {"name": "read_file", "description": "...", "input_schema": {...}, "defer_loading": False},

        # Alles andere – bei Bedarf
        {"name": "github_create_pr", "description": "...", "input_schema": {...}, "defer_loading": True},
        {"name": "jira_create_issue", "description": "...", "input_schema": {...}, "defer_loading": True},
        # ... 100 weitere
    ],
    messages=[{"role": "user", "content": "Create a PR for the fix in branch feat/timeout"}]
)
```

Wenn Claude einen PR erstellen muss, ruft er `tool_search_tool_bm25` mit einer natürlichen Sprachabfrage wie „create pull request GitHub.“ auf. Die API liefert 3‑5 passende Tool‑Definitionen, die dann just‑in‑time in den Kontext injiziert werden. Claude ruft das Tool auf. Die Schemas werden nach dem Durchlauf verworfen.

Ergebnis: [~8,7 K Tokens pro Anfrage statt ~77 K](https://www.atcyrus.com/stories/mcp-tool-search-claude-code-context-pollution-guide). Eine Reduktion des Overheads um 85 %.
## Zwei Suchmodi

Anthropic liefert zwei eingebaute Suchvarianten. Sie sind nicht austauschbar.

**BM25** (`tool_search_tool_bm25_20251119`) verwendet natürlichsprachliche Übereinstimmungen. Claude fragt mit Phrasen wie „send email to user“ oder „fetch document from drive“. Verwende dies, wenn deine Tool‑Namen auf verschiedenen Servern unterschiedliche Konventionen haben (zum Beispiel `gmail_send` vs `send_message` vs `compose_email`). Es toleriert Namensinkonsistenzen, weil es gegen Beschreibungen und nicht nur gegen Namen abgleicht.

**Regex** (`tool_search_tool_regex_20251119`) nutzt Python‑`re.search()`‑Muster. Claude erstellt Muster wie `github.*pull_request` oder `jira.*issue`. Verwende dies, wenn dein Tool‑Katalog eine strenge, vorhersehbare Namenskonvention hat und du eine deterministische Abrufung willst. Schneller und präziser, aber es bricht, sobald die Namensgebung inkonsistent ist. Muster sind auf 200 Zeichen begrenzt.

Für die meisten Setups mit mehreren MCP‑Servern ist BM25 die sicherere Standardeinstellung. Für interne Tool‑Kataloge, die du von Anfang bis Ende kontrollierst, liefert Regex eine bessere Präzision.
## Für MCP-Server: Alles aufschieben

Wenn du die Claude‑API direkt mit MCP‑Servern aufrufst (nicht nur rohe Werkzeugdefinitionen), kannst du alle Werkzeuge eines Servers mit `mcp_toolset` aufschieben:

```json
{
  "type": "mcp_toolset",
  "mcp_server_name": "github",
  "default_config": {"defer_loading": true},
  "configs": {
    "read_file": {"defer_loading": false}
  }
}
```

Damit werden alle Werkzeuge vom `github`‑Server außer `read_file` aufgeschoben, weil `read_file` in fast jeder Sitzung verwendet wird. [Claude Code macht eine solche Version automatisch](https://www.atcyrus.com/stories/mcp-tool-search-claude-code-context-pollution-guide): Wenn die verbundenen MCP‑Werkzeugdefinitionen 10 K‑Token überschreiten, werden sie als aufgeschoben markiert und die Werkzeugsuche wird ohne zusätzliche Konfiguration aktiviert.
## Gestaltung benutzerdefinierter MCP‑Server für die Tool‑Suche

Wenn Sie den Server kontrollieren, bestimmen die Designentscheidungen, die Sie im Vorfeld treffen, wie gut die Tool‑Suche Ihre Tools später findet. Drei Dinge sind wichtig.

**Naming ist die Regex‑Schnittstelle.** Wenn Sie die Regex‑Variante nutzen wollen, etablieren Sie von Anfang an eine strikte Präfix‑Konvention: `github__create_pr`, `github__list_issues`, `jira__create_issue`. Der Doppel‑Unterstrich‑Separator macht `github__.*` eindeutig. Das Mischen von Konventionen auf einem einzigen Server (zum Beispiel `createPR` neben `list_issues`) zerstört die Regex‑Abruf‑Logik vollständig. Sie werden dann auf BM25 für einen Katalog zurückgreifen müssen, der regex‑freundlich sein sollte.

**Descriptions sind die BM25‑Schnittstelle.** Schreiben Sie jede Tool‑Beschreibung, als wäre sie ein Snippet einer Suchmaschine, weil sie das ja ist. Beginnen Sie mit dem Verb und dem Objekt: „Create a pull request in a GitHub repository“ übertrifft „PR creation utility.“ (auf Deutsch: „Erstelle einen Pull‑Request in einem GitHub‑Repository“ übertrifft „PR‑Erstellungs‑Utility.“). Fügen Sie Synonyme für die Aktion hinzu, wenn sie üblich sind: „Send an email (compose, deliver message) to one or more recipients via Gmail.“ (auf Deutsch: „Sende eine E‑Mail (verfassen, Nachricht zustellen) an einen oder mehrere Empfänger über Gmail.“). Das Retrieval‑Modell vergleicht den vollständigen Beschreibungstext, daher ist die Schlüsselwort‑Dichte wichtiger als stilistische Eleganz.

**Entscheiden Sie im Vorfeld, welche Tools immer geladen werden.** Jeder Server hat 2–3 Tools, die in nahezu jeder Sitzung aufgerufen werden: ein `read_file`, ein `list_resources`, ein `get_current_user`. Markieren Sie diese mit `defer_loading: false` und designen Sie den Rest unter der Annahme, dass sie kalt sind. Das Ziel ist, dass kalte Tools so eigenständig sind, dass Claude sie korrekt anhand ihrer Beschreibung aufrufen kann, ohne sie zuvor in der Sitzung gesehen zu haben.

Eine strukturelle Entscheidung, die sich früh lohnt: ein Server mit vielen Tools versus mehrere fokussierte Server. Tool Search unterstützt beides, aber fokussierte Server geben Ihnen einen natürlichen Namespace für Regex‑Muster und ermöglichen ein granulareres `default_config: {defer_loading: true}` pro Server. Ein `github`‑Server und ein `jira`‑Server, die Sie unabhängig voneinander verzögern können, ist übersichtlicher als ein einziger `project-management`‑Server mit 80 gemischten Tools.

---

Tool Search befindet sich in der öffentlichen Beta und die Retrieval‑Genauigkeit ist noch nicht für alle Workloads produktionsreif. Ein [externer Test von Arcade.dev mit 4 027 Tools](https://growthmethod.com/anthropic-tool-search/) über 25 gängige Workflows erreichte 56‑60 % Retrieval‑Genauigkeit bei der Regex‑Variante. Anthropics eigene Zahlen sind besser. [Opus 4.5 springt von 79,5 % auf 88,1 %](https://medium.com/@DebaA/anthropic-just-shipped-the-fix-for-tool-definition-bloat-77464c8dbec9). Aber das sind Benchmarks, keine Produktions‑Workflows.

Die Schlussfolgerung: Schreiben Sie Ihre Tool‑Beschreibungen, als müsste BM25 sie finden, ohne den Tool‑Namen zu kennen. Verzichten Sie auf Fachjargon in den Beschreibungen. „Send transactional email via SMTP“ ist schwerer zu finden als „Send an email to a user.“ Das Retrieval vergleicht die Beschreibungen, daher ist die Beschreibung die Schnittstelle.

Tool Search funktioniert nicht mit Beispielen für Tool‑Verwendung (Few‑Shot‑Prompting für Tool‑Aufrufe). Wenn Sie auf Beispiele für Genauigkeit angewiesen sind, benötigen Sie eine Umgehungslösung.
## Was ich weggelassen habe

**Prompt‑Caching + verzögerte Werkzeuge.** Anthropics Dokumentation erwähnt die Kombination von `defer_loading` mit zwischengespeicherten Werkzeugdefinitionen. Ich habe das noch nicht benchmarked. Die Wechselwirkung zwischen Cache‑Invalidierung und Just‑in‑Time‑Schema‑Injection ist nicht offensichtlich. [Relevante Dokumentation hier.](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)

**Eigene Suchimplementierungen.** Sie können Ihr eigenes Suchwerkzeug mit Embeddings oder semantischer Suche implementieren und dabei `tool_reference`‑Blöcke zurückgeben. Das ist der richtige Ansatz für große Kataloge (1.000 + Werkzeuge), bei denen die Genauigkeit der BM25‑Abrufung nicht ausreicht. Anthropics [Code‑Execution‑Beitrag mit MCP](https://www.anthropic.com/engineering/code-execution-with-mcp) behandelt das breitere Muster, MCP‑Server als Code‑APIs statt direkter Werkzeugaufrufe zu präsentieren. Lesenswert als Ergänzung.

**Agent‑SDK‑Unterstützung.** Seit Anfang 2026 stellt das Python Agent SDK `defer_loading` nicht mehr als Parameter zur Verfügung. Man muss auf die rohe API zurückgreifen. [Dieses GitHub‑Issue](https://github.com/anthropics/claude-agent-sdk-python/issues/525) verfolgt das.

**Andere Modell‑Anbieter.** `defer_loading` ist ein Claude‑API‑Feature, kein MCP‑Protokoll‑Feature. OpenAI, Gemini und andere haben dafür noch kein Äquivalent. Wenn Sie provider‑agnostische Agenten bauen, benötigen Sie stattdessen eine clientseitige Routing‑Schicht.

---

Aktivieren Sie `defer_loading` für alles, was Sie nicht in jeder Sitzung verwenden. Das sind wahrscheinlich 80 % Ihrer Werkzeuge. Beginnen Sie mit den [offiziellen Docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) und dem [Anthropic Engineering‑Beitrag](https://www.anthropic.com/engineering/advanced-tool-use) für die vollständige API‑Referenz.

---

*Christian Pojoni baut kontext‑effiziente Agenten. Mehr unter [vasudev.xyz](https://vasudev.xyz).*

*Das Titelbild für diesen Beitrag wurde von KI generiert.*