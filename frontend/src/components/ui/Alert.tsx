import type { ReactNode } from 'react';

interface AlertProps {
  variant?: 'error' | 'info';
  children: ReactNode;
}

// role="alert" hace que los lectores de pantalla anuncien el mensaje.
export function Alert({ variant = 'error', children }: AlertProps) {
  const styles =
    variant === 'error'
      ? 'bg-red-50 text-red-700 border-red-200'
      : 'bg-brand-50 text-brand-700 border-brand-100';

  return (
    <div role="alert" className={`rounded-lg border px-3 py-2.5 text-sm ${styles}`}>
      {children}
    </div>
  );
}
