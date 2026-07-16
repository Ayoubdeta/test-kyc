// Indicador de carga a pantalla completa (mientras se resuelve la sesión).
export function PageSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center" role="status" aria-live="polite">
      <span
        className="h-10 w-10 animate-spin rounded-full border-4 border-brand-500 border-t-transparent"
        aria-hidden="true"
      />
      <span className="sr-only">Cargando…</span>
    </div>
  );
}
