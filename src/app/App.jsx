import AppRoutes from '@/routes/index.jsx';
import { ToastProvider } from '@/data-layer/ToastContext.jsx';
import { AuthProviderCtx } from '@/data-layer/AuthContext.jsx';
import { AppDataProvider } from '@/data-layer/AppDataContext.jsx';
import SetupGate from '@/components/SetupGate.jsx';
import ErrorBoundary from '@/components/ErrorBoundary.jsx';
import { SettingsProvider, useSettings } from '@/data-layer/SettingsContext.jsx';
import { configureFieldMappings } from '@/core/fieldMappingConfig.js';
import { DebugProvider } from '@/data-layer/DebugContext.jsx';

configureFieldMappings();

function DocumentTitle() {
  const { settings } = useSettings();
  useEffect(() => {
    document.title = settings.siteTitle || 'LexAI';
  }, [settings.siteTitle]);

  useEffect(() => {
    if (!settings.logoUrl) return;
    const link = document.querySelector('link[rel="icon"]') || document.createElement('link');
    link.rel = 'icon';
    link.href = settings.logoUrl;
    if (!link.parentNode) document.head.appendChild(link);
  }, [settings.logoUrl]);

  return null;
}

export default function App() {
  return (
    <ErrorBoundary>
      <ToastProvider>
        <SetupGate>
          <SettingsProvider>
            <DocumentTitle />
            <AuthProviderCtx>
              <AppDataProvider>
                <DebugProvider>
                  <AppRoutes />
                </DebugProvider>
              </AppDataProvider>
            </AuthProviderCtx>
          </SettingsProvider>
        </SetupGate>
      </ToastProvider>
    </ErrorBoundary>
  );
}
