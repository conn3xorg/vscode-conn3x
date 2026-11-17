// Copyright (c) The Conn3x Authors
// SPDX-License-Identifier: MPL-2.0

// The parts of the extension that don't need VS Code, so they can be tested
// with plain Node: where the cursor is in a circuit's blocks, and what to
// offer there.
"use strict";

// blockPath returns the labels of the blocks enclosing the end of text, from
// the outside in: ["circuit", "step", "file"] inside a step's file block. A
// brace that doesn't open a named block, such as a map or object, is "{".
// Strings, comments and heredocs are skipped, so braces in them don't count.
function blockPath(text) {
  const stack = [];
  let i = 0;
  let lineStart = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === "\n") {
      lineStart = i + 1;
      i++;
      continue;
    }
    if (c === "#" || (c === "/" && text[i + 1] === "/")) {
      const end = text.indexOf("\n", i);
      i = end < 0 ? text.length : end;
      continue;
    }
    if (c === "/" && text[i + 1] === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    if (c === '"') {
      i = skipString(text, i + 1);
      continue;
    }
    if (c === "<" && text[i + 1] === "<") {
      const m = /^<<-?([A-Za-z_][A-Za-z0-9_]*)\n/.exec(text.slice(i));
      if (m) {
        const end = new RegExp(`\\n\\s*${m[1]}\\b`).exec(text.slice(i + m[0].length - 1));
        i = end ? i + m[0].length - 1 + end.index + end[0].length : text.length;
        continue;
      }
    }
    if (c === "{") {
      const head = /([A-Za-z_][A-Za-z0-9_-]*)(?:\s+"[^"\n]*")*\s*$/.exec(text.slice(lineStart, i));
      const isBlock = head && !/[=:(\[,]\s*$/.test(text.slice(lineStart, head.index));
      stack.push(isBlock ? head[1] : "{");
    } else if (c === "}") {
      stack.pop();
    }
    i++;
  }
  return stack;
}

// skipString returns the index after the string that starts at i, a
// position just past its opening quote, minding escapes and ${ } templates.
function skipString(text, i) {
  let depth = 0;
  while (i < text.length) {
    const c = text[i];
    if (c === "\\") {
      i += 2;
      continue;
    }
    if (c === "$" && text[i + 1] === "{") {
      depth++;
      i += 2;
      continue;
    }
    if (c === "}" && depth > 0) depth--;
    else if (c === '"' && depth === 0) return i + 1;
    else if (c === "\n" && depth === 0) return i; // unterminated: stop at the line
    i++;
  }
  return i;
}

// stepBlocks are the blocks whose direct children are step modules.
const stepBlocks = new Set(["step", "prereq"]);

// where says what the cursor is inside: a step, where a module goes, or a
// module (or one of its nested blocks), whose arguments go there. null for
// anywhere else.
function where(path, modules) {
  for (let i = path.length - 1; i >= 0; i--) {
    if (stepBlocks.has(path[i])) {
      const inner = path.slice(i + 1);
      if (inner.length === 0) return { kind: "step" };
      const mod = modules[inner[0]];
      if (!mod) return null;
      let block = mod;
      for (const name of inner.slice(1)) {
        block = block.blocks?.[name];
        if (!block) return null;
      }
      return { kind: "module", module: inner[0], block };
    }
  }
  return null;
}

// argsSet lists the arguments already written in the innermost block that
// text ends inside, so completion doesn't offer them again.
function argsSet(text) {
  let depth = 0;
  for (let i = text.length - 1; i >= 0; i--) {
    if (text[i] === "}") depth++;
    else if (text[i] === "{") {
      if (depth === 0) {
        const set = new Set();
        let d = 0;
        for (const line of text.slice(i + 1).split("\n")) {
          if (d === 0) {
            const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/.exec(line);
            if (m) set.add(m[1]);
          }
          for (const ch of line) {
            if (ch === "{" || ch === "[" || ch === "(") d++;
            else if (ch === "}" || ch === "]" || ch === ")") d--;
          }
        }
        return set;
      }
      depth--;
    }
  }
  return new Set();
}

// diagnosticsFrom reads conn3x validate -json output into problems with
// zero-based ranges, keyed by the file they're in, relative to dir.
function diagnosticsFrom(json) {
  let out;
  try {
    out = JSON.parse(json);
  } catch {
    return [];
  }
  return (out.diagnostics ?? [])
    .filter((d) => d.range?.filename)
    .map((d) => ({
      file: d.range.filename,
      severity: d.severity,
      message: d.detail ? `${d.summary}: ${d.detail}` : d.summary,
      start: { line: d.range.start.line - 1, character: d.range.start.column - 1 },
      end: { line: d.range.end.line - 1, character: d.range.end.column - 1 },
    }));
}

module.exports = { blockPath, where, argsSet, diagnosticsFrom };
