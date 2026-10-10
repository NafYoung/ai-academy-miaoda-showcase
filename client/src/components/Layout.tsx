import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from 'react';
import { ActiveLink } from '@lark-apaas/client-toolkit/components/ActiveLink';
import { authClient } from '@lark-apaas/client-toolkit/auth';
import { useCurrentUserProfile } from '@lark-apaas/client-toolkit/hooks/useCurrentUserProfile';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Outlet,
  useLocation,
  useNavigate,
  useOutletContext,
} from 'react-router-dom';
import { academyCoverCache } from '../utils/academy-cover-cache';
import { AcademyCoverScopeContext } from '../utils/academy-cover-context';
import {
  ArrowRight,
  BookOpen,
  GraduationCap,
  LogOut,
  Menu,
  Search,
  ShieldCheck,
  Sparkles,
  UserRound,
  Workflow,
  X,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import { Input } from '@/components/ui/input';
import DynamicBackground from './DynamicBackground';
import OrganizationAccessGate from './OrganizationAccessGate';
import { platform } from '@/api';
import type { IPlatformIdentityProbe } from '@shared/api.interface';

type NavLink = { path: string; label: string };

const CORE_NAV: NavLink[] = [
  { path: '/', label: '首页' },
  { path: '/courses', label: '课程中心' },
  { path: '/submit', label: '投稿课程' },
  { path: '/my-learning', label: '我的学习' },
];

interface LayoutOutletContext {
  isExternalLearner: boolean;
}

/** 外部学员没有 公司部门，投稿等页面据此调整部门相关的输入。 */
export function useIsExternalLearner(): boolean {
  return (
    useOutletContext<LayoutOutletContext | undefined>()?.isExternalLearner ===
    true
  );
}

function LoginLanding() {
  const [redirecting, setRedirecting] = useState(false);

  const handleLogin = async (): Promise<void> => {
    setRedirecting(true);
    await authClient.session.redirectToLogin({ returnUrl: window.location.href });
  };

  return (
    <div className="academy-shell min-h-screen overflow-hidden">
      <DynamicBackground />
      <main className="relative z-10 min-h-screen flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-6xl grid lg:grid-cols-[1.15fr_0.85fr] gap-6 items-stretch">
          <section className="rounded-[32px] border border-white/80 bg-white/70 backdrop-blur-2xl shadow-[0_30px_90px_rgba(51,112,255,0.14)] p-7 md:p-12 flex flex-col justify-between min-h-[560px]">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 px-3 py-1.5 text-xs font-bold tracking-[0.08em]">
                <Sparkles className="size-3.5" />
                ATHENA · COMPANY LEARNING
              </div>
              <h1 className="mt-7 text-4xl md:text-6xl font-black tracking-[-0.06em] text-slate-950 leading-[1.05]">
                公司的好课程，
                <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#3370ff] via-[#6f5cff] to-[#00a98f]">
                  在这里持续生长
                </span>
              </h1>
              <p className="mt-6 max-w-2xl text-base md:text-lg leading-8 text-slate-600">
                汇总各部门文档与飞书妙记视频，统一学习入口、投稿审核和学习记录。登录后即可开始学习。
              </p>
            </div>

            <div className="grid sm:grid-cols-3 gap-3 mt-10">
              {[
                [BookOpen, '统一课程库', '文档与视频一处查看'],
                [Workflow, '受控投稿', '审核后再进入正式课程库'],
                [ShieldCheck, '身份可追踪', '基于飞书身份记录学习'],
              ].map(([Icon, title, description]) => {
                const CardIcon = Icon as typeof BookOpen;
                return (
                  <div key={String(title)} className="rounded-2xl border border-white bg-white/65 p-4">
                    <CardIcon className="size-5 text-primary" />
                    <p className="mt-3 text-sm font-bold text-slate-900">{String(title)}</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">{String(description)}</p>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="rounded-[32px] border border-white/80 bg-slate-950 text-white p-7 md:p-10 shadow-[0_30px_90px_rgba(15,23,42,0.2)] flex flex-col justify-between">
            <div>
              <div className="inline-flex h-14 items-center rounded-2xl bg-gradient-to-br from-[#3370ff] to-[#8b5cf6] px-5 shadow-lg shadow-blue-500/30">
                <span className="text-sm font-black tracking-[0.16em]">
                  ATHENA
                </span>
              </div>
              <h2 className="mt-8 text-2xl font-bold">使用飞书身份进入</h2>
              <p className="mt-3 text-sm leading-7 text-slate-300">
                无需创建新账号。平台使用公司飞书身份识别学习者，并为后续学习统计与权限管理提供可靠依据。
              </p>
            </div>

            <div className="mt-12">
              <Button
                type="button"
                size="lg"
                disabled={redirecting}
                onClick={handleLogin}
                className="w-full rounded-full bg-white text-slate-950 hover:bg-blue-50 h-12 font-bold"
              >
                {redirecting ? '正在前往飞书登录…' : '飞书登录'}
                {!redirecting && <ArrowRight className="size-4" />}
              </Button>
              <p className="mt-4 text-center text-xs text-slate-500">
                仅限公司成员访问
              </p>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}

export default function Layout() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);
  const navigate = useNavigate();
  const user = useCurrentUserProfile();
  const isIdentityCheck: boolean = pathname === '/identity-check';
  const [authGracePeriod, setAuthGracePeriod] = useState(true);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [canManageCourses, setCanManageCourses] = useState(false);
  const [isExternalLearner, setIsExternalLearner] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setAuthGracePeriod(false), 700);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isIdentityCheck) {
      setIsAdmin(false);
      setCanManageCourses(false);
      setIsExternalLearner(false);
      return undefined;
    }
    if (!user.user_id) {
      setIsAdmin(false);
      setCanManageCourses(false);
      setIsExternalLearner(false);
      return undefined;
    }

    let active = true;
    const loadManagementAccess = async (): Promise<void> => {
      try {
        const probe: IPlatformIdentityProbe = await platform.getIdentityProbe();
        if (!active) return;
        setIsExternalLearner(probe.status === 'external_learner');
        if (probe.learningAccess !== 'enabled') {
          setIsAdmin(false);
          setCanManageCourses(false);
          return;
        }
        const session = await platform.getSession();
        if (!active) return;
        setIsAdmin(session.isAdmin);
        if (session.isAdmin) {
          setCanManageCourses(false);
          return;
        }

        const access = await platform.getManagementAccess();
        if (active) {
          setCanManageCourses(access.canManageCourses);
        }
      } catch (error: unknown) {
        logger.error('加载管理后台入口权限失败', error);
        if (active) {
          setIsAdmin(false);
          setCanManageCourses(false);
          setIsExternalLearner(false);
        }
      }
    };

    void loadManagementAccess();
    return () => {
      active = false;
    };
  }, [isIdentityCheck, user.user_id]);

  useEffect(() => {
    const adminTabs = ['/admin', '/admin/course-management'];
    if (!(adminTabs.includes(previousPath.current) && adminTabs.includes(pathname))) {
      window.scrollTo(0, 0);
    }
    previousPath.current = pathname;
    setMobileMenuOpen(false);
  }, [pathname]);

  const canAccessManagement: boolean = isAdmin || canManageCourses;
  const managementPath: string = isAdmin
    ? '/admin'
    : '/admin/course-management';
  const navItems = useMemo<NavLink[]>(
    () =>
      canAccessManagement
        ? [...CORE_NAV, { path: managementPath, label: '管理后台' }]
        : CORE_NAV,
    [canAccessManagement, managementPath],
  );
  const outletContext: LayoutOutletContext = { isExternalLearner };

  const handleSearch = (): void => {
    const keyword = searchKeyword.trim();
    navigate(keyword ? `/courses?search=${encodeURIComponent(keyword)}` : '/courses');
  };

  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>): void => {
    if (event.key === 'Enter') handleSearch();
  };

  const handleSignOut = async (): Promise<void> => {
    academyCoverCache.clear();
    const result = await authClient.session.signOut();
    if (!result.error) await authClient.session.redirectToLogin();
  };

  if (!user.user_id) {
    if (authGracePeriod) {
      return (
        <div className="academy-shell min-h-screen grid place-items-center">
          <DynamicBackground />
          <div className="relative z-10 size-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
        </div>
      );
    }
    return <LoginLanding />;
  }

  if (isIdentityCheck) {
    return (
      <div className="academy-shell min-h-screen">
        <DynamicBackground />
        <main className="relative z-10 min-h-screen">
          <Outlet />
        </main>
      </div>
    );
  }

  return (
    <div className="academy-shell min-h-screen">
      <DynamicBackground />
      <OrganizationAccessGate>
        <header className="fixed left-0 top-0 z-50 w-screen border-b border-white/70 bg-white/78 backdrop-blur-2xl shadow-[0_12px_35px_rgba(51,112,255,0.07)]">
        <div className="mx-auto max-w-[1380px] h-[72px] px-4 md:px-6 flex items-center gap-5">
          <ActiveLink to="/" className="shrink-0">
            <span className="text-sm font-black tracking-[-0.03em] text-slate-900">
              ATHENA
            </span>
          </ActiveLink>

          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map((item) => (
              <ActiveLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-primary'
                      : 'text-slate-600 hover:bg-white hover:text-slate-950'
                  }`
                }
              >
                {item.label}
              </ActiveLink>
            ))}

          </nav>

          <div className="ml-auto flex items-center gap-2">
            <div className="hidden md:flex items-center rounded-full border border-slate-200/80 bg-white/80 pl-3 pr-1 h-10 w-56 xl:w-72 focus-within:ring-2 focus-within:ring-primary/20">
              <Search className="size-4 text-slate-400" />
              <Input
                type="search"
                value={searchKeyword}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearchKeyword(event.target.value)
                }
                onKeyDown={handleSearchKeyDown}
                placeholder="搜索课程"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0 h-9 text-sm"
              />
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="size-10 rounded-full border border-white bg-white shadow-sm overflow-hidden grid place-items-center"
                  aria-label="账户菜单"
                >
                  {user.avatar ? (
                    <Image src={user.avatar} alt={user.name ?? '当前用户'} className="size-full object-cover" />
                  ) : (
                    <UserRound className="size-5 text-slate-500" />
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-60 rounded-2xl bg-white/95 backdrop-blur-xl p-2">
                <DropdownMenuLabel className="py-2">
                  <p className="text-sm font-bold text-slate-900">{user.name || '公司成员'}</p>
                  <p className="mt-0.5 text-xs font-normal text-slate-500 truncate">{user.email || '已通过飞书登录'}</p>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/my-learning')} className="cursor-pointer rounded-xl">
                  <GraduationCap className="size-4" />
                  我的学习
                </DropdownMenuItem>
                {canAccessManagement && (
                  <DropdownMenuItem onClick={() => navigate(managementPath)} className="cursor-pointer rounded-xl">
                    <ShieldCheck className="size-4" />
                    管理后台
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer rounded-xl text-slate-600">
                  <LogOut className="size-4" />
                  退出登录
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="lg:hidden size-10 rounded-full bg-white grid place-items-center text-slate-700"
              aria-label="打开导航菜单"
            >
              {mobileMenuOpen ? <X className="size-5" /> : <Menu className="size-5" />}
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-100 bg-white/95 px-4 py-4">
            <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 pl-3 pr-1 mb-3">
              <Search className="size-4 text-slate-400" />
              <Input
                type="search"
                value={searchKeyword}
                onChange={(event: ChangeEvent<HTMLInputElement>) =>
                  setSearchKeyword(event.target.value)
                }
                onKeyDown={handleSearchKeyDown}
                placeholder="搜索课程"
                className="border-0 bg-transparent shadow-none focus-visible:ring-0"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {navItems.map((item) => (
                <ActiveLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) =>
                    `rounded-xl px-3 py-2.5 text-sm font-semibold ${
                      isActive ? 'bg-blue-50 text-primary' : 'bg-slate-50 text-slate-700'
                    }`
                  }
                >
                  {item.label}
                </ActiveLink>
              ))}
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10 pt-[72px]">
        <AcademyCoverScopeContext.Provider value={user.user_id}>
          <Outlet context={outletContext} />
        </AcademyCoverScopeContext.Provider>
      </main>
      </OrganizationAccessGate>
    </div>
  );
}
