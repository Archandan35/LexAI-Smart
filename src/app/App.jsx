import React from 'react';
import AppRoutes from '@/routes/index.jsx';
import { ToastProvider } from '@/data-layer/ToastContext.jsx';
import { AuthProviderCtx } from '@/data-layer/AuthContext.jsx';
import { AppDataProvider } from '@/data-layer/AppDataContext.jsx';
import SetupGate from '@/components/SetupGate.jsx';

// App — composition root. Wraps the router with app-wide auth, data + toast
// providers. SetupGate sits above auth so a fresh backend can be installed
// before any user exists. No business logic lives here.
export default function App() {
  return (
    <ToastProvider>
      <SetupGate>
        <AuthProviderCtx>
          <AppDataProvider>
            <AppRoutes />
          </AppDataProvider>
        </AuthProviderCtx>
      </SetupGate>
    </ToastProvider>
  );
}
