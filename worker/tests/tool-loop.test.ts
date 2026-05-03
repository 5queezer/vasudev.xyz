import test from "node:test";
import assert from "node:assert/strict";

import {
  appendToolObservation,
  executeToolCall,
  extractToolCall,
  modelToolSchemas,
  validateToolCall,
} from "../src/tool-loop.ts";

const fakeFetch = async (url: string, init?: RequestInit) => {
  assert.equal(init?.method, "GET");
  assert.match(String(url), /^https:\/\/api\.github\.com\//);
  return new Response(JSON.stringify({ items: [{ title: "Sablier", html_url: "https://github.com/sablierapp/sablier" }] }), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
};

test("defines OpenAI-compatible tool schemas", () => {
  assert.deepEqual(modelToolSchemas.map((tool) => tool.function.name), ["github_search", "github_get", "run_subagents"]);
  for (const tool of modelToolSchemas) {
    assert.equal(tool.type, "function");
    assert.equal(tool.function.parameters.type, "object");
  }
});

test("extracts one model tool call", () => {
  const call = extractToolCall({
    choices: [{ message: { tool_calls: [{ id: "call_1", type: "function", function: { name: "github_search", arguments: "{\"query\":\"sablier\",\"type\":\"repos\"}" } }] } }],
  });

  assert.deepEqual(call, {
    id: "call_1",
    name: "github_search",
    argumentsJson: "{\"query\":\"sablier\",\"type\":\"repos\"}",
  });
});

test("validates known tool arguments and rejects unknown tools", () => {
  assert.deepEqual(validateToolCall({ id: "1", name: "github_search", argumentsJson: "{\"query\":\"sablier\",\"type\":\"repos\",\"limit\":50}" }), {
    ok: true,
    name: "github_search",
    args: { query: "sablier", type: "repos", limit: 10 },
  });

  const invalid = validateToolCall({ id: "2", name: "delete_repo", argumentsJson: "{}" });
  assert.equal(invalid.ok, false);
  assert.match(invalid.error, /unknown tool/i);
});

test("executes github_search through read-only GitHub fetch", async () => {
  const result = await executeToolCall(
    { id: "1", name: "github_search", argumentsJson: "{\"query\":\"sablier\",\"type\":\"repos\"}" },
    { githubToken: "token", fetcher: fakeFetch },
  );

  assert.equal(result.status, "success");
  assert.equal(result.toolName, "github_search");
  assert.equal(result.resultCount, 1);
  assert.match(JSON.stringify(result.data), /sablierapp\/sablier/);
});

test("executes run_subagents through injected bounded runner", async () => {
  const result = await executeToolCall(
    { id: "1", name: "run_subagents", argumentsJson: "{\"objective\":\"review architecture\"}" },
    {
      runSubagents: async (objective) => ({
        action: "subagents",
        workers: [{ name: "reviewer", status: "completed", output: `checked ${objective}` }],
      }),
    },
  );

  assert.equal(result.status, "success");
  assert.equal(result.toolName, "run_subagents");
  assert.match(JSON.stringify(result.data), /checked review architecture/);
});

test("appends tool observations for final synthesis", () => {
  const messages = appendToolObservation([{ role: "user", content: "Find sablier" }], {
    status: "success",
    toolName: "github_search",
    resultCount: 1,
    data: { items: [{ title: "Sablier" }] },
  });

  assert.equal(messages.length, 2);
  assert.equal(messages[1].role, "tool");
  assert.equal(messages[1].tool_call_id, "worker_tool_call");
  assert.match(messages[1].content, /github_search/);
  assert.match(messages[1].content, /Sablier/);
});
