import React, { useState } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';

const CATEGORIES = [
  'All Documents', 'Suits', 'Written Statements', 'Petitions',
  'Applications', 'Affidavits', 'Evidence', 'Orders', 'Judgments',
];

const DOCUMENTS = [
  { title: 'Civil Suit Plaint', category: 'Suits', date: '12 Jun 2026', pages: 8 },
  { title: 'Written Statement (Defence)', category: 'Written Statements', date: '10 Jun 2026', pages: 12 },
  { title: 'Bail Petition', category: 'Petitions', date: '8 Jun 2026', pages: 5 },
  { title: 'IA for Interim Relief', category: 'Applications', date: '5 Jun 2026', pages: 3 },
  { title: 'Affidavit of Service', category: 'Affidavits', date: '3 Jun 2026', pages: 2 },
  { title: 'Exhibit List Annexures', category: 'Evidence', date: '1 Jun 2026', pages: 15 },
  { title: 'Order Dated 28 May 2026', category: 'Orders', date: '28 May 2026', pages: 4 },
  { title: 'Final Judgment', category: 'Judgments', date: '20 May 2026', pages: 22 },
];

export default function CaseDocuments() {
  const [active, setActive] = useState('All Documents');

  const filtered = active === 'All Documents'
    ? DOCUMENTS
    : DOCUMENTS.filter((d) => d.category === active);

  return (
    <div className="fade-in">
      <PageHeader
        icon="folder"
        title="Case Documents"
        subtitle="Browse case documents organized by category."
      />

      <div className="docmgr">
        <aside className="docmgr__folders">
          <div className="docmgr__folders-head">
            <span>Categories</span>
          </div>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`docmgr__folder ${active === cat ? 'active' : ''}`}
              onClick={() => setActive(cat)}
            >
              <Icon name="folder" size={15} />
              <span>{cat}</span>
              <span className="docmgr__count">
                {cat === 'All Documents' ? DOCUMENTS.length : DOCUMENTS.filter((d) => d.category === cat).length}
              </span>
            </button>
          ))}
        </aside>

        <div className="docmgr__main">
          <Card title={active} sub={`${filtered.length} document(s)`}>
            <div className="docgrid">
              {filtered.map((d, i) => (
                <div className="doccard" key={i}>
                  <div className="doccard__icon">
                    <Icon name="file" size={20} />
                  </div>
                  <div className="doccard__title">{d.title}</div>
                  <div className="doccard__meta">{d.category} &middot; {d.pages} pages</div>
                  <div className="doccard__date">{d.date}</div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
