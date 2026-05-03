import test from "node:test";
import assert from "node:assert/strict";

import { buildSynthesisMessages, buildWorkerMessages, planSubagents } from "../src/subagents.ts";

const history = [{ role: "user" as const, content: "Can you summarize this post?" }];

test("routes simple prompts directly", () => {
  const plan = planSubagents("What is this post about?", { mode: "post", postContentLength: 1200 });

  assert.equal(plan.action, "direct");
  assert.equal(plan.workers.length, 0);
  assert.match(plan.reason, /simple/i);
});

test("routes complex multi-angle prompts to bounded subagents", () => {
  const plan = planSubagents("Compare the architecture, risks, and implementation tradeoffs across this blog", {
    mode: "index",
    postContentLength: 5000,
  });

  assert.equal(plan.action, "subagents");
  assert.ok(plan.workers.length >= 2);
  assert.ok(plan.workers.length <= 3);
  assert.deepEqual(plan.workers.map((worker) => worker.name), ["context_reader", "technical_reviewer", "synthesis_planner"]);
});

test("builds focused worker messages with bounded brief", () => {
  const plan = planSubagents("Debug the reasoning and review technical claims", { mode: "post", postContentLength: 2000 });
  assert.equal(plan.action, "subagents");

  const messages = buildWorkerMessages(plan.workers[0], {
    originalPrompt: "Debug the reasoning and review technical claims",
    messages: history,
    postContent: "Post body",
    mode: "post",
    lang: "en",
  });

  assert.equal(messages[0].role, "system");
  assert.match(messages[0].content, /bounded specialist subagent/i);
  assert.equal(messages[1].role, "user");
  assert.match(messages[1].content, /Worker name: context_reader/);
  assert.match(messages[1].content, /Post body/);
});

test("builds synthesis messages from successful and failed worker outputs", () => {
  const plan = planSubagents("Compare implementation and risk", { mode: "index", postContentLength: 0 });
  assert.equal(plan.action, "subagents");

  const messages = buildSynthesisMessages({
    originalMessages: history,
    plan,
    workerResults: [
      { name: "context_reader", status: "completed", output: "Relevant context" },
      { name: "technical_reviewer", status: "failed", output: "", error: "timeout" },
    ],
  });

  assert.equal(messages[0].role, "system");
  assert.match(messages[0].content, /synthesize/i);
  assert.equal(messages.at(-1)?.role, "user");
  assert.match(messages.at(-1)?.content ?? "", /Relevant context/);
  assert.match(messages.at(-1)?.content ?? "", /technical_reviewer failed: timeout/);
});
