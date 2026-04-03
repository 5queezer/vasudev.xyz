---
title: "Dejen de meter IA en sus aplicaciones. Pongan sus aplicaciones en la IA."
date: 2026-03-27
description: "¿Por qué las características de IA dentro de las aplicaciones tradicionales son retroactivas, y cómo MCP invierte la arquitectura."
author: "Christian Pojoni"
tags: ["mcp", "nocodb", "ai", "architecture"]
images: ["/images/ai-architecture.png"]
translationHash: "9e4e893b4737ae7f7cda69cc1c0547e1"
---
Elusuario experimentó con Airtable recientemente. Ahora tiene características de IA. Hay una caja de texto pequeña dentro de la aplicación donde puede hacer preguntas sobre sus datos. Se sentó inmediatamente mal, y tardó varios días en articular por qué.

La ventana de IA dentro de Airtable no conoce quién soy. Es un desconocido sentado en la casa de alguien más, pidiéndome que explique todo desde cero.

Mientras tanto, mi IA real -- Claude -- lo conoce todo. Tiene mis recuerdos, mis habilidades personalizadas, mi contexto en docenas de conversaciones. Lo único que faltaba era acceso a mis datos en NocoDB.

Así que construí ese acceso. Y la diferencia es de noche a día.

**La IA debe orquestar tus aplicaciones, no vivir dentro de ellas.**

## La Arquitectura está Invertida

Toda empresa de SaaS ahora está corriendo para añadir una ventana de chat de IA a su producto. Notion la tiene. Airtable la tiene. Jira la tiene. Todos están construyendo lo mismo: un punto final de LLM sin estado con acceso a los datos de una sola aplicación y cero contexto sobre el usuario.

Esta es la arquitectura equivocada. Optimiza el cerrojo de la empresa, no el flujo del usuario.

Piensa en lo que realmente importa en una interacción con IA: el contexto. ¿Quién es esta persona? ¿Qué están trabajando? ¿Qué prefieren? ¿Qué intentaron antes? Una ventana genérica de IA dentro de una aplicación de base de datos nunca tendrá eso. No puede. El contexto vive fuera de la aplicación.

## MCP Invierte la Arquitectura

