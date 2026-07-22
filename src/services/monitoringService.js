import { metricStore } from '../utils/metricStore.js';

const MAX_METRICS = 1000;

export const monitoringService = {
  metrics: [],

  init() {
    if (typeof window === 'undefined') return;
    this.metrics = metricStore.load();
    this._observeVitals();
    this._observeErrors();
    this._observeNavigation();
    this._observeLongTasks();
    this._observeMemory();
    this._observeResourceTiming();
    window.addEventListener('beforeunload', () => this._persist());
    if (import.meta.env.DEV) console.info('[Monitoring] initialized');
  },

  _persist() {
    metricStore.save(this.metrics);
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

  _observeLongTasks() {
    if (typeof PerformanceObserver === 'undefined') return;
    try {
      const obs = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          this._report('LongTask', { duration: entry.duration, startTime: entry.startTime, name: entry.name });
        }
      });
      obs.observe({ type: 'longtask', buffered: true });
    } catch (e) {
      if (import.meta.env.DEV) console.warn('[Monitoring] LongTask observer not supported', e.message);
    }
  },

  _observeMemory() {
    if (performance.memory) {
      setInterval(() => {
        this._report('Memory', {
          usedJSHeapSize: performance.memory.usedJSHeapSize,
          totalJSHeapSize: performance.memory.totalJSHeapSize,
          jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
        });
      }, 30000);
    }
  },

  _observeResourceTiming() {
    if (typeof performance?.getEntriesByType !== 'function') return;
    setTimeout(() => {
      try {
        const resources = performance.getEntriesByType('resource');
        for (const r of resources) {
          if (r.duration > 0) {
            this._report('Resource', {
              name: r.name,
              duration: r.duration,
              initiatorType: r.initiatorType,
              transferSize: r.transferSize,
            });
          }
        }
      } catch { }
    }, 5000);
  },

  mark(name) {
    if (typeof performance?.mark !== 'function') return;
    performance.mark(name);
    this._report('Mark', { name, startTime: performance.now() });
  },

  measure(name, startMark) {
    if (typeof performance?.measure !== 'function') return;
    try {
      performance.measure(name, startMark);
      const entries = performance.getEntriesByName(name);
      const entry = entries[entries.length - 1];
      if (entry) {
        this._report('Measure', { name, duration: entry.duration, startTime: entry.startTime });
      }
    } catch { }
  },

  _report(name, value) {
    this.metrics.push({ name, value, timestamp: performance.now() });
    if (this.metrics.length > MAX_METRICS) {
      this.metrics = this.metrics.slice(-MAX_METRICS);
    }
    if (import.meta.env.DEV) {
      console.info(`[Monitoring] ${name}:`, typeof value === 'object' ? value : `${Math.round(value)}ms`);
    }
  },

  getMetrics() { return [...this.metrics]; },

  clearMetrics() {
    this.metrics = [];
    metricStore.clear();
  },
};

export default monitoringService;
