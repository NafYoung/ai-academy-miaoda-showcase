import { useCallback, useEffect, useState } from 'react';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';
import { readCourseDocument } from '@/api/document-authorization';
import { Button } from '@/components/ui/button';
import type { DocumentAuthorizationResult } from '../../../shared/document-authorization';
import FeishuDocumentReader from './FeishuDocumentReader';

interface Props {
  courseId: string;
  src: string;
  title: string;
  onOpen?: () => void;
  resolvedSrc?: string;
}

export default function ApplicationSdkDocumentReader(props: Props) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<{
    key: string;
    result: DocumentAuthorizationResult | null;
    failed: boolean;
  } | null>(null);
  const key: string = `${props.courseId}\n${props.src}\n${attempt}`;
  const current = state?.key === key ? state : null;
  useEffect(() => {
    let active = true;
    void readCourseDocument(props.courseId, window.location.href)
      .then((result: DocumentAuthorizationResult) => {
        if (active) setState({ key, result, failed: false });
      })
      .catch(() => {
        if (active) setState({ key, result: null, failed: true });
      });
    return () => {
      active = false;
    };
  }, [key, props.courseId]);

  const result = current?.result;
  const getAuthorization = useCallback(async () => {
    if (!result) throw new Error('课程文档尚未加载');
    return result.auth;
  }, [result]);
  const retry = (): void => setAttempt((value: number) => value + 1);
  if (result)
    return (
      <FeishuDocumentReader
        applicationIdentity
        src={props.resolvedSrc ?? result.src}
        title={props.title}
        getAuthorization={getAuthorization}
        onOpen={props.onOpen}
        onRetry={retry}
      />
    );
  return (
    <section
      className="rounded-2xl border border-border bg-white/65 p-8 text-center"
      aria-label={props.title}
    >
      <p role="status" className="mb-4 text-sm text-muted-foreground">
        {current?.failed
          ? '文档暂时无法在本页加载，请重试或打开原文。'
          : '正在加载课程文档…'}
      </p>
      <div className="flex items-center justify-center gap-4">
        {current?.failed && (
          <Button variant="outline" onClick={retry}>
            重新加载
          </Button>
        )}
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
    </section>
  );
}
