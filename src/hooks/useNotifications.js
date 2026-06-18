import { useEffect, useState, useCallback } from 'react';
import { notificationLogic } from '@/logic/notificationLogic.js';

export function useNotifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setItems(await notificationLogic.list());
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const dismiss = useCallback((id) => {
    notificationLogic.dismiss(id);
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }, []);

  const dismissAll = useCallback(() => {
    setItems((prev) => { notificationLogic.dismissAll(prev.map((n) => n.id)); return prev.map((n) => ({ ...n, read: true })); });
  }, []);

  const unread = items.filter((n) => !n.read).length;
  return { items, loading, unread, refresh, dismiss, dismissAll };
}

export default useNotifications;
