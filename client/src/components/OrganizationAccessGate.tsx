import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  CircleAlert,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
} from 'lucide-react';
import { platform } from '@/api';
import type { IPlatformIdentityProbe } from '@shared/api.interface';

interface OrganizationAccessGateProps {
  children: React.ReactNode;
}

type GateState =
  | { status: 'loading' }
  | { status: 'allowed' }
  | { status: 'blocked'; probe: IPlatformIdentityProbe }
  | { status: 'error' };

export default function OrganizationAccessGate({
  children,
}: OrganizationAccessGateProps) {
  const [state, setState] = useState<GateState>({ status: 'loading' });

  useEffect(() => {
    let active = true;
    const load = async (): Promise<void> => {
      try {
        const probe: IPlatformIdentityProbe = await platform.getIdentityProbe();
        if (!active) return;
        if (probe.learningAccess === 'enabled') {
          setState({ status: 'allowed' });
          return;
        }
        setState({ status: 'blocked', probe });
      } catch (error: unknown) {
        logger.error('读取组织访问资格失败', error);
        if (active) setState({ status: 'error' });
      }
    };
    void load();
    return () => {
      active = false;
    };
  }, []);

  if (state.status === 'loading') {
    return (
      <div className="relative z-10 min-h-[70vh] grid place-items-center px-5">
        <div className="text-center">
          <div className="mx-auto size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="mt-4 text-sm font-medium text-slate-500">
            正在核验组织身份…
          </p>
        </div>
      </div>
    );
  }

  if (state.status === 'allowed') {
    return <>{children}</>;
  }

  const probe: IPlatformIdentityProbe | null =
    state.status === 'blocked' ? state.probe : null;

  return (
    <div className="relative z-10 mx-auto w-full max-w-2xl px-5 py-16 md:py-24">
      <section className="rounded-[32px] border border-white/80 bg-white/75 p-8 text-center shadow-[0_28px_90px_rgba(30,64,175,0.12)] backdrop-blur-2xl md:p-12">
        <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-amber-50 text-amber-600">
          {state.status === 'error' ? (
            <CircleAlert className="size-6" />
          ) : (
            <LockKeyhole className="size-6" />
          )}
        </div>
        <p className="mt-6 text-xs font-black tracking-[0.14em] text-primary">
          ATHENA ACCESS
        </p>
        <h1 className="mt-3 text-2xl font-black tracking-[-0.04em] text-slate-950 md:text-3xl">
          {state.status === 'error'
            ? '暂时无法确认组织身份'
            : '当前账号不能使用本应用'}
        </h1>
        <p className="mt-4 text-sm leading-7 text-slate-600">
          {probe?.message ||
            '请使用 公司组织内的飞书员工身份重新登录。非组织成员无法浏览课程、投稿或进入管理后台。'}
        </p>
        {probe && (
          <dl className="mt-8 grid gap-3 text-left sm:grid-cols-2">
            <div className="rounded-2xl border border-white bg-slate-50/80 p-4">
              <ShieldCheck className="size-4 text-primary" />
              <dt className="mt-3 text-xs font-bold text-slate-500">
                组织识别
              </dt>
              <dd className="mt-1 text-sm font-black text-slate-900">
                {probe.organizationLabel}
              </dd>
            </div>
            <div className="rounded-2xl border border-white bg-slate-50/80 p-4">
              <Fingerprint className="size-4 text-primary" />
              <dt className="mt-3 text-xs font-bold text-slate-500">
                账号类型
              </dt>
              <dd className="mt-1 break-words text-sm font-black text-slate-900">
                {probe.userType || 'unknown'}
              </dd>
            </div>
          </dl>
        )}
        <Link
          to="/identity-check"
          className="mt-8 inline-flex rounded-full bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground shadow-md shadow-primary/20 transition hover:brightness-110"
        >
          查看身份探测详情
        </Link>
      </section>
    </div>
  );
}
