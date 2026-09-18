ALTER TABLE finance_invoices ADD COLUMN payment_id TEXT REFERENCES candidate_finance_payments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS finance_invoices_payment_idx
  ON finance_invoices (payment_id);
