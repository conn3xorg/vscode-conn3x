// Checks the files the extension ships are well formed and agree.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const load = (p) => JSON.parse(readFileSync(new URL(`../${p}`, import.meta.url)));

test('every contributed file parses', () => {
  const pkg = load('package.json');
  for (const g of pkg.contributes.grammars) load(g.path);
  for (const s of pkg.contributes.snippets) load(s.path);
  load('language-configuration.json');
});

test('snippets cover the circuit blocks and every step has a module', () => {
  const snippets = load('snippets/conn3x.json');
  for (const name of ['circuit', 'handler', 'rescue', 'always', 'prereq', 'step file', 'step package', 'step service']) {
    assert.ok(snippets[name], `missing ${name}`);
  }
  for (const [name, s] of Object.entries(snippets)) {
    assert.ok(s.prefix && s.body.length > 0 && s.description, `${name} is incomplete`);
  }
});

test('the grammar scope matches the package', () => {
  const pkg = load('package.json');
  const grammar = load('syntaxes/circuit.tmLanguage.json');
  assert.equal(pkg.contributes.grammars[0].scopeName, grammar.scopeName);
});
