import { databaseAdminService } from '@/services/databaseAdminService.js';

export const MigrationExecutor = {
  async status() {
    const [version, meta, diff] = await Promise.all([
      databaseAdminService.getVersion().catch(() => 0),
      databaseAdminService.getMeta().catch(() => null),
      databaseAdminService.diffSchema().catch(() => null),
    ]);
    return {
      currentVersion: version,
      targetVersion: databaseAdminService.targetVersion(),
      needsUpgrade: version < databaseAdminService.targetVersion(),
      meta,
      diff,
      provider: databaseAdminService.providerName(),
    };
  },

  async upgrade() {
    return databaseAdminService.upgrade();
  },

  async rollback(target) {
    return databaseAdminService.rollback(target);
  },

  async generateMigrationSql(fromVersion, toVersion) {
    const { SchemaCompiler } = await import('@/data-provider/schema/SchemaCompiler.js');
    const { listSchemas } = await import('@/data-provider/schema/index.js');

    const artifact = SchemaCompiler.installArtifact(databaseAdminService.providerName());
    const schemas = listSchemas();
    const alterParts = [];
    for (const s of schemas) {
      const compiled = SchemaCompiler.compile(databaseAdminService.providerName(), s);
      if (compiled.alterTable) {
        alterParts.push(compiled.alterTable([]));
      }
    }

    return {
      fromVersion,
      toVersion,
      provider: databaseAdminService.providerName(),
      ddl: artifact.text || '',
      alters: alterParts.flat().join('\n'),
      fullSql: [artifact.text || '', ...alterParts.flat()].filter(Boolean).join('\n\n'),
    };
  },
};

export default MigrationExecutor;
