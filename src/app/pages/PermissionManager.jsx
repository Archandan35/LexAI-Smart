import { useRoles } from '@/hooks/useRoles.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { usePermissions } from '@/hooks/usePermissions.js';
import { permissionService } from '@/services/permissionService.js';
import { userLogic } from '@/logic/userLogic.js';
import { rbacLogic } from '@/logic/rbacLogic.js';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import PermissionMatrix from '@/components/PermissionMatrix.jsx';
import { Field, Select } from '@/components/Field.jsx';
import { ACTIONS, MODULES, permKey } from '@/constants/permissions.js';
import { PERM_SOURCE } from '@/constants/permissions.js';
import { exportJson } from '@/utils/exportData.js';

const TABS = ['view', 'role', 'user'];

export default function PermissionManager() {
  const { roles, refresh } = useRoles();
  const { user: actor, loadRoles, roles: liveRoles } = useAuth();
  const { can } = usePermissions();
  const toast = useToast();

  const [mode, setMode] = useState('role');
  const [roleCode, setRoleCode] = useState('');
  const [userId, setUserId] = useState('');
  const [users, setUsers] = useState([]);
  const [rolePerms, setRolePerms] = useState(new Set());
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [target, setTarget] = useState(null);
  const [moduleFilter, setModuleFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { userLogic.list().then(setUsers); }, []);

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

  const selectedRole = roles.find((r) => r.code === roleCode);
  useEffect(() => {
    setRolePerms(new Set(selectedRole?.permissions || []));
    setDirty(false);
  }, [roleCode]);

  const toggleRolePerm = (perm, next) => {
    setRolePerms((prev) => { const s = new Set(prev); if (next) s.add(perm); else s.delete(perm); return s; });
    setDirty(true);
  };
  const saveRole = async () => {
    setSaving(true);
    await permissionService.setRolePermissions(selectedRole.id, [...rolePerms]);
    setSaving(false); setDirty(false);
    toast.push('Role permissions saved.', 'success');
    await refresh(); await loadRoles();
  };

  useEffect(() => {
    const u = users.find((x) => x.id === userId) || null;
    setTarget(u);
  }, [userId, users]);

  const userResolved = useMemo(() => (target ? rbacLogic.resolve(target, liveRoles) : null), [target, liveRoles]);

  const toggleUserPerm = async (perm, next) => {
    if (!target) return;
    const source = userResolved.sourceOf(perm);
    if (next) {
      await permissionService.grantUserPermission(target.id, perm);
    } else if (source === PERM_SOURCE.INHERITED) {
      await permissionService.denyUserPermission(target.id, perm);
    } else {
      await permissionService.clearUserOverride(target.id, perm);
    }
    const fresh = await userLogic.list();
    setUsers(fresh);
    setTarget(fresh.find((x) => x.id === target.id) || null);
  };

  const clearOverride = async (perm) => {
    await permissionService.clearUserOverride(target.id, perm);
    const fresh = await userLogic.list();
    setUsers(fresh); setTarget(fresh.find((x) => x.id === target.id) || null);
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="lock"
        title="Permissions"
        subtitle="View the full permission matrix, assign permissions by role, or override them per individual user."
      />

      <div className="seg mb-18">
        {TABS.map((t) => (
          <button key={t} className={`seg__btn ${mode === t ? 'active' : ''}`} onClick={() => setMode(t)}>
            <Icon name={t === 'view' ? 'eye' : t === 'role' ? 'badge' : 'users'} size={14} />
            {t === 'view' ? 'View Matrix' : t === 'role' ? 'Role-based' : 'User-specific'}
          </button>
        ))}
      </div>

      {mode === 'view' ? (
        <>
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
            <Button variant="ghost" icon="download" onClick={exportMatrix}>Export</Button>
          </div>

          <Card bodyClass="card__body--flush">
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
          </Card>
        </>
      ) : mode === 'role' ? (
        <>
          <Card>
            <div className="perm-mgr__form-row">
              <Field label="Select role" hint="Edit the permissions granted to every user with this role.">
                <Select value={roleCode} onChange={(e) => setRoleCode(e.target.value)} className="perm-mgr__min-w">
                  <option value="">Select role…</option>
                  {roles.map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
                </Select>
              </Field>
              <div className="flex-1" />
              {selectedRole && can('permissions.edit') && !selectedRole.all && (
                <Button variant="primary" icon="save" disabled={!dirty} loading={saving} onClick={saveRole}>Save changes</Button>
              )}
            </div>
          </Card>

          {selectedRole && (
            <Card title={`${selectedRole.name} — permissions`} bodyClass="card__body--flush" className="mt-16">
              {selectedRole.all
                ? <div className="card__body"><div className="alert alert--success"><Icon name="shield" size={15} />Super Admin holds all permissions; nothing to edit.</div></div>
                : <PermissionMatrix value={rolePerms} onToggle={toggleRolePerm} readOnly={!can('permissions.edit')} />}
            </Card>
          )}
        </>
      ) : (
        <>
          <Card>
            <Field label="Select user" hint="Permissions inherited from the user's role, plus any custom overrides.">
              <Select value={userId} onChange={(e) => setUserId(e.target.value)} className="perm-mgr__user-min-w">
                <option value="">Select user…</option>
                {users.map((u) => <option key={u.id} value={u.id}>{u.name} — {u.roleName}</option>)}
              </Select>
            </Field>
            {target && (
              <div className="legend-row">
                <div className="legend"><span className="legend__dot legend__dot--inherited" /> Inherited from role</div>
                <div className="legend"><span className="legend__dot legend__dot--custom" /> Custom grant</div>
                <div className="legend"><span className="legend__dot legend__dot--denied" /> Explicitly denied</div>
              </div>
            )}
          </Card>

          {target && userResolved && (
            <>
              {(target.grants?.length || target.denies?.length) ? (
                <Card title="Active overrides" className="mt-16">
                  <div className="chips">
                    {(target.grants || []).map((p) => (
                      <span key={`g${p}`} className="chip chip--custom">+ {p} <button onClick={() => clearOverride(p)}>×</button></span>
                    ))}
                    {(target.denies || []).map((p) => (
                      <span key={`d${p}`} className="chip chip--denied">− {p} <button onClick={() => clearOverride(p)}>×</button></span>
                    ))}
                  </div>
                </Card>
              ) : null}

              <Card title={`${target.name} — effective permissions`} sub="Tick to grant; untick an inherited permission to deny it." bodyClass="card__body--flush" className="mt-16">
                <PermissionMatrix
                  value={userResolved.permissions}
                  sourceOf={userResolved.sourceOf}
                  onToggle={toggleUserPerm}
                  readOnly={!can('permissions.edit')}
                />
              </Card>
            </>
          )}
        </>
      )}
    </div>
  );
}
