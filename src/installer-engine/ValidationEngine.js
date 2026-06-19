import { VerificationEngine } from '@/installer-engine/VerificationEngine.js';
import { databaseAdminService } from '@/services/databaseAdminService.js';
import { MigrationRunner } from '@/installer-engine/MigrationRunner.js';
import { InstallerStateService } from '@/services/installerStateService.js';
import { SchemaMappingService } from '@/services/schemaMappingService.js';
import { ProviderCapabilitiesService } from '@/services/providerCapabilitiesService.js';

export const ValidationEngine = {
  async validateInstallation() {
    // Delegate to the comprehensive VerificationEngine
    return VerificationEngine.verifyAll();
  },

  async validateMapping(collection) {
    return SchemaMappingService.validateMapping(collection);
  },

  async validateCapabilities() {
    return ProviderCapabilitiesService.getCapabilities();
  },

  async validateMigration() {
    const needs = await MigrationRunner.needsMigration();
    const installed = await MigrationRunner.getInstalledVersion();
    return { needsMigration: needs, installedVersion: installed, targetVersion: MigrationRunner.targetVersion };
  },

  async validateState() {
    return InstallerStateService.getState();
  },
};

export default ValidationEngine;
