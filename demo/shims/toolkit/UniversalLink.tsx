import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { Link } from 'react-router-dom';

export interface UniversalLinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  to: string;
}

export const UniversalLink = forwardRef<HTMLAnchorElement, UniversalLinkProps>(function UniversalLink({ to, ...props }, ref) {
  if (to.startsWith('/')) return <Link ref={ref} to={to} {...props} />;
  if (to.startsWith('#')) return <a ref={ref} href={to} {...props} />;
  return <a ref={ref} href={to} target="_blank" rel="noreferrer" {...props} />;
});
