import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { adminApi, type AdminUpdateUserPayload } from '../api/admin.api';
import { getApiErrorMessage } from '../api/client';
import { useI18n } from '../i18n';
import { roleLabel } from '../i18n/labels';
import { ALL_ROLES } from '../lib/roles';
import { adminUserSchema, resetPasswordSchema } from '../validators/adminUser';
import type { Role } from '../types';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { TextArea } from './ui/TextArea';
import { TextField } from './ui/TextField';
import { UserDocumentsPanel } from './UserDocumentsPanel';
import { UserHistoryPanel } from './UserHistoryPanel';

type Tab = 'cuenta' | 'documentos' | 'historial';

interface Props {
  userId: string;
  isSelf: boolean;
  onClose: () => void;
}

type FormValues = {
  username: string;
  email: string;
  role: Role;
  fullName: string;
  phone: string;
  address: string;
  birthDate: string;
  bio: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const EMPTY: FormValues = {
  username: '',
  email: '',
  role: 'cliente',
  fullName: '',
  phone: '',
  address: '',
  birthDate: '',
  bio: '',
};

export function AdminUserEditModal({ userId, isSelf, onClose }: Props) {
  const { t } = useI18n();
  const queryClient = useQueryClient();

  const [values, setValues] = useState<FormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [newPassword, setNewPassword] = useState('');
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [tab, setTab] = useState<Tab>('cuenta');

  // Carga los datos actuales del usuario para prefill.
  const { data, isLoading } = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: () => adminApi.getUser(userId),
  });

  useEffect(() => {
    if (data) {
      setValues({
        username: data.user.username,
        email: data.user.email,
        role: data.user.role,
        fullName: data.profile.fullName ?? '',
        phone: data.profile.phone ?? '',
        address: data.profile.address ?? '',
        birthDate: data.profile.birthDate ?? '',
        bio: data.profile.bio ?? '',
      });
    }
  }, [data]);

  const invalidateUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    if (isSelf) await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
  };

  const updateMutation = useMutation({
    mutationFn: (payload: AdminUpdateUserPayload) => adminApi.updateUser(userId, payload),
    onSuccess: async () => {
      await invalidateUsers();
      setSuccess(t('eu.saved'));
    },
    onError: (err) => setError(getApiErrorMessage(err, t('eu.errSave'))),
  });

  const passwordMutation = useMutation({
    mutationFn: (password: string) => adminApi.resetPassword(userId, password),
    onSuccess: () => {
      setNewPassword('');
      setSuccess(t('eu.pwResetOk'));
    },
    onError: (err) => setPasswordError(getApiErrorMessage(err, t('eu.errReset'))),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteUser(userId),
    onSuccess: async () => {
      await invalidateUsers();
      onClose();
    },
    onError: (err) => setError(getApiErrorMessage(err, t('eu.errDelete'))),
  });

  const handleChange = (field: keyof FormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(null);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    const parsed = adminUserSchema.safeParse(values);
    if (!parsed.success) {
      const errs: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!errs[key]) errs[key] = issue.message;
      }
      setFieldErrors(errs);
      return;
    }
    setFieldErrors({});
    updateMutation.mutate(parsed.data);
  };

  const handleResetPassword = () => {
    setPasswordError(null);
    setSuccess(null);
    const parsed = resetPasswordSchema.safeParse({ password: newPassword });
    if (!parsed.success) {
      setPasswordError(parsed.error.issues[0]?.message ?? t('eu.pwInvalid'));
      return;
    }
    passwordMutation.mutate(newPassword);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex animate-fade-in items-start justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t('eu.title')}
      onClick={onClose}
    >
      <div
        className="my-8 w-full max-w-lg animate-scale-in rounded-2xl bg-white dark:bg-slate-900 p-6 shadow-elevated"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-50">{t('eu.title')}</h2>
          <button
            onClick={onClose}
            className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300"
            aria-label={t('eu.close')}
          >
            ✕
          </button>
        </div>

        {/* Pestañas: cuenta / documentos / historial */}
        <div className="mb-5 flex gap-1 border-b border-slate-200 dark:border-slate-700">
          {([
            ['cuenta', t('eu.tabAccount')],
            ['documentos', t('eu.tabDocuments')],
            ['historial', t('eu.tabHistory')],
          ] as [Tab, string][]).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`-mb-px border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? 'border-brand-600 text-brand-700 dark:text-brand-400'
                  : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {tab === 'documentos' && <UserDocumentsPanel userId={userId} />}
        {tab === 'historial' && <UserHistoryPanel userId={userId} />}

        {tab === 'cuenta' &&
          (isLoading ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">{t('common.loading')}</p>
          ) : (
            <div className="flex flex-col gap-6">
            {error && <Alert>{error}</Alert>}
            {success && <Alert variant="info">{success}</Alert>}

            {/* Datos de cuenta + perfil */}
            <form onSubmit={handleSave} className="flex flex-col gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label={t('eu.username')}
                  name="username"
                  value={values.username}
                  onChange={handleChange('username')}
                  error={fieldErrors.username}
                />
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="role" className="text-sm font-medium text-slate-700 dark:text-slate-200">
                    {t('eu.role')}
                  </label>
                  <select
                    id="role"
                    className="rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500 disabled:opacity-60"
                    value={values.role}
                    disabled={isSelf}
                    onChange={handleChange('role')}
                  >
                    {ALL_ROLES.map((role) => (
                      <option key={role} value={role}>
                        {roleLabel(t, role)}
                      </option>
                    ))}
                  </select>
                  {isSelf && (
                    <span className="text-xs text-slate-400 dark:text-slate-500">{t('eu.cantChangeOwnRole')}</span>
                  )}
                </div>
              </div>

              <TextField
                label={t('eu.email')}
                name="email"
                type="email"
                value={values.email}
                onChange={handleChange('email')}
                error={fieldErrors.email}
              />
              <TextField
                label={t('eu.fullName')}
                name="fullName"
                value={values.fullName}
                onChange={handleChange('fullName')}
                error={fieldErrors.fullName}
              />
              <div className="grid gap-4 sm:grid-cols-2">
                <TextField
                  label={t('eu.phone')}
                  name="phone"
                  value={values.phone}
                  onChange={handleChange('phone')}
                  error={fieldErrors.phone}
                />
                <TextField
                  label={t('eu.birthDate')}
                  name="birthDate"
                  type="date"
                  value={values.birthDate}
                  onChange={handleChange('birthDate')}
                  error={fieldErrors.birthDate}
                />
              </div>
              <TextField
                label={t('eu.address')}
                name="address"
                value={values.address}
                onChange={handleChange('address')}
                error={fieldErrors.address}
              />
              <TextArea
                label={t('eu.bio')}
                name="bio"
                value={values.bio}
                onChange={handleChange('bio')}
                error={fieldErrors.bio}
              />
              <div className="flex justify-end">
                <Button type="submit" isLoading={updateMutation.isPending}>
                  {t('eu.save')}
                </Button>
              </div>
            </form>

            {/* Restablecer contraseña */}
            <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
              <h3 className="mb-2 text-sm font-semibold text-slate-800 dark:text-slate-100">{t('eu.resetPwTitle')}</h3>
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <TextField
                    label={t('eu.newPassword')}
                    name="newPassword"
                    type="text"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    error={passwordError ?? undefined}
                    placeholder={t('eu.newPasswordPlaceholder')}
                  />
                </div>
                <Button
                  variant="ghost"
                  onClick={handleResetPassword}
                  isLoading={passwordMutation.isPending}
                >
                  {t('eu.reset')}
                </Button>
              </div>
            </div>

            {/* Eliminar usuario */}
            {!isSelf && (
              <div className="border-t border-slate-200 dark:border-slate-700 pt-5">
                <h3 className="mb-2 text-sm font-semibold text-red-700 dark:text-red-400">{t('eu.dangerZone')}</h3>
                {confirmingDelete ? (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-slate-600 dark:text-slate-300">{t('eu.confirmDelete')}</span>
                    <Button
                      variant="danger"
                      onClick={() => deleteMutation.mutate()}
                      isLoading={deleteMutation.isPending}
                    >
                      {t('eu.confirmDeleteYes')}
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmingDelete(false)}>
                      {t('common.cancel')}
                    </Button>
                  </div>
                ) : (
                  <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
                    {t('eu.deleteUser')}
                  </Button>
                )}
              </div>
            )}
          </div>
          ))}
      </div>
    </div>
  );
}
