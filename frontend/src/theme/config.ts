// Preferencias de tema. Debe coincidir con SUPPORTED_THEMES del backend.
// 'system' sigue el tema del sistema operativo (prefers-color-scheme).
export const THEMES = ['light', 'dark', 'system'] as const;

export type Theme = (typeof THEMES)[number];
/** Tema resuelto que se aplica realmente al DOM (nunca 'system'). */
export type EffectiveTheme = 'light' | 'dark';

export const DEFAULT_THEME: Theme = 'system';
export const THEME_STORAGE_KEY = 'kyc_theme';

const VALUES = THEMES as readonly string[];

/** True si el valor es uno de los temas soportados. */
export function isTheme(value: unknown): value is Theme {
  return typeof value === 'string' && VALUES.includes(value);
}
