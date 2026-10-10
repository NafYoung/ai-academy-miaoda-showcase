import { useEffect, useState } from 'react';
import {
  Check,
  RefreshCw,
  RotateCcw,
  Save,
  Send,
  Trash2,
  Undo2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
  ICourseQuizAdminDraft,
  ICourseQuizAdminQuestion,
  ICourseQuizDraftUpdateInput,
} from '@shared/api.interface';

interface QuizDraftEditorProps {
  draft: ICourseQuizAdminDraft;
  canPublish: boolean;
  saving: boolean;
  publishing: boolean;
  onDirtyChange?: (dirty: boolean) => void;
  onSave: (input: ICourseQuizDraftUpdateInput) => Promise<boolean>;
  onPublish: (input: ICourseQuizDraftUpdateInput) => Promise<void>;
}

const toUpdateInput = (
  draft: ICourseQuizAdminDraft,
  removedQuestionIds: Set<string> = new Set<string>(),
): ICourseQuizDraftUpdateInput => ({
  version: draft.version,
  questions: draft.questions
    .filter(
      (question: ICourseQuizAdminQuestion): boolean =>
        !removedQuestionIds.has(question.id),
    )
    .map((question: ICourseQuizAdminQuestion) => ({
      id: question.id,
      question: question.question,
      options: { ...question.options },
      correctAnswer: question.correctAnswer,
      explanation: question.explanation,
    })),
});

