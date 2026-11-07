---
title: "13 — Proyecto final y enfoque para entrevistas"
description: "Un proyecto full-stack que ejercita todo el stack y cómo debería presentar su preparación en TypeScript un ingeniero senior procedente de otro ecosistema."
weight: 13
type: "guide"
build:
  list: local
  render: always
translationHash: "bf59b21a81e1a77243af79e320132b14"
---

# 13 — Proyecto final y enfoque para entrevistas

La forma más rápida de consolidar todo lo explicado en esta guía es crear un proyecto que abarque todas las capas y después presentar con honestidad tu experiencia previa.

## Crea un proyecto full-stack

Elige un dominio que ya conozcas para dedicar tu esfuerzo a TypeScript y no al espacio del problema. Un gestor de búsquedas de empleo, un CRM personal, un gestor de incidencias o una lista de lectura sirven por igual. Constrúyelo con el stack predeterminado:

**React con TanStack Query y Router, TypeScript en modo estricto, Hono para la API, PostgreSQL con Drizzle, Zod para la validación y Vitest para las pruebas.**

Busca un conjunto de funciones que obligue a aplicar cada patrón:

1. Varias entidades relacionadas, para que modeles relaciones en Drizzle.
2. Flujos de creación y actualización, para que escribas mutaciones y actualizaciones optimistas.
3. Una vista de lista con paginación o filtrado, para que definas correctamente las claves de las consultas.
4. Cuerpos de peticiones y configuración de entorno validados, para que Zod sea una pieza imprescindible.
5. Un tablero o campo de estado, para que utilices una unión discriminada como estado.
6. Un conjunto de pruebas y un `tsc --noEmit` en verde dentro de CI.

El objetivo no es un producto pulido. Es haber escrito con tus propias manos los patrones de todas las páginas de esta guía. Después de un proyecto así, la sintaxis deja de ser el centro de tu atención.

## Cómo presentar tu experiencia

Si ya construyes sistemas de producción en otros lenguajes, la forma honesta de presentarlo es que eres un ingeniero senior que está añadiendo un lenguaje, no un principiante. Las capacidades transferibles son las más caras de adquirir: programación asíncrona, diseño de API, arquitectura, pruebas, modelado de datos, observabilidad y comunicación. No se reinician cuando cambias de lenguaje. Lo que añades es el sistema de tipos de TypeScript y la familiaridad con su ecosistema, una cuestión de días o semanas, no de años.

En una entrevista para un puesto senior de TypeScript, la experiencia previa en sistemas, infraestructura, protocolos o seguridad y el haber desplegado software real suelen pesar más que recordar la sintaxis exacta de un tipo condicional avanzado. Esa sintaxis se puede aprender en un fin de semana. El criterio no.

De ahí se derivan dos puntos prácticos. Primero, no te infravalores presentando tu experiencia como algo más limitado de lo que es. Si tu portafolio muestra ingeniería de backend y plataforma, preséntate así en lugar de adoptar por defecto un enfoque más júnior. Segundo, debes poder respaldar esa presentación con sustancia: habla con soltura sobre los patrones del sistema de tipos de esta guía y ten el proyecto final como referencia. La confianza unida a un artefacto funcional es mucho más convincente que cualquiera de las dos por separado.

## Lo que debes ser capaz de explicar

Antes de una entrevista, asegúrate de poder hablar con naturalidad sobre:

- Por qué se eliminan los tipos y por qué aun así se validan los límites.
- Uniones discriminadas y exhaustividad, con un ejemplo real.
- Genéricos con restricciones y cuándo no utilizarlos.
- El modelo asíncrono y el error habitual de una Promise sin gestionar.
- Estado del servidor frente al estado del cliente, y caché e invalidación en TanStack Query.
- Tus herramientas: modo estricto, la puerta de comprobación de tipos, linting y pruebas.

Si estos temas te resultan naturales y tu experiencia general de ingeniería es real, estás preparado.

## Autoevaluación rápida

- ¿Tu proyecto final ejercita todos los patrones de esta guía?
- ¿Puedes explicar por qué tu experiencia previa se traslada a un puesto senior de TypeScript?
- ¿Puedes hablar de cada punto de la lista anterior sin consultar notas?
