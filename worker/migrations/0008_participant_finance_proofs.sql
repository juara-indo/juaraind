CREATE TABLE IF NOT EXISTS finance_invoices (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  amount INTEGER NOT NULL DEFAULT 0 CHECK (amount >= 0),
  currency TEXT NOT NULL DEFAULT 'IDR',
  due_date TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'paid', 'void')),
  description TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS finance_invoices_candidate_idx
  ON finance_invoices (candidate_id, due_date, created_at);

CREATE TABLE IF NOT EXISTS finance_payment_proofs (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  payment_id TEXT REFERENCES candidate_finance_payments(id) ON DELETE CASCADE,
  invoice_id TEXT REFERENCES finance_invoices(id) ON DELETE CASCADE,
  object_key TEXT NOT NULL UNIQUE,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  review_note TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  reviewed_at TEXT,
  CHECK (payment_id IS NOT NULL OR invoice_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS finance_payment_proofs_candidate_idx
  ON finance_payment_proofs (candidate_id, created_at);
CREATE INDEX IF NOT EXISTS finance_payment_proofs_status_idx
  ON finance_payment_proofs (status, created_at);

CREATE TABLE IF NOT EXISTS candidate_next_steps (
  candidate_id TEXT PRIMARY KEY,
  status TEXT NOT NULL,
  message TEXT NOT NULL DEFAULT '',
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
