#!/usr/bin/env node
// Restricted local adapters. No shell, package installation, or arbitrary Python evaluation.
import { spawn } from 'node:child_process';
import { readFile, realpath, stat } from 'node:fs/promises';
import { resolve, relative, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';

const worker = new URL('./sympy_worker.py', import.meta.url);
const MAX_INPUT = 64 * 1024;
const TIMEOUT = 10_000;

function run(command, args, input = '', cwd, timeout = TIMEOUT) {
  return new Promise((done) => {
    const child = spawn(command, args, { cwd, shell: false, windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '', err = '', settled = false;
    const finish = (value) => { if (!settled) { settled = true; clearTimeout(timer); done(value); } };
    const timer = setTimeout(() => { child.kill(); finish({ status: 'timeout', exit_code: null, stdout: out, stderr: err }); }, timeout);
    child.on('error', (e) => finish({ status: 'unavailable', exit_code: null, stdout: '', stderr: e.message }));
    child.stdout.on('data', (b) => { out += b.toString(); if (out.length > MAX_INPUT) child.kill(); });
    child.stderr.on('data', (b) => { err += b.toString(); if (err.length > MAX_INPUT) child.kill(); });
    child.on('close', (code) => finish({ status: code === 0 ? 'ok' : 'error', exit_code: code, stdout: out.slice(0, MAX_INPUT), stderr: err.slice(0, MAX_INPUT) }));
    child.stdin.end(input);
  });
}

async function pythonCommand() {
  for (const [command, prefix] of process.platform === 'win32' ? [['py', ['-3']], ['python', []]] : [['python3', []], ['python', []]]) {
    const probe = await run(command, [...prefix, '--version']);
    if (probe.status === 'ok') return { command, prefix, version: (probe.stdout || probe.stderr).trim() };
  }
  return null;
}

async function capabilities() {
  const python = await pythonCommand();
  const sympy = python ? await run(python.command, [...python.prefix, '-I', '-c', 'import sympy; print(sympy.__version__)']) : null;
  const toolchain = await installedLean();
  const lean = toolchain ? await run('elan', ['run', toolchain, 'lean', '--version']) : null;
  return {
    python: python ? { status: 'available', version: python.version } : { status: 'unavailable' },
    sympy: sympy?.status === 'ok' ? { status: 'available', version: sympy.stdout.trim() } : { status: 'unavailable' },
    lean: lean?.status === 'ok' ? { status: 'available', version: lean.stdout.trim(), toolchain } : { status: 'unavailable', reason: toolchain ? lean?.stderr : 'No installed elan toolchain detected' },
  };
}

async function installedLean(project) {
  const elan = await run('elan', ['toolchain', 'list']);
  if (elan.status !== 'ok') return null;
  const installed = elan.stdout.split(/\r?\n/).map((line) => ({ name: line.split(/\s+/)[0], isDefault: line.includes('(default)') })).filter((item) => item.name);
  if (project) {
    let requested;
    try { requested = (await readFile(resolve(project, 'lean-toolchain'), 'utf8')).trim(); } catch { /* use default */ }
    if (requested) return installed.find((item) => item.name === requested)?.name || null;
  }
  return (installed.find((item) => item.isDefault) || installed[0])?.name || null;
}

async function sympy(input) {
  if (Buffer.byteLength(input) > MAX_INPUT) throw new Error('Input too large');
  const parsed = JSON.parse(input);
  if (!['factor', 'expand', 'simplify', 'diff', 'integrate'].includes(parsed.operation)) throw new Error('Unsupported operation');
  const python = await pythonCommand();
  if (!python) return { status: 'unavailable', reason: 'Python not installed' };
  const result = await run(python.command, [...python.prefix, '-I', fileURLToPath(worker)], input);
  if (result.status !== 'ok') return result;
  try { return JSON.parse(result.stdout); } catch { return { status: 'error', reason: 'Invalid worker response', stderr: result.stderr }; }
}

function option(args, name) {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
}

async function lean(args) {
  const fileArg = option(args, '--file'), projectArg = option(args, '--project');
  if (!fileArg || !projectArg) throw new Error('lean requires --file and --project');
  const project = await realpath(resolve(projectArg)), file = await realpath(resolve(fileArg));
  const rel = relative(project, file);
  if (rel.startsWith('..') || isAbsolute(rel) || !file.endsWith('.lean')) throw new Error('Lean file must be inside project');
  if (!(await stat(file)).isFile()) throw new Error('Not a file');
  if ((await stat(file)).size > MAX_INPUT) throw new Error('Lean file too large');
  const source = await readFile(file, 'utf8');
  const placeholders = /\b(sorry|admit)\b/.test(source);
  const addedAxioms = /\b(axiom|constant)\b/.test(source);
  const toolchain = await installedLean(project);
  if (!toolchain) return { status: 'unavailable', reason: 'Required Lean toolchain is not installed' };
  const result = await run('elan', ['run', toolchain, 'lean', rel], '', project, 30_000);
  return { ...result, toolchain, placeholders, added_axioms_or_constants: addedAxioms, checker_passed: result.status === 'ok' && !placeholders && !addedAxioms, note: 'Formally Checked status additionally requires mathematical correspondence and transitive dependency review.' };
}

async function main() {
  const [action, ...args] = process.argv.slice(2);
  let result;
  if (action === 'capabilities') result = await capabilities();
  else if (action === 'sympy') result = await sympy(await new Promise((done) => { let s = ''; process.stdin.on('data', (b) => { s += b; if (s.length > MAX_INPUT) process.stdin.destroy(new Error('Input too large')); }); process.stdin.on('end', () => done(s)); }));
  else if (action === 'lean') result = await lean(args);
  else throw new Error('Usage: math-tool.mjs capabilities | sympy < JSON | lean --file FILE --project DIR');
  console.log(JSON.stringify({ request_id: process.env.MATH_REQUEST_ID || null, timestamp: new Date().toISOString(), action, ...result }));
}

main().catch((e) => { console.error(JSON.stringify({ status: 'error', reason: e.message })); process.exitCode = 1; });
