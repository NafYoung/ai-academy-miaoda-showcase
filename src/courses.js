export const COURSE_CATEGORIES = Object.freeze([
  "AI 工具",
  "多维表格",
  "协作基础",
  "管理实践",
  "应用搭建",
  "自动化",
]);

export const courses = Object.freeze([
  {
    id: "feishu-ai-hub",
    order: "01",
    title: "飞书 AI 能力导航",
    summary: "从飞书官网的 AI 专区了解知识问答、智能纪要与效率工具的应用入口。",
    category: "AI 工具",
    level: "入门",
    outcome: "建立 AI 能力地图",
    source: "飞书官网公开内容",
    url: "https://www.feishu.cn/hc/zh-CN/category/7210653076326334492",
    accent: "violet",
  },
  {
    id: "bitable-mastery",
    order: "02",
    title: "多维表格课程合集",
    summary: "按主题浏览多维表格的公开课程，理解数据组织、视图协作与流程设计。",
    category: "多维表格",
    level: "进阶",
    outcome: "搭建可复用业务数据底座",
    source: "飞书官网公开内容",
    url: "https://www.feishu.cn/hc/zh-CN/academy/all_about_Bitable_courses_collection",
    accent: "cyan",
  },
  {
    id: "new-user-guide",
    order: "03",
    title: "飞书新人上手攻略",
    summary: "通过公开的新手指引熟悉消息、文档、日历与协作空间的基础使用方式。",
    category: "协作基础",
    level: "入门",
    outcome: "掌握日常协作基本动作",
    source: "飞书官网公开内容",
    url: "https://www.feishu.cn/hc/zh-CN/academy/guides_for_new_users",
    accent: "blue",
  },
  {
    id: "admin-starter",
    order: "04",
    title: "管理员快速上手",
    summary: "了解管理后台的公开操作指南，建立成员、组织和协作资源配置的全局视角。",
    category: "管理实践",
    level: "进阶",
    outcome: "理解协作平台治理框架",
    source: "飞书官网公开内容",
    url: "https://www.feishu.cn/hc/zh-CN/articles/360044088133",
    accent: "amber",
  },
  {
    id: "miaoda-starter",
    order: "05",
    title: "飞书妙搭快速入门",
    summary: "认识自然语言搭建应用的基本流程，从需求描述、页面生成到迭代检查形成闭环。",
    category: "应用搭建",
    level: "入门",
    outcome: "完成应用概念验证",
    source: "飞书官网公开内容",
    url: "https://www.feishu.cn/content/article/7592171136612306139",
    accent: "rose",
  },
  {
    id: "calendar-sync",
    order: "06",
    title: "本地日历与飞书同步",
    summary: "参考公开配置说明，理解外部日历与协作平台之间的数据同步和边界设置。",
    category: "自动化",
    level: "进阶",
    outcome: "理解跨系统数据连接",
    source: "飞书官网公开内容",
    url: "https://www.feishu.cn/hc/zh-CN/articles/360043178673",
    accent: "green",
  },
]);

export function filterCourses(list, { category = "全部", query = "" } = {}) {
  const normalizedQuery = query.trim().toLocaleLowerCase("zh-CN");

  return list.filter((course) => {
    const matchesCategory = category === "全部" || course.category === category;
    const searchableText = [course.title, course.summary, course.category, course.outcome]
      .join(" ")
      .toLocaleLowerCase("zh-CN");
    const matchesQuery = normalizedQuery === "" || searchableText.includes(normalizedQuery);

    return matchesCategory && matchesQuery;
  });
}

export function getCourseById(id) {
  return courses.find((course) => course.id === id);
}
