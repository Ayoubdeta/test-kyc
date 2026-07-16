import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/auth.api';
import { getApiErrorMessage } from '../api/client';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../layouts/AuthLayout';

type FieldErrors = Partial<Record<'password' | 'confirmPassword' | 'accept', string>>;

function validatePassword(pw: string): string | null {
  if (pw.length < 8) return 'Mínimo 8 caracteres';
  if (!/[a-z]/.test(pw)) return 'Incluye una minúscula';
  if (!/[A-Z]/.test(pw)) return 'Incluye una mayúscula';
  if (!/[0-9]/.test(pw)) return 'Incluye un número';
  return null;
}

export function ActivatePage() {
  const [params] = useSearchParams();
  const token = params.get('token') ?? '';
  const { activate } = useAuth();
  const navigate = useNavigate();

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
      errors.confirmPassword = 'Las contraseñas no coinciden';
    }
    if (!acceptPrivacy || !acceptTerms) {
      errors.accept = 'Debes aceptar la Política de Privacidad y los Términos y Condiciones';
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
      setFormError(getApiErrorMessage(err, 'No se pudo activar la cuenta'));
    } finally {
      setSubmitting(false);
    }
  };

  const loginFooter = (
    <span className="text-slate-500">
      ¿Ya tienes acceso?{' '}
      <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
        Inicia sesión
      </Link>
    </span>
  );

  // Enlace ausente o inválido/caducado.
  if (!token || info.isError) {
    return (
      <AuthLayout
        title="Enlace no válido"
        subtitle="No hemos podido validar tu invitación"
        footer={loginFooter}
      >
        <Alert>
          {!token
            ? 'Falta el token de activación en el enlace.'
            : 'El enlace de activación no es válido o ha caducado. Pide a tu gestor de Decal uno nuevo.'}
        </Alert>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Activa tu cuenta"
      subtitle={
        info.data
          ? `Bienvenido, ${info.data.razonSocial}. Crea tu contraseña para acceder.`
          : 'Crea tu contraseña para acceder'
      }
      footer={loginFooter}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <Alert>{formError}</Alert>}

        {info.data && (
          <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
            Cuenta: <span className="font-medium text-slate-800">{info.data.email}</span>
          </p>
        )}

        <TextField
          label="Contraseña"
          name="password"
          type="password"
          autoComplete="new-password"
          value={values.password}
          onChange={handleChange('password')}
          error={fieldErrors.password}
        />
        <TextField
          label="Confirmar contraseña"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          value={values.confirmPassword}
          onChange={handleChange('confirmPassword')}
          error={fieldErrors.confirmPassword}
        />

        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={acceptPrivacy}
            onChange={(e) => setAcceptPrivacy(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>Acepto la Política de Privacidad</span>
        </label>
        <label className="flex items-start gap-2.5 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={acceptTerms}
            onChange={(e) => setAcceptTerms(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          <span>Acepto los Términos y Condiciones</span>
        </label>
        {fieldErrors.accept && <p className="-mt-2 text-sm text-red-600">{fieldErrors.accept}</p>}

        <Button type="submit" isLoading={submitting} className="mt-2 w-full">
          Activar cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
