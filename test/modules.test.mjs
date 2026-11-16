// Checks every step module on docs.conn3x.org has a snippet, so a new one
// isn't missed. It reads the module pages from conn3xorg/web, so it runs
// only where CONN3X_MODULES_CHECK is set, as in CI.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const url = 'https://api.github.com/repos/conn3xorg/web/contents/apps/docs/src/content/docs/modules';

test('every documented step module has a snippet', { skip: !process.env.CONN3X_MODULES_CHECK }, async () => {
  const headers = { Accept: 'application/vnd.github+json' };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  const res = await fetch(url, { headers });
  assert.ok(res.ok, `${url}: ${res.status}`);
  const modules = (await res.json())
    .map((f) => f.name.replace(/\.mdx?$/, ''))
    .filter((m) => m !== 'index');
  const snippets = JSON.parse(readFileSync(new URL('../snippets/conn3x.json', import.meta.url)));
  const prefixes = new Set(Object.values(snippets).map((s) => [s.prefix].flat()[0]));
  const missing = modules.filter((m) => !prefixes.has(`step-${m}`));
  assert.deepEqual(missing, [], `no snippet for ${missing.join(', ')}`);
});
