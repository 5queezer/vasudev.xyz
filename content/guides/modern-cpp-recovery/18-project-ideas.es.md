---
title: "18 — Ideas de proyectos"
description: "Un proyecto serio supera al estudio pasivo. Elige uno que te obligue a usar características de C++ moderno, herramientas, depuración y conceptos del ámbito."
weight: 18
type: "guide"
build:
  list: local
  render: always
translationHash: "bbc47e2c32913fc14076f3f3c6c5987f"
---

# 18 — Ideas de proyectos

## Idea principal

Un proyecto serio supera al estudio pasivo. Elige uno que te obligue a usar características de C++ moderno, herramientas, depuración y conceptos del ámbito.

## Proyectos iniciales para retomar C++

### 1. Aplicación de tareas para la línea de comandos

Practica:

- contenedores de la STL,
- E/S de archivos,
- clases,
- serialización,
- pruebas.

Ampliaciones:

- persistencia en JSON,
- búsqueda y filtrado,
- fechas con `chrono`.

### 2. Analizador de registros

Practica:

- procesamiento de cadenas,
- `string_view`,
- mapas,
- algoritmos,
- medición del rendimiento.

Ampliaciones:

- analizar archivos grandes,
- comparar alternativas con benchmarks,
- procesamiento multihilo.

## Proyectos intermedios

### 3. Servidor de chat TCP

Practica:

- sockets,
- concurrencia,
- contenedores RAII para descriptores de archivo,
- gestión de errores.

Ampliaciones:

- salas,
- autenticación,
- bucle de eventos asíncrono.

### 4. Almacén clave-valor

Practica:

- estructuras de datos,
- persistencia en archivos,
- APIs,
- pruebas,
- rendimiento.

Ampliaciones:

- registro de escritura anticipada,
- compactación,
- protocolo TCP.

### 5. Simulación física 2D

Practica:

- tipos por valor,
- vectores y matemáticas,
- bucle de juego,
- rendimiento.

Ampliaciones:

- detección de colisiones,
- visualización,
- particionamiento espacial.

## Proyectos sólidos para el portafolio

### 6. Simulador de libro de órdenes

Practica:

- rendimiento,
- estructuras de datos,
- diseño favorable a la caché,
- pruebas,
- benchmarking.

Ampliaciones:

- reproducción de datos de mercado,
- mediciones de latencia,
- visualización con Python.

### 7. Planificador de rutas para robots

Practica:

- algoritmos,
- simulación,
- geometría,
- división entre C++ y Python.

Ampliaciones:

- A*, RRT,
- integración con ROS 2,
- visualización.

### 8. Registrador de sensores embebido

Practica:

- C/C++,
- protocolos serie,
- memoria limitada,
- hardware real.

Ampliaciones:

- panel,
- carga por red,
- optimización energética.

### 9. Extensión de Python en C++

Practica:

- diseño de bibliotecas C++,
- interoperabilidad con Python,
- rendimiento,
- empaquetado.

Ampliación:

- Expón a Python un analizador rápido o una rutina numérica.

### 10. Analizador seguro de formatos de archivo

Practica:

- análisis binario,
- seguridad de memoria,
- fuzzing,
- gestión de errores.

Ampliaciones:

- fuzzing con AFL/libFuzzer,
- compilaciones con sanitizadores,
- informe de seguridad.

## Reglas del proyecto

Incluye en cualquier proyecto:

- `README.md`,
- compilación con CMake,
- pruebas,
- instrucciones para los sanitizadores,
- al menos un benchmark o una demostración,
- una explicación clara de las decisiones de diseño.

## Mejor primer proyecto serio

Si tienes dudas, construye un **servidor TCP multihilo** o un **almacén clave-valor**. Ambos enseñan sistemas, propiedad, concurrencia, pruebas y rendimiento.
