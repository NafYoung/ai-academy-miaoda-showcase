import { COURSE_CATEGORIES, courses, filterCourses, getCourseById } from "./courses.js";

const state = {
  category: "全部",
  query: "",
};

const elements = {
  categoryFilters: document.querySelector("#category-filters"),
  courseGrid: document.querySelector("#course-grid"),
  courseSearch: document.querySelector("#course-search"),
  dialog: document.querySelector("#course-dialog"),
  dialogCategory: document.querySelector("#dialog-category"),
  dialogClose: document.querySelector("#dialog-close"),
  dialogLevel: document.querySelector("#dialog-level"),
  dialogLink: document.querySelector("#dialog-link"),
  dialogOutcome: document.querySelector("#dialog-outcome"),
  dialogSource: document.querySelector("#dialog-source"),
  dialogSummary: document.querySelector("#dialog-summary"),
  dialogTitle: document.querySelector("#dialog-title"),
  emptyState: document.querySelector("#empty-state"),
  resetFilters: document.querySelector("#reset-filters"),
};

function makeFilterButton(category) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `filter-chip${state.category === category ? " is-selected" : ""}`;
  button.dataset.category = category;
  button.setAttribute("aria-pressed", String(state.category === category));
  button.textContent = category;
  return button;
}

function renderFilters() {
  elements.categoryFilters.replaceChildren(
    ...["全部", ...COURSE_CATEGORIES].map(makeFilterButton),
  );
}

function makeCourseCard(course) {
  const article = document.createElement("article");
  article.className = `course-card accent-${course.accent}`;
  article.innerHTML = `
    <div class="course-topline">
      <span class="course-number">${course.order}</span>
      <span class="course-level">${course.level}</span>
    </div>
    <div class="course-symbol" aria-hidden="true"><i></i><i></i></div>
    <p class="course-category">${course.category}</p>
    <h3>${course.title}</h3>
    <p class="course-summary">${course.summary}</p>
    <div class="course-footer">
      <span>${course.outcome}</span>
      <button type="button" data-course-id="${course.id}" aria-label="查看${course.title}详情">查看 <b>→</b></button>
    </div>
  `;
  return article;
}

function renderCourses() {
  const visibleCourses = filterCourses(courses, state);
  elements.courseGrid.replaceChildren(...visibleCourses.map(makeCourseCard));
  elements.emptyState.hidden = visibleCourses.length !== 0;
}

function openCourse(courseId) {
  const course = getCourseById(courseId);
  if (!course) return;

  elements.dialogCategory.textContent = `${course.order} · ${course.category}`;
  elements.dialogTitle.textContent = course.title;
  elements.dialogSummary.textContent = course.summary;
  elements.dialogLevel.textContent = course.level;
  elements.dialogOutcome.textContent = course.outcome;
  elements.dialogSource.textContent = course.source;
  elements.dialogLink.href = course.url;
  elements.dialog.showModal();
}

elements.categoryFilters.addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  renderFilters();
  renderCourses();
});

elements.courseSearch.addEventListener("input", (event) => {
  state.query = event.target.value;
  renderCourses();
});

elements.courseGrid.addEventListener("click", (event) => {
  const button = event.target.closest("[data-course-id]");
  if (button) openCourse(button.dataset.courseId);
});

elements.resetFilters.addEventListener("click", () => {
  state.category = "全部";
  state.query = "";
  elements.courseSearch.value = "";
  renderFilters();
  renderCourses();
  elements.courseSearch.focus();
});

elements.dialogClose.addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

renderFilters();
renderCourses();
