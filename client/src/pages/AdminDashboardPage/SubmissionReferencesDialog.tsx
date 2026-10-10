import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { platform } from '@/api';
import { UserSelect } from '@/components/business-ui/user-select';
import { listUsersByIds } from '@/components/business-ui/api/users/service';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { ICourseSubmission } from '@shared/api.interface';

interface Props {
  submission: ICourseSubmission | null;
  onClose: () => void;
  onSaved: (submission: ICourseSubmission) => Promise<void>;
}

export default function SubmissionReferencesDialog({
  submission,
  onClose,
  onSaved,
}: Props) {
  const [instructorUserId, setInstructorUserId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!submission) return;
    setError('');
    setInstructorUserId(
      submission.instructorUserId ||
        (submission.instructor === submission.submitterName
          ? submission.submitterUserId
          : null),
    );
  }, [submission]);

  const save = async (): Promise<void> => {
    if (!submission || !instructorUserId) return;
    setSaving(true);
    setError('');
    try {
      const users = await listUsersByIds([instructorUserId]);
      const name = users.data.userInfoMap[instructorUserId]?.name;
      const instructor = name?.zh_cn || name?.en_us || '';
      if (!instructor) throw new Error('无法读取讲师姓名，请重新选择');
      const result = await platform.updateSubmissionReferences(submission.id, {
        instructorUserId,
        instructor,
      });
      toast.success('关联信息已保存，请核对同步预览');
      onClose();
      await onSaved(result);
    } catch (cause: unknown) {
      const response = cause as { response?: { data?: { message?: unknown } } };
      const message = response.response?.data?.message;
      setError(
        typeof message === 'string'
          ? message
          : cause instanceof Error
            ? cause.message
            : '关联信息保存失败，请重试',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog
      open={Boolean(submission)}
      onOpenChange={(open: boolean) => {
        if (!open && !saving) onClose();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>修正讲师映射</DialogTitle>
          <DialogDescription>
            {submission?.title}
            ：保存后进入同步预览。课程内容、题目和上架状态保持不变；正式表已有不同关联时会提示核对。
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-2">
          <Label>实际讲师</Label>
          <UserSelect
            value={instructorUserId}
            onChange={setInstructorUserId}
            disabled={saving}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <DialogFooter>
          <Button
            disabled={saving || !instructorUserId}
            onClick={() => void save()}
          >
            {saving ? '保存中…' : '保存并预览同步'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
