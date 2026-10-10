import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';
import { Button } from '@/components/ui/button';
import './mobile-reading-shell.css';

const ReadingShellContext = createContext(false);
export function useMobileReadingShell(): boolean {
  return useContext(ReadingShellContext);
}

export default function MobileReadingShell({
  title,
  src,
  onOpen,
  children,
}: {
  title: string;
  src: string;
  onOpen?: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [started, setStarted] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const element = dialog.current;
    if (!element || !open) return;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = overflow;
    };
  }, [open]);
  return (
    <>
      <section className="rounded-2xl border border-border bg-white/65 p-5">
        <p className="mb-4 text-sm text-muted-foreground">
          进入阅读界面查看课程内容
        </p>
        <div className="flex items-center gap-4">
          <Button
            onClick={() => {
              setStarted(true);
              setOpen(true);
              onOpen?.();
            }}
          >
            {started ? '继续阅读' : '开始阅读'}
          </Button>
          <UniversalLink
            to={src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpen}
            className="text-sm text-primary underline"
          >
            打开原文
          </UniversalLink>
        </div>
      </section>
      <dialog
        ref={dialog}
        className="athena-mobile-reading-shell"
        aria-label={`${title} 阅读`}
        onCancel={(event) => {
          event.preventDefault();
          setOpen(false);
        }}
      >
        <header className="athena-mobile-reading-header">
          <Button variant="ghost" onClick={() => setOpen(false)}>
            返回课程
          </Button>
          <span className="min-w-0 flex-1 truncate text-sm font-medium">
            {title}
          </span>
          <UniversalLink
            to={src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onOpen}
            className="shrink-0 text-sm text-primary underline"
          >
            打开原文
          </UniversalLink>
        </header>
        <div className="athena-mobile-reading-content">
          <ReadingShellContext.Provider value={true}>
            {started ? children : null}
          </ReadingShellContext.Provider>
        </div>
      </dialog>
    </>
  );
}
