import type { DocumentStatus, Role } from '../types';
import {
  ROLE_BADGE_CLASSES,
  ROLE_LABELS,
  STATUS_BADGE_CLASSES,
  STATUS_LABELS,
} from '../lib/roles';

const BASE = 'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold';

export function RoleBadge({ role }: { role: Role }) {
  return <span className={`${BASE} ${ROLE_BADGE_CLASSES[role]}`}>{ROLE_LABELS[role]}</span>;
}

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return <span className={`${BASE} ${STATUS_BADGE_CLASSES[status]}`}>{STATUS_LABELS[status]}</span>;
}
