
const STEP_LABELS = [
  'Welcome', 'Method', 'Connect', 'Detect', 'Analyze',
  'Plan', 'Review', 'Install', 'Verify', 'Health', 'Finish'
];

export default function ProgressTimeline({ currentStep, goToStep }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const [mobile, setMobile] = useState(isMobile);

  useEffect(() => {
    const onResize = () => {
      const m = window.innerWidth < 768;
      setMobile(m);
      if (m) setCollapsed(true);
    };
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const handleGoToStep = useCallback((idx) => {
    if (mobile) setMobileOpen(false);
    goToStep(idx);
  }, [mobile, goToStep]);

  return (
    <>
      {mobile && mobileOpen && (
        <div className="wizard-overlay" onClick={() => setMobileOpen(false)} />
      )}
      <div className={
        `wizard-sidebar${collapsed && !mobile ? ' wizard-sidebar--collapsed' : ''}` +
        (mobile ? ` wizard-sidebar--mobile wizard-sidebar--mobile-${mobileOpen ? 'open' : 'closed'}` :
          ` wizard-sidebar--${collapsed ? 'narrow' : 'expanded'}`)
      }>
        <div className={
          `wizard-sidebar__header${collapsed && !mobile ? ' wizard-sidebar__header--collapsed' : ''}`
        }>
          {(!collapsed || mobile) && (
            <div className="wizard-sidebar__label">
              {mobile ? '' : 'Setup Progress'}
            </div>
          )}
          <button onClick={() => { if (mobile) setMobileOpen(false); else setCollapsed(c => !c); }}
            className="wizard-sidebar__toggle"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {mobile ? '✕' : collapsed ? '☰' : '◀'}
          </button>
        </div>
        {STEP_LABELS.map((label, i) => {
          const idx = i + 1;
          const isDone = idx < currentStep;
          const isCurrent = idx === currentStep;
          const isFuture = idx > currentStep;
          const circleClass = isDone ? 'wizard-step-btn__circle--done' : isCurrent ? 'wizard-step-btn__circle--active' : 'wizard-step-btn__circle--future';
          const btnClass =
            `wizard-step-btn${isDone ? ' wizard-step-btn--done' : ''}${isCurrent ? ' wizard-step-btn--active' : ''}${collapsed && !mobile ? ' wizard-step-btn--collapsed' : ''}`;
          return (
            <button key={label}
              className={btnClass}
              onClick={() => isDone && handleGoToStep(idx)}
              disabled={!isDone}
              style={{ opacity: isFuture ? 0.45 : 1 }}
            >
              <span className={`wizard-step-btn__circle ${circleClass}`}>
                {isDone ? '✓' : idx}
              </span>
              {(!collapsed || mobile) && <span>{label}</span>}
            </button>
          );
        })}
      </div>
      {mobile && !mobileOpen && (
        <button className="wizard-hamburger" onClick={() => setMobileOpen(true)} aria-label="Open setup menu">
          ☰
        </button>
      )}
    </>
  );
}
