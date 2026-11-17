// Copyright (c) The Conn3x Authors
// SPDX-License-Identifier: MPL-2.0

// Completion and hover for step modules and their arguments, from the
// module data generated from a Conn3x release, and conn3x validate's errors
// shown in place when a circuit is saved.
"use strict";

const vscode = require("vscode");
const path = require("node:path");
const fs = require("node:fs");
const { execFile } = require("node:child_process");
const { blockPath, where, argsSet, diagnosticsFrom, needsInit } = require("./lib");
const { modules, version } = require("./data/modules.json");

const LANG = "conn3x-circuit";

function activate(context) {
  const selector = [{ language: LANG }];
  context.subscriptions.push(
    vscode.languages.registerCompletionItemProvider(selector, { provideCompletionItems: complete }),
    vscode.languages.registerHoverProvider(selector, { provideHover: hover }),
  );

  const problems = vscode.languages.createDiagnosticCollection("conn3x");
  context.subscriptions.push(
    problems,
    vscode.workspace.onDidSaveTextDocument((doc) => {
      if (doc.languageId === LANG || doc.fileName.endsWith(".tf")) validate(doc, problems);
    }),
  );
}

function textBefore(doc, pos) {
  return doc.getText(new vscode.Range(new vscode.Position(0, 0), pos));
}

function complete(doc, pos) {
  const before = textBefore(doc, pos);
  const at = where(blockPath(before), modules);
  if (!at) return [];
  if (at.kind === "step") {
    return Object.entries(modules).map(([name, m]) => {
      const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Module);
      item.insertText = new vscode.SnippetString(`${name} {\n\t$0\n}`);
      item.documentation = moduleDoc(name, m);
      return item;
    });
  }
  const written = argsSet(before);
  const items = [];
  for (const [name, a] of Object.entries(at.block.args)) {
    if (written.has(name)) continue;
    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Property);
    item.detail = `${a.type}${a.required ? ", required" : ""}${a.writeOnly ? ", write-only" : ""}`;
    item.documentation = new vscode.MarkdownString(a.description);
    item.insertText = new vscode.SnippetString(a.type === "string" ? `${name} = "$0"` : `${name} = $0`);
    item.sortText = (a.required ? "0" : "1") + name; // required arguments first
    items.push(item);
  }
  for (const [name, b] of Object.entries(at.block.blocks ?? {})) {
    const item = new vscode.CompletionItem(name, vscode.CompletionItemKind.Struct);
    item.documentation = new vscode.MarkdownString(b.description);
    item.insertText = new vscode.SnippetString(`${name} {\n\t$0\n}`);
    item.sortText = "2" + name;
    items.push(item);
  }
  return items;
}

function hover(doc, pos) {
  const range = doc.getWordRangeAtPosition(pos, /[A-Za-z_][A-Za-z0-9_]*/);
  if (!range) return null;
  const word = doc.getText(range);
  // Where the word sits: the block around it, before the word itself.
  const before = textBefore(doc, range.start);
  const at = where(blockPath(before), modules);
  if (!at) return null;
  if (at.kind === "step" && modules[word]) {
    return new vscode.Hover(moduleDoc(word, modules[word]), range);
  }
  if (at.kind === "module") {
    const a = at.block.args[word];
    if (a) {
      const md = new vscode.MarkdownString(`**${word}** \`${a.type}\`${a.required ? ", required" : ""}${a.writeOnly ? ", write-only" : ""}\n\n${a.description}`);
      return new vscode.Hover(md, range);
    }
  }
  return null;
}

function moduleDoc(name, m) {
  const md = new vscode.MarkdownString(`**${name}**\n\n${m.description}\n\n[Docs](${m.doc}) · Conn3x ${version}`);
  md.isTrusted = false;
  return md;
}

// validate runs conn3x validate in the saved file's directory and shows
// what it finds. A circuit that uses only Conn3x's own steps needs no
// conn3x init, so it runs anywhere; where init is needed first, or anything
// else keeps it from running, the problems are left as they were.
function validate(doc, problems) {
  const config = vscode.workspace.getConfiguration("conn3x");
  if (!config.get("validateOnSave", true)) return;
  const dir = path.dirname(doc.fileName);
  // A .tf file is only Conn3x's to check where a circuit sits beside it.
  if (doc.languageId !== LANG && !fs.readdirSync(dir).some((f) => f.endsWith(".circuit.hcl"))) return;
  const bin = config.get("path") || "conn3x";
  execFile(bin, ["validate", "-json", "-no-color"], { cwd: dir, timeout: 60000 }, (err, stdout) => {
    if (err && !stdout) return; // not installed, or failed before it could report
    const found = diagnosticsFrom(stdout);
    if (needsInit(stdout)) return;
    const byFile = new Map();
    for (const p of found) {
      const file = path.resolve(dir, p.file);
      const d = new vscode.Diagnostic(
        new vscode.Range(p.start.line, p.start.character, p.end.line, p.end.character),
        p.message,
        p.severity === "error" ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning,
      );
      d.source = "conn3x validate";
      if (!byFile.has(file)) byFile.set(file, []);
      byFile.get(file).push(d);
    }
    // Clear this directory's files first, so fixed problems go away.
    problems.forEach((uri) => {
      if (path.dirname(uri.fsPath) === dir) problems.delete(uri);
    });
    for (const [file, list] of byFile) problems.set(vscode.Uri.file(file), list);
  });
}

function deactivate() {}

module.exports = { activate, deactivate };
