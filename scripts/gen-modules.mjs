// Copyright (c) The Conn3x Authors
// SPDX-License-Identifier: MPL-2.0

// Builds data/modules.json, the step modules' arguments with their types
// and descriptions, for completion and hover. Run it with the provider
// schema of a Conn3x release and its circuit lowering source:
//
//   conn3x providers schema -json > schema.json
//   node scripts/gen-modules.mjs schema.json <conn3x>/internal/configs/conn3x_circuit.go v0.23.0 <web>/apps/docs/src/content/docs/modules
//
// A step the circuit lowers itself, such as template, has no resource of its
// own, so its arguments come from its docs page's Arguments table.
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const [schemaFile, loweringFile, version, docsDir] = process.argv.slice(2);
if (!schemaFile || !loweringFile || !version || !docsDir) {
  console.error("usage: gen-modules.mjs schema.json conn3x_circuit.go VERSION docs/modules");
  process.exit(2);
}
const loweredHere = ["template"];
const schema = JSON.parse(readFileSync(schemaFile, "utf8"));
const resources = Object.values(schema.provider_schemas)[0].resource_schemas;

// The step blocks a circuit takes, each lowered to a conn3x_ resource.
const lowering = readFileSync(loweringFile, "utf8");
const start = lowering.indexOf("var circuitModules = map[string]string{");
const body = lowering.slice(start, lowering.indexOf("\n}\n", start));
const modules = [...body.matchAll(/"([a-z0-9_]+)":\s+"(conn3x_[a-z0-9_]+)"/g)].map((m) => [m[1], m[2]]);

// Set by the circuit or computed, so not something to write.
const hidden = new Set(["id", "revision", "in_sync", "ssh"]);

function args(block) {
  const out = {};
  for (const [name, a] of Object.entries(block.attributes ?? {})) {
    if (hidden.has(name) || (a.computed && !a.optional && !a.required)) continue;
    out[name] = {
      type: typeName(a.type ?? (a.nested_type ? "object" : "any")),
      required: Boolean(a.required),
      writeOnly: Boolean(a.write_only),
      description: a.description ?? "",
    };
  }
  return out;
}

function blocks(block) {
  const out = {};
  for (const [name, b] of Object.entries(block.block_types ?? {})) {
    if (hidden.has(name)) continue;
    out[name] = { description: b.block.description ?? "", args: args(b.block), blocks: blocks(b.block) };
  }
  return out;
}

function typeName(t) {
  if (typeof t === "string") return t;
  if (Array.isArray(t)) return t[0] === "object" ? "object" : `${t[0]}(${typeName(t[1])})`;
  return "any";
}

const out = { version, modules: {} };
for (const [step, resource] of modules.sort((a, b) => a[0].localeCompare(b[0]))) {
  const r = resources[resource];
  if (!r) continue;
  out.modules[step] = {
    description: r.block.description ?? "",
    doc: `https://docs.conn3x.org/modules/${step}/`,
    args: args(r.block),
    blocks: blocks(r.block),
  };
}
for (const step of loweredHere) {
  const page = `${docsDir}/${step}.md`;
  if (!existsSync(page)) throw new Error(`no docs page for ${step} at ${page}`);
  out.modules[step] = fromDocs(step, readFileSync(page, "utf8"));
}
out.modules = Object.fromEntries(Object.entries(out.modules).sort(([a], [b]) => a.localeCompare(b)));

// fromDocs reads a module page's description and its Arguments table:
// | `name` | type | Yes or No | Description. |
function fromDocs(step, md) {
  const description = /^description:\s*"?(.*?)"?\s*$/m.exec(md)?.[1] ?? "";
  const from = md.indexOf("## Arguments");
  const to = md.indexOf("\n## ", from + 1);
  const table = md.slice(from, to < 0 ? undefined : to);
  const args = {};
  for (const m of table.matchAll(/^\| `([a-z_]+)` \| ([^|]+) \| (Yes|No|One of) \| (.*) \|$/gm)) {
    args[m[1]] = { type: m[2].trim(), required: m[3] === "Yes", writeOnly: false, description: plain(m[4]) };
  }
  return { description, doc: `https://docs.conn3x.org/modules/${step}/`, args, blocks: {} };
}

// plain drops a description's Markdown links, keeping their text.
function plain(s) {
  return s.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1").trim();
}

writeFileSync("data/modules.json", JSON.stringify(out, null, 1) + "\n");
console.log(`${Object.keys(out.modules).length} modules from ${version}`);
