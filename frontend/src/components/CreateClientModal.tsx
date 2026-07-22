import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi, type ClientType, type CreateClientResult } from '../api/admin.api';
import { getApiErrorMessage } from '../api/client';
import { useI18n } from '../i18n';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { TextField } from './ui/TextField';

const USERS_KEY = ['admin', 'users'] as const;

const CLIENT_TYPE_VALUES: ClientType[] = ['empresa', 'autonomo', 'particular'];

export function CreateClientModal({ onClose }: { onClose: () => void }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const [values, setValues] = useState({
    razonSocial: '',
    cif: '',
    clientType: 'empresa' as ClientType,
    comercialAsignado: '',
    email: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<CreateClientResult | null>(null);
  const [copied, setCopied] = useState(false);

  const set = (field: keyof typeof values) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const create = useMutation({
    mutationFn: () => adminApi.createClient(values),
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
    <Modal open title={t('cc.title')} onClose={onClose}>
      {result ? (
        // Éxito: mostramos el enlace de activación para compartirlo.
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-green-50 dark:bg-green-500/10 px-4 py-3 text-sm text-green-800 dark:text-green-300">
            {t('cc.createdLead')} <strong>{t('cc.expedientePending')}</strong>. {t('cc.createdShare')}
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-500 dark:text-slate-400">{t('cc.activationLink')}</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={activationLink}
                onFocus={(e) => e.target.select()}
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-600 bg-slate-50 dark:bg-slate-800 px-3 py-2 text-xs text-slate-700 dark:text-slate-200 outline-none"
              />
              <Button variant="ghost" onClick={copyLink}>
                {copied ? t('cc.copied') : t('cc.copy')}
              </Button>
            </div>
            <p className="text-xs text-slate-400 dark:text-slate-500">{t('cc.linkExpires')}</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>{t('cc.done')}</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}

          <TextField
            label={t('cc.razonSocial')}
            name="razonSocial"
            value={values.razonSocial}
            onChange={set('razonSocial')}
          />
          <TextField label={t('cc.cif')} name="cif" value={values.cif} onChange={set('cif')} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="clientType" className="text-sm font-medium text-slate-700 dark:text-slate-200">
              {t('cc.clientType')}
            </label>
            <select
              id="clientType"
              value={values.clientType}
              onChange={set('clientType')}
              className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CLIENT_TYPE_VALUES.map((ct) => (
                <option key={ct} value={ct}>
                  {t(`clientType.${ct}`)}
                </option>
              ))}
            </select>
          </div>

          <TextField
            label={t('cc.comercial')}
            name="comercialAsignado"
            value={values.comercialAsignado}
            onChange={set('comercialAsignado')}
          />
          <TextField
            label={t('cc.email')}
            name="email"
            type="email"
            value={values.email}
            onChange={set('email')}
          />

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} type="button">
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={create.isPending}>
              {t('cc.create')}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
