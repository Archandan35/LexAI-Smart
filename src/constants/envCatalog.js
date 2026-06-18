// Catalog of known environment variables, grouped by category, with a `secret`
// flag that drives masking in the UI. This is the *shape* of configuration the
// app understands; actual values live only in environment variables (and any
// admin-managed overrides recorded in the `envVars` collection for demo use).
// No real secret values are hardcoded here.

export const ENV_CATEGORIES = [
  {
    key: 'Database',
    vars: [
      { name: 'DATABASE_URL', secret: true },
      { name: 'DATABASE_PROVIDER', secret: false },
      { name: 'SUPABASE_URL', secret: false },
      { name: 'SUPABASE_ANON_KEY', secret: true },
      { name: 'SUPABASE_SERVICE_ROLE_KEY', secret: true },
    ],
  },
  {
    key: 'Storage',
    vars: [
      { name: 'STORAGE_PROVIDER', secret: false },
      { name: 'GOOGLE_DRIVE_CLIENT_ID', secret: false },
      { name: 'GOOGLE_DRIVE_CLIENT_SECRET', secret: true },
      { name: 'GOOGLE_DRIVE_REFRESH_TOKEN', secret: true },
      { name: 'MEGA_USERNAME', secret: false },
      { name: 'MEGA_PASSWORD', secret: true },
      { name: 'TERABOX_ACCESS_TOKEN', secret: true },
      { name: 'STORAGE_ROOT_FOLDER', secret: false },
    ],
  },
  {
    key: 'Authentication',
    vars: [
      { name: 'JWT_SECRET', secret: true },
      { name: 'SESSION_SECRET', secret: true },
      { name: 'AUTH_PROVIDER', secret: false },
      { name: 'GOOGLE_AUTH_CLIENT_ID', secret: false },
      { name: 'GOOGLE_AUTH_CLIENT_SECRET', secret: true },
    ],
  },
  {
    key: 'Email',
    vars: [
      { name: 'SMTP_HOST', secret: false },
      { name: 'SMTP_PORT', secret: false },
      { name: 'SMTP_USER', secret: false },
      { name: 'SMTP_PASSWORD', secret: true },
      { name: 'EMAIL_FROM', secret: false },
    ],
  },
  {
    key: 'AI Providers',
    vars: [
      { name: 'OPENAI_API_KEY', secret: true },
      { name: 'ANTHROPIC_API_KEY', secret: true },
      { name: 'GEMINI_API_KEY', secret: true },
      { name: 'MISTRAL_API_KEY', secret: true },
      { name: 'OLLAMA_BASE_URL', secret: false },
    ],
  },
  {
    key: 'OCR Services',
    vars: [
      { name: 'OCR_PROVIDER', secret: false },
      { name: 'OCR_API_KEY', secret: true },
    ],
  },
  {
    key: 'Search Providers',
    vars: [
      { name: 'SEARCH_PROVIDER', secret: false },
      { name: 'SEARCH_API_KEY', secret: true },
    ],
  },
  {
    key: 'Backup Services',
    vars: [
      { name: 'BACKUP_PROVIDER', secret: false },
      { name: 'BACKUP_STORAGE_PATH', secret: false },
      { name: 'AUTO_BACKUP_ENABLED', secret: false },
    ],
  },
];

export const ENV_CATEGORY_KEYS = ENV_CATEGORIES.map((c) => c.key);

// APIs surfaced in the API Manager, each mapped to the env var that configures it.
export const API_CATALOG = [
  { name: 'OpenAI', provider: 'openai', keyVar: 'OPENAI_API_KEY' },
  { name: 'Anthropic', provider: 'anthropic', keyVar: 'ANTHROPIC_API_KEY' },
  { name: 'Gemini', provider: 'gemini', keyVar: 'GEMINI_API_KEY' },
  { name: 'Google Drive', provider: 'google_drive', keyVar: 'GOOGLE_DRIVE_CLIENT_ID' },
  { name: 'Supabase', provider: 'supabase', keyVar: 'SUPABASE_URL' },
  { name: 'SMTP Email', provider: 'smtp', keyVar: 'SMTP_HOST' },
  { name: 'Indian Kanoon', provider: 'indiankanoon', keyVar: 'INDIANKANOON_API_KEY' },
];

export default ENV_CATEGORIES;
