#!/usr/bin/env python3
"""Private D1 snapshots and an isolated SQLite restore drill. Never restores production."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import sqlite3
import subprocess
import tempfile
from datetime import datetime, timezone

ROOT = Path(__file__).resolve().parents[1]
TABLES = ("drafts", "media", "media_chunks", "d1_migrations")


def d1_sql(sql):
    """Rebuild large values incrementally to respect D1's 100KB SQL statement limit."""
    with sqlite3.connect(":memory:") as db:
        db.executescript(sql)
        statements = []
        quote = lambda value: db.execute("SELECT quote(?)", (value,)).fetchone()[0]
        for table in (*TABLES, "sessions"):
            schema = db.execute("SELECT sql FROM sqlite_schema WHERE type='table' AND name=?", (table,)).fetchone()[0]
            statements.append(schema + ";")
            columns = db.execute(f'PRAGMA table_info("{table}")').fetchall()
            keys = sorted((column for column in columns if column[5]), key=lambda column: column[5])
            for row in db.execute(f'SELECT * FROM "{table}" ORDER BY rowid').fetchall():
                values = list(row)
                deferred = []
                for index, value in enumerate(row):
                    if isinstance(value, (str, bytes)) and len(value) > 4000:
                        if columns[index][5]:
                            raise ValueError("Oversized primary key")
                        values[index] = b"" if isinstance(value, bytes) else ""
                        deferred.append((columns[index][1], value))
                statements.append(f'INSERT INTO "{table}" VALUES ({",".join(quote(value) for value in values)});')
                where = " AND ".join(f'"{column[1]}"={quote(row[column[0]])}' for column in keys)
                for name, value in deferred:
                    for offset in range(0, len(value), 4000):
                        expression = f'"{name}" || {quote(value[offset:offset + 4000])}'
                        if isinstance(value, bytes):
                            expression = f"CAST({expression} AS BLOB)"
                        statements.append(f'UPDATE "{table}" SET "{name}"={expression} WHERE {where};')
        statements.extend(row[0] + ";" for row in db.execute("SELECT sql FROM sqlite_schema WHERE type='index' AND sql IS NOT NULL ORDER BY name"))
        if any(len(statement.encode()) >= 100000 for statement in statements):
            raise ValueError("Statement exceeds D1's SQL size limit")
        return "\n".join(statements) + "\n"


def inspect_snapshot(sql):
    # Every inspection restores the SQL into a fresh database, with extension loading disabled.
    with sqlite3.connect(":memory:") as db:
        db.set_authorizer(lambda action, *_: sqlite3.SQLITE_DENY if action in (sqlite3.SQLITE_ATTACH, sqlite3.SQLITE_DETACH) else sqlite3.SQLITE_OK)
        db.executescript(sql)
        if db.execute("PRAGMA integrity_check").fetchall() != [("ok",)]:
            raise ValueError("SQLite integrity check failed")
        if db.execute("PRAGMA foreign_key_check").fetchall():
            raise ValueError("Foreign key check failed")
        if db.execute("SELECT count(*) FROM sessions").fetchone()[0]:
            raise ValueError("A content backup must not contain login sessions")
        counts = {table: db.execute(f'SELECT count(*) FROM "{table}"').fetchone()[0] for table in TABLES}
        for document, version in db.execute("SELECT document, version FROM drafts"):
            if not isinstance(json.loads(document), dict) or version < 1:
                raise ValueError("Invalid draft document or revision")
        if db.execute("SELECT count(*) FROM media m LEFT JOIN drafts d ON d.id=m.draft_id WHERE d.id IS NULL").fetchone()[0]:
            raise ValueError("Orphan attachment")
        media_bytes = 0
        media_digest = hashlib.sha256()
        for media_id, size, first in db.execute("SELECT id, size, data FROM media ORDER BY id"):
            chunks = db.execute("SELECT position, data FROM media_chunks WHERE media_id=? ORDER BY position", (media_id,)).fetchall()
            if [position for position, _ in chunks] != list(range(1, len(chunks) + 1)):
                raise ValueError("Attachment chunk sequence is incomplete")
            data = bytes(first) + b"".join(bytes(chunk) for _, chunk in chunks)
            if len(data) != size:
                raise ValueError("Attachment byte count does not match")
            media_bytes += size
            media_digest.update(media_id.encode())
            media_digest.update(hashlib.sha256(data).digest())
        rows_digest = hashlib.sha256()
        for table in TABLES:
            rows = db.execute(f'SELECT * FROM "{table}" ORDER BY rowid').fetchall()
            rows_digest.update(json.dumps(rows, ensure_ascii=False, default=lambda value: {"hex": value.hex()}).encode())
        return {"tables": counts, "media_bytes": media_bytes, "media_sha256": media_digest.hexdigest(), "rows_sha256": rows_digest.hexdigest()}


