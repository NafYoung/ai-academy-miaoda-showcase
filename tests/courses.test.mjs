import test from "node:test";
import assert from "node:assert/strict";

import {
  COURSE_CATEGORIES,
  courses,
  filterCourses,
  getCourseById,
} from "../src/courses.js";

test("展示版只包含 6 门公开课程", () => {
  assert.equal(courses.length, 6);
  assert.equal(new Set(courses.map(({ id }) => id)).size, courses.length);
});

test("每门课程只指向 www.feishu.cn 的公开页面", () => {
  for (const course of courses) {
    const url = new URL(course.url);
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "www.feishu.cn");
    assert.doesNotMatch(url.pathname, /^\/(wiki|minutes)\//);
    assert.equal(course.source, "飞书官网公开内容");
  }
});

test("课程信息满足卡片展示所需字段", () => {
  for (const course of courses) {
    assert.ok(course.title.length >= 6);
    assert.ok(course.summary.length >= 18);
    assert.ok(COURSE_CATEGORIES.includes(course.category));
    assert.ok(course.level === "入门" || course.level === "进阶");
    assert.ok(course.outcome.length >= 8);
  }
});

test("筛选支持关键词与分类组合", () => {
  const categoryOnly = filterCourses(courses, { category: "多维表格", query: "" });
  assert.deepEqual(categoryOnly.map(({ id }) => id), ["bitable-mastery"]);

  const queryOnly = filterCourses(courses, { category: "全部", query: "管理员" });
  assert.deepEqual(queryOnly.map(({ id }) => id), ["admin-starter"]);

  const combined = filterCourses(courses, { category: "自动化", query: "日历" });
  assert.deepEqual(combined.map(({ id }) => id), ["calendar-sync"]);
});

test("筛选忽略大小写与首尾空格，无匹配时返回空数组", () => {
  assert.equal(filterCourses(courses, { category: "全部", query: "  AI  " }).length, 1);
  assert.deepEqual(filterCourses(courses, { category: "全部", query: "不存在的课程" }), []);
});

test("可通过 id 获取课程，未知 id 返回 undefined", () => {
  assert.equal(getCourseById("miaoda-starter")?.title, "飞书妙搭快速入门");
  assert.equal(getCourseById("unknown"), undefined);
});
