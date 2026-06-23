import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Icon from '@/components/Icon.jsx';
import { useToast } from '@/data-layer/ToastContext.jsx';
import { settingsLogic } from '@/logic/settingsLogic.js';

/* ── helpers ─────────────────────────────────────────────── */
function Toggle({ value, onChange }) {
  return (
    <label className="gs-toggle">
      <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} />
      <span className="gs-toggle__track" />
    </label>
  );
}

function Checkbox({ checked, onChange, label }) {
  return (
    <label className="gs-checkbox">
      <span className={`gs-checkbox__box${checked ? ' gs-checkbox__box--on' : ''}`} onClick={() => onChange(!checked)}>
        {checked && <Icon name="check" size={11} />}
      </span>
      {label && <span className="gs-checkbox__label">{label}</span>}
    </label>
  );
}

function RadioGroup({ options, value, onChange }) {
  return (
    <div className="gs-radio-group">
      {options.map((opt) => (
        <label key={opt.value} className="gs-radio">
          <span className={`gs-radio__dot${value === opt.value ? ' gs-radio__dot--on' : ''}`} onClick={() => onChange(opt.value)} />
          <span className="gs-radio__label">{opt.label}</span>
        </label>
      ))}
    </div>
  );
}

function IconInput({ icon, value, placeholder, type = 'text', onChange }) {
  return (
    <div className="gs-icon-input">
      {icon && <span className="gs-icon-input__icon"><Icon name={icon} size={15} /></span>}
      <input
        className="gs-icon-input__field"
        type={type}
        value={value || ''}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

/* ── category definitions ────────────────────────────────── */
const CATEGORIES = [
  {
    id: 'general', number: 1, label: 'General Settings', icon: 'gear',
    groups: [
      {
        title: 'General Settings',
        subtitle: 'Manage your application general settings and preferences.',
        key: 'siteInfo',
        tocItems: ['Site Title', 'Tagline', 'WordPress Address (URL)', 'Site Address (URL)', 'E-mail Address', 'Membership', 'New User Default Role', 'Site Language', 'Timezone', 'Date Format', 'Time Format', 'Week Starts On', 'Save Changes', 'Changelog'],
        fields: [
          { type: 'icon-text', label: 'Site Title', key: 'siteTitle', placeholder: 'LexAI', icon: 'layers', description: '' },
          { type: 'icon-text', label: 'Tagline', key: 'tagline', placeholder: 'AI-Powered Legal Assistant for Modern Law Practice', icon: 'badge', description: 'A short description about your platform' },
          { type: 'icon-url', label: 'WordPress Address (URL)', key: 'mainUrl', placeholder: 'https://lexai.app', icon: 'link', description: 'The URL of your WordPress installation' },
          { type: 'icon-url', label: 'Site Address (URL)', key: 'portalUrl', placeholder: 'https://lexai.app', icon: 'link', description: 'The URL of your website (if different from above)' },
          { type: 'icon-email', label: 'E-mail Address', key: 'adminEmail', placeholder: 'admin@lexai.app', icon: 'bell', description: 'This address is used for admin notifications' },
          { type: 'checkbox', label: 'Membership', key: 'allowRegistration', checkboxLabel: 'Anyone can register', description: 'Anyone can register or only invited users', default: true },
          { type: 'select', label: 'New User Default Role', key: 'defaultRole', options: ['Admin', 'Advocate', 'Associate', 'Staff', 'Client'], default: 'Client', description: 'Role assigned to newly registered users' },
          { type: 'select', label: 'Site Language', key: 'language', options: ['English (United States)', 'English (UK)', 'Hindi', 'Bengali', 'Tamil', 'Telugu', 'Marathi', 'Gujarati'], default: 'English (United States)', description: 'Select the default language for your site' },
          {
            type: 'timezone', label: 'Timezone', key: 'timezone',
            options: ['Asia/Kolkata', 'Asia/Dubai (UTC+4:00)', 'UTC', 'America/New_York', 'Europe/London'],
            default: 'Asia/Kolkata',
            description: 'Choose a city in the same timezone as you',
          },
          {
            type: 'radio-date', label: 'Date Format', key: 'dateFormat',
            options: [
              { value: 'june23', label: 'June 23, 2026' },
              { value: 'iso', label: '2026-06-23' },
              { value: 'dmy', label: '23/06/2026' },
              { value: 'mdy', label: '06/23/2026' },
              { value: 'custom', label: 'Custom:' },
            ],
            default: 'june23',
            description: 'Choose how dates should be displayed',
          },
          {
            type: 'radio-time', label: 'Time Format', key: 'timeFormat',
            options: [
              { value: '12h', label: '9:52 am' },
              { value: '24h', label: '9:52 AM' },
            ],
            default: '12h',
            description: 'Choose how times should be displayed',
          },
          { type: 'select', label: 'Week Starts On', key: 'weekStart', options: ['Monday', 'Sunday', 'Saturday'], default: 'Monday', description: '' },
        ],
      },
    ],
  },
  {
    id: 'organization', number: 2, label: 'Organization Settings', icon: 'users',
    groups: [
      {
        title: 'Organization Settings',
        subtitle: 'Configure your firm details and official information.',
        key: 'firmDetails',
        tocItems: ['Firm Name', 'Registration Number', 'GST Number', 'Bar Council Registration', 'Firm Address', 'Contact Details', 'Letterhead Template'],
        fields: [
          { type: 'icon-text', label: 'Firm Name', key: 'firmName', placeholder: 'Law Offices', icon: 'layers', description: '' },
          { type: 'icon-text', label: 'Registration Number', key: 'regNumber', placeholder: '', icon: 'doc', description: '' },
          { type: 'icon-text', label: 'GST Number', key: 'gstNumber', placeholder: '', icon: 'doc', description: '' },
          { type: 'icon-text', label: 'Bar Council Registration', key: 'barCouncilReg', placeholder: '', icon: 'badge', description: '' },
          { type: 'textarea', label: 'Firm Address', key: 'firmAddress', placeholder: 'Enter firm address', description: '' },
          { type: 'icon-text', label: 'Contact Details', key: 'firmContact', placeholder: 'Phone | Email', icon: 'bell', description: '' },
          { type: 'file', label: 'Letterhead Template', key: 'letterheadFile', description: '' },
        ],
      },
    ],
  },
  {
    id: 'user-management', number: 3, label: 'User Management', icon: 'users',
    groups: [
      {
        title: 'User Management Settings',
        subtitle: 'Configure roles, policies, and account settings.',
        key: 'userMgmt',
        tocItems: ['User Roles', 'Account Approval Workflow', 'Password Policy', 'Session Timeout'],
        fields: [
          { type: 'tags', label: 'User Roles', key: 'userRoles', placeholder: 'Comma-separated roles', default: 'Super Admin, Admin, Advocate, Associate, Client, Staff', description: '' },
          { type: 'toggle', label: 'Account Approval Workflow', key: 'approvalWorkflow', default: false, description: 'Require admin approval for new accounts' },
          { type: 'select', label: 'Password Policy', key: 'passwordPolicy', options: ['Low (6+ chars)', 'Medium (8+ chars, mixed)', 'High (12+ chars, special)'], default: 'Medium (8+ chars, mixed)', description: '' },
          { type: 'number', label: 'Session Timeout (minutes)', key: 'sessionTimeout', default: 60, description: '' },
        ],
      },
    ],
  },
  {
    id: 'case-management', number: 4, label: 'Case Management', icon: 'folder',
    groups: [
      {
        title: 'Case Management Settings',
        subtitle: 'Configure how cases are numbered, categorized, and managed.',
        key: 'caseMgmt',
        tocItems: ['Case Number Format', 'Case Categories', 'Priority Levels', 'Case Statuses', 'Auto Case Assignment', 'Limitation Reminder Days', 'Auto Docket Reminders'],
        fields: [
          { type: 'icon-text', label: 'Case Number Format', key: 'caseNumberFormat', placeholder: 'LX-CASE-{YYYY}-{####}', icon: 'doc', description: '' },
          { type: 'icon-text', label: 'Case Categories', key: 'caseCategories', placeholder: 'Civil, Criminal, Family, etc.', icon: 'folder', description: '' },
          { type: 'select', label: 'Priority Levels', key: 'priorityLevels', options: ['Low, Medium, High, Urgent', 'Standard, High, Critical'], default: 'Low, Medium, High, Urgent', description: '' },
          { type: 'tags', label: 'Case Statuses', key: 'caseStatuses', default: 'Active, Disposed, Stayed, Appeal, Archived', description: '' },
          { type: 'toggle', label: 'Auto Case Assignment', key: 'autoAssignment', default: false, description: 'Automatically assign cases to available advocates' },
          { type: 'number', label: 'Reminder Before (days)', key: 'limitationReminderDays', default: 30, description: '' },
          { type: 'toggle', label: 'Auto Docket Reminders', key: 'autoDocketReminders', default: true, description: '' },
        ],
      },
    ],
  },
  {
    id: 'court-management', number: 5, label: 'Court Management', icon: 'folder',
    groups: [
      {
        title: 'Court Management Settings',
        subtitle: 'Enable and configure court types and sync options.',
        key: 'courtMgmt',
        tocItems: ['Supreme Court', 'High Courts', 'District Courts', 'Tribunal Courts', 'Auto Sync Court Data'],
        fields: [
          { type: 'toggle', label: 'Supreme Court', key: 'courtSupreme', default: true, description: '' },
          { type: 'toggle', label: 'High Courts', key: 'courtHigh', default: true, description: '' },
          { type: 'toggle', label: 'District Courts', key: 'courtDistrict', default: true, description: '' },
          { type: 'toggle', label: 'Tribunal Courts', key: 'courtTribunal', default: true, description: '' },
          { type: 'toggle', label: 'Auto Sync Court Data', key: 'courtAutoSync', default: false, description: 'Sync court dates automatically from ECourts' },
        ],
      },
    ],
  },
  {
    id: 'document', number: 6, label: 'Document Settings', icon: 'file',
    groups: [
      {
        title: 'Document Settings',
        subtitle: 'Configure document categories, numbering, and retention policies.',
        key: 'docSettings',
        tocItems: ['Document Categories', 'Auto Numbering', 'Digital Signature Enabled', 'Document Retention', 'Version Control', 'Enable Watermark', 'Watermark Text'],
        fields: [
          { type: 'icon-text', label: 'Document Categories', key: 'docCategories', placeholder: 'Suits, Petitions, Orders, etc.', icon: 'folder', description: '' },
          { type: 'toggle', label: 'Auto Numbering', key: 'autoNumbering', default: true, description: '' },
          { type: 'toggle', label: 'Digital Signature Enabled', key: 'digitalSignature', default: false, description: '' },
          { type: 'select', label: 'Document Retention (months)', key: 'docRetention', options: ['12', '24', '36', '60', 'Permanent'], default: '36', description: '' },
          { type: 'toggle', label: 'Version Control', key: 'versionControl', default: true, description: '' },
          { type: 'toggle', label: 'Enable Watermark', key: 'watermarkEnabled', default: false, description: '' },
          { type: 'icon-text', label: 'Watermark Text', key: 'watermarkText', placeholder: 'CONFIDENTIAL', icon: 'pen', description: '' },
        ],
      },
    ],
  },
  {
    id: 'ai-assistant', number: 7, label: 'AI Assistant', icon: 'bolt',
    groups: [
      {
        title: 'AI Assistant Settings',
        subtitle: 'Configure AI provider, model, and usage limits.',
        key: 'aiSettings',
        tocItems: ['Provider', 'API Key', 'Default Model', 'Temperature', 'Token Limit', 'Usage Limit'],
        fields: [
          { type: 'select', label: 'Provider', key: 'aiProviderName', options: ['OpenAI', 'Anthropic', 'Gemini', 'OpenRouter'], default: 'OpenAI', description: '' },
          { type: 'password', label: 'API Key', key: 'aiApiKey', placeholder: '••••••••••••••••', description: 'Your AI provider API key' },
          { type: 'select', label: 'Default Model', key: 'aiModel', options: ['gpt-4o', 'gpt-4o-mini', 'claude-3-opus', 'claude-3-sonnet', 'gemini-pro'], default: 'gpt-4o', description: '' },
          { type: 'number', label: 'Temperature', key: 'aiTemperature', default: 0.7, description: '' },
          { type: 'number', label: 'Token Limit', key: 'aiTokenLimit', default: 4096, description: '' },
          { type: 'number', label: 'Usage Limit (calls/day)', key: 'aiUsageLimit', default: 1000, description: '' },
        ],
      },
    ],
  },
  {
    id: 'legal-research', number: 8, label: 'Legal Research', icon: 'book',
    groups: [
      {
        title: 'Legal Research Settings',
        subtitle: 'Configure citation formats and research history preferences.',
        key: 'researchSettings',
        tocItems: ['Citation Format', 'Include Bare Acts', 'Include Case Law', 'Research History Retention'],
        fields: [
          { type: 'select', label: 'Citation Format', key: 'citationFormat', options: ['Indian Citation', 'Bluebook', 'MLA', 'APA'], default: 'Indian Citation', description: '' },
          { type: 'toggle', label: 'Include Bare Acts', key: 'includeBareActs', default: true, description: '' },
          { type: 'toggle', label: 'Include Case Law', key: 'includeCaseLaw', default: true, description: '' },
          { type: 'number', label: 'Research History Retention (days)', key: 'researchRetention', default: 90, description: '' },
        ],
      },
    ],
  },
  {
    id: 'notification', number: 9, label: 'Notification Settings', icon: 'bell',
    groups: [
      {
        title: 'Notification Settings',
        subtitle: 'Configure notification channels and alert preferences.',
        key: 'notifSettings',
        tocItems: ['Email Notifications', 'SMS Notifications', 'Push Notifications', 'Hearing Reminders', 'Deadline Alerts', 'Reminder Before (hours)'],
        fields: [
          { type: 'toggle', label: 'Email Notifications', key: 'notifEmail', default: true, description: '' },
          { type: 'toggle', label: 'SMS Notifications', key: 'notifSms', default: false, description: '' },
          { type: 'toggle', label: 'Push Notifications', key: 'notifPush', default: true, description: '' },
          { type: 'toggle', label: 'Hearing Reminders', key: 'notifHearingReminders', default: true, description: '' },
          { type: 'toggle', label: 'Deadline Alerts', key: 'notifDeadlineAlerts', default: true, description: '' },
          { type: 'number', label: 'Reminder Before (hours)', key: 'notifReminderHours', default: 24, description: '' },
        ],
      },
    ],
  },
  {
    id: 'calendar', number: 10, label: 'Calendar Settings', icon: 'calendar',
    groups: [
      {
        title: 'Calendar Settings',
        subtitle: 'Set working days, holidays, and calendar sync preferences.',
        key: 'calSettings',
        tocItems: ['Working Days', 'Court Holidays', 'Default Reminder Interval', 'Google Calendar Sync'],
        fields: [
          { type: 'select', label: 'Working Days', key: 'workingDays', options: ['Mon-Sat', 'Mon-Fri', 'Sun-Thu'], default: 'Mon-Sat', description: '' },
          { type: 'textarea', label: 'Court Holidays (one per line)', key: 'courtHolidays', placeholder: '2026-01-26 Republic Day\n2026-08-15 Independence Day', description: '' },
          { type: 'number', label: 'Default Reminder Interval (min)', key: 'reminderInterval', default: 30, description: '' },
          { type: 'toggle', label: 'Google Calendar Sync', key: 'googleCalSync', default: false, description: '' },
        ],
      },
    ],
  },
  {
    id: 'billing', number: 11, label: 'Billing & Subscription', icon: 'database',
    groups: [
      {
        title: 'Billing & Subscription',
        subtitle: 'Manage your subscription plan and billing configuration.',
        key: 'billingSettings',
        tocItems: ['Plan', 'Payment Gateway API Key', 'GST Number', 'Auto Invoicing'],
        fields: [
          { type: 'select', label: 'Plan', key: 'billingPlan', options: ['Free', 'Professional', 'Enterprise', 'Custom'], default: 'Free', description: '' },
          { type: 'icon-text', label: 'Payment Gateway API Key', key: 'paymentGatewayKey', placeholder: '', icon: 'lock', description: '' },
          { type: 'icon-text', label: 'GST Number', key: 'billingGst', placeholder: '', icon: 'doc', description: '' },
          { type: 'toggle', label: 'Auto Invoicing', key: 'autoInvoice', default: false, description: '' },
        ],
      },
    ],
  },
  {
    id: 'security', number: 12, label: 'Security Settings', icon: 'lock',
    groups: [
      {
        title: 'Security Settings',
        subtitle: 'Configure authentication methods and data protection policies.',
        key: 'secSettings',
        tocItems: ['Password Login', 'OTP Login', 'Two Factor Authentication', 'SSO Login', 'Encryption at Rest', 'Backup Encryption', 'Audit Logging', 'IP Restrictions', 'Max Login Attempts', 'Login Attempt Protection'],
        fields: [
          { type: 'toggle', label: 'Password Login', key: 'authPassword', default: true, description: '' },
          { type: 'toggle', label: 'OTP Login', key: 'authOtp', default: false, description: '' },
          { type: 'toggle', label: 'Two Factor Authentication', key: 'auth2fa', default: false, description: '' },
          { type: 'toggle', label: 'SSO Login', key: 'authSso', default: false, description: '' },
          { type: 'toggle', label: 'Encryption at Rest', key: 'encryptAtRest', default: true, description: '' },
          { type: 'toggle', label: 'Backup Encryption', key: 'encryptBackup', default: false, description: '' },
          { type: 'toggle', label: 'Audit Logging', key: 'auditLogging', default: true, description: '' },
          { type: 'toggle', label: 'IP Restrictions', key: 'ipRestrictions', default: false, description: '' },
          { type: 'number', label: 'Max Login Attempts', key: 'maxLoginAttempts', default: 5, description: '' },
          { type: 'toggle', label: 'Login Attempt Protection', key: 'loginProtection', default: true, description: '' },
        ],
      },
    ],
  },
  {
    id: 'backup', number: 13, label: 'Backup & Restore', icon: 'database',
    groups: [
      {
        title: 'Backup & Restore',
        subtitle: 'Configure automatic backup schedule, storage, and retention.',
        key: 'backupSettings',
        tocItems: ['Frequency', 'Retention', 'Storage Provider', 'Auto Backup', 'Compression', 'Encryption'],
        fields: [
          { type: 'select', label: 'Frequency', key: 'backupFrequency', options: ['Hourly', 'Daily', 'Weekly', 'Monthly', 'Manual'], default: 'Daily', description: '' },
          { type: 'number', label: 'Retention (backups)', key: 'backupRetention', default: 30, description: '' },
          { type: 'select', label: 'Storage Provider', key: 'backupProvider', options: ['Local Storage', 'Google Drive', 'Dropbox', 'Mega', 'Terabox'], default: 'Local Storage', description: '' },
          { type: 'toggle', label: 'Auto Backup', key: 'autoBackup', default: true, description: '' },
          { type: 'toggle', label: 'Compression', key: 'backupCompression', default: true, description: '' },
          { type: 'toggle', label: 'Encryption', key: 'backupEncryption', default: false, description: '' },
        ],
      },
    ],
  },
  {
    id: 'integration', number: 14, label: 'Integration Settings', icon: 'plug',
    groups: [
      {
        title: 'Integration Settings',
        subtitle: 'Enable and configure third-party service integrations.',
        key: 'integrationSettings',
        tocItems: ['Supabase', 'PostgreSQL', 'Firebase', 'Railway', 'SMTP Email', 'Twilio SMS', 'WhatsApp API'],
        fields: [
          { type: 'toggle', label: 'Supabase', key: 'intSupabase', default: true, description: '' },
          { type: 'toggle', label: 'PostgreSQL', key: 'intPostgres', default: false, description: '' },
          { type: 'toggle', label: 'Firebase', key: 'intFirebase', default: false, description: '' },
          { type: 'toggle', label: 'Railway', key: 'intRailway', default: false, description: '' },
          { type: 'toggle', label: 'SMTP Email', key: 'intSmtp', default: true, description: '' },
          { type: 'toggle', label: 'Twilio SMS', key: 'intTwilio', default: false, description: '' },
          { type: 'toggle', label: 'WhatsApp API', key: 'intWhatsApp', default: false, description: '' },
        ],
      },
    ],
  },
  {
    id: 'appearance', number: 15, label: 'Appearance Settings', icon: 'grid',
    groups: [
      {
        title: 'Appearance Settings',
        subtitle: 'Customize theme, branding colors, and sidebar layout.',
        key: 'appearanceSettings',
        tocItems: ['Theme', 'Brand Color', 'Sidebar Layout'],
        fields: [
          { type: 'select', label: 'Theme', key: 'themeMode', options: ['Light', 'Dark', 'System'], default: 'System', description: '' },
          { type: 'icon-text', label: 'Brand Color (hex)', key: 'brandColor', placeholder: '#1e3a5f', icon: 'grid', description: '' },
          { type: 'select', label: 'Sidebar Layout', key: 'sidebarLayout', options: ['Default', 'Collapsed', 'Icons Only'], default: 'Default', description: '' },
        ],
      },
    ],
  },
  {
    id: 'audit', number: 16, label: 'Audit & Logs', icon: 'history',
    groups: [
      {
        title: 'Audit & Logs',
        subtitle: 'Configure what activities are logged and for how long.',
        key: 'auditSettings',
        tocItems: ['User Activity Logs', 'Login Logs', 'AI Usage Logs', 'Database Logs', 'System Logs', 'Log Retention'],
        fields: [
          { type: 'toggle', label: 'User Activity Logs', key: 'logUserActivity', default: true, description: '' },
          { type: 'toggle', label: 'Login Logs', key: 'logLogin', default: true, description: '' },
          { type: 'toggle', label: 'AI Usage Logs', key: 'logAiUsage', default: true, description: '' },
          { type: 'toggle', label: 'Database Logs', key: 'logDatabase', default: false, description: '' },
          { type: 'toggle', label: 'System Logs', key: 'logSystem', default: true, description: '' },
          { type: 'number', label: 'Log Retention (days)', key: 'logRetention', default: 90, description: '' },
        ],
      },
    ],
  },
  {
    id: 'advanced', number: 17, label: 'Advanced Settings', icon: 'grid',
    groups: [
      {
        title: 'Advanced Settings',
        subtitle: 'Feature flags, caching, and developer options.',
        key: 'advancedSettings',
        tocItems: ['Feature Flags', 'Cache Management', 'API Rate Limit', 'Developer Tools'],
        fields: [
          { type: 'toggle', label: 'Feature Flags', key: 'featureFlags', default: false, description: '' },
          { type: 'toggle', label: 'Cache Management', key: 'cacheManagement', default: true, description: '' },
          { type: 'number', label: 'API Rate Limit (req/min)', key: 'apiRateLimit', default: 60, description: '' },
          { type: 'toggle', label: 'Developer Tools', key: 'devTools', default: false, description: '' },
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

/* ── Field renderer ─────────────────────────────────────── */
function SettingsField({ field, value, onChange, settings }) {
  switch (field.type) {
    case 'icon-text':
      return <IconInput icon={field.icon} value={value} placeholder={field.placeholder} onChange={(v) => onChange(field.key, v)} />;
    case 'icon-url':
      return <IconInput icon={field.icon} value={value} placeholder={field.placeholder} type="url" onChange={(v) => onChange(field.key, v)} />;
    case 'icon-email':
      return <IconInput icon={field.icon} value={value} placeholder={field.placeholder} type="email" onChange={(v) => onChange(field.key, v)} />;
    case 'password':
      return <IconInput icon="lock" value={value} placeholder={field.placeholder} type="password" onChange={(v) => onChange(field.key, v)} />;
    case 'number':
      return (
        <input
          className="gs-plain-input"
          type="number"
          value={value || ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, Number(e.target.value))}
        />
      );
    case 'textarea':
      return (
        <textarea
          className="gs-plain-textarea"
          value={value || ''}
          placeholder={field.placeholder}
          rows={4}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
    case 'select':
      return (
        <div className="gs-select-wrap">
          <select
            className="gs-select"
            value={value || field.default || field.options[0]}
            onChange={(e) => onChange(field.key, e.target.value)}
          >
            {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <Icon name="chevron" size={14} />
        </div>
      );
    case 'toggle':
      return <Toggle value={value} onChange={(v) => onChange(field.key, v)} />;
    case 'checkbox':
      return (
        <Checkbox
          checked={!!value}
          onChange={(v) => onChange(field.key, v)}
          label={field.checkboxLabel}
        />
      );
    case 'tags':
      return (
        <input
          className="gs-plain-input"
          value={value || ''}
          placeholder={field.placeholder || 'Comma-separated values'}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
    case 'file':
      return (
        <div className="gs-file-upload">
          <Icon name="upload" size={14} />
          <span>Click to upload</span>
        </div>
      );
    case 'timezone': {
      const now = new Date();
      const utcStr = `UTC time is ${String(now.getDate()).padStart(2,'0')}-${String(now.getMonth()+1).padStart(2,'0')}-${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')}`;
      return (
        <div className="gs-timezone-row">
          <div className="gs-select-wrap">
            <select className="gs-select" value={value || field.default} onChange={(e) => onChange(field.key, e.target.value)}>
              {field.options.map((o) => <option key={o} value={o}>{o}</option>)}
            </select>
            <Icon name="chevron" size={14} />
          </div>
          <span className="gs-timezone-utc">{utcStr}</span>
        </div>
      );
    }
    case 'radio-date': {
      const customFormat = settings['customDateFormat'] || 'F j, Y';
      const example = 'June 23, 2026';
      return (
        <div className="gs-radio-group gs-radio-group--date">
          {field.options.map((opt) => (
            <label key={opt.value} className="gs-radio">
              <span
                className={`gs-radio__dot${value === opt.value ? ' gs-radio__dot--on' : ''}`}
                onClick={() => onChange(field.key, opt.value)}
              />
              <span className="gs-radio__label">
                {opt.label}
                {opt.value === 'custom' && (
                  <span className="gs-date-custom-row">
                    <input
                      className="gs-date-custom-input"
                      value={customFormat}
                      onChange={(e) => onChange('customDateFormat', e.target.value)}
                    />
                    <span className="gs-date-example">Example: {example}</span>
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      );
    }
    case 'radio-time':
      return (
        <RadioGroup
          options={field.options}
          value={value || field.default}
          onChange={(v) => onChange(field.key, v)}
        />
      );
    default:
      return (
        <input
          className="gs-plain-input"
          value={value || ''}
          placeholder={field.placeholder}
          onChange={(e) => onChange(field.key, e.target.value)}
        />
      );
  }
}

/* ── Main component ─────────────────────────────────────── */
export default function SystemSettings() {
  const toast = useToast();
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [settings, setSettings] = useState(DEFAULTS);
  const [search, setSearch] = useState('');
  const [dirty, setDirty] = useState({});
  const [loading, setLoading] = useState(true);
  const contentRef = useRef(null);

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
  const activeGroup = activeData?.groups[0];
  const hasDirty = Object.keys(dirty).length > 0;

  if (loading) {
    return <div className="fade-in system-settings__loading"><div className="spinner" /></div>;
  }

  return (
    <div className="fade-in gs-page">
      {/* Top bar */}
      <div className="gs-topbar">
        <div className="gs-topbar__left">
          <div className="gs-topbar__icon"><Icon name="gear" size={20} /></div>
          <div>
            <h1 className="gs-topbar__title">Settings</h1>
          </div>
        </div>
        <div className="gs-topbar__right">
          <div className="gs-topbar__search">
            <Icon name="search" size={15} />
            <input
              value={search}
              placeholder="Search anything..."
              onChange={(e) => setSearch(e.target.value)}
            />
            <span className="gs-topbar__kbd">Ctrl + K</span>
          </div>
        </div>
      </div>

      <div className="gs-layout">
        {/* Left nav sidebar */}
        <aside className="gs-sidenav">
          <div className="gs-sidenav__section-label">MAIN</div>
          <nav className="gs-sidenav__nav">
            {filteredCategories.map((cat) => (
              <button
                key={cat.id}
                className={`gs-sidenav__item${activeCategory === cat.id ? ' gs-sidenav__item--active' : ''}`}
                onClick={() => setActiveCategory(cat.id)}
              >
                <Icon name={cat.icon} size={16} />
                <span>{cat.label}</span>
                {activeCategory === cat.id && <span className="gs-sidenav__chevron"><Icon name="chevron" size={12} /></span>}
              </button>
            ))}
            {filteredCategories.length === 0 && (
              <div className="gs-sidenav__empty">No matching categories.</div>
            )}
          </nav>
        </aside>

        {/* Main content */}
        <div className="gs-content" ref={contentRef}>
          {activeGroup ? (
            <>
              {/* Section header */}
              <div className="gs-content__header">
                <div>
                  <h2 className="gs-content__title">{activeGroup.title}</h2>
                  {activeGroup.subtitle && (
                    <p className="gs-content__subtitle">{activeGroup.subtitle}</p>
                  )}
                </div>
                <button className="gs-save-btn" onClick={handleSave} disabled={!hasDirty}>
                  <Icon name="save" size={15} />
                  Save Changes
                </button>
              </div>

              {/* Settings form panel */}
              <div className="gs-panel">
                <div className="gs-panel__accent" />
                <div className="gs-panel__inner">
                  <div className="gs-panel__header">
                    <Icon name="gear" size={15} />
                    <span>{activeGroup.title}</span>
                    <button className="gs-save-btn gs-save-btn--sm" onClick={handleSave} disabled={!hasDirty}>
                      <Icon name="save" size={13} />
                      Save Changes
                    </button>
                  </div>

                  <div className="gs-fields">
                    {activeGroup.fields.map((field) => (
                      <div key={field.key} className="gs-field-row">
                        <div className="gs-field-label-col">
                          <span className="gs-field-label">{field.label}</span>
                          {field.description && (
                            <span className="gs-field-desc">{field.description}</span>
                          )}
                        </div>
                        <div className="gs-field-control-col">
                          <SettingsField
                            field={field}
                            value={settings[field.key]}
                            onChange={handleChange}
                            settings={settings}
                          />
                          {dirty[field.key] && <span className="settings-dirty-dot" title="Unsaved change" />}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Footer actions */}
              <div className="gs-footer">
                <button className="btn btn--ghost btn--sm" onClick={handleReset}>Reset All</button>
                <button className="gs-save-btn" onClick={handleSave} disabled={!hasDirty}>
                  <Icon name="save" size={14} />
                  {hasDirty ? 'Save Changes' : 'Saved'}
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

        {/* Right TOC panel */}
        {activeGroup && (
          <aside className="gs-toc">
            <div className="gs-toc__title">In this section</div>
            <ul className="gs-toc__list">
              {activeGroup.tocItems.map((item, i) => (
                <li key={i} className={`gs-toc__item${i === 0 ? ' gs-toc__item--active' : ''}`}>
                  {i === 0 && <span className="gs-toc__dot" />}
                  {item}
                </li>
              ))}
            </ul>
            <div className="gs-toc__help">
              <div className="gs-toc__help-title">Need Help?</div>
              <div className="gs-toc__help-sub">Learn more about {activeGroup.title.toLowerCase()}</div>
              <button className="gs-toc__help-btn">
                View Documentation
                <Icon name="arrow" size={12} />
              </button>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}