def verify(directory):
    directory = Path(directory)
    raw = (directory / "content.sql").read_bytes()
    manifest = json.loads((directory / "manifest.json").read_text())
    if hashlib.sha256(raw).hexdigest() != manifest["sql_sha256"]:
        raise ValueError("Snapshot checksum does not match")
    summary = inspect_snapshot(raw.decode())
    if summary != manifest["restored"]:
        raise ValueError("Restored content does not match the manifest")
    print(json.dumps({"verified": True, "directory": str(directory.resolve()), **summary}, indent=2))
    return summary


def export(remote):
    os.umask(0o077)
    parent = ROOT / ".private-backups"
    parent.mkdir(mode=0o700, exist_ok=True)
    parent.chmod(0o700)
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    directory = Path(tempfile.mkdtemp(prefix=f"writer-{stamp}-", dir=parent))
    output = directory / "content.sql"
    command = ["node", "node_modules/wrangler/bin/wrangler.js", "d1", "export", "nefertt-writer",
               "--remote" if remote else "--local", "--output", str(output), "--table", *TABLES]
    result = subprocess.run(command, cwd=ROOT / "writer", capture_output=True, text=True)
    if result.returncode:
        raise RuntimeError("D1 export failed; inspect Wrangler's private local log. No backup was verified.")
    # Login credentials are deliberately excluded; restored users authenticate again.
    with output.open("a") as handle:
        handle.write("\nCREATE TABLE sessions (id TEXT PRIMARY KEY, token TEXT NOT NULL, csrf TEXT NOT NULL, expires INTEGER NOT NULL);\n")
        handle.write("CREATE INDEX sessions_expiry ON sessions(expires);\n")
    output.chmod(0o600)
    original = output.read_text()
    summary = inspect_snapshot(original)
    normalized = d1_sql(original)
    if inspect_snapshot(normalized) != summary:
        raise ValueError("D1-compatible SQL changed snapshot content")
    output.write_text(normalized)
    raw = output.read_bytes()
    manifest = {"created_at": datetime.now(timezone.utc).isoformat(), "source": "remote" if remote else "local",
                "database": "nefertt-writer", "sql_sha256": hashlib.sha256(raw).hexdigest(), "restored": summary}
    (directory / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    verify(directory)


def self_test():
    with sqlite3.connect(":memory:") as db:
        for migration in sorted((ROOT / "writer/migrations").glob("*.sql")):
            db.executescript(migration.read_text())
        db.execute("CREATE TABLE d1_migrations (id INTEGER PRIMARY KEY, name TEXT, applied_at TEXT)")
        db.execute("INSERT INTO drafts(id,document,version,updated,deleted_at) VALUES (?,?,?,?,?)", ("draft", json.dumps({"body": "복구 '; 테스트\n" * 20000}, ensure_ascii=False), 7, "2026-10-12", "2026-10-12"))
        data = bytes(range(256)) * 6000
        db.execute("INSERT INTO media VALUES (?,?,?,?,?,?)", ("image", "draft", "test.png", "image/png", len(data), data[:1048576]))
        db.execute("INSERT INTO media_chunks VALUES (?,?,?)", ("image", 1, data[1048576:]))
        sql = "\n".join(db.iterdump())
        summary = inspect_snapshot(sql)
        assert summary["media_bytes"] == len(data) and summary["tables"]["drafts"] == 1
        assert inspect_snapshot(d1_sql(sql)) == summary
        db.execute("DELETE FROM media_chunks")
        try:
            inspect_snapshot("\n".join(db.iterdump()))
        except ValueError:
            pass
        else:
            raise AssertionError("Truncated attachment was accepted")
    print("Backup restore drill passed: Unicode draft, trash, revision, multi-chunk image, corruption rejection.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("export")
    target = create.add_mutually_exclusive_group(required=True)
    target.add_argument("--remote", action="store_true")
    target.add_argument("--local", action="store_true")
    check = commands.add_parser("verify")
    check.add_argument("directory")
    commands.add_parser("self-test")
    args = parser.parse_args()
    if args.command == "export":
        export(args.remote)
    elif args.command == "verify":
        verify(args.directory)
    else:
        self_test()
