import React from 'react';
import AppRoutes from '@/routes/index.jsx';
import { ToastProvider } from '@/data-layer/ToastContext.jsx';
import { AuthProviderCtx } from '@/data-layer/AuthContext.jsx';
import { AppDataProvider } from '@/data-layer/AppDataContext.jsx';
import SetupGate from '@/components/SetupGate.jsx';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';
import { configureFieldMappings } from '@/core/fieldMappingConfig.js';

configureFieldMappings();

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <SetupGate>
          <AuthProviderCtx>
            <AppDataProvider>
              <AppRoutes />
            </AppDataProvider>
          </AuthProviderCtx>
        </SetupGate>
      </ToastProvider>
    </ErrorBoundary>
  );
}
