import type { DocumentStatus, Role } from '../types';
import { ROLE_BADGE_CLASSES, STATUS_BADGE_CLASSES } from '../lib/roles';
import { useI18n } from '../i18n';
import { roleLabel, statusLabel } from '../i18n/labels';

const BASE = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';

export function RoleBadge({ role }: { role: Role }) {
  const { t } = useI18n();
  return <span className={`${BASE} ${ROLE_BADGE_CLASSES[role]}`}>{roleLabel(t, role)}</span>;
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  const { t } = useI18n();
  return (
    <span className={`${BASE} ${STATUS_BADGE_CLASSES[status]}`}>{statusLabel(t, status)}</span>
  );
}
