import { useState } from 'react';
import {
  Archive,
  Eye,
  EyeOff,
  LockKeyhole,
  RefreshCw,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { platform } from '@/api';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import CourseDeletionDialog from './CourseDeletionDialog';
import type { AdminCourseStatus, IAcademyCourse } from '@shared/api.interface';

export interface CourseLifecyclePanelProps {
  course: IAcademyCourse;
  onUpdated: (course: IAcademyCourse) => void;
  onDeleted: () => void;
}

interface StatusChangeTarget {
  status: AdminCourseStatus;
  actionLabel: string;
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

function statusClasses(status: string): string {
  if (status === '已完结')
    return 'border-emerald-100 bg-emerald-50 text-emerald-700';
  if (status === '更新中') return 'border-blue-100 bg-blue-50 text-blue-700';
  if (status === '已下架') return 'border-amber-100 bg-amber-50 text-amber-700';
  if (status === '归档') return 'border-slate-200 bg-slate-100 text-slate-600';
  return 'border-violet-100 bg-violet-50 text-violet-700';
}

function isEmployeeVisible(status: string): boolean {
  return !['已下架', '未上线', '归档'].includes(status);
}

/**
 * Lifecycle controls for exactly one course. The parent owns the inventory;
 * this panel only calls the existing protected lifecycle APIs for its course.
 */
export default function CourseLifecyclePanel({
  course,
  onUpdated,
  onDeleted,
}: CourseLifecyclePanelProps) {
  const [statusTarget, setStatusTarget] = useState<StatusChangeTarget | null>(
    null,
  );
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [deletionOpen, setDeletionOpen] = useState(false);

  const confirmStatusChange = async (): Promise<void> => {
    if (!statusTarget || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const nextCourse = await platform.updateAdminCourseStatus(
        course.id,
        statusTarget.status,
      );
      onUpdated(nextCourse);
      toast.success(`“${course.title}”已${statusTarget.actionLabel}`);
      setStatusTarget(null);
    } catch (error: unknown) {
      toast.error(errorMessage(error));
    } finally {
      setUpdatingStatus(false);
    }
  };

  const visible = isEmployeeVisible(course.status);

  return (
    <section className="rounded-[28px] border border-white/90 bg-white/75 p-5 shadow-[0_22px_65px_rgba(30,64,175,0.08)] backdrop-blur-xl md:p-7">
      <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-black tracking-[0.12em] text-primary">
            COURSE LIFECYCLE
          </p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <h2 className="truncate text-xl font-black text-slate-950 md:text-2xl">
              {course.title || '未命名课程'}
            </h2>
            <Badge variant="outline" className={statusClasses(course.status)}>
              {course.status || '状态未知'}
            </Badge>
            <Badge variant="outline" className="bg-white text-slate-500">
              {visible ? '员工可见' : '员工不可见'}
            </Badge>
          </div>
          <p className="mt-2 line-clamp-2 text-sm leading-6 text-slate-500">
            {course.summary || '暂无课程简介'}
          </p>
          <p className="mt-2 text-xs text-slate-400">
            {[course.courseSource, course.difficulty, course.instructor]
              .filter(Boolean)
              .join(' · ') || '暂未补充课程信息'}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 xl:justify-end">
          {course.status === '未上线' ? (
            <Button
              type="button"
              className="rounded-full"
              onClick={() =>
                setStatusTarget({ status: '已完结', actionLabel: '上线' })
              }
            >
              <Eye />
              上线课程
            </Button>
          ) : course.status === '已下架' ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() =>
                setStatusTarget({ status: '已完结', actionLabel: '恢复上线' })
              }
            >
              <RotateCcw />
              恢复上线
            </Button>
          ) : course.status === '归档' ? (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() =>
                setStatusTarget({ status: '已下架', actionLabel: '转为下架' })
              }
            >
              <EyeOff />
              转为下架
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              onClick={() =>
                setStatusTarget({ status: '已下架', actionLabel: '下架' })
              }
            >
              <EyeOff />
              下架
            </Button>
          )}

          {course.status !== '归档' && (
            <Button
              type="button"
              variant="ghost"
              className="rounded-full text-slate-500"
              onClick={() =>
                setStatusTarget({ status: '归档', actionLabel: '归档' })
              }
            >
              <Archive />
              归档
            </Button>
          )}

          {course.status === '已下架' && (
            <Button
              type="button"
              variant="ghost"
              className="rounded-full text-rose-600 hover:text-rose-700"
              onClick={() => setDeletionOpen(true)}
            >
              <Trash2 />
              永久删除
            </Button>
          )}
        </div>
      </div>

      <Dialog
        open={Boolean(statusTarget)}
        onOpenChange={(open) => {
          if (!open && !updatingStatus) setStatusTarget(null);
        }}
      >
        <DialogContent className="rounded-[24px]">
          <DialogHeader>
            <DialogTitle>确认{statusTarget?.actionLabel}课程</DialogTitle>
            <DialogDescription>
              {statusTarget?.status === '已完结'
                ? course.status === '未上线'
                  ? '上线后课程状态将设为“已完结”，并出现在员工课程中心。如有课后题，请先在“测试题”中审核并发布题库。'
                  : '恢复后课程会重新出现在员工课程中心。'
                : statusTarget?.status === '归档'
                  ? '归档后员工将看不到课程，但课程及学习记录都会保留。'
                  : '下架后员工将看不到课程，课程及学习记录仍会保留，之后可以恢复。'}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-2xl bg-slate-50 p-4">
            <p className="text-xs font-bold text-slate-400">目标课程</p>
            <p className="mt-1 font-black text-slate-950">{course.title}</p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={updatingStatus}
              onClick={() => setStatusTarget(null)}
            >
              取消
            </Button>
            <Button
              type="button"
              className="rounded-full"
              disabled={updatingStatus}
              onClick={() => void confirmStatusChange()}
            >
              {updatingStatus ? <RefreshCw className="animate-spin" /> : null}
              {updatingStatus
                ? '处理中…'
                : `确认${statusTarget?.actionLabel ?? ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {deletionOpen && (
        <CourseDeletionDialog
          course={course}
          onClose={() => setDeletionOpen(false)}
          onDeleted={onDeleted}
        />
      )}
    </section>
  );
}
