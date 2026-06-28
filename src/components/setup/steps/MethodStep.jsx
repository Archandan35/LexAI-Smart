
const METHODS = [
  { id: 'simple', icon: '⚡', title: 'Simple Setup', desc: 'Connect using a Project URL and API Key. Ideal for Supabase and compatible providers.', badge: 'Recommended', difficulty: 'Easy', time: '~2 min' },
  { id: 'advanced', icon: '⚙️', title: 'Advanced Setup', desc: 'Connect directly using database credentials for PostgreSQL, MySQL, SQL Server, and self-hosted databases.', difficulty: 'Medium', time: '~5 min' },
  { id: 'sql', icon: '📋', title: 'Generate SQL', desc: 'Generate installation SQL scripts for manual execution in your database SQL editor.', difficulty: 'Easy', time: '~1 min' },
  { id: 'restore', icon: '💾', title: 'Restore Backup', desc: 'Restore from .udb, .sql, or .json files. Perfect for backups, migrations, or moving between providers.', difficulty: 'Easy', time: '~3 min' },
];

export default function MethodStep({ onSelect, back }) {
  return (
    <div>
      <p className="wizard-desc" style={{ marginBottom: 20 }}>
        Choose how you want to connect your database. Simple Setup is the fastest path for Supabase users.
      </p>
      <div className="wizard-info-grid" style={{ gap: 14 }}>
        {METHODS.map((m) => (
          <button key={m.id} onClick={() => onSelect(m.id)}
            tabIndex={0}
            className="wizard-method-card"
            aria-label={`${m.title}: ${m.desc}`}
          >
            {m.badge && (
              <span className="wizard-method-card__badge">{m.badge}</span>
            )}
            <span className="wizard-method-card__icon">{m.icon}</span>
            <span className="wizard-method-card__title">{m.title}</span>
            <span className="wizard-method-card__desc">{m.desc}</span>
            <div className="wizard-method-card__meta">
              <span>{m.difficulty}</span>
              <span>{m.time}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
