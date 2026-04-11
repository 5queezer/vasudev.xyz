---
title: "Ihr MCP Setup verbrennt 90% seines Kontextfensters. Hier ist die Lösung."
date: 2026-04-10
tags: ["mcp", "claude", "ai", "agents", "tool-use"]
description: "Jedes MCP-Tool, zudem du eine Verbindung herstellst, lädt sein vollständiges Schema sofort, bevor du ein Wort eingibst. Die verschobene Ladefunktion von Anthropic behebt das."
images: ["/images/mcp-context-window-fix-og.png"]
translationHash: "d1937a23222815138e9d6b6dbe57620f"
chunkHashes: "e44a8422d15abf5a,3bcfebdbd143c944,8280812d5580fe0e,cfd893eb1abea6bb,27081f359030c72d,665a133456bb0746,324b5b78d6fa7aff"
---
## Warum Diesgeschieht

MCP-Server bewerben ihre Tools als JSON-Schema-Objekte: Namen, Beschreibungen, ...

**Jedes MCP-Tool, das du verbindest, ist eine Vorauszahlung, unabhängig davon, ob das Tool genutzt wird oder nicht.**

Dies ist das Standardverhalten von MCP-Clients heute: Alle Tool-Definitionen werden am Anfang jeder Anfrage in den Kontext geladen. Die Spezifikation verlangt das nicht. Es ist nur der einfachste Weg, und er skaliert schlecht.
Verbinde [GitHub's MCP server](https://github.com/github/github-mcp-server) mit Claude. Prüfe jetzt deinen Token-Zähler, bevor du eine einzige Nachricht sendest. [46,000 tokens, 22% of Claude Opus's context window](https://www.candede.com/articles/claude-tool-search), verbraucht von Tool-Definitionen, die du noch nicht verwendet hast. Füge Jira (noch ~17K), einen Slack-Server, Google Drive und du bringst über 100K Token an Overhead auf, bevor du überhaupt Arbeit erledigst. [Anthropic benchmarked internal setups reaching 134K tokens](https://www.anthropic.com/engineering/advanced-tool-use) in Tool-Definitionen allein.
## Why This Happens

MCP servers advertise their tools as JSON schema objects: names, descriptions, parameter types, required fields, examples. These schemas are useful. They're how Claude knows what a tool does and how to call it correctly. But "useful" and "needs to be in context at all times" are different things.

A five‑server setup (GitHub with 91 tools, Jira, Slack, Google Drive, a custom internal server) might expose 140 tools in total. At roughly 400‑600 tokens per tool definition, that's 55K-85K tokens gone before you've asked a question. The model also degrades under this load: [Anthropic's benchmarks](https://www.anthropic.com/engineering/advanced-tool-use) show tool selection accuracy collapses as tool count grows, because the model has to hold too many options in attention simultaneously.

More tools in context = more tokens burned + worse decisions about which tool to use. It's a double penalty.
## DieLösung: defer_loading und Tool Search

Anthropic shipped a solution in November 2025 under the `advanced-tool-use-2025-11-20` beta header. The mechanism is called deferred loading, and the pattern it enables is called Tool Search.

Instead of loading all tool schemas upfront, you mark tools with `defer_loading: true`. The API receives the definitions but does not inject them into context. Claude starts with a lean context and a single meta-tool (a search tool) that it calls when it needs to discover what's available.

```python
import anthropic

client = anthropic.Anthropic()

response = client.beta.messages.create(
    betas=["advanced-tool-use-2025-11-20"],
    model="claude-opus-4-6",
    max_tokens=2048,
    tools=[
        # The search tool -- always in context, ~500 tokens
        {"type": "tool_search_tool_bm25_20251119", "name": "tool_search_tool_bm25"},        # High-frequency tool -- keep loaded
        {"name": "read_file", "description": "...", "input_schema": {...}, "defer_loading": False},

        # Everything else -- on demand
        {"name": "github_create_pr", "description": "...", "input_schema": {...}, "defer_loading": True},
        {"name": "jira_create_issue", "description": "...", "input_schema": {...}, "defer_loading": True},
        # ... 100 more
    ],
    messages=[{"role": "user", "content": "Create a PR for the fix in branch feat/timeout"}]
)
```

When Claude needs to create a PR, it calls `tool_search_tool_bm25` with a natural language query like "eine Pull Request auf GitHub erstellen." The API returns 3-5 matching tool definitions, which are then injected into context just-in-time. Claude calls the tool. The schemas are discarded after the turn.

Result: [~8.7K tokens pro Anfrage statt ~77K](https://www.atcyrus.com/stories/mcp-tool-search-claude-code-context-pollution-guide). Eine Reduktion von 85 % des Overheads.
## Two SearchModes

Anthropic liefert zwei integrierte Suchvarianten. Sie sind nicht austauschbar.

**BM25** (`tool_search_tool_bm25_20251119`) nutzt natürliche Sprachabgleich. Claude formuliert Abfragen mit Ausdrücken wie "send email to user" oder "fetch document from drive." Verwende diese, wenn deine Toolnamen unterschiedliche Konventionen über Server hinweg folgen (z. B. `gmail_send` vs `send_message` vs `compose_email`). Sie toleriert Namensinkonsistenzen, weil sie gegen Beschreibungen und nicht nur gegen Namen abgeglichen wird.

**Regex** (`tool_search_tool_regex_20251119`) nutzt Python `re.search()`-Mustern. Claude erstellt Muster wie `github.*pull_request` oder `jira.*issue`. Verwende diese, wenn dein Toolkatalog eine strenge, vorhersehbare Namenskonvention aufweist und du deterministische Abrufe willst. Schneller und präziser, aber er bricht sobald die Namensgebung inkonsistent ist. Muster sind auf 200 Zeichen begrenzt.

Für die meisten Setups mit mehreren MCP-Servern ist BM25 die sicherere Standardoption. Für interne Toolkataloge, die du vollständig kontrollierst, liefert Regex bessere Präzision.
## Für MCP Servers: Das ganze Ding aufschieben

Wenn Sie die Claude API mit MCP-Servern direkt (nicht nur rohen Tool-Definitionen) aufrufen, können Sie ein ganzes Server‑Toolset mit `mcp_toolset` verschieben:

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

Dies verschiebt alle Tools vom `github`‑Server, außer `read_file`, das bleibt geladen, weil es in fast jeder Session verwendet wird. [Claude Code macht automatisch eine Version davon](https://www.atcyrus.com/stories/mcp-tool-search-claude-code-context-pollution-guide): wenn verbundene MCP‑Tool-Definitionen 10K Token überschreiten, markiert es sie als verschoben und aktiviert Tool Search ohne zusätzliche Konfiguration.
## Entwurf benutzerdefinierter MCP-Server für Tool Search

Wenn Sie den Server steuern, bestimmen die Designentscheidungen, die Sie von vornherein treffen, wie gut Tool Search Ihre Tools später abruft. Es gibt drei Dinge, die zählen.

**Benennung ist die regex-Schnittstelle.** Wenn Sie die regex-Variante verwenden möchten, etablieren Sie von Anfang an eine strikte Präfix-Konvention: `github__create_pr`, `github__list_issues`, `jira__create_issue`. Der Doppel-Bindestrich-Trennzeichen-Marker macht `github__.*` unambig. Das Mischen von Konventionen innerhalb eines einzelnen Servers (beispielsweise `createPR` neben `list_issues`) bricht die regex-Abholung komplett. Sie landen dann bei BM25 für ein Verzeichnis, das regex-freundlich sein sollte.

**Beschreibungen sind die BM25-Schnittstelle.** Schreiben Sie jede Tool-Beschreibung so, als wäre es ein Suchmaschinen-Snippet, weil es das ist. Beginnen Sie mit dem Verb und dem Objekt: "Create a pull request in a GitHub repository" schneidet besser ab als "PR creation utility." Fügen Sie Synonyme für die Aktion ein, wenn sie gebräuchlich sind: "Send an email (compose, deliver message) to one or more recipients via Gmail." Das Abrufsystem passt gegen den gesamten Beschreibungstext, sodass die Schlüsselwort-Dichte wichtiger ist als Eleganz.

**Entscheiden Sie sich im Voraus, welche Tools immer geladen werden.** Jeder Server hat 2-3 Tools, die in fast jeder Session aufgerufen werden: ein `read_file`, ein `list_resources`, ein `get_current_user`. Markieren Sie diese mit `defer_loading: false` und planen Sie den Rest so, dass davon ausgegangen wird, dass sie kalt sind. Das Ziel ist, dass kalte Tools eigenständig genug sind, dass Claude sie korrekt allein anhand ihrer Beschreibung aufrufen kann, ohne sie vorher in der Session gesehen zu haben.

Eine strukturelle Entscheidung, die früh getroffen werden sollte: ein Server mit vielen Tools versus mehrere fokussierte Server. Tool Search behandelt beides, aber fokussierte Server geben Ihnen ein natürliches Namespace für regex-Muster und machen `default_config: {defer_loading: true}` pro Server granularer. Ein `github` Server und ein `jira` Server, die Sie unabhängig voneinander deferen können, ist sauberer als ein `project-management` Server mit 80 gemischten Tools.

---

Tool Search ist in öffentlicher Beta und die Abrufgenauigkeit ist noch nicht produktionsreif für alle Workloads. Ein [externer Test von Arcade.dev, bei dem 4,027 Tools geladen werden](https://growthmethod.com/anthropic-tool-search/) über 25 gängige Workflows, erreichte 56-60% Abrufgenauigkeit bei der regex-Variante. Die eigenen Zahlen von Anthropic sind besser. [Opus 4.5 springt von 79.5% auf 88.1%](https://medium.com/@DebaA/anthropic-just-shipped-the-fix-for-tool-definition-bloat-77464c8dbec9). Das sind jedoch Benchmarks, keine Produktionseinzelheiten.

Die Implikation: schreiben Sie Ihre Tool-Beschreibungen so, als müsste BM25 sie finden, ohne den Tool-Namen zu kennen. Vermeiden Sie technischen Jargon in Beschreibungen. "Send transactional email via SMTP" ist schwerer zu finden als "Send an email to a user." Das Abrufsystem passt gegen Beschreibungen, sodass die Beschreibung die Schnittstelle ist.

Tool Search funktioniert nicht mit Tool-Nutzungsbeispielen (Few‑Shot‑Prompting für Tool‑Aufrufe). Wenn Sie auf Beispiele für Genauigkeit setzen, benötigen Sie eine Work‑around.
## Wasich weggelassen habe

**Prompt-Caching + verzögerte Tools.** Die Dokumentation von Anthropic erwähnt die Kombination von `defer_loading` mit zwischengespeicherten Tool‑Definitionen. Ich habe das noch nicht benchmarked. Die Interaktion zwischen Cache‑Invalidierung und Just‑in‑time‑Schema‑Injection ist nicht offensichtlich. [Relevant docs here.](https://platform.claude.com/docs/en/agents-and-tools/tool-search-tool)

**Benutzerdefinierte Suchimplementierungen.** Sie können Ihr eigenes Suchtool mit Embeddings oder semantischer Suche implementieren und `tool_reference`‑Blöcke zurückgeben. Das ist der richtige Weg für große Kataloge (1.000+ Tools), wo die BM25‑Abrufgenauigkeit nicht ausreicht. Anthopics' [code execution with MCP post](https://www.anthropic.com/engineering/code-execution-with-mcp) behandelt das breitere Muster, MCP‑Server als Code‑APIs statt als direkte Tool‑Aufrufe zu präsentieren. Wert, als Ergänzung zu lesen.

**Agent‑SDK‑Unterstützung.** Mitte 2026 ist das Python Agent SDK nicht in der Lage, `defer_loading` als Parameter freizugeben. Man muss auf die Roh‑API zurückgreifen. [This GitHub issue](https://github.com/anthropics/claude-agent-sdk-python/issues/525) ist dabei.

**Weitere Modell‑Anbieter.** `defer_loading` ist eine Claude‑API‑Funktion, keine Merkmal des MCP‑Protokolls. OpenAI, Gemini und andere haben noch keine Entsprechung. Wenn Sie provider‑agnostische Agents bauen, benötigen Sie eine clientseitige Routing‑Schicht stattdessen.

---

Aktivieren Sie `defer_loading` für alles, was Sie nicht in jeder Session verwenden. Das sind vermutlich 80 % Ihrer Tools. Beginnen Sie mit den [offiziellen Dokumenten](https://platform.claude.com/docs/en/agents-and-tools/tool-search-tool) und dem [Anthropic engineering post](https://www.anthropic.com/engineering/advanced-tool-use) für die vollständige API‑Referenz.

---

*Christian Pojoni baut kontexteffiziente Agents. Mehr bei [vasudev.xyz](https://vasudev.xyz).*

*Das Cover‑Image für diesen Beitrag wurde von KI generiert.*