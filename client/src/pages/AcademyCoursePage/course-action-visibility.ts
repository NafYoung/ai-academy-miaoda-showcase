interface CourseActionVisibilityInput {
  enrolled: boolean;
  hasDoc: boolean;
  hasVideo: boolean;
  hasQuiz: boolean;
}

interface CourseActionVisibility {
  showDocument: boolean;
  showVideo: boolean;
  showQuiz: boolean;
}

function getCourseActionVisibility(
  input: CourseActionVisibilityInput,
): CourseActionVisibility {
  return {
    showDocument: input.enrolled && input.hasDoc,
    showVideo: input.enrolled && input.hasVideo,
    showQuiz: input.enrolled && input.hasQuiz,
  };
}

export { getCourseActionVisibility };
export type { CourseActionVisibility, CourseActionVisibilityInput };
