import { backendConfig } from '@/config/backend.js';
import { apiClient } from '@/core/apiClient.js';
import { detectBackendProvider } from './providers/index.js';

export const BackendGateway = {
  get configured() {
    return backendConfig.configured;
  },

  get baseUrl() {
    return backendConfig.url;
  },

  get apiVersion() {
    return backendConfig.apiVersion;
  },

  detectProvider() {
    return detectBackendProvider();
  },

  resolve(path) {
    return backendConfig.resolve(path);
  },

  async health() {
    return apiClient.health();
  },

  async version() {
    return apiClient.version();
  },

  async testDatabase(payload) {
    return apiClient.testDatabase(payload);
  },

  async installDatabase(payload, onProgress) {
    return apiClient.installDatabase(payload, onProgress);
  },

  async verifyDatabase(payload) {
    return apiClient.verifyDatabase(payload);
  },

  async migrateDatabase(payload) {
    return apiClient.migrateDatabase(payload);
  },

  async backupDatabase(payload) {
    return apiClient.backupDatabase(payload);
  },

  async restoreDatabase(payload) {
    return apiClient.restoreDatabase(payload);
  },

  getContract() {
    return {
      base: backendConfig.url || '(not configured)',
      version: backendConfig.apiVersion,
      endpoints: Object.values(backendConfig.endpoints),
      configured: backendConfig.configured,
    };
  },
};

export default BackendGateway;
