CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  token TEXT NOT NULL,
  csrf TEXT NOT NULL,
  expires INTEGER NOT NULL
);
CREATE TABLE drafts (
  id TEXT PRIMARY KEY,
  document TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  updated TEXT NOT NULL,
  publishing INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE media (
  id TEXT PRIMARY KEY,
  draft_id TEXT NOT NULL,
  filename TEXT NOT NULL,
  mime TEXT NOT NULL,
  size INTEGER NOT NULL,
  data BLOB NOT NULL
);
CREATE INDEX media_draft ON media(draft_id);
CREATE INDEX sessions_expiry ON sessions(expires);
