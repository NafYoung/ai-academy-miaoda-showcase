import { AlertTriangle, RefreshCw, Save } from 'lucide-react';
import { UserSelect } from '@/components/business-ui/user-select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import CourseCoverUpload from '../SubmissionPage/CourseCoverUpload';
import type { CourseRequirementOverride } from '@shared/api.interface';
import {
  describeRequirementChange,
  describeSourceChange,
  requirementOverrideLabel,
  resourceSourceFromCourse,
  sourceOptionDescription,
  type AdminSettingDraft,
  type ResourceSource,
  type SettingKind,
} from './course-admin-settings-utils';

export interface CourseAdminSettingsDialogProps {
  editKind: SettingKind | null;
  draft: AdminSettingDraft;
  courseSource: string;
  courseRequirementOverride: CourseRequirementOverride;
  revision: string;
  dirty: boolean;
  saving: boolean;
  coverUploading: boolean;
  dialogError: string;
  onClose: () => void;
  onCoverChange: (coverUrl: string) => void;
  onCoverUploadingChange: (uploading: boolean) => void;
  onInstructorsChange: (userIds: string[]) => void;
  onResourceSourceChange: (resourceSource: ResourceSource) => void;
  onRequirementChange: (requirementOverride: CourseRequirementOverride) => void;
  onConfirm: () => void;
}

export default function CourseAdminSettingsDialog({
  editKind,
  draft,
  courseSource,
  courseRequirementOverride,
  revision,
  dirty,
  saving,
  coverUploading,
  dialogError,
  onClose,
  onCoverChange,
  onCoverUploadingChange,
  onInstructorsChange,
  onResourceSourceChange,
  onRequirementChange,
  onConfirm,
}: CourseAdminSettingsDialogProps) {
  const dialogTitle =
    editKind === 'cover'
      ? '编辑课程封面'
      : editKind === 'instructors'
        ? '编辑课程讲师'
        : editKind === 'source'
          ? '编辑资源归属'
          : '编辑修读要求';
  const sourceChanged =
    editKind === 'source' &&
    draft.resourceSource !== resourceSourceFromCourse(courseSource);
  const requirementChanged =
    editKind === 'requirement' &&
    draft.requirementOverride !== courseRequirementOverride;

  return (
    <Dialog
      open={editKind !== null}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <DialogContent className="max-h-[88vh] overflow-y-auto rounded-[24px] sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
          <DialogDescription>
            本次只保存这一项设置。确认前可以取消，上传封面也不会立即更新正式课程。
          </DialogDescription>
        </DialogHeader>

        {editKind === 'cover' && (
          <CourseCoverUpload
            value={draft.coverUrl}
            onChange={onCoverChange}
            onUploadingChange={onCoverUploadingChange}
            mode="management"
            scopeKey={`${revision}:management-cover`}
            disabled={saving}
          />
        )}

        {editKind === 'instructors' && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
              讲师只用于课程展示，不会因此获得这门课程或测试题的管理权限；课程内容和测试题由上传人或管理员维护。
            </div>
            <div className="space-y-2">
              <Label htmlFor="course-admin-instructors">
                讲师（最多 20 位）
              </Label>
              <UserSelect
                valueType="string"
                multiple
                value={draft.instructorUserIds}
                onChange={onInstructorsChange}
                disabled={saving}
                placeholder="搜索并选择真实讲师账号"
                maxTagCount={20}
              />
            </div>
            {draft.instructorUserIds.length === 0 && (
              <p className="text-sm text-rose-600">至少保留一位讲师。</p>
            )}
          </div>
        )}

        {editKind === 'source' && (
          <div className="space-y-4">
            <RadioGroup
              value={draft.resourceSource}
              onValueChange={(value: string) => {
                if (value === 'internal' || value === 'external') {
                  onResourceSourceChange(value);
                }
              }}
              className="gap-3"
            >
              {[
                {
                  value: 'internal' as const,
                  title: '内部资源',
                  description: sourceOptionDescription(
                    courseSource,
                    'internal',
                    draft.requirementOverride,
                  ),
                },
                {
                  value: 'external' as const,
                  title: '外部资源',
                  description: sourceOptionDescription(
                    courseSource,
                    'external',
                    draft.requirementOverride,
                  ),
                },
              ].map((item) => (
                <Label
                  key={item.value}
                  htmlFor={`course-resource-${item.value}`}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <RadioGroupItem
                    id={`course-resource-${item.value}`}
                    value={item.value}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-bold text-slate-950">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-slate-500">
                      {item.description}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
            <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {describeSourceChange(
                courseSource,
                draft.resourceSource,
                draft.requirementOverride,
              )}
            </p>
          </div>
        )}

        {editKind === 'requirement' && (
          <div className="space-y-4">
            <RadioGroup
              value={draft.requirementOverride}
              onValueChange={(value: string) => {
                if (
                  value === 'auto' ||
                  value === 'required' ||
                  value === 'elective'
                ) {
                  onRequirementChange(value);
                }
              }}
              className="gap-3"
            >
              {(
                [
                  {
                    value: 'auto' as const,
                    description:
                      '恢复官方来源和部门规则自动判断，不保留手动覆盖。',
                  },
                  {
                    value: 'required' as const,
                    description:
                      '所有员工按必修学习，创建或恢复必修任务；提醒功能启用后按必修规则处理。',
                  },
                  {
                    value: 'elective' as const,
                    description:
                      '所有员工按选修学习，停止必修提醒但保留已有学习进度。',
                  },
                ] as const
              ).map((item) => (
                <Label
                  key={item.value}
                  htmlFor={`course-requirement-${item.value}`}
                  className="flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white p-4"
                >
                  <RadioGroupItem
                    id={`course-requirement-${item.value}`}
                    value={item.value}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-bold text-slate-950">
                      {requirementOverrideLabel(item.value)}
                    </span>
                    <span className="mt-1 block text-sm leading-5 text-slate-500">
                      {item.description}
                    </span>
                  </span>
                </Label>
              ))}
            </RadioGroup>
            <p className="rounded-2xl border border-amber-100 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
              {describeRequirementChange(
                courseRequirementOverride,
                draft.requirementOverride,
              )}
            </p>
          </div>
        )}

        {(sourceChanged || requirementChanged) && (
          <p className="text-xs text-slate-500">
            保存后将同步课程目录和学习任务；学习任务同步失败时可重存当前设置重试。
          </p>
        )}
        {dialogError && (
          <Alert variant="destructive">
            <AlertTriangle className="size-4" />
            <AlertTitle>请检查后再保存</AlertTitle>
            <AlertDescription>{dialogError}</AlertDescription>
          </Alert>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={saving || coverUploading}
            onClick={onClose}
          >
            取消
          </Button>
          <Button
            type="button"
            className="rounded-full"
            disabled={
              saving ||
              coverUploading ||
              (!dirty && editKind !== 'source' && editKind !== 'requirement') ||
              (editKind === 'instructors' &&
                draft.instructorUserIds.length === 0)
            }
            onClick={onConfirm}
          >
            {saving ? <RefreshCw className="animate-spin" /> : <Save />}
            {saving
              ? '正在保存…'
              : (editKind === 'source' || editKind === 'requirement') && !dirty
                ? '保存并同步'
                : '确认保存'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
