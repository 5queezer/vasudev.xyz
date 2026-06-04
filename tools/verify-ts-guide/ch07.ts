// Examples from "07 — Async and Concurrency"

interface User {
  id: string;
  name: string;
}

async function getUser(id: string): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  if (!res.ok) {
    throw new Error(`request failed: ${res.status}`);
  }
  return (await res.json()) as User;
}

async function withTryCatch() {
  try {
    const user = await getUser("1");
    void user;
  } catch (err) {
    if (err instanceof Error) {
      console.error(err.message);
    }
  }
}

async function concurrent() {
  const a = await getUser("1");
  const b = await getUser("2");
  void a;
  void b;

  const [c, d] = await Promise.all([getUser("1"), getUser("2")]);
  void c;
  void d;
}

async function withAbort() {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch("/slow", { signal: controller.signal });
    void res;
  } finally {
    clearTimeout(timeout);
  }
}

void withTryCatch;
void concurrent;
void withAbort;

export {};
