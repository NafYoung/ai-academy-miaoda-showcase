import {
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
  type HTMLAttributes,
} from 'react';
import { Image as ImageIcon, RefreshCw, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';
import { platform } from '@/api';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { ICourseCoverUploadResponse } from '@shared/api.interface';

const MAX_COVER_SIZE = 5 * 1024 * 1024;
const COVER_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
]);

interface CourseCoverUploadProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'onChange' | 'value'
> {
  value?: string;
  onChange: (value: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  disabled?: boolean;
  /** 管理员设置中上传后仍需确认，才会写入正式课程。 */
  mode?: 'submission' | 'management';
  /** 用于避免旧草稿的上传响应写入新草稿。 */
  scopeKey?: string;
}

const absoluteUrl = (url: string): string => {
  if (!url || typeof window === 'undefined') return url;
  try {
    return new URL(url, window.location.origin).toString();
  } catch {
    return url;
  }
};

const validateCoverFile = (file: File): string | null => {
  if (file.size <= 0) return '封面图片不能为空';
  if (file.size > MAX_COVER_SIZE) return '封面图片不能超过 5 MiB';
  if (!COVER_MIME_TYPES.has(file.type.toLowerCase())) {
    return '请选择 JPEG、PNG、WebP 或 GIF 图片';
  }
  return null;
};

const uploadErrorMessage = (error: unknown): string => {
  const requestError = error as {
    response?: { data?: { message?: unknown } };
    message?: unknown;
  };
  const message = requestError.response?.data?.message ?? requestError.message;
  return typeof message === 'string' && message.trim()
    ? message
    : '封面上传失败，请稍后重试';
};

export default function CourseCoverUpload({
  value = '',
  onChange,
  onUploadingChange,
  disabled = false,
  mode = 'submission',
  scopeKey = 'new',
  className,
  ...containerProps
}: CourseCoverUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadRequestRef = useRef(0);
  const uploadInFlightRef = useRef(false);
  const scopeKeyRef = useRef(scopeKey);
  const objectPreviewRef = useRef<string | null>(null);
  const previewUrlRef = useRef(value.trim());
  const coverValueRef = useRef(value.trim());
  const lastUploadedCoverRef = useRef<string | null>(null);
  const onUploadingChangeRef = useRef(onUploadingChange);
  const [previewUrl, setPreviewUrl] = useState(value.trim());
  const [previewError, setPreviewError] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  onUploadingChangeRef.current = onUploadingChange;

  const revokeObjectPreview = (): void => {
    const objectUrl = objectPreviewRef.current;
    if (!objectUrl) return;
    URL.revokeObjectURL(objectUrl);
    objectPreviewRef.current = null;
  };

  const setPreview = (next: string): void => {
    previewUrlRef.current = next;
    setPreviewUrl(next);
    setPreviewError(false);
  };

  const notifyUploading = (next: boolean): void => {
    setUploading(next);
    onUploadingChange?.(next);
  };

  useEffect(() => {
    const nextValue = value.trim();
    const scopeChanged = scopeKeyRef.current !== scopeKey;
    const coverValueChanged = coverValueRef.current !== nextValue;
    const wasUploading = uploadInFlightRef.current;
    if (scopeChanged) {
      scopeKeyRef.current = scopeKey;
      uploadRequestRef.current += 1;
      uploadInFlightRef.current = false;
      if (wasUploading) notifyUploading(false);
      revokeObjectPreview();
      lastUploadedCoverRef.current = null;
    }
    coverValueRef.current = nextValue;
    if (
      scopeChanged &&
      !wasUploading &&
      !coverValueChanged &&
      previewUrlRef.current
    ) {
      return;
    }
    if (lastUploadedCoverRef.current === nextValue && previewUrlRef.current) {
      return;
    }
    revokeObjectPreview();
    setPreview(nextValue);
  }, [scopeKey, value]);

  useEffect(
    () => () => {
      uploadRequestRef.current += 1;
      if (uploadInFlightRef.current) onUploadingChangeRef.current?.(false);
      revokeObjectPreview();
    },
    [],
  );

  const uploadCover = async (file: File): Promise<void> => {
    const validationError = validateCoverFile(file);
    if (validationError) {
      setError(validationError);
      toast.error(validationError);
      return;
    }
    if (disabled || uploading || uploadInFlightRef.current) return;

    const requestId = uploadRequestRef.current + 1;
    uploadRequestRef.current = requestId;
    const requestScopeKey = scopeKeyRef.current;
    const previousPreviewUrl = previewUrlRef.current;
    const objectUrl = URL.createObjectURL(file);
    objectPreviewRef.current = objectUrl;
    setPreview(objectUrl);
    setError('');
    uploadInFlightRef.current = true;
    notifyUploading(true);

    try {
      const response: ICourseCoverUploadResponse =
        await platform.uploadSubmissionCover(file);
      if (
        uploadRequestRef.current !== requestId ||
        scopeKeyRef.current !== requestScopeKey
      ) {
        return;
      }
      const coverUrl = absoluteUrl(response.coverUrl?.trim() ?? '');
      if (!coverUrl) throw new Error('封面上传未返回可保存的地址');
      const signedPreviewUrl = response.previewUrl?.trim() ?? '';
      revokeObjectPreview();
      lastUploadedCoverRef.current = coverUrl;
      setPreview(absoluteUrl(signedPreviewUrl) || coverUrl);
      onChange(coverUrl);
      toast.success('封面已上传并加入当前草稿');
    } catch (uploadError: unknown) {
      if (
        uploadRequestRef.current !== requestId ||
        scopeKeyRef.current !== requestScopeKey
      ) {
        return;
      }
      revokeObjectPreview();
      setPreview(previousPreviewUrl);
      const message = uploadErrorMessage(uploadError);
      setError(message);
      toast.error(message);
    } finally {
      if (
        uploadRequestRef.current === requestId &&
        scopeKeyRef.current === requestScopeKey
      ) {
        uploadInFlightRef.current = false;
        notifyUploading(false);
      }
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (file) void uploadCover(file);
  };

  const removeCover = (): void => {
    if (disabled || uploading) return;
    uploadRequestRef.current += 1;
    revokeObjectPreview();
    lastUploadedCoverRef.current = null;
    setError('');
    setPreview('');
    onChange('');
  };

  const hasCover = Boolean(value.trim() || previewUrl);

  return (
    <div
      {...containerProps}
      className={cn('space-y-3', className)}
      aria-busy={uploading}
    >
      <div className="flex flex-wrap items-start gap-4">
        <div className="grid aspect-video w-56 shrink-0 place-items-center overflow-hidden rounded-2xl border border-dashed border-slate-200 bg-slate-50">
          {previewUrl && !previewError ? (
            <img
              src={previewUrl}
              alt="课程封面预览"
              className="size-full object-cover"
              onError={() => setPreviewError(true)}
            />
          ) : (
            <div className="flex flex-col items-center gap-2 px-4 text-center text-slate-400">
              <ImageIcon className="size-8" />
              <span className="text-xs">
                {previewError ? '预览暂不可用，请重新选择封面' : '尚未选择封面'}
              </span>
            </div>
          )}
        </div>

        <div className="min-w-[220px] flex-1 space-y-3">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="hidden"
            disabled={disabled || uploading}
            onChange={handleFileChange}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-full bg-white"
              disabled={disabled || uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <RefreshCw className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              {uploading ? '上传中…' : hasCover ? '更换封面' : '选择图片'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="rounded-full text-slate-500 hover:text-rose-600"
              disabled={disabled || uploading || !hasCover}
              onClick={removeCover}
            >
              <Trash2 className="size-4" />
              移除
            </Button>
          </div>
          <p className="text-xs leading-5 text-slate-500">
            支持 JPEG、PNG、WebP、GIF，单个文件最大 5 MiB。
          </p>
          <p className="text-xs leading-5 text-slate-500">
            {mode === 'management'
              ? '上传完成后，请点击确认保存才会更新正式课程。'
              : '审核同步时写入多维表格封面附件。'}
          </p>
          {uploading ? (
            <p role="status" className="text-xs font-medium text-blue-600">
              封面上传完成前，保存、换稿和提交操作暂不可用。
            </p>
          ) : null}
          {error ? (
            <p role="alert" className="text-xs font-medium text-rose-600">
              {error}
            </p>
          ) : null}
        </div>
      </div>
      <p className="text-xs leading-5 text-slate-400">
        {mode === 'management'
          ? '移除只会在本次管理员设置确认后清空正式课程封面，已上传文件不会删除。'
          : '移除只清空当前草稿中的封面引用，已上传文件不会删除。'}
      </p>
    </div>
  );
}
