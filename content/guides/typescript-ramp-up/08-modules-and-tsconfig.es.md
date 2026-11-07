---
title: "08 — Módulos, tsconfig y el proceso de compilación"
description: "ESM frente a CommonJS, cómo se compila TypeScript, qué opciones de tsconfig importan y qué ejecutores modernos omiten la compilación durante el desarrollo."
weight: 8
type: "guide"
build:
  list: local
  render: always
translationHash: "b8f65a330a3a171873293e5038f22a05"
---

# 08 — Módulos, tsconfig y el proceso de compilación

Esta es la parte del ecosistema que más confunde a quienes empiezan, porque existen dos sistemas de módulos y varias formas de ejecutar TypeScript. Este es el mapa.

## Dos sistemas de módulos

JavaScript tiene dos formatos de módulos y te encontrarás con ambos.

- ES Modules (ESM): `import` y `export`. Es el estándar y la opción predeterminada para código nuevo.
- CommonJS (CJS): `require` y `module.exports`. Es el formato antiguo de Node, todavía habitual en las dependencias.

```ts
// ESM
import { readFile } from "node:fs/promises";
export function helper() {}

// CommonJS (older style you will still read)
const { readFile } = require("fs/promises");
module.exports = { helper };
```

Escribe ESM en proyectos nuevos. Fíjate en el prefijo `node:` de los módulos integrados. Es la forma explícita y moderna de importar los módulos internos de Node.

Un punto de fricción habitual: en ESM, las importaciones relativas pueden necesitar extensiones de archivo según la configuración, y un paquete declara su formato con `"type": "module"` en `package.json`. Cuando una importación falla con «ERR_REQUIRE_ESM» o «Cannot use import statement», casi siempre estás ante una incompatibilidad de formatos de módulos.

## Cómo se ejecuta TypeScript

TypeScript no se ejecuta por sí mismo. El flujo clásico es: `tsc` comprueba los tipos y emite JavaScript; después, Node ejecuta ese JavaScript. Lo importante es que `tsc` comprueba y elimina los tipos, pero no empaqueta el código ni impone los tipos en tiempo de ejecución.

En el desarrollo moderno normalmente se omite el paso manual de compilación:

- `tsx` ejecuta directamente un archivo TypeScript durante el desarrollo y en scripts.
- `vite` gestiona TypeScript en proyectos frontend, con recarga rápida en desarrollo y empaquetado para producción.
- Entornos más recientes, como Deno y Bun, ejecutan TypeScript de forma nativa.
- Las versiones recientes de Node pueden ejecutar directamente archivos TypeScript eliminando los tipos, aunque `tsc` o un empaquetador siguen siendo lo habitual en las compilaciones de producción.

El modelo mental: usa un ejecutor o empaquetador para el ciclo de desarrollo y utiliza `tsc` (o la compilación del empaquetador) para producir el artefacto que vas a desplegar. Mantén `tsc --noEmit` en CI como puerta de comprobación de tipos incluso cuando otra herramienta realice la compilación.

## Las opciones de tsconfig que importan

No necesitas memorizar todo el archivo. Estas son las opciones que merece la pena entender.

```json
{
  "compilerOptions": {
    "strict": true,
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "outDir": "dist"
  }
}
```

- `strict`: actívalo y déjalo activado. Es la configuración más importante.
- `target`: el nivel del lenguaje JavaScript que se emitirá. Ajústalo a tu entorno de ejecución.
- `module` y `moduleResolution`: cómo se interpretan las importaciones. `NodeNext` es la elección moderna para proyectos Node.
- `esModuleInterop`: facilita importar paquetes CommonJS desde ESM. Normalmente se activa.
- `skipLibCheck`: omite la comprobación de tipos de los archivos de declaraciones de las dependencias. Acelera las compilaciones y evita errores que no puedes corregir en tipos ajenos.
- `noEmit`: solo comprueba los tipos cuando otra herramienta compila.

Un buen punto de partida para muchos proyectos es extender una configuración base comunitaria, como los preajustes del estilo de `@tsconfig/node22`, en lugar de escribirla desde cero.

## Archivos de declaraciones y `@types`

La información de tipos de una biblioteca reside en el propio paquete o en un paquete independiente `@types/<name>` de DefinitelyTyped. Si una importación no tiene tipos, a menudo se añade `npm install -D @types/<name>`. Los archivos terminados en `.d.ts` solo contienen tipos, no código de ejecución.

## Autoevaluación rápida

- ¿Cuál es la diferencia entre ESM y CommonJS, y cuál escribes hoy?
- ¿Qué produce realmente `tsc` y qué no hace?
- ¿Por qué mantener `tsc --noEmit` en CI aunque Vite o tsx ejecute el código?
- ¿De dónde salen los tipos de una dependencia sin tipos?
