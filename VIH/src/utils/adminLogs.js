const LOG_KEY = 'admin_logs';
const MAX_ENTRIES = 500;

export const logAction = (action, payload = {}) => {
  try {
    console.log('🟢 logAction llamado:', action, payload);
    const entry = {
      id: crypto.randomUUID(),
      action,
      timestamp: new Date().toISOString(),
      ...payload,
    };
    const existing = JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
    const updated = [entry, ...existing].slice(0, MAX_ENTRIES);
    localStorage.setItem(LOG_KEY, JSON.stringify(updated));
  } catch (err) {
    console.warn('Log fallido:', err);
  }
};

export const getLogs = () => {
  try {
    return JSON.parse(localStorage.getItem(LOG_KEY) || '[]');
  } catch {
    return [];
  }
};

export const exportLogs = () => {
  const logs = getLogs();
  const blob = new Blob([JSON.stringify(logs, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `admin_logs_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
};

export const clearLogs = () => localStorage.removeItem(LOG_KEY);