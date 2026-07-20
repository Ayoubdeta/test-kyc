import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

// ─── Tarjeta KPI ───────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: number | string;
  icon?: ReactNode;
  hint?: string;
  /** Clases de color del acento (chip del icono + valor). */
  accent?: string;
  /** Clase de fondo del chip del icono (p. ej. "bg-brand-50"). */
  iconBg?: string;
  /** Si se indica, la tarjeta es un enlace a esa ruta. */
  to?: string;
}

export function KpiCard({
  label,
  value,
  icon,
  hint,
  accent = 'text-brand-600',
  iconBg = 'bg-brand-50',
  to,
}: KpiCardProps) {
  const base =
    'group relative animate-fade-in-up overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-card';
  const content = (
    <>
      <div className="flex items-center gap-3">
        {icon && (
          <span
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition duration-200 group-hover:scale-110 ${iconBg} ${accent}`}
            aria-hidden="true"
          >
            {icon}
          </span>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase leading-tight tracking-wide text-slate-500">
            {label}
          </p>
          <p className={`mt-0.5 text-2xl font-bold leading-tight tabular-nums ${accent}`}>{value}</p>
        </div>
      </div>
      {hint && <p className="mt-2 text-xs text-slate-400">{hint}</p>}
    </>
  );

  if (to) {
    return (
      <Link
        to={to}
        className={`${base} block transition duration-200 hover:-translate-y-1 hover:border-brand-200 hover:shadow-elevated`}
      >
        {content}
      </Link>
    );
  }
  return <div className={base}>{content}</div>;
}

// ─── Donut / anillo de proporciones ────────────────────────────
interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

export function DonutChart({
  segments,
  size = 180,
  thickness = 22,
}: {
  segments: DonutSegment[];
  size?: number;
  thickness?: number;
}) {
  const total = segments.reduce((s, seg) => s + seg.value, 0);
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let offset = 0;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribución por estado">
        <g transform={`rotate(-90 ${center} ${center})`}>
          {total === 0 ? (
            <circle cx={center} cy={center} r={radius} fill="none" stroke="#e2e8f0" strokeWidth={thickness} />
          ) : (
            segments
              .filter((s) => s.value > 0)
              .map((seg) => {
                const len = (seg.value / total) * circumference;
                const dash = `${len} ${circumference - len}`;
                const el = (
                  <circle
                    key={seg.label}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={seg.color}
                    strokeWidth={thickness}
                    strokeDasharray={dash}
                    strokeDashoffset={-offset}
                  />
                );
                offset += len;
                return el;
              })
          )}
        </g>
        <text x={center} y={center - 4} textAnchor="middle" className="fill-slate-900" style={{ fontSize: 26, fontWeight: 700 }}>
          {total}
        </text>
        <text x={center} y={center + 16} textAnchor="middle" className="fill-slate-400" style={{ fontSize: 11 }}>
          documentos
        </text>
      </svg>

      <ul className="flex flex-col gap-1.5 text-sm">
        {segments.map((seg) => (
          <li key={seg.label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ backgroundColor: seg.color }} aria-hidden="true" />
            <span className="text-slate-600">{seg.label}</span>
            <span className="ms-auto font-semibold text-slate-800">{seg.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─── Barras horizontales etiquetadas ───────────────────────────
interface BarItem {
  label: string;
  value: number;
  color?: string;
}

export function BarChart({ items, emptyText = 'Sin datos' }: { items: BarItem[]; emptyText?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  if (items.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">{emptyText}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {items.map((it) => (
        <li key={it.label} className="grid grid-cols-[10rem_1fr_2.5rem] items-center gap-3 text-sm">
          <span className="truncate text-slate-600" title={it.label}>
            {it.label}
          </span>
          <span className="h-3 overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full transition-all"
              style={{ width: `${(it.value / max) * 100}%`, backgroundColor: it.color ?? '#d7001b' }}
            />
          </span>
          <span className="text-end font-semibold text-slate-800">{it.value}</span>
        </li>
      ))}
    </ul>
  );
}

// ─── Barras verticales (serie temporal, p. ej. meses) ──────────
export function TrendBars({ items, color = '#d7001b' }: { items: BarItem[]; color?: string }) {
  const max = Math.max(1, ...items.map((i) => i.value));
  const hasData = items.some((i) => i.value > 0);
  return (
    <div>
      <div className="flex h-40 items-end gap-1.5">
        {items.map((it) => (
          <div key={it.label} className="flex flex-1 flex-col items-center justify-end gap-1">
            <span className="text-[10px] font-medium text-slate-500">{it.value > 0 ? it.value : ''}</span>
            <div
              className="w-full rounded-t transition-all"
              style={{
                height: `${(it.value / max) * 100}%`,
                minHeight: it.value > 0 ? 4 : 0,
                backgroundColor: color,
              }}
              title={`${it.label}: ${it.value}`}
            />
          </div>
        ))}
      </div>
      <div className="mt-1 flex gap-1.5">
        {items.map((it) => (
          <span key={it.label} className="flex-1 text-center text-[10px] text-slate-400">
            {it.label}
          </span>
        ))}
      </div>
      {!hasData && <p className="mt-2 text-center text-xs text-slate-400">Sin documentos en el periodo.</p>}
    </div>
  );
}
