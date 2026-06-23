import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRoles } from '@/hooks/useRoles.js';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { ACTIONS, MODULES, permKey } from '@/constants/permissions.js';
import { rbacLogic } from '@/logic/rbacLogic.js';
import { exportJson } from '@/utils/exportData.js';

// PermissionCenter — the master, read-only matrix: every (module × action) row
// against every role column. Instantly shows which role has which permission.
export default function PermissionCenter() {
  const { roles, loading } = useRoles();
  const nav = useNavigate();
  const [moduleFilter, setModuleFilter] = useState('all');
  const [search, setSearch] = useState('');

  // Resolve each role's effective permission set (incl. hierarchy inheritance).
  const resolvedByCode = useMemo(() => {
    const out = {};
    roles.forEach((r) => { out[r.code] = rbacLogic.resolve({ roleCode: r.code }, roles); });
    return out;
  }, [roles]);

  const rows = useMemo(() => {
    const mods = moduleFilter === 'all' ? MODULES : MODULES.filter((m) => m.key === moduleFilter);
    const list = [];
    mods.forEach((m) => ACTIONS.forEach((a) => {
      const label = `${m.label} ${a.label}`.toLowerCase();
      if (search && !label.includes(search.toLowerCase())) return;
      list.push({ module: m, action: a, perm: permKey(m.key, a.key) });
    }));
    return list;
  }, [moduleFilter, search]);

  const exportMatrix = () => {
    const data = roles.map((r) => ({
      role: r.name, code: r.code,
      permissions: [...resolvedByCode[r.code].permissions],
    }));
    exportJson('permission_center', data);
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="lock"
        title="Permission Center"
        subtitle="Master control panel — every permission across every role at a glance."
        actions={(
          <>
            <Button variant="ghost" icon="badge" onClick={() => nav('/admin/roles')}>Roles</Button>
            <Button variant="ghost" icon="download" onClick={exportMatrix}>Export</Button>
          </>
        )}
      />

      <div className="toolbar-row">
        <div className="datatable__search perm-center__search">
          <Icon name="search" size={15} />
          <input value={search} placeholder="Filter permission…" onChange={(e) => setSearch(e.target.value)} />
        </div>
        <select className="select perm-center__filter" value={moduleFilter} onChange={(e) => setModuleFilter(e.target.value)}>
          <option value="all">All modules</option>
          {MODULES.map((m) => <option key={m.key} value={m.key}>{m.label}</option>)}
        </select>
        <div className="flex-1" />
        <div className="legend"><span className="legend__dot legend__dot--on" /> Granted</div>
      </div>

      <Card bodyClass="card__body--flush">
        {loading ? <div className="loading-block"><span className="spinner" /> Loading…</div> : (
          <div className="matrix-scroll">
            <table className="matrix matrix--center">
              <thead>
                <tr>
                  <th className="matrix__corner">Module</th>
                  <th className="matrix__corner matrix__corner--2">Permission</th>
                  {roles.map((r) => (
                    <th key={r.code} className="matrix__rolecol" title={r.name}><span>{r.name}</span></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(({ module, action, perm }, i) => {
                  const prevSame = i > 0 && rows[i - 1].module.key === module.key;
                  return (
                    <tr key={perm}>
                      <th className="matrix__module matrix__module--center" scope="row">{prevSame ? '' : module.label}</th>
                      <td className="matrix__permname">{action.label}</td>
                      {roles.map((r) => {
                        const granted = resolvedByCode[r.code]?.can(perm);
                        return (
                          <td key={r.code} className="matrix__cell">
                            {granted ? <span className="matrix__yes matrix__yes--inherited"><Icon name="check" size={13} /></span> : <span className="matrix__no">–</span>}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
