import { AlertTriangle, FileStack, RefreshCw, Sparkles } from 'lucide-react';
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
import type { ICourseQuizSourceOption } from '@shared/api.interface';

interface CourseQuizGenerationDialogProps {
  open: boolean;
  courseId: string;
  courseTitle: string;
  courseSource: string;
  sources: ICourseQuizSourceOption[];
  selectedSourceIds: Set<string>;
  sourcesLoading: boolean;
  sourcesError: string;
  startingGeneration: boolean;
  allowMultipleSources: boolean;
  onOpenChange: (open: boolean) => void;
  onRetrySources: () => void;
  onToggleSource: (courseId: string, checked: boolean) => void;
  onStart: () => void;
}

function sourceTypeLabel(option: ICourseQuizSourceOption): string {
  if (option.sourceType === 'image') return '图片资料';
  if (option.sourceType === 'file') return '文档/PDF';
  if (option.sourceType === 'minutes') return '课程妙记';
  return '在线文档';
}

export default function CourseQuizGenerationDialog({
  open,
  courseId,
  courseTitle,
  courseSource,
  sources,
  selectedSourceIds,
  sourcesLoading,
  sourcesError,
  startingGeneration,
  allowMultipleSources,
  onOpenChange,
  onRetrySources,
  onToggleSource,
  onStart,
}: CourseQuizGenerationDialogProps) {
  const closeDialog = (): void => {
    if (!startingGeneration) onOpenChange(false);
  };

  const canStart = selectedSourceIds.size > 0 && !startingGeneration;

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) closeDialog();
        else onOpenChange(true);
      }}
    >
      <DialogContent className="max-h-[86vh] max-w-2xl overflow-y-auto rounded-[24px]">
        <DialogHeader>
          <DialogTitle>选择出题资料</DialogTitle>
          <DialogDescription>
            {allowMultipleSources
              ? `单选一门资料会生成“${courseTitle}”的课程题库；勾选多门资料会合并生成专题题库。`
              : `本次仅使用“${courseTitle}”自己的资料生成独立课程题库。`}
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-start gap-2 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-950">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-600" />
          <p>
            当前生成会读取云文档正文文字；图片、嵌入视频和视频页面暂不会自动识别为出题文本。仅打开视频页面，也不能证明已经读取到视频转写内容。
            {courseSource === '内部' && ' 内部课程仅允许使用本课程资料。'}
          </p>
        </div>

        {sourcesLoading ? (
          <div className="grid place-items-center py-14" aria-live="polite">
            <RefreshCw className="size-8 animate-spin text-primary" />
            <span className="sr-only">正在加载可用出题资料</span>
          </div>
        ) : sourcesError ? (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-5 text-sm text-rose-800">
            <p>{sourcesError}</p>
            <Button
              type="button"
              variant="outline"
              className="mt-4 rounded-full border-rose-200 bg-white text-rose-700"
              disabled={startingGeneration}
              onClick={onRetrySources}
            >
              <RefreshCw className="size-4" />
              重新加载资料
            </Button>
          </div>
        ) : sources.length === 0 ? (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-900">
            当前没有可用的出题资料，无法启动 AI 生成。
          </div>
        ) : (
          <div className="space-y-2">
            {sources.map((source: ICourseQuizSourceOption) => {
              const checked = selectedSourceIds.has(source.courseId);
              return (
                <label
                  key={source.courseId}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 ${
                    checked
                      ? 'border-primary/30 bg-blue-50'
                      : 'border-slate-100 bg-white'
                  }`}
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(value) =>
                      onToggleSource(source.courseId, value === true)
                    }
                    className="mt-0.5"
                    aria-label={`选择${source.courseTitle}作为出题资料`}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block font-black text-slate-900">
                      {source.courseTitle}
                    </span>
                    <span className="mt-1 block text-xs text-slate-500">
                      {sourceTypeLabel(source)} · {source.sourceCount}{' '}
                      个资料文件
                    </span>
                  </span>
                  {source.courseId === courseId && (
                    <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-primary">
                      当前课程
                    </span>
                  )}
                </label>
              );
            })}
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={closeDialog}
            className="rounded-full"
            disabled={startingGeneration}
          >
            取消
          </Button>
          <Button
            type="button"
            disabled={!canStart}
            onClick={onStart}
            className="rounded-full"
          >
            {startingGeneration ? (
              <RefreshCw className="size-4 animate-spin" />
            ) : allowMultipleSources && selectedSourceIds.size > 1 ? (
              <FileStack className="size-4" />
            ) : (
              <Sparkles className="size-4" />
            )}
            {startingGeneration
              ? '正在创建任务…'
              : allowMultipleSources && selectedSourceIds.size > 1
                ? `生成专题题库（${selectedSourceIds.size}门资料）`
                : '生成课程题库'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
