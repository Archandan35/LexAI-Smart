// Central runtime configuration. The ONLY place env vars are read.
// Provider factories consume this; nothing else touches import.meta.env.

import { guardClientSecrets } from '@/security/clientSecretGuard.js';

const env = import.meta.env ?? {};

// Fail loud (not silently) if a privileged secret is about to ship to the browser.
guardClientSecrets();

export const config = {
  app: {
    name: 'LexAI',
    tagline: 'Indian Litigation Assistant',
    version: '1.0.0',
  },
  providers: {
    ai: env.VITE_AI_PROVIDER || '',
    auth: env.VITE_AUTH_PROVIDER || '',
    database: env.VITE_DATABASE_PROVIDER || '',
    storage: env.VITE_STORAGE_PROVIDER || '',
    search: env.VITE_SEARCH_PROVIDER || '',
    citation: env.VITE_CITATION_PROVIDER || '',
    ocr: env.VITE_OCR_PROVIDER || '',
    preferences: env.VITE_PREFERENCES_PROVIDER || '',
  },
  credentials: {
    openaiApiKey: env.VITE_OPENAI_API_KEY || '',
    anthropicApiKey: env.VITE_ANTHROPIC_API_KEY || '',
    geminiApiKey: env.VITE_GEMINI_API_KEY || '',
    ollamaBaseUrl: env.VITE_OLLAMA_BASE_URL || 'http://localhost:11434',
    supabaseUrl: env.VITE_SUPABASE_URL || '',
    supabaseAnonKey: env.VITE_SUPABASE_ANON_KEY || '',
    // NOTE: the service-role key is intentionally NOT read here. It bypasses
    // RLS and grants full DB admin, so it must never ship in the client
    // bundle. Installation that needs it is routed to a backend via
    // VITE_BACKEND_URL (see BackendGateway / docs/CLIENT_SECRETS.md).
    mongoDataApiUrl: env.VITE_MONGO_DATA_API_URL || '',
    mongoDataApiKey: env.VITE_MONGO_DATA_API_KEY || '',
    mongoDataSource: env.VITE_MONGO_DATA_SOURCE || '',
    mongoDatabase: env.VITE_MONGO_DATABASE || '',
    // Firebase Firestore via REST (no SDK in the bundle). projectId + Web API key
    // are enough for rules-gated access; a bearer token may also be supplied.
    firebaseProjectId: env.VITE_FIREBASE_PROJECT_ID || '',
    firebaseApiKey: env.VITE_FIREBASE_API_KEY || '',
    firebaseAccessToken: env.VITE_FIREBASE_ACCESS_TOKEN || '',
    indianKanoonApiKey: env.VITE_INDIANKANOON_API_KEY || '',
  },
  // Cloud storage + sync for CASE/DRAFT files only (the backup module is separate).
  // Real cloud providers need a backend; these values are consumed by the
  // provider templates under providers/storage/*. The UI never reads them.
  storage: {
    rootFolder: env.VITE_STORAGE_ROOT_FOLDER || 'LexAI',
    autoSync: env.VITE_AUTO_SYNC_ENABLED !== 'false',
    autoSaveInterval: Number(env.VITE_AUTO_SAVE_INTERVAL || 5000),
    supabaseBucket: env.VITE_SUPABASE_BUCKET || 'case-files',
    googleDrive: {
      clientId: env.VITE_GOOGLE_DRIVE_CLIENT_ID || '',
      // NOTE: secret/refresh token must live on a backend, never in the bundle.
      refreshToken: env.VITE_GOOGLE_DRIVE_REFRESH_TOKEN || '',
      // Backend proxy URL that holds OAuth secrets and makes Drive API calls.
      backendUrl: env.VITE_GOOGLE_DRIVE_BACKEND_URL || '',
    },
  },
};

export default config;
