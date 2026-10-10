import { ExternalLink, FileText, PlayCircle } from 'lucide-react';

interface ContentEmbedProps {
  src: string;
  title: string;
  kind?: 'doc' | 'video';
  onOpen?: () => void;
}

/**
 * 演示版：不内嵌第三方页面（会带入对方的脚本与统计），
 * 只提供跳转卡片；点击仍计入学习记录，与原组件的 onOpen 语义一致。
 */
export default function ContentEmbed({ src, title, kind = 'doc', onOpen }: ContentEmbedProps) {
  let host = '';
  try {
    host = new URL(src).hostname;
  } catch {
    host = '';
  }
  const Icon = kind === 'video' ? PlayCircle : FileText;
  return (
    <div className="rounded-[24px] border border-black/5 bg-white/80 p-8 md:p-10 flex flex-col items-center text-center gap-4">
      <div className="size-14 rounded-2xl bg-blue-50 grid place-items-center">
        <Icon className="size-7 text-[#3370ff]" aria-hidden="true" />
      </div>
      <div>
        <h3 className="text-base font-semibold text-[#08090d]">{title}</h3>
        <p className="mt-1.5 text-sm text-[#14141480]">
          正式系统会在这里内嵌{kind === 'video' ? '视频' : '课程文档'}。演示版不加载第三方页面，请在新标签页打开公开原文
          {host ? `（${host}）` : ''}。
        </p>
      </div>
      <a
        href={src}
        target="_blank"
        rel="noreferrer"
        onClick={onOpen}
        className="inline-flex items-center gap-2 rounded-full bg-[#060a0f] px-5 py-2.5 text-sm font-semibold text-white hover:opacity-90"
      >
        打开{kind === 'video' ? '课程页面' : '文档'}
        <ExternalLink className="size-4" aria-hidden="true" />
      </a>
    </div>
  );
}
