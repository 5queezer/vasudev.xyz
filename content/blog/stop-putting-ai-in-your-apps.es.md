---
title: "Deja de poner IA en tus aplicaciones. Pon tus aplicaciones en IA."
date: 2026-03-27
description: "¿Por qué las funciones de IA dentro de aplicaciones tradicionales son retrocesos y cómo MCP invierte la arquitectura?"
author: "Christian Pojoni"
tags: ["mcp", "ai", "architecture"]
agentQuestions:
  - "¿Por qué poner apps en IA en lugar de IA en apps?"
  - "¿Cómo invierte MCP la arquitectura de la aplicación?"
  - "¿Qué está mal con los chats de IA incrustados?"
series: ["Field Notes"]
images: ["/images/ai-architecture.png"]
translationHash: "0ce521fb8f264107799bc51cbd547f5c"
chunkHashes: "639269d02ff6ee0f,69da4ec5d449ecb3,c9b0ece7b9bb2623,768e66d34188f536,f94fd15b666a8f6e,9aa2f7ac14ac90c4,a9fe755e3099498b,b5d7d81ad4b20b30"
---

Intenté Airtable recientemente. Ahora tiene funciones de IA. Un pequeño cuadro de texto dentro de la aplicación donde puedes hacer preguntas sobre tus datos. Me pareció incorrecto de inmediato, y me tomó unos días articular por qué.

La ventana de IA dentro de Airtable no sabe quién soy. Es un desconocido sentado dentro de la casa de otra persona, pidiéndome que explique todo desde cero.

Mientras tanto, mi verdadera IA, Claude, lo sabe todo. Tiene mis recuerdos, mis habilidades personalizadas, mi contexto a lo largo de docenas de conversaciones. Lo único que le faltaba era acceso a mis datos en NocoDB.

Así que construí ese acceso. Y la diferencia es de noche a día.

**La IA debe orquestar tus aplicaciones, no vivir dentro de ellas.**

![Comparison of AI embedded inside individual apps versus one AI orchestrating all apps through MCP](/images/mcp-architecture-inline.svg)
## La arquitectura está invertida

Cada empresa SaaS en este momento está compitiendo por añadir una ventana de chat IA a su producto. Notion tiene una. Airtable tiene una. Jira tiene una. Todas están construyendo lo mismo: un endpoint LLM sin estado con acceso a los datos de una sola aplicación y cero contexto sobre el usuario.

Esta es la arquitectura equivocada. Optimiza para el bloqueo del proveedor, no para el flujo de trabajo del usuario.

Piensa en lo que realmente importa en una interacción con IA: el contexto. ¿Quién es esta persona? ¿En qué está trabajando? ¿Qué prefiere? ¿Qué ha intentado antes? Una ventana de IA genérica dentro de una aplicación de base de datos nunca tendrá eso. No puede. El contexto vive fuera de la aplicación.
## MCP lo invierte

