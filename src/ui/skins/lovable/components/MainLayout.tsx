import { ReactNode, Suspense } from 'react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from './LoadingSpinner';
import { NavLink } from 'react-router-dom';
import { getNavItems } from '@/lib/routes';
import { WSStatusBadge } from '@/components/WSStatusBadge';

interface MainLayoutProps {
  children: ReactNode;
  className?: string;
}

// Navigation links component for the Lovable skin
function NavLinks() {
  // Nav items are static for now
  const navItems = getNavItems();
  
  return (
    <nav className="hidden md:flex items-center space-x-6 text-sm font-medium">
      {navItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          className={({ isActive }) =>
            cn(
              'transition-colors hover:text-foreground/80',
              isActive ? 'text-foreground' : 'text-foreground/60'
            )
          }
        >
          {item.title}
        </NavLink>
      ))}
    </nav>
  );
}

// Main layout component for the Lovable skin
export function LovableLayout({ children, className }: MainLayoutProps) {
  return (
    <div className={cn("min-h-screen bg-background font-sans antialiased", className)}>
      <div className="relative flex min-h-screen flex-col">
        {/* Debug-only WebSocket status badge (renders only when VITE_DEBUG_WS=1) */}
        <WSStatusBadge />
        <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container flex h-16 items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
                Arbitrage Console
              </h1>
              <NavLinks />
            </div>
            <div className="flex items-center space-x-4">
              <button className="inline-flex items-center justify-center whitespace-nowrap rounded-xl text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2">
                Connect Wallet
              </button>
            </div>
          </div>
        </header>
        <main className="flex-1">
          <div className="container py-6">
            <Suspense fallback={
              <div className="flex items-center justify-center h-64">
                <LoadingSpinner size="lg" />
              </div>
            }>
              {children}
            </Suspense>
          </div>
        </main>
        <footer className="border-t border-border/40 py-6">
          <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row">
            <p className="text-center text-sm leading-loose text-muted-foreground md:text-left">
              Arbitrage Console v1.0.0
            </p>
            <div className="flex items-center space-x-4 text-sm text-muted-foreground">
              <span>Status: <span className="text-green-500 font-medium">Connected</span></span>
              <span>Network: <span className="font-medium">Mainnet</span></span>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

// For backward compatibility
export const MainLayout = LovableLayout;
export default LovableLayout;
