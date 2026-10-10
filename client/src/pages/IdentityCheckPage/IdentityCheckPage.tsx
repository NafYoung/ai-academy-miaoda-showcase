import { useEffect, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import {
  Building2,
  CircleAlert,
  CircleCheckBig,
  Fingerprint,
  LockKeyhole,
  ShieldCheck,
  UserRoundCheck,
} from 'lucide-react';

import { platform } from '@/api';
import type {
  IPlatformIdentityProbe,
  PlatformIdentityProbeStatus,
} from '@shared/api.interface';

interface IdentityStatusPresentation {
  title: string;
  badge: string;
  icon: typeof ShieldCheck;
  iconClassName: string;
}

interface IdentityDetail {
  icon: typeof ShieldCheck;
  label: string;
  value: string;
}

const IDENTITY_STATUS_PRESENTATION: Record<
  PlatformIdentityProbeStatus,
  IdentityStatusPresentation
> = {
  org_employee: {
    title: '公司身份已确认',
    badge: '学习功能可用',
    icon: CircleCheckBig,
    iconClassName: 'bg-emerald-50 text-emerald-600',
  },
  external_learner: {
    title: '外部学员身份已确认',
    badge: '学习功能可用',
    icon: UserRoundCheck,
    iconClassName: 'bg-emerald-50 text-emerald-600',
  },
  other_tenant_employee: {
    title: '其他企业账号等待开通',
    badge: '需要管理员开通',
    icon: Building2,
    iconClassName: 'bg-blue-50 text-blue-600',
  },
  external_user: {
    title: '组织外账号等待开通',
    badge: '需要管理员开通',
    icon: UserRoundCheck,
    iconClassName: 'bg-violet-50 text-violet-600',
  },
  unsupported: {
    title: '当前身份尚未支持',
    badge: '学习功能未启用',
    icon: CircleAlert,
    iconClassName: 'bg-amber-50 text-amber-600',
  },
};

function formatUserIdFormat(
  value: IPlatformIdentityProbe['userIdFormat'],
): string {
  if (value === 'numeric') return '妙搭数字 ID';
  if (value === 'non_numeric') return '非数字 ID';
  return '未返回 ID';
}

export default function IdentityCheckPage() {
  const [probe, setProbe] = useState<IPlatformIdentityProbe | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    let active = true;

    const loadIdentityProbe = async (): Promise<void> => {
      try {
        const result: IPlatformIdentityProbe =
          await platform.getIdentityProbe();
        if (active) setProbe(result);
      } catch (error: unknown) {
        logger.error('读取组织身份探测结果失败', error);
        if (active) {
          setErrorMessage('暂时无法读取登录身份，请重新打开本页。');
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadIdentityProbe();
    return () => {
      active = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-5">
        <div className="text-center">
          <div className="mx-auto size-10 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          <p className="mt-4 text-sm font-medium text-slate-500">
            正在读取组织身份…
          </p>
        </div>
      </div>
    );
  }

  if (!probe || errorMessage) {
    return (
      <div className="min-h-[70vh] grid place-items-center px-5">
        <section className="w-full max-w-xl rounded-[28px] border border-white/80 bg-white/75 p-8 text-center shadow-[0_24px_70px_rgba(30,64,175,0.1)] backdrop-blur-2xl">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-rose-50 text-rose-600">
            <CircleAlert className="size-6" />
          </div>
          <h1 className="mt-5 text-2xl font-black text-slate-950">
            身份读取失败
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-600">
            {errorMessage || '当前没有可用的身份探测结果。'}
          </p>
        </section>
      </div>
    );
  }

  const presentation: IdentityStatusPresentation =
    IDENTITY_STATUS_PRESENTATION[probe.status];
  const StatusIcon = presentation.icon;
  const identityDetails: IdentityDetail[] = [
    {
      icon: Building2,
      label: '组织识别',
      value: probe.organizationLabel,
    },
    {
      icon: Fingerprint,
      label: '租户 ID',
      value: probe.tenantId || '未返回',
    },
    {
      icon: ShieldCheck,
      label: '账号类型',
      value: probe.userType || 'unknown',
    },
  ];

  return (
    <div className="mx-auto w-full max-w-4xl px-5 py-10 md:py-16">
      <section className="rounded-[32px] border border-white/80 bg-white/75 p-6 shadow-[0_28px_90px_rgba(30,64,175,0.12)] backdrop-blur-2xl md:p-10">
        <div className="flex flex-col gap-6 md:flex-row md:items-start">
          <div
            className={`grid size-16 shrink-0 place-items-center rounded-2xl ${presentation.iconClassName}`}
          >
            <StatusIcon className="size-7" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-xs font-black tracking-[0.14em] text-primary">
                ATHENA ORGANIZATION CHECK
              </p>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                {presentation.badge}
              </span>
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-[-0.045em] text-slate-950 md:text-4xl">
              {presentation.title}
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-7 text-slate-600 md:text-base">
              {probe.message}
            </p>
          </div>
        </div>

        <dl
          className="mt-8 grid gap-3 md:grid-cols-3"
          data-ai-section-type="card-stat"
        >
          {identityDetails.map((detail: IdentityDetail) => {
            const ItemIcon = detail.icon;
            return (
              <div
                key={detail.label}
                className="rounded-2xl border border-white bg-slate-50/80 p-4"
              >
                <ItemIcon className="size-4 text-primary" />
                <dt className="mt-3 text-xs font-bold text-slate-500">
                  {detail.label}
                </dt>
                <dd className="mt-1 break-words text-sm font-black text-slate-900">
                  {detail.value}
                </dd>
              </div>
            );
          })}
        </dl>

        <div className="mt-3 rounded-2xl border border-white bg-slate-50/80 p-4">
          <div className="flex items-start gap-3">
            <Fingerprint className="mt-0.5 size-4 shrink-0 text-primary" />
            <div>
              <p className="text-xs font-bold text-slate-500">用户 ID 格式</p>
              <p className="mt-1 text-sm font-black text-slate-900">
                {formatUserIdFormat(probe.userIdFormat)}
              </p>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 text-sm leading-7 text-blue-900">
          <div className="flex items-start gap-3">
            <LockKeyhole className="mt-1 size-4 shrink-0" />
            <div>
              <p className="font-bold">本页不会改变任何业务数据</p>
              <p className="mt-1 text-blue-800">
                {probe.privacyNote}
                本次检查也不会创建员工名册、课程任务、学习时长或提醒记录。
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
