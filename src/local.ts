import { useState } from 'react';
export type Row = { id: string | number; [key: string]: unknown };
export const rupiah = (n: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n);
export function readRows(resource: string): Row[] { try { return JSON.parse(localStorage.getItem('gkmi.demo.' + resource) || '[]'); } catch { return []; } }
export function useLocalRows(resource: string) {
  const [rows, setRows] = useState<Row[]>(() => readRows(resource));
  const save = (next: Row[]) => { localStorage.setItem('gkmi.demo.' + resource, JSON.stringify(next)); setRows(next); };
  return [rows, save] as const;
}
export function exportCsv(rows: Row[], fields: string[], filename: string) {
  const cell = (v: unknown) => { const s = String(v ?? ''); return '"' + (/^[=+@\-\t\r]/.test(s) ? "'" + s : s).replaceAll('"', '""') + '"'; };
  const text = '\uFEFF' + [fields, ...rows.map(r => fields.map(f => r[f]))].map(r => r.map(cell).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([text], { type: 'text/csv;charset=utf-8;' }));
  const a = document.createElement('a'); a.href = url; a.download = filename + '.csv'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
