import assert from 'node:assert/strict';
import { readFile, readdir, stat } from 'node:fs/promises';
import { resolve, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(fileURLToPath(new URL('..', import.meta.url)));
const readJson = async (path) => JSON.parse(await readFile(join(root, path), 'utf8'));
const manifest = await readJson('plugin.json');
const overlay = await readJson('.codex-plugin/plugin.json');
assert.equal(manifest.name, 'mathbase-helper-pro');
assert.match(manifest.version, /^\d+\.\d+\.\d+$/);
assert.equal(manifest.version, overlay.version);
assert.deepEqual(manifest.extensions['com.openai'].interface, overlay.interface);
assert.ok(manifest.extensions['com.openai'].interface.shortDescription.length <= 30);
assert.match(manifest.extensions['com.openai'].interface.defaultPrompt[0], /全部可用模块/);
for (const field of ['logo', 'composerIcon']) {
  const asset = manifest.extensions['com.openai'].interface[field];
  assert.match(asset, /^\.\/assets\/[a-z0-9.-]+$/);
  assert.ok((await stat(join(root, asset))).isFile());
}

const expected = ['mathbase-helper','math-tutor','proof-forge','proof-audit','formal-math','math-compute','math-visual','paper-lab','conjecture-lab','math-path','research-studio','math-write','knowledge-graph'];
const skills = (await readdir(join(root, 'skills'), { withFileTypes: true })).filter((x) => x.isDirectory()).map((x) => x.name).sort();
assert.deepEqual(skills, expected.sort());
for (const name of expected) {
  const skill = await readFile(join(root, 'skills', name, 'SKILL.md'), 'utf8');
  assert.match(skill, new RegExp(`^---\\nname: ${name}\\ndescription: [^\\n]+\\n---`));
}
const router = await readFile(join(root, 'skills/mathbase-helper/SKILL.md'), 'utf8');
for (const name of expected.filter((x) => x !== 'mathbase-helper')) assert.ok(router.includes('`' + name + '`'), 'Missing route: ' + name);

const domains = await readJson('domains/index.json');
assert.equal(domains.packages.length, 12);
assert.equal(new Set(domains.packages).size, 12);
for (const id of domains.packages) {
  const domain = await readJson(`domains/${id}.json`);
  assert.equal(domain.id, id);
  for (const field of ['topics','prerequisites','methods','risks','next']) assert.ok(Array.isArray(domain[field]));
}
const graph = await readJson('knowledge/learning-graph.json');
const nodes = new Set(graph.nodes.map((x) => x.id));
assert.equal(nodes.size, graph.nodes.length);
for (const node of graph.nodes) for (const predecessor of node.prerequisites) assert.ok(nodes.has(predecessor));
await readJson('adapters/registry.json');
await readJson('schemas/research-record.schema.json');

const textExtensions = new Set(['.md','.json','.mjs','.py','.tex','.svg']);
let scanned = 0;
async function scan(dir) {
  for (const item of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, item.name);
    if (item.isDirectory()) await scan(path);
    else {
      assert.ok(!(await stat(path)).isSymbolicLink(), 'Symlink: ' + path);
      if (!textExtensions.has(item.name.slice(item.name.lastIndexOf('.')))) continue;
      const source = await readFile(path, 'utf8');
      assert.ok(!source.includes('\uFFFD'), 'Invalid UTF-8: ' + path);
      assert.doesNotMatch(source, /[A-Za-z]:\\Users\\|\/Users\/[A-Za-z0-9_-]+\//, 'Personal path: ' + path);
      assert.doesNotMatch(source, /-----BEGIN (?:RSA |OPENSSH |EC )?PRIVATE KEY-----|ghp_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{30,}|sk-[A-Za-z0-9]{30,}/, 'Credential: ' + path);
      assert.doesNotMatch(source, /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/, 'Email address: ' + path);
      scanned++;
    }
  }
}
await scan(root);
console.log(JSON.stringify({ status: 'ok', version: manifest.version, skills: skills.length, domains: domains.packages.length, text_files_scanned: scanned, root: relative(process.cwd(), root) }));
