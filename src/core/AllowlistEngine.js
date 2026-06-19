// AllowlistEngine — validates SQL statements against an allowlist of permitted
// operations. Used by safe_ddl to block dangerous DDL and DML. Also provides
// client-side validation in the Setup Wizard before sending SQL to the provider.

const BLOCKED_PATTERNS = [
  { pattern: /^\s*DROP\s+(DATABASE|SCHEMA|TABLE|VIEW|FUNCTION|INDEX|ROLE|POLICY|TRIGGER|EXTENSION|PUBLICATION|SUBSCRIPTION)/i, reason: 'DROP is not permitted' },
  { pattern: /^\s*TRUNCATE\s/i, reason: 'TRUNCATE is not permitted' },
  { pattern: /ALTER\s+TABLE.*DROP\s+(COLUMN|CONSTRAINT)/i, reason: 'ALTER TABLE DROP is not permitted' },
  { pattern: /^\s*(GRANT|REVOKE)\s/i, reason: 'GRANT/REVOKE is not permitted' },
  { pattern: /^\s*(DELETE|UPDATE|INSERT|TRUNCATE)\s/i, reason: 'DML statements are not permitted; use CRUD APIs' },
  { pattern: /^\s*ALTER\s+(DATABASE|SCHEMA|ROLE|USER)\s/i, reason: 'ALTER DATABASE/SCHEMA/ROLE/USER is not permitted' },
  { pattern: /^\s*CREATE\s+(DATABASE|SCHEMA|ROLE|USER|EXTENSION)\s/i, reason: 'CREATE DATABASE/SCHEMA/ROLE/USER/EXTENSION is not permitted' },
  { pattern: /^\s*REINDEX\s/i, reason: 'REINDEX is not permitted' },
  { pattern: /^\s*CLUSTER\s/i, reason: 'CLUSTER is not permitted' },
  { pattern: /^\s*VACUUM\s/i, reason: 'VACUUM is not permitted' },
  { pattern: /^\s*ANALYZE\s/i, reason: 'ANALYZE is not permitted' },
];

const ALLOWED_PATTERNS = [
  /^\s*CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s/i,
  /^\s*CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS\s/i,
  /^\s*ALTER\s+TABLE\s+.*\s+ADD\s+COLUMN\s+IF\s+NOT\s+EXISTS\s/i,
  /^\s*ALTER\s+TABLE\s+.*\s+ADD\s+CONSTRAINT\s/i,
  /^\s*CREATE\s+OR\s+REPLACE\s+FUNCTION\s/i,
  /^\s*ALTER\s+TABLE\s+IF\s+EXISTS\s/i,
  /^\s*ALTER\s+TABLE\s+.*\s+ENABLE\s+ROW\s+LEVEL\s+SECURITY\s/i,
  /^\s*ALTER\s+TABLE\s+.*\s+DISABLE\s+ROW\s+LEVEL\s+SECURITY\s/i,
  /^\s*CREATE\s+POLICY\s/i,
  /^\s*ALTER\s+POLICY\s/i,
  /^\s*DROP\s+POLICY\s+IF\s+EXISTS\s/i,
  /^\s*COMMENT\s+ON\s/i,
];

export const AllowlistEngine = {
  validate(sql) {
    if (!sql || typeof sql !== 'string') {
      return { valid: false, error: 'No SQL provided' };
    }

    const statements = this.splitStatements(sql);
    const errors = [];

    for (const [i, stmt] of statements.entries()) {
      const trimmed = stmt.trim();
      if (!trimmed) continue;

      // Check blocklist first
      for (const bp of BLOCKED_PATTERNS) {
        if (bp.pattern.test(trimmed)) {
          errors.push({ statement: i + 1, sql: trimmed.substring(0, 80), reason: bp.reason });
          break;
        }
      }

      // If not blocked, it must match at least one allowed pattern (unless it's a DO block or empty)
      if (!errors.find((e) => e.statement === i + 1)) {
        const isAllowed = ALLOWED_PATTERNS.some((ap) => ap.test(trimmed));
        const isDoBlock = /^\s*DO\s*\$\$/i.test(trimmed) || /^\s*DO\s*\$\w+\$/i.test(trimmed);
        const isComment = /^\s*--/.test(trimmed);
        if (!isAllowed && !isDoBlock && !isComment) {
          errors.push({ statement: i + 1, sql: trimmed.substring(0, 80), reason: 'Statement does not match any allowed pattern' });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      statementCount: statements.length,
    };
  },

  isAllowed(sql) {
    return this.validate(sql).valid;
  },

  splitStatements(sql) {
    const statements = [];
    let current = '';
    let inDollar = false;
    let dollarTag = '';
    let inQuote = false;

    for (let i = 0; i < sql.length; i++) {
      const ch = sql[i];
      const next = sql[i + 1] || '';

      if (inDollar) {
        current += ch;
        if (ch === '$' && dollarTag === '') {
          dollarTag = '';
          const endIdx = sql.indexOf('$', i + 1);
          if (endIdx > i) {
            dollarTag = sql.substring(i + 1, endIdx);
            i = endIdx;
            current += sql.substring(sql.length > i + 1 ? i : i, i + 1);
          }
        } else if (ch === '$' && current.endsWith('$' + dollarTag + '$')) {
          inDollar = false;
          dollarTag = '';
        }
        continue;
      }

      if (ch === "'" && !inQuote) {
        inQuote = true;
        current += ch;
        continue;
      }
      if (ch === "'" && inQuote) {
        inQuote = false;
        current += ch;
        continue;
      }

      if (ch === ';' && !inQuote) {
        statements.push(current);
        current = '';
        continue;
      }

      current += ch;
    }

    if (current.trim()) statements.push(current);
    return statements;
  },

  // Generate an audit entry for a DDL action
  createAuditEntry(action, details = {}) {
    return {
      action,
      timestamp: new Date().toISOString(),
      ...details,
    };
  },

  BLOCKED_PATTERNS,
  ALLOWED_PATTERNS,
};

export default AllowlistEngine;
