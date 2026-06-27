let cache = {};
let listeners = [];

export const settingsCache = {
  get(key) {
    return cache[key];
  },

  getAll() {
    return { ...cache };
  },

  setAll(settings) {
    cache = { ...settings };
    listeners.forEach((fn) => fn(cache));
  },

  subscribe(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },
};

export default settingsCache;
