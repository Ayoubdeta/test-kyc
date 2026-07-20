import { useEffect, useState } from 'react';
import { useI18n } from '../i18n';
import { Button } from './ui/Button';

// Clave de persistencia: una vez el usuario decide, no se vuelve a mostrar.
const STORAGE_KEY = 'kyc_cookie_consent';

// Banner de consentimiento de cookies (parte inferior). Se muestra mientras el
// usuario no haya aceptado/rechazado. La plataforma solo usa cookies necesarias
// (sesión httpOnly y seguridad), así que ambas opciones ocultan el aviso; se
// guarda la elección para no volver a preguntar.
export function CookieConsent() {
  const { t } = useI18n();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(STORAGE_KEY)) setVisible(true);
    } catch {
      // Si localStorage no está disponible, mostramos el aviso igualmente.
      setVisible(true);
    }
  }, []);

  const decide = (value: 'accepted' | 'rejected') => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Ignoramos: aunque no se persista, ocultamos el aviso en esta sesión.
    }
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-50 animate-fade-in-up p-3 sm:p-4"
      role="dialog"
      aria-live="polite"
      aria-label={t('cookie.title')}
    >
      <div className="mx-auto flex max-w-4xl flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-elevated sm:flex-row sm:items-center sm:gap-4">
        <p className="flex-1 text-sm text-slate-600">
          {t('cookie.message')}{' '}
          <a
            href="https://decalesp.com/cookies/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-600 underline hover:text-brand-700"
          >
            {t('cookie.learnMore')}
          </a>
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="ghost" onClick={() => decide('rejected')}>
            {t('cookie.reject')}
          </Button>
          <Button variant="primary" onClick={() => decide('accepted')}>
            {t('cookie.accept')}
          </Button>
        </div>
      </div>
    </div>
  );
}
