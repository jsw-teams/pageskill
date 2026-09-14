CREATE TABLE IF NOT EXISTS comments (
  id TEXT PRIMARY KEY NOT NULL,
  content_key TEXT NOT NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  source_locale TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'visible' CHECK (status IN ('visible', 'hidden')),
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS comments_content_key_created_at
  ON comments (content_key, status, created_at);

CREATE TABLE IF NOT EXISTS comment_translations (
  comment_id TEXT NOT NULL,
  target_locale TEXT NOT NULL,
  source_hash TEXT NOT NULL,
  translation_version INTEGER NOT NULL,
  translated_body TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ready', 'failed')),
  claim_id TEXT,
  model TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  PRIMARY KEY (comment_id, target_locale, source_hash, translation_version),
  FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS comment_translations_lookup
  ON comment_translations (comment_id, target_locale, status, updated_at);