El [Model Context Protocol](https://modelcontextprotocol.io/) invierte la arquitectura. En lugar de colocar una capa de IA delgada dentro de cada aplicación, le das a tu IA conexiones gruesas a todas tus aplicaciones. La IA se convierte en el orquestador. Las aplicaciones se convierten en fuentes de datos.

En mi configuración, Claude es el centro de comando. Tiene recuerdos de cientos de conversaciones pasadas, habilidades personalizadas que construí para flujos de trabajo específicos como búsqueda de empleo, registro de incidentes y redacción de blogs, y conexiones MCP a NocoDB (mi CRM), Gmail, Google Calendar, Google Drive y Notion.

Cuando digo "actualiza el estado de mi solicitud en NocoDB y redacta un correo de seguimiento", Claude hace ambas cosas. Sabe a qué solicitud me refiero porque la discutimos ayer. Conoce mi tono de correo porque ha escrito 50 borradores para mí. Ninguna ventana de IA nativa de la aplicación puede hacer eso.
## Qué es esto en realidad

Hago seguimiento de mis solicitudes de empleo en NocoDB. Así es como suele verse una interacción típica:

Le digo a Claude: "Revisa mi bandeja de entrada en busca de correos nuevos de reclutadores, evalúa los puestos y actualiza NocoDB."

Claude busca en Gmail, lee los hilos, evalúa cada puesto contra un perfil psicológico personalizado que construí con él, que cubre preferencias de estilo de trabajo, patrones de comunicación, necesidades de autonomía y marcadores de compatibilidad cultural, y luego crea o actualiza registros en NocoDB con una puntuación de coincidencia y el razonamiento. No se trata de coincidencia de palabras clave. Es una evaluación real de la idoneidad para una satisfacción a largo plazo en ambos lados. Una frase mía, cuatro herramientas coordinadas, contexto completo preservado.

Intenta hacer eso con el chat de IA de Airtable.
## Por qué NocoDB, no Airtable

Las funciones de IA de Airtable son un jardín cerrado. Funcionan dentro de Airtable, con el modelo de Airtable, bajo los términos de Airtable. No puedes cambiar la IA. No puedes llevar tu propio contexto. No puedes ampliarla.

NocoDB es de código abierto, se ejecuta sobre Postgres y ahora admite autenticación estándar MCP gracias a mi reciente [OAuth 2.1 PR](https://github.com/nocodb/nocodb/issues/13363). Eso significa que cualquier cliente de IA compatible con MCP puede conectarse a él con flujos OAuth adecuados, no con tokens de API copiados y pegados desde una página de configuración.

La diferencia no es cosmética. Es arquitectónica. Con NocoDB + MCP, la capa de IA es tuya. Tú eliges el modelo. Tú posees el contexto. Tú decides qué se conecta.
## La Implicación Incómoda

Si la IA orquesta las herramientas en lugar de vivir dentro de ellas, entonces las propias herramientas se convierten en commodities. Tu base de datos, tu cliente de correo electrónico, tu rastreador de proyectos: todos son simplemente almacenes de datos con APIs. El valor se traslada a la capa de orquestación: la IA que te conoce, recuerda tu contexto y coordina todo.

Esto resulta incómodo para las empresas SaaS que construyeron fosos alrededor del bloqueo de usuarios. Cuando tu IA puede hablar con cualquier base de datos a través de MCP, la herramienta específica de gestión de proyectos que uses importa casi lo mismo que la marca del cable USB que conectes.
## Limitaciones

Esta configuración no es llave en mano. Requiere la voluntad de un usuario avanzado de conectar servidores MCP, gestionar flujos OAuth y depurar integraciones de herramientas. Asume que confías en tu cliente de IA con acceso cruzado a tus datos, lo cual es una decisión de confianza real, no una casilla de verificación. Y funciona para un solo usuario con un único contexto de IA. La orquestación a escala de equipo, la memoria compartida y los controles de acceso aún no existen.

También hay un [costo de ventana de contexto](/blog/mcp-context-window-fix/): cada servidor MCP al que te conectas carga su esquema completo de herramientas de antemano, consumiendo tokens antes de que escribas una palabra.
## Construye el puente, no la isla

Si estás creando un producto hoy, no agregues una ventana de chat de IA a tu aplicación. En su lugar, convierte tu app en un gran servidor MCP. Expón APIs limpias, soporta autenticación estándar (OAuth 2.1, no tokens personalizados) y permite que la IA del usuario hable con tus datos.

Las mejores herramientas en la era MCP no serán las que tengan la IA integrada más sofisticada. Serán las que expongan endpoints MCP claros y no estorben, como lo hace NocoDB hoy y como Notion y Airtable eventualmente tendrán que hacer.

¿Quieres ver cómo se ve esto en la práctica? Añadí [soporte OAuth 2.1 MCP a NocoDB](https://github.com/nocodb/nocodb/issues/13363), incluyendo descubrimiento RFC 8414, registro de cliente dinámico RFC 7591 y metadatos de recurso protegido RFC 9728. Explora [el fork](https://github.com/5queezer/nocodb), intenta conectar Claude a tu propia instancia de NocoDB y observa cómo se siente la arquitectura cuando la IA está encima en lugar de dentro.

---

*Christian Pojoni construye infraestructura de agentes de IA. Más en [vasudev.xyz](https://vasudev.xyz).*