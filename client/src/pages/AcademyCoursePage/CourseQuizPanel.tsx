import { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardCheck,
  LoaderCircle,
  LockKeyhole,
} from 'lucide-react';
import { toast } from 'sonner';
import { platform } from '@/api';
import type {
  ICourseQuiz,
  ICourseQuizQuestion,
  ICourseQuizQuestionResult,
  ILearningProgress,
} from '@shared/api.interface';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { normalizeQuizError } from './quiz-load-error';

const QUIZ_CARD =
  'bg-[#ffffffbd] border border-[#ffffffeb] rounded-[26px] backdrop-blur-[18px] backdrop-saturate-[1.2] shadow-[0_20px_48px_#14364017]';

type AnswerKey = 'A' | 'B' | 'C' | 'D';

interface CourseQuizPanelProps {
  quiz: ICourseQuiz;
  onQuizChange: (quiz: ICourseQuiz) => void;
  onProgressChange: (progress: ILearningProgress) => void;
}

const CourseQuizPanel = ({
  quiz,
  onQuizChange,
  onProgressChange,
}: CourseQuizPanelProps) => {
  const [answers, setAnswers] = useState<Record<string, AnswerKey>>({});
  const [submitting, setSubmitting] = useState(false);
  const [wrongQuestionIds, setWrongQuestionIds] = useState<Set<string>>(
    new Set(),
  );
  const [expandedCorrectQuestionIds, setExpandedCorrectQuestionIds] = useState<
    Set<string>
  >(new Set());
  const requestVersionRef = useRef(0);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestVersionRef.current += 1;
    };
  }, []);

  const toggleCorrectQuestion = (questionId: string): void => {
    setExpandedCorrectQuestionIds((current: Set<string>) => {
      const next = new Set(current);
      if (next.has(questionId)) {
        next.delete(questionId);
      } else {
        next.add(questionId);
      }
      return next;
    });
  };

  const totalQuestions =
    quiz.totalQuestions > 0 ? quiz.totalQuestions : quiz.questions.length;

  const submitAnswers = async (): Promise<void> => {
    if (submittingRef.current) return;
    const pendingQuestions = quiz.questions.filter(
      (question: ICourseQuizQuestion) => !question.answeredCorrectly,
    );
    const hasUnanswered = pendingQuestions.some(
      (question: ICourseQuizQuestion) => !answers[question.id],
    );
    if (pendingQuestions.length === 0 || hasUnanswered) return;

    const requestVersion = requestVersionRef.current + 1;
    requestVersionRef.current = requestVersion;
    submittingRef.current = true;
    setSubmitting(true);
    try {
      const result = await platform.submitCourseQuizAnswers(quiz.courseId, {
        answers: pendingQuestions.map((question: ICourseQuizQuestion) => ({
          questionId: question.id,
          answer: answers[question.id],
        })),
      });
      if (!mountedRef.current || requestVersionRef.current !== requestVersion) {
        return;
      }
      onQuizChange(result.quiz);
      onProgressChange(result.progress);
      setAnswers({});
      const wrongIds = new Set(
        result.results
          .filter((item: ICourseQuizQuestionResult) => !item.correct)
          .map((item: ICourseQuizQuestionResult) => item.questionId),
      );
      setWrongQuestionIds(wrongIds);
      if (result.quiz.completed) {
        const resultTotalQuestions =
          result.quiz.totalQuestions > 0
            ? result.quiz.totalQuestions
            : result.quiz.questions.length;
        toast.success(`${resultTotalQuestions} 道题全部答对，课程学习已完成`);
      } else {
        toast.error(`本轮有 ${wrongIds.size} 道错题，下一轮只需重做这些题`);
      }
    } catch (error: unknown) {
      if (!mountedRef.current || requestVersionRef.current !== requestVersion) {
        return;
      }
      toast.error(`答案提交未确认成功：${normalizeQuizError(error)}`);
    } finally {
      if (mountedRef.current && requestVersionRef.current === requestVersion) {
        submittingRef.current = false;
        setSubmitting(false);
      }
    }
  };

  const correctPercent =
    totalQuestions > 0 ? (quiz.correctCount / totalQuestions) * 100 : 0;
  const pendingQuestions = quiz.questions.filter(
    (question: ICourseQuizQuestion) => !question.answeredCorrectly,
  );
  const selectedCount = pendingQuestions.filter(
    (question: ICourseQuizQuestion) => Boolean(answers[question.id]),
  ).length;
  const canSubmit =
    pendingQuestions.length > 0 && selectedCount === pendingQuestions.length;

  return (
    <section id="course-quiz" className={`${QUIZ_CARD} p-6 md:p-8 space-y-6`}>
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
            <ClipboardCheck className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h2 className="font-bold text-lg text-[#08090d]">课后测验</h2>
            <p className="text-sm text-[#14141480] mt-1">
              完成本轮全部题目后统一提交；答对的题会锁定，答错只重做错题。
            </p>
          </div>
        </div>
        <div className="md:ml-auto min-w-[180px]">
          <div className="flex items-center justify-between text-xs font-bold">
            <span className="text-[#14141480]">答对进度</span>
            <span className="text-violet-600">
              {quiz.correctCount}/{totalQuestions}（{Math.round(correctPercent)}
              %）
            </span>
          </div>
          <Progress value={correctPercent} className="h-1.5 mt-2" />
        </div>
      </div>

      {quiz.completed && (
        <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4 flex items-center gap-3 text-emerald-800">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-bold text-sm">课程学习已完成</p>
            <p className="text-xs mt-0.5 text-emerald-700">
              {totalQuestions} 道题已全部答对，学习完成状态已同步到后台。
            </p>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {quiz.questions.map((question: ICourseQuizQuestion) => {
          const selectedAnswer = answers[question.id];
          const wasWrong = wrongQuestionIds.has(question.id);

          if (question.answeredCorrectly) {
            const isExpanded = expandedCorrectQuestionIds.has(question.id);
            const reviewId = `correct-question-review-${question.sequence}`;
            return (
              <article
                key={question.id}
                className="rounded-2xl bg-emerald-50/80 border border-emerald-100 px-5 py-4"
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="flex items-start sm:items-center gap-3 min-w-0">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5 sm:mt-0" />
                    <p className="text-sm font-medium text-emerald-900 min-w-0">
                      第 {question.sequence} 题：{question.question}
                    </p>
                  </div>
                  <div className="sm:ml-auto flex items-center gap-2 shrink-0">
                    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700">
                      <LockKeyhole className="w-3.5 h-3.5" />
                      已答对
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      aria-expanded={isExpanded}
                      aria-controls={reviewId}
                      data-ai-section-type="button"
                      onClick={() => toggleCorrectQuestion(question.id)}
                      className="rounded-full text-emerald-800 hover:bg-emerald-100"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                      {isExpanded ? '收起题目' : '展开查看'}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div
                    id={reviewId}
                    className="mt-4 pt-4 border-t border-emerald-200/70"
                  >
                    <div className="grid gap-2.5 md:grid-cols-2">
                      {(
                        Object.entries(question.options) as [
                          AnswerKey,
                          string,
                        ][]
                      ).map(([key, label]) => {
                        const isCorrectAnswer =
                          question.review?.correctAnswer === key;
                        return (
                          <div
                            key={key}
                            className={`rounded-xl border px-4 py-3 text-sm ${
                              isCorrectAnswer
                                ? 'border-emerald-300 bg-emerald-100 text-emerald-950'
                                : 'border-emerald-100 bg-white/70 text-[#141414cc]'
                            }`}
                          >
                            <span className="font-bold mr-2">{key}.</span>
                            {label}
                            {isCorrectAnswer && (
                              <span className="ml-2 text-xs font-bold text-emerald-700">
                                你的正确选项
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {question.review?.explanation && (
                      <div className="mt-3 rounded-xl bg-white/65 border border-emerald-100 px-4 py-3">
                        <p className="text-xs font-bold text-emerald-800">
                          答案解析
                        </p>
                        <p className="mt-1 text-sm leading-relaxed text-emerald-950/80">
                          {question.review.explanation}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </article>
            );
          }

          return (
            <article
              key={question.id}
              className={`rounded-2xl bg-white/75 border p-5 md:p-6 transition-colors ${
                wasWrong ? 'border-amber-200' : 'border-black/5'
              }`}
            >
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-violet-50 text-violet-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {question.sequence}
                </span>
                <h3 className="text-sm md:text-base font-bold text-[#08090d] leading-relaxed">
                  {question.question}
                </h3>
              </div>

              <div className="mt-4 grid gap-2.5 md:grid-cols-2">
                {(
                  Object.entries(question.options) as [AnswerKey, string][]
                ).map(([key, label]) => (
                  <button
                    key={key}
                    type="button"
                    disabled={submitting}
                    onClick={() => {
                      setAnswers((current: Record<string, AnswerKey>) => ({
                        ...current,
                        [question.id]: key,
                      }));
                    }}
                    className={`text-left rounded-xl border px-4 py-3 text-sm transition-all ${
                      selectedAnswer === key
                        ? 'border-violet-400 bg-violet-50 text-violet-900 shadow-sm'
                        : 'border-black/5 bg-white/70 text-[#141414cc] hover:border-violet-200 hover:bg-violet-50/60'
                    }`}
                  >
                    <span className="font-bold mr-2">{key}.</span>
                    {label}
                  </button>
                ))}
              </div>

              {wasWrong && (
                <p className="mt-4 text-xs text-amber-700">
                  上轮答案不正确，请重新选择；完成所有错题后统一提交。
                </p>
              )}
            </article>
          );
        })}
      </div>

      {!quiz.completed && (
        <div className="rounded-2xl border border-violet-100 bg-violet-50/75 p-4 md:p-5 flex flex-col sm:flex-row sm:items-center gap-4">
          <div>
            <p className="text-sm font-bold text-violet-950">
              本轮已完成 {selectedCount}/{pendingQuestions.length} 题
            </p>
            <p className="mt-1 text-xs text-violet-700">
              全部选择后只需提交一次，系统会保留答对题目并汇总错题。
            </p>
          </div>
          <Button
            type="button"
            disabled={!canSubmit || submitting}
            onClick={() => void submitAnswers()}
            className="rounded-full sm:ml-auto shrink-0"
          >
            {submitting && <LoaderCircle className="w-4 h-4 animate-spin" />}
            {submitting
              ? '正在判题并保存进度…'
              : quiz.correctCount > 0
                ? `提交本轮错题（${pendingQuestions.length}题）`
                : `提交全部答案（${pendingQuestions.length}题）`}
          </Button>
        </div>
      )}
    </section>
  );
};

export default CourseQuizPanel;
