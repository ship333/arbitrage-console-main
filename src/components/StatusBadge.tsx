import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface StatusBadgeProps {
  status: 'healthy' | 'warning' | 'error' | 'pending';
  children: React.ReactNode;
  className?: string;
}

const statusConfig = {
  healthy: {
    className: 'bg-success/10 text-success border-success/20',
    pulse: false,
  },
  warning: {
    className: 'bg-pending/10 text-pending border-pending/20',
    pulse: true,
  },
  error: {
    className: 'bg-failed/10 text-failed border-failed/20',
    pulse: true,
  },
  pending: {
    className: 'bg-info/10 text-info border-info/20',
    pulse: true,
  },
};

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  const config = statusConfig[status];
  
  return (
    <Badge 
      variant="outline" 
      className={cn(
        config.className,
        config.pulse && 'animate-pulse',
        className
      )}
    >
      {children}
    </Badge>
  );
}