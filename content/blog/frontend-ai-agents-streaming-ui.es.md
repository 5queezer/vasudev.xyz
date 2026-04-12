---
title: "Interfaz de transmisión desde agentes de IA: 4 enfoques clasificados"
date: 2026-04-12
tags: ["ai", "agents", "frontend", "architecture"]
description: "AG-UI, A2UI, Vercel AI SDK streamUI y Kombai hacen cuatro apuestas diferentes sobre cómo los agentes deben crear interfaces. Una pregunta decide cuál gana."
images: ["/images/frontend-ai-agents-streaming-ui-og.png"]
author: "Christian Pojoni"
translationHash: "fc826033382bcc1c5cc5e645b9ae8a67"
chunkHashes: "58118e91cca91c36,9142427892b65d62,6a71031730590be7,3518e28c2596186a,e05335f473e3e302,f66c2c0db4067994,fb3afdb324c0836d,2f421d19f9641a44"
---
Cada agente de IA hoy habla a través de una ventana de chat. El usuario hace una pregunta, el agente transmite tokens de vuelta, quizá con un bloque de código. Todo el frontend es un emulador de terminal glorificado.

Cuatro proyectos apostan a que los agentes deberían transmitir interfaces reales en lugar de texto. Discrepan violentamente sobre cómo hacerlo.

**Los protocolos se dividen en una cuestión: ¿debería el agente enviar código ejecutable, datos estructurados o eventos de interacción?**

Tu respuesta determina tu modelo de seguridad, el acoplamiento de tu framework y si tu agente puede crear UI para algo más que una pestaña del navegador.
## The Comparison

