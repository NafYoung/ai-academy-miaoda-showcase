import ContentEmbed from './ContentEmbed';

interface Props {
  courseId: string;
  src: string;
  title: string;
  onOpen?: () => void;
}

/** 演示版：内部课程文档原本需要飞书授权后内嵌，这里同样改为打开公开链接。 */
export default function CourseDocumentReader({ src, title, onOpen }: Props) {
  return <ContentEmbed src={src} title={title} kind="doc" onOpen={onOpen} />;
}
