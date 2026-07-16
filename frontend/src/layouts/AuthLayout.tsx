import type { ReactNode } from 'react';
import { AuthCarousel } from '../components/AuthCarousel';
import { AppLogo, PoweredByDecal } from '../components/Brand';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

interface AuthLayoutProps {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
  size?: 'md' | 'lg';
}

// Layout compartido por login y registro. Panel dividido: a la izquierda el
// branding corporativo (KYC + Decal), a la derecha el formulario. Responsive
// (en móvil se apila) y con animación de entrada.
export function AuthLayout({ title, subtitle, children, footer, size = 'md' }: AuthLayoutProps) {
  const maxWidth = size === 'lg' ? 'max-w-5xl' : 'max-w-4xl';

  return (
    <div className="flex min-h-screen items-center justify-center p-4 sm:p-6">
      <div
        className={`grid w-full ${maxWidth} animate-fade-in-up overflow-hidden rounded-3xl bg-white shadow-elevated md:grid-cols-2`}
      >
        {/* Panel de marca (oculto en móvil) */}
        <aside className="relative hidden flex-col justify-between bg-gradient-to-br from-brand-700 via-brand-600 to-brand-800 p-10 text-white md:flex">
          {/* Textura decorativa */}
          <div
            className="pointer-events-none absolute inset-0 opacity-20"
            style={{
              backgroundImage:
                'radial-gradient(circle at 20% 20%, rgba(255,255,255,0.25) 0, transparent 40%), radial-gradient(circle at 80% 80%, rgba(255,255,255,0.15) 0, transparent 40%)',
            }}
            aria-hidden="true"
          />
          <div className="relative flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white shadow-sm">
              <AppLogo className="h-8 w-8" />
            </div>
            <span className="text-xl font-semibold tracking-tight">KYC</span>
          </div>

          <div className="relative">
            <AuthCarousel />
          </div>

          <div className="relative">
            <div className="rounded-lg bg-white/95 px-3 py-2 shadow-sm inline-flex">
              <PoweredByDecal />
            </div>
          </div>
        </aside>

        {/* Panel del formulario */}
        <div className="flex flex-col justify-center p-8 sm:p-10">
          {/* Selector de idioma (disponible sin sesión) */}
          <div className="mb-4 flex justify-end">
            <LanguageSwitcher />
          </div>

          {/* Marca en móvil (cuando el panel lateral está oculto) */}
          <div className="mb-6 flex items-center gap-2.5 md:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand-50">
              <AppLogo className="h-7 w-7" />
            </div>
            <span className="text-lg font-semibold text-slate-800">KYC</span>
          </div>

          <div className="mb-6">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>

          {children}

          <div className="mt-6 text-center text-sm text-slate-600">{footer}</div>

          <div className="mt-6 flex justify-center md:hidden">
            <PoweredByDecal />
          </div>
        </div>
      </div>
    </div>
  );
}
