import { useEffect, useRef, useState } from 'react';
import {
  documentComponentErrorCode,
  loadDocumentComponentSdk,
  type DocumentComponentAuth,
  type DocumentComponentInstance,
} from '@/utils/doc-component-sdk';

/** Mobile lifecycle is separate so mobile experiments cannot change desktop mounting. */
export function useMobileDocumentMount(
  src: string,
  getAuthorization: () => Promise<DocumentComponentAuth>,
  attempt: number,
) {
  const mount = useRef<HTMLDivElement>(null);
  const [notice, setNotice] = useState('正在加载文档…');
  const [authFailed, setAuthFailed] = useState(false);
  useEffect(() => {
    let active = true;
    let failed = false;
    let warning = false;
    let instance: DocumentComponentInstance | undefined;
    const update = (message: string): void => {
      if (active) setNotice(message);
    };
    setAuthFailed(false);
    update('正在加载文档…');
    const timer = window.setTimeout(
      () => update('文档加载较慢，可继续等待或重试。'),
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
          auth,
          mount: mount.current,
          size: { height: '100%' },
          onMountSuccess: () => {
            window.clearTimeout(timer);
            if (!failed && !warning) update('');
          },
          onMountTimeout: () => update('文档加载超时，请重试或打开原文。'),
          onAuthError: () => {
            failed = true;
            window.clearTimeout(timer);
            if (active) setAuthFailed(true);
            update('文档授权未通过，请刷新授权；仍不可读时可打开原文。');
          },
          onError: (error: unknown) => {
            window.clearTimeout(timer);
            const code: string = documentComponentErrorCode(error);
            warning = code === '1';
            if (!warning) failed = true;
            update(
              warning
                ? '部分内容暂不支持内嵌预览，可打开原文查看。'
                : code === '4'
                  ? '当前阅读身份没有这份文档的权限，请联系管理员或打开原文。'
                  : '文档加载遇到问题，请重试或打开原文。',
            );
          },
        });
        await instance.start();
      } catch {
        window.clearTimeout(timer);
        update('暂时无法加载文档，请重试或打开原文。');
      }
    };
    void start();
    return () => {
      active = false;
      window.clearTimeout(timer);
      instance?.destroy();
    };
  }, [src, getAuthorization, attempt]);
  return { mount, notice, authFailed };
}
