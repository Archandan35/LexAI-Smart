-- =============================================================================
-- Migration 002: Case Management Enhancements
-- Adds caseTypes and courts tables, adds new fields to cases table.
-- =============================================================================

-- 1. Case Types table
CREATE TABLE IF NOT EXISTS "caseTypes" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  short_code TEXT NOT NULL UNIQUE,
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  createdAt TEXT,
  updatedAt TEXT
);

CREATE INDEX IF NOT EXISTS idx_caseTypes_short_code ON "caseTypes"(short_code);
CREATE INDEX IF NOT EXISTS idx_caseTypes_status ON "caseTypes"(status);
CREATE INDEX IF NOT EXISTS idx_caseTypes_display_order ON "caseTypes"(display_order);

-- Seed default case types
INSERT INTO "caseTypes" (id, name, short_code, display_order, status, createdAt)
VALUES
  ('ct_civil', 'Civil Suit', 'CIV', 1, 'Active', datetime('now')),
  ('ct_criminal', 'Criminal Case', 'CRL', 2, 'Active', datetime('now')),
  ('ct_writ', 'Writ Petition', 'WP', 3, 'Active', datetime('now')),
  ('ct_consumer', 'Consumer Complaint', 'CC', 4, 'Active', datetime('now')),
  ('ct_family', 'Family Matter', 'FAM', 5, 'Active', datetime('now')),
  ('ct_appeal', 'Appeal', 'APL', 6, 'Active', datetime('now')),
  ('ct_revision', 'Revision Petition', 'REV', 7, 'Active', datetime('now')),
  ('ct_arbitration', 'Arbitration', 'ARB', 8, 'Active', datetime('now')),
  ('ct_company', 'Company Petition', 'CP', 9, 'Active', datetime('now')),
  ('ct_tax', 'Tax Appeal', 'TAX', 10, 'Active', datetime('now')),
  ('ct_original', 'Original Suit', 'OS', 11, 'Active', datetime('now'))
ON CONFLICT(short_code) DO NOTHING;

-- 2. Courts table
CREATE TABLE IF NOT EXISTS "courts" (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  display_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'Active',
  createdAt TEXT,
  updatedAt TEXT
);

CREATE INDEX IF NOT EXISTS idx_courts_status ON "courts"(status);
CREATE INDEX IF NOT EXISTS idx_courts_display_order ON "courts"(display_order);

-- Seed default courts
INSERT INTO "courts" (id, name, display_order, status, createdAt)
VALUES
  ('court_sc', 'Supreme Court of India', 1, 'Active', datetime('now')),
  ('court_hc', 'High Court', 2, 'Active', datetime('now')),
  ('court_district', 'District & Sessions Court', 3, 'Active', datetime('now')),
  ('court_civil_sr', 'Civil Judge (Sr. Dvn.)', 4, 'Active', datetime('now')),
  ('court_civil_jr', 'Civil Judge (Jr. Dvn.)', 5, 'Active', datetime('now')),
  ('court_jmfc', 'Judicial Magistrate First Class', 6, 'Active', datetime('now')),
  ('court_family', 'Family Court', 7, 'Active', datetime('now')),
  ('court_commercial', 'Commercial Court', 8, 'Active', datetime('now')),
  ('court_consumer', 'Consumer Forum', 9, 'Active', datetime('now')),
  ('court_tribunal', 'Tribunal', 10, 'Active', datetime('now'))
ON CONFLICT(name) DO NOTHING;

-- 3. Add new columns to cases table (idempotent — each ALTER TABLE is a no-op if
--    the column already exists).
ALTER TABLE "cases" ADD COLUMN case_type TEXT;
ALTER TABLE "cases" ADD COLUMN case_number INTEGER;
ALTER TABLE "cases" ADD COLUMN case_year INTEGER;
ALTER TABLE "cases" ADD COLUMN case_display_number TEXT;
ALTER TABLE "cases" ADD COLUMN plaintiff TEXT;
ALTER TABLE "cases" ADD COLUMN defendant TEXT;
ALTER TABLE "cases" ADD COLUMN courtName TEXT;
ALTER TABLE "cases" ADD COLUMN judge TEXT;
ALTER TABLE "cases" ADD COLUMN filingDate TEXT;
ALTER TABLE "cases" ADD COLUMN wsFilingDate TEXT;
ALTER TABLE "cases" ADD COLUMN advocate TEXT;
ALTER TABLE "cases" ADD COLUMN client TEXT;

CREATE INDEX IF NOT EXISTS idx_cases_case_type ON "cases"(case_type);
CREATE INDEX IF NOT EXISTS idx_cases_case_display_number ON "cases"(case_display_number);

-- 4. Update schema_meta version
UPDATE "schema_meta" SET version = 16 WHERE key = 'version';
