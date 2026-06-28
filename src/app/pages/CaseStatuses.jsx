import { caseStatusLogic } from '@/logic/caseStatusLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Input } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';

export default function CaseStatuses() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await caseStatusLogic.list();
    if (Array.isArray(res)) setItems(res);
    else if (res.ok) setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) return;
    const order = items.reduce((m, i) => Math.max(m, i.display_order ?? 0), 0) + 1;
    const res = await caseStatusLogic.create({ name: newName.trim(), display_order: order });
    if (res.ok) { setNewName(''); toast.push('Status added.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    const item = items.find((i) => i.id === editId);
    if (!item) return;
    const res = await caseStatusLogic.update(editId, { name: editName.trim(), display_order: item.display_order, status: item.status });
    if (res.ok) { setEditId(null); toast.push('Status updated.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete status "${item.name}"?`)) return;
    const res = await caseStatusLogic.remove(item.id);
    if (res.ok) { toast.push('Status deleted.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  if (loading) return <div className="fade-in loading-page"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <PageHeader icon="toggle" title="Case Statuses" subtitle="Manage case statuses (Active, Closed, Archived, Transferred, etc.)." />

      <Card title="Add Status" className="mb-16">
        <div className="flex-row gap-8">
          <Input value={newName} placeholder="Status name…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} className="flex-1" />
          <button className="btn btn--primary" onClick={add}><Icon name="plus" size={15} /> Add</button>
        </div>
      </Card>

      <Card bodyClass="card__body--flush">
        <table className="table">
          <thead>
            <tr><th>Order</th><th>Name</th><th>Status</th><th className="col-actions">Actions</th></tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={4} className="empty-table">No statuses configured.</td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <td><span className="badge">{item.display_order ?? '—'}</span></td>
                <td>
                  {editId === item.id ? (
                    <Input value={editName} autoFocus onChange={(e) => setEditName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && saveEdit()} />
                  ) : (
                    <span className="font-medium">{item.name}</span>
                  )}
                </td>
                <td><span className={`badge badge--${item.status === 'Active' ? 'green' : 'grey'}`}>{item.status || 'Active'}</span></td>
                <td>
                  <div className="row-actions">
                    {editId === item.id ? (
                      <><button className="iconbtn" title="Save" onClick={saveEdit}><Icon name="check" size={15} /></button><button className="iconbtn" title="Cancel" onClick={() => setEditId(null)}><Icon name="close" size={15} /></button></>
                    ) : (
                      <><button className="iconbtn" title="Edit" onClick={() => { setEditId(item.id); setEditName(item.name); }}><Icon name="edit" size={15} /></button><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(item)}><Icon name="trash" size={15} /></button></>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="muted muted--sm mt-12">{items.length} status(es) configured.</p>
    </div>
  );
}
