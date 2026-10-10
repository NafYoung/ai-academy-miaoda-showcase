import { Navigate } from 'react-router-dom';

/** Kept for older imports and bookmarks; the workspace now lives under courses. */
export default function QuizManagementPage() {
  return <Navigate to="/admin/course-management" replace />;
}
