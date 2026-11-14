import React from 'react';
import { ArrowDownAZ, ArrowUpAZ } from 'lucide-react';
import { cn, EmptyState, ErrorState, TableSkeleton } from './ui';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render: (row: T) => React.ReactNode;
  className?: string;
  headerClassName?: string;
  align?: 'start' | 'center' | 'end';
  sortKey?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  keyExtractor: (row: T) => string;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  emptyTitle: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (row: T) => void;
  sort?: { key: string; dir: 'asc' | 'desc' };
  onSortChange?: (sort: { key: string; dir: 'asc' | 'desc' }) => void;
  footer?: React.ReactNode;
  dense?: boolean;
}

export function DataTable<T>({
  columns,
  rows,
  keyExtractor,
  loading,
  error,
  onRetry,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRowClick,
  sort,
  onSortChange,
  footer,
  dense,
}: DataTableProps<T>) {
  const alignClass = (align?: Column<T>['align']) =>
    align === 'end' ? 'text-end' : align === 'center' ? 'text-center' : 'text-start';

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
      {error ? (
        <ErrorState message={error} onRetry={onRetry} />
      ) : loading ? (
        <TableSkeleton rows={7} cols={Math.min(columns.length, 6)} />
      ) : rows.length === 0 ? (
        <EmptyState title={emptyTitle} description={emptyDescription} action={emptyAction} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] border-collapse text-[13px]">
            <thead>
              <tr className="border-b border-slate-200/80 bg-slate-50/70">
                {columns.map((col) => {
                  const isSorted = sort?.key === col.sortKey;
                  return (
                    <th
                      key={col.key}
                      scope="col"
                      className={cn(
                        'whitespace-nowrap px-4 py-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-slate-500',
                        alignClass(col.align),
                        col.headerClassName
                      )}
                    >
                      {col.sortKey && onSortChange ? (
                        <button
                          type="button"
                          onClick={() =>
                            onSortChange({
                              key: col.sortKey!,
                              dir: isSorted && sort?.dir === 'desc' ? 'asc' : 'desc',
                            })
                          }
                          className={cn(
                            'inline-flex items-center gap-1 transition-colors hover:text-slate-800',
                            isSorted && 'text-slate-900'
                          )}
                        >
                          {col.header}
                          {isSorted ? (
                            sort?.dir === 'asc' ? (
                              <ArrowUpAZ className="h-3 w-3" />
                            ) : (
                              <ArrowDownAZ className="h-3 w-3" />
                            )
                          ) : null}
                        </button>
                      ) : (
                        col.header
                      )}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row) => (
                <tr
                  key={keyExtractor(row)}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  className={cn(
                    'transition-colors',
                    onRowClick ? 'cursor-pointer hover:bg-slate-50/80 focus-within:bg-slate-50' : 'hover:bg-slate-50/40'
                  )}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={cn(
                        dense ? 'px-4 py-2' : 'px-4 py-3',
                        'align-middle text-slate-700',
                        alignClass(col.align),
                        col.className
                      )}
                    >
                      {col.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {footer && !loading && !error ? footer : null}
    </div>
  );
}
