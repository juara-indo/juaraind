CREATE TABLE IF NOT EXISTS collective_document_claims (
  candidate_id TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('paspor', 'visa')),
  claimed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (candidate_id, document_type)
);
