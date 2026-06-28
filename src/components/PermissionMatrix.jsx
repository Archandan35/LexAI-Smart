import { ACTIONS, MODULES, permKey, PERM_SOURCE } from '@/constants/permissions.js';
import PermissionCheckbox from './PermissionCheckbox.jsx';
import Icon from './Icon.jsx';

// PermissionMatrix — modules (rows) × actions (columns) editable grid.
// - `value`: Set/array of active `module.action` keys.
// - `onToggle(perm, nextChecked)`: called when a cell changes.
// - `sourceOf(perm)`: optional provenance fn for colour-coding (Permission Manager).
// - `readOnly`: render checkmarks without inputs.
// - `modules`: optional subset of module keys to display.
export default function PermissionMatrix({
  value, onToggle, sourceOf, readOnly = false, disabled = false, modules,
}) {
  const active = value instanceof Set ? value : new Set(value || []);
  const rows = modules ? MODULES.filter((m) => modules.includes(m.key)) : MODULES;
  const [search, setSearch] = useState('');
  const visible = rows.filter((m) => m.label.toLowerCase().includes(search.toLowerCase()));

  const rowState = (modKey) => {
    const total = ACTIONS.length;
    const on = ACTIONS.filter((a) => active.has(permKey(modKey, a.key))).length;
    return { all: on === total, none: on === 0, on, total };
  };

  const toggleRow = (modKey) => {
    if (readOnly || disabled) return;
    const { all } = rowState(modKey);
    ACTIONS.forEach((a) => {
      const perm = permKey(modKey, a.key);
      const has = active.has(perm);
      if (all && has) onToggle?.(perm, false);
      if (!all && !has) onToggle?.(perm, true);
    });
  };

  return (
    <div className="matrix-wrap">
      <div className="matrix-toolbar">
        <div className="datatable__search">
          <Icon name="search" size={15} />
          <input value={search} placeholder="Filter modules…" onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>
      <div className="matrix-scroll">
        <table className="matrix">
          <thead>
            <tr>
              <th className="matrix__corner">Module</th>
              {ACTIONS.map((a) => (
                <th key={a.key} className="matrix__action" title={a.label}><span>{a.label}</span></th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visible.map((m) => {
              const rs = rowState(m.key);
              return (
                <tr key={m.key}>
                  <th className="matrix__module" scope="row">
                    <span className="matrix__module-icon"><Icon name={m.icon} size={15} /></span>
                    <span>
                      <span className="matrix__module-name">{m.label}</span>
                      {m.admin && <span className="badge badge--navy" style={{ marginLeft: 6, fontSize: 9, padding: '1px 6px' }}>Admin</span>}
                      <span className="matrix__module-count">{rs.on}/{rs.total}</span>
                    </span>
                    {!readOnly && (
                      <button type="button" className="matrix__rowtoggle" onClick={() => toggleRow(m.key)} title={rs.all ? 'Clear row' : 'Select all'}>
                        {rs.all ? '−' : '✓'}
                      </button>
                    )}
                  </th>
                  {ACTIONS.map((a) => {
                    const perm = permKey(m.key, a.key);
                    const checked = active.has(perm);
                    const source = sourceOf ? sourceOf(perm) : (checked ? PERM_SOURCE.INHERITED : PERM_SOURCE.NONE);
                    if (readOnly) {
                      return (
                        <td key={a.key} className="matrix__cell">
                          {checked ? <span className={`matrix__yes matrix__yes--${source}`}><Icon name="check" size={14} /></span> : <span className="matrix__no">–</span>}
                        </td>
                      );
                    }
                    return (
                      <td key={a.key} className="matrix__cell">
                        <PermissionCheckbox
                          checked={checked}
                          disabled={disabled}
                          source={source}
                          title={`${m.label} · ${a.label}`}
                          onChange={(next) => onToggle?.(perm, next)}
                        />
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
