import { ArrowUp, ArrowDown, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: React.ReactNode;
  className?: string;
}

export function MetricCard({ title, value, change, icon, className }: MetricCardProps) {
  const isPositive = change !== undefined ? change >= 0 : null;
  
  return (
    <div className={cn(
      "lovable-card p-6 flex flex-col",
      className
    )}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        {icon && <div className="text-primary">{icon}</div>}
      </div>
      <div className="flex items-baseline">
        <span className="text-2xl font-bold">{value}</span>
        {change !== undefined && (
          <span className={cn(
            "ml-2 text-sm font-medium flex items-center",
            isPositive ? "text-green-500" : "text-red-500"
          )}>
            {isPositive ? (
              <ArrowUp className="h-3 w-3 mr-1" />
            ) : (
              <ArrowDown className="h-3 w-3 mr-1" />
            )}
            {Math.abs(change)}%
          </span>
        )}
      </div>
      {change !== undefined && (
        <div className="mt-2">
          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
            <div 
              className={cn(
                "h-full",
                isPositive ? "bg-green-500" : "bg-red-500"
              )}
              style={{ width: `${Math.min(Math.abs(change), 100)}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
