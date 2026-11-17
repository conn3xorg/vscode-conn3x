// Checks where the cursor is in a circuit, which completion and hover use.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { blockPath, where, argsSet, diagnosticsFrom } = require('../lib.js');
const { modules } = require('../data/modules.json');

test('the path follows named blocks and skips braces in maps, strings and comments', () => {
  const text = `circuit "web" {
  hosts = { web1 = "10.0.0.5" }
  # a comment with { a brace
  step "motd" {
    file {
      content = "\${each.key} {"
      mode = "0644"
      `;
  assert.deepEqual(blockPath(text), ['circuit', 'step', 'file']);
});

test('braces in a heredoc are skipped', () => {
  const text = `circuit "c" {
  step "s" {
    file {
      content = <<-EOT
        server { listen 80; }
      EOT
      `;
  assert.deepEqual(blockPath(text), ['circuit', 'step', 'file']);
});

test('a step offers modules, a module offers its arguments', () => {
  assert.deepEqual(where(['circuit', 'step'], modules), { kind: 'step' });
  const at = where(['circuit', 'step', 'file'], modules);
  assert.equal(at.kind, 'module');
  assert.ok(at.block.args.path.required);
  assert.equal(where(['circuit', 'ssh'], modules), null);
  assert.equal(where(['circuit', 'step', 'nosuchmodule'], modules), null);
  // a step inside a rescue block is still a step
  assert.deepEqual(where(['circuit', 'rescue', 'step'], modules), { kind: 'step' });
});

test('arguments already written in the block are found', () => {
  const text = `step "s" {
  file {
    path = "/etc/motd"
    content = jsonencode({ a = 1 })
    `;
  assert.deepEqual([...argsSet(text)].sort(), ['content', 'path']);
});

test('validate -json diagnostics become zero-based ranges', () => {
  const json = JSON.stringify({ diagnostics: [
    { severity: 'error', summary: 'Missing required argument', detail: 'The argument "path" is required.',
      range: { filename: 'main.circuit.hcl', start: { line: 5, column: 10 }, end: { line: 5, column: 11 } } },
    { severity: 'warning', summary: 'No range' },
  ] });
  assert.deepEqual(diagnosticsFrom(json), [{
    file: 'main.circuit.hcl', severity: 'error',
    message: 'Missing required argument: The argument "path" is required.',
    start: { line: 4, character: 9 }, end: { line: 4, character: 10 },
  }]);
  assert.deepEqual(diagnosticsFrom('not json'), []);
});

test('the module data covers every step snippet', () => {
  const { readFileSync } = require('node:fs');
  const snippets = JSON.parse(readFileSync(new URL('../snippets/conn3x.json', import.meta.url)));
  for (const s of Object.values(snippets)) {
    const p = [s.prefix].flat()[0];
    if (p.startsWith('step-')) assert.ok(modules[p.slice(5)], `${p} has no module data`);
  }
});
