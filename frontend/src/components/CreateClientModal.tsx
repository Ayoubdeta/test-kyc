import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { adminApi, type ClientType, type CreateClientResult } from '../api/admin.api';
import { getApiErrorMessage } from '../api/client';
import { Alert } from './ui/Alert';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { TextField } from './ui/TextField';

const USERS_KEY = ['admin', 'users'] as const;

const CLIENT_TYPES: { value: ClientType; label: string }[] = [
  { value: 'empresa', label: 'Empresa' },
  { value: 'autonomo', label: 'Autónomo' },
  { value: 'particular', label: 'Particular' },
];

export function CreateClientModal({ onClose }: { onClose: () => void }) {
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
    onError: (err) => setError(getApiErrorMessage(err, 'No se pudo crear el cliente')),
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
      setError('No se pudo copiar automáticamente; copia el enlace manualmente.');
    }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    create.mutate();
  };

  return (
    <Modal open title="Crear cliente" onClose={onClose}>
      {result ? (
        // Éxito: mostramos el enlace de activación para compartirlo.
        <div className="flex flex-col gap-4">
          <div className="rounded-xl bg-green-50 px-4 py-3 text-sm text-green-800">
            Cliente creado. Estado del expediente: <strong>Pendiente de completar</strong>. Comparte
            este enlace con el cliente para que active su cuenta:
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-slate-500">Enlace de activación</label>
            <div className="flex gap-2">
              <input
                readOnly
                value={activationLink}
                onFocus={(e) => e.target.select()}
                className="flex-1 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-xs text-slate-700 outline-none"
              />
              <Button variant="ghost" onClick={copyLink}>
                {copied ? 'Copiado' : 'Copiar'}
              </Button>
            </div>
            <p className="text-xs text-slate-400">El enlace caduca en 7 días.</p>
          </div>
          <div className="flex justify-end">
            <Button onClick={onClose}>Hecho</Button>
          </div>
        </div>
      ) : (
        <form onSubmit={submit} className="flex flex-col gap-4">
          {error && <Alert>{error}</Alert>}

          <TextField
            label="Razón social"
            name="razonSocial"
            value={values.razonSocial}
            onChange={set('razonSocial')}
          />
          <TextField label="CIF / NIF" name="cif" value={values.cif} onChange={set('cif')} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="clientType" className="text-sm font-medium text-slate-700">
              Tipo de cliente
            </label>
            <select
              id="clientType"
              value={values.clientType}
              onChange={set('clientType')}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-brand-500"
            >
              {CLIENT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <TextField
            label="Comercial asignado (opcional)"
            name="comercialAsignado"
            value={values.comercialAsignado}
            onChange={set('comercialAsignado')}
          />
          <TextField
            label="Email principal del cliente"
            name="email"
            type="email"
            value={values.email}
            onChange={set('email')}
          />

          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={onClose} type="button">
              Cancelar
            </Button>
            <Button type="submit" isLoading={create.isPending}>
              Crear cliente
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