| | Vercel AI SDK (streamUI) | AG-UI | A2UI | Kombai |
|---|---|---|---|---|
| **Qué incluye** | React Server Components | Eventos de interacción | Árboles UI JSON declarativos | Código fuente generado |
| **Transporte** | transmisión RSC | SSE, eventos bidireccionales | Transmisión progresiva JSON | HTTP (por lotes) |
| **Bloqueo de framework** | Next.js + React | Cualquiera (a nivel de protocolo) | Cualquiera (a nivel de protocolo) | Cualquiera (a nivel de protocolo) |
| **Modelo de seguridad** | Ejecución confiable | Validación de esquema de eventos | Catálogo de componentes en lista blanca | Salida estática, sin riesgo en tiempo de ejecución |
| **Multiplataforma** | Solo web | Web | Flutter, Angular, Lit (React planeado) | Web |
| **Integración del agente** | Integrado en herramientas del AI SDK | LangGraph, CrewAI, CopilotKit | Cualquier agente vía JSON | Independiente (entrada Figma) |
| **GitHub** | [Vercel/ai](https://github.com/vercel/ai) (~23K stars) | [ag-ui-protocol/ag-ui](https://github.com/ag-ui-protocol/ag-ui) (~13K stars) | [google/A2UI](https://github.com/google/A2UI) (~14K stars) | Closed source |
| **Licencia** | Apache 2.0 | MIT | Apache 2.0 | Proprietary |
| **Cuándo elegir** | Tú controlas el agente y el frontend en Next.js | Necesitas observabilidad del agente y humano en el bucle | Necesitas multiplataforma de agentes no confiables | Estás convirtiendo diseños de Figma a código |

Ese es el panel. Ahora las opiniones.

---
## Vercel AI SDK: Transmitir el Componente

El [AI SDK](https://github.com/vercel/ai) de Vercel (~23K estrellas en GitHub) permite que tu agente devuelva componentes completos de React Server en lugar de texto. El modelo llama a una herramienta, la herramienta devuelve JSX, y el framework lo transmite al navegador. Sin tuberías WebSocket. Sin configuración manual de SSE. El componente aparece progresivamente a medida que el modelo lo genera.

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

Esto es lo que los tutoriales omiten: `streamUI` reside en el módulo RSC del AI SDK, que Vercel marcó como **experimental** y [detuvo su desarrollo en octubre de 2024](https://sdk.vercel.ai/docs). La ruta recomendada en AI SDK 6 es AI SDK UI. Transmites datos o objetos de llamadas a herramientas mediante `useChat` y `useObject`, y luego renderizas los componentes del lado del cliente. El enfoque RSC sigue funcionando, pero Vercel apuesta por el renderizado del lado del cliente.

Eso importa porque el argumento original de `streamUI` era “transmitir componentes completos del servidor desde tu agente”. La recomendación actual se acerca más a “transmitir datos estructurados, renderizar localmente”. Lo cual, si lo miras con atención, es la misma dirección que A2UI está tomando, solo que sin la seguridad a nivel de protocolo.

También estás limitado a React y Next.js. Tu agente envía árboles de componentes ejecutables. Eso implica confianza total entre el agente y el frontend. Está bien para agentes de primera parte. Es peligroso en el momento en que aceptas la salida de herramientas de terceros. No hay una capa de sandboxing en el protocolo.

**Úsalo** si controlas tanto el agente como la aplicación Next.js y aceptas el estado experimental. **Evítalo** si tus agentes provienen de fuentes externas, o si “solo web” es una restricción que no puedes aceptar.
## AG-UI: Transmitir el Pensamiento

[AG-UI](https://github.com/ag-ui-protocol/ag-ui) (~13 K estrellas en GitHub) adopta un enfoque fundamentalmente diferente. En lugar de transmitir componentes de UI, transmite eventos de interacción: mensajes, indicadores de escritura, pasos de razonamiento, llamadas a herramientas, actualizaciones de estado. El frontend interpreta estos eventos como quiera.

```
event: TEXT_MESSAGE_START
event: TOOL_CALL_START  {name: "getWeather", args: {city: "Vienna"}}
event: TOOL_CALL_END    {result: {temp: 22, condition: "sunny"}}
event: STATE_SNAPSHOT   {weather: {temp: 22}}
event: TEXT_MESSAGE_CONTENT "It's 22°C and sunny in Vienna."
```

Desarrollado por el equipo de [CopilotKit](https://github.com/CopilotKit/CopilotKit), AG-UI trata la comunicación agente‑frontend como un bus de eventos estandarizado. Tu agente emite eventos tipados. Tu frontend se suscribe y renderiza. El protocolo soporta sub‑agentes, de modo que puedes observar a un orquestador delegar trabajo y transmitir cada paso para revisión humana en el bucle.

Este es el único protocolo en la comparación que prioriza la capacidad de depuración. Puedes inspeccionar cada evento, reproducir decisiones del agente y crear interfaces que muestren el proceso de pensamiento junto a los resultados. Existen integraciones para [LangGraph](https://github.com/langchain-ai/langgraph), [CrewAI](https://github.com/crewAIInc/crewAI) y [Mastra](https://github.com/mastra-ai/mastra).

El compromiso es claro: AG-UI te brinda eventos, no interfaces. Tú sigues construyendo cada componente. El protocolo te dice *qué hizo el agente*. Tú decides *qué ve el usuario*.

**Úsalo** si estás creando experiencias agentivas donde los usuarios necesitan ver y sobrescribir lo que el agente está haciendo en cada paso. **Omítelo** si deseas que el agente genere la UI por sí mismo.
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

Actualmente, existen renderizadores oficiales para Flutter, Angular y Lit. React y SwiftUI están planeados pero aún no se han lanzado. La promesa arquitectónica es una descripción JSON para cada plataforma. El cliente controla todo el estilo, las animaciones y la gestión del estado. El agente controla solo la estructura y los datos.

El modelo de seguridad es lo que más destaca. Los agentes solo pueden solicitar componentes del catálogo aprobado por el cliente. La [validación de esquemas](https://developers.googleblog.com/introducing-a2ui-an-open-project-for-agent-driven-interfaces/) se ejecuta en cada mensaje. Si el agente envía algo fuera de la lista blanca, se rechaza y el LLM se autocorrige. Esto elimina por completo la inyección de UI. Los demás protocolos no abordan la inyección a nivel de protocolo.

La transmisión progresiva funciona bien: el agente comienza con un esqueleto y luego completa los datos a medida que llegan. En sistemas multi‑agente, un orquestador puede [inspeccionar y modificar cargas útiles de UI](https://www.griddynamics.com/blog/ai-agent-for-ui-a2ui) de los sub‑agentes antes de renderizar. Esa composibilidad es única del enfoque declarativo.

A2UI se mantiene deliberadamente estrecho. No hay especificación de transporte, ni de autenticación, ni de reglas de estilo. Describe la intención de UI y nada más. Además, está pre‑1.0. La especificación sigue evolucionando y el ecosistema es reducido.

**Úsalo** si necesitas renderizado multiplataforma desde agentes semi‑confiables o no confiables. **Sáltalo** si necesitas estabilidad de producción hoy.
## Kombai: El Extravagante

[Kombai](https://www.kombai.com) no pertenece a la misma categoría que los otros tres, y vale la pena decirlo desde el principio. No es un protocolo de streaming. Es un agente de IA comercial (extensión de VS Code + plugin de Figma) que convierte diseños en código frontend para más de 400 objetivos de frameworks.

Mientras streamUI, AG-UI y A2UI resuelven la comunicación agente‑usuario en tiempo de ejecución, Kombai resuelve la generación de código en tiempo de desarrollo. Le das un archivo de Figma, una imagen o una indicación escrita. Produce código basado en componentes para React, Next.js, Svelte, Flutter, Tailwind, MUI o cualquier tecnología que uses en tu stack. Ese código pasa por tu proceso normal de revisión y despliegue. No hay agente en tiempo de ejecución. No hay protocolo de streaming. El producto tiene certificación SOC 2 y no entrena con datos de los clientes.

Lo incluyo porque representa una posición diferente en el espectro: el agente construye la UI en tiempo de desarrollo, no en tiempo de ejecución. Eso hace que Kombai sea complementario más que competitivo. Podrías usar Kombai para generar el catálogo de componentes al que los agentes de A2UI hacen referencia en tiempo de ejecución. O usarlo para esbozar los componentes de React que streamUI sirve.

Kombai es de código cerrado y propietario (nivel gratuito de 300 créditos/mes, planes de pago desde $20/mes). No hay repositorio de GitHub para el producto principal.

**Úsalo** si estás convirtiendo diseños de Figma en código listo para producción. **Ignóralo** si buscas streaming agente‑a‑UI en tiempo de ejecución. Un problema completamente distinto.
## La verdadera división

La tabla comparativa es útil, pero oculta la cuestión arquitectónica que realmente importa.

El **streamUI** de Vercel envía **código**. El agente produce componentes de React. Máxima expresividad, máxima confianza requerida. Este es el modelo de aplicación nativa aplicado a la IA: el agente es el desarrollador, entregando la UI en tiempo de ejecución.

A2UI envía **datos**. El agente describe lo que quiere, el cliente decide cómo renderizar. Máxima seguridad, expresividad limitada. Este es el modelo de contenido web: el agente es un autor, el cliente es el navegador.

AG‑UI envía **eventos**. Envía lo que el agente está haciendo, y el frontend decide qué mostrar. Este es el modelo de observabilidad: el agente hace su trabajo, la UI es un panel de monitoreo.

Cada modelo es correcto para su límite de confianza. ¿Agentes de primera parte en tu propia infraestructura? Transmitir código. ¿Agentes de terceros de servicios externos? Requerir datos declarativos. ¿Orquestación compleja de múltiples agentes donde los humanos deben intervenir? Transmitir eventos.

Esto es lo que la mayoría de comparaciones pasa por alto: AG‑UI y A2UI están diseñados para ser complementarios. AG‑UI define *cómo* el agente y el frontend se comunican (el transporte). A2UI define *qué* UI renderizar (el contenido). Podrías ejecutar cargas útiles de A2UI sobre eventos de AG‑UI. CopilotKit ya aloja un [Generative UI Playground](https://github.com/CopilotKit/generative-ui) que muestra AG‑UI, A2UI y aplicaciones MCP trabajando juntas. La arquitectura real quizá no sea "elegir una" sino "superponerlas".

El error es elegir un protocolo basándose en la cantidad de funciones o en las estrellas de GitHub. Elige según quién controla el agente y quién asume el riesgo de una renderización incorrecta.
## Lo que dejé fuera

* **La relación de MCP con estos protocolos.** MCP conecta agentes con herramientas. Estos protocolos conectan agentes con usuarios. Son capas complementarias. Pero la superposición entre los eventos de “llamado a herramienta” de AG-UI y el patrón “UI generada por herramienta” de streamUI merece su propia publicación.

* **Puntos de referencia de rendimiento.** Ninguno de estos protocolos publica comparaciones de latencia para el tiempo de primer renderizado, velocidad de renderizado progresivo o rendimiento de eventos bajo carga. Si realizas pruebas de referencia, quiero los números.

* **El enfoque de Anthropic.** Los artefactos de Claude y el uso de herramientas en streaming representan un quinto modelo donde la plataforma se encarga del renderizado. Vale la pena compararlo, pero es arquitectónicamente distinto de los protocolos abiertos.

* **La cuestión del iframe.** Chainlit, Gradio y frameworks similares resuelven la UI del agente incrustando iframes. Funciona para el aislamiento. Ninguno de los cuatro protocolos aquí aborda ese patrón, y las razones son interesantes.

---

Lee las especificaciones y decide por la frontera de confianza, no por el bombo. Si controlas ambos lados, [streamUI](https://sdk.vercel.ai/docs) te brinda lo máximo con el mínimo esfuerzo. Si no controlas el agente, el modelo de lista blanca de [A2UI](https://a2ui.org) es el único que aborda la inyección a nivel de protocolo. Si necesitas visibilidad en flujos de trabajo multi‑agente, [AG-UI](https://github.com/ag-ui-protocol/ag-ui) es el único protocolo que hace visible el razonamiento.

---

*Christian Pojoni evalúa protocolos de interfaz para agentes. Más en [vasudev.xyz](https://vasudev.xyz).*