import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
} from 'react';
import {
  ExternalLink,
  Minus,
  MoveHorizontal,
  Plus,
  RotateCw,
} from 'lucide-react';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';
import { Button } from '@/components/ui/button';
import {
  documentComponentErrorCode,
  loadDocumentComponentSdk,
  type DocumentComponentAuth,
  type DocumentComponentInstance,
} from '@/utils/doc-component-sdk';

export interface FeishuDocumentReaderProps {
  src: string;
  title: string;
  getAuthorization: () => Promise<DocumentComponentAuth>;
  onOpen?: () => void;
  onRetry: () => void;
  applicationIdentity?: boolean;
}

interface PanStart {
  pointerId: number;
  clientX: number;
  scrollLeft: number;
  moved: boolean;
}

const WIDE_READER_MIN_WIDTH = 800;
const WIDE_READER_MAX_WIDTH = 3200;
const WIDE_READER_WIDTH_STEP = 400;

/** The caller must provide authorization scoped to the approved reader identity. */
export default function DesktopFeishuDocumentReader({
  src,
  title,
  getAuthorization,
  onOpen,
  onRetry,
  applicationIdentity = false,
}: FeishuDocumentReaderProps) {
  const mount = useRef<HTMLDivElement>(null);
  const viewport = useRef<HTMLDivElement>(null);
  const panStart = useRef<PanStart | null>(null);
  const [notice, setNotice] = useState('正在加载文档…');
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [wideMode, setWideMode] = useState(false);
  const [wideWidth, setWideWidth] = useState(1200);

  const leaveWideMode = (): void => {
    panStart.current = null;
    setWideMode(false);
  };

  useEffect(() => {
    const tablet = window.matchMedia('(min-width: 640px) and (max-width: 1023px)');
    const leaveWideMode = (): void => {
      if (!tablet.matches) {
        panStart.current = null;
        setWideMode(false);
      }
    };
    tablet.addEventListener('change', leaveWideMode);
    return () => tablet.removeEventListener('change', leaveWideMode);
  }, []);

  useEffect(() => {
    if (!viewport.current) return;
    viewport.current.scrollLeft = wideMode
      ? Math.max(0, (viewport.current.scrollWidth - viewport.current.clientWidth) / 2)
      : 0;
  }, [wideMode, wideWidth]);

  const startPan = (event: PointerEvent<HTMLDivElement>): void => {
    if (!viewport.current || event.button !== 0) return;
    panStart.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      scrollLeft: wideMode
        ? viewport.current.scrollLeft
        : Math.max(0, (wideWidth - viewport.current.clientWidth) / 2),
      moved: false,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
    setWideMode(true);
  };

  const movePan = (event: PointerEvent<HTMLDivElement>): void => {
    const start: PanStart | null = panStart.current;
    if (!start || start.pointerId !== event.pointerId || !viewport.current) return;
    if (Math.abs(event.clientX - start.clientX) > 6) start.moved = true;
    if (!start.moved) return;
    viewport.current.scrollLeft = start.scrollLeft + start.clientX - event.clientX;
  };

  const stopPan = (event: PointerEvent<HTMLDivElement>): void => {
    const start: PanStart | null = panStart.current;
    if (!start || start.pointerId !== event.pointerId) return;
    panStart.current = null;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    if (!start.moved) setWideMode(false);
  };

  const handlePanKeyDown = (event: KeyboardEvent<HTMLDivElement>): void => {
    if (event.key === 'Escape') {
      leaveWideMode();
      return;
    }
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (wideMode) leaveWideMode();
      else setWideMode(true);
      return;
    }
    if (!viewport.current || !wideMode) return;
    if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      viewport.current.scrollLeft += event.key === 'ArrowRight' ? 120 : -120;
    }
  };

  useEffect(() => {
    let active = true;
    let failed = false;
    let warning = false;
    let instance: DocumentComponentInstance | undefined;
    const update = (message: string): void => {
      if (!active) return;
      setNotice(message);
      setLoading(false);
    };
    setNotice('正在加载文档…');
    setLoading(true);
    setMounted(false);
    const timer = setTimeout(
      () => update('文档加载较慢，可以继续等待或重试。'),
      20000,
    );
    const start = async (): Promise<void> => {
      try {
        const [Component, auth] = await Promise.all([
          loadDocumentComponentSdk(),
          getAuthorization(),
        ]);
        if (!active || !mount.current) return;
        instance = new Component({
          src,
          mount: mount.current,
          auth,
          size: { height: '76vh' },
          onMountSuccess: () => {
            if (!active) return;
            clearTimeout(timer);
            if (!failed) {
              setMounted(true);
              if (!warning) update('');
            }
          },
          onMountTimeout: () => update('文档加载超时，请重试或打开原文。'),
          onAuthError: () => {
            if (!active) return;
            failed = true;
            setMounted(false);
            clearTimeout(timer);
            update(
              applicationIdentity
                ? '课程文档暂不可读，请打开原文或联系管理员检查课程阅读权限。'
                : '文档授权未通过，请重新授权或打开原文确认访问权限。',
            );
          },
          onError: (error: unknown) => {
            if (!active) return;
            clearTimeout(timer);
            const code = documentComponentErrorCode(error);
            if (code === '1') {
              warning = true;
              update(
                '部分内容可能无法显示。如发现群聊卡片或其他内容缺失，请打开原文查看。',
              );
            } else {
              failed = true;
              setMounted(false);
              update(
                code === '4'
                  ? applicationIdentity
                    ? '平台尚未获得这份课程文档的阅读权限，请联系管理员。'
                    : '当前身份没有这份文档的阅读权限。'
                  : '文档加载遇到问题，请重试或打开原文。',
              );
            }
          },
        });
        await instance.start();
        // start/load callbacks do not establish that all document blocks rendered.
      } catch {
        if (!active) return;
        failed = true;
        setMounted(false);
        clearTimeout(timer);
        update('暂时无法加载文档，请重试或打开原文。');
      }
    };
    void start();
    return () => {
      active = false;
      clearTimeout(timer);
      instance?.destroy();
    };
  }, [src, getAuthorization, applicationIdentity]);

  return (
    <section
      className="overflow-hidden rounded-[18px] border border-black/5 bg-white shadow-[0_20px_48px_#14364017] sm:rounded-[26px]"
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-2 border-b border-black/5 px-3 py-2 sm:flex-wrap sm:gap-3 sm:px-4 sm:py-3">
        <span className="min-w-0 truncate text-sm font-medium sm:min-w-[auto]">
          <span className="sm:hidden">课程文档</span>
          <span className="hidden sm:inline">{title}</span>
        </span>
        <div className="flex shrink-0 items-center gap-1 sm:shrink sm:flex-wrap sm:gap-3">
          <Button
            variant="ghost"
            size="sm"
            disabled={loading}
            onClick={onRetry}
          >
            <RotateCw className="h-3.5 w-3.5" />
            重新加载
          </Button>
          <UniversalLink
            to={src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpen}
            className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            打开原文
          </UniversalLink>
        </div>
      </div>
      {notice && (
        <p
          role="status"
          className="border-b border-black/5 bg-slate-50 px-4 py-3 text-sm text-slate-600"
        >
          {notice}
        </p>
      )}
      {mounted && (
        <div className="hidden border-b border-black/5 px-3 py-2 sm:block lg:hidden">
          <div className="flex flex-wrap items-center justify-between gap-1 text-xs text-slate-600">
            <span className="inline-flex items-center gap-1.5">
              <MoveHorizontal className="h-3.5 w-3.5" />
              {wideMode ? '左右拖动画面，轻点轨道恢复' : '按住下方轨道左右拖动宽内容'}
            </span>
            {wideMode && (
              <div className="flex shrink-0 items-center gap-1" role="group" aria-label="画布宽度">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="缩小文档画布"
                  disabled={wideWidth <= WIDE_READER_MIN_WIDTH}
                  onClick={() =>
                    setWideWidth((width: number) =>
                      Math.max(WIDE_READER_MIN_WIDTH, width - WIDE_READER_WIDTH_STEP),
                    )
                  }
                >
                  <Minus className="h-3.5 w-3.5" />
                </Button>
                <span
                  aria-live="polite"
                  className="min-w-12 text-center text-xs text-slate-600"
                >
                  {wideWidth}px
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  aria-label="加宽文档画布"
                  disabled={wideWidth >= WIDE_READER_MAX_WIDTH}
                  onClick={() =>
                    setWideWidth((width: number) =>
                      Math.min(WIDE_READER_MAX_WIDTH, width + WIDE_READER_WIDTH_STEP),
                    )
                  }
                >
                  <Plus className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </div>
          <div
            role="button"
            tabIndex={0}
            aria-pressed={wideMode}
            aria-label={wideMode ? '拖动画布，轻点恢复适屏' : '从这里左右拖动查看宽内容'}
            onPointerDown={startPan}
            onPointerMove={movePan}
            onPointerUp={stopPan}
            onPointerCancel={stopPan}
            onKeyDown={handlePanKeyDown}
            className="relative mt-1.5 h-5 cursor-ew-resize touch-pan-y select-none rounded-full bg-slate-100 ring-1 ring-inset ring-slate-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <span className="absolute inset-x-3 top-1/2 h-px bg-slate-300" aria-hidden="true" />
            <span className="absolute left-1/2 top-1/2 h-3 w-14 -translate-x-1/2 -translate-y-1/2 rounded-full bg-slate-400/75" aria-hidden="true" />
          </div>
        </div>
      )}
      <div className="relative">
        <div ref={viewport} className="overflow-x-auto overscroll-x-contain">
          <div
            ref={mount}
            className="h-[76vh] min-h-[400px] max-sm:min-w-[800px]"
            style={{ width: wideMode ? `${wideWidth}px` : '100%' }}
          />
        </div>
      </div>
    </section>
  );
}
