export const monitoringService = {
  metrics: [],

  init() {
    if (typeof window === 'undefined') return;
    this._observeVitals();
    this._observeErrors();
    this._observeNavigation();
    if (import.meta.env.DEV) console.info('[Monitoring] initialized');
  },

  _observeVitals() {
    try {
      const lcpObs = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          this._report('LCP', entries[entries.length - 1].startTime);
        }
      });
      lcpObs.observe({ type: 'largest-contentful-paint', buffered: true });

      let clsValue = 0;
      const clsObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) clsValue += entry.value;
        }
        this._report('CLS', clsValue);
      });
      clsObs.observe({ type: 'layout-shift', buffered: true });

      const fidObs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this._report('FID', entry.processingStart - entry.startTime);
        }
      });
      fidObs.observe({ type: 'first-input', buffered: true });
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Monitoring] PerformanceObserver not supported', e.message);
    }
  },

  _observeErrors() {
    window.addEventListener('error', (e) => {
      this._report('Error', { message: e.message, filename: e.filename, lineno: e.lineno, colno: e.colno });
    });
    window.addEventListener('unhandledrejection', (e) => {
      this._report('UnhandledRejection', { reason: e.reason?.message || String(e.reason) });
    });
  },

  _observeNavigation() {
    if (performance?.getEntriesByType) {
      const [nav] = performance.getEntriesByType('navigation');
      if (nav) {
        setTimeout(() => {
          this._report('DOMContentLoaded', nav.domContentLoadedEventEnd);
          this._report('Load', nav.loadEventEnd);
          this._report('DOMInteractive', nav.domInteractive);
        }, 0);
      }
    }
  },

  _report(name, value) {
    this.metrics.push({ name, value, timestamp: performance.now() });
    if (import.meta.env.DEV) {
      console.info(`[Monitoring] ${name}:`, typeof value === 'object' ? value : `${Math.round(value)}ms`);
    }
  },

  getMetrics() { return [...this.metrics]; },
  clearMetrics() { this.metrics = []; },
};
