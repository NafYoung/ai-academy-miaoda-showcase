import { useEffect, useRef, useState } from 'react';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';
import {
  getDocument,
  PDFWorker,
  type PDFDocumentProxy,
  type RenderTask,
} from 'pdfjs-dist/legacy/build/pdf.mjs';
// Bundle the worker inline: Miaoda serves emitted .mjs assets as binary data.
// eslint-disable-next-line import/no-unresolved
import BundledPdfWorker from 'pdfjs-dist/legacy/build/pdf.worker.mjs?worker&inline';
import { readMobileCoursePdf } from '@/api/document-authorization';
import {
  PdfCMapReader,
  PdfFontReader,
  PdfWasmReader,
} from '@/utils/pdf-assets';
import { Button } from '@/components/ui/button';
import './mobile-pdf-reader.css';
import { useMobileReadingShell } from './MobileReadingShell';

interface Props {
  courseId: string;
  src: string;
  title: string;
  onOpen?: () => void;
}

function PdfPage({
  pdf,
  page,
  zoom,
}: {
  pdf: PDFDocumentProxy;
  page: number;
  zoom: number;
}) {
  const host = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [notice, setNotice] = useState('正在绘制页面…');
  useEffect(() => {
    if (!host.current) return;
    const observer: ResizeObserver = new ResizeObserver(
      (entries: ResizeObserverEntry[]) => {
        const nextWidth = Math.floor(entries[0].contentRect.width);
        // A closed reading dialog reports zero; retain the canvas and position.
        if (nextWidth > 0) setWidth(nextWidth);
      },
    );
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    if (!host.current || !width) return;
    let active = true;
    let task: RenderTask | undefined;
    const container: HTMLDivElement = host.current;
    const canvas: HTMLCanvasElement = document.createElement('canvas');
    canvas.setAttribute('role', 'img');
    canvas.setAttribute('aria-label', `PDF 第 ${page} 页`);
    container.replaceChildren(canvas);
    container.scrollLeft = 0;
    container.scrollTop = 0;
    setNotice('正在绘制页面…');
    void (async () => {
      const documentPage = await pdf.getPage(page);
      if (!active) return;
      const base = documentPage.getViewport({ scale: 1 });
      const viewport = documentPage.getViewport({
        scale: (width / base.width) * zoom,
      });
      // Bound the canvas allocation on phones, including unusually tall PDFs.
      const pixelRatio: number = Math.min(
        window.devicePixelRatio || 1,
        2,
        Math.sqrt(4_000_000 / (viewport.width * viewport.height)),
      );
      canvas.width = Math.max(1, Math.floor(viewport.width * pixelRatio));
      canvas.height = Math.max(1, Math.floor(viewport.height * pixelRatio));
      canvas.style.width = `${viewport.width}px`;
      canvas.style.height = `${viewport.height}px`;
      task = documentPage.render({
        canvas,
        viewport,
        transform: [pixelRatio, 0, 0, pixelRatio, 0, 0],
      });
      await task.promise;
      if (active) setNotice('');
    })().catch(() => {
      if (active) setNotice('这一页暂时无法显示，请重新加载或打开原文。');
    });
    return () => {
      active = false;
      task?.cancel();
      canvas.remove();
    };
  }, [pdf, page, zoom, width]);
  return (
    <>
      {notice && (
        <p role="status" className="px-3 py-2 text-sm">
          {notice}
        </p>
      )}
      <div ref={host} className="athena-mobile-pdf-page" />
    </>
  );
}

export default function MobilePdfReader(props: Props) {
  const insideShell = useMobileReadingShell();
  const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
  const [notice, setNotice] = useState('正在加载 PDF…');
  const [attempt, setAttempt] = useState(0);
  const [page, setPage] = useState(1);
  const [zoom, setZoom] = useState(1);
  useEffect(() => {
    const controller: AbortController = new AbortController();
    let loading: ReturnType<typeof getDocument> | undefined;
    let worker: Worker | undefined;
    let pdfWorker: PDFWorker | undefined;
    let passwordProtected = false;
    setPdf(null);
    setPage(1);
    setZoom(1);
    setNotice('正在加载 PDF…');
    void (async () => {
      const bytes: ArrayBuffer = await readMobileCoursePdf(
        props.courseId,
        controller.signal,
      );
      if (controller.signal.aborted) return;
      worker = new BundledPdfWorker();
      pdfWorker = PDFWorker.create({ port: worker });
      loading = getDocument({
        worker: pdfWorker,
        data: new Uint8Array(bytes),
        isEvalSupported: false,
        enableXfa: false,
        useSystemFonts: true,
        useWorkerFetch: false,
        CMapReaderFactory: PdfCMapReader,
        StandardFontDataFactory: PdfFontReader,
        WasmFactory: PdfWasmReader,
      });
      loading.onPassword = () => {
        passwordProtected = true;
        if (!controller.signal.aborted)
          setNotice('此 PDF 需要密码，请打开原文阅读。');
        void loading?.destroy().catch(() => undefined);
      };
      const document: PDFDocumentProxy = await loading.promise;
      if (controller.signal.aborted) return;
      setPdf(document);
      setNotice('');
    })().catch(() => {
      if (!controller.signal.aborted && !passwordProtected)
        setNotice(
          'PDF 暂时无法加载，请重试或打开原文；持续失败时请管理员检查课程文件阅读权限。',
        );
    });
    return () => {
      controller.abort();
      void loading?.destroy().catch(() => undefined);
      pdfWorker?.destroy();
      worker?.terminate();
    };
  }, [props.courseId, attempt]);
  const reloadButton = (
    <Button
      variant="ghost"
      size="sm"
      onClick={() => setAttempt((value: number) => value + 1)}
    >
      重新加载
    </Button>
  );
  return (
    <section
      className="athena-mobile-pdf-reader"
      aria-label={`${props.title} PDF 阅读器`}
    >
      {!insideShell && (
        <div className="athena-mobile-pdf-toolbar">
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {props.title}
          </span>
          <UniversalLink
            to={props.src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={props.onOpen}
            className="shrink-0 text-sm text-primary underline"
          >
            打开原文
          </UniversalLink>
          {reloadButton}
        </div>
      )}
      {insideShell && !pdf && reloadButton}
      {notice && (
        <p role="status" className="p-4 text-sm">
          {notice}
        </p>
      )}
      {pdf && (
        <>
          <div
            className="athena-mobile-pdf-toolbar"
            role="group"
            aria-label="PDF 翻页与缩放"
          >
            <Button
              variant="outline"
              size="sm"
              disabled={page === 1}
              onClick={() => setPage((value: number) => value - 1)}
            >
              上一页
            </Button>
            <span aria-live="polite" className="text-sm">
              {page} / {pdf.numPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page === pdf.numPages}
              onClick={() => setPage((value: number) => value + 1)}
            >
              下一页
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={zoom === 1}
              onClick={() =>
                setZoom((value: number) => Math.max(1, value - 0.5))
              }
              aria-label="缩小 PDF"
            >
              −
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setZoom(1)}>
              适宽
            </Button>
            <Button
              variant="ghost"
              size="sm"
              disabled={zoom === 3}
              onClick={() =>
                setZoom((value: number) => Math.min(3, value + 0.5))
              }
              aria-label="放大 PDF"
            >
              ＋
            </Button>
            {insideShell && reloadButton}
          </div>
          <PdfPage pdf={pdf} page={page} zoom={zoom} />
        </>
      )}
    </section>
  );
}
