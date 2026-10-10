/** 保留运营定义的专题名称；不将逗号等标点当作分隔符。 */
export function normalizeCourseTopics(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return [
    ...new Set(
      value
        .filter((item: unknown): item is string => typeof item === 'string')
        .map((item: string) => item.trim())
        .filter(Boolean),
    ),
  ];
}

export function matchesCourseTopic(topics: unknown, selected: string): boolean {
  return !selected || normalizeCourseTopics(topics).includes(selected);
}
