import { forwardRef, type TextareaHTMLAttributes } from 'react';

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
}

export const TextArea = forwardRef<HTMLTextAreaElement, TextAreaProps>(
  ({ label, error, id, className = '', ...rest }, ref) => {
    const areaId = id ?? rest.name;
    const errorId = error ? `${areaId}-error` : undefined;

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={areaId} className="text-sm font-medium text-slate-700">
          {label}
        </label>
        <textarea
          ref={ref}
          id={areaId}
          rows={4}
          aria-invalid={error ? true : undefined}
          aria-describedby={errorId}
          className={`resize-y rounded-lg border px-3 py-2.5 text-sm outline-none transition
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

TextArea.displayName = 'TextArea';
