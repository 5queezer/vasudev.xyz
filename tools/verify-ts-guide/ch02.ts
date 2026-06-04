// Examples from "02 — The Type System Core"

const count = 3; // inferred as number
const name = "Ada"; // inferred as string
let items: string[] = [];

interface User {
  id: string;
  email: string;
}

type Id = string;
type Handler = (event: string) => void;
type Pair = [number, number];

type Status = "active" | "suspended" | "deleted";

function setStatus(s: Status) {
  void s;
}

type MaybeUser = User | null;
type Parsed = { ok: true; value: number } | { ok: false; error: string };

type Timestamps = { createdAt: Date; updatedAt: Date };
type UserRow = User & Timestamps;

const ids: string[] = ["a", "b"];
const point: [number, number] = [1, 2];
const frozen: readonly number[] = [1, 2];

interface Config {
  host: string;
  port?: number;
}

const Role = {
  Admin: "admin",
  User: "user",
} as const;

type Role = (typeof Role)[keyof typeof Role]; // "admin" | "user"

// Use everything so nothing is flagged as unused-only.
const _checks: [Id, Handler, Pair, MaybeUser, Parsed, UserRow, Config, Role] = [
  "x",
  (_e) => {},
  [1, 2],
  null,
  { ok: true, value: 1 },
  { id: "1", email: "a@b.com", createdAt: new Date(), updatedAt: new Date() },
  { host: "localhost" },
  Role.Admin,
];

void count;
void name;
void items;
void setStatus;
void ids;
void point;
void frozen;
void _checks;

export {};
