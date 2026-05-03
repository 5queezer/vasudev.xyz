import test from "node:test";
import assert from "node:assert/strict";

import { buildFinalMessages } from "../src/context.ts";

const history = [{ role: "user" as const, content: "whats in this post" }];

test("final answer messages include current post content", () => {
  const messages = buildFinalMessages(history, {
    mode: "post",
    lang: "en",
    postContent: "# Four Layers\n\nThis post says code knowledge graphs need lexical, structural, semantic, and runtime layers.",
  });

  assert.equal(messages[0].role, "system");
  assert.match(String(messages[0].content), /Current page or post content excerpt/);
  assert.match(String(messages[0].content), /lexical, structural, semantic, and runtime layers/);
});
