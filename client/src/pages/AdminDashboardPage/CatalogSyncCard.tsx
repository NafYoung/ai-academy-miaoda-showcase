import { useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Database,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { toast } from 'sonner';
import { platform } from '@/api';
import { Button } from '@/components/ui/button';
import type { IAcademyCatalogSyncStatus } from '@shared/api.interface';

interface CatalogSyncCardProps {
  onSynced?: () => Promise<void>;
}

function formatDate(value: string | null): string {
  if (!value) return '尚未同步';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '时间未知';
  return new Intl.DateTimeFormat('zh-CN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

function statusView(status: IAcademyCatalogSyncStatus | null) {
  if (!status) {
    return {
      label: '正在读取状态',
      className: 'bg-slate-50 text-slate-600',
      Icon: Clock3,
    };
  }
  if (status.state === 'ready') {
    return {
      label: '目录快照正常',
      className: 'bg-emerald-50 text-emerald-700',
      Icon: CheckCircle2,
    };
  }
  if (status.state === 'stale') {
    return {
      label: '目录需要同步',
      className: 'bg-amber-50 text-amber-700',
      Icon: Clock3,
    };
  }
  if (status.state === 'failed') {
    return {
      label: '最近同步失败',
      className: 'bg-rose-50 text-rose-700',
      Icon: AlertTriangle,
    };
  }
  return {
    label: '尚未建立快照',
    className: 'bg-amber-50 text-amber-700',
    Icon: AlertTriangle,
  };
}

export default function CatalogSyncCard({ onSynced }: CatalogSyncCardProps) {
  const [status, setStatus] = useState<IAcademyCatalogSyncStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  const loadStatus = async (): Promise<void> => {
    try {
      setStatus(await platform.getCourseCatalogSyncStatus());
    } catch {
      toast.error('课程目录同步状态加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  const sync = async (): Promise<void> => {
    if (syncing) return;
    setSyncing(true);
    try {
      const result = await platform.syncCourseCatalog();
      setStatus(result);
      toast.success(
        result.changed
          ? `课程目录已更新：${result.courseCount} 门课程`
          : '课程目录无变化，已刷新同步时间',
      );
      await onSynced?.();
    } catch {
      await loadStatus();
      toast.error('同步失败，现有课程快照已保留');
    } finally {
      setSyncing(false);
    }
  };

  const view = statusView(status);
  const StatusIcon = view.Icon;

  return (
    <section className="mt-10 rounded-[28px] border border-white/90 bg-white/75 backdrop-blur-xl p-5 md:p-7 shadow-[0_22px_65px_rgba(30,64,175,0.08)]">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Database className="size-5 text-primary" />
            <h2 className="text-xl font-black text-slate-950">
              正式课程目录同步
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${view.className}`}
            >
              <StatusIcon className="size-3.5" />
              {view.label}
            </span>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-500">
            运营人员更新多维表格后，在这里手动同步。失败时不会用空数据覆盖现有课程。
          </p>
        </div>
        <Button
          onClick={() => void sync()}
          disabled={loading || syncing}
          className="rounded-full shrink-0"
        >
          <RefreshCw className={`size-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? '正在同步' : '立即同步课程'}
        </Button>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
          <p className="text-xs text-slate-400">最近成功同步</p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {formatDate(status?.lastSuccessfulAt ?? null)}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
          <p className="text-xs text-slate-400">快照内容</p>
          <p className="mt-1 text-sm font-bold text-slate-800">
            {status ? `${status.courseCount} 门课程` : '读取中'}
          </p>
        </div>
        <div className="rounded-2xl border border-slate-100 bg-white/80 px-4 py-3">
          <p className="text-xs text-slate-400">每日兜底</p>
          <p className="mt-1 text-sm font-bold text-amber-700">默认关闭</p>
        </div>
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-4 py-3">
          <p className="flex items-center gap-1.5 text-xs text-emerald-700">
            <ShieldCheck className="size-3.5" />
            AI 额度保护
          </p>
          <p className="mt-1 text-sm font-bold text-emerald-800">
            同步不调用 AI
          </p>
        </div>
      </div>

      {status?.state === 'failed' && (
        <p className="mt-4 rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
          最近一次同步失败，旧快照仍在正常保留。请稍后重新同步。
        </p>
      )}
    </section>
  );
}