export default function QuizDraftEditor({
  draft,
  canPublish,
  saving,
  publishing,
  onDirtyChange,
  onSave,
  onPublish,
}: QuizDraftEditorProps) {
  const [editableDraft, setEditableDraft] =
    useState<ICourseQuizAdminDraft>(draft);
  const [removedQuestionIds, setRemovedQuestionIds] = useState<Set<string>>(
    new Set(),
  );

  useEffect(() => {
    setEditableDraft(draft);
    setRemovedQuestionIds(new Set());
  }, [draft]);
  useEffect(() => {
    onDirtyChange?.(
      JSON.stringify(toUpdateInput(editableDraft, removedQuestionIds)) !==
        JSON.stringify(toUpdateInput(draft)),
    );
  }, [draft, editableDraft, onDirtyChange, removedQuestionIds]);

  const visibleQuestions: ICourseQuizAdminQuestion[] =
    editableDraft.questions.filter(
      (question: ICourseQuizAdminQuestion): boolean =>
        !removedQuestionIds.has(question.id),
    );

  const updateQuestion = (
    questionId: string,
    update: Partial<ICourseQuizAdminQuestion>,
  ): void => {
    setEditableDraft((current: ICourseQuizAdminDraft) => ({
      ...current,
      questions: current.questions.map((question: ICourseQuizAdminQuestion) =>
        question.id === questionId ? { ...question, ...update } : question,
      ),
    }));
  };

  const updateOption = (
    questionId: string,
    key: 'A' | 'B' | 'C' | 'D',
    value: string,
  ): void => {
    const question = editableDraft.questions.find(
      (item: ICourseQuizAdminQuestion) => item.id === questionId,
    );
    if (!question) return;
    updateQuestion(questionId, {
      options: { ...question.options, [key]: value },
    });
  };

  const removeQuestion = (questionId: string): void => {
    if (visibleQuestions.length <= 1 || saving || publishing) return;
    setRemovedQuestionIds((current: Set<string>) => {
      const next = new Set(current);
      next.add(questionId);
      return next;
    });
  };

  const undoLastRemoval = (): void => {
    setRemovedQuestionIds((current: Set<string>) => {
      const ids: string[] = [...current];
      const lastId: string | undefined = ids.pop();
      if (!lastId) return current;
      return new Set(ids);
    });
  };

  const resetRemovals = (): void => {
    setRemovedQuestionIds(new Set());
  };

  const updateInput: ICourseQuizDraftUpdateInput = toUpdateInput(
    editableDraft,
    removedQuestionIds,
  );

  return (
    <div className="space-y-5">
      <div className="rounded-2xl bg-blue-50 px-4 py-3 text-sm text-blue-950">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <p className="font-black">{editableDraft.courseTitle}</p>
            <p className="mt-1 text-xs text-blue-700">
              {editableDraft.sourceLabel} · 版本 {editableDraft.version}
            </p>
          </div>
          {editableDraft.sourceUrl && (
            <a
              href={editableDraft.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-primary underline-offset-4 hover:underline"
            >
              查看原始资料
            </a>
          )}
        </div>
        <p className="mt-2 leading-6">
          <span className="font-black">课程学习目标：</span>
          {editableDraft.courseGoal}
        </p>
      </div>

      {removedQuestionIds.size > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
          <p>
            已标记移除 {removedQuestionIds.size} 道题，保存后会以当前保留的{' '}
            {visibleQuestions.length} 道题生成新版本。至少保留 1
            道题；未保存的移除可以恢复。
          </p>
          <div className="flex shrink-0 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving || publishing}
              onClick={undoLastRemoval}
              className="rounded-full border-amber-300 bg-white"
            >
              <Undo2 className="size-3.5" />
              撤销上次移除
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={saving || publishing}
              onClick={resetRemovals}
              className="rounded-full"
            >
              <RotateCcw className="size-3.5" />
              恢复全部
            </Button>
          </div>
        </div>
      )}

      {visibleQuestions.map(
        (question: ICourseQuizAdminQuestion, index: number) => {
          const displaySequence: number = index + 1;
          return (
            <article
              key={question.id}
              className="rounded-2xl border border-slate-100 bg-white p-4"
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-black text-slate-500">
                  第 {displaySequence} 题
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={
                    saving || publishing || visibleQuestions.length <= 1
                  }
                  onClick={() => removeQuestion(question.id)}
                  className="rounded-full border-rose-200 text-rose-700 hover:bg-rose-50"
                  aria-label={`移除第 ${displaySequence} 题`}
                  title={
                    visibleQuestions.length <= 1
                      ? '至少保留 1 道题'
                      : '移除后可在保存前撤销'
                  }
                >
                  <Trash2 className="size-3.5" />
                  移除
                </Button>
              </div>
              <Textarea
                aria-label={`第 ${displaySequence} 题题干`}
                disabled={saving || publishing}
                value={question.question}
                onChange={(event) =>
                  updateQuestion(question.id, { question: event.target.value })
                }
                className="mt-2 min-h-20 rounded-xl font-bold"
              />

              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                {(['A', 'B', 'C', 'D'] as const).map((key) => (
                  <div key={key} className="flex items-center gap-2">
                    <span
                      className={`grid size-8 shrink-0 place-items-center rounded-lg text-xs font-black ${
                        key === question.correctAnswer
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {key}
                    </span>
                    <Input
                      aria-label={`第 ${displaySequence} 题选项 ${key}`}
                      disabled={saving || publishing}
                      value={question.options[key]}
                      onChange={(event) =>
                        updateOption(question.id, key, event.target.value)
                      }
                      className="rounded-xl"
                    />
                  </div>
                ))}
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr]">
                <div>
                  <p className="text-xs font-black text-slate-500">正确答案</p>
                  <Select
                    disabled={saving || publishing}
                    value={question.correctAnswer}
                    onValueChange={(value: string) =>
                      updateQuestion(question.id, {
                        correctAnswer: value as 'A' | 'B' | 'C' | 'D',
                      })
                    }
                  >
                    <SelectTrigger
                      aria-label={`第 ${displaySequence} 题正确答案`}
                      className="mt-2 w-full rounded-xl"
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {(['A', 'B', 'C', 'D'] as const).map((key) => (
                        <SelectItem key={key} value={key}>
                          {key}. {question.options[key]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <p className="text-xs font-black text-slate-500">答案解析</p>
                  <Textarea
                    aria-label={`第 ${displaySequence} 题答案解析`}
                    disabled={saving || publishing}
                    value={question.explanation}
                    onChange={(event) =>
                      updateQuestion(question.id, {
                        explanation: event.target.value,
                      })
                    }
                    className="mt-2 min-h-20 rounded-xl"
                  />
                </div>
              </div>

              <div className="mt-3 space-y-2 text-xs leading-5">
                <p className="rounded-xl bg-indigo-50 px-3 py-2 text-indigo-900">
                  <span className="font-black">考查知识点：</span>
                  {question.learningPoint}
                </p>
                <p className="rounded-xl bg-amber-50 px-3 py-2 text-amber-900">
                  <span className="font-black">原文依据：</span>
                  {question.evidence}
                </p>
              </div>
            </article>
          );
        },
      )}

      <div className="sticky bottom-0 flex flex-wrap justify-end gap-3 rounded-2xl border border-white bg-white/90 p-3 backdrop-blur-xl">
        <Button
          type="button"
          variant="outline"
          disabled={saving || publishing}
          onClick={() => void onSave(updateInput)}
          className="rounded-full"
        >
          {saving ? (
            <RefreshCw className="size-4 animate-spin" />
          ) : (
            <Save className="size-4" />
          )}
          {saving ? '保存中…' : '保存修改'}
        </Button>
        {canPublish && (
          <Button
            type="button"
            disabled={saving || publishing}
            onClick={() => void onPublish(updateInput)}
            className="rounded-full"
          >
            {publishing ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
            {publishing ? '发布中…' : '保存并发布'}
          </Button>
        )}
        {!canPublish && (
          <span className="inline-flex items-center gap-1.5 px-2 text-xs text-slate-500">
            <Check className="size-4 text-emerald-600" />
            保存后由管理员最终发布
          </span>
        )}
      </div>
    </div>
  );
}
