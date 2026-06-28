import { priorityLogic } from '@/logic/priorityLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Input } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';

const COLOR_OPTIONS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899', '#6b7280'];

export default function Priorities() {
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState('#6b7280');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  const load = async () => {
    setLoading(true);
    const res = await priorityLogic.list();
    if (Array.isArray(res)) setItems(res);
    else if (res.ok) setItems(Array.isArray(res.data) ? res.data : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const add = async () => {
    if (!newName.trim()) return;
    const order = items.reduce((m, i) => Math.max(m, i.display_order ?? 0), 0) + 1;
    const res = await priorityLogic.create({ name: newName.trim(), color: newColor, display_order: order });
    if (res.ok) { setNewName(''); setNewColor('#6b7280'); toast.push('Priority added.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const saveEdit = async () => {
    if (!editName.trim()) return;
    const item = items.find((i) => i.id === editId);
    if (!item) return;
    const res = await priorityLogic.update(editId, { name: editName.trim(), display_order: item.display_order, color: editColor, status: item.status });
    if (res.ok) { setEditId(null); toast.push('Priority updated.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  const remove = async (item) => {
    if (!window.confirm(`Delete priority "${item.name}"?`)) return;
    const res = await priorityLogic.remove(item.id);
    if (res.ok) { toast.push('Priority deleted.', 'success'); await load(); }
    else { toast.push(res.error, 'error'); }
  };

  if (loading) return <div className="fade-in loading-page"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <PageHeader icon="flag" title="Priorities" subtitle="Manage case priority levels (Urgent, High, Medium, Low, etc.)." />

      <Card title="Add Priority" className="mb-16">
        <div className="flex-row gap-8 items-center flex-wrap">
          <div className="priorities__input-wrap">
            <Input value={newName} placeholder="Priority name…" onChange={(e) => setNewName(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && add()} />
          </div>
          <div className="flex-row gap-4 items-center">
            {COLOR_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setNewColor(c)}
                style={{
                  width: 22, height: 22, borderRadius: '50%', border: newColor === c ? '2px solid #fff' : '2px solid transparent',
                  background: c, cursor: 'pointer', outline: newColor === c ? '2px solid var(--brand)' : 'none',
                }}
              />
            ))}
          </div>
          <button className="btn btn--primary" onClick={add}><Icon name="plus" size={15} /> Add</button>
        </div>
      </Card>

      <Card bodyClass="card__body--flush">
        <table className="table">
          <thead>
            <tr><th>Order</th><th>Color</th><th>Name</th><th>Status</th><th className="col-actions">Actions</th></tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr><td colSpan={5} className="empty-table">No priorities configured.</td></tr>
            ) : items.map((item) => (
              <tr key={item.id}>
                <td><span className="badge">{item.display_order ?? '—'}</span></td>
                <td>
                  {editId === item.id ? (
                    <div className="priorities__color-picker">
                      {COLOR_OPTIONS.map((c) => (
                        <button
                          key={c}
                          onClick={() => setEditColor(c)}
                          style={{
                            width: 18, height: 18, borderRadius: '50%', border: editColor === c ? '2px solid #fff' : '1px solid #475569',
                            background: c, cursor: 'pointer', outline: editColor === c ? '2px solid var(--brand)' : 'none', padding: 0,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div style={{ width: 20, height: 20, borderRadius: 4, background: item.color || '#6b7280' }} />
                  )}
                </td>
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
                      <><button className="iconbtn" title="Edit" onClick={() => { setEditId(item.id); setEditName(item.name); setEditColor(item.color || '#6b7280'); }}><Icon name="edit" size={15} /></button><button className="iconbtn iconbtn--danger" title="Delete" onClick={() => remove(item)}><Icon name="trash" size={15} /></button></>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <p className="muted muted--sm mt-12">{items.length} priority level(s) configured.</p>
    </div>
  );
}
