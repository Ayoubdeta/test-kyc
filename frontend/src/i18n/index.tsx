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
import { DEFAULT_LANG, dirOf, isLang, STORAGE_KEY, type Lang } from './config';
import ar from './locales/ar.json';
import ca from './locales/ca.json';
import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import zh from './locales/zh.json';

type Dict = Record<string, string>;

// Diccionarios por idioma. `es` es la base y el fallback.
const DICTS: Record<Lang, Dict> = { es, ca, en, de, fr, ar, zh };

export interface I18nContextValue {
  lang: Lang;
  dir: 'ltr' | 'rtl';
  setLang: (lang: Lang) => void;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

/** Idioma inicial antes de conocer la sesión: localStorage → navegador → es. */
function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLang(stored)) return stored;
  } catch {
    // localStorage puede fallar (modo privado); seguimos con el resto.
  }
  const nav = typeof navigator !== 'undefined' ? navigator.language.slice(0, 2) : '';
  if (isLang(nav)) return nav;
  return DEFAULT_LANG;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const { me } = useAuth();
  const [lang, setLangState] = useState<Lang>(initialLang);
  // Id del usuario cuya preferencia ya hemos adoptado (evita repetir en cada render).
  const adoptedFor = useRef<string | null>(null);

  // Al iniciar sesión, adoptamos el idioma guardado en el perfil (fuente de
  // verdad entre dispositivos). Se hace una vez por usuario.
  useEffect(() => {
    const userId = me?.user.id ?? null;
    const profileLang = me?.profile.language;
    if (userId && userId !== adoptedFor.current && isLang(profileLang)) {
      adoptedFor.current = userId;
      setLangState(profileLang);
    }
    if (!userId) adoptedFor.current = null;
  }, [me?.user.id, me?.profile.language]);

  // Refleja el idioma en <html lang/dir> (incluido el RTL del árabe).
  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dirOf(lang);
  }, [lang]);

  const setLang = useCallback(
    (next: Lang) => {
      setLangState(next);
      try {
        localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Si localStorage no está disponible, el cambio vale para esta sesión.
      }
      // Si hay sesión, persistimos en el perfil (fire-and-forget: no bloquea la UI).
      if (me) {
        void userApi.setLanguage(next).catch(() => undefined);
      }
    },
    [me],
  );

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>): string => {
      const template = DICTS[lang]?.[key] ?? DICTS[DEFAULT_LANG][key] ?? key;
      if (!vars) return template;
      return template.replace(/\{(\w+)\}/g, (_m, name: string) =>
        name in vars ? String(vars[name]) : `{${name}}`,
      );
    },
    [lang],
  );

  const value = useMemo<I18nContextValue>(
    () => ({ lang, dir: dirOf(lang), setLang, t }),
    [lang, setLang, t],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** Acceso tipado al contexto de i18n. */
export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error('useI18n debe usarse dentro de <I18nProvider>');
  }
  return ctx;
}
