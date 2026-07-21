import { useEffect, useState } from 'react';

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** Milisegundos restantes hasta la fecha objetivo (0 si ya pasó). */
  totalMs: number;
  /** true si la fecha objetivo ya se alcanzó (documento caducado). */
  expired: boolean;
}

function compute(target: number): Countdown {
  const diff = target - Date.now();
  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, totalMs: 0, expired: true };
  }
  const totalSeconds = Math.floor(diff / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
    totalMs: diff,
    expired: false,
  };
}

// Cuenta atrás en vivo hasta una fecha ISO. Recalcula cada segundo y detiene el
// intervalo cuando la fecha se alcanza. Devuelve null si no hay fecha objetivo.
export function useCountdown(targetIso: string | null | undefined): Countdown | null {
  const targetMs = targetIso ? new Date(targetIso).getTime() : NaN;
  const valid = Number.isFinite(targetMs);

  const [value, setValue] = useState<Countdown | null>(() =>
    valid ? compute(targetMs) : null,
  );

  useEffect(() => {
    if (!valid) {
      setValue(null);
      return;
    }
    setValue(compute(targetMs));
    if (compute(targetMs).expired) return; // ya caducado: no hace falta tick.

    const id = window.setInterval(() => {
      const next = compute(targetMs);
      setValue(next);
      if (next.expired) window.clearInterval(id);
    }, 1000);

    return () => window.clearInterval(id);
  }, [targetMs, valid]);

  return value;
}
