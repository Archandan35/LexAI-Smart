export const recommendationService = {
  generate(findings) {
    if (!findings) return [];
    const recs = [];

    const add = (r) => { recs.push(r); };

    for (const t of findings.missingTables || []) {
      add({
        id: `create_table_${t.name}`, category: 'table', action: 'create', target: t.name,
        label: `Create table "${t.name}"`, description: t.core ? `Core table missing. Required.` : `Missing table.`,
        severity: t.severity || 'warning',
        sql: `CREATE TABLE IF NOT EXISTS public.${t.name} (id TEXT PRIMARY KEY);`,
        metadata: { type: t.type, core: t.core },
      });
    }

    for (const idx of findings.missingIndexes || []) {
      add({
        id: `create_index_${idx}`, category: 'index', action: 'create', target: idx,
        label: `Create index "${idx}"`, description: `Missing performance index.`,
        severity: 'improvement',
        sql: `CREATE INDEX IF NOT EXISTS ${idx} ON public.${guessIndexTable(idx)} (${guessIndexColumn(idx)});`,
      });
    }

    for (const p of findings.missingPolicies || []) {
      add({
        id: `create_policy_${p.name}`, category: 'policy', action: 'create', target: p.name, table: p.table,
        label: `Create policy "${p.name}" on "${p.table}"`, description: `Missing RLS policy.`,
        severity: 'warning',
        sql: `DO $$ BEGIN CREATE POLICY "${p.name}" ON public.${p.table} FOR ALL TO authenticated USING (true) WITH CHECK (true); EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      });
    }

    for (const fn of findings.missingFunctions || []) {
      add({
        id: `create_function_${fn}`, category: 'function', action: 'create', target: fn,
        label: `Create function "${fn}"`, description: `Run the main installation SQL to create this function with its proper definition.`,
        severity: 'critical',
      });
    }

    for (const fk of findings.missingFks || []) {
      add({
        id: `create_fk_${fk.name}`, category: 'foreignKey', action: 'create', target: fk.name,
        label: `Create foreign key "${fk.name}"`,
        description: `FK from ${fk.from}.${fk.from_col} to ${fk.to}.`,
        severity: 'warning',
        sql: `DO $$ BEGIN ALTER TABLE public.${fk.from} ADD CONSTRAINT ${fk.name} FOREIGN KEY (${fk.from_col}) REFERENCES public.${fk.to}(id) ON DELETE ${fk.on_delete || 'CASCADE'}; EXCEPTION WHEN duplicate_object THEN NULL; END $$;`,
      });
    }

    for (const fk of findings.brokenFks || []) {
      add({
        id: `repair_fk_${fk.name}`, category: 'foreignKey', action: 'repair', target: fk.name,
        label: `Repair broken FK "${fk.name}"`, description: fk.reason,
        severity: 'critical',
        sql: `-- Manual repair needed: ${fk.reason}\n-- ALTER TABLE public.${fk.table} DROP CONSTRAINT ${fk.name};`,
      });
    }

    for (const ext of findings.missingExtensions || []) {
      add({
        id: `create_extension_${ext}`, category: 'extension', action: 'create', target: ext,
        label: `Enable extension "${ext}"`, description: `Required PG extension.`,
        severity: 'warning',
        sql: `CREATE EXTENSION IF NOT EXISTS "${ext}";`,
      });
    }

    for (const r of findings.missingRoles || []) {
      add({
        id: `create_role_${r}`, category: 'role', action: 'create', target: r,
        label: `Create role "${r}"`, description: `Required application role.`,
        severity: 'critical',
        sql: `-- Create role: ${r}\n-- Note: Role creation requires superuser privileges.`,
      });
    }

    for (const trig of findings.missingTriggers || []) {
      const table = guessTriggerTable(trig);
      add({
        id: `create_trigger_${trig}`, category: 'trigger', action: 'create', target: trig, table,
        label: `Create trigger "${trig}"`, description: `Missing DB trigger.`,
        severity: 'warning',
        sql: `DROP TRIGGER IF EXISTS ${trig} ON public.${table};\nCREATE TRIGGER ${trig} AFTER INSERT ON public.${table} FOR EACH ROW EXECUTE FUNCTION public.${trig}();`,
      });
    }

    for (const col of findings.missingColumns || []) {
      add({
        id: `add_column_${col.table}_${col.column}`, category: 'column', action: 'create',
        target: `${col.table}.${col.column}`,
        label: `Add column "${col.column}" to "${col.table}"`,
        description: `Column ${col.column} (${col.expectedType}) missing.`,
        severity: 'warning',
        sql: `ALTER TABLE public.${col.table} ADD COLUMN ${col.column} ${col.expectedType};`,
      });
    }

    for (const t of findings.unnecessaryTables || []) {
      add({
        id: `remove_table_${t.name}`, category: 'table', action: 'remove', target: t.name,
        label: `Remove unnecessary table "${t.name}"`,
        description: `Not in LexAI blueprint.`, severity: 'info',
        sql: `DROP TABLE IF EXISTS public.${t.name} CASCADE;`,
      });
    }

    for (const idx of findings.unnecessaryIndexes || []) {
      add({
        id: `remove_index_${idx}`, category: 'index', action: 'remove', target: idx,
        label: `Remove unnecessary index "${idx}"`, severity: 'info',
        sql: `DROP INDEX IF EXISTS public.${idx};`,
      });
    }

    for (const p of findings.unnecessaryPolicies || []) {
      add({
        id: `remove_policy_${p.name}`, category: 'policy', action: 'remove', target: p.name, table: p.table,
        label: `Remove unnecessary policy "${p.name}" on "${p.table}"`, severity: 'info',
        sql: `DROP POLICY IF EXISTS "${p.name}" ON public.${p.table};`,
      });
    }

    for (const idx of findings.unusedIndexes || []) {
      add({
        id: `remove_unused_index_${idx.name}`, category: 'index', action: 'remove', target: idx.name, table: idx.table,
        label: `Remove unused index "${idx.name}" on "${idx.table}"`,
        description: `Zero scans.`, severity: 'improvement',
        sql: `DROP INDEX IF EXISTS public.${idx.name};`,
      });
    }

    for (const fk of findings.circularFks || []) {
      add({
        id: `repair_circular_fk_${fk.table}`, category: 'foreignKey', action: 'repair',
        target: fk.table, label: `Fix circular FK on "${fk.table}"`,
        description: `FK chain loops: ${fk.table} -> ${fk.references}.`, severity: 'critical',
        sql: `-- Circular FK detected on ${fk.table}. Review and drop the cycle:\n-- ALTER TABLE public.${fk.table} DROP CONSTRAINT <cycle_fk_name>;`,
      });
    }

    for (const d of findings.duplicateTablesByStructure || []) {
      add({
        id: `note_dup_table_${d.t1}_${d.t2}`, category: 'table', action: 'ignore',
        target: `${d.t1} = ${d.t2}`,
        label: `Duplicate structure: "${d.t1}" and "${d.t2}"`,
        description: 'Tables have identical column structure.', severity: 'info',
      });
    }

    for (const t of findings.extraTables || []) {
      if (!findings.unnecessaryTables?.some((u) => u.name === t.name)) {
        add({
          id: `note_extra_table_${t.name}`, category: 'table', action: 'ignore',
          target: t.name, label: `Unknown table "${t.name}"`,
          description: 'Exists in DB but not in blueprint.', severity: 'info',
        });
      }
    }

    for (const p of findings.extraPolicies || []) {
      if (!findings.unnecessaryPolicies?.some((u) => u.name === p.name)) {
        add({
          id: `note_extra_policy_${p.name}`, category: 'policy', action: 'ignore',
          target: p.name, table: p.table,
          label: `Unknown policy "${p.name}" on "${p.table}"`, severity: 'info',
        });
      }
    }

    for (const idx of findings.extraIndexes || []) {
      if (!findings.unnecessaryIndexes?.includes(idx)) {
        add({
          id: `note_extra_index_${idx}`, category: 'index', action: 'ignore', target: idx,
          label: `Unknown index "${idx}"`, severity: 'info',
        });
      }
    }

    for (const t of findings.emptyTables || []) {
      add({
        id: `note_empty_table_${t.name}`, category: 'table', action: 'ignore', target: t.name,
        label: `Empty table "${t.name}"`, description: 'Table has 0 rows.', severity: 'info',
      });
    }

    for (const s of findings.emptySchemas || []) {
      add({
        id: `note_empty_schema_${s.name}`, category: 'schema', action: 'ignore', target: s.name,
        label: `Empty schema "${s.name}"`, description: 'Schema has no objects.', severity: 'info',
      });
    }

    for (const c of findings.exclusionConstraints || []) {
      add({
        id: `note_exclusion_${c.name}`, category: 'constraint', action: 'ignore',
        target: c.name, table: c.table,
        label: `Exclusion constraint "${c.name}" on "${c.table}"`, severity: 'info',
      });
    }

    for (const c of findings.compositeConstraints || []) {
      add({
        id: `note_composite_${c.name}`, category: 'constraint', action: 'ignore',
        target: c.name, table: c.table,
        label: `Composite constraint "${c.name}" on "${c.table}" (type: ${c.type})`, severity: 'info',
      });
    }

    for (const t of findings.largeTables || []) {
      add({
        id: `note_large_table_${t.name}`, category: 'table', action: 'ignore', target: t.name,
        label: `Large table "${t.name}" (${t.size})`, severity: 'info',
      });
    }

    return recs;
  },
};

function guessIndexTable(indexName) {
  const s = indexName.replace(/^idx_/, '').replace(/^idx/, '');
  const parts = s.split('_');
  return parts.slice(0, -1).join('_') || s;
}

function guessIndexColumn(indexName) {
  const parts = indexName.replace(/^idx_/, '').split('_');
  return parts[parts.length - 1] || 'id';
}

function guessTriggerTable(triggerName) {
  const s = triggerName.replace(/^trg_/, '');
  const parts = s.split('_');
  return parts.slice(0, -1).join('_') || s;
}

export default recommendationService;
