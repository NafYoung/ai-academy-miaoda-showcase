import { lazy, Suspense } from 'react';
import { usePhoneDocumentViewport } from '@/hooks/usePhoneDocumentViewport';
import ApplicationSdkDocumentReader from './ApplicationSdkDocumentReader';
import MobileReadingShell from './MobileReadingShell';
const MobileCourseResourceReader = lazy(
  () => import('./MobileCourseResourceReader'),
);
interface Props {
  courseId: string;
  src: string;
  title: string;
  onOpen?: () => void;
}
export default function ApplicationCourseDocumentReader(props: Props) {
  const phone: boolean = usePhoneDocumentViewport();
  // Every desktop/tablet visit retains the existing SDK path.
  const wiki: boolean = /^https:\/\/[^/]+\/wiki\//u.test(props.src);
  if (!phone) return <ApplicationSdkDocumentReader {...props} />;
  return (
    <MobileReadingShell key={`${props.courseId}:${props.src}`} {...props}>
      {wiki ? (
        <Suspense fallback={<p role="status">正在加载课程阅读器…</p>}>
          <MobileCourseResourceReader
            key={`${props.courseId}:${props.src}`}
            {...props}
          />
        </Suspense>
      ) : (
        <ApplicationSdkDocumentReader {...props} />
      )}
    </MobileReadingShell>
  );
}
