export const KubernetesProvider = {
  name: 'kubernetes',
  label: 'Kubernetes',
  detect() {
    return !!(import.meta.env?.VITE_KUBERNETES_SERVICE_HOST || import.meta.env?.KUBERNETES_SERVICE_HOST);
  },
  description: 'Kubernetes-deployed backend API gateway',
  features: ['health', 'database:test', 'database:install', 'database:schema', 'database:seed', 'database:verify', 'database:backup', 'database:restore', 'database:migrate'],
};

export default KubernetesProvider;
