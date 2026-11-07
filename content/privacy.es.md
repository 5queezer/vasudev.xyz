---
title: "Privacidad"
date: 2026-05-01
description: "Cómo gestiona vasudev.xyz los datos del sitio, los comentarios y el agente de IA."
---

Este sitio es un sitio estático de Hugo alojado en GitHub Pages. No ejecuta ningún script general de analítica.

## Agente de IA

El agente de IA del sitio funciona mediante un Cloudflare Worker que envía las solicitudes de chat a un modelo alojado a través de OpenRouter. El agente también puede enviar trazas del lado del servidor a Langfuse para que pueda depurar fallos, entender qué páginas generan preguntas útiles y mejorar el agente.

La traza puede incluir tus mensajes de chat, la respuesta del agente, la URL de la página, el idioma del sitio, el modo de chat, marcas de tiempo, metadatos del modelo, latencia, estado de error y un identificador de sesión anónimo almacenado en el almacenamiento de sesión. El identificador se utiliza para agrupar los mensajes durante una sesión del navegador. No pretende identificarte entre distintas visitas.

No introduzcas información personal sensible en el agente.

La base jurídica es el interés legítimo en operar y mejorar el agente del sitio. Las trazas del agente no se utilizan para publicidad ni se venden a terceros.

## Encargados del tratamiento

El sitio y el agente pueden utilizar los siguientes proveedores de servicios:

- GitHub Pages para el alojamiento estático.
- Cloudflare Workers para el endpoint del agente.
- OpenRouter para la inferencia del modelo.
- Langfuse para la observabilidad del agente.
- Giscus y GitHub para los comentarios, si decides comentar.

## Comentarios

Los comentarios se ofrecen mediante Giscus y GitHub Discussions. Si comentas, GitHub procesa los datos de tu cuenta de GitHub y el contenido del comentario de acuerdo con sus propios términos y su política de privacidad.

## Contacto y eliminación

Si quieres que se elimine una traza del agente o una referencia relacionada con un comentario, ponte en contacto conmigo mediante los enlaces del sitio e incluye suficiente contexto para localizar la interacción, como la fecha aproximada, la página y el texto del mensaje.
