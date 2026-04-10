---
title: "Tu configuración MCP está quemando el 90 % de su ventana de contexto. Aquí tienes la solución"
date: 2026-04-10
tags: ["mcp", "claude", "ai", "agents", "tool-use"]
description: "Cada herramienta MCP que conectas carga su esquema completo de antemano, antes de escribir una palabra. La carga diferida de Anthropic soluciona este problema."
translationHash: "93efa8743ff6f126e8232ddc9c3c19ea"
chunkHashes: "5f27ce3c9231cff8,3bcfebdbd143c944,8280812d5580fe0e,cfd893eb1abea6bb,27081f359030c72d,665a133456bb0746,6fade40f4a9cbd4d"
---
Conecta el servidor MCPde GitHub a Claude. Ahora verifica el contador de tokens antes de enviar un solo mensaje. [46,000 tokens, 22 % del contexto de Claude Opus](https://www.candede.com/articles/claude-tool-search), consumidos por las definiciones de herramientas que aún no has usado. Añade Jira (otro ~17 K), un servidor de Slack, Google Drive y estarás empujando más de 100 K de tokens de sobrecarga antes de cualquier trabajo real. [Anthropic midió instalaciones internas que alcanzan 134 K de tokens](https://www.anthropic.com/engineering/advanced-tool-use) solo en definiciones de herramientas.  

**Cada herramienta MCP que conectes es un impuesto pagado por adelantado, independientemente de que la herramienta se use o no.**  

Este es el comportamiento predeterminado de los clientes MCP hoy en día: cargar todas las definiciones de herramientas en el contexto al inicio de cada solicitud. La especificación no lo requiere. Es simplemente el camino de menor resistencia, y se escala mal.
## Why This Happens

MCP servers advertise their tools as JSON schema objects: names, descriptions, parameter types, required fields, examples. These schemas are useful. They're how Claude knows what a tool does and how to call it correctly. But "útil" y "necesario estar en el contexto en todo momento" son cosas distintas.

A five-server setup (GitHub with 91 tools, Jira, Slack, Google Drive, a custom internal server) might expose 140 tools in total. At roughly 400-600 tokens per tool definition, that's 55K-85K tokens gone before you've asked a question. The model also degrades under this load: [Anthropic's benchmarks](https://www.anthropic.com/engineering/advanced-tool-use) show tool selection accuracy collapses as tool count grows, because the model has to hold too many options in attention simultaneously.

More tools in context = more tokens burned + worse decisions about which tool to use. It's a double penalty.
## La solución: defer_loading y la Búsqueda de Herramientas

Anthropic implementó una solución en noviembre de 2025 bajo la cabecera beta `advanced-tool-use-2025-11-20`. El mecanismo se llama carga diferida, y el patrón que habilita se denomina Búsqueda de Herramientas.

En lugar de cargar todos los esquemas de herramientas de antemano, marcas las herramientas con `defer_loading: true`. La API recibe las definiciones pero no las inyecta en el contexto. Claude comienza con un contexto liviano y una única meta‑herramienta (una herramienta de búsqueda) que invoca cuando necesita descubrir qué está disponible.

```python
import anthropicclient = anthropic.Anthropic()

response = client.beta.messages.create(
    betas=["advanced-tool-use-2025-11-20"],
    model="claude-opus-4-6",
    max_tokens=2048,
    tools=[
        # The search tool -- always in context, ~500 tokens
        {"type": "tool_search_tool_bm25_20251119", "name": "tool_search_tool_bm25"},

        # High-frequency tool -- keep loaded
        {"name": "read_file", "description": "...", "input_schema": {...}, "defer_loading": False},

        # Everything else -- on demand
        {"name": "github_create_pr", "description": "...", "input_schema": {...}, "defer_loading": True},
        {"name": "jira_create_issue", "description": "...", "input_schema": {...}, "defer_loading": True},
        # ... 100 more
    ],
    messages=[{"role": "user", "content": "Create a PR for the fix in branch feat/timeout"}]
)
```

When Claude needs to create a PR, it calls `tool_search_tool_bm25` with a natural language query like "create pull request GitHub." The API returns 3-5 matching tool definitions, which are then injected into context just-in-time. Claude calls the tool. The schemas are discarded after the turn.

Result: [~8.7K tokens per request instead of ~77K](https://www.atcyrus.com/stories/mcp-tool-search-claude-code-context-pollution-guide). An 85% reduction in overhead.
##Dos Modos de Búsqueda

Anthropic ofrece dos variantes de búsqueda integradas. No son intercambiables.

**BM25** (`tool_search_tool_bm25_20251119`) usa emparejamiento de lenguaje natural. Claude consulta con frases como "send email to user" o "fetch document from drive." Usa esto cuando los nombres de tus herramientas siguen diferentes convenciones en varios servidores (por ejemplo, `gmail_send` vs `send_message` vs `compose_email`). Tolerates la inconsistencia en los nombres porque empareja contra descripciones, no solo contra nombres.

**Regex** (`tool_search_tool_regex_20251119`) usa patrones de `re.search()` de Python. Claude construye patrones como `github.*pull_request` o `jira.*issue`. Usa esto cuando tu catálogo de herramientas tiene una convención de nombres estricta y predecible y quieres una recuperación determinista. Más rápido y preciso, pero falla en el momento en que la nomenclatura sea inconsistente. Los patrones están limitados a 200 caracteres.

Para la mayoría de los casos con varios servidores MCP, BM25 es la opción más segura por defecto. Para catálogos de herramientas internos que controlas end-to-end, regex ofrece mejor precisión.
##Para servidores MCP: Posponer Todo

Si estás llamando a la API de Claude con servidores MCP directamente (no solo definiciones de herramientas en bruto), puedes posponer todo un servidor de herramientas con `mcp_toolset`:

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

Esto pospone todas las herramientas del servidor `github` excepto `read_file`, que permanece cargado porque se usa en casi cada sesión. [Claude Code does a version of this automatically](https://www.atcyrus.com/stories/mcp-tool-search-claude-code-context-pollution-guide)
## Diseñar servidores personalizadosde MCP para la búsqueda de herramientas

Si controlas el servidor, las decisiones de diseño que tomas desde el principio determinan qué tan bien la búsqueda de herramientas recupera tus herramientas más adelante. Tres cosas importan.

**El nombre es la interfaz de expresiones regulares.** Si planeas usar la variante de expresiones regulares, establece una convención de prefijo estricta desde el primer día: `github__create_pr`, `github__list_issues`, `jira__create_issue`. El separador de doble guion bajo hace que `github__.*` sea inequívoco. Mezclar convenciones en un solo servidor (por ejemplo, `createPR` junto a `list_issues`) rompe la recuperación por expresiones regulares por completo. Estarás obligado a usar BM25 para un catálogo que debería ser amigable con expresiones regulares.

**Las descripciones son la interfaz BM25.** Escribe cada descripción de herramienta como si fuera un fragmento de motor de búsqueda, porque lo es. Empieza con el verbo y el objeto: "Create a pull request in a GitHub repository" supera a "PR creation utility." Incluye sinónimos de la acción cuando son comunes: "Send an email (compose, deliver message) to one or more recipients via Gmail." El modelo de recuperación coincide con el texto completo de la descripción, por lo que la densidad de palabras clave importa más que la elegancia.

**Decide de antemano qué herramientas siempre se cargan.** Cada servidor tiene 2-3 herramientas que se llaman en casi cada sesión: una `read_file`, una `list_resources`, una `get_current_user`. Marca esas herramientas con `defer_loading: false` y diseña el resto pensando que estarán "frías". El objetivo es que las herramientas frías sean lo suficientemente autónomas como para que Claude las pueda llamar correctamente solo a partir de su descripción, sin haberlas visto antes en la sesión.

Una decisión estructural valiosa para tomar temprano es si usar un solo servidor con muchas herramientas o varios servidores enfocados. La búsqueda de herramientas admite ambas opciones, pero los servidores enfocados te brindan un Namespace natural para patrones de expresiones regulares y permiten que `default_config: {defer_loading: true}` sea más granular por servidor. Un servidor `github` y un servidor `jira` que puedes diferir de forma independiente es más limpio que un servidor `project-management` con 80 herramientas mezcladas.

---

La búsqueda de herramientas está en beta pública y la precisión de recuperación aún no está lista para producción en todos los casos de uso. Una [prueba externa de Arcade.dev cargando 4,027 herramientas](https://growthmethod.com/anthropic-tool-search/) a través de 25 flujos de trabajo comunes alcanzó un 56-60 % de precisión de recuperación en la variante de expresiones regulares. Los números internos de Anthropic son mejores. [Opus 4.5 pasa de 79.5 % a 88.1 %](https://medium.com/@DebaA/anthropic-just-shipped-the-fix-for-tool-definition-bloat-77464c8dbec9). Pero esos son benchmarks, no flujos de trabajo reales.

La consecuencia es: escribe tus descripciones de herramientas como si BM25 tuviera que encontrarlas sin saber el nombre de la herramienta. Evita el jerga técnica en las descripciones. "Send transactional email via SMTP" es más difícil de encontrar que "Send an email to a user." La recuperación coincide con las descripciones, por lo que la descripción es la interfaz.

La búsqueda de herramientas no funciona con ejemplos de uso de herramientas (prompting in-context para llamadas de herramienta). Si dependes de ejemplos para mayor precisión, necesitas una solución alternativa.
## What I Left Out**Cache de prompts + herramientas diferidas.** La documentación de Anthropic menciona combinar *defer_loading* con definiciones de herramienta en caché. Aún no he hecho benchmarking de esto. La interacción entre la invalidación de caché y la inyección de esquemas *just‑in‑time* no es obvia. [Relevant docs here.](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool)

**Implementaciones personalizadas de búsqueda.** Puedes implementar tu propia herramienta de búsqueda usando embeddings o búsqueda semántica, devolviendo bloques `tool_reference`. Este es el camino correcto para catálogos grandes (más de 1,000 herramientas) donde la precisión de recuperación BM25 no es suficiente. La publicación de Anthropic sobre [ejecución de código con MCP](https://www.anthropic.com/engineering/code-execution-with-mcp) abarca el patrón más amplio de presentar servidores MCP como APIs de código en lugar de llamadas directas a herramientas. Vale la pena leerla como complemento.

**Soporte del SDK de agentes.** A partir de principios de 2026, el Python Agent SDK no expone `defer_loading` como parámetro. Tienes que bajar al API crudo. [Este problema de GitHub](https://github.com/anthropics/claude-agent-sdk-python/issues/525) lo está rastreando.

**Otros proveedores de modelos.** `defer_loading` es una característica de la API de Claude, no una característica del protocolo MCP. OpenAI, Gemini y otros no tienen un equivalente aún. Si estás construyendo agentes agnósticos de proveedor, necesitas una capa de enrutamiento del lado del cliente en su lugar.

---

Enable `defer_loading` on anything you don't use in every session. That's probably 80% of your tools. Start with the [official docs](https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-search-tool) and the [Anthropic engineering post](https://www.anthropic.com/engineering/advanced-tool-use) for the full API reference.

---

*Christian Pojoni builds context-efficient agents. More at [vasudev.xyz](https://vasudev.xyz).*