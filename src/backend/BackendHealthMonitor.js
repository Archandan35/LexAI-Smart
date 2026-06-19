import { backendConfig } from '@/config/backend.js';
import { apiClient } from '@/core/apiClient.js';
import { detectBackendProvider } from './providers/index.js';

export const BackendHealthMonitor = {
  async check() {
    if (!backendConfig.configured) {
      return {
        reachable: false,
        configured: false,
        version: null,
        provider: null,
        providerLabel: 'Not detected',
        features: [],
        error: `VITE_BACKEND_URL is not set. Configure it to connect a backend API server.`,
        timestamp: new Date().toISOString(),
      };
    }

    const provider = detectBackendProvider();
    const healthResult = await apiClient.health();
    const versionResult = healthResult.ok ? await apiClient.version().catch(() => null) : null;

    if (!healthResult.ok) {
      return {
        reachable: false,
        configured: true,
        version: null,
        provider: provider ? { name: provider.name, label: provider.label } : null,
        providerLabel: provider?.label || 'Unknown',
        features: [],
        error: healthResult.error || `Backend at ${backendConfig.url} is not reachable.`,
        statusCode: healthResult.status,
        timestamp: new Date().toISOString(),
      };
    }

    const data = healthResult.data || {};
    const versionData = versionResult?.data || {};

    return {
      reachable: true,
      configured: true,
      version: versionData.version || data.version || 'unknown',
      serverTime: data.timestamp || null,
      provider: provider ? { name: provider.name, label: provider.label } : null,
      providerLabel: provider?.label || data.provider || 'Unknown',
      features: data.features || provider?.features || [],
      databaseEngine: data.database || null,
      supportedEngines: data.supportedEngines || [],
      error: null,
      statusCode: healthResult.status,
      timestamp: new Date().toISOString(),
    };
  },

  async diagnose() {
    const status = await this.check();
    const diagnostics = [];

    if (!status.configured) {
      diagnostics.push({ type: 'error', message: 'VITE_BACKEND_URL is not set.', fix: 'Set VITE_BACKEND_URL in your environment or .env file.' });
    } else if (!status.reachable) {
      diagnostics.push({ type: 'error', message: `Backend unreachable at ${backendConfig.url}`, fix: 'Ensure the backend server is running and accessible.' });
      if (status.statusCode === 0) diagnostics.push({ type: 'warning', message: 'Connection refused — check network, CORS, and firewall settings.', fix: 'Verify the backend is listening and CORS allows this origin.' });
      if (status.statusCode === 401 || status.statusCode === 403) diagnostics.push({ type: 'error', message: 'Authentication denied.', fix: 'Check API keys and authentication configuration.' });
      if (status.statusCode === 404) diagnostics.push({ type: 'warning', message: 'Health endpoint not found.', fix: 'Verify the API version path (/api/v1/health).' });
    } else {
      diagnostics.push({ type: 'success', message: `Backend reachable (v${status.version})` });
      if (status.provider) diagnostics.push({ type: 'info', message: `Hosted on: ${status.provider.label}` });
      if (status.databaseEngine) diagnostics.push({ type: 'info', message: `Database engine: ${status.databaseEngine}` });
    }

    return { status, diagnostics };
  },
};

export default BackendHealthMonitor;
