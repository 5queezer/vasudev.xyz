---
title: "08 — Module, tsconfig und der Build-Prozess"
description: "ESM im Vergleich zu CommonJS, wie TypeScript kompiliert wird, welche tsconfig-Optionen wichtig sind und welche modernen Runner den Build-Schritt in der Entwicklung überspringen."
weight: 8
type: "guide"
build:
  list: local
  render: always
translationHash: "b8f65a330a3a171873293e5038f22a05"
---

# 08 — Module, tsconfig und der Build-Prozess

Dieser Teil des Ökosystems verwirrt Einsteiger am meisten, weil es zwei Modulsysteme und mehrere Wege gibt, TypeScript auszuführen. Hier ist die Übersicht.

## Zwei Modulsysteme

JavaScript hat zwei Modulformate, und beide werden dir begegnen.

- ES Modules (ESM): `import` und `export`. Das ist der Standard und die Vorgabe für neuen Code.
- CommonJS (CJS): `require` und `module.exports`. Das ältere Node-Format, das in Abhängigkeiten noch häufig vorkommt.

```ts
// ESM
import { readFile } from "node:fs/promises";
export function helper() {}

// CommonJS (older style you will still read)
const { readFile } = require("fs/promises");
module.exports = { helper };
```

Schreibe in neuen Projekten ESM. Beachte das Präfix `node:` bei eingebauten Modulen. Es ist die explizite, moderne Schreibweise für den Import von Node-Built-ins.

Ein häufiger Reibungspunkt: In ESM benötigen relative Importe je nach Konfiguration möglicherweise Dateiendungen, und ein Paket deklariert sein Format mit `"type": "module"` in der `package.json`. Wenn ein Import mit „ERR_REQUIRE_ESM“ oder „Cannot use import statement“ fehlschlägt, liegt fast immer ein Konflikt zwischen Modulformaten vor.

## Wie TypeScript ausgeführt wird

TypeScript selbst wird nicht ausgeführt. Der klassische Ablauf lautet: `tsc` prüft die Typen und erzeugt JavaScript, anschließend führt Node das JavaScript aus. Entscheidend ist, dass `tsc` Typen prüft und entfernt, aber weder bündelt noch Typen zur Laufzeit erzwingt.

In der modernen Entwicklung überspringst du normalerweise den manuellen Build-Schritt:

- `tsx` führt eine TypeScript-Datei für Entwicklung und Skripte direkt aus.
- `vite` verarbeitet TypeScript in Frontend-Projekten, mit schnellem Neuladen in der Entwicklung und Bundling für die Produktion.
- Neuere Laufzeitumgebungen wie Deno und Bun führen TypeScript nativ aus.
- Aktuelle Node-Versionen können TypeScript-Dateien direkt mit Type Stripping ausführen, für Produktions-Builds sind `tsc` oder ein Bundler jedoch weiterhin üblich.

Das mentale Modell: Nutze einen Runner oder Bundler für die Entwicklungsschleife und `tsc` (oder den Build des Bundlers), um das auszuliefernde Artefakt zu erzeugen. Behalte `tsc --noEmit` als Type-Checking-Gate in der CI bei, selbst wenn etwas anderes tatsächlich kompiliert.

## Die wichtigen tsconfig-Optionen

Du musst dir nicht die gesamte Datei merken. Diese Optionen solltest du verstehen.

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

- `strict`: Einschalten und eingeschaltet lassen. Das ist die wichtigste Einstellung überhaupt.
- `target`: Die JavaScript-Sprachversion, die erzeugt wird. Passe sie an deine Laufzeitumgebung an.
- `module` und `moduleResolution`: Wie Importe interpretiert werden. `NodeNext` ist die moderne Wahl für Node-Projekte.
- `esModuleInterop`: Vereinfacht den Import von CommonJS-Paketen aus ESM. Normalerweise aktiviert.
- `skipLibCheck`: Überspringt die Typprüfung der Deklarationsdateien von Abhängigkeiten. Beschleunigt Builds und vermeidet Fehler in fremden Typen, die du nicht beheben kannst.
- `noEmit`: Nur Typen prüfen, wenn etwas anderes kompiliert.

Ein guter Ausgangspunkt für viele Projekte ist, eine gemeinschaftlich gepflegte Basiskonfiguration wie die Presets im Stil von `@tsconfig/node22` zu erweitern, statt alles neu zu schreiben.

## Deklarationsdateien und `@types`

Typinformationen für eine Bibliothek liegen entweder im Paket selbst oder in einem separaten Paket `@types/<name>` von DefinitelyTyped. Wenn ein Import keine Typen hat, fügst du häufig `npm install -D @types/<name>` hinzu. Dateien mit der Endung `.d.ts` enthalten ausschließlich Typen und keinen Laufzeitcode.

## Kurzer Selbsttest

- Was ist der Unterschied zwischen ESM und CommonJS, und welches Format schreibst du heute?
- Was erzeugt `tsc` tatsächlich, und was tut es nicht?
- Warum gehört `tsc --noEmit` in die CI, auch wenn Vite oder tsx deinen Code ausführt?
- Woher kommen die Typen für eine untypisierte Abhängigkeit?
