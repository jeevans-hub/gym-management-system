import type { ReactNode } from 'react';
import ReportEmptyState from './ReportEmptyState';

export interface ReportColumn<Row> {
  key: string;
  heading: string;
  cell: (row: Row) => ReactNode;
  className?: string;
}

export default function ReportTable<Row>({
  caption,
  columns,
  rows,
  rowKey,
  loading,
  emptyTitle,
  emptyMessage,
}: {
  caption: string;
  columns: Array<ReportColumn<Row>>;
  rows: Row[];
  rowKey: (row: Row, index: number) => string;
  loading: boolean;
  emptyTitle: string;
  emptyMessage: string;
}) {
  if (loading) {
    return <div role="status" aria-label={`Loading ${caption}`} className="h-72 animate-pulse bg-gradient-to-r from-slate-50 via-slate-100 to-slate-50" />;
  }
  if (!rows.length) return <ReportEmptyState title={emptyTitle} message={emptyMessage} />;

  return (
    <div className="w-full overflow-x-auto overscroll-x-contain">
      <table className="min-w-[900px] w-full text-left">
        <caption className="sr-only">{caption}</caption>
        <thead className="border-y border-slate-200 bg-slate-50 text-xs uppercase tracking-[0.08em] text-slate-500">
          <tr>{columns.map((column) => <th key={column.key} scope="col" className={`whitespace-nowrap px-4 py-3 font-bold ${column.className ?? ''}`}>{column.heading}</th>)}</tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {rows.map((row, index) => (
            <tr key={rowKey(row, index)} className="bg-white transition hover:bg-slate-50/80">
              {columns.map((column) => <td key={column.key} className={`px-4 py-4 text-sm text-slate-600 ${column.className ?? ''}`}>{column.cell(row)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
