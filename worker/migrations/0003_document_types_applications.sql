ALTER TABLE documents ADD COLUMN document_type TEXT;

CREATE TABLE IF NOT EXISTS applications (
  user_id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  passport_by_agency INTEGER NOT NULL DEFAULT 0,
  visa_by_agency INTEGER NOT NULL DEFAULT 0,
  applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
