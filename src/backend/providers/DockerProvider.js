export const DockerProvider = {
  name: 'docker',
  label: 'Docker',
  detect() {
    return import.meta.env?.VITE_BACKEND_URL?.includes('localhost') || import.meta.env?.VITE_BACKEND_URL?.includes('127.0.0.1');
  },
  description: 'Docker container backend API',
  features: ['health', 'database:test', 'database:install', 'database:schema', 'database:seed', 'database:verify', 'database:backup', 'database:restore', 'database:migrate'],
};

export default DockerProvider;
