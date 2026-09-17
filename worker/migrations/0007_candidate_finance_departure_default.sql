CREATE TABLE candidate_finance_v2 (
  candidate_id TEXT PRIMARY KEY,
  passport_fee INTEGER NOT NULL DEFAULT 0,
  visa_fee INTEGER NOT NULL DEFAULT 0,
  departure_fee INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO candidate_finance_v2 (candidate_id, passport_fee, visa_fee, departure_fee, updated_at)
SELECT candidate_id, passport_fee, visa_fee, departure_fee, updated_at
FROM candidate_finance;

DROP TABLE candidate_finance;
ALTER TABLE candidate_finance_v2 RENAME TO candidate_finance;
