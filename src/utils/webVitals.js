import { monitoringService } from '../services/monitoringService.js';

function sendToAnalytics(metric) {
  const body = {
    name: metric.name,
    value: metric.value,
    rating: metric.rating,
    delta: metric.delta,
    url: window.location.pathname,
    timestamp: Date.now(),
  };
  try {
    sessionStorage.setItem('lexai:vitals', JSON.stringify(body));
  } catch {}
  try {
    monitoringService.metrics.push({ name: metric.name, value: metric.value, rating: metric.rating, timestamp: performance.now() });
  } catch {}
  if (import.meta.env.DEV) {
    console.debug(`[WebVital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.rating})`);
  }
}

let vitalsCallback = sendToAnalytics;

export function onLCP(callback) {
  if (typeof PerformanceObserver === 'undefined') return;
  try {
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const last = entries[entries.length - 1];
      if (last) {
        callback({
          name: 'LCP',
          value: last.startTime,
          rating: last.startTime < 2500 ? 'good' : last.startTime < 4000 ? 'needs-improvement' : 'poor',
          delta: last.startTime,
        });
      }
    });
    obs.observe({ type: 'largest-contentful-paint', buffered: true });
  } catch {}
}

export function onFID(callback) {
  if (typeof PerformanceObserver === 'undefined') return;
  try {
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        callback({
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          rating: entry.processingStart - entry.startTime < 100 ? 'good' : 'needs-improvement',
          delta: entry.processingStart - entry.startTime,
        });
      });
    });
    obs.observe({ type: 'first-input', buffered: true });
  } catch {}
}

export function onCLS(callback) {
  if (typeof PerformanceObserver === 'undefined') return;
  try {
    let cumulativeScore = 0;
    const obs = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry) => {
        if (!entry.hadRecentInput) {
          cumulativeScore += entry.value;
        }
      });
      callback({
        name: 'CLS',
        value: cumulativeScore,
        rating: cumulativeScore < 0.1 ? 'good' : cumulativeScore < 0.25 ? 'needs-improvement' : 'poor',
        delta: cumulativeScore,
      });
    });
    obs.observe({ type: 'layout-shift', buffered: true });
  } catch {}
}

export function reportWebVitals(callback = vitalsCallback) {
  if (typeof window === 'undefined') return;
  if (document.readyState === 'complete') {
    setTimeout(() => {
      onLCP(callback);
      onFID(callback);
      onCLS(callback);
    }, 1000);
  } else {
    window.addEventListener('load', () => {
      setTimeout(() => {
        onLCP(callback);
        onFID(callback);
        onCLS(callback);
      }, 1000);
    });
  }
}


