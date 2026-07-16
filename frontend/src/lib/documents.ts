import type { DocumentEventType, DocumentTypeKey, NotificationType } from '../types';

// Los 7 tipos de documento KYC obligatorios (deben coincidir con el backend).
// El icono de cada tipo se resuelve con <DocTypeIcon> (components/icons).
export const DOCUMENT_TYPES: { key: DocumentTypeKey; label: string }[] = [
  { key: 'dni_representante', label: 'DNI / NIE o Pasaporte del representante' },
  { key: 'cif_empresa', label: 'CIF / NIF de la empresa' },
  { key: 'escritura_constitucion', label: 'Escritura de constitución' },
  { key: 'poderes_representante', label: 'Poderes del representante' },
  { key: 'certificado_titularidad_bancaria', label: 'Certificado de titularidad bancaria' },
  { key: 'declaracion_titularidad_real', label: 'Declaración de titularidad real' },
  { key: 'contrato_decal', label: 'Contrato firmado con Decal' },
];

export function documentTypeLabel(key: DocumentTypeKey | null): string {
  if (!key) return 'Otro documento';
  return DOCUMENT_TYPES.find((t) => t.key === key)?.label ?? key;
}

/** Etiqueta y color del punto de cada evento del historial. El icono se
 *  resuelve con <EventIcon> (components/icons). */
export const EVENT_META: Record<DocumentEventType, { label: string; dot: string }> = {
  subido: { label: 'Subido', dot: 'bg-slate-400' },
  revisado: { label: 'Revisado (enviado a Dirección)', dot: 'bg-blue-500' },
  aprobado: { label: 'Aprobado', dot: 'bg-green-500' },
  rechazado: { label: 'Rechazado', dot: 'bg-red-500' },
  caducado: { label: 'Caducado', dot: 'bg-amber-500' },
};

// Destino al pulsar una notificación. Cada tipo es propio de un rol, así que
// el destino es inequívoco (un cliente nunca recibe "documento_subido", etc.).
export function notificationHref(type: NotificationType): string {
  switch (type) {
    case 'documento_subido':
      return '/review';
    case 'documento_para_aprobar':
      return '/approvals';
    case 'documento_aprobado':
    case 'documento_por_caducar':
      return '/documents';
    case 'documento_rechazado':
    case 'documento_caducado':
      return '/history';
    default:
      return '/dashboard';
  }
}
