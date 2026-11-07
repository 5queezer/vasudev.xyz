---
title: "Guía de actualización a C++ moderno"
description: "Una ruta de recuperación compacta para volver a C++17/20 después de aprender C++ premoderno."
date: 2026-04-27
guideTags: ["c++", "systems", "recovery"]
type: "guide"
build:
  list: local
  render: always
translationHash: "838f5ef69b7d7f4ab6381a0468c7b891"
---
# Guía de actualización a C++ moderno

Una wiki rápida y práctica para quien aprendió C++ alrededor de 2008 y desea recuperarse rápidamente a C++ moderno (C++17/20).

## Cómo usar este wiki

Recorre las páginas en orden. No intentes memorizar todo. Para cada tema, trata de entender:

1. ¿Qué problema resuelve esto?
2. ¿Qué prefiere el C++ moderno?
3. ¿Cuáles son los modos de falla más comunes?
4. ¿Puedo escribir un pequeño ejemplo de memoria?
## Ruta recomendada

### Fase 1 — Reconstruir el núcleo

1. [Modelo mental de C++ moderno](01-modern-cpp-mental-model.md)
2. [Compilación, enlazado y estructura del proyecto](02-compilation-linking.md)
3. [Duración de objetos, pila, montón y RAII](03-lifetime-raii.md)
4. [Propiedad, punteros sin procesar y punteros inteligentes](04-ownership-smart-pointers.md)
5. [Semántica de valores y regla de 0/3/5](05-value-semantics-rule-of-0-3-5.md)

### Fase 2 — Características modernas del lenguaje

6. [Semántica de movimiento](06-move-semantics.md)
7. [Const, referencias y paso de parámetros](07-const-references-parameters.md)
8. [Contenedores y algoritmos de la STL](08-stl-containers-algorithms.md)
9. [Sintaxis moderna: auto, lambdas, enum class, constexpr](09-modern-syntax.md)
10. [Tipos modernos de la biblioteca](10-modern-library-types.md)
11. [Plantillas y programación genérica](11-templates-generic-programming.md)

### Fase 3 — C++ serio

12. [Gestión de errores y seguridad ante excepciones](12-error-handling.md)
13. [Concurrencia: hilos, mutexes y operaciones atómicas](13-concurrency.md)
14. [Comportamiento indefinido y seguridad de memoria](14-undefined-behavior.md)
15. [Fundamentos de rendimiento](15-performance.md)
16. [Herramientas: CMake, depuradores, sanitizadores y pruebas](16-tooling.md)

### Fase 4 — Elegir un dominio

17. [Rutas de especialización](17-domain-tracks.md)
18. [Ideas de proyectos](18-project-ideas.md)
19. [Lista de comprobación rápida](19-quick-checklist.md)
20. [Fundamentos y referencias](20-grounding-and-references.md)
## Plan Práctico Más Rápido

Si deseas un sprint de 30 días:

- Semana 1: RAII, propiedad, punteros inteligentes, semántica de valores.  
- Semana 2: semántica de movimiento, STL, lambdas, sintaxis moderna.  
- Semana 3: CMake, depuración, sanitizadores, pruebas, conceptos básicos de concurrencia.  
- Semana 4: crear un proyecto serio.
## Pila de Objetivo Predeterminada

**C++17/20 + Linux + CMake + gdb/lldb + sanitizers + GoogleTest/Catch2 + Python para automatización.**

Esa combinación te brinda una base técnica duradera y te mantiene productivo.
## Fundamentación

Esta es una guía rápida de recuperación, no un sustituto del estándar o de un libro de texto completo. Para referencias autorizadas y notas de versiones, vea [Fundamentos y referencias](20-grounding-and-references.md).
