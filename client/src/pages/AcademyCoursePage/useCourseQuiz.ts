import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@lark-apaas/client-toolkit/logger';
import { platform } from '@/api';
import type { CourseQuizResponse, ICourseQuiz } from '@shared/api.interface';
import { availableCourseQuiz } from './course-quiz-availability';

interface CourseQuizState {
  courseId: string;
  quiz: CourseQuizResponse;
  confirmedNoQuiz: boolean;
}

/** Quiet discovery stays mounted even while no quiz is available. */
export function useCourseQuiz(
  courseId: string,
  enabled: boolean,
  refreshKey: number,
) {
  const [state, setState] = useState<CourseQuizState | null>(null);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    const requestVersion: number = ++requestVersionRef.current;
    if (!enabled || !courseId) {
      setState(null);
      return;
    }
    void platform
      .getCourseQuiz(courseId)
      .then((result: CourseQuizResponse) => {
        if (requestVersionRef.current !== requestVersion) return;
        setState({ courseId, quiz: availableCourseQuiz(result, courseId), confirmedNoQuiz: result === null });
      })
      .catch(() => {
        if (requestVersionRef.current !== requestVersion) return;
        setState({ courseId, quiz: null, confirmedNoQuiz: false });
        // Keep the failure observable without exposing request headers or user data.
        logger.warn('课程页题库读取未成功，将在下次刷新时重新读取');
      });
    return () => {
      requestVersionRef.current += 1;
    };
  }, [courseId, enabled, refreshKey]);

  const updateQuiz = useCallback(
    (quiz: ICourseQuiz): void => {
      if (quiz.courseId !== courseId) return;
      // A response fetched before submission must not undo the new answer state.
      requestVersionRef.current += 1;
      setState({ courseId, quiz: availableCourseQuiz(quiz, courseId), confirmedNoQuiz: false });
    },
    [courseId],
  );

  return {
    quiz: enabled && state?.courseId === courseId ? state.quiz : null,
    confirmedNoQuiz: enabled && state?.courseId === courseId && state.confirmedNoQuiz,
    updateQuiz,
  };
}
