import CrudListPage from '@/components/CrudListPage.jsx';
import { Input } from '@/components/Field.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { legalNoticeLogic } from '@/logic/legalNoticeLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';

const STATUS_TONE = { Draft: 'muted', Sent: 'info', Acknowledged: 'warning', Replied: 'success' };

function NoticeForm({ load, setShowForm }) {
  const toast = useToast();
  const [form, setForm] = useState({ notice_number: '', recipient: '', date: '', content: '' });
  const add = async () => {
    if (!form.notice_number?.trim()) { toast.error('Notice number is required.'); return; }
    if (!form.recipient?.trim()) { toast.error('Recipient is required.'); return; }
    const r = await legalNoticeLogic.create(form);
    if (r && !r.error) { toast.success('Notice added.'); setShowForm(false); setForm({ notice_number: '', recipient: '', date: '', content: '' }); load(); }
    else toast.error(r?.error || 'Failed to add notice.');
  };
  return (
    <div className="card card--inset">
      <div className="field"><label>Notice No.</label><Input value={form.notice_number} onChange={(e) => setForm({ ...form, notice_number: e.target.value })} /></div>
      <div className="field"><label>Recipient</label><Input value={form.recipient} onChange={(e) => setForm({ ...form, recipient: e.target.value })} /></div>
      <div className="field"><label>Date</label><Input type="date" placeholder="dd-mm-yyyy" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} /></div>
      <Button onClick={add}>Save Notice</Button>
    </div>
  );
}

export default function LegalNotices() {
  const toast = useToast();
  return (
    <CrudListPage
      title="Legal Notices"
      icon="file-text"
      logic={legalNoticeLogic}
      searchFields={['notice_number', 'recipient']}
      emptyText="No notices yet."
      addLabel="Add Notice"
      statsConfig={[
        { key: 'draft', label: 'Draft' },
        { key: 'sent', label: 'Sent' },
        { key: 'acknowledged', label: 'Acknowledged' },
        { key: 'replied', label: 'Replied' },
      ]}
      columns={[
        { header: 'Notice No.', accessor: 'notice_number' },
        { header: 'Recipient', accessor: 'recipient' },
        { header: 'Date', accessor: 'date' },
        { header: 'Status', render: (n) => <span className={`badge badge--${STATUS_TONE[n.status] || 'muted'}`}>{n.status}</span> },
      ]}
      renderForm={(props) => <NoticeForm {...props} />}
      renderRowActions={(item, load) => (
        <button className="btn-icon" onClick={async () => { await legalNoticeLogic.remove(item.id); load(); }} title="Remove"><Icon icon="trash-2" /></button>
      )}
    />
  );
}
