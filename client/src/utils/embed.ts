const SLIDES_REGEX = /\/(slides\/[A-Za-z0-9]+)/;

/** 飞书主站 / 企业自定义域名上的内容页 */
const FEISHU_HOST_RE =
  /(^|\.)(feishu\.cn|feishucdn\.com|larksuite\.com|feishuapp\.com)$/i;

/** 非视频资源默认外开的飞书内容路径；视频由独立策略试嵌。 */
const FEISHU_COOKIE_BLOCKED_PATH_RE =
  /\/(docx|docs|wiki|sheets|base|bitable|minutes|vc\/|drive\/|file\/)/i;

export function toEmbedUrl(url: string): string {
  if (!url) return url;

  const match = url.match(SLIDES_REGEX);
  if (!match) return url;

  try {
    const parsed = new URL(url);
    parsed.searchParams.delete('from');
    return parsed.toString();
  } catch {
    return url;
  }
}

export function isFeishuSlidesUrl(url: string): boolean {
  if (!url) return false;
  return SLIDES_REGEX.test(url);
}

/**
 * 飞书云文档等非视频内容在第三方站点中可能无法通过 iframe 登录。
 * 视频由 resolveEmbedPlan 独立处理，先尝试内嵌并保留原页入口。
 */
export function shouldOpenExternally(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();
    if (!FEISHU_HOST_RE.test(host) && !host.includes('feishu')) {
      // 企业自定义飞书域名常带 feishu；其它外链仍尝试内嵌
      return false;
    }
    // 幻灯片偶发可嵌；其它已知内容页默认外开。
    if (SLIDES_REGEX.test(parsed.pathname)) return false;
    return FEISHU_COOKIE_BLOCKED_PATH_RE.test(parsed.pathname + parsed.search);
  } catch {
    return false;
  }
}

export function isFeishuContentUrl(url: string): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname.toLowerCase();
    return FEISHU_HOST_RE.test(host) || host.includes('feishu');
  } catch {
    return false;
  }
}

export interface EmbedPlan {
  embedUrl: string;
  preferExternal: boolean;
  compactVideoPlayer: boolean;
  originalUrl: string;
}

function webUrl(url: string): string {
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
      ? trimmed
      : '';
  } catch {
    return '';
  }
}

function videoEmbedUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.toLowerCase();

    if (host === 'bilibili.com' || host === 'www.bilibili.com') {
      const bvid = parsed.pathname.match(
        /^\/video\/(BV[A-Za-z0-9]{10})(?:\/|$)/i,
      )?.[1];
      if (bvid) {
        const player = new URL('https://player.bilibili.com/player.html');
        player.searchParams.set('bvid', bvid);
        player.searchParams.set('autoplay', '0');
        const page = parsed.searchParams.get('p');
        if (page && /^[1-9]\d*$/.test(page)) player.searchParams.set('p', page);
        return player.toString();
      }
    }

    const youtubeHost =
      host === 'youtube.com' ||
      host === 'www.youtube.com' ||
      host === 'm.youtube.com';
    if (youtubeHost && /^\/embed\/[A-Za-z0-9_-]{11}(?:\/|$)/.test(parsed.pathname)) {
      return url;
    }
    const videoId = youtubeHost
      ? parsed.pathname === '/watch'
        ? parsed.searchParams.get('v')
        : parsed.pathname.match(/^\/shorts\/([^/]+)/)?.[1]
      : host === 'youtu.be'
        ? parsed.pathname.slice(1).split('/')[0]
        : null;
    if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      const player = new URL(`https://www.youtube.com/embed/${videoId}`);
      const start = parsed.searchParams.get('start') ?? parsed.searchParams.get('t');
      if (start && /^\d+s?$/.test(start)) {
        player.searchParams.set('start', start.replace(/s$/, ''));
      }
      return player.toString();
    }
  } catch {
    return url;
  }

  return toEmbedUrl(url);
}

function isCompactVideoPlayer(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === 'player.bilibili.com' &&
        parsed.pathname === '/player.html') ||
      ((parsed.hostname === 'www.youtube.com' ||
        parsed.hostname === 'www.youtube-nocookie.com') &&
        parsed.pathname.startsWith('/embed/'))
    );
  } catch {
    return false;
  }
}

/** Every video starts in ATHENA; the original link remains available as fallback. */
export function resolveEmbedPlan(url: string, kind: 'doc' | 'video'): EmbedPlan {
  const originalUrl = webUrl(url);
  if (!originalUrl) {
    return {
      embedUrl: '',
      preferExternal: true,
      compactVideoPlayer: false,
      originalUrl: '',
    };
  }

  if (kind === 'video') {
    const embedUrl = videoEmbedUrl(originalUrl);
    return {
      embedUrl,
      preferExternal: false,
      compactVideoPlayer: isCompactVideoPlayer(embedUrl),
      originalUrl,
    };
  }

  const preferExternal = shouldOpenExternally(originalUrl);
  return {
    embedUrl: preferExternal ? '' : toEmbedUrl(originalUrl),
    preferExternal,
    compactVideoPlayer: false,
    originalUrl,
  };
}
