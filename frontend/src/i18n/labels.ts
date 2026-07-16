// Helpers para traducir etiquetas basadas en datos (estados, roles, tipos de
// documento, eventos). Los mapas de COLOR siguen en lib/roles.ts y
// lib/documents.ts (no dependen del idioma); aquí solo el texto.
//
// Se pasan la función `t` porque estos helpers se llaman desde componentes que
// ya tienen acceso a useI18n().

type Translate = (key: string, vars?: Record<string, string | number>) => string;

export function statusLabel(t: Translate, status: string): string {
  return t(`status.${status}`);
}

export function roleLabel(t: Translate, role: string): string {
  return t(`role.${role}`);
}

export function docTypeLabel(t: Translate, key: string | null): string {
  return key ? t(`doctype.${key}`) : t('doctype.other');
}

export function eventLabel(t: Translate, type: string): string {
  return t(`event.${type}`);
}

export function logActionLabel(t: Translate, action: string): string {
  return t(`log.${action}`);
}
