export const RailwayProvider = {
  name: 'railway',
  label: 'Railway',
  detect() {
    return !!(import.meta.env?.VITE_RAILWAY_STATIC_URL || import.meta.env?.RAILWAY_STATIC_URL);
  },
  description: 'Railway-deployed backend API',
  features: ['health', 'database:test', 'database:install', 'database:schema', 'database:seed', 'database:verify', 'database:backup', 'database:restore', 'database:migrate'],
};

export default RailwayProvider;
