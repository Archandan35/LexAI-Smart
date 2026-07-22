const STORAGE_KEY = 'lexai:monitoring';
const MAX_ENTRIES = 1000;

export const metricStore = {
  save(metrics) {
    try {
      const data = { timestamp: Date.now(), metrics: metrics.slice(-MAX_ENTRIES) };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch { }
  },

  load() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed.metrics) ? parsed.metrics : [];
    } catch {
      return [];
    }
  },

  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch { }
  },

  getReport(metrics) {
    const LCPs = metrics.filter((m) => m.name === 'LCP').map((m) => m.value);
    const CLSs = metrics.filter((m) => m.name === 'CLS').map((m) => m.value);
    const FIDs = metrics.filter((m) => m.name === 'FID').map((m) => m.value);
    const errors = metrics.filter((m) => m.name === 'Error' || m.name === 'UnhandledRejection');
    const loads = metrics.filter((m) => m.name === 'Load').map((m) => m.value);
    const memories = metrics.filter((m) => m.name === 'Memory').map((m) => m.value);
    const longTasks = metrics.filter((m) => m.name === 'LongTask');

    const avg = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;

    const errorTypes = {};
    for (const e of errors) {
      const t = e.name === 'UnhandledRejection' ? 'UnhandledRejection' : 'Error';
      errorTypes[t] = (errorTypes[t] || 0) + 1;
    }

    return {
      vitals: {
        LCP: LCPs.length > 0 ? Math.max(...LCPs) : null,
        CLS: CLSs.length > 0 ? CLSs[CLSs.length - 1] : null,
        FID: FIDs.length > 0 ? Math.max(...FIDs) : null,
      },
      errors: { total: errors.length, types: errorTypes },
      avgLoadTime: loads.length > 0 ? avg(loads) : null,
      avgMemory: memories.length > 0 ? avg(memories) : null,
      longTaskCount: longTasks.length,
      totalEntries: metrics.length,
    };
  },
};

export default metricStore;
