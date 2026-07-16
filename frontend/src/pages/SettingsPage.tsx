import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { userApi, type UpdateProfilePayload } from '../api/user.api';
import { Avatar } from '../components/Avatar';
import { LanguageSwitcher } from '../components/LanguageSwitcher';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { TextArea } from '../components/ui/TextArea';
import { TextField } from '../components/ui/TextField';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ACCEPTED_IMAGE_TYPES, fileToCompressedDataUrl } from '../lib/image';
import { profileSchema } from '../validators/profile';

type FormValues = {
  fullName: string;
  phone: string;
  address: string;
  birthDate: string;
  bio: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

export function SettingsPage() {
  const { me } = useAuth();
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prefill con los datos actuales del perfil.
  const [values, setValues] = useState<FormValues>({
    fullName: me?.profile.fullName ?? '',
    phone: me?.profile.phone ?? '',
    address: me?.profile.address ?? '',
    birthDate: me?.profile.birthDate ?? '',
    bio: me?.profile.bio ?? '',
  });
  const [avatarUrl, setAvatarUrl] = useState<string | null>(me?.profile.avatarUrl ?? null);

  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: UpdateProfilePayload) => userApi.updateProfile(payload),
    onSuccess: async () => {
      // Refrescamos los datos de sesión para que el dashboard y la cabecera
      // reflejen los cambios.
      await queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      setSuccess(true);
    },
    onError: (err) => {
      setFormError(getApiErrorMessage(err, t('settings.saveError')));
    },
  });

  const handleChange = (field: keyof FormValues) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
    setSuccess(false);
  };

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setAvatarError(null);
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { dataUrl } = await fileToCompressedDataUrl(file);
      setAvatarUrl(dataUrl);
      setSuccess(false);
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : t('settings.photoError'));
    } finally {
      // Permite volver a elegir el mismo archivo si hace falta.
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccess(false);

    const parsed = profileSchema.safeParse(values);
    if (!parsed.success) {
      const errors: FieldErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FieldErrors;
        if (!errors[key]) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    mutation.mutate({
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      address: parsed.data.address,
      birthDate: parsed.data.birthDate,
      bio: parsed.data.bio,
      avatarUrl,
    });
  };

  const displayName = values.fullName || me?.user.username || '';

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-1 text-xl font-bold text-slate-900">{t('settings.title')}</h1>
        <p className="mb-6 text-sm text-slate-500">{t('settings.subtitle')}</p>

        {/* Idioma de la interfaz (se guarda en la cuenta) */}
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="mb-1 text-base font-semibold text-slate-800">
            {t('settings.languageTitle')}
          </h2>
          <p className="mb-4 text-sm text-slate-500">{t('settings.languageHint')}</p>
          <LanguageSwitcher />
        </section>

        <form onSubmit={handleSubmit} className="flex flex-col gap-6" noValidate>
          {formError && <Alert>{formError}</Alert>}
          {success && <Alert variant="info">{t('settings.saved')}</Alert>}

          {/* Foto de perfil */}
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-4 text-base font-semibold text-slate-800">
              {t('settings.photoTitle')}
            </h2>
            <div className="flex items-center gap-5">
              <Avatar src={avatarUrl} name={displayName} size="lg" />
              <div className="flex flex-col gap-2">
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    {avatarUrl ? t('settings.changePhoto') : t('settings.uploadPhoto')}
                  </Button>
                  {avatarUrl && (
                    <Button type="button" variant="danger" onClick={() => setAvatarUrl(null)}>
                      {t('settings.remove')}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-slate-500">{t('settings.photoHint')}</p>
                {avatarError && <p className="text-xs text-red-600">{avatarError}</p>}
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                className="hidden"
                onChange={handleAvatarPick}
              />
            </div>
          </section>

          {/* Datos personales */}
          <section className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-base font-semibold text-slate-800">
              {t('settings.personalTitle')}
            </h2>

            <TextField
              label={t('settings.fullName')}
              name="fullName"
              value={values.fullName}
              onChange={handleChange('fullName')}
              error={fieldErrors.fullName}
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField
                label={t('settings.phone')}
                name="phone"
                type="tel"
                value={values.phone}
                onChange={handleChange('phone')}
                error={fieldErrors.phone}
              />
              <TextField
                label={t('settings.birthDate')}
                name="birthDate"
                type="date"
                value={values.birthDate}
                onChange={handleChange('birthDate')}
                error={fieldErrors.birthDate}
              />
            </div>
            <TextField
              label={t('settings.address')}
              name="address"
              value={values.address}
              onChange={handleChange('address')}
              error={fieldErrors.address}
            />
            <TextArea
              label={t('settings.bio')}
              name="bio"
              value={values.bio}
              onChange={handleChange('bio')}
              error={fieldErrors.bio}
            />
          </section>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={() => navigate('/dashboard')}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" isLoading={mutation.isPending}>
              {t('common.save')}
            </Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
