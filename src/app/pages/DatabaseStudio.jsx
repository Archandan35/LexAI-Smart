import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Badge from '@/components/Badge.jsx';
import Modal from '@/components/Modal.jsx';
import { Field, Input, Textarea, Select } from '@/components/Field.jsx';
import EmptyState from '@/components/EmptyState.jsx';
import Spinner from '@/components/Spinner.jsx';
import PermissionGate from '@/components/PermissionGate.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { databaseDdlService } from '@/services/databaseDdlService.js';

const TABS = ['columns', 'indexes', 'policies', 'schema'];

export default function DatabaseStudio() {
  const toast = useToast();
  const [tables, setTables] = useState([]);
  const [selected, setSelected] = useState(null);
  const [columns, setColumns] = useState(null);
  const [indexes, setIndexes] = useState(null);
  const [policies, setPolicies] = useState(null);
  const [schemaDef, setSchemaDef] = useState(null);
  const [tab, setTab] = useState('columns');
  const [busy, setBusy] = useState('');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const [showAddCol, setShowAddCol] = useState(false);
  const [addColName, setAddColName] = useState('');
  const [addColType, setAddColType] = useState('text');
  const [addColNullable, setAddColNullable] = useState(true);

  const [showAddIdx, setShowAddIdx] = useState(false);
  const [addIdxCol, setAddIdxCol] = useState('');
  const [addIdxName, setAddIdxName] = useState('');

  const [showAddPol, setShowAddPol] = useState(false);
  const [addPolName, setAddPolName] = useState('');
  const [addPolUsing, setAddPolUsing] = useState('true');

  const [showSchema, setShowSchema] = useState(false);

  useEffect(() => {
    setShowAddCol(false);
    setShowAddIdx(false);
    setShowAddPol(false);
    setShowSchema(false);
  }, [selected]);

  const loadTables = useCallback(async () => {
    const res = await databaseDdlService.listTables();
    if (res.ok) setTables(res.data);
    else toast.push('Failed to load tables.', 'error');
    setLoading(false);
  }, [toast]);

  useEffect(() => { loadTables(); }, [loadTables]);

  const selectTable = async (name) => {
    setSelected(name);
    setBusy('select');
    setColumns(null);
    setIndexes(null);
    setPolicies(null);
    setSchemaDef(null);
    try {
      const [colRes, idxRes, polRes, schRes] = await Promise.all([
        databaseDdlService.getTableColumns(name),
        databaseDdlService.getTableIndexes(name),
        databaseDdlService.getTablePolicies(name),
        databaseDdlService.getSchemaForTable(name),
      ]);
      if (colRes.ok) setColumns(colRes.data);
      if (idxRes.ok) setIndexes(idxRes.data);
      if (polRes.ok) setPolicies(polRes.data);
      if (schRes.ok) setSchemaDef(schRes.data);
    } catch { /* partial data ok */ }
    setBusy('');
  };

  const runDdl = async (key, fn, msg) => {
    setBusy(key);
    const res = await fn();
    setBusy('');
    if (res.ok) {
      toast.push(msg || 'Done.', 'success');
      if (selected) selectTable(selected);
    } else {
      toast.push(res.error || 'Action failed.', 'error');
    }
  };

  const onAddColumn = () => runDdl('addcol', () => databaseDdlService.addColumn(selected, addColName, addColType, { nullable: addColNullable }), `Column "${addColName}" added.`);

  const onAddIndex = () => runDdl('addidx', () => databaseDdlService.createIndex(selected, addIdxCol, addIdxName || undefined), `Index on "${addIdxCol}" created.`);

  const onAddPolicy = () => runDdl('addpol', () => databaseDdlService.createPolicy(addPolName, selected, addPolUsing), `Policy "${addPolName}" created.`);

  const filtered = tables.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="page page--center"><Spinner label="Loading tables…" /></div>;

  return (
    <div className="fade-in">
      <PageHeader
        icon="database"
        title="Database Studio"
        subtitle="Browse tables, columns, indexes and policies. Execute safe DDL operations."
      />

      <div className="grid-sidebar db-studio__layout">
        <Card title={`Tables (${tables.length})`} bodyClass="ds-sidebar">
          <div className="mb-10">
            <Input placeholder="Filter tables…" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="ds-table-list">
            {filtered.map((t) => (
              <div
                key={t.name}
                className={`ds-table-item ${selected === t.name ? 'ds-table-item--active' : ''}`}
                onClick={() => selectTable(t.name)}
              >
                <div className="ds-table-item__head">
                  <span className="ds-table-item__name">{t.name}</span>
                  <Badge tone={t.exists ? 'green' : 'amber'}>{t.exists ? 'Present' : 'Missing'}</Badge>
                </div>
                <div className="ds-table-item__meta">{t.fields} fields · {t.label}</div>
              </div>
            ))}
            {filtered.length === 0 && <EmptyState icon="search" title="No tables match" />}
          </div>
        </Card>

        <div>
          {!selected ? (
            <Card>
              <EmptyState icon="database" title="Select a table" hint="Choose a table from the left panel to inspect its schema." />
            </Card>
          ) : (
            <>
              <Card
                title={selected}
                sub={schemaDef?.label || ''}
                actions={
                  <div className="row-actions">
                    <PermissionGate perm="settings.manageSettings">
                      <Button size="sm" variant="ghost" icon="plus" onClick={() => setShowAddCol(true)}>Add Column</Button>
                      <Button size="sm" variant="ghost" icon="plus" onClick={() => setShowAddIdx(true)}>Add Index</Button>
                      <Button size="sm" variant="ghost" icon="shield" onClick={() => setShowAddPol(true)}>Add Policy</Button>
                    </PermissionGate>
                  </div>
                }
              >
                <div className="tabs">
                  {TABS.map((t) => (
                    <div key={t} className={`tab ${tab === t ? 'active' : ''}`} onClick={() => setTab(t)}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </div>
                  ))}
                </div>

                {tab === 'columns' && <ColumnsTab columns={columns} />}
                {tab === 'indexes' && <IndexesTab indexes={indexes} selected={selected} runDdl={runDdl} />}
                {tab === 'policies' && <PoliciesTab policies={policies} selected={selected} runDdl={runDdl} />}
                {tab === 'schema' && <SchemaTab schemaDef={schemaDef} />}
              </Card>

              <div className="mt-16">
                <PermissionGate perm="settings.manageSettings">
                  <Button
                    size="sm"
                    variant="ghost"
                    icon="code"
                    loading={busy === 'sql'}
                    onClick={async () => {
                      const res = await databaseDdlService.getTableSql(selected);
                      if (res.ok) { setShowSchema(true); }
                    }}
                  >
                    Show CREATE TABLE SQL
                  </Button>
                </PermissionGate>
              </div>
            </>
          )}
        </div>
      </div>

      <Modal open={showAddCol} title={`Add Column — ${selected}`} onClose={() => setShowAddCol(false)}
        footer={<><Button variant="ghost" onClick={() => setShowAddCol(false)}>Cancel</Button><Button icon="plus" loading={busy === 'addcol'} onClick={onAddColumn}>Add Column</Button></>}>
        <Field label="Column Name"><Input value={addColName} onChange={(e) => setAddColName(e.target.value)} placeholder="e.g. email" /></Field>
        <Field label="Data Type">
          <Select value={addColType} onChange={(e) => setAddColType(e.target.value)}>
            {['text', 'numeric', 'boolean', 'timestamptz', 'jsonb', 'uuid', 'integer', 'bigint', 'date', 'varchar(255)'].map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </Select>
        </Field>
        <Field label="Nullable">
          <label className="db-studio__checkbox-label">
            <input type="checkbox" checked={addColNullable} onChange={(e) => setAddColNullable(e.target.checked)} />
            Allow NULL values
          </label>
        </Field>
      </Modal>

      <Modal open={showAddIdx} title={`Create Index — ${selected}`} onClose={() => setShowAddIdx(false)}
        footer={<><Button variant="ghost" onClick={() => setShowAddIdx(false)}>Cancel</Button><Button icon="plus" loading={busy === 'addidx'} onClick={onAddIndex}>Create Index</Button></>}>
        <Field label="Column">
          <Select value={addIdxCol} onChange={(e) => setAddIdxCol(e.target.value)}>
            <option value="">— Select column —</option>
            {(columns || []).map((c) => <option key={c.name} value={c.name}>{c.name} ({c.type})</option>)}
          </Select>
        </Field>
        <Field label="Index Name (optional)" hint="Defaults to {table}_{column}_idx"><Input value={addIdxName} onChange={(e) => setAddIdxName(e.target.value)} placeholder={`${selected}_${addIdxCol || 'col'}_idx`} /></Field>
      </Modal>

      <Modal open={showAddPol} title={`Create Policy — ${selected}`} onClose={() => setShowAddPol(false)}
        footer={<><Button variant="ghost" onClick={() => setShowAddPol(false)}>Cancel</Button><Button icon="plus" loading={busy === 'addpol'} onClick={onAddPolicy}>Create Policy</Button></>}>
        <Field label="Policy Name"><Input value={addPolName} onChange={(e) => setAddPolName(e.target.value)} placeholder="e.g. users_self_access" /></Field>
        <Field label="USING expression" hint="The policy's USING clause (default: true = all rows)">
          <Textarea value={addPolUsing} onChange={(e) => setAddPolUsing(e.target.value)} rows={3} />
        </Field>
      </Modal>

      <Modal open={showSchema} title={`CREATE TABLE — ${selected}`} size="lg" onClose={() => setShowSchema(false)}
        footer={<Button variant="ghost" onClick={() => setShowSchema(false)}>Close</Button>}>
        {selected && <SchemaPreview table={selected} />}
      </Modal>
    </div>
  );
}

function ColumnsTab({ columns }) {
  if (!columns) return <Spinner label="Loading columns…" />;
  if (!columns.length) return <EmptyState icon="layers" title="No columns" />;
  return (
    <div className="table-scroll">
      <table className="table">
        <thead><tr><th>Column</th><th>Type</th></tr></thead>
        <tbody>
          {columns.map((c) => (
            <tr key={c.name}>
              <td className="font-medium"><code>{c.name}</code></td>
              <td><Badge tone="navy">{c.type}</Badge></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function IndexesTab({ indexes, selected, runDdl }) {
  if (!indexes) return <Spinner label="Loading indexes…" />;
  if (!indexes.length) return <EmptyState icon="layers" title="No indexes" hint="Indexes improve query performance on frequently filtered columns." />;
  return (
    <div className="table-scroll">
      <table className="table">
        <thead><tr><th>Index Name</th><th>Column</th><th></th></tr></thead>
        <tbody>
          {indexes.map((ix) => (
            <tr key={ix.name}>
              <td className="font-medium"><code>{ix.name}</code></td>
              <td><Badge tone="grey">{ix.column}</Badge></td>
              <td className="text-right">
                <PermissionGate perm="settings.manageSettings">
                  <Button size="sm" variant="ghost" icon="trash"
                    onClick={() => runDdl(`dropidx_${ix.name}`, () => databaseDdlService.dropIndex(selected, ix.name), `Index "${ix.name}" dropped.`)}
                  >Drop</Button>
                </PermissionGate>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function PoliciesTab({ policies, selected, runDdl }) {
  if (!policies) return <Spinner label="Loading policies…" />;
  if (!policies.length) return <EmptyState icon="shield" title="No RLS policies" hint="Policies control row-level security for this table." />;
  return (
    <div className="table-scroll">
      <table className="table">
        <thead><tr><th>Policy</th><th>Command</th><th>Roles</th><th>Using</th><th></th></tr></thead>
        <tbody>
          {policies.map((p) => (
            <tr key={p.policyname}>
              <td className="font-medium"><code>{p.policyname}</code></td>
              <td><Badge tone="navy">{p.cmd}</Badge></td>
              <td className="muted--sm">{(p.roles || []).join(', ') || 'public'}</td>
              <td className="db-studio__policy-qual"><code>{p.qual}</code></td>
              <td className="text-right">
                <PermissionGate perm="settings.manageSettings">
                  <Button size="sm" variant="ghost" icon="trash"
                    onClick={() => runDdl(`droppol_${p.policyname}`, () => databaseDdlService.dropPolicy(p.policyname, selected), `Policy "${p.policyname}" dropped.`)}
                  >Drop</Button>
                </PermissionGate>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SchemaTab({ schemaDef }) {
  if (!schemaDef) return <Spinner label="Loading schema…" />;
  return (
    <div>
      <div className="ds-schema-section">
        <div className="kv"><span>Collection</span><b>{schemaDef.collection}</b></div>
        <div className="kv"><span>Label</span><span>{schemaDef.label}</span></div>
        <div className="kv"><span>Required Fields</span><span>{(schemaDef.required || []).join(', ') || 'none'}</span></div>
      </div>
      <div className="ds-schema-section">
        <b>Fields ({schemaDef.fields.length})</b>
        <div className="table-scroll mt-8">
          <table className="table">
            <thead><tr><th>Field</th><th>Schema Type</th><th>PG Type</th><th>Required</th></tr></thead>
            <tbody>
              {schemaDef.fields.map((f) => (
                <tr key={f.name}>
                  <td className="font-medium"><code>{f.name}</code></td>
                  <td><Badge tone="grey">{f.schemaType}</Badge></td>
                  <td><Badge tone="navy">{f.type}</Badge></td>
                  <td>{schemaDef.required.includes(f.name) ? <Badge tone="red">Yes</Badge> : <span className="text-faint">No</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="ds-schema-section">
        <b>Indexes ({schemaDef.indexes.length})</b>
        <div className="flex-row flex-wrap gap-6 mt-8">
          {schemaDef.indexes.map((ix) => (
            <Badge key={ix.name} tone="green">{ix.column}</Badge>
          ))}
        </div>
      </div>
    </div>
  );
}

function SchemaPreview({ table }) {
  const [sql, setSql] = useState('');
  useEffect(() => {
    databaseDdlService.getTableSql(table).then((res) => {
      if (res.ok) setSql(res.data || '');
    });
  }, [table]);
  return <pre className="code-block">{sql || 'Loading…'}</pre>;
}
