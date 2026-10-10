import type { DocumentComponentAuth } from '../../../shared/document-authorization';
export type { DocumentComponentAuth } from '../../../shared/document-authorization';

export interface DocumentComponentInstance {
  start(): Promise<void>;
  destroy(): void;
}

export interface DocumentComponentOptions {
  src: string;
  mount: HTMLElement;
  auth: DocumentComponentAuth;
  size: { height: string };
  onMountSuccess(): void;
  onMountTimeout(): void;
  onAuthError(error: unknown): void;
  onError(error: unknown): void;
}

type DocumentComponentConstructor = new (
  options: DocumentComponentOptions,
) => DocumentComponentInstance;

declare global {
  interface Window {
    DocComponentSdk?: DocumentComponentConstructor;
  }
}

let pending: Promise<DocumentComponentConstructor> | undefined;
const SDK_URL =
  'https://sf1-scmcdn-cn.feishucdn.com/obj/feishu-static/docComponentSdk/lib/1.0.13.js';

export function loadDocumentComponentSdk(): Promise<DocumentComponentConstructor> {
  if (window.DocComponentSdk) return Promise.resolve(window.DocComponentSdk);
  if (pending) return pending;
  pending = new Promise<DocumentComponentConstructor>((resolve, reject) => {
    const script = document.createElement('script');
    const fail = (): void => {
      clearTimeout(timeout);
      script.remove();
      pending = undefined;
      reject(new Error('文档阅读组件暂时无法加载，请重试'));
    };
    const timeout = setTimeout(fail, 15000);
    script.src = SDK_URL;
    script.async = true;
    script.onerror = fail;
    script.onload = (): void => {
      clearTimeout(timeout);
      if (!window.DocComponentSdk) {
        fail();
        return;
      }
      resolve(window.DocComponentSdk);
    };
    document.head.appendChild(script);
  });
  return pending;
}

export function documentComponentErrorCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return '';
  return typeof error.code === 'string' || typeof error.code === 'number'
    ? String(error.code)
    : '';
}
