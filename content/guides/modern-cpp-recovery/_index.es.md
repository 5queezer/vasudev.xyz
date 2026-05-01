---
title: "Guía de recuperación moderna de C++"
description: "Una ruta de recuperación compacta para volver a C++17/20 después de aprender C++ premoderno."
date: 2026-04-27
guideTags: ["c++", "systems", "recovery"]
type: "guide"
build:
  list: local
  render: always
translationHash: "838f5ef69b7d7f4ab6381a0468c7b891"
chunkHashes: "9a84462dc0b46c33,86622b9c289faaac,1d4e7cc51f142c37,b4715dd94a30045a,3f5fdd4571657156,adbe3d6449091861"
---
# Modern C++ Recovery Guide

Una wiki rápida y práctica para quien aprendió C++ alrededor de 2008 y desea recuperarse rápidamente a C++ moderno (C++17/20).
## Cómo usar este wiki

Recorre las páginas en orden. No intentes memorizar todo. Para cada tema, trata de entender:

1. ¿Qué problema resuelve esto?
2. ¿Qué prefiere el C++ moderno?
3. ¿Cuáles son los modos de falla más comunes?
4. ¿Puedo escribir un pequeño ejemplo de memoria?
## Ruta recomendada

### Fase 1 — Reconstruir el núcleo

1. [Modelo mental: Modern C++](01-modern-cpp-mental-model.md)
2. [Compilación, enlace y forma del proyecto](02-compilation-linking.md)
3. [Tiempo de vida de los objetos, pila, montón y RAII](03-lifetime-raii.md)
4. [Propiedad, punteros crudos y punteros inteligentes](04-ownership-smart-pointers.md)
5. [Semántica de valores y regla de 0/3/5](05-value-semantics-rule-of-0-3-5.md)

### Fase 2 — Características modernas del lenguaje

6. [Semántica de movimiento](06-move-semantics.md)
7. [Const, referencias y paso de parámetros](07-const-references-parameters.md)
8. [Contenedores y algoritmos de la STL](08-stl-containers-algorithms.md)
9. [Sintaxis moderna: auto, lambdas, enum class, constexpr](09-modern-syntax.md)
10. [Optional, Variant, String View, Span, Filesystem, Chrono](10-modern-library-types.md)
11. [Plantillas y programación genérica](11-templates-generic-programming.md)

### Fase 3 — C++ serio

12. [Manejo de errores y seguridad de excepciones](12-error-handling.md)
13. [Concurrencia: hilos, mutexes, atómicos](13-concurrency.md)
14. [Comportamiento indefinido y seguridad de memoria](14-undefined-behavior.md)
15. [Fundamentos de rendimiento](15-performance.md)
16. [Herramientas: CMake, depuradores, sanitizadores, pruebas](16-tooling.md)

### Fase 4 — Elegir un dominio

17. [Rutas de dominio](17-domain-tracks.md)
18. [Ideas de proyecto](18-project-ideas.md)
19. [Lista de verificación rápida](19-quick-checklist.md)
20. [Fundamentación y referencias](20-grounding-and-references.md)
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

Esta es una guía rápida de recuperación, no un sustituto del estándar o de un libro de texto completo. Para referencias autorizadas y notas de versiones, vea [Fundamentación y Referencias](20-grounding-and-references.md).