import { forwardRef, ReactNode } from 'react';
import { Link, LinkProps } from 'react-router-dom';
import { useSkin } from '@/contexts/SkinContext';
import { ROUTE_MAP } from '@/lib/routes';

interface SkinAwareLinkProps extends Omit<LinkProps, 'to'> {
  to: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  exact?: boolean;
}

export const SkinAwareLink = forwardRef<HTMLAnchorElement, SkinAwareLinkProps>(
  ({ to, children, className = '', activeClassName = '', exact = false, ...props }, ref) => {
    const { skin, currentPath } = useSkinAwareNavigation();
    
    // Get the mapped path for the current skin
    const getMappedPath = (path: string) => {
      if (path.startsWith('http')) return path;
      return ROUTE_MAP[path as keyof typeof ROUTE_MAP]?.[skin] || path;
    };
    
    // Check if the link is active
    const isActive = exact
      ? currentPath === to
      : currentPath.startsWith(to);
    
    // Combine class names
    const combinedClassName = `${className} ${isActive ? activeClassName : ''}`.trim();
    
    return (
      <Link
        to={getMappedPath(to)}
        className={combinedClassName || undefined}
        ref={ref}
        {...props}
      >
        {children}
      </Link>
    );
  }
);

SkinAwareLink.displayName = 'SkinAwareLink';

// Create a version of the link for external navigation
export const SkinAwareExternalLink = forwardRef<HTMLAnchorElement, 
  Omit<SkinAwareLinkProps, 'to'> & { href: string }
>(({ href, children, className = '', ...props }, ref) => {
  const { skin } = useSkin();
  
  // Add skin parameter to external URLs if they point to our domain
  const getExternalUrl = (url: string) => {
    try {
      const parsedUrl = new URL(url, window.location.origin);
      if (parsedUrl.origin === window.location.origin) {
        parsedUrl.searchParams.set('skin', skin);
        return parsedUrl.toString();
      }
      return url;
    } catch (e) {
      return url;
    }
  };
  
  return (
    <a
      href={getExternalUrl(href)}
      className={className}
      ref={ref}
      target="_blank"
      rel="noopener noreferrer"
      {...props}
    >
      {children}
    </a>
  );
});

SkinAwareExternalLink.displayName = 'SkinAwareExternalLink';
