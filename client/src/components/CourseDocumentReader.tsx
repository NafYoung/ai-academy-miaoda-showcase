import { useCallback, useEffect, useRef, useState } from 'react';
import { resolveAppUrl } from '@lark-apaas/client-toolkit/utils/resolveAppUrl';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';
import { Button } from '@/components/ui/button';
import {
  beginDocumentAuthorization,
  documentAuthorizationStatus,
  finishDocumentAuthorization,
} from '@/api/document-authorization';
import type { DocumentAuthorizationResult } from '../../../shared/document-authorization';
import ContentEmbed from './ContentEmbed';
import FeishuDocumentReader from './FeishuDocumentReader';
import ApplicationCourseDocumentReader from './ApplicationCourseDocumentReader';

interface Props {
  courseId: string;
  src: string;
  title: string;
  onOpen?: () => void;
}
function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export default function CourseDocumentReader(props: Props) {
  const [enabled, setEnabled] = useState(false);
  const [applicationMode, setApplicationMode] = useState(false);
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<DocumentAuthorizationResult | null>(
    null,
  );
  const cancel = useRef<(() => void) | undefined>(undefined);
  useEffect(() => {
    let active = true;
    void documentAuthorizationStatus()
      .then((value) => {
        if (active) {
          setEnabled(value.enabled);
          setApplicationMode(value.mode === 'application');
        }
      })
      .catch(() => {
        if (active) setNotice('暂时无法确认内嵌服务状态，可先打开原文。');
      });
    return () => {
      active = false;
      cancel.current?.();
    };
  }, []);
  const getAuthorization = useCallback(async () => {
    if (!result) throw new Error('请先授权');
    return result.auth;
  }, [result]);

  const authorize = async (): Promise<void> => {
    cancel.current?.();
    const popup = window.open(
      resolveAppUrl('/document-authorization'),
      'athena-document-authorization',
      'popup,width=650,height=760',
    );
    if (!popup) {
      setNotice('请允许弹出授权窗口后重试。');
      return;
    }
    setBusy(true);
    setNotice('请在飞书授权窗口中确认，完成后会自动返回。');
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    let listener: (event: MessageEvent) => void;
    const cleanup = (): void => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener('message', listener);
      popup.close();
      setBusy(false);
    };
    cancel.current = cleanup;
    try {
      const verifier = base64url(crypto.getRandomValues(new Uint8Array(48)));
      const challenge = base64url(
        new Uint8Array(
          await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(verifier),
          ),
        ),
      );
      const start = await beginDocumentAuthorization(
        props.courseId,
        window.location.href,
        challenge,
      );
      if (!active) return;
      listener = (event: MessageEvent): void => {
        if (
          event.origin !== window.location.origin ||
          event.source !== popup ||
          event.data?.type !== 'athena-document-authorization' ||
          event.data?.state !== start.state
        )
          return;
        cleanup();
        if (event.data.error || typeof event.data.code !== 'string') {
          setNotice('未完成授权，你仍可打开原文阅读。');
          return;
        }
        setBusy(true);
        void finishDocumentAuthorization(start.state, event.data.code, verifier)
          .then((value) => {
            setResult(value);
            setNotice('');
          })
          .catch(() =>
            setNotice(
              '授权未通过。请确认使用当前平台对应的飞书账号，并检查原文访问权限。',
            ),
          )
          .finally(() => setBusy(false));
      };
      window.addEventListener('message', listener);
      timer = setTimeout(() => {
        cleanup();
        setNotice('授权等待超时，请重试。');
      }, 5 * 60_000);
      popup.location.replace(start.authorizationUrl);
    } catch {
      cleanup();
      setNotice('暂时无法发起文档授权，请重试或打开原文。');
    }
  };

  if (applicationMode) return <ApplicationCourseDocumentReader {...props} />;

  return (
    <div className="space-y-3">
      {enabled && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-white/65 px-4 py-3">
          <p className="text-sm text-muted-foreground">
            使用你的飞书权限在本页阅读，原文档的访问限制继续生效。
          </p>
          <Button onClick={() => void authorize()} disabled={busy}>
            {busy ? '等待授权…' : result ? '重新授权' : '授权并在本页阅读'}
          </Button>
        </div>
      )}
      {notice && (
        <p role="status" className="text-sm text-muted-foreground">
          {notice}
        </p>
      )}
      {result ? (
        <FeishuDocumentReader
          src={result.src}
          title={props.title}
          getAuthorization={getAuthorization}
          onOpen={props.onOpen}
          onRetry={() => void authorize()}
        />
      ) : enabled ? (
        <div className="rounded-2xl border border-border bg-white/65 p-8 text-center">
          <p className="mb-4 text-sm text-muted-foreground">
            授权后可直接在课程页阅读，也可以打开飞书原文。
          </p>
          <UniversalLink
            to={props.src}
            target="_blank"
            rel="noopener noreferrer"
            onClick={props.onOpen}
            className="text-sm text-primary underline"
          >
            打开原文
          </UniversalLink>
        </div>
      ) : (
        <ContentEmbed
          src={props.src}
          title={props.title}
          kind="doc"
          onOpen={props.onOpen}
        />
      )}
    </div>
  );
}
