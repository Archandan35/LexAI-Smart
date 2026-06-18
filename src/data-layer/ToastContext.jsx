import React, { createContext, useContext } from 'react';
import { useToastState } from '@/hooks/useToast.js';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const toast = useToastState();
  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div className="toast-stack">
        {toast.toasts.map((t) => (
          <div key={t.id} className={`toast toast--${t.type}`} onClick={() => toast.remove(t.id)}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  return ctx || { push: () => {}, remove: () => {}, toasts: [] };
}

export default ToastContext;
