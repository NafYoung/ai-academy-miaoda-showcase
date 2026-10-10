import type { FC } from 'react';
import { LayoutDashboard, LibraryBig, type LucideIcon } from 'lucide-react';
import { NavLink, type NavLinkRenderProps } from 'react-router-dom';

interface AdminNavigationProps {
  showAdminDashboard: boolean;
}

interface AdminNavigationItem {
  path: string;
  label: string;
  icon: LucideIcon;
  end: boolean;
  adminOnly: boolean;
}

const ADMIN_NAVIGATION_ITEMS: AdminNavigationItem[] = [
  {
    path: '/admin',
    label: '后台总览',
    icon: LayoutDashboard,
    end: true,
    adminOnly: true,
  },
  {
    path: '/admin/course-management',
    label: '课程管理',
    icon: LibraryBig,
    end: false,
    adminOnly: false,
  },
];

const AdminNavigation: FC<AdminNavigationProps> = ({ showAdminDashboard }) => {
  const visibleItems: AdminNavigationItem[] = ADMIN_NAVIGATION_ITEMS.filter(
    (item: AdminNavigationItem): boolean =>
      showAdminDashboard || !item.adminOnly,
  );

  return (
    <nav
      aria-label="管理后台导航"
      className="flex flex-wrap items-center gap-3 rounded-[22px] border border-white bg-white/70 p-2.5 backdrop-blur-xl"
    >
      <span className="px-2 text-xs font-black tracking-[0.1em] text-slate-400">
        管理后台
      </span>
      <div className="flex flex-wrap items-center gap-1">
        {visibleItems.map((item: AdminNavigationItem) => {
          const Icon: LucideIcon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }: NavLinkRenderProps): string =>
                `inline-flex items-center gap-2 rounded-full px-3.5 py-2 text-sm font-bold transition-colors ${
                  isActive
                    ? 'bg-primary text-white shadow-md shadow-primary/20'
                    : 'text-slate-600 hover:bg-white hover:text-slate-950'
                }`
              }
            >
              <Icon className="size-4" />
              {item.label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
};

export default AdminNavigation;
