import { lazy, Suspense, useEffect, useState } from 'react';
import { UniversalLink } from '@lark-apaas/client-toolkit/components/UniversalLink';
import type { IMobileCourseResource } from '@shared/api.interface';
import { readMobileCourseResource } from '@/api/document-authorization';
import { Button } from '@/components/ui/button';
import ApplicationSdkDocumentReader from './ApplicationSdkDocumentReader';
const MobilePdfReader = lazy(() => import('./MobilePdfReader'));
interface Props {
  courseId: string;
  src: string;
  title: string;
  onOpen?: () => void;
}
export default function MobileCourseResourceReader(props: Props) {
  const [resource, setResource] = useState<IMobileCourseResource | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setResource(null);
    setFailed(false);
    void readMobileCourseResource(props.courseId)
      .then((value: IMobileCourseResource) => {
        if (active) setResource(value);
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
    };
  }, [props.courseId, attempt]);
  if (resource?.kind === 'document')
    return (
      <ApplicationSdkDocumentReader {...props} resolvedSrc={resource.src} />
    );
  if (resource?.kind === 'pdf')
    return (
      <Suspense fallback={<p role="status">正在加载 PDF 阅读器…</p>}>
        <MobilePdfReader {...props} />
      </Suspense>
    );
  return (
    <section
      className="rounded-2xl border border-border bg-white p-4"
      aria-label={props.title}
    >
      <p role="status" className="mb-3 text-sm">
        {failed
          ? '暂时无法识别课程文件，请重试或打开原文。'
          : resource
            ? '此文件暂不支持手机页内阅读，请打开原文。'
            : '正在识别课程文件…'}
      </p>
      {failed && (
        <Button
          variant="outline"
          onClick={() => setAttempt((value: number) => value + 1)}
        >
          重试
        </Button>
      )}
      <UniversalLink
        to={props.src}
        target="_blank"
        rel="noopener noreferrer"
        onClick={props.onOpen}
        className="ml-3 text-sm text-primary underline"
      >
        打开原文
      </UniversalLink>
    </section>
  );
}
