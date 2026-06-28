import LibraryPage from '@/components/LibraryPage.jsx';
import { templateLogic } from '@/logic/templateLogic.js';

export default function TemplatesLibrary() {
  return (
    <LibraryPage
      title="Templates Library"
      icon="file-text"
      logic={templateLogic}
      searchFields={['name', 'category']}
      searchPlaceholder="Search templates..."
      emptyText="No templates yet."
      statsConfig={[
        { key: 'total', label: 'Total Templates' },
        { key: 'active', label: 'Active' },
        { key: 'categories', label: 'Categories' },
        { key: 'lastUpdated', label: 'Last Updated' },
      ]}
      columns={[
        { header: 'Name', accessor: 'name' },
        { header: 'Category', accessor: 'category', badge: 'info' },
        { header: 'Status', accessor: 'is_active', render: (v) => <span className={`badge badge--${v !== false ? 'success' : 'muted'}`}>{v !== false ? 'Active' : 'Inactive'}</span> },
        { header: 'Last Updated', accessor: 'last_updated' },
      ]}
    />
  );
}

