let logs = [];

export const WizardLogger = {
  log(level, message, details = null) {
    const entry = { level, message, details, timestamp: new Date().toISOString() };
    logs.push(entry);
    if (level === 'error') console.error(`[Setup] ${message}`, details);
    else console.log(`[Setup] ${message}`);
  },
  info(message, details) { this.log('info', message, details); },
  warn(message, details) { this.log('warn', message, details); },
  error(message, details) { this.log('error', message, details); },
  success(message, details) { this.log('success', message, details); },
  getAll() { return [...logs]; },
  clear() { logs = []; },
};
