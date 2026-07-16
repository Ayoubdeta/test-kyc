// Exportación a CSV en el cliente, sin dependencias. Genera un CSV compatible
// con Excel (separador ';', que es el que Excel en configuración regional ES
// espera, y BOM UTF-8 para que respete los acentos) y dispara la descarga.

function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  // Envolvemos en comillas si contiene separador, comillas o saltos de línea,
  // duplicando las comillas internas (regla estándar de CSV).
  if (/[";\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => unknown;
}

/**
 * Construye el contenido CSV a partir de unas columnas y filas tipadas.
 * Se separa de la descarga para poder testear/reutilizar.
 */
export function buildCsv<T>(columns: CsvColumn<T>[], rows: T[]): string {
  const head = columns.map((c) => escapeCell(c.header)).join(';');
  const body = rows
    .map((row) => columns.map((c) => escapeCell(c.value(row))).join(';'))
    .join('\r\n');
  return `${head}\r\n${body}`;
}

/** Descarga un texto como fichero (crea un enlace temporal y lo revoca). */
export function downloadCsv(filename: string, csv: string): void {
  // BOM UTF-8 para que Excel interprete bien los acentos.
  const blob = new Blob([`﻿${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Atajo: genera el CSV de las columnas/filas y lo descarga. */
export function exportCsv<T>(filename: string, columns: CsvColumn<T>[], rows: T[]): void {
  downloadCsv(filename, buildCsv(columns, rows));
}
