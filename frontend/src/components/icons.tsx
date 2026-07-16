import type { ReactNode } from 'react';
import type { DocumentEventType, DocumentTypeKey, NotificationType } from '../types';

interface IconProps {
  className?: string;
}

// Envoltorio común: iconos de línea (stroke) que heredan color y tamaño del
// contenedor vía `currentColor` y la clase que se pase.
function S({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {children}
    </svg>
  );
}

export const CheckCircleIcon = ({ className }: IconProps) => (
  <S className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m9 12 2 2 4-4" />
  </S>
);

export const XCircleIcon = ({ className }: IconProps) => (
  <S className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="m15 9-6 6" />
    <path d="m9 9 6 6" />
  </S>
);

export const SearchIcon = ({ className }: IconProps) => (
  <S className={className}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </S>
);

export const InboxIcon = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M22 12h-6l-2 3h-4l-2-3H2" />
    <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
  </S>
);

export const AlertTriangleIcon = ({ className }: IconProps) => (
  <S className={className}>
    <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
    <path d="M12 9v4" />
    <path d="M12 17h.01" />
  </S>
);

export const ClockIcon = ({ className }: IconProps) => (
  <S className={className}>
    <circle cx="12" cy="12" r="10" />
    <path d="M12 6v6l4 2" />
  </S>
);

export const FileTextIcon = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
    <path d="M16 13H8" />
    <path d="M16 17H8" />
    <path d="M10 9H8" />
  </S>
);

export const UploadIcon = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M17 8l-5-5-5 5" />
    <path d="M12 3v12" />
  </S>
);

export const HistoryIcon = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
    <path d="M12 7v5l4 2" />
  </S>
);

export const SettingsIcon = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </S>
);

export const LogOutIcon = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <path d="m16 17 5-5-5-5" />
    <path d="M21 12H9" />
  </S>
);

export const UserIcon = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </S>
);

export const IdCardIcon = ({ className }: IconProps) => (
  <S className={className}>
    <rect x="2" y="5" width="20" height="14" rx="2" />
    <path d="M16 10h2" />
    <path d="M16 14h2" />
    <path d="M6.5 15a3.2 3.2 0 0 1 5 0" />
    <circle cx="9" cy="10.5" r="1.6" />
  </S>
);

export const RefreshIcon = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </S>
);

export const BuildingIcon = ({ className }: IconProps) => (
  <S className={className}>
    <rect x="4" y="2" width="16" height="20" rx="2" />
    <path d="M9 22v-4h6v4" />
    <path d="M8 6h.01" />
    <path d="M16 6h.01" />
    <path d="M8 10h.01" />
    <path d="M16 10h.01" />
    <path d="M8 14h.01" />
    <path d="M16 14h.01" />
  </S>
);

export const LandmarkIcon = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M3 22h18" />
    <path d="M6 18v-7" />
    <path d="M10 18v-7" />
    <path d="M14 18v-7" />
    <path d="M18 18v-7" />
    <path d="M12 3 20 8H4Z" />
  </S>
);

export const ClipboardListIcon = ({ className }: IconProps) => (
  <S className={className}>
    <rect x="8" y="2" width="8" height="4" rx="1" />
    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
    <path d="M12 11h4" />
    <path d="M12 16h4" />
    <path d="M8 11h.01" />
    <path d="M8 16h.01" />
  </S>
);

export const SendIcon = ({ className }: IconProps) => (
  <S className={className}>
    <path d="m22 2-7 20-4-9-9-4Z" />
    <path d="M22 2 11 13" />
  </S>
);

export const FolderIcon = ({ className }: IconProps) => (
  <S className={className}>
    <path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z" />
  </S>
);

// ─── Mapas por dominio ───────────────────────────────────────────

// Icono representativo de cada tipo de documento KYC.
const DOC_TYPE_ICON: Record<DocumentTypeKey, (p: IconProps) => JSX.Element> = {
  dni_representante: IdCardIcon,
  cif_empresa: BuildingIcon,
  escritura_constitucion: FileTextIcon,
  poderes_representante: UserIcon,
  certificado_titularidad_bancaria: LandmarkIcon,
  declaracion_titularidad_real: ClipboardListIcon,
  contrato_decal: FileTextIcon,
};

export function DocTypeIcon({
  docType,
  className,
}: {
  docType: DocumentTypeKey | null;
  className?: string;
}) {
  const Cmp = docType ? DOC_TYPE_ICON[docType] : FileTextIcon;
  return <Cmp className={className} />;
}

// Icono de cada evento del historial.
const EVENT_ICON: Record<DocumentEventType, (p: IconProps) => JSX.Element> = {
  subido: UploadIcon,
  revisado: SearchIcon,
  aprobado: CheckCircleIcon,
  rechazado: XCircleIcon,
  caducado: ClockIcon,
};

export function EventIcon({ type, className }: { type: DocumentEventType; className?: string }) {
  const Cmp = EVENT_ICON[type];
  return <Cmp className={className} />;
}

// Icono de cada tipo de notificación.
const NOTIFICATION_ICON_CMP: Record<NotificationType, (p: IconProps) => JSX.Element> = {
  documento_aprobado: CheckCircleIcon,
  documento_rechazado: XCircleIcon,
  documento_caducado: ClockIcon,
  documento_por_caducar: AlertTriangleIcon,
  documento_para_aprobar: InboxIcon,
  documento_subido: SendIcon,
};

export function NotificationIcon({
  type,
  className,
}: {
  type: NotificationType;
  className?: string;
}) {
  const Cmp = NOTIFICATION_ICON_CMP[type];
  return <Cmp className={className} />;
}
