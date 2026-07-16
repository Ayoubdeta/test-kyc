import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getApiErrorMessage } from '../api/client';
import { Alert } from '../components/ui/Alert';
import { Button } from '../components/ui/Button';
import { TextField } from '../components/ui/TextField';
import { useAuth } from '../hooks/useAuth';
import { AuthLayout } from '../layouts/AuthLayout';
import { registerSchema } from '../validators/auth';

type FormValues = {
  username: string;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  birthDate: string;
  password: string;
  confirmPassword: string;
};

type FieldErrors = Partial<Record<keyof FormValues, string>>;

const INITIAL: FormValues = {
  username: '',
  fullName: '',
  email: '',
  phone: '',
  address: '',
  birthDate: '',
  password: '',
  confirmPassword: '',
};

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [values, setValues] = useState<FormValues>(INITIAL);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (field: keyof FormValues) => (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    const parsed = registerSchema.safeParse(values);
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

    setSubmitting(true);
    try {
      await register({
        username: parsed.data.username,
        email: parsed.data.email,
        password: parsed.data.password,
        fullName: parsed.data.fullName,
        phone: parsed.data.phone,
        address: parsed.data.address,
        birthDate: parsed.data.birthDate,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      setFormError(getApiErrorMessage(err, 'No se pudo crear la cuenta'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      size="lg"
      title="Crea tu cuenta"
      subtitle="Completa tus datos para registrarte"
      footer={
        <>
          ¿Ya tienes cuenta?{' '}
          <Link to="/login" className="font-semibold text-brand-600 hover:text-brand-700">
            Inicia sesión
          </Link>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
        {formError && <Alert>{formError}</Alert>}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Nombre de usuario"
            name="username"
            autoComplete="username"
            value={values.username}
            onChange={handleChange('username')}
            error={fieldErrors.username}
          />
          <TextField
            label="Nombre completo"
            name="fullName"
            autoComplete="name"
            value={values.fullName}
            onChange={handleChange('fullName')}
            error={fieldErrors.fullName}
          />
        </div>

        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          value={values.email}
          onChange={handleChange('email')}
          error={fieldErrors.email}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Teléfono"
            name="phone"
            type="tel"
            autoComplete="tel"
            placeholder="+34 600 000 000"
            value={values.phone}
            onChange={handleChange('phone')}
            error={fieldErrors.phone}
          />
          <TextField
            label="Fecha de nacimiento"
            name="birthDate"
            type="date"
            autoComplete="bday"
            value={values.birthDate}
            onChange={handleChange('birthDate')}
            error={fieldErrors.birthDate}
          />
        </div>

        <TextField
          label="Dirección"
          name="address"
          autoComplete="street-address"
          placeholder="Calle, número, ciudad"
          value={values.address}
          onChange={handleChange('address')}
          error={fieldErrors.address}
        />

        <div className="grid gap-4 sm:grid-cols-2">
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
            label="Repite la contraseña"
            name="confirmPassword"
            type="password"
            autoComplete="new-password"
            value={values.confirmPassword}
            onChange={handleChange('confirmPassword')}
            error={fieldErrors.confirmPassword}
          />
        </div>

        <Button type="submit" isLoading={submitting} className="mt-2 w-full">
          Crear cuenta
        </Button>
      </form>
    </AuthLayout>
  );
}
