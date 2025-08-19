import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { arrayify } from '@/lib/arrayify';

interface Column<T> {
  key: keyof T | string;
  title: string;
  render?: (value: any, item: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  onRowClick?: (item: T) => void;
  isLoading?: boolean;
  className?: string;
  rowKey?: (item: T, index: number) => string | number;
}

export function DataTable<T>({
  data,
  columns,
  onRowClick,
  isLoading,
  className,
  rowKey,
}: DataTableProps<T>) {
  const safeColumns = arrayify<Column<T>>(columns as unknown);
  const safeData = arrayify<T>(data as unknown);
  if (isLoading) {
    return (
      <Card className={cn('overflow-hidden', className)}>
        <div className="p-4">
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex space-x-4">
                {safeColumns.map((_, j) => (
                  <Skeleton key={j} className="h-4 flex-1" />
                ))}
              </div>
            ))}
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              {safeColumns.map((column) => (
                <th
                  key={String(column.key)}
                  className={cn(
                    'px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider',
                    column.className
                  )}
                >
                  {column.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {safeData.map((item, index) => {
              const anyItem = item as any;
              const computedKey =
                rowKey?.(item, index) ??
                (anyItem && anyItem.id != null ? String(anyItem.id) : String(index));
              return (
              <tr
                key={computedKey}
                className={cn(
                  'hover:bg-accent/50 transition-colors',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(item)}
              >
                {safeColumns.map((column) => {
                  const value = typeof column.key === 'string' && column.key.includes('.') 
                    ? column.key.split('.').reduce((obj, key) => obj?.[key], item as any)
                    : (item as any)[column.key];
                  
                  return (
                    <td
                      key={String(column.key)}
                      className={cn(
                        'px-4 py-3 text-sm',
                        column.className
                      )}
                    >
                      {column.render ? column.render(value, item) : value}
                    </td>
                  );
                })}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      
      {safeData.length === 0 && (
        <div className="p-8 text-center text-muted-foreground">
          No data available
        </div>
      )}
    </Card>
  );
}