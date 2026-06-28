import { WizardLogger } from './WizardLogger.js';

export const HealthAnalyzer = {
  analyze(scanResult, diffResult) {
    WizardLogger.info('Analyzing database health');
    const present = scanResult?.present?.length || 0;
    const missing = scanResult?.missing?.length || 0;
    const total = present + missing;
    const installPct = total > 0 ? Math.round((present / total) * 100) : 0;
    const diffChanges = diffResult?.changes?.length || 0;

    const health = {
      overallScore: 0,
      installationScore: installPct,
      securityScore: 70,
      performanceScore: 80,
      compatibilityScore: 90,
      warnings: [],
      recommendations: [],
      missingComponents: scanResult?.missing || [],
      duplicateObjects: [],
      unusedObjects: [],
      optimizationSuggestions: [],
    };

    if (missing > 0) {
      health.warnings.push(`${missing} component(s) missing`);
      health.recommendations.push('Run installation to create missing components');
    } else {
      health.overallScore += 30;
    }
    if (diffChanges > 0) {
      health.warnings.push(`${diffChanges} schema difference(s) detected`);
      health.recommendations.push('Review schema diff for potential issues');
    } else {
      health.overallScore += 20;
    }
    if (installPct === 100) health.overallScore += 30;
    else health.optimizationSuggestions.push('Complete installation for full functionality');

    health.overallScore += health.securityScore * 0.1 + health.performanceScore * 0.1 + health.compatibilityScore * 0.1;
    health.overallScore = Math.min(100, Math.round(health.overallScore));

    WizardLogger.success('Health analysis complete', { score: health.overallScore });
    return health;
  },
};
