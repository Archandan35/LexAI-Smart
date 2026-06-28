import { userService } from '@/services/userService.js';
import { settingsLogic } from '@/logic/settingsLogic.js';
import { useAuth } from '@/data-layer/AuthContext.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import Button from '@/components/Button.jsx';
import Icon from '@/components/Icon.jsx';
import { Field, Select } from '@/components/Field.jsx';
import { formatDate } from '@/utils/format.js';

export default function SecuritySettings() {
  const { user: actor } = useAuth();
  const toast = useToast();
  const [hasSuperAdmin, setHasSuperAdmin] = useState(false);
  const [superAdminUser, setSuperAdminUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const [passwordMinLength, setPasswordMinLength] = useState('8');
  const [sessionTimeout, setSessionTimeout] = useState('60');

  useEffect(() => {
    const init = async () => {
      try {
        const users = await userService.list();
        const admin = (Array.isArray(users) ? users : []).find((u) => u.roleCode === 'Admin');
        if (admin) {
          setHasSuperAdmin(true);
          setSuperAdminUser(admin);
        } else {
          setHasSuperAdmin(false);
          setSuperAdminUser(null);
        }
      } catch (err) {
        console.error('Error verifying admin:', err);
      }

      try {
        const res = await settingsLogic.loadSettings();
        if (res.ok && res.data) {
          setPasswordMinLength(res.data.passwordMinLength || '8');
          setSessionTimeout(res.data.sessionTimeout || '60');
        }
      } catch (err) {
        console.error('Error loading settings:', err);
      }

      setLoading(false);
    };
    init();
  }, []);

  const saveSettings = async () => {
    try {
      const res = await settingsLogic.saveSettings({ passwordMinLength, sessionTimeout });
      if (res.ok) {
        toast.push('Security settings updated.', 'success');
      } else {
        toast.push(res.error || 'Failed to save settings.', 'error');
      }
    } catch {
      toast.push('Failed to save settings.', 'error');
    }
  };

  return (
    <div className="fade-in">
      <PageHeader
        icon="lock"
        title="Security Settings"
        subtitle="Manage authentication policies, session limits, and system bootstrapping status."
      />

      <div className="grid-2 dm-section">
        <Card title="Admin Status" sub="First administrator account details.">
          {loading ? (
            <div className="loading-block"><span className="spinner" /> Querying status…</div>
          ) : hasSuperAdmin ? (
            <div>
              <div className="alert alert--success alert--mb">
                <Icon name="shield" size={16} />
                <span>System is bootstrapped. A Super Administrator account is configured.</span>
              </div>
              <div className="kv"><span>Username</span><b>{superAdminUser.username || '—'}</b></div>
              <div className="kv"><span>Email</span><span>{superAdminUser.email || '—'}</span></div>
              <div className="kv"><span>Created at</span><span>{formatDate(superAdminUser.createdAt)}</span></div>
            </div>
          ) : (
            <div>
              <div className="alert alert--warn alert--mb">
                <Icon name="alert" size={16} />
                <span>System is NOT bootstrapped. No Super Administrator exists in the database.</span>
              </div>
              <p className="auth-sub auth-sub--sm">
                You must run the bootstrap wizard to create your first admin.
              </p>
              <Button variant="primary" icon="shield" onClick={() => window.location.href = '/bootstrap-admin'}>Create Super Admin</Button>
            </div>
          )}
        </Card>

        <Card title="Authentication Policy" sub="Configure password rules.">
          <Field label="Minimum Password Length">
            <Select value={passwordMinLength} onChange={(e) => setPasswordMinLength(e.target.value)}>
              <option value="6">6 characters</option>
              <option value="8">8 characters (recommended)</option>
              <option value="12">12 characters</option>
              <option value="16">16 characters</option>
            </Select>
          </Field>
          <Field label="Session Expiry (minutes)">
            <Select value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)}>
              <option value="15">15 minutes</option>
              <option value="30">30 minutes</option>
              <option value="60">1 hour (default)</option>
              <option value="480">8 hours</option>
            </Select>
          </Field>
          <div className="dm-toolbar-mt">
            <Button variant="primary" icon="save" onClick={saveSettings}>Save Policy</Button>
          </div>
        </Card>
      </div>
    </div>
  );
}
