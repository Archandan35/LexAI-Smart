import React, { useState, useEffect, useCallback } from 'react';

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

  const sidebarStyle = mobile ? {
    position: 'fixed', top: 0, left: 0, bottom: 0,
    width: 220, zIndex: 50,
    transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
    transition: 'transform 0.3s var(--ease)',
    boxShadow: mobileOpen ? '4px 0 30px rgba(0,0,0,0.25)' : 'none',
  } : {
    width: collapsed ? 68 : 220, minWidth: collapsed ? 68 : 220,
    transition: 'width 0.3s var(--ease), min-width 0.3s var(--ease)',
  };

  return (
    <>
      {mobile && mobileOpen && (
        <div onClick={() => setMobileOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(15,31,61,0.4)', zIndex: 49 }} />
      )}
      <div style={{
        padding: collapsed && !mobile ? '28px 8px' : '28px 16px',
        borderRight: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', flexDirection: 'column', gap: 2,
        overflow: 'hidden',
        ...sidebarStyle,
      }}>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          marginBottom: collapsed && !mobile ? 20 : 16, padding: collapsed && !mobile ? '0 4px' : '0 8px',
        }}>
          {(!collapsed || mobile) && (
            <div style={{
              fontSize: 11, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-faint)',
              whiteSpace: 'nowrap', overflow: 'hidden',
            }}>
              {mobile ? '' : 'Setup Progress'}
            </div>
          )}
          <button onClick={() => { if (mobile) setMobileOpen(false); else setCollapsed(c => !c); }}
            style={{
              width: 28, height: 28, border: 'none', borderRadius: 6,
              background: 'transparent', cursor: 'pointer',
              color: 'var(--text-soft)', display: 'grid', placeItems: 'center',
              fontSize: 16, flexShrink: 0,
            }}
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
          return (
            <button key={label}
              onClick={() => isDone && handleGoToStep(idx)}
              disabled={!isDone}
              style={{
                display: 'flex', alignItems: 'center', gap: collapsed && !mobile ? 0 : 10,
                padding: collapsed && !mobile ? '8px 0' : '8px 10px',
                justifyContent: collapsed && !mobile ? 'center' : 'flex-start',
                border: 'none', borderRadius: 8,
                cursor: isDone ? 'pointer' : 'default',
                background: isCurrent ? 'var(--brand-soft)' : 'transparent',
                color: isCurrent ? 'var(--brand)' : isDone ? 'var(--text)' : 'var(--text-faint)',
                fontWeight: isCurrent ? 600 : 400, fontSize: 13,
                textAlign: 'left', width: '100%',
                opacity: isFuture ? 0.45 : 1,
                transition: 'all 0.2s var(--ease)',
                whiteSpace: 'nowrap', overflow: 'hidden',
              }}
            >
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                display: 'grid', placeItems: 'center',
                fontSize: 11, fontWeight: 700, flexShrink: 0,
                background: isDone ? 'var(--green)' : isCurrent ? 'var(--brand)' : 'var(--border)',
                color: '#fff',
              }}>
                {isDone ? '✓' : idx}
              </span>
              {(!collapsed || mobile) && <span>{label}</span>}
            </button>
          );
        })}
      </div>
      {mobile && !mobileOpen && (
        <button onClick={() => setMobileOpen(true)}
          style={{
            position: 'fixed', top: 12, left: 12, zIndex: 45,
            width: 38, height: 38, border: '1px solid var(--border)',
            borderRadius: 10, background: 'var(--surface)',
            cursor: 'pointer', color: 'var(--text-soft)',
            display: 'grid', placeItems: 'center', fontSize: 18,
            boxShadow: 'var(--shadow-sm)',
          }}
          aria-label="Open setup menu"
        >
          ☰
        </button>
      )}
    </>
  );
}
