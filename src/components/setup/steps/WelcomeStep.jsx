import Button from '@/components/Button.jsx';

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export default function WelcomeStep({ onMethodSelect }) {
  return (
    <div className="wizard-hero">
      <div className="wizard-hero__icon">L</div>
      <div>
        <p className="wizard-hero__greeting">{greeting()}</p>
        <h1 className="wizard-hero__title">LexAI Setup</h1>
        <p className="wizard-hero__desc">
          Welcome to the LexAI installation wizard. This tool will guide you through connecting your database,
          verifying your environment, and completing the setup so you can start using LexAI.
        </p>
      </div>
      <div className="wizard-actions--left">
        <Button variant="primary" icon="bolt" onClick={() => onMethodSelect('simple')}>Start Setup</Button>
        <Button variant="ghost" icon="copy" onClick={() => onMethodSelect('sql')}>Generate SQL</Button>
        <Button variant="ghost" icon="upload" onClick={() => onMethodSelect('restore')}>Restore Backup</Button>
      </div>
      <div className="wizard-hero__links">
        <a href="#" className="wizard-hero__link">Documentation</a>
        <a href="#" className="wizard-hero__link">Release Notes</a>
        <a href="#" className="wizard-hero__link">Support</a>
      </div>
    </div>
  );
}
