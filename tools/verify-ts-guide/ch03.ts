// Examples from "03 — Discriminated Unions and Exhaustiveness"

type Result =
  | { kind: "ok"; value: number }
  | { kind: "error"; message: string };

function handle(r: Result): string {
  switch (r.kind) {
    case "ok":
      return `value is ${r.value}`;
    case "error":
      return `failed: ${r.message}`;
  }
}

type Fetch<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: Error };

type Shape =
  | { kind: "circle"; radius: number }
  | { kind: "square"; side: number };

function area(s: Shape): number {
  switch (s.kind) {
    case "circle":
      return Math.PI * s.radius ** 2;
    case "square":
      return s.side ** 2;
    default: {
      const _exhaustive: never = s;
      return _exhaustive;
    }
  }
}

void handle;
void area;
const _f: Fetch<number> = { status: "idle" };
void _f;

export {};
