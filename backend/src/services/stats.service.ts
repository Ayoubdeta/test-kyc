import { DOCUMENT_TYPES } from '../config/constants';
import { statsRepository, type StatsFilters } from '../repositories/stats.repository';

const MONTHS_ES = [
  'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun',
  'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic',
];

function typeLabel(key: string): string {
  return DOCUMENT_TYPES.find((t) => t.key === key)?.label ?? 'Otro';
}

export const statsService = {
  /** KPIs de cabecera + serie mensual del año en curso (para el panel). */
  async overview() {
    const [totals, monthly] = await Promise.all([
      statsRepository.overview(),
      statsRepository.monthlyThisYear(),
    ]);

    // Rellenamos los 12 meses (los que no tienen documentos van a 0).
    const byMonth = new Map(monthly.map((m) => [m.month, m.uploaded]));
    const series = MONTHS_ES.map((label, i) => ({
      month: i + 1,
      label,
      uploaded: byMonth.get(i + 1) ?? 0,
    }));

    return {
      year: new Date().getFullYear(),
      totals: {
        enviadosEsteAno: totals.enviados_este_ano,
        pendientes: totals.pendientes,
        enRevision: totals.en_revision,
        pendienteAprobacion: totals.pendiente_aprobacion,
        aprobados: totals.aprobados,
        caducados: totals.caducados,
        rechazados: totals.rechazados,
        total: totals.total,
      },
      monthly: series,
    };
  },

  /** Estadísticas completas y filtrables para el panel de KPIs. */
  async filtered(filters: StatsFilters) {
    const [total, byStatus, byType, byMonth, byUser] = await Promise.all([
      statsRepository.total(filters),
      statsRepository.byStatus(filters),
      statsRepository.byType(filters),
      statsRepository.byMonth(filters),
      statsRepository.byUser(filters),
    ]);

    return {
      filters,
      total,
      byStatus,
      byType: byType.map((t) => ({ ...t, label: typeLabel(t.docType) })),
      byMonth,
      byUser,
    };
  },
};
