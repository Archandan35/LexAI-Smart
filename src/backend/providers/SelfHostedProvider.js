export const SelfHostedProvider = {
  name: 'selfhosted',
  label: 'Self-Hosted',
  detect() {
    return !import.meta.env?.VITE_RAILWAY_STATIC_URL
      && !import.meta.env?.VITE_RENDER_EXTERNAL_URL
      && !import.meta.env?.VITE_VERCEL_URL
      && !!import.meta.env?.VITE_BACKEND_URL;
  },
  description: 'Self-hosted backend API server',
  features: ['health', 'database:test', 'database:install', 'database:schema', 'database:seed', 'database:verify', 'database:backup', 'database:restore', 'database:migrate'],
};

export default SelfHostedProvider;
