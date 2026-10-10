import { useEffect } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { toast } from 'sonner';
import { platform } from '@/api';
import type {
  ILearningTimeSession,
  LearningTimeSessionAction,
} from '@shared/api.interface';
import { CourseActiveTimeAccumulator } from './course-active-time-accumulator';

interface UseCourseActiveTimeOptions {
  courseId: string;
  enabled: boolean;
}

function errorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object' || !('response' in error)) {
    return undefined;
  }
  const response = error.response;
  if (!response || typeof response !== 'object' || !('status' in response)) {
    return undefined;
  }
  return typeof response.status === 'number' ? response.status : undefined;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

export function useCourseActiveTime({
  courseId,
  enabled,
}: UseCourseActiveTimeOptions): void {
  useEffect(() => {
    if (!enabled || !courseId) return undefined;

    let disposed = false;
    let pageSuspended = false;
    let creating = false;
    let session: ILearningTimeSession | null = null;
    const accumulator = new CourseActiveTimeAccumulator();
    let sequence = 0;
    let syncFailed = false;
    let requestQueue: Promise<void> = Promise.resolve();

    const isPageActive = (): boolean =>
      !disposed &&
      !pageSuspended &&
      document.visibilityState === 'visible' &&
      document.hasFocus();

    const startActiveSegment = (): void => {
      if (
        !accumulator.active &&
        session?.state === 'active' &&
        isPageActive()
      ) {
        accumulator.start(performance.now());
      }
    };

    const settleActiveSegment = (): void => {
      accumulator.pause(performance.now());
    };

    const cumulativeActiveMs = (): number => {
      return accumulator.value(performance.now());
    };

    const markFailure = (error: unknown): void => {
      logger.warn(
        `学习时长同步失败 courseId=${courseId} error=${errorMessage(error)}`,
      );
      if (!syncFailed && !disposed) {
        syncFailed = true;
        toast.error('学习时长暂未同步，不影响课程内容浏览');
      }
    };

    const markRecovered = (): void => {
      if (!syncFailed || disposed) return;
      syncFailed = false;
      toast.success('学习时长同步已恢复');
    };

    const enqueue = (task: () => Promise<void>): void => {
      requestQueue = requestQueue
        .catch(() => undefined)
        .then(task)
        .catch((error: unknown) => markFailure(error));
    };

    const sendUpdate = async (
      action: LearningTimeSessionAction,
      options: { keepalive?: boolean } = {},
    ): Promise<void> => {
      const current = session;
      if (!current || current.state === 'ended') return;
      const nextSequence = Math.max(sequence, current.lastSequence) + 1;
      sequence = nextSequence;

      try {
        const updated = await platform.updateLearningTimeSession(
          courseId,
          current.sessionId,
          {
            action,
            sequence: nextSequence,
            cumulativeActiveMs: cumulativeActiveMs(),
            ...(current.leaseToken ? { leaseToken: current.leaseToken } : {}),
          },
          options,
        );
        if (session?.sessionId !== current.sessionId) return;
        session = updated;
        sequence = Math.max(sequence, updated.lastSequence);
        markRecovered();

        if (updated.state === 'active') {
          startActiveSegment();
          return;
        }

        settleActiveSegment();
        if (isPageActive() && updated.state === 'paused') {
          enqueue(() => sendUpdate('resume'));
        } else if (isPageActive() && updated.state === 'ended') {
          ensureActiveSession();
        }
      } catch (error: unknown) {
        if (
          errorStatus(error) === 409 &&
          session?.sessionId === current.sessionId
        ) {
          settleActiveSegment();
          session = { ...current, state: 'paused', leaseToken: '' };
          if (isPageActive()) enqueue(() => sendUpdate('resume'));
        }
        throw error;
      }
    };

    const createSession = async (): Promise<void> => {
      if (creating || session || !isPageActive()) return;
      creating = true;
      try {
        const created = await platform.createLearningTimeSession(courseId);
        if (disposed || pageSuspended) {
          session = created;
          await sendUpdate('end', { keepalive: true });
          return;
        }
        session = created;
        sequence = created.lastSequence;
        accumulator.reset();
        markRecovered();
        if (isPageActive()) {
          startActiveSegment();
        } else {
          enqueue(() => sendUpdate('pause'));
        }
      } finally {
        creating = false;
      }
    };

    const ensureActiveSession = (): void => {
      if (!isPageActive()) return;
      if (!session || session.state === 'ended') {
        session = null;
        accumulator.reset();
        sequence = 0;
        enqueue(createSession);
        return;
      }
      if (session.state === 'paused') {
        enqueue(() => sendUpdate('resume'));
        return;
      }
      startActiveSegment();
    };

    const reconcilePageState = (): void => {
      if (isPageActive()) {
        ensureActiveSession();
        return;
      }
      settleActiveSegment();
      if (session?.state === 'active') {
        enqueue(() => sendUpdate('pause'));
      }
    };

    const handlePageHide = (): void => {
      pageSuspended = true;
      settleActiveSegment();
      if (session && session.state !== 'ended') {
        void sendUpdate('end', { keepalive: true }).catch(markFailure);
      }
    };

    const handlePageShow = (): void => {
      pageSuspended = false;
      reconcilePageState();
    };

    document.addEventListener('visibilitychange', reconcilePageState);
    window.addEventListener('focus', reconcilePageState);
    window.addEventListener('blur', reconcilePageState);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('pageshow', handlePageShow);

    const intervalId = window.setInterval(() => {
      if (!isPageActive()) return;
      if (!session || session.state !== 'active') {
        ensureActiveSession();
        return;
      }
      enqueue(() => sendUpdate('heartbeat'));
    }, 30_000);

    reconcilePageState();

    return () => {
      disposed = true;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', reconcilePageState);
      window.removeEventListener('focus', reconcilePageState);
      window.removeEventListener('blur', reconcilePageState);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('pageshow', handlePageShow);
      settleActiveSegment();
      if (session && session.state !== 'ended') {
        void sendUpdate('end', { keepalive: true }).catch(markFailure);
      }
    };
  }, [courseId, enabled]);
}
