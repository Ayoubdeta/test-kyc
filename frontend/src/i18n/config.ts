// Idiomas soportados por la interfaz. `dir` controla la dirección del texto
// (árabe es RTL). Debe coincidir con SUPPORTED_LANGUAGES del backend.
export const LANGUAGES = [
  { code: 'es', dir: 'ltr' },
  { code: 'ca', dir: 'ltr' },
  { code: 'en', dir: 'ltr' },
  { code: 'de', dir: 'ltr' },
  { code: 'fr', dir: 'ltr' },
  { code: 'ar', dir: 'rtl' },
  { code: 'zh', dir: 'ltr' },
] as const;

export type Lang = (typeof LANGUAGES)[number]['code'];

export const DEFAULT_LANG: Lang = 'es';
export const STORAGE_KEY = 'kyc_lang';

const CODES = LANGUAGES.map((l) => l.code) as readonly string[];

/** True si el valor es uno de los idiomas soportados. */
export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && CODES.includes(value);
}

/** Dirección del texto ('rtl' para árabe, 'ltr' para el resto). */
export function dirOf(lang: Lang): 'ltr' | 'rtl' {
  return LANGUAGES.find((l) => l.code === lang)?.dir ?? 'ltr';
}
