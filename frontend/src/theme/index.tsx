import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { userApi } from '../api/user.api';
import { useAuth } from '../hooks/useAuth';
import {
  DEFAULT_THEME,
  isTheme,
  THEME_STORAGE_KEY,
  type EffectiveTheme,
  type Theme,
} from './config';

export interface ThemeContextValue {
  /** Preferencia elegida por el usuario (light / dark / system). */
  theme: Theme;
  /** Tema realmente aplicado al DOM (light / dark), ya resuelto el 'system'. */
  effective: EffectiveTheme;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const DARK_QUERY = '(prefers-color-scheme: dark)';

function systemPrefersDark(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(DARK_QUERY).matches
  );
}

/** Resuelve la preferencia a un tema concreto (light/dark). */
function resolve(theme: Theme): EffectiveTheme {
  if (theme === 'system') return systemPrefersDark() ? 'dark' : 'light';
  return theme;
}

/** Preferencia inicial antes de conocer la sesión: localStorage → system. */
function initialTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (isTheme(stored)) return stored;
  } catch {
    // localStorage puede fallar (modo privado); usamos el valor por defecto.
  }
  return DEFAULT_THEME;
}

/** Aplica el tema resuelto al <html> (clase `dark` + color-scheme nativo). */
function applyToDom(effective: EffectiveTheme): void {
  const root = document.documentElement;
  root.classList.toggle('dark', effective === 'dark');
  // Ajusta también los controles nativos (scrollbars, inputs de fecha, etc.).
  root.style.colorScheme = effective;
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const [theme, setThemeState] = useState<Theme>(initialTheme);
  const [effective, setEffective] = useState<EffectiveTheme>(() => resolve(initialTheme()));
  // Usuario cuya preferencia ya hemos adoptado (evita repetir en cada render).
  const adoptedFor = useRef<string | null>(null);

  // Al iniciar sesión, adoptamos el tema guardado en el perfil (fuente de
  // verdad entre dispositivos). Una vez por usuario.
  useEffect(() => {
    const userId = me?.user.id ?? null;
    const profileTheme = me?.profile.theme;
    if (userId && userId !== adoptedFor.current && isTheme(profileTheme)) {
      adoptedFor.current = userId;
      setThemeState(profileTheme);
    }
    if (!userId) adoptedFor.current = null;
  }, [me?.user.id, me?.profile.theme]);

  // Aplica el tema al DOM cada vez que cambia la preferencia.
  useEffect(() => {
    const next = resolve(theme);
    setEffective(next);
    applyToDom(next);
  }, [theme]);

  // Si la preferencia es 'system', reaccionamos a los cambios del SO en vivo.
  useEffect(() => {
    if (theme !== 'system' || typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(DARK_QUERY);
    const onChange = () => {
      const next: EffectiveTheme = mq.matches ? 'dark' : 'light';
      setEffective(next);
      applyToDom(next);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [theme]);

  const setTheme = useCallback(
    (next: Theme) => {
      setThemeState(next);
      try {
        localStorage.setItem(THEME_STORAGE_KEY, next);
      } catch {
        // Si localStorage no está disponible, el cambio vale para esta sesión.
      }
      // Con sesión, persistimos en el perfil (fire-and-forget: no bloquea la UI).
      if (me) {
        void userApi.setTheme(next).catch(() => undefined);
      }
    },
    [me],
  );

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, effective, setTheme }),
    [theme, effective, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Acceso tipado al contexto de tema. */
export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme debe usarse dentro de <ThemeProvider>');
  }
  return ctx;
}
