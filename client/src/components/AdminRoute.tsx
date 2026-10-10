import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { LockKeyhole } from 'lucide-react';
import { platform } from '@/api';
import type {
  IPlatformManagementAccess,
  IPlatformSession,
} from '@shared/api.interface';

interface AdminRouteProps {
  children: ReactNode;
  allowCourseManagers?: boolean;
}

export const ManagementSessionContext = createContext<IPlatformSession | null>(null);
export const useManagementSession = () => useContext(ManagementSessionContext);

type AccessState = 'loading' | 'allowed' | 'denied';

export default function AdminRoute({
  children,
  allowCourseManagers = false,
}: AdminRouteProps) {
  const [session, setSession] = useState<IPlatformSession | null>(null);
  const [result, setResult] = useState<{
    courseScope: boolean;
    access: AccessState;
  }>({
    courseScope: allowCourseManagers,
    access: 'loading',
  });
  const access: AccessState =
    result.courseScope === allowCourseManagers ? result.access : 'loading';

  useEffect(() => {
    let active = true;
    const setAccess = (next: AccessState): void => {
      if (active) setResult({ courseScope: allowCourseManagers, access: next });
    };
    setAccess('loading');
    const load = async (): Promise<void> => {
      try {
        const session: IPlatformSession = await platform.getSession();
        if (active) setSession(session);
        if (session.isAdmin) {
          if (active) setAccess('allowed');
          return;
        }
        if (!allowCourseManagers) {
          if (active) setAccess('denied');
          return;
        }
        const management: IPlatformManagementAccess =
          await platform.getManagementAccess();
        if (active) {
          setAccess(management.canManageCourses ? 'allowed' : 'denied');
        }
      } catch (error: unknown) {
        logger.error('核验管理后台访问权限失败', error);
        if (active) setAccess('denied');
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, [allowCourseManagers]);

  if (access === 'loading') {
    return (
      <div className="min-h-[60vh] grid place-items-center">
        <div className="size-9 rounded-full border-2 border-primary border-t-transparent animate-spin" />
      </div>
    );
  }

  if (access === 'denied') {
    return (
      <div className="mx-auto max-w-2xl px-4 py-20 text-center md:px-6">
        <LockKeyhole className="mx-auto size-10 text-slate-400" />
        <h1 className="mt-5 text-2xl font-black text-slate-950">
          没有管理权限
        </h1>
        <p className="mt-3 text-sm leading-7 text-slate-500">
          {allowCourseManagers
            ? '课程管理仅对平台管理员和有正式课程的上传人开放；上传人只能管理自己上传的课程。'
            : '请联系平台负责人将你加入“平台管理员”角色。'}
        </p>
      </div>
    );
  }

  return <ManagementSessionContext.Provider value={session}>{children}</ManagementSessionContext.Provider>;
}
