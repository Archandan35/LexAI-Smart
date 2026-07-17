import LibraryPage from '@/components/LibraryPage.jsx';
import { actLogic } from '@/logic/actLogic.js';

export default function ActLibrary() {
  return (
    <LibraryPage
      title="Acts Library"
      icon="book"
      logic={actLogic
      searchFields={['title']}
      searchPlaceholder="Search acts..."
      emptyText="No acts found."
      statsConfig={[
        { key: 'totalActs', label: 'Acts' },
        { key: 'totalSections', label: 'Sections' },
        { key: 'totalAmendments', label: 'Amendments' },
        { key: 'lastUpdated', label: 'Last Updated' },
      ]}
      columns={[
        { header: 'Title', accessor: 'title' },
        { header: 'Type', accessor: 'act_type', badge: 'info' },
        { header: 'Jurisdiction', accessor: 'jurisdiction' },
        { header: 'Sections', accessor: 'sections_count' },
        { header: 'Amendments', accessor: 'amendments_count' },
      ]}
    />
  );
}

