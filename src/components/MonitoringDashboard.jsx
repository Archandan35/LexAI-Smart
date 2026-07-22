import { useState, useEffect, useCallback } from 'react';
import { monitoringService } from '../services/monitoringService.js';
import { metricStore } from '../utils/metricStore.js';
import Icon from './Icon.jsx';

function colorClass(value, good, poor) {
  if (value === null || value === undefined) return 'monitor--neutral';
  return value <= good ? 'monitor--good' : value <= poor ? 'monitor--warn' : 'monitor--bad';
}

function formatBytes(bytes) {
  if (!bytes) return '—';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

export default function MonitoringDashboard({ open, onClose }) {
  const [report, setReport] = useState(null);

  const refresh = useCallback(() => {
    const metrics = monitoringService.getMetrics();
    setReport(metricStore.getReport(metrics));
  }, []);

  useEffect(() => {
    if (!open) return;
    refresh();
    const id = setInterval(refresh, 5000);
    return () => clearInterval(id);
  }, [open, refresh]);

  const handleClear = () => {
    monitoringService.clearMetrics();
    refresh();
  };

  if (!open) return null;

  const { vitals, errors, avgLoadTime, avgMemory, longTaskCount, totalEntries } = report || {};
  const lcpColor = colorClass(vitals?.LCP, 2500, 4000);
  const clsColor = colorClass(vitals?.CLS, 0.1, 0.25);
  const fidColor = colorClass(vitals?.FID, 100, 300);

  return (
    <div className="monitor-overlay" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="monitor-panel">
        <div className="monitor-panel__head">
          <span className="monitor-panel__title">Performance Monitor</span>
          <button className="monitor-panel__close" onClick={onClose} aria-label="Close"><Icon name="close" size={16} /></button>
        </div>
        <div className="monitor-panel__body">
          {!report ? (
            <div className="monitor-empty">Waiting for data…</div>
          ) : (
            <>
              <div className="monitor-section">
                <div className="monitor-section__title">Web Vitals</div>
                <div className="monitor-grid">
                  <div className={`monitor-cell ${lcpColor}`}>
                    <span className="monitor-cell__label">LCP</span>
                    <span className="monitor-cell__value">{vitals?.LCP ? `${vitals.LCP.toFixed(0)} ms` : '—'}</span>
                    <span className="monitor-cell__target">&lt; 2.5s</span>
                  </div>
                  <div className={`monitor-cell ${clsColor}`}>
                    <span className="monitor-cell__label">CLS</span>
                    <span className="monitor-cell__value">{vitals?.CLS ? vitals.CLS.toFixed(3) : '—'}</span>
                    <span className="monitor-cell__target">&lt; 0.1</span>
                  </div>
                  <div className={`monitor-cell ${fidColor}`}>
                    <span className="monitor-cell__label">FID</span>
                    <span className="monitor-cell__value">{vitals?.FID ? `${vitals.FID.toFixed(0)} ms` : '—'}</span>
                    <span className="monitor-cell__target">&lt; 100ms</span>
                  </div>
                </div>
              </div>

              <div className="monitor-section">
                <div className="monitor-section__title">Errors</div>
                <div className="monitor-stat">{errors?.total || 0} total</div>
                {errors?.types && Object.keys(errors.types).length > 0 && (
                  <div className="monitor-stat-sub">
                    {Object.entries(errors.types).map(([k, v]) => (
                      <span key={k} className="monitor-stat-tag">{k}: {v}</span>
                    ))}
                  </div>
                )}
              </div>

              <div className="monitor-section">
                <div className="monitor-section__title">Performance</div>
                <div className="monitor-stat">
                  Avg page load: {avgLoadTime ? `${avgLoadTime.toFixed(0)} ms` : '—'}
                </div>
                <div className="monitor-stat">
                  Memory: {avgMemory ? formatBytes(avgMemory) : '—'}
                  {avgMemory ? <span className="monitor-hint"> (heap)</span> : null}
                </div>
                <div className="monitor-stat">
                  Long tasks: {longTaskCount || 0}
                  {longTaskCount > 0 ? <span className="monitor-hint"> (main thread blocking)</span> : null}
                </div>
              </div>

              <div className="monitor-total">
                {totalEntries || 0} entries recorded
              </div>

              <button className="monitor-btn" onClick={handleClear}>Clear Metrics</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
