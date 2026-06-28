import LibraryPage from '@/components/LibraryPage.jsx';
import { promptLogic } from '@/logic/promptLogic.js';

export default function PromptLibrary() {
  return (
    <LibraryPage
      title="Prompt Library"
      icon="terminal"
      logic={promptLogic}
      searchFields={['name', 'category']}
      searchPlaceholder="Search prompts..."
      emptyText="No prompts yet."
      renderStats={(stats) => (
        <div className="stats-row">
          <div className="stat-card"><span className="stat-card__value">{stats.total || 0}</span><span className="stat-card__label">Total Prompts</span></div>
          {Object.entries(stats.categories || {}).slice(0, 4).map(([cat, count]) => (
            <div key={cat} className="stat-card"><span className="stat-card__value">{count}</span><span className="stat-card__label">{cat}</span></div>
          ))}
        </div>
      )}
      columns={[
        { header: 'Prompt Name', accessor: 'name' },
        { header: 'Category', accessor: 'category', badge: 'info' },
        { header: 'Last Used', accessor: 'last_used' },
        { header: 'Usage', accessor: 'usage_count' },
      ]}
    />
  );
}
