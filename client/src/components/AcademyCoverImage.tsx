import { useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { BookOpen } from 'lucide-react';
import { AcademyCoverScopeContext } from '../utils/academy-cover-context';
import { resolveAcademyCover } from '../api/academy';
import { academyCoverResolutionPath } from '../utils/academy-cover';
import { academyCoverCache } from '../utils/academy-cover-cache';
import { Image, type ImageProps } from './ui/image';

interface AcademyCoverImageProps extends Omit<ImageProps, 'src' | 'onError'> {
  src: string;
  fallback?: ReactNode;
}

/** 源引用改变时重置失败状态；图片请求本身不承担妙搭 API 鉴权。 */
export function AcademyCoverImage(props: AcademyCoverImageProps) {
  const cacheScope = useContext(AcademyCoverScopeContext);
  return (
    <ResolvedCover
      key={`${cacheScope}:${props.src}`}
      {...props}
      cacheScope={cacheScope}
    />
  );
}

function ResolvedCover({
  src,
  fallback,
  cacheScope,
  ...props
}: AcademyCoverImageProps & { cacheScope: string }) {
  const needsResolution = Boolean(academyCoverResolutionPath(src));
  const [resolved, setResolved] = useState(needsResolution ? '' : src);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);
  const retryStarted = useRef(false);

  useEffect(() => {
    if (!needsResolution) return;
    const controller = new AbortController();
    void resolveAcademyCover(src, controller.signal, cacheScope).then(
      (url) => {
        if (!controller.signal.aborted) setResolved(url);
      },
      () => {
        if (!controller.signal.aborted) setFailed(true);
      },
    );
    return () => controller.abort();
  }, [src, needsResolution, attempt, cacheScope]);

  if (failed || !resolved) {
    return (
      fallback ?? (
        <div
          className="size-full min-h-24 grid place-items-center bg-gradient-to-br from-blue-100 to-violet-100"
          role="img"
          aria-label={props.alt || '课程封面'}
        >
          <BookOpen className="size-10 text-primary/30" aria-hidden="true" />
        </div>
      )
    );
  }

  return (
    <Image
      {...props}
      key={attempt}
      src={resolved}
      unoptimized={needsResolution || props.unoptimized}
      onError={() => {
        if (needsResolution) academyCoverCache.invalidate(src, cacheScope);
        if (needsResolution && !retryStarted.current) {
          // 旧签名失效时只重新取址一次，防止永久坏图制造请求循环。
          retryStarted.current = true;
          setResolved('');
          setAttempt(1);
        } else {
          setFailed(true);
        }
      }}
    />
  );
}
