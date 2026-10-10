import { CloudOff } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import {
  shouldShowCourseDataSourceNotice,
  type CourseCatalogDataSourceStatus,
} from './course-data-source-notice-state';

interface CourseDataSourceNoticeProps {
  dataSource: CourseCatalogDataSourceStatus | null;
  requestFailed?: boolean;
  className?: string;
}

export function isCourseCatalogUnavailable(
  dataSource: CourseCatalogDataSourceStatus | null,
  requestFailed = false,
): boolean {
  return requestFailed || dataSource?.courses.state === 'unavailable';
}

export default function CourseDataSourceNotice({
  dataSource,
  requestFailed = false,
  className,
}: CourseDataSourceNoticeProps) {
  if (!shouldShowCourseDataSourceNotice(dataSource, requestFailed)) {
    return null;
  }

  if (requestFailed) {
    return (
      <Alert
        variant="destructive"
        className={cn(
          'rounded-2xl border-rose-200 bg-rose-50/90 backdrop-blur-xl',
          className,
        )}
      >
        <CloudOff />
        <AlertTitle>课程服务暂时无法连接</AlertTitle>
        <AlertDescription>
          页面不会把这次连接失败显示为“0
          门课程”。请稍后刷新，已有页面数据会尽量保留。
        </AlertDescription>
      </Alert>
    );
  }

  if (!dataSource) return null;

  if (dataSource.courses.state === 'unavailable') {
    return (
      <Alert
        variant="destructive"
        className={cn(
          'rounded-2xl border-rose-200 bg-rose-50/90 backdrop-blur-xl',
          className,
        )}
      >
        <CloudOff />
        <AlertTitle>课程数据源暂时不可用</AlertTitle>
        <AlertDescription>
          系统已自动重试，但目前没有一小时内可用的成功数据。这里不会把故障当成“暂无课程”，请稍后再试。
        </AlertDescription>
      </Alert>
    );
  }

  return null;
}
