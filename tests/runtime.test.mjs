import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const runtime = fileURLToPath(new URL('../runtime/math-tool.mjs', import.meta.url));
const run = (args, input) => spawnSync(process.execPath, [runtime, ...args], { input, encoding: 'utf8', timeout: 40000 });

const unknown = run(['sympy'], '{"operation":"arbitrary","expression":{"type":"integer","value":1}}');
assert.equal(unknown.status, 1);
assert.match(unknown.stderr, /Unsupported operation/);

const outside = run(['lean','--file',runtime,'--project',fileURLToPath(new URL('../', import.meta.url))]);
assert.equal(outside.status, 1);
assert.match(outside.stderr, /Lean file must be inside project/);

const probe = run(['capabilities']);
assert.equal(probe.status, 0);
const availability = JSON.parse(probe.stdout);
for (const name of ['python','sympy','lean']) assert.ok(['available','unavailable'].includes(availability[name].status));

if (availability.sympy.status === 'available') {
  const request = { operation: 'factor', expression: { type: 'add', args: [{ type: 'pow', base: { type: 'symbol', name: 'x' }, exponent: 2 }, { type: 'integer', value: -1 }] } };
  const result = run(['sympy'], JSON.stringify(request));
  assert.equal(result.status, 0);
  assert.equal(JSON.parse(result.stdout).result, '(x - 1)*(x + 1)');
}
if (availability.lean.status === 'available') {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const smoke = run(['lean','--file',fileURLToPath(new URL('fixtures/ProofSmoke.lean', import.meta.url)),'--project',root]);
  assert.equal(JSON.parse(smoke.stdout).checker_passed, true);
  const hole = run(['lean','--file',fileURLToPath(new URL('fixtures/ProofHole.lean', import.meta.url)),'--project',root]);
  assert.equal(JSON.parse(hole.stdout).checker_passed, false);
}
console.log(JSON.stringify({ status: 'ok', runtime_boundaries: 2, sympy_executed: availability.sympy.status === 'available', lean_executed: availability.lean.status === 'available' }));
