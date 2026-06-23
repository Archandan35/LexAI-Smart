import React from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import Badge from '@/components/Badge.jsx';

const VERSIONS = [
  { doc: 'Plaint_v3.docx', version: '3', author: 'Adv. Sharma', date: '22 Jun 2026', changes: 'Updated prayer clause', status: 'Current' },
  { doc: 'Plaint_v2.docx', version: '2', author: 'Adv. Sharma', date: '18 Jun 2026', changes: 'Added defendant details', status: 'Archived' },
  { doc: 'Plaint_v1.docx', version: '1', author: 'Adv. Sharma', date: '15 Jun 2026', changes: 'Initial draft', status: 'Archived' },
];

export default function VersionControl() {
  return (
    <div className="fade-in">
      <PageHeader
        icon="history"
        title="Version Control"
        subtitle="Track revisions and document versions."
      />

      <Card title="Version History">
        <div className="table-scroll">
          <table className="table">
            <thead>
              <tr>
                <th>Document</th>
                <th>Version</th>
                <th>Author</th>
                <th>Date</th>
                <th>Changes</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {VERSIONS.map((v, i) => (
                <tr key={i}>
                  <td>{v.doc}</td>
                  <td>{v.version}</td>
                  <td>{v.author}</td>
                  <td>{v.date}</td>
                  <td>{v.changes}</td>
                  <td><Badge tone={v.status === 'Current' ? 'green' : 'grey'}>{v.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
