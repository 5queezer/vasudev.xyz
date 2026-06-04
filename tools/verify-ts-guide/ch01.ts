// Examples from "01 — Mental Model: What TypeScript Is and Is Not"

function greet(name: string): string {
  return `Hello, ${name}`;
}

interface Point {
  x: number;
  y: number;
}

function printPoint(p: Point) {
  console.log(p.x, p.y);
}

// No "implements Point" needed. The shape matches, so this is accepted.
const location = { x: 1, y: 2, label: "home" };
printPoint(location);

greet("Ada");

export {};
