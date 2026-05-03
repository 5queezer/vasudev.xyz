const test = require('node:test');
const assert = require('node:assert/strict');

global.document = { getElementById: () => null };
const { parseAgentStreamLine } = require('../assets/js/agent.js');

test('preserves content-leading spaces in SSE data chunks', () => {
  assert.equal(parseAgentStreamLine('data:  AI'), ' AI');
  assert.equal(parseAgentStreamLine('data: assistance'), 'assistance');
  assert.equal(parseAgentStreamLine('data:  and Rust-centric'), ' and Rust-centric');
});
