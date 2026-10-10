import { z } from 'zod';
import type { IAcademyCourse, ICourseContentFields } from './api.interface';

// 与当前正式课程 Base 的枚举合同一致，不根据当前记录样本推导权限。
export const COURSE_DIFFICULTIES = [
  '入门',
  '基础',
  '进阶',
  '实战',
  '专家',
] as const;
export const COURSE_TYPES = ['单次课', '系列课'] as const;
export const COURSE_TAGS = [
  '快速上手',
  '产品功能',
  '方案场景',
  '实战案例',
  'AI工具',
  '效率提升',
] as const;

function isResourceUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url: URL = new URL(value);
    return (
      ['http:', 'https:'].includes(url.protocol) &&
      Boolean(url.hostname) &&
      !url.username &&
      !url.password
    );
  } catch {
    return false;
  }
}

const resourceUrlSchema = z
  .string()
  .trim()
  .max(2048, '链接不能超过 2048 个字符')
  .refine(isResourceUrl, '请填写不含账号密码的 HTTP(S) 链接');

export const courseContentFieldsSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(1, '课程名称不能为空')
      .max(120, '课程名称不能超过 120 字'),
    summary: z.string().trim().max(1200, '课程简介不能超过 1200 字'),
    difficulty: z.union([z.enum(COURSE_DIFFICULTIES), z.literal('')]),
    tags: z
      .array(z.enum(COURSE_TAGS))
      .max(COURSE_TAGS.length)
      .refine(
        (tags: string[]): boolean => new Set(tags).size === tags.length,
        '标签不能重复',
      ),
    docUrl: resourceUrlSchema,
    videoUrl: resourceUrlSchema,
    courseType: z.union([z.enum(COURSE_TYPES), z.literal('')]),
  })
  .strict();

export const courseContentUpdateSchema = z
  .object({
    revision: z.string().regex(/^[a-f0-9]{64}$/u, '课程版本无效，请刷新后重试'),
    changes: courseContentFieldsSchema
      .partial()
      .strict()
      .refine(
        (changes): boolean => Object.keys(changes).length > 0,
        '没有需要保存的修改',
      ),
  })
  .strict();

export function getCourseContentFields(
  course: IAcademyCourse,
): ICourseContentFields {
  return {
    title: course.title,
    summary: course.summary,
    difficulty: course.difficulty,
    tags: [...course.tags],
    docUrl: course.docUrl,
    videoUrl: course.videoUrl,
    courseType: course.courseType,
  };
}

/** 只提交发生变化的字段，保留未编辑的历史字段，不做全记录覆盖。 */
export function getCourseContentChanges(
  original: ICourseContentFields,
  current: ICourseContentFields,
): Partial<ICourseContentFields> {
  const changes: Partial<ICourseContentFields> = {};
  const textKeys = [
    'title',
    'summary',
    'difficulty',
    'docUrl',
    'videoUrl',
    'courseType',
  ] as const;
  for (const key of textKeys) {
    const value: string = current[key].trim();
    if (value !== original[key]) changes[key] = value;
  }
  if (JSON.stringify(current.tags) !== JSON.stringify(original.tags)) {
    changes.tags = [...current.tags];
  }
  return changes;
}
