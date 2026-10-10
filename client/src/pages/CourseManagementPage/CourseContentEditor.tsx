import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import { LockKeyhole, RefreshCw, Save } from 'lucide-react';
import { toast } from 'sonner';
import { courseManagement } from '@/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { AcademyCoverImage } from '@/components/AcademyCoverImage';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type {
  ICourseContentFields,
  ICourseContentUpdateResult,
  IManagedCourse,
} from '@shared/api.interface';
import {
  COURSE_DIFFICULTIES,
  COURSE_TAGS,
  COURSE_TYPES,
  courseContentUpdateSchema,
  getCourseContentChanges,
  getCourseContentFields,
} from '@shared/course-content';
import { managementErrorMessage } from './course-management-utils';

interface CourseContentEditorProps {
  managed: IManagedCourse;
  onSaved: (result: ICourseContentUpdateResult) => void;
  onDirtyChange: (dirty: boolean) => void;
  onSavingChange: (saving: boolean) => void;
}

export default function CourseContentEditor({
  managed,
  onSaved,
  onDirtyChange,
  onSavingChange,
}: CourseContentEditorProps) {
  const { course, permissions } = managed;
  const original = useMemo(() => getCourseContentFields(course), [course]);
  const [fields, setFields] = useState<ICourseContentFields>(original);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<
    Partial<Record<keyof ICourseContentFields, string>>
  >({});
  const inFlight = useRef(false);
  const changes = getCourseContentChanges(original, fields);
  const dirty = Object.keys(changes).length > 0;

  useEffect(() => {
    setFields(original);
    setError('');
    setFieldErrors({});
  }, [original, managed.revision]);
  useEffect(() => {
    onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    onSavingChange(saving);
  }, [saving, onSavingChange]);

  const update = <K extends keyof ICourseContentFields>(
    key: K,
    value: ICourseContentFields[K],
  ): void => {
    setFields((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => ({ ...current, [key]: undefined }));
  };

  const save = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (!permissions.canEditContent || inFlight.current || !dirty) return;
    setError('');
    setFieldErrors({});
    const parsed = courseContentUpdateSchema.safeParse({
      revision: managed.revision,
      changes,
    });
    if (!parsed.success) {
      const errors: Partial<Record<keyof ICourseContentFields, string>> = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[1] as keyof ICourseContentFields | undefined;
        if (key) errors[key] = issue.message;
      }
      setFieldErrors(errors);
      setError('请检查标出的课程信息后再保存。');
      return;
    }
    if (
      (changes.docUrl !== undefined || changes.videoUrl !== undefined) &&
      !fields.docUrl.trim() &&
      !fields.videoUrl.trim()
    ) {
      setFieldErrors({ docUrl: '课程文档和视频链接至少保留一项' });
      setError('课程至少需要一个可供学习的文档或视频链接。');
      return;
    }
    inFlight.current = true;
    setSaving(true);
    try {
      const result = await courseManagement.updateCourse(course.id, {
        revision: parsed.data.revision,
        changes: parsed.data.changes,
      });
      onSaved(result);
      if (result.catalogSynced)
        toast.success('课程信息已保存，上架状态保持不变');
      else
        toast.warning(
          '课程信息已保存，但课程目录刷新失败，请联系管理员同步目录',
        );
    } catch (caught: unknown) {
      setError(managementErrorMessage(caught));
    } finally {
      inFlight.current = false;
      setSaving(false);
    }
  };

  const fieldError = (key: keyof ICourseContentFields) =>
    fieldErrors[key] ? (
      <p id={key + '-error'} className="mt-2 text-xs text-rose-600">
        {fieldErrors[key]}
      </p>
    ) : null;
  const allTags = [...new Set<string>([...COURSE_TAGS, ...original.tags])];

  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_280px]">
      <form
        onSubmit={(event) => void save(event)}
        noValidate
        className="rounded-[24px] border border-white bg-white/85 p-5 shadow-[0_18px_50px_rgba(30,64,175,0.06)] md:p-7"
      >
        <h2 className="text-xl font-black text-slate-950">课程信息</h2>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          {permissions.canEditContent
            ? '保存后直接更新正式课程，不改变上架状态；测试题修改另行保存和发布。'
            : '当前为讲师权限：可以查看课程信息，但仅能编辑这门课程的测试题。'}
        </p>
        <fieldset
          disabled={saving || !permissions.canEditContent}
          className="mt-6 space-y-5 disabled:opacity-80"
        >
          <div>
            <Label htmlFor="course-title">课程名称</Label>
            <Input
              id="course-title"
              value={fields.title}
              onChange={(event) => update('title', event.target.value)}
              maxLength={120}
              aria-invalid={Boolean(fieldErrors.title)}
              aria-describedby={fieldErrors.title ? 'title-error' : undefined}
              className="mt-2 rounded-xl"
            />
            {fieldError('title')}
          </div>
          <div>
            <Label htmlFor="course-summary">课程简介</Label>
            <Textarea
              id="course-summary"
              value={fields.summary}
              onChange={(event) => update('summary', event.target.value)}
              maxLength={1200}
              rows={5}
              aria-invalid={Boolean(fieldErrors.summary)}
              aria-describedby={
                fieldErrors.summary ? 'summary-error' : undefined
              }
              className="mt-2 resize-y rounded-xl"
              placeholder="这门课程讲什么？学完能够做什么？"
            />
            <p className="mt-1 text-right text-xs text-slate-400">
              {fields.summary.length}/1200
            </p>
            {fieldError('summary')}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            {(
              [
                {
                  key: 'difficulty',
                  label: '课程难度',
                  options: COURSE_DIFFICULTIES,
                },
                { key: 'courseType', label: '课程形式', options: COURSE_TYPES },
              ] as const
            ).map(({ key, label, options }) => (
              <div key={key}>
                <Label htmlFor={'course-' + key}>{label}</Label>
                <Select
                  value={fields[key] || '__empty__'}
                  onValueChange={(value) =>
                    update(key, value === '__empty__' ? '' : value)
                  }
                  disabled={saving || !permissions.canEditContent}
                >
                  <SelectTrigger
                    id={'course-' + key}
                    aria-invalid={Boolean(fieldErrors[key])}
                    className="mt-2 w-full rounded-xl"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__empty__">未设置</SelectItem>
                    {fields[key] &&
                      !(options as readonly string[]).includes(fields[key]) && (
                        <SelectItem value={fields[key]} disabled>
                          {fields[key]}（历史值）
                        </SelectItem>
                      )}
                    {options.map((value) => (
                      <SelectItem key={value} value={value}>
                        {value}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {fieldError(key)}
              </div>
            ))}
          </div>
          <div>
            <p id="course-tags-label" className="text-sm font-medium">
              课程标签
            </p>
            <div
              aria-labelledby="course-tags-label"
              className="mt-3 flex flex-wrap gap-2"
            >
              {allTags.map((tag, index) => (
                <Label
                  key={tag}
                  htmlFor={'course-tag-' + index}
                  className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-normal"
                >
                  <Checkbox
                    id={'course-tag-' + index}
                    checked={fields.tags.includes(tag)}
                    disabled={saving || !permissions.canEditContent}
                    onCheckedChange={(checked) =>
                      update(
                        'tags',
                        checked === true
                          ? [...fields.tags, tag]
                          : fields.tags.filter((value) => value !== tag),
                      )
                    }
                  />
                  {tag}
                </Label>
              ))}
            </div>
            {fieldError('tags')}
          </div>
          <div className="border-t border-slate-100 pt-5">
            <h3 className="font-bold text-slate-900">学习资源</h3>
            <p className="mt-1 text-xs leading-6 text-slate-500">
              文档、视频至少保留一项。请使用 HTTP(S)
              链接，并确认员工有权打开资源。修改资料后，请到“测试题”核对题目是否仍然匹配。
            </p>
          </div>
          {(
            [
              {
                key: 'docUrl',
                label: '课程文档链接',
                placeholder: 'https://…',
              },
              {
                key: 'videoUrl',
                label: '课程视频 / 回放链接',
                placeholder: 'https://…',
              },
            ] as const
          ).map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label htmlFor={'course-' + key}>{label}</Label>
              <Input
                id={'course-' + key}
                type="url"
                value={fields[key]}
                onChange={(event) => update(key, event.target.value)}
                maxLength={2048}
                aria-invalid={Boolean(fieldErrors[key])}
                aria-describedby={fieldErrors[key] ? key + '-error' : undefined}
                className="mt-2 rounded-xl"
                placeholder={placeholder}
              />
              {fieldError(key)}
            </div>
          ))}
        </fieldset>

        {error && (
          <p
            role="alert"
            className="mt-5 rounded-xl border border-rose-100 bg-rose-50 p-4 text-sm leading-6 text-rose-700"
          >
            {error}
          </p>
        )}
        {permissions.canEditContent && (
          <div className="mt-6 flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-500">
              {dirty ? '有尚未保存的课程信息' : '课程信息未修改'}
            </p>
            <Button
              type="submit"
              disabled={!dirty || saving}
              className="rounded-full"
            >
              {saving ? <RefreshCw className="animate-spin" /> : <Save />}
              {saving ? '正在保存…' : '保存课程信息'}
            </Button>
          </div>
        )}
      </form>

      <aside className="space-y-4 rounded-[24px] border border-white bg-white/70 p-5">
        {course.coverUrl && (
          <AcademyCoverImage
            src={course.coverUrl}
            alt="当前课程封面"
            className="aspect-video w-full rounded-xl object-cover"
          />
        )}
        <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
          <LockKeyhole className="size-4" />
          受保护的课程设置
        </div>
        <dl className="space-y-3 text-sm">
          <div>
            <dt className="text-xs text-slate-400">课程来源</dt>
            <dd className="mt-1 text-slate-700">
              {course.courseSource || '未设置'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-slate-400">学习方式</dt>
            <dd className="mt-1 text-slate-700">
              {course.learningMode === 'self_study' ? '自主学习' : '课程测试'}
            </dd>
          </div>
        </dl>
        <p className="border-t border-slate-100 pt-4 text-xs leading-6 text-slate-500">
          封面、讲师与资源归属等管理员设置，请在“管理员设置”中单独确认保存；本页只保存课程正文信息。
        </p>
      </aside>
    </div>
  );
}
