import { useState, useEffect } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Icon from '@/components/Icon.jsx';
import { Input } from '@/components/Field.jsx';
import { documentsRepository } from '@/data-layer/repositories/documentsRepository.js';

export default function DocumentArchive() {
  const [docs, setDocs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    documentsRepository
      .getAll()
      .then((all) => {
        const archived = (Array.isArray(all) ? all : []).filter(
          (d) => d.archived || d.status === 'Archived'
        );
        setDocs(archived);
      })
      .catch(() => console.warn('DocumentArchive: failed to load documents'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = docs.filter(
    (d) =>
      !search ||
      (d.name || d.title || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <PageHeader icon="folder" title="Document Archive" subtitle="Browse archived documents and drafts." />
      <Card title="Archive">
        <div className="search-row">
          <Input
            className="search-row__input"
            placeholder="Search archived files..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {loading ? (
          <p className="loading-text">Loading...</p>
        ) : filtered.length === 0 ? (
          <div className="empty-state">
            <Icon name="folder" size={24} />
            <p>No archived files.</p>
          </div>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Category</th>
                <th>Archived Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((d) => (
                <tr key={d.id}>
                  <td>{d.name || d.title || 'Untitled'}</td>
                  <td>
                    <span className="badge badge--info">{d.category || '-'}</span>
                  </td>
                  <td>{d.updatedAt || d.updated_at || d.archivedAt || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}

