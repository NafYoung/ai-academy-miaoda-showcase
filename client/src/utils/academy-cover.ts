/** 只把本应用约定的封面引用送入鉴权 API，绝不向外部 URL 转发鉴权头。 */
export function academyCoverResolutionPath(src: string): string | null {
  const match =
    /^(?:\/app\/[^/?#]+)?(\/api\/academy\/courses\/[^/?#]+)\/cover(?:\?v=([a-f0-9]{64}))?$/.exec(
      src,
    );
  return match
    ? `${match[1]}/cover-url${match[2] ? `?v=${match[2]}` : ''}`
    : null;
}
