import { WizardLogger } from './WizardLogger.js';

export const ReportGenerator = {
  generate(health, scan, verification, execution) {
    WizardLogger.info('Generating installation report');
    const report = {
      generatedAt: new Date().toISOString(),
      provider: scan?.provider || 'unknown',
      version: scan?.version || 0,
      databaseSize: '?',
      objectsInstalled: execution?.objectsInstalled || 0,
      health,
      summary: {
        installed: scan?.installed || false,
        present: scan?.present?.length || 0,
        missing: scan?.missing?.length || 0,
        warnings: health?.warnings?.length || 0,
        score: health?.overallScore || 0,
      },
    };
    WizardLogger.success('Report generated');
    return report;
  },

  download(report) {
    const json = JSON.stringify(report, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `lexai-installation-report-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    WizardLogger.info('Report downloaded');
  },
};
