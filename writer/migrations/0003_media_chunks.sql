CREATE TABLE media_chunks (
  media_id TEXT NOT NULL REFERENCES media(id) ON DELETE CASCADE,
  position INTEGER NOT NULL,
  data BLOB NOT NULL,
  PRIMARY KEY (media_id, position)
);
