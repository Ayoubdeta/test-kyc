import { forwardRef, type InputHTMLAttributes } from 'react';

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
}

// Campo de formulario accesible: label asociado por id y errores anunciados
// con aria-describedby / aria-invalid (accesibilidad WCAG).
export const TextField = forwardRef<HTMLInputElement, TextFieldProps>(
  ({ label, error, id, className = '', ...rest }, ref) => {
    const inputId = id ?? rest.name;
    const errorId = error ? `${inputId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`rounded-lg border px-3 py-2.5 text-sm outline-none transition
            focus:ring-2 focus:ring-brand-500 focus:border-brand-500
            ${error ? 'border-red-400 bg-red-50' : 'border-slate-300 bg-white'} ${className}`}
          {...rest}
        />
        {error && (
          <p id={errorId} className="text-xs text-red-600">
            {error}
          </p>
        )}
      </div>
    );
  },
);

TextField.displayName = 'TextField';
