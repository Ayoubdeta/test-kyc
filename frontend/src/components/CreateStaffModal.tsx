import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi, type CreateClientResult, type StaffRole } from '../api/admin.api';
import { getApiErrorMessage } from '../api/client';
import { useI18n } from '../i18n';
import { roleLabel } from '../i18n/labels';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { TextField } from './ui/TextField';

const USERS_KEY = ['admin', 'users'] as const;

// Roles internos que se pueden dar de alta desde aquí (no incluye 'cliente').
const STAFF_ROLE_VALUES: StaffRole[] = ['compliance', 'direccion', 'admin'];

export function CreateStaffModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [values, setValues] = useState({
    fullName: '',
    email: '',
    role: 'compliance' as StaffRole,
  });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateClientResult | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (field: keyof typeof values) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const create = useMutation({
    mutationFn: () => adminApi.createStaff(values),
    onSuccess: async (data) => {
      setResult(data);
      await queryClient.invalidateQueries({ queryKey: USERS_KEY });
    },
    onError: (err) => setError(getApiErrorMessage(err, t('cc.errCreate'))),
  });

  const activationLink = result
    ? `${window.location.origin}/activate?token=${result.activationToken}`
    : '';

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(activationLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t('cc.copyError'));
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate();
  };

  return (
    <Modal open title={t('cs.title')} onClose={onClose}>
      {result ? (
        // Éxito: mostramos el enlace de activación para compartirlo.
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            {t('cs.createdLead')} {t('cc.createdShare')}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-500">{t('cc.activationLink')}</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={activationLink}
                onFocus={(e) => e.target.select()}
                className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none"
              />
              <Button variant="ghost" onClick={copyLink}>
                {copied ? t('cc.copied') : t('cc.copy')}
              </Button>
            </div>
            <p className="text-xs text-slate-400">{t('cc.linkExpires')}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>{t('cc.done')}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}

          <TextField
            label={t('cs.fullName')}
            name="fullName"
            value={values.fullName}
            onChange={set('fullName')}
          />
          <TextField
            label={t('cc.email')}
            name="email"
            type="email"
            value={values.email}
            onChange={set('email')}
          />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="staffRole" className="text-sm font-medium text-slate-700">
              {t('cs.role')}
            </label>
            <select
              id="staffRole"
              value={values.role}
              onChange={set('role')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            >
              {STAFF_ROLE_VALUES.map((r) => (
                <option key={r} value={r}>
                  {roleLabel(t, r)}
                </option>
              ))}
            </select>
          </div>

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} type="button">
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={create.isPending}>
              {t('cs.create')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
