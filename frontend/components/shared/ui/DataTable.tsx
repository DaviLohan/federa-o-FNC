import React, { useState } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';
import { Skeleton } from './Skeleton';
import { EmptyState } from './EmptyState';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => React.ReactNode);
  sortable?: boolean;
  className?: string;
  width?: string;
  /** No layout mobile (cards), vira o título do card. */
  primary?: boolean;
  /** No layout mobile (cards), vai para o rodapé de ações (sem rótulo). */
  isAction?: boolean;
  /** Oculta esta coluna no layout mobile (cards). */
  hideOnMobile?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  isLoading?: boolean;
  emptyState?: {
    icon?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
  };
  onRowClick?: (row: T) => void;
  zebra?: boolean;
  className?: string;
  /** Em telas < md, renderiza cada linha como card empilhado (default true). */
  mobileCards?: boolean;
}

export function DataTable<T extends { id?: number | string }>({
  columns,
  data,
  isLoading = false,
  emptyState,
  onRowClick,
  zebra = true,
  className = '',
  mobileCards = true,
}: DataTableProps<T>) {
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const handleSort = (column: Column<T>, columnIndex: number) => {
    if (!column.sortable) return;

    const columnKey = typeof column.accessor === 'function' 
      ? columnIndex.toString() 
      : String(column.accessor);

    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  const getCellValue = (row: T, column: Column<T>): React.ReactNode => {
    if (typeof column.accessor === 'function') {
      return column.accessor(row);
    }
    const value = row[column.accessor];
    // Convert value to ReactNode (string, number, or React element)
    if (value === null || value === undefined) return null;
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (React.isValidElement(value)) {
      return value;
    }
    return String(value);
  };

  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data;

    const columnIndex = columns.findIndex((col, idx) => {
      const key = typeof col.accessor === 'function' ? idx.toString() : String(col.accessor);
      return key === sortColumn;
    });

    if (columnIndex === -1) return data;

    const column = columns[columnIndex];

    return [...data].sort((a, b) => {
      const aVal = getCellValue(a, column);
      const bVal = getCellValue(b, column);

      if (aVal == null) return 1;
      if (bVal == null) return -1;

      let comparison = 0;
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        comparison = aVal.localeCompare(bVal);
      } else if (typeof aVal === 'number' && typeof bVal === 'number') {
        comparison = aVal - bVal;
      } else {
        comparison = String(aVal).localeCompare(String(bVal));
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [data, sortColumn, sortDirection, columns]);

  if (isLoading) {
    return (
      <div className={`bg-surface1 border border-border rounded-3xl p-6 ${className}`}>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (data.length === 0 && emptyState) {
    return (
      <div className={className}>
        <EmptyState
          icon={emptyState.icon || '📊'}
          title={emptyState.title}
          description={emptyState.description}
          action={emptyState.action}
        />
      </div>
    );
  }

  const primaryColumn = columns.find((c) => c.primary) ?? columns[0];
  const actionColumns = columns.filter((c) => c.isAction);
  const detailColumns = columns.filter(
    (c) => c !== primaryColumn && !c.isAction && !c.hideOnMobile,
  );

  return (
    <>
      {/* Mobile: cada linha vira um card empilhado */}
      {mobileCards && (
        <div className="space-y-3 md:hidden">
          {sortedData.map((row, rowIndex) => (
            <div
              key={row.id ?? rowIndex}
              onClick={() => onRowClick && onRowClick(row)}
              className={`rounded-2xl border border-border bg-surface1 p-4 ${onRowClick ? 'cursor-pointer active:bg-surface2/60' : ''}`}
            >
              <div className="mb-2 min-w-0 text-sm font-semibold text-text">
                {getCellValue(row, primaryColumn)}
              </div>
              {detailColumns.length > 0 && (
                <div className="grid grid-cols-2 gap-x-3 gap-y-2">
                  {detailColumns.map((column, colIndex) => (
                    <div key={colIndex} className="min-w-0">
                      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted2">{column.header}</div>
                      <div className="truncate text-sm text-text">{getCellValue(row, column)}</div>
                    </div>
                  ))}
                </div>
              )}
              {actionColumns.length > 0 && (
                <div
                  className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/50 pt-3"
                  onClick={(e) => e.stopPropagation()}
                >
                  {actionColumns.map((column, colIndex) => (
                    <div key={colIndex}>{getCellValue(row, column)}</div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className={`table-premium ${zebra ? '' : ''} ${mobileCards ? 'hidden md:block' : ''} ${className}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead>
            <tr>
              {columns.map((column, index) => (
                <th
                  key={index}
                  className={`${column.className || ''} ${
                    column.sortable ? 'cursor-pointer select-none hover:bg-surface2/50' : ''
                  }`}
                  style={{ width: column.width }}
                  onClick={() => column.sortable && handleSort(column, index)}
                >
                  <div className="flex items-center gap-2">
                    <span>{column.header}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUp
                          className={`w-3 h-3 -mb-1 ${
                            sortColumn === (typeof column.accessor === 'function' ? index.toString() : String(column.accessor)) &&
                            sortDirection === 'asc'
                              ? 'text-gold'
                              : 'text-muted/40'
                          }`}
                        />
                        <ChevronDown
                          className={`w-3 h-3 ${
                            sortColumn === (typeof column.accessor === 'function' ? index.toString() : String(column.accessor)) &&
                            sortDirection === 'desc'
                              ? 'text-gold'
                              : 'text-muted/40'
                          }`}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sortedData.map((row, rowIndex) => (
              <tr
                key={row.id || rowIndex}
                onClick={() => onRowClick && onRowClick(row)}
                className={onRowClick ? 'cursor-pointer' : ''}
              >
                {columns.map((column, colIndex) => (
                  <td key={colIndex} className={column.className || ''}>
                    {getCellValue(row, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      </div>
    </>
  );
}
