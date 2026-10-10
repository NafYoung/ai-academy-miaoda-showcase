/** New authored quiz versions carry their expected size so a partial read cannot become a smaller quiz. */
export function getQuizQuestionCount(version: string): number {
  const match: RegExpMatchArray | null = version.match(
    /^q_(?:internal|revision|ai|topic1)_n([1-9]\d*)_/u,
  );
  if (!match) return 10;
  const count: number = Number(match[1]);
  return Number.isSafeInteger(count) ? count : 0;
}
