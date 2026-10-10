import { useEffect, useRef, useState } from 'react';
import { ExternalLink, Maximize2, RotateCw, X } from 'lucide-react';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';
import {
  readMobileCourseDocument,
  readMobileCourseImage,
} from '@/api/document-authorization';
import { Button } from '@/components/ui/button';
import { Image } from '@/components/ui/image';
import type {
  IMobileDocumentBlock,
  IMobileDocumentImageBlock,
  IMobileDocumentResponse,
  IMobileDocumentTextBlock,
} from '../../../shared/api.interface';

interface Props {
  courseId: string;
  src: string;
  title: string;
  onOpen?: () => void;
}

function MobileImage({
  courseId,
  block,
  src,
  onOpen,
}: {
  courseId: string;
  block: IMobileDocumentImageBlock;
  src: string;
  onOpen?: () => void;
}) {
  const placeholder = useRef<HTMLDivElement>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const [visible, setVisible] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const node = placeholder.current;
    if (!node || visible) return;
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '320px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    let active = true;
    let objectUrl: string | null = null;
    setFailed(false);
    void readMobileCourseImage(courseId, block.id)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [visible, courseId, block.id]);

  useEffect(() => {
    const node = dialog.current;
    if (!node) return;
    if (open && !node.open) node.showModal();
    if (!open && node.open) node.close();
  }, [open]);

  return (
    <figure ref={placeholder} className="my-5 max-w-full text-center">
      {url ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="inline-block max-w-full rounded-xl border border-slate-200 bg-slate-50 p-2 text-left shadow-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
            aria-label={`查看完整图片：${block.altText}`}
          >
            <span className="block max-h-[260px] max-w-[240px] overflow-hidden rounded-md">
              <Image
                src={url}
                alt={block.altText}
                unoptimized
                sizes="240px"
                className="block h-auto max-w-full"
              />
            </span>
            <span className="mt-2 flex items-center justify-center gap-1 text-xs text-primary">
              <Maximize2 className="h-3.5 w-3.5" /> 点击查看完整图片
            </span>
          </button>
          <dialog
            ref={dialog}
            onClose={() => setOpen(false)}
            onClick={(event) => {
              if (event.target === dialog.current) setOpen(false);
            }}
            aria-label={`完整图片：${block.altText}`}
            className="m-0 h-dvh max-h-none w-screen max-w-none bg-slate-950/95 p-0 text-white backdrop:bg-black/80"
          >
            <div className="sticky top-0 z-10 flex justify-end bg-slate-950/85 p-3">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="text-white hover:bg-white/20 hover:text-white"
                aria-label="关闭完整图片"
              >
                <X className="h-5 w-5" /> 关闭
              </Button>
            </div>
            <div className="max-h-[calc(100dvh-64px)] overflow-auto px-3 pb-8">
              <Image
                src={url}
                alt={block.altText}
                unoptimized
                sizes="100vw"
                className="mx-auto block h-auto max-w-full"
              />
            </div>
          </dialog>
        </>
      ) : failed ? (
        <div className="rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-600">
          <p>这张图片暂时无法加载。</p>
          <UniversalLink
            to={src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpen}
            className="mt-2 inline-flex items-center gap-1 text-primary underline"
          >
            <ExternalLink className="h-3.5 w-3.5" /> 在飞书中打开原文
          </UniversalLink>
        </div>
      ) : (
        <div
          className="mx-auto h-40 w-full max-w-[240px] animate-pulse rounded-xl bg-slate-100"
          role="status"
          aria-label="正在加载教学图片"
        />
      )}
    </figure>
  );
}

