ALTER TABLE documents ADD COLUMN validation_status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE documents ADD COLUMN reviewed_at TEXT;
CREATE INDEX IF NOT EXISTS documents_validation_status_idx ON documents (validation_status);
