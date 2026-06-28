import CrudListPage from '@/components/CrudListPage.jsx';
import Field from '@/components/Field.jsx';
import { Input } from '@/components/Field.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { contactLogic } from '@/logic/contactLogic.js';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { useContactTypes } from '@/hooks/useContactTypes.js';

function ContactForm({ load, setShowForm }) {
  const toast = useToast();
  const { types: contactTypes } = useContactTypes();
  const [form, setForm] = useState({ name: '', type: contactTypes[0] || 'Advocate', phone: '', email: '', organization: '' });
  const add = async () => {
    if (!form.name?.trim()) { toast.error('Name is required.'); return; }
    const r = await contactLogic.create(form);
    if (r && !r.error) { toast.success('Contact added.'); setShowForm(false); setForm({ name: '', type: 'Advocate', phone: '', email: '', organization: '' }); load(); }
    else toast.error(r?.error || 'Failed to add contact.');
  };
  return (
    <div className="card card--inset">
      <Field label="Name"><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
      <Field label="Type"><select className="input" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>{contactTypes.map((t) => <option key={t} value={t}>{t}</option>)}</select></Field>
      <Field label="Phone"><Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} /></Field>
      <Field label="Email"><Input value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
      <Field label="Organization"><Input value={form.organization} onChange={(e) => setForm({ ...form, organization: e.target.value })} /></Field>
      <Button onClick={add}>Save Contact</Button>
    </div>
  );
}

export default function Contacts() {
  const toast = useToast();
  return (
    <CrudListPage
      title="Contacts"
      icon="book"
      logic={contactLogic}
      searchFields={['name']}
      emptyText="No contacts yet."
      addLabel="Add Contact"
      statsConfig={[
        { key: 'totalContacts', label: 'Total Contacts' },
        { key: 'advocates', label: 'Advocates' },
        { key: 'judges', label: 'Judges' },
        { key: 'courtStaff', label: 'Court Staff' },
      ]}
      columns={[
        { header: 'Name', accessor: 'name' },
        { header: 'Type', render: (c) => <span className="badge badge--info">{c.type}</span> },
        { header: 'Phone', accessor: 'phone' },
        { header: 'Email', accessor: 'email' },
        { header: 'Organization', accessor: 'organization' },
      ]}
      renderForm={(props) => <ContactForm {...props} />}
      renderRowActions={(item, load) => (
        <button className="btn-icon" onClick={async () => { await contactLogic.remove(item.id); toast.success('Contact removed.'); load(); }} title="Remove"><Icon icon="trash-2" /></button>
      )}
    />
  );
}
