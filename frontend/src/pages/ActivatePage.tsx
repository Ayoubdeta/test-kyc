import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { getApiErrorMessage } from '../api/client';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { useI18n } from '../i18n';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../layouts/AuthLayout';

type FieldErrors = Partial<Record<'password' | 'confirmPassword' | 'accept', string>>;

export function ActivatePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { activate } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const validatePassword = (pw: string): string | null => {
    if (pw.length < 8) return t('activate.pwMin');
    if (!/[a-z]/.test(pw)) return t('activate.pwLower');
    if (!/[A-Z]/.test(pw)) return t('activate.pwUpper');
    if (!/[0-9]/.test(pw)) return t('activate.pwDigit');
    return null;
  };

  const [values, setValues] = useState({ password: '', confirmPassword: '' });
  const [acceptPrivacy, setAcceptPrivacy] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Validamos el token y mostramos a quién pertenece el enlace.
  const info = useQuery({
    queryKey: ['activation', token],
    queryFn: () => authApi.activationInfo(token),
    enabled: token.length > 0,
    retry: false,
  });

  const handleChange = (field: keyof typeof values) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => setValues((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const errors: FieldErrors = {};
    const pwError = validatePassword(values.password);
    if (pwError) errors.password = pwError;
    if (values.confirmPassword !== values.password) {
      errors.confirmPassword = t('activate.mismatch');
    }
    if (!acceptPrivacy || !acceptTerms) {
      errors.accept = t('activate.acceptError');
    }
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      await activate({ token, password: values.password, acceptPrivacy, acceptTerms });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(getApiErrorMessage(err, t('activate.error')));
    } finally {
      setSubmitting(false);
    }
  };

  const loginFooter = (
    <span className="text-slate-500 dark:text-slate-400">
      {t('activate.footer')}
      <Link to="/login" className="font-semibold text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-400">
        {t('activate.footerLink')}
      </Link>
    </span>
  );

  // Enlace ausente o inválido/caducado.
  if (!token || info.isError) {
    return (
      <AuthLayout
        title={t('activate.invalidTitle')}
        subtitle={t('activate.invalidSubtitle')}
        footer={loginFooter}
      >
        <Alert>{!token ? t('activate.missingToken') : t('activate.invalidToken')}</Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title={t('activate.title')}
      subtitle={
        info.data
          ? t('activate.welcome', { name: info.data.razonSocial })
          : t('activate.subtitle')
      }
      footer={loginFooter}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <Alert>{formError}</Alert>}

        {info.data && (
          <p className="rounded-lg bg-slate-50 dark:bg-slate-800 px-3 py-2 text-sm text-slate-600 dark:text-slate-300">
            {t('activate.account')}{' '}
            <span className="font-medium text-slate-800 dark:text-slate-100">{info.data.email}</span>
          </p>
        )}

        <TextField
          label={t('activate.password')}
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange('password')}
          error={fieldErrors.password}
        />
        <TextField
          label={t('activate.confirmPassword')}
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={handleChange('confirmPassword')}
          error={fieldErrors.confirmPassword}
        />

        <label className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={acceptPrivacy}
            onChange={(e) => setAcceptPrivacy(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 dark:text-brand-400 focus:ring-brand-500"
          />
          <span>{t('activate.acceptPrivacy')}</span>
        </label>
        <label className="flex items-start gap-2.5 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 dark:border-slate-600 text-brand-600 dark:text-brand-400 focus:ring-brand-500"
          />
          <span>{t('activate.acceptTerms')}</span>
        </label>
        {fieldErrors.accept && <p className="-mt-2 text-sm text-red-600 dark:text-red-400">{fieldErrors.accept}</p>}

        <Button type="submit" isLoading={submitting} className="mt-2 w-full">
          {t('activate.submit')}
        </Button>
      </form>
    </AuthLayout>
  );
}
