---
title: "Deja de poner IA entus aplicaciones. Pon tus aplicaciones en IA."
date: 2026-03-27
description: "Por qué lascaracterísticas de IA dentro de aplicaciones tradicionales son hacia atrás, y cómo MCP invierte la arquitectura."
author: "Christian Pojoni"
tags: ["mcp", "ai", "architecture"]
series: ["Field Notes"]
images: ["/images/ai-architecture.png"]
translationHash: "90ecbd8a9daca5ea54bc730c131a0d59"
chunkHashes: "6fc769ba51456bb7,0f2a252451c29b22,c9b0ece7b9bb2623,768e66d34188f536,f94fd15b666a8f6e,9aa2f7ac14ac90c4,c839c4edbc4121f2,9d3d3d47a3d8b02b"
---
Probé Airtable recientemente. Ahora tiene funciones de IA. Una pequeña caja de texto dentro de la aplicación donde puedes hacer preguntas sobre tus datos. Sentí que estaba mal de inmediato, y me tomó algunos días articular por qué.

La ventana de IA dentro de Airtable no conoce quién soy. Es un extraño sentado en la casa de alguien más, pidiéndome que explique todo desde cero.

Por otro lado, mi IA real, Claude, sabe todo eso. Tiene mis recuerdos, mis habilidades personalizadas, mi contexto en docenas de conversaciones. Lo único que le faltaba era acceso a mis datos en NocoDB.

Así que construí ese acceso. Y la diferencia es noche y día.

**La IA debería orquestar tus aplicaciones, no vivir dentro de ellas.**
## Laarquitectura está al revés

Cada empresa SaaS ahora está compitiendo por agregar una ventana de chat de IA a su producto. Notion tiene una. Airtable tiene una. Jira tiene una. Todas están construyendo lo mismo: un endpoint LLM sin estado con acceso a los datos de una sola aplicación y cero contexto sobre el usuario.

Esta es la arquitectura equivocada. Optimiza el bloqueo del proveedor, no el flujo de trabajo del usuario.

Piensa en lo que realmente importa en una interacción de IA: contexto. ¿Quién es esta persona? ¿En qué está trabajando? ¿Qué prefiere? ¿Qué ha intentado antes? Una ventana de IA genérica dentro de una aplicación de base de datos nunca tendrá eso. No puede. El contexto vive fuera de la aplicación.
##MCP Flips It

El [Model Context Protocol](https://modelcontextprotocol.io/) invierte la arquitectura. En lugar de colocar una capa delgada de IA dentro de cada aplicación, le das a tu IA conexiones gruesas a todas tus aplicaciones. La IA se convierte en el orquestador. Las aplicaciones se convierten en fuentes de datos.

En mi configuración, Claude es el centro de comando. Tiene recuerdos de cientos de conversaciones pasadas, habilidades personalizadas que construí para flujos de trabajo específicos como búsqueda de empleo, registro de incidentes y escritura de blogs, y conexiones MCP a NocoDB (mi CRM), Gmail, Google Calendar, Google Drive y Notion.

Cuando digo "actualizar el estado de mi aplicación en NocoDB y redactar un correo de seguimiento", Claude hace ambas cosas. Sabe a qué aplicación me refiero porque lo hablamos ayer. Sabe el tono de mi correo porque lo ha escrito 50 veces para mí. Ninguna ventana de IA nativa de aplicación puede hacer eso.
## What This Actually Looks Like

Trackeo mis solicitudes de empleo en NocoDB. Aquí está una interacción típica:

le digo a Claude: "Revisa mi bandeja de entrada en búsqueda de nuevos correos de reclutadores, evalúa los puestos y actualiza NocoDB."

Claude busca en Gmail, lee los hilos, evalúa cada puesto contra un perfil psicológico personalizado que construí con él, que abarca preferencias de estilo laboral, patrones de comunicación, necesidades de autonomía y marcadores de ajuste cultural, y crea o actualiza registros en NocoDB con una puntuación de coincidencia y la justificación. No coincidencia de palabras clave. Evaluación real de encaje para satisfacción a largo plazo en ambos lados. Una sola frase mía, cuatro herramientas coordinadas, contexto completo preservado.

Intenta hacer eso con la caja de chat de IA de Airtable.
## Why NocoDB, NotAirtable

Las funciones de IA de Airtable son un jardín cerrado. Funcionan dentro de Airtable, con el modelo de Airtable, bajo los términos de Airtable. No puedes intercambiar la IA. No puedes aportar tu propio contexto. No puedes ampliarla.

NocoDB es de código abierto, se ejecuta en Postgres, y ahora ofrece autenticación estándar MCP gracias a mi reciente [OAuth 2.1 PR](https://github.com/nocodb/nocodb/issues/13363). Esto significa que cualquier cliente de IA compatible con MCP puede conectarse a él mediante flujos OAuth adecuados, en lugar de tokens de API copiados desde una página de configuración.

La diferencia no es solo estética. Es arquitectónica. Con NocoDB + MCP, la capa de IA es tuya. Tú eliges el modelo. Tienes el control del contexto. Tú decides qué se conecta.
##The Uncomfortable Implication

If the AI orchestrates the tools instead of living inside them, then the tools themselves become commoditized. Your database, your email client, your project tracker: they're all just data stores with APIs. The value shifts to the orchestration layer: the AI that knows you, remembers your context, and coordinates across everything.

This is uncomfortable for SaaS companies that built moats around user lock‑in. When your AI can talk to any database through MCP, the specific project management tool you use matters about as much as which brand of USB cable you plug in.
## Limitations

Esta configuración no es lista para usar. Requiere una disposición del usuario avanzado para conectar MCP servers, gestionar flujos de OAuth y depurar integraciones de herramientas. Asume que confías en tu cliente de IA con acceso multiplataforma a tus datos, lo cual es una decisión real de confianza, no una casilla. Y funciona para un solo usuario con un único contexto de IA. La orquestación a escala de equipo, la memoria compartida y los controles de acceso aún no existen.
##Construir el puente, no la isla

Si estás construyendo un producto hoy en día, no añadas una ventana de chat de IA a tu aplicación. En su lugar, convierte tu aplicación en un gran servidor MCP. Expón APIs limpias, admite autenticación estándar (OAuth 2.1, no tokens personalizados) y permite que la IA del usuario hable con tus datos.

Las mejores herramientas en la era del MCP no serán aquellas con la IA más elegante incorporada. Serán aquellas que expongan puntos finales MCP limpios y se mantengan al margen, como lo hace NocoDB hoy y como Notion y Airtable eventualmente tendrán que hacerlo.

¿Quieres ver cómo se ve en la práctica? Añadí [Soporte OAuth 2.1 MCP para NocoDB](https://github.com/nocodb/nocodb/issues/13363), incluido RFC 8414 Discovery, RFC 7591 Dynamic Client Registration, y RFC 9728 Protected Resource Metadata. Examina [la bifurcación](https://github.com/5queezer/nocodb), prueba conectando Claude a tu propia instancia de NocoDB y observa cómo se siente la arquitectura cuando la IA está arriba en lugar de dentro.

---

*Christian Pojoni construye infraestructura de agentes de IA. Más en [vasudev.xyz](https://vasudev.xyz).*

*La imagen de portada de esta publicación fue generada por IA.*