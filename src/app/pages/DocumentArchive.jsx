import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

const ARCHIVED_FILES = [
  { name: 'Settlement_Agreement_v2.pdf', date: '10 Jun 2026', icon: 'file' },
  { name: 'Notice_ABC_Corp_Final.docx', date: '5 Jun 2026', icon: 'doc' },
  { name: 'Case_Summary_2024.pdf', date: '28 May 2026', icon: 'file' },
  { name: 'Evidence_List_Annexures.pdf', date: '20 May 2026', icon: 'layers' },
  { name: 'Order_Copy_SC_2023.pdf', date: '15 May 2026', icon: 'notes' },
  { name: 'Written_Statement_Draft.tex', date: '10 May 2026', icon: 'doc' },
];

export default function DocumentArchive() {
  return (
    <div className="fade-in">
      <PageHeader
        icon="folder"
        title="Document Archive"
        subtitle="Browse archived documents and drafts."
      />

      <div className="datatable__search">
        <Icon name="search" size={15} />
        <input placeholder="Search archived documents…" />
      </div>

      <Card title="Archive">
        <div className="grid-3">
          {ARCHIVED_FILES.map((f, i) => (
            <div className="folder" key={i}>
              <div className="folder__icon"><Icon name={f.icon} size={18} /></div>
              <div>{f.name}</div>
              <div className="folder__count">{f.date}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
