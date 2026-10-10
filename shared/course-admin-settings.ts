import { z } from 'zod';

export const courseAdminSettingsUpdateSchema = z
  .object({
    revision: z.string().regex(/^[a-f0-9]{64}$/u, '课程版本无效，请刷新后重试'),
    confirmed: z.literal(true),
    change: z.discriminatedUnion('kind', [
      z
        .object({
          kind: z.literal('requirement'),
          requirementOverride: z.enum(['auto', 'required', 'elective']),
        })
        .strict(),
      z
        .object({
          kind: z.literal('cover'),
          coverUrl: z.string().trim().max(2048),
        })
        .strict(),
      z
        .object({
          kind: z.literal('instructors'),
          userIds: z
            .array(z.string().regex(/^\d{1,40}$/u, '请选择真实飞书账号'))
            .min(1, '至少保留一位讲师')
            .max(20, '最多选择 20 位讲师')
            .refine((ids) => new Set(ids).size === ids.length, '讲师不能重复'),
        })
        .strict(),
      z
        .object({
          kind: z.literal('source'),
          resourceSource: z.enum(['internal', 'external']),
        })
        .strict(),
    ]),
  })
  .strict();

/** 外部资源不自动升级成全员必修；已有官方课程保持原有规则。 */
export function resolveAdminCourseSource(
  current: string,
  resourceSource: 'internal' | 'external',
): string {
  return resourceSource === 'internal'
    ? '内部'
    : current === '官方'
      ? '官方'
      : '合作方';
}
