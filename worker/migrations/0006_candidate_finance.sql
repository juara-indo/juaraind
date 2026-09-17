CREATE TABLE IF NOT EXISTS candidate_finance (
  candidate_id TEXT PRIMARY KEY,
  passport_fee INTEGER NOT NULL DEFAULT 0,
  visa_fee INTEGER NOT NULL DEFAULT 0,
  departure_fee INTEGER NOT NULL DEFAULT 20000000,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS candidate_finance_payments (
  id TEXT PRIMARY KEY,
  candidate_id TEXT NOT NULL,
  amount INTEGER NOT NULL CHECK (amount > 0),
  payment_date TEXT NOT NULL,
  note TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS candidate_finance_payments_candidate_idx
  ON candidate_finance_payments (candidate_id, payment_date, created_at);
