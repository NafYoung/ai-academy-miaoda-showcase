import { RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import QuizDraftEditor from './QuizDraftEditor';
import type {
  ICourseQuizAdminDraft,
  ICourseQuizDraftUpdateInput,
} from '@shared/api.interface';

export type CourseQuizDraftMode = 'review' | 'revision';

interface CourseQuizDraftDialogProps {
  open: boolean;
  mode: CourseQuizDraftMode;
  draft: ICourseQuizAdminDraft | null;
  loading: boolean;
  error: string;
  canPublish: boolean;
  saving: boolean;
  publishing: boolean;
  onDirtyChange: (dirty: boolean) => void;
  onOpenChange: (open: boolean) => void;
  onRetry: () => void;
  onSave: (input: ICourseQuizDraftUpdateInput) => Promise<boolean>;
  onPublish: (input: ICourseQuizDraftUpdateInput) => Promise<void>;
}

export default function CourseQuizDraftDialog({
  open,
  mode,
  draft,
  loading,
  error,
  canPublish,
  saving,
  publishing,
  onDirtyChange,
  onOpenChange,
  onRetry,
  onSave,
  onPublish,
}: CourseQuizDraftDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-5xl overflow-y-auto rounded-[24px]">
        <DialogHeader>
          <DialogTitle>
            {mode === 'revision' ? '编辑已发布题目' : '审核和编辑题库'}
          </DialogTitle>
          <DialogDescription>
            {mode === 'revision'
              ? '已将当前线上题库复制为修订草稿。保存不会影响员工正在使用的题库，最终发布仍由平台管理员确认。'
              : draft?.authoringSource !== 'ai'
                ? '这是课程现有的待审核题目。可核对并修改题干、选项、答案和解析；原文依据与知识点保持只读。'
                : '这是根据课程正文生成的 AI 草稿。可修改题干、四个选项、正确答案和解析；原文依据与知识点保持只读。'}
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="grid place-items-center py-16" aria-live="polite">
            <RefreshCw className="size-7 animate-spin text-primary" />
            <span className="sr-only">正在加载题库草稿</span>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-800">
            {error}
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-full border-rose-200 bg-white text-rose-700"
              onClick={onRetry}
            >
              <RefreshCw className="size-4" />
              重新加载草稿
            </Button>
          </div>
        ) : draft ? (
          <QuizDraftEditor
            draft={draft}
            canPublish={canPublish}
            saving={saving}
            publishing={publishing}
            onDirtyChange={onDirtyChange}
            onSave={onSave}
            onPublish={onPublish}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