function MobileText({
  block,
  number,
}: {
  block: IMobileDocumentTextBlock;
  number: number;
}) {
  const text = (
    <span className="min-w-0 whitespace-pre-wrap break-words">
      {block.text}
    </span>
  );
  if (block.style === 'heading')
    return (
      <h2
        className={
          block.headingLevel && block.headingLevel > 2
            ? 'mb-3 mt-6 text-base font-semibold leading-7 text-slate-900'
            : 'mb-3 mt-7 text-lg font-semibold leading-7 text-slate-900'
        }
      >
        {text}
      </h2>
    );
  if (
    block.style === 'bullet' ||
    block.style === 'ordered' ||
    block.style === 'todo'
  )
    return (
      <div className="my-2 flex gap-2 leading-7 text-slate-800">
        <span className="shrink-0" aria-hidden="true">
          {block.style === 'bullet'
            ? '•'
            : block.style === 'ordered'
              ? `${number}.`
              : block.checked
                ? '☑'
                : '☐'}
        </span>
        {text}
      </div>
    );
  if (block.style === 'quote')
    return (
      <blockquote className="my-4 border-l-2 border-primary/40 pl-3 leading-7 text-slate-700">
        {text}
      </blockquote>
    );
  if (block.style === 'code')
    return (
      <pre className="my-3 overflow-x-auto rounded-lg bg-slate-100 p-3 text-xs leading-6 text-slate-800">
        <code>{block.text}</code>
      </pre>
    );
  return <p className="my-3 leading-7 text-slate-800">{text}</p>;
}

export default function MobileCourseDocumentReader({
  courseId,
  src,
  title,
  onOpen,
}: Props) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    document: IMobileDocumentResponse | null;
    failed: boolean;
  } | null>(null);
  const key = `${courseId}\n${attempt}`;
  const current = state?.key === key ? state : null;

  useEffect(() => {
    let active = true;
    void readMobileCourseDocument(courseId)
      .then((document) => {
        if (active) setState({ key, document, failed: false });
      })
      .catch(() => {
        if (active) setState({ key, document: null, failed: true });
      });
    return () => {
      active = false;
    };
  }, [courseId, key]);

  let orderedNumber = 0;
  const renderBlock = (block: IMobileDocumentBlock) => {
    orderedNumber =
      block.kind === 'text' && block.style === 'ordered'
        ? orderedNumber + 1
        : 0;
    if (block.kind === 'text')
      return <MobileText key={block.id} block={block} number={orderedNumber} />;
    if (block.kind === 'image')
      return (
        <MobileImage
          key={block.id}
          courseId={courseId}
          block={block}
          src={src}
          onOpen={onOpen}
        />
      );
    if (block.kind === 'divider')
      return <hr key={block.id} className="my-6 border-slate-200" />;
    return (
      <div
        key={block.id}
        className="my-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm text-amber-950"
      >
        <p>这里的{block.label}请在飞书云文档中查看。</p>
        <UniversalLink
          to={src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onOpen}
          className="mt-2 inline-flex items-center gap-1 text-amber-900 underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> 在飞书中打开原文
        </UniversalLink>
      </div>
    );
  };

  return (
    <section
      className="min-w-0 overflow-hidden rounded-[18px] border border-black/5 bg-white shadow-[0_20px_48px_#14364017]"
      aria-label={title}
    >
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-3">
        <span className="min-w-0 truncate text-sm font-medium">图文阅读</span>
        <div className="flex shrink-0 items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAttempt((value) => value + 1)}
            aria-label="重新加载图文"
          >
            <RotateCw className="h-4 w-4" />
          </Button>
          <UniversalLink
            to={src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpen}
            className="inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-3 text-xs font-medium text-primary shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ExternalLink className="h-3.5 w-3.5" /> 飞书原文
          </UniversalLink>
        </div>
      </div>
      {current?.document ? (
        <article className="min-w-0 px-4 py-5 text-[15px] sm:px-6">
          {current.document.blocks.map(renderBlock)}
          {current.document.blocks.length === 0 && (
            <p className="text-sm text-slate-600">
              文档中没有可显示的图文内容。
            </p>
          )}
        </article>
      ) : (
        <div
          className="px-4 py-10 text-center text-sm text-slate-600"
          role="status"
        >
          <p>
            {current?.failed ? '图文阅读暂时无法加载。' : '正在加载图文内容…'}
          </p>
          {current?.failed && (
            <div className="mt-4 flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => setAttempt((value) => value + 1)}
              >
                重试
              </Button>
              <UniversalLink
                to={src}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onOpen}
                className="inline-flex items-center gap-1 rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground"
              >
                <ExternalLink className="h-3.5 w-3.5" /> 在飞书中打开原文
              </UniversalLink>
            </div>
          )}
        </div>
      )}
      <div className="border-t border-slate-100 px-4 py-3 text-right">
        <UniversalLink
          to={src}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onOpen}
          className="inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline"
        >
          <ExternalLink className="h-3.5 w-3.5" /> 在飞书中打开原文
        </UniversalLink>
      </div>
    </section>
  );
}
