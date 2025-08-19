import { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: string;
  icon?: ReactNode;
  status?: 'profit' | 'loss' | 'neutral';
  isLoading?: boolean;
  className?: string;
}

export function KPICard({ 
  title, 
  value, 
  change, 
  icon, 
  status = 'neutral',
  isLoading = false,
  className 
}: KPICardProps) {
  if (isLoading) {
    return (
      <Card className={cn('p-4', className)}>
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-8 w-16" />
          {change && <Skeleton className="h-3 w-12" />}
        </div>
      </Card>
    );
  }

  return (
    <Card className={cn('p-4', className)}>
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
          {change && (
            <p className={cn(
              'text-xs',
              status === 'profit' && 'text-profit',
              status === 'loss' && 'text-loss',
              status === 'neutral' && 'text-muted-foreground'
            )}>
              {change}
            </p>
          )}
        </div>
        {icon && (
          <div className={cn(
            'h-8 w-8 rounded-full flex items-center justify-center',
            status === 'profit' && 'bg-profit/10 text-profit',
            status === 'loss' && 'bg-loss/10 text-loss',
            status === 'neutral' && 'bg-muted text-muted-foreground'
          )}>
            {icon}
          </div>
        )}
      </div>
    </Card>
  );
}