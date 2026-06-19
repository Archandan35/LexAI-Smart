export const RenderProvider = {
  name: 'render',
  label: 'Render',
  detect() {
    return !!(import.meta.env?.VITE_RENDER_EXTERNAL_URL || import.meta.env?.RENDER_EXTERNAL_URL);
  },
  description: 'Render-deployed backend API',
  features: ['health', 'database:test', 'database:install', 'database:schema', 'database:seed', 'database:verify', 'database:backup', 'database:restore', 'database:migrate'],
};

export default RenderProvider;
