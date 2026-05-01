---
title: "UI de streaming de agentes de IA: 5 herramientas clasificadas"
date: 2026-04-12
lastmod: 2026-05-01
tags: ["ai", "agents", "frontend", "architecture"]
agentQuestions:
  - "Which streaming UI tool wins and why?"
  - "How do AG-UI and Vercel AI SDK differ?"
  - "What architecture matters for agent UI?"
description: "AG-UI, A2UI, Vercel AI SDK, TanStack AI y Kombai hacen diferentes apuestas sobre cómo los agentes deben construir interfaces. La cuestión arquitectónica decide cuál gana."
images: ["/images/frontend-ai-agents-streaming-ui-og.png"]
author: "Christian Pojoni"
translationHash: "2c7cbee149762b3b7301944fd4192557"
chunkHashes: "0a3ef6b037df964b,27e2991ea2cd0ab5,2bbc871e7787de63,3fa87eb4ac66f92e,1fb95c53987e367b,f8608906d594ce51,d62c99066460a3fc,1793b237843cff7b,22b36b22535bd0fe"
---
Cada agente de IA hoy en día conversa a través de una ventana de chat. El usuario hace una pregunta, el agente transmite tokens de vuelta, quizá con un bloque de código. Todo el frontend es un emulador de terminal glorificado.

Cinco herramientas apuestan a que los agentes deberían transmitir interfaces reales en lugar de texto. Discrepan en cómo hacerlo, y dos de ellas solo difieren en los detalles.

**Los protocolos se dividen en una cuestión: ¿debe el agente enviar código ejecutable, datos estructurados o eventos de interacción?**

Tu respuesta determina tu modelo de seguridad, el acoplamiento de tu framework y si tu agente puede crear UI para algo más que una pestaña del navegador.
## La Comparación

