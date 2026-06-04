// Examples from "05 — Mapped, Conditional, and Utility Types"

interface User {
  id: string;
  email: string;
  name: string;
}

type PartialUser = Partial<User>;
type UserPreview = Pick<User, "id" | "name">;
type UserWithoutId = Omit<User, "id">;
type UsersById = Record<string, User>;

type Optional<T> = {
  [K in keyof T]?: T[K];
};

type Mutable<T> = {
  -readonly [K in keyof T]: T[K];
};

type Nullable<T, K extends keyof T> = Omit<T, K> & {
  [P in K]: T[P] | null;
};

type IsString<T> = T extends string ? "yes" : "no";

type A = IsString<string>; // "yes"
type B = IsString<number>; // "no"

type MyReturnType<T> = T extends (...args: any[]) => infer R ? R : never;

type R = MyReturnType<() => number>; // number

type Event = "click" | "hover";
type EventHandler = `on${Capitalize<Event>}`; // "onClick" | "onHover"

// Exercise every alias so the file is meaningful.
const checks: [
  PartialUser,
  UserPreview,
  UserWithoutId,
  UsersById,
  Optional<User>,
  Mutable<User>,
  Nullable<User, "email">,
  A,
  B,
  R,
  EventHandler,
] = [
  {},
  { id: "1", name: "Ada" },
  { email: "a@b.com", name: "Ada" },
  {},
  {},
  { id: "1", email: "a@b.com", name: "Ada" },
  { id: "1", email: null, name: "Ada" },
  "yes",
  "no",
  42,
  "onClick",
];

void checks;

export {};
