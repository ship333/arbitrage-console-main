import { AlertCircle, BarChart2, BellOff, Clock, Search, Sliders } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

type EmptyStateVariant = 'default' | 'search' | 'notifications' | 'analytics' | 'settings' | 'scheduled';

interface EmptyStateProps {
  title: string;
  description: string;
  variant?: EmptyStateVariant;
  action?: {
    label: string;
    onClick: () => void;
  };
  className?: string;
}

const variantIcons = {
  default: AlertCircle,
  search: Search,
  notifications: BellOff,
  analytics: BarChart2,
  settings: Sliders,
  scheduled: Clock,
} as const;

export function EmptyState({
  title,
  description,
  variant = 'default',
  action,
  className,
}: EmptyStateProps) {
  const Icon = variantIcons[variant];
  
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center',
        className
      )}
    >
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
        <Icon className="h-6 w-6 text-muted-foreground" />
      </div>
      <h3 className="mt-4 text-lg font-medium text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button className="mt-6" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}

interface EmptyStateWithIconProps extends Omit<EmptyStateProps, 'variant'> {
  icon: React.ReactNode;
  iconClassName?: string;
}

export function EmptyStateWithIcon({
  title,
  description,
  icon,
  action,
  className,
  iconClassName,
}: EmptyStateWithIconProps) {
  return (
    <div
      className={cn(
        'flex h-full w-full flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center',
        className
      )}
    >
      <div className={cn('mb-4 text-muted-foreground', iconClassName)}>{icon}</div>
      <h3 className="mb-2 text-lg font-medium text-foreground">{title}</h3>
      <p className="mb-6 max-w-md text-sm text-muted-foreground">{description}</p>
      {action && (
        <Button variant="outline" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
    </div>
  );
}
