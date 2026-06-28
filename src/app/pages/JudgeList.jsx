import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Input } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { judgeLogic } from '@/logic/judgeLogic.js';

export default function JudgeList() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [newName, setNewName] = useState('');
  const [newCode, setNewCode] = useState('');
  const [newDesignation, setNewDesignation] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editCode, setEditCode] = useState('');
  const [editDesignation, setEditDesignation] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await judgeLogic.list();
    if (Array.isArray(res)) setItems(res);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) { toast.push('Judge name is required.', 'error'); return; }
    const res = await judgeLogic.create({ name: newName, short_code: newCode, designation: newDesignation });
    if (res.ok) { setNewName(''); setNewCode(''); setNewDesignation(''); toast.push('Judge added.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const startEdit = (item) => { setEditId(item.id); setEditName(item.name); setEditCode(item.short_code || ''); setEditDesignation(item.designation || ''); };

  const saveEdit = async () => {
    if (!editName.trim()) { toast.push('Name cannot be empty.', 'error'); return; }
    const res = await judgeLogic.update(editId, { name: editName, short_code: editCode, designation: editDesignation, status: items.find((i) => i.id === editId)?.status });
    if (res.ok) { setEditId(null); toast.push('Judge updated.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete judge "${item.name}"?`)) return;
    const res = await judgeLogic.remove(item.id);
    if (res.ok) { toast.push('Judge deleted.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const filtered = items.filter((i) =>
    !search || i.name.toLowerCase().includes(search.toLowerCase()) || (i.short_code || '').toLowerCase().includes(search.toLowerCase()) || (i.designation || '').toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="fade-in loading-page"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <PageHeader icon="users" title="Judges" subtitle="Manage judges and presiding officers." />

      <Card title="Add Judge" className="mb-16">
        <div className="flex-row gap-8 flex-wrap">
          <div className="judge-list__input-name">
            <Input value={newName} placeholder="Judge name…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          </div>
          <div className="judge-list__input-code">
            <Input value={newCode} placeholder="Code…" onChange={(e) => setNewCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && add()} />
          </div>
          <div className="judge-list__input-desig">
            <Input value={newDesignation} placeholder="Designation…" onChange={(e) => setNewDesignation(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          </div>
          <button className="btn btn--primary" onClick={add}><Icon name="plus" size={15} /> Add</button>
        </div>
      </Card>

      <div className="judge-list__toolbar">
        <div className="datatable__search judge-list__search">
          <Icon name="search" size={15} />
          <input value={search} placeholder="Search judges…" onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <Card bodyClass="card__body--flush">
        <table className="table">
          <thead>
            <tr><th>Name</th><th>Code</th><th>Designation</th><th>Status</th><th className="col-actions">Actions</th></tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td className="court-types__empty" colSpan={5}>No judges found.</td></tr>
            ) : filtered.map((item) => (
              <tr key={item.id}>
                <td>
                  {editId === item.id ? (
                    <Input value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                  ) : (
                    <span className="font-medium">{item.name}</span>
                  )}
                </td>
                <td>
                  {editId === item.id ? (
                    <Input value={editCode} onChange={(e) => setEditCode(e.target.value.toUpperCase().slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                  ) : (
                    <code>{item.short_code || '—'}</code>
                  )}
                </td>
                <td>
                  {editId === item.id ? (
                    <Input value={editDesignation} onChange={(e) => setEditDesignation(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                  ) : (
                    <span className="muted">{item.designation || '—'}</span>
                  )}
                </td>
                <td><span className={`badge badge--${item.status === 'Active' ? 'green' : 'grey'}`}>{item.status}</span></td>
                <td>
                  <div className="row-actions">
                    {editId === item.id ? (
                      <><button className="iconbtn" title="Save" onClick={saveEdit}><Icon name="check" size={15} /></button><button className="iconbtn" title="Cancel" onClick={() => setEditId(null)}><Icon name="close" size={15} /></button></>
                    ) : (
                      <><button className="iconbtn" title="Edit" onClick={() => startEdit(item)}><Icon name="edit" size={15} /></button><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(item)}><Icon name="trash" size={15} /></button></>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="muted muted--sm mt-12">{items.length} judge(s) configured.</p>
    </div>
  );
}
