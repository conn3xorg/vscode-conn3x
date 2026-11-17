// Loads extension.js against a stand-in for the vscode module and calls its
// completion and hover providers, as VS Code would.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import Module from 'node:module';

const require = createRequire(import.meta.url);

class Position { constructor(line, character) { Object.assign(this, { line, character }); } }
class Range { constructor(a, b, c, d) { if (a instanceof Position) Object.assign(this, { start: a, end: b }); else Object.assign(this, { start: new Position(a, b), end: new Position(c, d) }); } }
class Item { constructor(label, kind) { Object.assign(this, { label, kind }); } }
const providers = {};
const vscode = {
  Position, Range,
  CompletionItem: Item,
  CompletionItemKind: { Module: 8, Property: 9, Struct: 21 },
  SnippetString: class { constructor(v) { this.value = v; } },
  MarkdownString: class { constructor(v) { this.value = v; } },
  Hover: class { constructor(c, r) { Object.assign(this, { contents: c, range: r }); } },
  DiagnosticSeverity: { Error: 0, Warning: 1 },
  languages: {
    registerCompletionItemProvider: (_, p) => { providers.complete = p; return { dispose() {} }; },
    registerHoverProvider: (_, p) => { providers.hover = p; return { dispose() {} }; },
    createDiagnosticCollection: () => ({ dispose() {} }),
  },
  workspace: { onDidSaveTextDocument: () => ({ dispose() {} }) },
};

const load = Module._load;
Module._load = function (request, ...rest) {
  return request === 'vscode' ? vscode : load.call(this, request, ...rest);
};
const ext = require('../extension.js');
Module._load = load;
ext.activate({ subscriptions: [] });

// doc is a minimal TextDocument over text.
function doc(text) {
  const lines = text.split('\n');
  const offset = (p) => lines.slice(0, p.line).reduce((n, l) => n + l.length + 1, 0) + p.character;
  return {
    getText: (r) => (r ? text.slice(offset(r.start), offset(r.end)) : text),
    getWordRangeAtPosition: (p, re) => {
      const line = lines[p.line];
      for (const m of line.matchAll(new RegExp(re.source, 'g'))) {
        if (m.index <= p.character && p.character <= m.index + m[0].length) return new Range(p.line, m.index, p.line, m.index + m[0].length);
      }
      return undefined;
    },
  };
}

const circuit = `circuit "web" {
  step "motd" {
    file {
      path = "/etc/motd"
      
    }
  }
}`;

test('in a step, completion offers the modules', () => {
  const d = doc('circuit "c" {\n  step "s" {\n    \n  }\n}');
  const items = providers.complete.provideCompletionItems(d, new Position(2, 4));
  const labels = items.map((i) => i.label);
  assert.ok(labels.includes('file') && labels.includes('package') && labels.includes('template'));
});

test('in a module, completion offers its arguments, not those already set', () => {
  const items = providers.complete.provideCompletionItems(doc(circuit), new Position(4, 6));
  const labels = items.map((i) => i.label);
  assert.ok(labels.includes('content') && labels.includes('mode'));
  assert.ok(!labels.includes('path'), 'path is already set');
  assert.ok(!labels.includes('ssh') && !labels.includes('id'));
});

test('hover explains an argument and a module', () => {
  const onPath = providers.hover.provideHover(doc(circuit), new Position(3, 7));
  assert.match(onPath.contents.value, /\*\*path\*\* `string`, required/);
  const onFile = providers.hover.provideHover(doc(circuit), new Position(2, 5));
  assert.match(onFile.contents.value, /\*\*file\*\*[\s\S]*docs\.conn3x\.org\/modules\/file\//);
});
