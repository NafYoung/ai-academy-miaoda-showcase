import { useState } from 'react';
import MobileReadingShell, {
  useMobileReadingShell,
} from './MobileReadingShell';
import { Button } from '@/components/ui/button';
import { useMobileDocumentMount } from '@/hooks/useMobileDocumentMount';
import type { FeishuDocumentReaderProps } from './DesktopFeishuDocumentReader';
import './mobile-document-reader.css';

function DocumentBody(props: FeishuDocumentReaderProps) {
  const [attempt, setAttempt] = useState(0);
  const { mount, notice, authFailed } = useMobileDocumentMount(
    props.src,
    props.getAuthorization,
    attempt,
  );
  return (
    <>
      {notice && (
        <div className="athena-mobile-document-notice" role="status">
          <span>{notice}</span>
          <Button
            size="sm"
            variant="outline"
            onClick={() => {
              if (authFailed) props.onRetry();
              else setAttempt((value: number) => value + 1);
            }}
          >
            {authFailed ? '刷新授权' : '重新加载'}
          </Button>
        </div>
      )}
      <div ref={mount} className="athena-mobile-document-mount" />
    </>
  );
}

/** Full document SDK, without the legacy partial block/image renderer. */
export default function MobileEmbeddedDocumentReader(
  props: FeishuDocumentReaderProps,
) {
  const insideShell = useMobileReadingShell();
  if (insideShell) return <DocumentBody {...props} />;
  return (
    <MobileReadingShell
      title={props.title}
      src={props.src}
      onOpen={props.onOpen}
    >
      <DocumentBody {...props} />
    </MobileReadingShell>
  );
}
