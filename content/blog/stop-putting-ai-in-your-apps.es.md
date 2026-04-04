---
title: "Deja de poner IA en tus aplicaciones. Pon tus aplicaciones en la IA."
date: 2026-03-27
description: "Por qué las funciones de IA dentro de las aplicaciones tradicionales están al revés, y cómo MCP invierte la arquitectura."
author: "Christian Pojoni"
tags: ["mcp", "ai", "architecture"]
images: ["/images/ai-architecture.png"]
translationHash: "6647f6a4913cc31d8574f8ce4894b788"
---
Probé Airtable recientemente. Ahora tiene funciones de IA. Una pequeña caja de texto dentro de la aplicación donde puedes hacer preguntas sobre tus datos. Me resultó extraño de inmediato, y me tomó unos días articular el porqué.

La ventana de IA dentro de Airtable no sabe quién soy. Es un extraño sentado en la casa de otra persona, pidiéndome que le explique todo desde cero.

Mientras tanto, mi IA real —Claude— sabe todo eso. Tiene mis recuerdos, mis habilidades personalizadas, mi contexto a lo largo de decenas de conversaciones. Lo único que le faltaba era acceso a mis datos en NocoDB.

Así que construí ese acceso. Y la diferencia es abismal.

**La IA debe orquestar tus aplicaciones, no vivir dentro de ellas.**

## La arquitectura está al revés

Cada empresa de SaaS en este momento compite por añadir una ventana de chat de IA a su producto. Notion tiene una. Airtable tiene una. Jira tiene una. Todas están construyendo lo mismo: un endpoint de LLM sin estado con acceso a los datos de una aplicación y cero contexto sobre el usuario.

Esta es la arquitectura equivocada. Optimiza el *vendor lock-in*, no el flujo de trabajo del usuario.

Piensa en lo que realmente importa en una interacción con IA: el contexto. ¿Quién es esta persona? ¿En qué está trabajando? ¿Qué prefiere? ¿Qué ha probado antes? Una ventana de IA genérica dentro de una aplicación de base de datos nunca tendrá eso. No puede. El contexto reside fuera de la aplicación.

## MCP invierte la lógica

El [Model Context Protocol](https://modelcontextprotocol.io/) invierte la arquitectura. En lugar de colocar una capa ligera de IA dentro de cada aplicación, le das a tu IA conexiones robustas a todas tus aplicaciones. La IA se convierte en el orquestador. Las aplicaciones se convierten en fuentes de datos.

En mi configuración, Claude es el centro de mando. Cuenta con:

- **Recuerdos** de cientos de conversaciones pasadas
- **Habilidades personalizadas** que creé para flujos de trabajo específicos (búsqueda de empleo, registro de incidentes, redacción de blogs)
- **Conexiones MCP** a NocoDB (mi CRM), Gmail, Google Calendar, Google Drive y Notion

Cuando digo "actualiza el estado de mi postulación en NocoDB y redacta un correo de seguimiento", Claude hace ambas cosas. Sabe a qué postulación me refiero porque lo discutimos ayer. Conoce mi tono de correo porque ha escrito 50 borradores para mí. Ninguna ventana de IA nativa de una aplicación puede hacer eso.

## Así es como se ve en la práctica

Llevo el registro de mis postulaciones laborales en NocoDB. Así es como se ve una interacción típica:

Le digo a Claude: "Revisa mi bandeja de entrada en busca de correos de reclutadores, evalúa los puestos y actualiza NocoDB."

Claude busca en Gmail, lee los hilos, evalúa cada puesto contra un perfil psicológico personalizado que construí con él (que cubre preferencias de estilo de trabajo, patrones de comunicación, necesidades de autonomía e indicadores de ajuste cultural) y luego crea o actualiza registros en NocoDB con una puntuación de coincidencia y el razonamiento correspondiente. No es coincidencia de palabras clave. Es una evaluación real de compatibilidad para la satisfacción a largo plazo de ambas partes. Una sola frase de mi parte, cuatro herramientas coordinadas, contexto completo preservado.

Intenta hacer eso con la caja de chat de IA de Airtable.

## Por qué NocoDB y no Airtable

Las funciones de IA de Airtable son un jardín amurallado. Funcionan dentro de Airtable, con el modelo de Airtable y bajo las condiciones de Airtable. No puedes cambiar la IA. No puedes llevar tu propio contexto. No puedes extenderla.

NocoDB es de código abierto, se ejecuta sobre Postgres y, a raíz de mi reciente [PR de OAuth 2.1](https://github.com/nocodb/nocodb/issues/13363), admite autenticación MCP estándar. Esto significa que cualquier cliente de IA compatible con MCP puede conectarse a él mediante flujos OAuth adecuados, no con tokens de API copiados y pegados desde una página de configuración.

La diferencia no es cosmética. Es arquitectónica. Con NocoDB + MCP, la capa de IA es tuya. Tú eliges el modelo. Tú posees el contexto. Tú decides qué se conecta.

## La implicación incómoda

Si la IA orquesta las herramientas en lugar de vivir dentro de ellas, entonces las propias herramientas se convierten en *commodity*. Tu base de datos, tu cliente de correo, tu gestor de proyectos... todo son simplemente almacenes de datos con APIs. El valor se desplaza hacia la capa de orquestación: la IA que te conoce, recuerda tu contexto y coordina todo.

Esto resulta incómodo para las empresas de SaaS que construyeron fosos basados en la retención de usuarios. Cuando tu IA puede comunicarse con cualquier base de datos a través de MCP, la herramienta específica de gestión de proyectos que uses importa tanto como la marca de cable USB que conectas.

## Limitaciones

Esta configuración no es llave en mano. Requiere que un usuario avanzado esté dispuesto a conectar servidores MCP, gestionar flujos OAuth y depurar integraciones de herramientas. Asume que confías en tu cliente de IA con acceso transversal a tus datos, lo cual es una decisión real de confianza, no una simple casilla de verificación. Y funciona para un solo usuario con un único contexto de IA. Orquestación a escala de equipo, memoria compartida, controles de acceso... nada de eso existe todavía.

## Construye el puente, no la isla

Si estás construyendo un producto hoy en día, no le atornilles una ventana de chat de IA a tu aplicación. En su lugar, convierte tu aplicación en un gran servidor MCP. Expón APIs limpias, admite autenticación estándar (OAuth 2.1, no tokens personalizados) y permite que la IA del usuario hable con tus datos.

Las mejores herramientas en la era de MCP no serán las que tengan la IA integrada más elaborada. Serán las que expongan endpoints MCP limpios y se mantengan al margen, como hace NocoDB hoy, y como Notion y Airtable eventualmente tendrán que hacer.

¿Quieres ver cómo se ve esto en la práctica? Añadí [soporte de MCP OAuth 2.1 a NocoDB](https://github.com/nocodb/nocodb/issues/13363) — Descubrimiento RFC 8414, Registro Dinámico de Clientes RFC 7591, Metadatos de Recursos Protegidos RFC 9728. Explora [el fork](https://github.com/5queezer/nocodb), intenta conectar Claude a tu propia instancia de NocoDB y comprueba cómo se siente la arquitectura cuando la IA se sitúa por encima en lugar de dentro.

---

*Más en [vasudev.xyz](https://vasudev.xyz).*