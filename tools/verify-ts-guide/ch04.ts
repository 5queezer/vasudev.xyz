// Examples from "04 — Generics and Constraints"

function identity<T>(value: T): T {
  return value;
}

const a = identity("hello"); // T inferred as string
const b = identity(42); // T inferred as number

function first<T>(items: T[]): T | undefined {
  return items[0];
}

const x = first([1, 2, 3]); // x: number | undefined

function longest<T extends { length: number }>(a: T, b: T): T {
  return a.length >= b.length ? a : b;
}

longest("abc", "de");
longest([1, 2], [3, 4, 5]);
// @ts-expect-error number has no length property
longest(1, 2);

function getProp<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { id: "1", age: 30 };
const age = getProp(user, "age"); // age: number
// @ts-expect-error "missing" is not a key of user
getProp(user, "missing");

interface ApiResponse<T = unknown> {
  status: number;
  body: T;
}

const r1: ApiResponse = { status: 200, body: "anything" };
const r2: ApiResponse<{ id: string }> = { status: 200, body: { id: "1" } };

void a;
void b;
void x;
void age;
void r1;
void r2;

export {};
