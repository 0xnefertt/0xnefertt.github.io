// Restore a private snapshot into an ephemeral real D1 runtime; print aggregate results only.
import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
import { Miniflare, convertV4MiniflareOptions } from "miniflare";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import assert from "node:assert/strict";

const root = fileURLToPath(new URL("../../", import.meta.url));
const directory = path.resolve(process.argv[2]);
const manifest = JSON.parse(await readFile(path.join(directory, "manifest.json"), "utf8"));
const sql = await readFile(path.join(directory, "content.sql"));
assert.equal(createHash("sha256").update(sql).digest("hex"), manifest.sql_sha256, "SQL checksum mismatch");
const statements = JSON.parse(
  execFileSync(
    "python3",
    [
      "-c",
      `
import json, sqlite3, sys
statements=[]
buffer=''
for line in open(sys.argv[1]):
    buffer+=line
    if sqlite3.complete_statement(buffer):
        statements.append(buffer.strip())
        buffer=''
if buffer.strip(): raise ValueError('Incomplete SQL')
print(json.dumps(statements))
`,
      path.join(directory, "content.sql"),
    ],
    { maxBuffer: 128 * 1024 * 1024 }
  )
);
assert.ok(
  statements.every((statement) => Buffer.byteLength(statement) < 100000),
  "D1 statement limit exceeded"
);
await build({
  entryPoints: [path.join(root, "writer/src/media-storage.ts")],
  outfile: path.join(root, "writer/.test-build/backup-media.mjs"),
  bundle: true,
  platform: "node",
  format: "esm",
  banner: { js: 'import {createRequire} from "node:module"; const require=createRequire(import.meta.url);' },
});
const { readMedia } = await import("../.test-build/backup-media.mjs");
const mf = new Miniflare(
  convertV4MiniflareOptions({
    modules: true,
    script: "export default { fetch() { return new Response('Restore drill'); } }",
    d1Databases: { DB: "isolated-restore" },
  })
);
try {
  const db = await mf.getD1Database("DB");
  for (let i = 0; i < statements.length; i += 25) await db.batch(statements.slice(i, i + 25).map((sql) => db.prepare(sql)));
  for (const [table, count] of Object.entries(manifest.restored.tables)) {
    assert.ok(["drafts", "media", "media_chunks", "d1_migrations"].includes(table));
    assert.equal((await db.prepare(`SELECT count(*) AS n FROM "${table}"`).first()).n, count, `Restored ${table} count differs`);
  }
  assert.equal((await db.prepare("SELECT count(*) AS n FROM sessions").first()).n, 0);
  const media = await db.prepare("SELECT id FROM media ORDER BY id").all();
  const digest = createHash("sha256");
  let bytes = 0;
  for (const { id } of media.results) {
    const image = await readMedia(db, id);
    bytes += image.length;
    digest.update(id);
    digest.update(createHash("sha256").update(image).digest());
  }
  assert.equal(bytes, manifest.restored.media_bytes);
  assert.equal(digest.digest("hex"), manifest.restored.media_sha256);
  console.log(`D1 restore verified: ${manifest.restored.tables.drafts} drafts, ${media.results.length} images, ${bytes} bytes; sessions empty.`);
} finally {
  await mf.dispose();
}
