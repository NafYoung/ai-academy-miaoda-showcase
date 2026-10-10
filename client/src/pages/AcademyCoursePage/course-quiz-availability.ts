import type { CourseQuizResponse, ICourseQuiz } from '@shared/api.interface';
import { getQuizQuestionCount } from '../../../../shared/course-quiz';

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object';
}

/** Reject empty, stale-course and malformed responses before rendering controls. */
function isAvailableCourseQuiz(
  value: unknown,
  courseId: string,
): value is ICourseQuiz {
  if (
    !isRecord(value) ||
    value.courseId !== courseId ||
    typeof value.version !== 'string' ||
    !value.version.trim() ||
    typeof value.totalQuestions !== 'number' ||
    !Number.isSafeInteger(value.totalQuestions) ||
    value.totalQuestions < 1 ||
    value.totalQuestions !== getQuizQuestionCount(value.version) ||
    !Array.isArray(value.questions) ||
    value.questions.length !== value.totalQuestions ||
    typeof value.correctCount !== 'number' ||
    typeof value.remainingCount !== 'number' ||
    typeof value.completed !== 'boolean'
  )
    return false;

  for (const question of value.questions) {
    if (
      !isRecord(question) ||
      typeof question.id !== 'string' ||
      !question.id ||
      typeof question.sequence !== 'number' ||
      typeof question.question !== 'string' ||
      !question.question.trim() ||
      typeof question.answeredCorrectly !== 'boolean' ||
      !isRecord(question.options)
    )
      return false;
    const options: Record<string, unknown> = question.options;
    if (
      !['A', 'B', 'C', 'D'].every((key: string): boolean => {
        const option: unknown = options[key];
        return typeof option === 'string' && Boolean(option.trim());
      })
    )
      return false;
  }
  return true;
}

export function availableCourseQuiz(
  value: unknown,
  courseId: string,
): CourseQuizResponse {
  return isAvailableCourseQuiz(value, courseId) ? value : null;
}
