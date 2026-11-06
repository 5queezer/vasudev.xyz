import test from "node:test";
import assert from "node:assert/strict";

import { DEFAULT_OPENROUTER_MODEL, getControllerModel, getFinalModel } from "../src/model-config.ts";

test("uses the default OpenRouter model when no env var is configured", () => {
  assert.equal(getControllerModel({}), DEFAULT_OPENROUTER_MODEL);
  assert.equal(getFinalModel({}), DEFAULT_OPENROUTER_MODEL);
});

test("uses separate controller and final OpenRouter model env vars", () => {
  const env = {
    OPENROUTER_CONTROLLER_MODEL: "nvidia/nemotron-3.5-super-vl:free",
    OPENROUTER_MODEL: "nvidia/nemotron-3.5-lightning:free",
  };

  assert.equal(getControllerModel(env), "nvidia/nemotron-3.5-super-vl:free");
  assert.equal(getFinalModel(env), "nvidia/nemotron-3.5-lightning:free");
});

test("falls back to final model env var for controller when controller-specific var is blank", () => {
  const env = {
    OPENROUTER_CONTROLLER_MODEL: "  ",
    OPENROUTER_MODEL: "nvidia/nemotron-3.5-super-vl:free",
  };

  assert.equal(getControllerModel(env), "nvidia/nemotron-3.5-super-vl:free");
  assert.equal(getFinalModel(env), "nvidia/nemotron-3.5-super-vl:free");
});
