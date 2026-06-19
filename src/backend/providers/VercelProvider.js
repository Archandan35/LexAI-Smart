export const VercelProvider = {
  name: 'vercel',
  label: 'Vercel',
  detect() {
    return !!(import.meta.env?.VITE_VERCEL_URL || import.meta.env?.VERCEL_URL);
  },
  description: 'Vercel-deployed serverless backend API',
  features: ['health', 'database:test', 'database:install', 'database:schema', 'database:seed', 'database:verify', 'database:backup', 'database:restore', 'database:migrate'],
};

export default VercelProvider;
