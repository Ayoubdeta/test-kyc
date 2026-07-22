import type { ReactNode } from 'react';

interface AlertProps {
  variant?: 'error' | 'info';
  children: ReactNode;
}

// role="alert" hace que los lectores de pantalla anuncien el mensaje.
export function Alert({ variant = 'error', children }: AlertProps) {
  const styles =
    variant === 'error'
      ? 'bg-red-50 dark:bg-red-500/10 text-red-700 dark:text-red-400 border-red-200 dark:border-red-500/30'
      : 'bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-400 border-brand-100 dark:border-brand-500/20';

  return (
    <div role="alert" className={`rounded-lg border px-3 py-2.5 text-sm ${styles}`}>
      {children}
    </div>
  );
}