El [Protocolo de Contexto del Modelo](https://modelcontextprotocol.io/) invierte la arquitectura. En lugar de poner una capa fina de IA dentro de cada aplicación, le das a tu IA conexiones gruesas a todas tus aplicaciones. La IA se convierte en el orquestador. Las aplicaciones se convierten en fuentes de datos.

En mi configuración, Claude es el centro de comandos. Tiene:

- **Recuerdos** de cientos de conversaciones pasadas
- **Habilidades personalizadas** que construí para flujos específicos (búsqueda de trabajo, registro de incidentes, escritura de blog)
- **Conexiones MCP** a NocoDB (mi CRM), Gmail, Google Calendar, Google Drive, Notion

Cuando digo "actualiza el estado de mi aplicación en NocoDB y redacta un correo de seguimiento", Claude lo hace ambos. Sabe a qué aplicación me refiero porque lo discutimos ayer. Conoce mi tono de correo porque lo escribí en 50 borradores. Ninguna ventana de IA nativa de una aplicación puede hacer eso.

## ¿Por qué NocoDB, no Airtable?

Las características de IA de Airtable son un jardín cerrado. Funcionan dentro de Airtable, con el modelo de Airtable, en los términos de Airtable. No puedes intercambiar la IA. No puedes traer tu propio contexto. No puedes extenderla.

NocoDB es de código abierto, funciona en Postgres y -- como de mi reciente [PR de OAuth 2.1](https://github.com/nocodb/nocodb/issues/13363) -- soporta autenticación estándar MCP. Eso significa que cualquier cliente de IA compatible con MCP puede conectarse a él con flujos de OAuth estándar, no tokens de API copiados de una página de configuración.

La diferencia no es cosmetica. Es arquitectural. Con NocoDB + MCP, la capa de IA es tuya. Elige el modelo. Tienes el contexto. Decides qué se conecta.

## La Incómoda Implicación

Si la IA orquesta las herramientas en lugar de vivir dentro de ellas, entonces las herramientas en sí se convierten en commodidades. Tu base de datos, tu cliente de correo, tu gestor de proyectos -- son solo almacenes de datos con APIs. El valor se desplaza a la capa de orquestación: la IA que te conoce, recuerda tu contexto y coordina todo.

Esto es incómodo para las empresas de SaaS que construyeron moats alrededor del cerrojo de los usuarios. Cuando tu IA puede hablar con cualquier base de datos a través de MCP, la herramienta de gestión de proyectos específica que uses importa tan poco como la marca de cable USB que enchufas.

## Limitaciones

Esta configuración no es a la mano. Requiere una disposición de usuario poderoso para montar servidores MCP, manejar flujos de OAuth y depurar integraciones. Asume que confías en tu cliente de IA con acceso cruzado a tus datos, lo que es una decisión de confianza real, no un checkbox. Y funciona para un solo usuario con un solo contexto de IA. La orquestación en equipo, memoria compartida, controles de acceso -- nada de eso existe aún.

## Construye el Puente, no la Isla

Si construyes un producto hoy, no añadas una ventana de chat de IA a tu app. En su lugar, haz que tu app sea un gran servidor MCP. Expone APIs limpias, soporta autenticación estándar (OAuth 2.1, no tokens personalizados) y déjate de la manera.

Las mejores herramientas en la era MCP no serán las con la IA integrada más sofisticada. Serán las que expongan endpoints MCP limpios y se aparten -- como lo hace NocoDB hoy, y como Notion y Airtable eventualmente tendrán que hacer.

¿Quieres ver cómo esto se ve en la práctica? Agregué [soporte de OAuth 2.1 MCP a NocoDB](https://github.com/nocodb/nocodb/issues/13363) -- Descubrimiento RFC 8414, Registro de Cliente Dinámico RFC 7591, Metadatos de Recurso Protegido RFC 9728. Explora [el fork](https://github.com/5queezer/nocodb), prueba conectar Claude a tu propia instancia de NocoDB y ve cómo se siente la arquitectura cuando la IA está encima en lugar de dentro.

---

*Más en [vasudev.xyz](https://vasudev.xyz

El usuario experimentó con Airtable recientemente. Ahora tiene características de IA. Hay una caja de texto pequeña dentro de la aplicación donde puede hacer preguntas sobre sus datos. Se sentó inmediatamente mal, y tardó varios días en articular por qué.

La ventana de IA dentro de Airtable no conoce quién soy. Es un desconocido sentado en la casa de alguien más, pidiéndome que explique todo desde cero.

Mientras tanto, mi IA real -- Claude -- lo conoce todo. Tiene mis recuerdos, mis habilidades personalizadas, mi contexto en docenas de conversaciones. Lo único que faltaba era acceso a mis datos en NocoDB.

Así que construí ese acceso. Y la diferencia es de noche a día.

**La IA debe orquestar tus aplicaciones, no vivir dentro de ellas.**

## La Arquitectura está Invertida

Toda empresa de SaaS ahora está corriendo para añadir una ventana de chat de IA a su producto. Notion la tiene. Airtable la tiene. Jira la tiene. Todos están construyendo lo mismo: un punto final de LLM sin estado con acceso a los datos de una sola aplicación y cero contexto sobre el usuario.

Esta es la arquitectura equivocada. Optimiza el cerrojo de la empresa, no el flujo del usuario.

Piensa en lo que realmente importa en una interacción con IA: el contexto. ¿Quién es esta persona? ¿Qué están trabajando? ¿Qué prefieren? ¿Qué intentaron antes? Una ventana genérica de IA dentro de una aplicación de base de datos nunca tendrá eso. No puede. El contexto vive fuera de la aplicación.

## MCP Invierte la Arquitectura

El [Protocolo de Contexto del Modelo](https://modelcontextprotocol.io/) invierte la arquitectura. En lugar de poner una capa fina de IA dentro de cada aplicación, le das a tu IA conexiones gruesas a todas tus aplicaciones. La IA se convierte en el orquestador. Las aplicaciones se convierten en fuentes de datos.

En mi configuración, Claude es el centro de comandos. Tiene:

- **Recuerdos** de cientos de conversaciones pasadas
- **Habilidades personalizadas** que construí para flujos específicos (búsqueda de trabajo, registro de incidentes, escritura de blog)
- **Conexiones MCP** a NocoDB (mi CRM), Gmail, Google Calendar, Google Drive, Notion

Cuando digo "actualiza el estado de mi aplicación en NocoDB y redacta un correo de seguimiento", Claude lo hace ambos. Sabe a qué aplicación me refiero porque lo discutimos ayer. Conoce mi tono de correo porque lo escribí en 50 borradores. Ninguna ventana de IA nativa de una aplicación puede hacer eso.

## ¿Por qué NocoDB, no Airtable?

Las características de IA de Airtable son un jardín cerrado. Funcionan dentro de Airtable, con el modelo de Airtable, en los términos de Airtable. No puedes intercambiar la IA. No puedes traer tu propio contexto. No puedes extenderla.

NocoDB es de código abierto, funciona en Postgres y -- como de mi reciente [PR de OAuth 2.1](https://github.com/nocodb/nocodb/issues/13363) -- soporta autenticación estándar MCP. Eso significa que cualquier cliente de IA compatible con MCP puede conectarse a él con flujos de OAuth estándar, no tokens de API copiados de una página de configuración.

La diferencia no es cosmetica. Es arquitectural. Con NocoDB + MCP, la capa de IA es tuya. Elige el modelo. Tienes el contexto. Decides qué se conecta.

## La Incómoda Implicación

Si la IA orquesta las herramientas en lugar de vivir dentro de ellas, entonces las herramientas en sí se convierten en commodidades. Tu base de datos, tu cliente de correo, tu gestor de proyectos -- son solo almacenes de datos con APIs. El valor se desplaza a la capa de orquestación: la IA que te conoce, recuerda tu contexto y coordina todo.

Esto es incómodo para las empresas de SaaS que construyeron moats alrededor del cerrojo de los usuarios. Cuando tu IA puede hablar con cualquier base de datos a través de MCP, la herramienta de gestión de proyectos específica que uses importa tan poco como la marca de cable USB que enchufas.

## Limitaciones

Esta configuración no es a la mano. Requiere una disposición de usuario poderoso para montar servidores MCP, manejar flujos de OAuth y depurar integraciones. Asume que confías en tu cliente de IA con acceso cruzado a tus datos, lo que es una decisión de confianza real, no un checkbox. Y funciona para un solo usuario con un solo contexto de IA. La orquestación en equipo, memoria compartida, controles de acceso -- nada de eso existe aún.

## Construye el Puente, no la Isla

Si construyes un producto hoy, no añades una ventana de chat de IA a tu app. En su lugar, haz que tu app sea un gran servidor MCP. Expone APIs limpias, soporta autenticación estándar (OAuth 2.1, no tokens personalizados) y déjate de la manera.

Las mejores herramientas en la era MCP no serán las con la IA integrada más sofisticada. Serán las que exponen endpoints MCP limpios y se aparten -- como lo hace NocoDB hoy, y como Notion y Airtable eventualmente tendrán que hacer.

¿Quieres ver cómo esto se ve en la práctica? Agregué [soporte de OAuth 2.1 MCP a NocoDB](https://github.com/nocodb/nocodb/issues/13363) -- Descubrimiento RFC 8414, Registro de Cliente Dinámico RFC 7591, Metadatos de Recurso Protegido RFC 9728. Explora [el fork](https://github.com/5queezer/nocodb), prueba conectar Claude a tu propia instancia de NocoDB y ve cómo se siente la arquitectura cuando la IA está encima en lugar de dentro.

---

*Más en [vasudev.xyz](https://vasudev.xyz).*