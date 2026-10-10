import { forwardRef } from 'react';
import { NavLink, type NavLinkProps } from 'react-router-dom';

export interface ActiveLinkProps extends Omit<NavLinkProps, 'to'> {
  to: string;
}

export const ActiveLink = forwardRef<HTMLAnchorElement, ActiveLinkProps>(function ActiveLink({ to, ...props }, ref) {
  return <NavLink ref={ref} to={to} {...props} />;
});
