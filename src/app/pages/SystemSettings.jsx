import React, { useState, useEffect, useCallback, useMemo } from 'react';
import PageHeader from '@/components/PageHeader.jsx';
import Card from '@/components/Card.jsx';
import { Input, Textarea, Select } from '@/components/Field.jsx';
import Icon from '@/components/Icon.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { settingsLogic } from '@/logic/settingsLogic.js';

function Toggle({ value, onChange, label }) {
  return (
    <label className="settings-toggle">
      <span>{label}</span>
      <input type="checkbox" checked={value} onChange={(e) => onChange(e.target.checked)} />
      <span className="settings-toggle__slider" />
    </label>
  );
}

const CATEGORIES = [
  {
    id: 'general', number: 1, label: 'General Settings', icon: 'gear',
    groups: [
      {
        title: 'Site Information', key: 'siteInfo',
        fields: [
          { type: 'text', label: 'Site Title', key: 'siteTitle', placeholder: 'LexAI' },
          { type: 'text', label: 'Tagline', key: 'tagline', placeholder: 'Litigation Assistant' },
          { type: 'text', label: 'Organization Name', key: 'orgName', placeholder: 'Your Law Firm' },
        ],
      },
      {
        title: 'Branding', key: 'branding',
        fields: [
          { type: 'file', label: 'Site Logo', key: 'siteLogo' },
          { type: 'file', label: 'Favicon', key: 'favicon' },
        ],
      },
      {
        title: 'Website URLs', key: 'urls',
        fields: [
          { type: 'url', label: 'Main Website URL', key: 'mainUrl', placeholder: 'https://example.com' },
          { type: 'url', label: 'Admin Panel URL', key: 'adminUrl', placeholder: 'https://admin.example.com' },
          { type: 'url', label: 'API Base URL', key: 'apiUrl', placeholder: 'https://api.example.com' },
          { type: 'url', label: 'Public Portal URL', key: 'portalUrl', placeholder: 'https://portal.example.com' },
        ],
      },
      {
        title: 'Contact Information', key: 'contact',
        fields: [
          { type: 'email', label: 'Admin Email', key: 'adminEmail', placeholder: 'admin@example.com' },
          { type: 'email', label: 'Support Email', key: 'supportEmail', placeholder: 'support@example.com' },
          { type: 'text', label: 'Phone Number', key: 'phone', placeholder: '+1-234-567-8900' },
          { type: 'text', label: 'Office Address', key: 'address' },
        ],
      },
      {
        title: 'User Registration', key: 'registration',
        fields: [
          { type: 'toggle', label: 'Allow Registration', key: 'allowRegistration', default: true },
          { type: 'toggle', label: 'Invite Only Registration', key: 'inviteOnly', default: false },
          { type: 'select', label: 'Default User Role', key: 'defaultRole', options: ['Admin', 'Advocate', 'Associate', 'Staff'], default: 'Advocate' },
          { type: 'toggle', label: 'Email Verification Required', key: 'emailVerification', default: true },
        ],
      },
      {
        title: 'Localization', key: 'localization',
        fields: [
          { type: 'select', label: 'Site Language', key: 'language', options: ['English', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati'], default: 'English' },
          { type: 'select', label: 'Timezone', key: 'timezone', options: ['Asia/Kolkata (UTC+5:30)', 'Asia/Dubai (UTC+4:00)', 'UTC', 'America/New_York'], default: 'Asia/Kolkata (UTC+5:30)' },
          { type: 'select', label: 'Date Format', key: 'dateFormat', options: ['DD/MM/YYYY', 'MM/DD/YYYY', 'YYYY-MM-DD'], default: 'DD/MM/YYYY' },
          { type: 'select', label: 'Time Format', key: 'timeFormat', options: ['12-hour', '24-hour'], default: '12-hour' },
          { type: 'select', label: 'Week Starts On', key: 'weekStart', options: ['Monday', 'Sunday', 'Saturday'], default: 'Monday' },
        ],
      },
    ],
  },
  {
    id: 'organization', number: 2, label: 'Organization Settings', icon: 'users',
    groups: [
      {
        title: 'Firm Details', key: 'firmDetails',
        fields: [
          { type: 'text', label: 'Firm Name', key: 'firmName', placeholder: 'Law Offices' },
          { type: 'text', label: 'Registration Number', key: 'regNumber' },
          { type: 'text', label: 'GST Number', key: 'gstNumber' },
          { type: 'text', label: 'Bar Council Registration', key: 'barCouncilReg' },
          { type: 'textarea', label: 'Firm Address', key: 'firmAddress' },
          { type: 'text', label: 'Contact Details', key: 'firmContact', placeholder: 'Phone | Email' },
        ],
      },
      {
        title: 'Letterhead', key: 'letterhead',
        fields: [
          { type: 'file', label: 'Letterhead Template', key: 'letterheadFile' },
        ],
      },
    ],
  },
  {
    id: 'user-management', number: 3, label: 'User Management Settings', icon: 'users',
    groups: [
      {
        title: 'Roles', key: 'roles',
        fields: [
          { type: 'tags', label: 'User Roles', key: 'userRoles', default: 'Super Admin, Admin, Advocate, Associate, Client, Staff' },
        ],
      },
      {
        title: 'Account Policies', key: 'accountPolicies',
        fields: [
          { type: 'toggle', label: 'Account Approval Workflow', key: 'approvalWorkflow', default: false },
          { type: 'select', label: 'Password Policy', key: 'passwordPolicy', options: ['Low (6+ chars)', 'Medium (8+ chars, mixed)', 'High (12+ chars, special)'], default: 'Medium (8+ chars, mixed)' },
          { type: 'number', label: 'Session Timeout (minutes)', key: 'sessionTimeout', default: 60 },
        ],
      },
    ],
  },
  {
    id: 'case-management', number: 4, label: 'Case Management Settings', icon: 'folder',
    groups: [
      {
        title: 'Case Configuration', key: 'caseConfig',
        fields: [
          { type: 'text', label: 'Case Number Format', key: 'caseNumberFormat', placeholder: 'LX-CASE-{YYYY}-{####}' },
          { type: 'text', label: 'Case Categories', key: 'caseCategories' },
          { type: 'select', label: 'Priority Levels', key: 'priorityLevels', options: ['Low, Medium, High, Urgent', 'Standard, High, Critical'], default: 'Low, Medium, High, Urgent' },
          { type: 'tags', label: 'Case Statuses', key: 'caseStatuses', default: 'Active, Disposed, Stayed, Appeal, Archived' },
          { type: 'toggle', label: 'Auto Case Assignment', key: 'autoAssignment', default: false },
        ],
      },
      {
        title: 'Limitation Reminder Rules', key: 'limitationRules',
        fields: [
          { type: 'number', label: 'Reminder Before (days)', key: 'limitationReminderDays', default: 30 },
          { type: 'toggle', label: 'Auto Docket Reminders', key: 'autoDocketReminders', default: true },
        ],
      },
    ],
  },
  {
    id: 'court-management', number: 5, label: 'Court Management Settings', icon: 'folder',
    groups: [
      {
        title: 'Court Configuration', key: 'courtConfig',
        fields: [
          { type: 'toggle', label: 'Supreme Court', key: 'courtSupreme', default: true },
          { type: 'toggle', label: 'High Courts', key: 'courtHigh', default: true },
          { type: 'toggle', label: 'District Courts', key: 'courtDistrict', default: true },
          { type: 'toggle', label: 'Tribunal Courts', key: 'courtTribunal', default: true },
          { type: 'toggle', label: 'Auto Sync Court Data', key: 'courtAutoSync', default: false },
        ],
      },
    ],
  },
  {
    id: 'document', number: 6, label: 'Document Settings', icon: 'file',
    groups: [
      {
        title: 'Document Configuration', key: 'docConfig',
        fields: [
          { type: 'text', label: 'Document Categories', key: 'docCategories', placeholder: 'Suits, Petitions, Orders, etc.' },
          { type: 'toggle', label: 'Auto Numbering', key: 'autoNumbering', default: true },
          { type: 'toggle', label: 'Digital Signature Enabled', key: 'digitalSignature', default: false },
          { type: 'select', label: 'Document Retention (months)', key: 'docRetention', options: ['12', '24', '36', '60', 'Permanent'], default: '36' },
          { type: 'toggle', label: 'Version Control', key: 'versionControl', default: true },
        ],
      },
      {
        title: 'Watermark', key: 'watermark',
        fields: [
          { type: 'toggle', label: 'Enable Watermark', key: 'watermarkEnabled', default: false },
          { type: 'text', label: 'Watermark Text', key: 'watermarkText', placeholder: 'CONFIDENTIAL' },
        ],
      },
    ],
  },
  {
    id: 'ai-assistant', number: 7, label: 'AI Assistant Settings', icon: 'bolt',
    groups: [
      {
        title: 'AI Provider', key: 'aiProvider',
        fields: [
          { type: 'select', label: 'Provider', key: 'aiProviderName', options: ['OpenAI', 'Anthropic', 'Gemini', 'OpenRouter'], default: 'OpenAI' },
          { type: 'password', label: 'API Key', key: 'aiApiKey' },
          { type: 'select', label: 'Default Model', key: 'aiModel', options: ['gpt-4o', 'gpt-4o-mini', 'claude-3-opus', 'claude-3-sonnet', 'gemini-pro'], default: 'gpt-4o' },
          { type: 'number', label: 'Temperature', key: 'aiTemperature', default: 0.7 },
          { type: 'number', label: 'Token Limit', key: 'aiTokenLimit', default: 4096 },
          { type: 'number', label: 'Usage Limit (calls/day)', key: 'aiUsageLimit', default: 1000 },
        ],
      },
    ],
  },
  {
    id: 'legal-research', number: 8, label: 'Legal Research Settings', icon: 'book',
    groups: [
      {
        title: 'Research Configuration', key: 'researchConfig',
        fields: [
          { type: 'select', label: 'Citation Format', key: 'citationFormat', options: ['Indian Citation', 'Bluebook', 'MLA', 'APA'], default: 'Indian Citation' },
          { type: 'toggle', label: 'Include Bare Acts', key: 'includeBareActs', default: true },
          { type: 'toggle', label: 'Include Case Law', key: 'includeCaseLaw', default: true },
          { type: 'number', label: 'Research History Retention (days)', key: 'researchRetention', default: 90 },
        ],
      },
    ],
  },
  {
    id: 'notification', number: 9, label: 'Notification Settings', icon: 'bell',
    groups: [
      {
        title: 'Notification Channels', key: 'notifChannels',
        fields: [
          { type: 'toggle', label: 'Email Notifications', key: 'notifEmail', default: true },
          { type: 'toggle', label: 'SMS Notifications', key: 'notifSms', default: false },
          { type: 'toggle', label: 'Push Notifications', key: 'notifPush', default: true },
        ],
      },
      {
        title: 'Alert Preferences', key: 'notifAlerts',
        fields: [
          { type: 'toggle', label: 'Hearing Reminders', key: 'notifHearingReminders', default: true },
          { type: 'toggle', label: 'Deadline Alerts', key: 'notifDeadlineAlerts', default: true },
          { type: 'number', label: 'Reminder Before (hours)', key: 'notifReminderHours', default: 24 },
        ],
      },
    ],
  },
  {
    id: 'calendar', number: 10, label: 'Calendar Settings', icon: 'calendar',
    groups: [
      {
        title: 'Calendar Configuration', key: 'calConfig',
        fields: [
          { type: 'select', label: 'Working Days', key: 'workingDays', options: ['Mon-Sat', 'Mon-Fri', 'Sun-Thu'], default: 'Mon-Sat' },
          { type: 'textarea', label: 'Court Holidays (one per line)', key: 'courtHolidays', placeholder: '2026-01-26 Republic Day\n2026-08-15 Independence Day' },
          { type: 'number', label: 'Default Reminder Interval (min)', key: 'reminderInterval', default: 30 },
          { type: 'toggle', label: 'Google Calendar Sync', key: 'googleCalSync', default: false },
        ],
      },
    ],
  },
  {
    id: 'billing', number: 11, label: 'Billing & Subscription', icon: 'database',
    groups: [
      {
        title: 'Subscription', key: 'subscription',
        fields: [
          { type: 'select', label: 'Plan', key: 'billingPlan', options: ['Free', 'Professional', 'Enterprise', 'Custom'], default: 'Free' },
          { type: 'text', label: 'Payment Gateway API Key', key: 'paymentGatewayKey' },
          { type: 'text', label: 'GST Number', key: 'billingGst' },
          { type: 'toggle', label: 'Auto Invoicing', key: 'autoInvoice', default: false },
        ],
      },
    ],
  },
  {
    id: 'security', number: 12, label: 'Security Settings', icon: 'lock',
    groups: [
      {
        title: 'Authentication', key: 'auth',
        fields: [
          { type: 'toggle', label: 'Password Login', key: 'authPassword', default: true },
          { type: 'toggle', label: 'OTP Login', key: 'authOtp', default: false },
          { type: 'toggle', label: 'Two Factor Authentication', key: 'auth2fa', default: false },
          { type: 'toggle', label: 'SSO Login', key: 'authSso', default: false },
        ],
      },
      {
        title: 'Data Security', key: 'dataSecurity',
        fields: [
          { type: 'toggle', label: 'Encryption at Rest', key: 'encryptAtRest', default: true },
          { type: 'toggle', label: 'Backup Encryption', key: 'encryptBackup', default: false },
          { type: 'toggle', label: 'Audit Logging', key: 'auditLogging', default: true },
        ],
      },
      {
        title: 'Access Control', key: 'accessControl',
        fields: [
          { type: 'toggle', label: 'IP Restrictions', key: 'ipRestrictions', default: false },
          { type: 'number', label: 'Max Login Attempts', key: 'maxLoginAttempts', default: 5 },
          { type: 'toggle', label: 'Login Attempt Protection', key: 'loginProtection', default: true },
        ],
      },
    ],
  },
  {
    id: 'backup', number: 13, label: 'Backup & Restore', icon: 'database',
    groups: [
      {
        title: 'Backup Schedule', key: 'backupSchedule',
        fields: [
          { type: 'select', label: 'Frequency', key: 'backupFrequency', options: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Manual'], default: 'Daily' },
          { type: 'number', label: 'Retention (backups)', key: 'backupRetention', default: 30 },
          { type: 'select', label: 'Storage Provider', key: 'backupProvider', options: ['Local Storage', 'Google Drive', 'Dropbox', 'Mega', 'Terabox'], default: 'Local Storage' },
          { type: 'toggle', label: 'Auto Backup', key: 'autoBackup', default: true },
          { type: 'toggle', label: 'Compression', key: 'backupCompression', default: true },
          { type: 'toggle', label: 'Encryption', key: 'backupEncryption', default: false },
        ],
      },
    ],
  },
  {
    id: 'integration', number: 14, label: 'Integration Settings', icon: 'plug',
    groups: [
      {
        title: 'Service Integrations', key: 'integrations',
        fields: [
          { type: 'toggle', label: 'Supabase', key: 'intSupabase', default: true },
          { type: 'toggle', label: 'PostgreSQL', key: 'intPostgres', default: false },
          { type: 'toggle', label: 'Firebase', key: 'intFirebase', default: false },
          { type: 'toggle', label: 'Railway', key: 'intRailway', default: false },
          { type: 'toggle', label: 'SMTP Email', key: 'intSmtp', default: true },
          { type: 'toggle', label: 'Twilio SMS', key: 'intTwilio', default: false },
          { type: 'toggle', label: 'WhatsApp API', key: 'intWhatsApp', default: false },
        ],
      },
    ],
  },
  {
    id: 'appearance', number: 15, label: 'Appearance Settings', icon: 'grid',
    groups: [
      {
        title: 'Theme', key: 'theme',
        fields: [
          { type: 'select', label: 'Theme', key: 'themeMode', options: ['Light', 'Dark', 'System'], default: 'System' },
          { type: 'text', label: 'Brand Color (hex)', key: 'brandColor', placeholder: '#1e3a5f' },
          { type: 'select', label: 'Sidebar Layout', key: 'sidebarLayout', options: ['Default', 'Collapsed', 'Icons Only'], default: 'Default' },
        ],
      },
    ],
  },
  {
    id: 'audit', number: 16, label: 'Audit & Logs', icon: 'history',
    groups: [
      {
        title: 'Logging', key: 'logging',
        fields: [
          { type: 'toggle', label: 'User Activity Logs', key: 'logUserActivity', default: true },
          { type: 'toggle', label: 'Login Logs', key: 'logLogin', default: true },
          { type: 'toggle', label: 'AI Usage Logs', key: 'logAiUsage', default: true },
          { type: 'toggle', label: 'Database Logs', key: 'logDatabase', default: false },
          { type: 'toggle', label: 'System Logs', key: 'logSystem', default: true },
          { type: 'number', label: 'Log Retention (days)', key: 'logRetention', default: 90 },
        ],
      },
    ],
  },
  {
    id: 'advanced', number: 17, label: 'Advanced Settings', icon: 'grid',
    groups: [
      {
        title: 'System', key: 'advancedSystem',
        fields: [
          { type: 'toggle', label: 'Feature Flags', key: 'featureFlags', default: false },
          { type: 'toggle', label: 'Cache Management', key: 'cacheManagement', default: true },
          { type: 'number', label: 'API Rate Limit (req/min)', key: 'apiRateLimit', default: 60 },
          { type: 'toggle', label: 'Developer Tools', key: 'devTools', default: false },
        ],
      },
    ],
  },
];

function flattenFields(categories) {
  const map = {};
  for (const cat of categories) {
    for (const group of cat.groups) {
      for (const field of group.fields) {
        map[field.key] = field.default ?? '';
      }
    }
  }
  return map;
}

const DEFAULTS = flattenFields(CATEGORIES);

function SettingsField({ field, value, onChange }) {
  switch (field.type) {
    case 'text':
    case 'email':
    case 'url':
    case 'password':
      return <Input type={field.type} value={value} placeholder={field.placeholder} onChange={(e) => onChange(field.key, e.target.value)} />;
    case 'number':
      return <Input type="number" value={value} placeholder={field.placeholder} onChange={(e) => onChange(field.key, Number(e.target.value))} />;
    case 'textarea':
      return <Textarea value={value} placeholder={field.placeholder} onChange={(e) => onChange(field.key, e.target.value)} />;
    case 'select':
      return <Select value={value} options={field.options.map((o) => ({ value: o, label: o }))} onChange={(e) => onChange(field.key, e.target.value)} />;
    case 'toggle':
      return <Toggle value={!!value} onChange={(v) => onChange(field.key, v)} label="" />;
    case 'tags':
      return <Input value={value} placeholder={field.placeholder || 'Comma-separated values'} onChange={(e) => onChange(field.key, e.target.value)} />;
    case 'file':
      return (
        <div className="settings-file-placeholder">
          <span className="muted fs-13">Click to upload</span>
        </div>
      );
    default:
      return <Input value={value} onChange={(e) => onChange(field.key, e.target.value)} />;
  }
}

export default function SystemSettings() {
  const toast = useToast();
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [settings, setSettings] = useState(DEFAULTS);
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await settingsLogic.loadSettings();
      if (res.ok && res.data && Object.keys(res.data).length > 0) {
        setSettings({ ...DEFAULTS, ...res.data });
      }
      setLoading(false);
    })();
  }, []);

  const handleChange = useCallback((key, value) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty((prev) => ({ ...prev, [key]: true }));
  }, []);

  const handleSave = useCallback(async () => {
    const res = await settingsLogic.saveSettings(settings);
    if (res.ok) {
      setDirty({});
      toast.push('Settings saved successfully.', 'success');
    } else {
      toast.push(res.error, 'error');
    }
  }, [settings, toast]);

  const handleReset = useCallback(async () => {
    if (!window.confirm('Reset all settings to defaults?')) return;
    setSettings(DEFAULTS);
    setDirty({});
    await settingsLogic.deleteSettings();
    toast.push('Settings reset to defaults.', 'info');
  }, [toast]);

  const filteredCategories = useMemo(() => {
    if (!search.trim()) return CATEGORIES;
    const q = search.toLowerCase();
    return CATEGORIES.filter((cat) =>
      cat.label.toLowerCase().includes(q) ||
      cat.groups.some((g) =>
        g.title.toLowerCase().includes(q) ||
        g.fields.some((f) => f.label.toLowerCase().includes(q))
      )
    );
  }, [search]);

  const activeData = CATEGORIES.find((c) => c.id === activeCategory);
  const hasDirty = Object.keys(dirty).length > 0;

  if (loading) return <div className="fade-in system-settings__loading"><div className="spinner" /></div>;

  return (
    <div className="fade-in">
      <PageHeader icon="gear" title="System Settings" subtitle="Configure all aspects of the LexAI platform." />

      <div className="settings-layout">
        <aside className="settings-sidebar">
          <div className="settings-search">
            <Icon name="search" size={15} />
            <input value={search} placeholder="Search settings…" onChange={(e) => setSearch(e.target.value)} />
          </div>
          <nav className="settings-nav">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                className={`settings-nav__item ${activeCategory === cat.id ? 'active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <span className="settings-nav__num">{String(cat.number).padStart(2, '0')}</span>
                <Icon name={cat.icon} size={16} />
                <span>{cat.label}</span>
              </button>
            ))}
            {filteredCategories.length === 0 && (
              <div className="muted system-settings__no-matches">No matching categories.</div>
            )}
          </nav>
        </aside>

        <div className="settings-content">
          {activeData ? (
            <>
              <div className="settings-content__header">
                <h2>{activeData.label}</h2>
                <div className="settings-content__actions">
                  <button className="btn btn--ghost btn--sm" onClick={handleReset}>Reset All</button>
                  <button className="btn btn--primary btn--sm" onClick={handleSave} disabled={!hasDirty}>
                    <Icon name="save" size={14} /> {hasDirty ? 'Save Changes' : 'Saved'}
                  </button>
                </div>
              </div>
              {activeData.groups.map((group) => (
                <Card key={group.key} title={group.title} className="settings-card">
                  {group.fields.map((field) => (
                    <div key={field.key} className="settings-field-row">
                      <label className="settings-field-label">{field.label}</label>
                      <div className="settings-field-control">
                        <SettingsField field={field} value={settings[field.key]} onChange={handleChange} />
                        {dirty[field.key] && <span className="settings-dirty-dot" title="Unsaved change" />}
                      </div>
                    </div>
                  ))}
                </Card>
              ))}
              <div className="system-settings__footer">
                <button className="btn btn--ghost" onClick={handleReset}>Reset All</button>
                <button className="btn btn--primary" onClick={handleSave} disabled={!hasDirty}>
                  <Icon name="save" size={15} /> {hasDirty ? 'Save Changes' : 'Saved'}
                </button>
              </div>
            </>
          ) : (
            <div className="empty-state system-settings__empty-state">
              <Icon name="gear" size={48} />
              <h3>Select a category</h3>
              <p>Choose a settings category from the sidebar.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
