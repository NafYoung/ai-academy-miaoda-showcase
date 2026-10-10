import { useCallback, useEffect, useRef, useState } from 'react';
import {
  BellRing,
  BookOpen,
  CalendarClock,
  CalendarPlus,
  Clock3,
  Database,
  FileQuestion,
  Layers3,
  Link2,
  RefreshCw,
  ShieldAlert,
  Trash2,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { platform } from '@/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  IAcademyCourse,
  IAdminCourseDeletionPreview,
} from '@shared/api.interface';

interface CourseDeletionDialogProps {
  course: IAcademyCourse | null;
  onClose: () => void;
  onDeleted: () => void;
}

interface DeletionMetric {
  label: string;
  value: number;
  icon: typeof BookOpen;
}

interface RequestError {
  message?: unknown;
  response?: {
    data?: { message?: unknown; error?: { message?: unknown } };
  };
}

function errorMessage(error: unknown): string {
  const requestError = error as RequestError;
  const message =
    requestError.response?.data?.error?.message ??
    requestError.response?.data?.message ??
    requestError.message;
  return typeof message === 'string' && message.trim()
    ? message
    : '操作失败，请稍后重试';
}

export default function CourseDeletionDialog({
  course,
  onClose,
  onDeleted,
}: CourseDeletionDialogProps) {
  const [preview, setPreview] = useState<IAdminCourseDeletionPreview | null>(
    null,
  );
  const [previewError, setPreviewError] = useState('');
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [historyDeletionConfirmed, setHistoryDeletionConfirmed] =
    useState(false);
  const [deleting, setDeleting] = useState(false);
  const previewRequestRef = useRef(0);

  const loadPreview = useCallback(async (courseId: string): Promise<void> => {
    const requestId = previewRequestRef.current + 1;
    previewRequestRef.current = requestId;
    setPreviewLoading(true);
    setPreview(null);
    setPreviewError('');
    try {
      const nextPreview = await platform.previewAdminCourseDeletion(courseId);
      if (previewRequestRef.current !== requestId) return;
      setPreview(nextPreview);
    } catch (error: unknown) {
      if (previewRequestRef.current !== requestId) return;
      setPreviewError(errorMessage(error));
      toast.error(errorMessage(error));
    } finally {
      if (previewRequestRef.current === requestId) setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    setPreview(null);
    setPreviewError('');
    setConfirmationText('');
    setHistoryDeletionConfirmed(false);
    if (!course) {
      previewRequestRef.current += 1;
      setPreviewLoading(false);
      return;
    }
    void loadPreview(course.id);
  }, [course, loadPreview]);

  const closeDialog = (): void => {
    if (deleting) return;
    previewRequestRef.current += 1;
    onClose();
  };

  const retryPreview = (): void => {
    if (course && !deleting) void loadPreview(course.id);
  };

  const confirmDeletion = async (): Promise<void> => {
    if (
      !course ||
      !preview ||
      !preview.canDelete ||
      confirmationText !== preview.course.title ||
      !historyDeletionConfirmed ||
      deleting
    ) {
      return;
    }
    setDeleting(true);
    try {
      const result = await platform.deleteAdminCourse(course.id, {
        confirmed: true,
        confirmationText,
        deleteLearningHistory: true,
        // The token must come from the latest preview, never from a stale dialog.
        previewToken: preview.previewToken,
      });
      toast.success(`“${result.courseTitle}”已永久删除`);
      onDeleted();
      onClose();
    } catch (error: unknown) {
      toast.error(errorMessage(error));
      // A failed deletion can invalidate the token. Re-read the impact preview
      // before allowing another attempt, matching the destructive API contract.
      if (course) void loadPreview(course.id);
    } finally {
      setDeleting(false);
    }
  };

  const deletionMetrics: DeletionMetric[] = preview
    ? [
        {
          label: '课时记录',
          value: preview.counts.lessonRecords,
          icon: Layers3,
        },
        {
          label: '题库记录',
          value: preview.counts.quizRecords,
          icon: FileQuestion,
        },
        {
          label: '学习任务',
          value: preview.counts.learningAssignments,
          icon: UsersRound,
        },
        {
          label: '学习期限',
          value: preview.counts.learningDeadlines,
          icon: CalendarClock,
        },
        {
          label: '延期记录',
          value: preview.counts.deadlineExtensions,
          icon: CalendarPlus,
        },
        {
          label: '学习时长',
          value: preview.counts.learningTimeSessions,
          icon: Clock3,
        },
        {
          label: '提醒记录',
          value: preview.counts.reminderLogs,
          icon: BellRing,
        },
        {
          label: '适用部门',
          value: preview.counts.targetDepartments,
          icon: Database,
        },
      ]
    : [];

  const canConfirmDeletion = Boolean(
    preview?.canDelete &&
    preview.course.title === confirmationText &&
    historyDeletionConfirmed,
  );

  return (
    <Dialog
      open={Boolean(course)}
      onOpenChange={(open) => {
        if (!open) closeDialog();
      }}
    >
      <DialogContent className="max-h-[88vh] max-w-2xl overflow-y-auto rounded-[24px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-rose-700">
            <ShieldAlert className="size-5" />
            永久删除课程
          </DialogTitle>
          <DialogDescription>
            这是不可恢复的操作。系统会先重新核验影响范围，并最后才删除课程本体。
          </DialogDescription>
        </DialogHeader>

        {previewLoading ? (
          <div className="grid place-items-center py-14" aria-live="polite">
            <RefreshCw className="size-8 animate-spin text-rose-500" />
            <span className="sr-only">正在加载删除影响预览</span>
          </div>
        ) : preview ? (
          <div className="space-y-5">
            <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
              <p className="text-xs font-bold text-rose-500">将永久删除</p>
              <p className="mt-1 font-black text-rose-950">
                {preview.course.title}
              </p>
            </div>

            {preview.blockingReasons.length > 0 && (
              <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm text-amber-900">
                {preview.blockingReasons.join('；')}
              </div>
            )}

            <div>
              <p className="text-sm font-black text-slate-950">
                将一并清理的关联数据
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {deletionMetrics.map((metric: DeletionMetric) => {
                  const MetricIcon = metric.icon;
                  return (
                    <div
                      key={metric.label}
                      className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3"
                    >
                      <span className="flex items-center gap-2 text-sm text-slate-600">
                        <MetricIcon className="size-4 text-slate-400" />
                        {metric.label}
                      </span>
                      <span className="font-black text-slate-950">
                        {metric.value}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
              <p className="flex items-center gap-2 font-black">
                <Link2 className="size-4" />
                投稿审核记录会保留
              </p>
              <p className="mt-1">
                共 {preview.preservedSubmissionCount}{' '}
                条关联投稿，用于保留投稿人、审核意见和课程来源凭证；系统会解除已删除课程的关联，并将其标记为需重新同步。
              </p>
            </div>

            <div className="space-y-3">
              <Label htmlFor="course-delete-confirmation">
                输入完整课程名以确认：
                <span className="font-black text-slate-950">
                  {preview.course.title}
                </span>
              </Label>
              <Input
                id="course-delete-confirmation"
                value={confirmationText}
                onChange={(event) => setConfirmationText(event.target.value)}
                placeholder="完整输入课程名"
                autoComplete="off"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-white p-4">
              <Checkbox
                id="course-delete-history"
                checked={historyDeletionConfirmed}
                onCheckedChange={(checked) =>
                  setHistoryDeletionConfirmed(checked === true)
                }
                className="mt-0.5"
              />
              <Label
                htmlFor="course-delete-history"
                className="cursor-pointer text-sm leading-6 text-slate-700"
              >
                我确认同时永久删除该课程的学习任务、时长、提醒和适用部门记录。
              </Label>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-800">
            <p>{previewError || '删除预览暂不可用，未执行任何删除操作。'}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-full border-rose-200 bg-white text-rose-700"
              disabled={deleting || previewLoading}
              onClick={retryPreview}
            >
              <RefreshCw className="size-4" />
              重新获取预览
            </Button>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={deleting}
            onClick={closeDialog}
          >
            取消
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="rounded-full"
            disabled={deleting || !canConfirmDeletion}
            onClick={() => void confirmDeletion()}
          >
            <Trash2 />
            {deleting ? '删除中…' : '永久删除课程'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
