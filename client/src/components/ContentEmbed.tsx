import { useState, useEffect, useRef, useCallback } from 'react';
import { ExternalLink, FileText, PlayCircle, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';
import { resolveEmbedPlan } from '@/utils/embed';

interface ContentEmbedProps {
  src: string;
  title: string;
  kind?: 'doc' | 'video';
  heightClass?: string;
  onOpen?: () => void;
}

type EmbedState = 'loading' | 'loaded' | 'slow' | 'error';

/**
 * 视频默认在课程页内播放，始终保留原视频入口。
 * 飞书文档等非视频资源继续遵循各自的阅读策略。
 */
export default function ContentEmbed({
  src,
  title,
  kind = 'doc',
  heightClass,
  onOpen,
}: ContentEmbedProps) {
  const [state, setState] = useState<EmbedState>('loading');
  const [attempt, setAttempt] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isVideo = kind === 'video';
  const { embedUrl, preferExternal, compactVideoPlayer, originalUrl } =
    resolveEmbedPlan(src, kind);
  const frameHeightClass =
    heightClass ??
    (compactVideoPlayer
      ? 'aspect-video min-h-[200px] md:aspect-auto md:h-[80vh]'
      : 'h-[80vh]');
  const openLabel: string = isVideo
    ? '打开原视频（备用）'
    : preferExternal
      ? '在飞书中打开原文档'
      : '在新窗口打开';
  const Icon = isVideo ? PlayCircle : FileText;

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (preferExternal || !embedUrl) {
      setState('error');
      return;
    }
    setState('loading');
    timerRef.current = setTimeout(() => {
      setState('slow');
    }, 10000);
    return clearTimer;
  }, [embedUrl, preferExternal, clearTimer, attempt]);

  const handleLoad = () => {
    clearTimer();
    // iframe load 仅表示导航结束，不能证明跨域内容已成功显示。
    setState('loaded');
  };

  const handleRetry = (): void => {
    clearTimer();
    setState('loading');
    setAttempt((previous: number) => previous + 1);
  };

  /** 无法创建内嵌地址时使用原页面入口。 */
  if (preferExternal || !embedUrl) {
    return (
      <div className="w-full bg-white border border-black/5 rounded-[26px] shadow-[0_20px_48px_#14364017] p-10 md:p-14 flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-[26px] bg-[#22cdf1]/10 border border-[#22cdf1]/20 flex items-center justify-center mb-4">
          <Icon className="w-7 h-7 text-[#22cdf1]" />
        </div>
        <h3 className="text-base font-semibold text-[#08090d] mb-1.5">
          {isVideo ? '打开原视频' : '在飞书中阅读文档'}
        </h3>
        <p className="text-sm text-[#14141480] mb-6 max-w-md">
          {!originalUrl
            ? '课程资源链接无效，请联系课程管理员。'
            : isVideo
              ? '当前视频无法在课程页加载，请打开原视频观看。'
              : '受浏览器安全策略限制，飞书云文档无法在本页内嵌登录（常见报错 Failed），请新窗口打开阅读。'}
        </p>
        {originalUrl && (
          <UniversalLink
            to={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpen}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#08090d] text-white text-sm font-medium shadow-[0_16px_32px_#00000024] hover:-translate-y-0.5 transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            {openLabel}
          </UniversalLink>
        )}
      </div>
    );
  }

  return (
    <div className="relative w-full bg-white border border-black/5 rounded-[18px] sm:rounded-[26px] shadow-[0_20px_48px_#14364017] overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-3 py-2 sm:flex-wrap sm:gap-3 sm:px-4 sm:py-3 border-b border-black/5">
        <span className="min-w-0 text-sm font-medium text-[#08090d] truncate">
          <span className="sm:hidden">{isVideo ? '课程视频' : '课程文档'}</span>
          <span className="hidden sm:inline">{title}</span>
        </span>
        <div className="flex shrink-0 items-center gap-1 sm:shrink sm:flex-wrap sm:gap-3">
          <Button variant="ghost" size="sm" onClick={handleRetry}>
            <RotateCw className="w-3.5 h-3.5" />
            重新加载
          </Button>
          <UniversalLink
            to={originalUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpen}
            className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg px-2 text-xs text-slate-600 transition-colors hover:text-slate-900 sm:min-h-0 sm:px-0 sm:text-slate-500"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            {openLabel}
          </UniversalLink>
        </div>
      </div>

      {state !== 'loaded' && (
        <div
          role="status"
          className="flex items-center gap-2 border-b border-black/5 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        >
          {state === 'loading'
            ? '正在本页加载课程…'
            : state === 'slow'
              ? '课程加载较慢，仍在尝试显示。你可以继续等待，或点击“重新加载”。'
              : '本次加载遇到问题，请先尝试“重新加载”；也可通过备用入口打开原页面。'}
        </div>
      )}

      <div className={`relative w-full ${frameHeightClass}`}>
        <iframe
          key={`${embedUrl}:${attempt}`}
          src={embedUrl}
          title={title}
          className="w-full h-full border-0"
          allow="fullscreen; clipboard-read; clipboard-write; autoplay"
          allowFullScreen
          onLoad={handleLoad}
          onError={() => {
            clearTimer();
            setState('error');
          }}
        />
      </div>
    </div>
  );
}
