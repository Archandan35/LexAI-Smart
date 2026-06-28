import { useToast } from '@/data-layer/ToastContext.jsx';
import ProgressTimeline from '@/components/setup/wizard/ProgressTimeline.jsx';
import WelcomeStep from '@/components/setup/steps/WelcomeStep.jsx';
import MethodStep from '@/components/setup/steps/MethodStep.jsx';
import ConnectionStep from '@/components/setup/steps/ConnectionStep.jsx';
import DetectionStep from '@/components/setup/steps/DetectionStep.jsx';
import AnalysisStep from '@/components/setup/steps/AnalysisStep.jsx';
import PlanStep from '@/components/setup/steps/PlanStep.jsx';
import ReviewStep from '@/components/setup/steps/ReviewStep.jsx';
import InstallStep from '@/components/setup/steps/InstallStep.jsx';
import VerifyStep from '@/components/setup/steps/VerifyStep.jsx';
import HealthReport from '@/components/setup/steps/HealthReport.jsx';
import FinishStep from '@/components/setup/steps/FinishStep.jsx';
import RestoreStep from '@/components/setup/steps/RestoreStep.jsx';
import { SqlGenerator } from '@/services/setup/SqlGenerator.js';
import { ReportGenerator } from '@/services/setup/ReportGenerator.js';
import { WizardLogger } from '@/services/setup/WizardLogger.js';

export default function SetupWizard({ detectError: propDetectError }) {
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [method, setMethod] = useState(null);
  const [scanResult, setScanResult] = useState(null);
  const [sqlText, setSqlText] = useState('');
  const [health, setHealth] = useState(null);
  const [error, setError] = useState('');

  const goTo = useCallback((s) => { setError(''); setStep(s); }, []);
  const next = useCallback(() => setStep(s => Math.min(s + 1, 11)), []);
  const back = useCallback(() => setStep(s => Math.max(s - 1, 1)), []);

  const handleMethodSelect = (m) => {
    setMethod(m);
    if (m === 'simple' || m === 'advanced') {
      toast.success(`Selected ${m === 'simple' ? 'Simple' : 'Advanced'} setup mode`);
      next();
    } else if (m === 'sql') {
      toast.info('Generating installation SQL...');
      const sql = SqlGenerator.getInstallationSql();
      setSqlText(sql);
      setScanResult({ present: [], missing: [] });
      goTo(7);
    } else if (m === 'restore') {
      goTo(12);
    }
  };

  const handleConnected = () => {
    toast.success('Database connection successful');
    setStep(4);
  };

  const handleDetected = () => {
    toast.success('Environment detected successfully');
    setStep(5);
  };

  const handleAnalyzed = (scan) => {
    toast.success(`Scan complete: ${scan.present?.length || 0} found, ${scan.missing?.length || 0} missing`);
    setScanResult(scan);
    const sql = SqlGenerator.getInstallationSql(scan.missing);
    setSqlText(sql);
    setStep(6);
  };

  const handlePlanned = () => setStep(7);
  const handleInstall = () => setStep(8);
  const handleInstalled = () => {
    toast.success('Installation complete');
    setStep(9);
  };

  const handleManualSql = (sql) => setSqlText(sql);

  const handleVerified = () => {
    toast.success('All checks passed');
    setStep(10);
  };

  const handleHealthDone = (h) => {
    setHealth(h);
    setStep(11);
  };

  const handleLaunch = () => {
    WizardLogger.info('Launching LexAI');
    window.location.href = '/';
  };

  const handleExport = () => {
    const report = ReportGenerator.generate(health, scanResult, health?.verification, {});
    ReportGenerator.download(report);
    toast.success('Report exported');
  };

  const handleBackup = () => {
    WizardLogger.info('Backup requested');
    toast.info('Backup feature coming soon');
  };

  const handleRestoreComplete = () => {
    toast.success('Database restored successfully');
    setStep(11);
  };

  const renderStep = () => {
    switch (step) {
      case 1: return <WelcomeStep onMethodSelect={handleMethodSelect} />;
      case 2: return <MethodStep onSelect={handleMethodSelect} back={() => goTo(1)} />;
      case 3: return <ConnectionStep method={method} onConnected={handleConnected} back={back} />;
      case 4: return <DetectionStep onDetected={handleDetected} back={back} />;
      case 5: return <AnalysisStep onAnalyzed={handleAnalyzed} back={back} />;
      case 6: return <PlanStep scanResult={scanResult} onPlanned={handlePlanned} back={back} />;
      case 7: return (
        <ReviewStep scanResult={scanResult} sqlText={sqlText}
          onInstall={handleInstall} onGenerateSql={handleExport} back={back} />
      );
      case 8: return <InstallStep scanResult={scanResult} onInstalled={handleInstalled} onManualSql={handleManualSql} />;
      case 9: return <VerifyStep onVerified={handleVerified} manualSql={sqlText} back={() => goTo(7)} />;
      case 10: return <HealthReport onComplete={handleHealthDone} back={back} />;
      case 11: return <FinishStep health={health} onLaunch={handleLaunch} onExport={handleExport} onBackup={handleBackup} />;
      case 12: return <RestoreStep onComplete={handleRestoreComplete} back={() => goTo(2)} />;
      default: return null;
    }
  };

  return (
    <div className="wizard-layout">
      <ProgressTimeline currentStep={step} goToStep={goTo} />
      <div className="wizard-body">
        {propDetectError && (
          <div className="wizard-error-box">{propDetectError}</div>
        )}
        {error && (
          <div className="wizard-error-box">{error}</div>
        )}
        <div className="wizard-body__center">
          {renderStep()}
        </div>
      </div>
    </div>
  );
}
