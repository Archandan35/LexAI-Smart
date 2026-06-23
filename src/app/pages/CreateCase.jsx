import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { Field, Input, Textarea, Select } from '@/components/Field.jsx';

const CASE_TYPES = ['Civil', 'Criminal', 'Family', 'Constitutional', 'Tax'];

export default function CreateCase() {
  const [form, setForm] = useState({
    title: '',
    type: 'Civil',
    court: '',
    caseNumber: '',
    filingDate: '',
    description: '',
  });

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <div className="fade-in">
      <PageHeader
        icon="plus"
        title="Create Case"
        subtitle="Register a new case in the system."
      />

      <Card title="Case Information">
        <div className="input-row">
          <Field label="Case Title">
            <Input value={form.title} onChange={set('title')} placeholder="e.g. ABC Corp. v. State of Maharashtra" />
          </Field>
          <Field label="Case Type">
            <Select value={form.type} onChange={set('type')}>
              {CASE_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </Field>
        </div>

        <div className="input-row">
          <Field label="Court">
            <Input value={form.court} onChange={set('court')} placeholder="e.g. Civil Judge (Sr. Dvn.)" />
          </Field>
          <Field label="Case Number">
            <Input value={form.caseNumber} onChange={set('caseNumber')} placeholder="e.g. O.S. No. 123/2026" />
          </Field>
        </div>

        <div className="input-row">
          <Field label="Filing Date">
            <Input type="date" value={form.filingDate} onChange={set('filingDate')} />
          </Field>
        </div>

        <Field label="Description">
          <Textarea value={form.description} onChange={set('description')} placeholder="Brief description of the case…" />
        </Field>

        <div className="toolbar-row">
          <div className="card__spacer" />
          <button className="btn btn--primary">
            <Icon name="plus" size={16} /> Create Case
          </button>
        </div>
      </Card>
    </div>
  );
}
