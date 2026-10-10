import { useEffect, useState, type FormEvent } from 'react';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import {
  formatLearningDeadline,
  validateLearningDeadlineExtension,
} from '@/utils/learning-deadline';

export interface LearningDeadlineExtensionTarget {
  courseTitle: string;
  currentDeadlineAt: string;
}

interface LearningDeadlineExtensionDialogProps {
  target: LearningDeadlineExtensionTarget | null;
  onClose: () => void;
  onSubmit: (nextDeadlineAt: string, reason: string) => Promise<void>;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function toDateTimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return [
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  ].join('T');
}

export default function LearningDeadlineExtensionDialog({
  target,
  onClose,
  onSubmit,
}: LearningDeadlineExtensionDialogProps) {
  const [nextDeadlineAt, setNextDeadlineAt] = useState('');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!target) return;
    setNextDeadlineAt(toDateTimeLocalValue(target.currentDeadlineAt));
    setReason('');
    setError('');
  }, [target]);

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ): Promise<void> => {
    event.preventDefault();
    if (!target || submitting) return;

    const candidate = new Date(`${nextDeadlineAt}:00`);
    const candidateIso = Number.isNaN(candidate.getTime())
      ? ''
      : candidate.toISOString();
    const validationError = validateLearningDeadlineExtension(
      target.currentDeadlineAt,
      candidateIso,
    );
    if (validationError) {
      setError(validationError);
      return;
    }
    if (!reason.trim()) {
      setError('请填写延期原因');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      await onSubmit(candidate.toISOString(), reason.trim());
    } catch (submitError: unknown) {
      setError(
        submitError instanceof Error ? submitError.message : '延期失败，请重试',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog
      open={Boolean(target)}
      onOpenChange={(open) => {
        if (!open && !submitting) onClose();
      }}
    >
      <DialogContent className="max-w-lg rounded-[24px]">
        <form onSubmit={(event) => void handleSubmit(event)}>
          <DialogHeader>
            <DialogTitle>延期必修课截止时间</DialogTitle>
            <DialogDescription>
              {target ? (
                <>
                  课程「{target.courseTitle}」当前截止时间为{' '}
                  {formatLearningDeadline(target.currentDeadlineAt) ?? '—'}。
                  延期只调整截止时间，不改变学习进度或提醒规则。
                </>
              ) : (
                '延期只调整截止时间，不改变学习进度或提醒规则。'
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-5 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="learning-deadline-extension-at">
                延期后的截止时间
              </Label>
              <Input
                id="learning-deadline-extension-at"
                type="datetime-local"
                value={nextDeadlineAt}
                onChange={(event) => {
                  setNextDeadlineAt(event.target.value);
                  setError('');
                }}
                disabled={submitting}
                required
              />
              <p className="text-xs text-slate-400">
                必须晚于当前截止时间，并且晚于此刻。
              </p>
            </div>
            <div className="space-y-2">
              <Label htmlFor="learning-deadline-extension-reason">
                延期原因
              </Label>
              <Textarea
                id="learning-deadline-extension-reason"
                value={reason}
                onChange={(event) => {
                  setReason(event.target.value);
                  setError('');
                }}
                placeholder="例如：员工因项目上线需要顺延学习时间"
                className="min-h-24 rounded-xl"
                disabled={submitting}
                required
              />
            </div>
            {error && (
              <p className="rounded-xl border border-rose-100 bg-rose-50 p-3 text-sm text-rose-700">
                {error}
              </p>
            )}
          </div>

          <DialogFooter className="mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="rounded-full"
            >
              取消
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="rounded-full"
            >
              {submitting ? '提交中…' : '确认延期'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
