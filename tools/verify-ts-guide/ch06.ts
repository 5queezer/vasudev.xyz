// Examples from "06 — Narrowing: unknown, any, and Type Guards"

function parse(input: unknown) {
  if (typeof input === "string") {
    return input.toUpperCase();
  }
  return null;
}

function len(x: string | string[]): number {
  if (typeof x === "string") {
    return x.length;
  }
  return x.length;
}

function getId(x: { id: string } | null): string {
  if (x === null) {
    return "anonymous";
  }
  return x.id;
}

interface Cat {
  meow(): void;
}

function isCat(animal: unknown): animal is Cat {
  return (
    typeof animal === "object" && animal !== null && "meow" in animal
  );
}

function handle(animal: unknown) {
  if (isCat(animal)) {
    animal.meow();
  }
}

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

function use(value: string | null) {
  assert(value !== null, "value must be set");
  return value.toUpperCase();
}

const el = document.getElementById("app")!;

void parse;
void len;
void getId;
void handle;
void use;
void el;

export {};
