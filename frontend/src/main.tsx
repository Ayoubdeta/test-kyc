import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { CookieConsent } from './components/CookieConsent';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthProvider } from './context/AuthContext';
import { I18nProvider } from './i18n';
import { ThemeProvider } from './theme';
import './index.css';

// Cliente de React Query: gestiona el estado del servidor (caché, reintentos).
// staleTime evita que cada montaje de página vuelva a pedir datos que cambian
// poco (documentos, KPIs, logs). retry acotado para no insistir en errores
// definitivos (p. ej. 4xx) más de una vez.
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      staleTime: 30_000,
      retry: 1,
    },
  },
});

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('No se encontró el elemento #root');
}

createRoot(rootElement).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <ThemeProvider>
            <I18nProvider>
              <ErrorBoundary>
                <App />
              </ErrorBoundary>
              {/* Aviso de cookies (parte inferior); fuera del ErrorBoundary de la
                  app para que se muestre aunque una página falle al renderizar. */}
              <CookieConsent />
            </I18nProvider>
          </ThemeProvider>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
);
