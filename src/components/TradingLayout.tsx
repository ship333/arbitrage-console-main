import { ReactNode } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { 
  Activity, 
  Settings, 
  FileText, 
  Bot,
  Zap,
  Lightbulb,
  LineChart,
  Gauge,
  Wrench,
  BookOpen,
  type LucideIcon
} from 'lucide-react';
import { SkinToggle } from './SkinToggle';
import { ThemeToggle } from './ThemeToggle';
import { NAV_ROUTES, isRouteActive } from '@/lib/routes';

interface TradingLayoutProps {
  children: ReactNode;
}

// Map of icon names to Lucide icons
const iconMap: Record<string, LucideIcon> = {
  bot: Bot,
  activity: Activity,
  'file-text': FileText,
  settings: Settings,
  lightbulb: Lightbulb,
  gauge: Gauge,
  wrench: Wrench,
  chart: LineChart,
  'book-open': BookOpen,
};

export function TradingLayout({ children }: TradingLayoutProps) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">ArbitrageBot</h1>
              <p className="text-xs text-muted-foreground">Management Console</p>
            </div>
            
            {/* Navigation */}
            <nav className="ml-6 flex space-x-1">
              {NAV_ROUTES.filter(route => route.sidebar).map((route) => {
                const Icon = iconMap[route.icon] || BookOpen;
                const isActive = isRouteActive(location.pathname, route.path);
                
                return (
                  <NavLink
                    key={route.path}
                    to={route.path}
                    className={cn(
                      'flex items-center space-x-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{route.title}</span>
                  </NavLink>
                );
              })}
            </nav>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-1 text-xs text-muted-foreground">
              <Zap className="h-3 w-3" />
              <span>Live</span>
            </div>
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              <SkinToggle />
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="p-6">
        {children}
      </main>
    </div>
  );
}