---
title: "Deja de poner IA en tus apps. Pon tus apps en la IA."
date: 2026-03-27
description: "Por qué las funciones de IA dentro de las aplicaciones tradicionales van al revés, y cómo MCP invierte la arquitectura."
author: "Christian Pojoni"
tags: ["mcp", "ai", "architecture"]
images: ["/images/ai-architecture.png"]
translationHash: "0729e6058332da04c512c2cee20db737"
---
Probé Airtable recientemente. Ahora tiene funciones de IA. Una pequeña caja de texto dentro de la aplicación donde puedes hacer preguntas sobre tus datos. Me pareció incorrecto de inmediato, y me costó unos días articular el porqué.

La ventana de IA dentro de Airtable no sabe quién soy. Es un desconocido sentado en la casa de otra persona, pidiéndome que explique todo desde cero.

Mientras tanto, mi IA real -- Claude -- sabe todo eso. Tiene mis recuerdos, mis habilidades personalizadas, mi contexto a través de decenas de conversaciones. Lo único que le faltaba era acceso a mis datos en NocoDB.

Así que construí ese acceso. Y la diferencia es del día a la noche.

**La IA debería orquestar tus aplicaciones, no vivir dentro de ellas.**

## La arquitectura está al revés

En este momento, todas las empresas de SaaS compiten por añadir una ventana de chat de IA a sus productos. Notion tiene una. Airtable tiene una. Jira tiene una. Todas están construyendo lo mismo: un endpoint de LLM sin estado con acceso a los datos de una sola aplicación y cero contexto sobre el usuario.

Esta es la arquitectura incorrecta. Optimiza la dependencia del proveedor, no el flujo de trabajo del usuario.

Piensa en lo que realmente importa en una interacción con IA: el contexto. ¿Quién es esta persona? ¿En qué está trabajando? ¿Qué prefiere? ¿Qué ha intentado antes? Una ventana genérica de IA dentro de una aplicación de base de datos nunca tendrá eso. No puede. El contexto vive fuera de la aplicación.

## MCP le da la vuelta

El [Model Context Protocol](https://modelcontextprotocol.io/) invierte la arquitectura. En lugar de poner una capa delgada de IA dentro de cada aplicación, le das a tu IA conexiones robustas con todas tus apps. La IA se convierte en el orquestador. Las aplicaciones se convierten en fuentes de datos.

En mi configuración, Claude es el centro de mando. Tiene:

- **Recuerdos** de cientos de conversaciones pasadas
- **Habilidades personalizadas** que construí para flujos de trabajo específicos (búsqueda de empleo, registro de incidentes, redacción de blogs)
- **Conexiones MCP** a NocoDB (mi CRM), Gmail, Google Calendar, Google Drive, Notion

Cuando digo "actualiza el estado de mi solicitud en NocoDB y redacta un correo de seguimiento", Claude hace ambas cosas. Sabe a qué solicitud me refiero porque la discutimos ayer. Conoce mi tono de correo porque me ha escrito 50 borradores. Ninguna ventana de IA nativa de una aplicación puede hacer eso.

## Así es como se ve realmente

Llevo un registro de mis solicitudes de empleo en NocoDB. Así es como se ve una interacción típica:

Le digo a Claude: "Revisa mi bandeja de entrada en busca de nuevos correos de reclutadores, evalúa los puestos y actualiza NocoDB".

Claude busca en Gmail, lee los hilos, evalúa cada puesto frente a un perfil psicológico personalizado que construí con él -- que cubre preferencias de estilo de trabajo, patrones de comunicación, necesidades de autonomía e indicadores de ajuste cultural -- y luego crea o actualiza registros en NocoDB con una puntuación de coincidencia y un razonamiento. No es coincidencia de palabras clave. Es una evaluación real de compatibilidad para la satisfacción a largo plazo de ambas partes. Una frase mía, cuatro herramientas coordinadas, contexto completo preservado.

Intenta hacer eso con la caja de chat de IA de Airtable.

## Por qué NocoDB y no Airtable

Las funciones de IA de Airtable son un jardín amurallado. Funcionan dentro de Airtable, con el modelo de Airtable y bajo las reglas de Airtable. No puedes cambiar la IA. No puedes traer tu propio contexto. No puedes extenderla.

NocoDB es de código abierto, se ejecuta sobre Postgres y -- as of my recent [OAuth 2.1 PR](https://github.com/nocodb/nocodb/issues/13363) -- admite autenticación MCP estándar. Eso significa que cualquier cliente de IA compatible con MCP puede conectarse a él mediante flujos OAuth adecuados, no con tokens de API copiados y pegados desde una página de configuración.

La diferencia no es cosmética. Es arquitectónica. Con NocoDB + MCP, la capa de IA es tuya. Tú eliges el modelo. Tú posees el contexto. Tú decides qué se conecta.

## La incómoda implicación

Si la IA orquesta las herramientas en lugar de vivir dentro de ellas, entonces las propias herramientas se commoditizan. Tu base de datos, tu cliente de correo, tu gestor de proyectos -- todos son simplemente almacenes de datos con APIs. El valor se desplaza hacia la capa de orquestación: la IA que te conoce, recuerda tu contexto y coordina todo.

Esto resulta incómodo para las empresas de SaaS que construyeron fosos defensivos en torno a la retención de usuarios. Cuando tu IA puede hablar con cualquier base de datos a través de MCP, la herramienta específica de gestión de proyectos que uses importa tanto como la marca del cable USB que conectas.

## Limitaciones

Esta configuración no es llave en mano. Requiere que un usuario avanzado esté dispuesto a conectar servidores MCP, gestionar flujos OAuth y depurar integraciones de herramientas. Asume que confías en tu cliente de IA para darle acceso a tus datos a través de varias aplicaciones, lo cual es una decisión de confianza real, no un simple checkbox. Y funciona para un solo usuario con un único contexto de IA. Orquestación a escala de equipo, memoria compartida, controles de acceso -- nada de eso existe aún.

## Construye el puente, no la isla

Si estás construyendo un producto hoy en día, no acoples a la fuerza una ventana de chat de IA a tu aplicación. En cambio, haz que tu aplicación sea un gran servidor MCP. Expón APIs limpias, admite autenticación estándar (OAuth 2.1, no tokens personalizados) y permite que la IA del usuario hable con tus datos.

Las mejores herramientas en la era MCP no serán las que tengan la IA integrada más elaborada. Serán las que expongan endpoints MCP limpios y se hagan a un lado -- como hace NocoDB hoy, y como Notion y Airtable eventualmente tendrán que hacer.

¿Quieres ver cómo se ve esto en la práctica? Añadí [OAuth 2.1 MCP support to NocoDB](https://github.com/nocodb/nocodb/issues/13363) -- RFC 8414 Discovery, RFC 7591 Dynamic Client Registration, RFC 9728 Protected Resource Metadata. Explora [the fork](https://github.com/5queezer/nocodb), intenta conectar Claude a tu propia instancia de NocoDB y descubre cómo se siente la arquitectura cuando la IA se sitúa por encima en lugar de dentro.

---

*Más en [vasudev.xyz](https://vasudev.xyz).*