| | Vercel AI SDK | TanStack AI | AG-UI | A2UI | Kombai |
|---|---|---|---|---|---|
| **Qué entrega** | Salida de herramienta (RSC en pausa) | Salida de herramienta (renderizado en cliente) | Eventos de interacción | Árboles JSON UI declarativos | Código fuente generado |
| **Transporte** | SSE, transmisión RSC | SSE, transmisión HTTP, iterables async, RPC | SSE, eventos bidireccionales | Transmisión JSON progresiva | HTTP (por lotes) |
| **Bloqueo de framework** | Orientado a Next.js, React primero | Núcleo independiente de framework (React, Solid, Preact) | Cualquiera (a nivel de protocolo) | Cualquiera (a nivel de protocolo) | Genera React, Vue, HTML |
| **Modelo de seguridad** | Ejecución confiable | Código aislado (Node, Workers, QuickJS) | Validación de esquema de eventos | Catálogo de componentes en lista blanca | Salida estática, sin riesgo en tiempo de ejecución |
| **Multiplataforma** | Solo web | Web | Web | Flutter, Angular, Lit (React planeado) | Web |
| **Soporte MCP** | Nativo (AI SDK 6) | Aún no | Indirecto mediante eventos de llamada a herramienta | N/D | N/D |
| **GitHub** | [Vercel/ai](https://github.com/vercel/ai) (~23K estrellas) | [TanStack/ai](https://github.com/tanstack/ai) (~2.6K, alfa) | [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui) (~13K estrellas) | [google/A2UI](https://github.com/google/A2UI) (~14K estrellas) | Código cerrado |
| **Licencia** | Apache 2.0 | MIT | MIT | Apache 2.0 | Propietaria |
| **Cuándo elegir** | Cuando despliegas en Vercel y deseas el AI Gateway | Cuando buscas portabilidad y afinación por tipo de modelo | Cuando necesitas observabilidad del agente y ciclo humano‑en‑el‑bucle | Cuando requieres multiplataforma desde agentes no confiables | Cuando conviertes diseños de Figma a código |

Eso es el panel de control. Ahora las opiniones.
## Vercel AI SDK: Transmit el Componente

El [AI SDK](https://github.com/vercel/ai) de Vercel (~23 K estrellas en GitHub) permite que tu agente devuelva componentes completos de React Server en lugar de texto. El modelo llama a una herramienta, la herramienta devuelve JSX, el framework lo transmite al navegador. Sin tubería de WebSocket. Sin configuración manual de SSE. El componente aparece progresivamente a medida que el modelo lo genera.

```tsx
const result = streamUI({
  model: openai('gpt-4o'),
  prompt: 'Show a weather dashboard for Vienna',
  tools: {
    weather: {
      description: 'Get weather data for a city',
      parameters: z.object({ city: z.string() }),
      generate: async function* ({ city }) {
        yield <WeatherSkeleton />
        const data = await getWeather(city)
        return <WeatherCard data={data} />
      }
    }
  }
})
```

Esto es lo que los tutoriales omiten: `streamUI` vive en el módulo RSC del AI SDK, que Vercel marcó como **experimental** y [detuvo su desarrollo en octubre de 2024](https://sdk.vercel.ai/docs). La ruta recomendada en AI SDK 6 es AI SDK UI. Transmites datos o objetos de llamadas a herramientas mediante `useChat` y `useObject`, y luego renderizas los componentes del lado del cliente. El enfoque RSC sigue funcionando, pero Vercel apuesta por el renderizado del lado del cliente.

Eso importa porque el argumento original para `streamUI` era "transmitir componentes de servidor completos desde tu agente". La recomendación actual se acerca más a "transmitir datos estructurados, renderizar localmente". Lo cual, si lo miras con lupa, es la misma dirección que A2UI está tomando, solo sin la seguridad a nivel de protocolo.

También estás apostando fuertemente por React y Next.js. Tu agente envía árboles de componentes ejecutables en la ruta RSC, lo que implica total confianza entre agente y frontend. Bien para agentes de primera parte. Peligroso en el momento en que aceptas la salida de herramientas de terceros. No hay una capa de sandboxing en el SDK.

Lo que el SDK ha ganado desde la pausa de streamUI es el resto de una plataforma. AI SDK 6 incluye soporte nativo de [MCP](https://sdk.vercel.ai/docs), abstracciones duraderas de agentes como `ToolLoopAgent` y `DurableAgent`, y una integración opcional con el [AI Gateway](https://vercel.com/kb/guide/vercel-ai-sdk-vs-tanstack-ai) (un endpoint para más de 20 proveedores, failover automático, cero markup para equipos en Vercel). El SDK ahora está menos centrado en UI generativa y más en el runtime del agente que la rodea.

**Úsalo** si despliegas en Vercel y deseas el gateway, MCP y agentes duraderos en una sola solución. **Sáltalo** si necesitas salida multiplataforma, o si el acoplamiento con Next.js es una fricción que no puedes asumir.
## TanStack AI: la misma apuesta, diferentes priors

[TanStack AI](https://github.com/tanstack/ai) (~2.6K estrellas, alfa a enero de 2026) es la misma apuesta arquitectónica que el SDK moderno de Vercel. Las herramientas se ejecutan en el servidor, el modelo las llama, el cliente renderiza el resultado. La división es todo lo que envuelve ese bucle.

El núcleo es independiente del framework. Un único `ChatClient` sin cabeza incluye adaptadores para React, Solid y Preact. Vue y Svelte están planificados. No hay historia de RSC y el equipo [rechazó explícitamente](https://tanstack.com/ai/latest/docs/comparison/vercel-ai-sdk) esa ruta. Eso coloca a TanStack AI aproximadamente donde el SDK de Vercel quedó después de pausar streamUI, simplemente sin la gravedad de Next.js.

```ts
const weather = defineTool({
  schema: z.object({ city: z.string() }),
  server: async ({ city }) => getWeather(city),
  client: ({ result }) => <WeatherCard data={result} />,
})
```

Tres cosas destacan del spec.

Primero, definiciones de herramientas isomórficas. Un esquema se valida en ambos lados y las mitades `server` y `client` lo comparten. El SDK de Vercel divide la misma herramienta en dos archivos y te pide que las mantengas sincronizadas. El [benchmark de LogRocket](https://blog.logrocket.com/tanstack-vs-vercel-ai-library-react/) cronometra diez herramientas en aproximadamente 600 líneas en Vercel contra 300 en TanStack AI. La mayor parte del ahorro proviene de la duplicación que ya no existe.

Segundo, estrechamiento de tipos por modelo. Elegir un modelo específico (no solo un proveedor) realmente cambia las opciones inferidas y los tipos de respuesta. Vercel estrecha por proveedor. Si tu código ramifica según las capacidades del modelo, la diferencia es visible en el verificador de tipos.

Tercero, controladores de ejecución de código en sandbox. TanStack envía entornos aislados para Node, Cloudflare Workers y QuickJS, de modo que el código generado por el modelo se ejecuta en una VM confinada. Vercel no ofrece esto a nivel del SDK. El cálculo de confianza cambia. Puedes aceptar código de modelos menos confiables sin crear tu propia sandbox.

Lo que pierdes: MCP y la plataforma. TanStack AI no tiene integración con MCP hoy y no posee un equivalente a AI Gateway. Si despliegas a través de Vercel, el gateway por sí solo es razón suficiente para quedarse. Si no lo haces, el gateway es peso muerto y el bloqueo es el costo.

El otro punto es la madurez. Software alfa, cambios disruptivos entre versiones menores, ~2.6K estrellas contra las ~23K de Vercel. Adóptalo según corresponda.

**Úsalo** si quieres un SDK portátil, estrictamente tipado, que no asuma Next.js, y puedes esperar a que salga del alfa. **Sáltalo** si necesitas MCP, abstracciones de agente duraderas o el AI Gateway hoy.
## AG-UI: Transmitir el Pensamiento

[AG-UI](https://github.com/ag-ui-protocol/ag-ui) (~13K GitHub stars) adopta un enfoque fundamentalmente diferente. En lugar de transmitir componentes de UI, transmite eventos de interacción: mensajes, indicadores de escritura, pasos de razonamiento, llamadas a herramientas, actualizaciones de estado. El frontend interpreta estos eventos como quiera.

```
event: TEXT_MESSAGE_START
event: TOOL_CALL_START  {name: "getWeather", args: {city: "Vienna"}}
event: TOOL_CALL_END    {result: {temp: 22, condition: "sunny"}}
event: STATE_SNAPSHOT   {weather: {temp: 22}}
event: TEXT_MESSAGE_CONTENT "It's 22°C and sunny in Vienna."
```

Desarrollado por el equipo de [CopilotKit](https://github.com/CopilotKit/CopilotKit), AG-UI trata la comunicación agente‑frontend como un bus de eventos estandarizado. Tu agente emite eventos tipados. Tu frontend se suscribe y los renderiza. El protocolo soporta sub‑agentes, por lo que puedes observar a un orquestador delegar trabajo y transmitir cada paso para revisión humana en el bucle.

Este es el único protocolo en la comparación que prioriza la capacidad de depuración. Puedes inspeccionar cada evento, reproducir decisiones del agente y crear UI que muestren el proceso de pensamiento junto con los resultados. Existen integraciones para [LangGraph](https://github.com/langchain-ai/langgraph), [CrewAI](https://github.com/crewAIInc/crewAI) y [Mastra](https://github.com/mastra-ai/mastra).

El compromiso es claro: AG-UI te da eventos, no interfaces. Sigues construyendo cada componente tú mismo. El protocolo te dice *qué hizo el agente*. Tú decides *qué ve el usuario*.

**Úsalo** si estás construyendo experiencias agenticas donde los usuarios necesitan ver y sobrescribir lo que el agente está haciendo en cada paso. **Omítelo** si deseas que el agente genere la UI por sí mismo.
## A2UI: Transmitir la Descripción

[A2UI](https://github.com/google/A2UI) (~14K estrellas en GitHub) de Google es la entrada más ambiciosa. El agente envía JSON puro describiendo un árbol de componentes: tarjetas, botones, campos de texto, gráficos. No hay código ejecutable. El cliente mantiene un catálogo de componentes de confianza en una lista blanca y asigna cada nodo JSON a su widget nativo.

```json
{
  "type": "Card",
  "children": [
    {"type": "Heading", "content": "Weather in Vienna"},
    {"type": "Chart", "chartType": "line", "data": [18, 22, 19, 24]},
    {"type": "Text", "content": "Current: 22°C, sunny"}
  ]
}
```

Hoy en día existen renderizadores oficiales para Flutter, Angular y Lit. React y SwiftUI están previstos pero aún no se han lanzado. La promesa arquitectónica es una descripción JSON para cada plataforma. El cliente controla todo el estilo, las animaciones y la gestión del estado. El agente controla solo la estructura y los datos.

El modelo de seguridad es lo que más destaca. Los agentes solo pueden solicitar componentes del catálogo aprobado por el cliente. La [validación de esquemas](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) se ejecuta en cada mensaje. Si el agente envía algo fuera de la lista blanca, se rechaza y el LLM se autocorrige. Esto elimina por completo la inyección de UI. Los demás protocolos no abordan la inyección a nivel de protocolo.

El streaming progresivo funciona bien: el agente comienza con un esqueleto y luego completa los datos a medida que llegan. En sistemas multi‑agente, un orquestador puede [inspeccionar y modificar las cargas útiles de UI](https://www.griddynamics.com/blog/ai-agent-for-ui-a2ui) de los sub‑agentes antes de renderizar. Esa composibilidad es única del enfoque declarativo.

A2UI se mantiene deliberadamente estrecho. No hay especificación de transporte, ni de autenticación, ni de reglas de estilo. Describe la intención de UI y nada más. Además, aún está en fase pre‑1.0. La especificación sigue evolucionando y el ecosistema es limitado.

**Úsalo** si necesitas renderizado multiplataforma desde agentes semi‑confiables o no confiables. **Omítelo** si necesitas estabilidad de producción hoy.

---
## Kombai: El que no encaja

[Kombai](https://www.kombai.com) no pertenece a la misma categoría que los otros tres, y vale la pena decirlo de antemano. No es un protocolo de streaming. Es un agente de IA comercial (extensión de VS Code + plugin de Figma) que convierte diseños en código frontend para más de 400 destinos de frameworks.

Donde streamUI, AG-UI y A2UI resuelven la comunicación agente‑usuario en tiempo de ejecución, Kombai resuelve la generación de código en tiempo de desarrollo. Le das un archivo de Figma, una imagen o una instrucción escrita. Produce código basado en componentes para React, Next.js, Svelte, Flutter, Tailwind, MUI o cualquier stack que uses. Ese código pasa por tu proceso normal de revisión y despliegue. No hay agente en tiempo de ejecución. No hay protocolo de streaming. El producto está certificado SOC 2 y no entrena con datos de los clientes.

Lo incluyo porque representa una posición diferente en el espectro: el agente construye la UI en tiempo de desarrollo, no en tiempo de ejecución. Eso hace que Kombai sea complementario en lugar de competitivo. Puedes usar Kombai para generar el catálogo de componentes que los agentes de A2UI referencian en tiempo de ejecución. O usarlo para crear la estructura de los componentes React que streamUI sirve.

Kombai es de código cerrado y propietario (nivel gratuito con 300 créditos/mes, planes pagos desde $20/mes). No hay repositorio de GitHub para el producto central.

**Úsalo** si estás convirtiendo diseños de Figma en código listo para producción. **Omitirlo** si buscas streaming agente‑a‑UI en tiempo de ejecución. Un problema totalmente distinto.
## La verdadera división

La tabla comparativa es útil pero oculta la cuestión arquitectónica que realmente importa.

El streamUI de Vercel enviaba **código**. El agente producía componentes React, el servidor los transmitía. Máxima expresividad, máxima confianza requerida. Vercel pausó esa ruta en octubre de 2024.

Lo que la reemplazó, tanto en AI SDK 6 como en TanStack AI, es la transmisión de **salida de herramientas**. El agente llama a una herramienta tipada, el resultado vuelve al cliente, el cliente lo representa. El agente nunca produce UI directamente. Mismo supuesto de confianza, superficie más estrecha. La división dentro de este grupo es portabilidad versus plataforma. TanStack rechaza el bloqueo de frameworks y añade ejecución de código en sandbox. Vercel conserva MCP, agentes duraderos y la puerta de enlace.

A2UI envía **datos**. El agente describe lo que quiere, el cliente decide cómo representarlo. Máxima seguridad, expresividad limitada. Este es el modelo de contenido web: el agente es autor, el cliente es el navegador.

AG-UI envía **eventos**. Envía lo que el agente está haciendo, y el frontend decide qué mostrar. Este es el modelo de observabilidad: el agente realiza su trabajo, la UI es un tablero de monitoreo.

Cada modelo es correcto para su límite de confianza. ¿Agentes de primera parte en tu propia infraestructura? Transmite la salida de herramientas a través del SDK que coincida con tu plataforma. ¿Agentes de terceros de servicios externos? Requiere datos declarativos. ¿Orquestación compleja de múltiples agentes donde los humanos deben intervenir? Transmite eventos.

Esto es lo que la mayoría de las comparaciones pasan por alto: AG-UI y A2UI están diseñados para ser complementarios. AG-UI define *cómo* el agente y el frontend se comunican (el transporte). A2UI define *qué* UI renderizar (el contenido). Podrías ejecutar cargas útiles de A2UI sobre eventos de AG-UI. CopilotKit ya aloja un [Generative UI Playground](https://github.com/CopilotKit/generative-ui) que muestra AG-UI, A2UI y aplicaciones MCP trabajando juntas. La arquitectura real podría no ser "elige una" sino "ápicalas en capas".

El error es elegir un protocolo basándose en el recuento de características o estrellas en GitHub. Elige según quién controla el agente y quién asume el riesgo de una representación incorrecta.
## Lo que dejé fuera

* **La relación de MCP con estos protocolos.** MCP conecta agentes con herramientas. Estos protocolos conectan agentes con usuarios. Son capas complementarias. Pero la superposición en los eventos de "llamada a herramienta" de AG-UI y el patrón "UI generada por herramienta" de streamUI merece su propio artículo.

* **Puntos de referencia de rendimiento.** Ninguno de estos protocolos publica comparaciones de latencia para el tiempo de primer renderizado, velocidad de renderizado progresivo o rendimiento de eventos bajo carga. Si haces pruebas, quiero los números.

* **El enfoque de Anthropic.** Los artefactos de Claude y el uso de herramientas en streaming representan un quinto modelo donde la plataforma se encarga del renderizado. Vale la pena compararlo, pero es arquitectónicamente distinto de los protocolos abiertos.

* **La pregunta del iframe.** Chainlit, Gradio y frameworks similares resuelven la UI del agente incrustando iframes. Funciona para el aislamiento. Ninguno de los cuatro protocolos aquí aborda ese patrón, y las razones son interesantes.

---

Lee las especificaciones y decide por el límite de confianza, no por el hype. Si despliegas en Vercel y quieres MCP, el gateway y agentes duraderos en una sola caja, el [Vercel SDK](https://sdk.vercel.ai/docs) es el camino de menor resistencia. Si quieres la misma arquitectura sin la gravedad de Next.js y con ejecución en sandbox, [TanStack AI](https://tanstack.com/ai) es la alternativa creíble una vez que se asiente la versión alfa. Si no controlas el agente, el modelo de lista blanca de [A2UI](https://a2ui.org) es el único que aborda la inyección a nivel de protocolo. Si necesitas visibilidad en flujos de trabajo multi‑agente, [AG-UI](https://github.com/ag-ui-protocol/ag-ui) es el único protocolo que hace visible el pensamiento.

---

*Christian Pojoni evalúa los protocolos de interfaz de agentes. Más en [vasudev.xyz](https://vasudev.xyz).*

*La imagen de portada de esta publicación fue generada por IA.*